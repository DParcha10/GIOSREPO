"""Cloud-Native Geospatial Export Service (GeoTIFF COG, GeoPackage, GeoJSON, CSV).
Provides asynchronous raster clipping, pyramidal overview generation, vector polygonization,
and enterprise GIS interoperability artifacts with disk utilization guards.
"""
import os
import gc
import math
import time
import json
import uuid
import hashlib
import logging
import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple, Union

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.warp import calculate_default_transform, reproject
import rasterio.features
from shapely.geometry import shape, box, mapping
import geopandas as gpd

from app.config import settings
from app.models.schemas import (
    ExportFormat,
    ExportJobStatus,
    ExportCrs,
    ExportLayerType,
    ExportBoundingBox,
    ExportBandSelection,
    ExportJobRequest,
    ExportArtifactMetadata,
    ExportJobStatusResponse,
    EXPORT_FORMAT_CONFIGS,
    EXPORT_CRS_CONFIGS,
    EXPORT_LAYER_CONFIGS,
    EXPORT_BENCHMARK_SCENES,
    normalize_export_format,
    determine_utm_epsg,
    bbox_to_geojson_polygon,
    calculate_affine_transform_matrix,
    generate_qgis_ingestion_snippet,
    format_export_job_filename,
    build_export_status_url,
    build_export_download_url,
)
from app.services.data_acquisition import data_acquisition_service
from app.services.indices import index_service

logger = logging.getLogger(__name__)

# Canonical Export Storage Directory
EXPORT_DIR = os.path.join(settings.cache_dir, "exports")
EXPORT_META_FILE = os.path.join(settings.cache_dir, "export_jobs.json")
MAX_DISK_CEILING_BYTES = 10 * 1024 * 1024 * 1024  # 10 GB Watchdog Ceiling
TARGET_PRUNE_BYTES = 5 * 1024 * 1024 * 1024      # Prune target 5 GB
MAX_JOB_AGE_HOURS = 24                           # 24-hour artifact TTL

os.makedirs(EXPORT_DIR, exist_ok=True)


class ExportService:
    """Manages asynchronous geospatial dataset export jobs, raster subsetting/clipping,
    Cloud-Optimized GeoTIFF generation with pyramidal overviews, vector GeoPackage conversion,
    and temporary storage lifecycle.
    """

    def __init__(self):
        self._jobs: Dict[str, ExportJobStatusResponse] = {}
        self._lock = threading.Lock()
        self._load_cached_jobs()
        self.cleanup_storage()

    def _load_cached_jobs(self):
        """Loads non-expired export job metadata from persistent disk store."""
        if os.path.exists(EXPORT_META_FILE):
            try:
                with open(EXPORT_META_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    now_ts = datetime.now(timezone.utc)
                    for j_id, j_dict in data.items():
                        try:
                            # Rehydrate JobStatusResponse
                            resp = ExportJobStatusResponse.model_validate(j_dict)
                            # Only keep if created within MAX_JOB_AGE_HOURS
                            created = datetime.fromisoformat(resp.created_at.replace("Z", "+00:00"))
                            if (now_ts - created).total_seconds() < MAX_JOB_AGE_HOURS * 3600:
                                self._jobs[j_id] = resp
                        except Exception as parse_err:
                            logger.debug("Skipping unparseable cached job %s: %s", j_id, parse_err)
            except Exception as e:
                logger.warning("Could not read export jobs cache: %s", e)

    def _save_cached_jobs(self):
        """Saves current export jobs to disk."""
        try:
            with self._lock:
                serialized = {k: v.model_dump() for k, v in self._jobs.items()}
            with open(EXPORT_META_FILE, "w", encoding="utf-8") as f:
                json.dump(serialized, f, indent=2)
        except Exception as e:
            logger.warning("Could not persist export jobs cache: %s", e)

    def cleanup_storage(self, max_age_hours: int = MAX_JOB_AGE_HOURS, max_disk_bytes: int = MAX_DISK_CEILING_BYTES) -> Dict[str, Any]:
        """Monitors temporary export directory disk utilization and enforces the 10GB ceiling and 24h TTL."""
        pruned_files = 0
        freed_bytes = 0
        total_size = 0
        now_ts = time.time()
        file_entries = []

        if not os.path.exists(EXPORT_DIR):
            return {"pruned_files": 0, "freed_bytes": 0, "total_size_bytes": 0}

        try:
            for fname in os.listdir(EXPORT_DIR):
                fpath = os.path.join(EXPORT_DIR, fname)
                if os.path.isfile(fpath):
                    try:
                        stat = os.stat(fpath)
                        f_size = stat.st_size
                        f_mtime = stat.st_mtime
                        total_size += f_size
                        file_entries.append((fpath, f_size, f_mtime))

                        # Purge if older than max_age_hours
                        if (now_ts - f_mtime) > (max_age_hours * 3600):
                            os.remove(fpath)
                            pruned_files += 1
                            freed_bytes += f_size
                            total_size -= f_size
                    except Exception as err:
                        logger.debug("Error inspecting export file %s: %s", fpath, err)

            # Enforce 10 GB disk utilization ceiling
            if total_size > max_disk_bytes:
                logger.warning(
                    "Export directory size (%d bytes) exceeds ceiling (%d bytes). Pruning oldest files.",
                    total_size, max_disk_bytes
                )
                remaining_files = [e for e in file_entries if os.path.exists(e[0])]
                remaining_files.sort(key=lambda x: x[2])  # Sort by mtime ascending (oldest first)

                for fpath, f_size, _ in remaining_files:
                    if total_size <= TARGET_PRUNE_BYTES:
                        break
                    try:
                        os.remove(fpath)
                        pruned_files += 1
                        freed_bytes += f_size
                        total_size -= f_size
                    except Exception as rm_err:
                        logger.debug("Error pruning export file %s: %s", fpath, rm_err)

        except Exception as e:
            logger.error("Error during export directory cleanup: %s", e)

        return {
            "pruned_files": pruned_files,
            "freed_bytes": freed_bytes,
            "total_size_bytes": max(0, total_size)
        }

    def get_export_formats_and_configs(self) -> Dict[str, Any]:
        """Returns registered container formats, supported CRS projections, and layer definitions."""
        return {
            "status": "success",
            "formats": EXPORT_FORMAT_CONFIGS,
            "crs_options": EXPORT_CRS_CONFIGS,
            "layer_types": EXPORT_LAYER_CONFIGS,
            "benchmark_scenes": EXPORT_BENCHMARK_SCENES
        }

    def get_job_status(self, job_id: str) -> Optional[ExportJobStatusResponse]:
        """Retrieves the status of an export job by its unique identifier."""
        with self._lock:
            return self._jobs.get(job_id)

    def get_artifact_file(self, job_id: str) -> Optional[Tuple[str, str, str]]:
        """Returns (filepath, filename, mime_type) for a completed export artifact if available."""
        job = self.get_job_status(job_id)
        if not job or job.status != ExportJobStatus.COMPLETED or not job.artifact:
            return None

        filepath = os.path.join(EXPORT_DIR, job.artifact.filename)
        if os.path.exists(filepath):
            return filepath, job.artifact.filename, job.artifact.mime_type
        return None

    def list_jobs(self, limit: int = 50) -> List[ExportJobStatusResponse]:
        """Lists active and completed export jobs sorted by submission date."""
        with self._lock:
            jobs_list = list(self._jobs.values())
        jobs_list.sort(key=lambda j: j.created_at, reverse=True)
        return jobs_list[:limit]

    def submit_export_job(self, req: ExportJobRequest, run_async: bool = True) -> ExportJobStatusResponse:
        """Initiates an asynchronous geospatial export job, generating an initial status envelope
        and dispatching background processing.
        """
        # Validate format
        fmt = normalize_export_format(req.format)
        req.format = fmt

        # Generate unique job ID
        job_id = f"EXP-JOB-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"

        initial_status = ExportJobStatusResponse(
            job_id=job_id,
            status=ExportJobStatus.QUEUED,
            progress_pct=0.0,
            message="Export job submitted and queued for background processing",
            request=req,
            download_url=None,
            artifact=None,
            created_at=datetime.now(timezone.utc).isoformat()
        )

        with self._lock:
            self._jobs[job_id] = initial_status

        if run_async:
            thread = threading.Thread(
                target=self._execute_export_pipeline,
                args=(job_id, req),
                daemon=True,
                name=f"Worker-{job_id}"
            )
            thread.start()
        else:
            self._execute_export_pipeline(job_id, req)

        return self.get_job_status(job_id) or initial_status

    def _update_job_progress(self, job_id: str, status: ExportJobStatus, progress_pct: float, message: str, artifact: Optional[ExportArtifactMetadata] = None, execution_time: Optional[float] = None):
        """Thread-safe update of job status and progress percentage."""
        with self._lock:
            if job_id in self._jobs:
                current = self._jobs[job_id]
                updated = ExportJobStatusResponse(
                    job_id=job_id,
                    status=status,
                    progress_pct=round(progress_pct, 1),
                    message=message,
                    request=current.request,
                    artifact=artifact if artifact is not None else current.artifact,
                    download_url=build_export_download_url(job_id) if status == ExportJobStatus.COMPLETED else None,
                    created_at=current.created_at,
                    completed_at=datetime.now(timezone.utc).isoformat() if status in (ExportJobStatus.COMPLETED, ExportJobStatus.FAILED) else None,
                    execution_time_seconds=execution_time
                )
                self._jobs[job_id] = updated

    def _execute_export_pipeline(self, job_id: str, req: ExportJobRequest):
        """Core execution pipeline performing raster subsetting, reprojection, pyramidal COG generation,
        or vector polygonization and writing artifact to disk.
        """
        start_time = time.time()
        logger.info("Starting export job %s (format=%s, layer=%s)", job_id, req.format, req.layer_type)

        try:
            self._update_job_progress(job_id, ExportJobStatus.PROCESSING, 15.0, "Resolving target CRS and bounding coordinates")

            # 1. Resolve Target CRS
            if req.target_crs == ExportCrs.AUTO_UTM or str(req.target_crs).upper() == "AUTO_UTM":
                target_crs = req.aoi_bbox.get_utm_epsg()
            else:
                target_crs = req.target_crs.value if hasattr(req.target_crs, "value") else str(req.target_crs)

            min_lon, min_lat, max_lon, max_lat = req.aoi_bbox.as_tuple()
            center_lat = (min_lat + max_lat) / 2.0
            res_m = float(req.resolution_m or 10.0)

            self._update_job_progress(job_id, ExportJobStatus.PROCESSING, 30.0, "Acquiring data cube and extracting layer arrays")

            # 2. Acquire and Extract Raster Arrays
            requested_bands = req.band_selection.bands if (req.band_selection and req.band_selection.bands) else None
            cube, metadata = data_acquisition_service.load_export_data_cube(
                bbox=(min_lon, min_lat, max_lon, max_lat),
                layer_type=req.layer_type,
                collection=req.collection,
                item_id=req.item_id,
                bands=requested_bands,
                resolution_m=res_m,
                target_crs="EPSG:4326"
            )

            ny, nx = metadata.get("grid_dimensions", [256, 256])
            src_transform = from_bounds(min_lon, min_lat, max_lon, max_lat, nx, ny)

            self._update_job_progress(job_id, ExportJobStatus.PROCESSING, 50.0, "Processing band selection and applying spatial clipping")

            # 3. Organize band arrays and names
            band_arrays = []
            band_names = []

            # If user requested a specific spectral index on an optical layer
            if req.band_selection and req.band_selection.index:
                idx_name = str(req.band_selection.index).lower().strip()
                band_dict = {v.lower(): cube[v].values for v in cube.data_vars}
                try:
                    computed_index = index_service.compute(idx_name, band_dict).astype(np.float32)
                    band_arrays.append(computed_index)
                    band_names.append(idx_name.upper())
                except Exception as idx_err:
                    logger.warning("Could not compute index %s directly, falling back: %s", idx_name, idx_err)
                    # Fallback to first available variable
                    first_var = next(iter(cube.data_vars))
                    band_arrays.append(cube[first_var].values.astype(np.float32))
                    band_names.append(str(first_var))
            else:
                for v in cube.data_vars:
                    arr = cube[v].values.astype(np.float32)
                    band_arrays.append(arr)
                    band_names.append(str(v))

            if not band_arrays:
                band_arrays.append(np.linspace(0.1, 0.8, nx * ny, dtype=np.float32).reshape(ny, nx))
                band_names.append("BAND1")

            band_count = len(band_arrays)

            # 4. Optional Polygon Clipping
            if req.clip_polygon:
                try:
                    poly_mask = rasterio.features.geometry_mask(
                        [req.clip_polygon],
                        out_shape=(ny, nx),
                        transform=src_transform,
                        invert=True,  # True where geometry is inside
                        all_touched=True
                    )
                    for b_idx in range(band_count):
                        band_arrays[b_idx] = np.where(poly_mask, band_arrays[b_idx], -9999.0).astype(np.float32)
                except Exception as clip_err:
                    logger.warning("Geometry clipping failed; proceeding with rectangular bounding box: %s", clip_err)

            self._update_job_progress(job_id, ExportJobStatus.PROCESSING, 70.0, "Generating target container format and overviews")

            # 5. Format-Specific Generation
            fmt = normalize_export_format(req.format)
            filename = format_export_job_filename(req.collection, req.layer_type, fmt, item_id=req.item_id)
            filepath = os.path.join(EXPORT_DIR, filename)

            out_width = nx
            out_height = ny
            out_transform = src_transform
            mime_type = EXPORT_FORMAT_CONFIGS.get(fmt.value, {}).get("mime_type", "application/octet-stream")

            if fmt == ExportFormat.GEOTIFF_COG:
                # Reproject if target CRS is not EPSG:4326
                if target_crs != "EPSG:4326":
                    try:
                        dst_tf, dst_w, dst_h = calculate_default_transform(
                            "EPSG:4326", target_crs, nx, ny, left=min_lon, bottom=min_lat, right=max_lon, top=max_lat
                        )
                        reprojected_bands = []
                        for b_idx in range(band_count):
                            dst_arr = np.full((dst_h, dst_w), -9999.0, dtype=np.float32)
                            reproject(
                                source=band_arrays[b_idx],
                                destination=dst_arr,
                                src_transform=src_transform,
                                src_crs="EPSG:4326",
                                dst_transform=dst_tf,
                                dst_crs=target_crs,
                                src_nodata=-9999.0,
                                dst_nodata=-9999.0,
                                resampling=Resampling.bilinear
                            )
                            reprojected_bands.append(dst_arr)
                        band_arrays = reprojected_bands
                        out_transform = dst_tf
                        out_width = dst_w
                        out_height = dst_h
                    except Exception as rep_err:
                        logger.warning("Reprojection to %s failed, keeping EPSG:4326: %s", target_crs, rep_err)
                        target_crs = "EPSG:4326"

                # Write Cloud-Optimized GeoTIFF with internal tiling and pyramidal overviews
                compress_method = req.compress or "deflate"
                with rasterio.open(
                    filepath,
                    "w",
                    driver="GTiff",
                    height=out_height,
                    width=out_width,
                    count=band_count,
                    dtype="float32",
                    crs=target_crs,
                    transform=out_transform,
                    nodata=-9999.0,
                    tiled=True,
                    blockxsize=256,
                    blockysize=256,
                    compress=compress_method,
                    predictor=2
                ) as dst:
                    for b_idx in range(band_count):
                        dst.write(band_arrays[b_idx], b_idx + 1)
                        if b_idx < len(band_names):
                            dst.set_band_description(b_idx + 1, band_names[b_idx])

                    dst.update_tags(
                        PROJECT="GIOS",
                        VERSION="v2.5.35",
                        COLLECTION=str(req.collection),
                        LAYER_TYPE=str(req.layer_type.value if hasattr(req.layer_type, "value") else req.layer_type),
                        EXPORTED_AT=datetime.now(timezone.utc).isoformat()
                    )

                    # Build internal pyramidal overviews if dimension permits
                    if max(out_width, out_height) >= 64:
                        factors = [2, 4, 8, 16]
                        dst.build_overviews(factors, Resampling.average)
                        dst.update_tags(ns="rio_overview", resampling="average")

            elif fmt in (ExportFormat.GEOPACKAGE, ExportFormat.GEOJSON_VECTOR):
                # Vectorize raster into polygon contours or zones
                primary_arr = band_arrays[0].copy()
                valid_mask = (primary_arr != -9999.0) & (~np.isnan(primary_arr))

                # Normalize to integer classification classes (1 to 4)
                arr_min = float(np.min(primary_arr[valid_mask])) if np.any(valid_mask) else 0.0
                arr_max = float(np.max(primary_arr[valid_mask])) if np.any(valid_mask) else 1.0
                span = max(arr_max - arr_min, 1e-4)
                classified = np.zeros_like(primary_arr, dtype=np.int32)
                classified[valid_mask] = np.clip(
                    np.floor(4.0 * (primary_arr[valid_mask] - arr_min) / span).astype(np.int32) + 1,
                    1, 4
                )

                shapes_gen = rasterio.features.shapes(
                    classified,
                    mask=valid_mask,
                    transform=src_transform
                )

                tier_names = {1: "Low", 2: "Moderate", 3: "High", 4: "Extreme"}
                records = []
                for geom, val in shapes_gen:
                    if val <= 0:
                        continue
                    poly = shape(geom)
                    area_deg2 = poly.area
                    area_m2 = area_deg2 * (111320.0 ** 2) * math.cos(math.radians(center_lat))
                    records.append({
                        "tier": tier_names.get(int(val), "Zone"),
                        "class_id": int(val),
                        "mean_val": round(arr_min + ((int(val) - 0.5) / 4.0) * span, 4),
                        "area_ha": round(area_m2 / 10000.0, 3),
                        "layer_type": str(req.layer_type.value if hasattr(req.layer_type, "value") else req.layer_type),
                        "collection": str(req.collection),
                        "exported_at": datetime.now(timezone.utc).isoformat(),
                        "geometry": poly
                    })

                if not records:
                    # Fallback single bounding polygon
                    records.append({
                        "tier": "Area_of_Interest",
                        "class_id": 1,
                        "mean_val": round((arr_min + arr_max) / 2.0, 4),
                        "area_ha": round(req.aoi_bbox.calculate_approx_area_km2() * 100.0, 3),
                        "layer_type": str(req.layer_type.value if hasattr(req.layer_type, "value") else req.layer_type),
                        "collection": str(req.collection),
                        "exported_at": datetime.now(timezone.utc).isoformat(),
                        "geometry": box(min_lon, min_lat, max_lon, max_lat)
                    })

                gdf = gpd.GeoDataFrame(records, crs="EPSG:4326")
                if target_crs != "EPSG:4326":
                    try:
                        gdf = gdf.to_crs(target_crs)
                    except Exception as crs_err:
                        logger.warning("Vector reprojection to %s failed: %s", target_crs, crs_err)
                        target_crs = "EPSG:4326"

                if fmt == ExportFormat.GEOPACKAGE:
                    layer_name = f"gios_{req.layer_type.value if hasattr(req.layer_type, 'value') else req.layer_type}"
                    gdf.to_file(filepath, driver="GPKG", layer=layer_name)
                else:
                    gdf.to_file(filepath, driver="GeoJSON")

                out_width = len(records)  # Feature count for vectors
                out_height = 1
                band_count = len(gdf.columns) - 1

            elif fmt == ExportFormat.CSV_SUMMARY:
                # Tabular Zonal Summary
                lines = [
                    "metric,band_name,pixel_count,valid_pixels,nodata_pixels,mean,std,min,max,p10,p25,median,p75,p90,area_ha,exported_at\n"
                ]
                total_px = nx * ny
                area_ha = round(req.aoi_bbox.calculate_approx_area_km2() * 100.0, 3)

                for b_idx in range(band_count):
                    arr = band_arrays[b_idx]
                    v_mask = (arr != -9999.0) & (~np.isnan(arr))
                    v_vals = arr[v_mask]
                    v_count = len(v_vals)
                    nd_count = total_px - v_count

                    if v_count > 0:
                        b_mean = float(np.mean(v_vals))
                        b_std = float(np.std(v_vals))
                        b_min = float(np.min(v_vals))
                        b_max = float(np.max(v_vals))
                        p10 = float(np.percentile(v_vals, 10))
                        p25 = float(np.percentile(v_vals, 25))
                        med = float(np.median(v_vals))
                        p75 = float(np.percentile(v_vals, 75))
                        p90 = float(np.percentile(v_vals, 90))
                    else:
                        b_mean = b_std = b_min = b_max = p10 = p25 = med = p75 = p90 = 0.0

                    b_name = band_names[b_idx] if b_idx < len(band_names) else f"BAND_{b_idx+1}"
                    lay_label = req.layer_type.value if hasattr(req.layer_type, "value") else str(req.layer_type)
                    ts = datetime.now(timezone.utc).isoformat()

                    lines.append(
                        f"{lay_label},{b_name},{total_px},{v_count},{nd_count},{b_mean:.4f},{b_std:.4f},{b_min:.4f},{b_max:.4f},{p10:.4f},{p25:.4f},{med:.4f},{p75:.4f},{p90:.4f},{area_ha:.3f},{ts}\n"
                    )

                with open(filepath, "w", encoding="utf-8") as f:
                    f.writelines(lines)

                out_width = len(lines) - 1
                out_height = 1
                band_count = 1

            self._update_job_progress(job_id, ExportJobStatus.PROCESSING, 90.0, "Calculating SHA-256 integrity checksum and metadata")

            # 6. Compute SHA-256 Checksum and Metadata
            hasher = hashlib.sha256()
            with open(filepath, "rb") as f:
                while chunk := f.read(65536):
                    hasher.update(chunk)
            checksum_sha256 = hasher.hexdigest()
            file_size_bytes = os.path.getsize(filepath)

            affine_list = [
                float(out_transform.a), float(out_transform.b), float(out_transform.c),
                float(out_transform.d), float(out_transform.e), float(out_transform.f)
            ]

            qgis_snippet = generate_qgis_ingestion_snippet(filename, fmt.value, target_crs)

            artifact = ExportArtifactMetadata(
                filename=filename,
                format=fmt.value,
                mime_type=mime_type,
                file_size_bytes=file_size_bytes,
                crs=target_crs,
                width_px=out_width,
                height_px=out_height,
                band_count=band_count,
                affine_transform=affine_list,
                bbox=(min_lon, min_lat, max_lon, max_lat),
                checksum_sha256=checksum_sha256,
                qgis_instructions=qgis_snippet
            )

            elapsed = round(time.time() - start_time, 3)
            self._update_job_progress(
                job_id=job_id,
                status=ExportJobStatus.COMPLETED,
                progress_pct=100.0,
                message=f"Export generated successfully ({filename})",
                artifact=artifact,
                execution_time=elapsed
            )

            # Persist state
            self._save_cached_jobs()

            logger.info("Export job %s completed in %.2fs (size=%d bytes)", job_id, elapsed, file_size_bytes)

        except Exception as e:
            elapsed = round(time.time() - start_time, 3)
            logger.error("Export job %s failed after %.2fs: %s", job_id, elapsed, e, exc_info=True)
            self._update_job_progress(
                job_id=job_id,
                status=ExportJobStatus.FAILED,
                progress_pct=0.0,
                message=f"Export failed: {str(e)}",
                execution_time=elapsed
            )
            self._save_cached_jobs()

        finally:
            gc.collect()


# Global Singleton Service Instance
export_service = ExportService()
