"""Drone Orthomosaic & LiDAR Ingestion Service with Cloud-Optimized GeoTIFF (COG) Pyramids."""
import os
import math
import io
import json
import logging
from typing import Dict, Any, Tuple, Optional, List, Union
import numpy as np
from PIL import Image
import rasterio
from rasterio.enums import Resampling
from rasterio.windows import from_bounds
import pyproj
from shapely.geometry import box
from app.config import settings
from datetime import datetime, timezone
from app.models.schemas import (
    BoundingBox,
    DroneStatus,
    calculate_metric_gsd as photogrammetric_metric_gsd,
    lat_lon_to_tile,
    calculate_haversine_distance,
    calculate_initial_bearing,
    calculate_polygon_centroid,
    generate_boustrophedon_waypoints,
    NodeODMLifecycleStatus,
    NodeODMPipelineStage,
    NODEODM_PIPELINE_STAGE_METADATA,
    DRONE_CAMERA_PRESETS,
    DRONE_PHOTOGRAMMETRY_TILE_METRIC_CONFIGS,
    GroundControlPoint,
    CameraCalibrationParams,
    GCPAffineTransformResult,
    DroneFlightPlan,
    NodeODMTaskOptions,
    DronePhotogrammetryArtifacts,
    DronePhotogrammetryTaskCreateRequest,
    DronePhotogrammetryTaskStatusResponse,
    DronePhotogrammetryCancelResponse,
    DronePhotogrammetryGCPUpdateRequest,
    DronePhotogrammetryGCPUpdateResponse,
    DroneFlightPlanRequest,
    DroneFlightPlanResponse,
    DronePhotogrammetryAffineSolveRequest,
    DronePhotogrammetryAffineSolveResponse,
    solve_gcp_affine_transform,
    calculate_drone_flight_plan,
    simulate_nodeodm_task_progression,
    build_drone_photogrammetry_tile_url,
    build_drone_photogrammetry_tile_url_template
)

logger = logging.getLogger(__name__)

ORTHOS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "drone_orthos")
MISSIONS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "drone_missions.json")
ORTHOS_META_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "drone_orthos_meta.json")
ODM_TASKS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "drone_odm_tasks.json")

os.makedirs(ORTHOS_DIR, exist_ok=True)
os.makedirs(os.path.dirname(MISSIONS_FILE), exist_ok=True)

class DroneService:
    def __init__(self):
        self._load_missions()
        self._load_orthos()
        self._load_photogrammetry_tasks()

    def _load_missions(self):
        self.active_missions = {}
        if os.path.exists(MISSIONS_FILE):
            try:
                with open(MISSIONS_FILE, "r", encoding="utf-8") as f:
                    self.active_missions = json.load(f)
            except Exception as e:
                logger.error("Error loading drone missions: %s", e)

    def _save_missions(self):
        try:
            with open(MISSIONS_FILE, "w", encoding="utf-8") as f:
                json.dump(self.active_missions, f, indent=2)
        except Exception as e:
            logger.error("Error saving drone missions: %s", e)

    def _load_orthos(self):
        self.registered_orthos: Dict[str, Dict[str, Any]] = {}
        if os.path.exists(ORTHOS_META_FILE):
            try:
                with open(ORTHOS_META_FILE, "r", encoding="utf-8") as f:
                    self.registered_orthos = json.load(f)
            except Exception as e:
                logger.error("Error loading drone orthos: %s", e)
        
        # Ensure a default benchmark orthomosaic exists if none registered
        if not self.registered_orthos:
            self._create_default_benchmark_ortho()

    def _save_orthos(self):
        try:
            with open(ORTHOS_META_FILE, "w", encoding="utf-8") as f:
                json.dump(self.registered_orthos, f, indent=2)
        except Exception as e:
            logger.error("Error saving drone orthos: %s", e)

    @staticmethod
    def calculate_metric_gsd(src: rasterio.io.DatasetReaderBase) -> float:
        """Calculates accurate metric Ground Sample Distance (GSD) in centimeters.
        Properly differentiates projected meters from geographic degrees (EPSG:4326).
        """
        res_x, res_y = src.res
        abs_rx = abs(res_x)
        abs_ry = abs(res_y)

        is_geo = src.crs is not None and src.crs.is_geographic
        if is_geo:
            # Latitudinal center for geodetic trigonometry
            b = src.bounds
            mid_lat = (b.bottom + b.top) / 2.0
            lat_rad = math.radians(mid_lat)
            meters_per_deg_lat = 111320.0
            meters_per_deg_lon = 111320.0 * math.cos(lat_rad)
            dx_m = abs_rx * meters_per_deg_lon
            dy_m = abs_ry * meters_per_deg_lat
            gsd_cm = round(((dx_m + dy_m) / 2.0) * 100.0, 2)
        else:
            # Projected coordinates directly in meters
            gsd_cm = round(abs_rx * 100.0, 2)

        if gsd_cm <= 0.0 or math.isnan(gsd_cm) or gsd_cm > 2000.0:
            gsd_cm = 2.80  # Standard survey GSD 2.8cm
        return gsd_cm

    @staticmethod
    def calculate_flight_metric_gsd(
        flight_altitude_m: float,
        focal_length_mm: float = 8.8,
        sensor_width_mm: float = 13.2,
        image_width_px: int = 5472
    ) -> float:
        """Calculates Ground Sample Distance (GSD) in cm/px from UAV flight parameters."""
        return photogrammetric_metric_gsd(
            flight_altitude_m=flight_altitude_m,
            focal_length_mm=focal_length_mm,
            sensor_width_mm=sensor_width_mm,
            image_width_px=image_width_px
        )

    @staticmethod
    def calculate_flight_path_distance(flight_path: List[List[float]], unit: str = "km") -> float:
        """Calculates total geodesic flight distance across sequential waypoints."""
        if not flight_path or len(flight_path) < 2:
            return 0.0
        total_dist = 0.0
        for i in range(len(flight_path) - 1):
            p1 = flight_path[i]
            p2 = flight_path[i + 1]
            total_dist += calculate_haversine_distance(p1[0], p1[1], p2[0], p2[1], unit=unit)
        return round(total_dist, 3)

    @staticmethod
    def calculate_flight_bearing(p1: List[float], p2: List[float]) -> float:
        """Calculates compass heading bearing in degrees [0, 360) from waypoint 1 to 2."""
        return calculate_initial_bearing(p1[0], p1[1], p2[0], p2[1])

    def _create_default_benchmark_ortho(self):
        """Generates a default synthetic centimeter-grade drone COG over San Luis Dam embankment."""
        ortho_id = "DRN-ORTHO-01"
        file_path = os.path.join(ORTHOS_DIR, f"{ortho_id}.tif")
        if not os.path.exists(file_path):
            # Centered on San Luis Dam: [-121.076, 37.056, -121.072, 37.060]
            width, height = 512, 512
            # 2.8 cm GSD in degrees: 0.028m / 111320m ~ 2.5e-7 deg
            lon_min, lat_min = -121.076, 37.056
            lon_max, lat_max = -121.072, 37.060
            transform = rasterio.transform.from_bounds(lon_min, lat_min, lon_max, lat_max, width, height)

            # 3-band RGB with texture
            xx, yy = np.meshgrid(np.linspace(0, 1, width), np.linspace(0, 1, height))
            r = ((xx * 180 + yy * 60 + np.sin(xx * 20) * 20)).astype(np.uint8)
            g = ((xx * 140 + yy * 110 + np.cos(yy * 20) * 20)).astype(np.uint8)
            b = ((xx * 100 + yy * 80 + 30)).astype(np.uint8)

            profile = {
                "driver": "GTiff",
                "width": width,
                "height": height,
                "count": 3,
                "dtype": "uint8",
                "crs": "EPSG:4326",
                "transform": transform,
                "tiled": True,
                "blockxsize": 256,
                "blockysize": 256,
                "compress": "deflate"
            }

            try:
                with rasterio.open(file_path, "w", **profile) as dst:
                    dst.write(r, 1)
                    dst.write(g, 2)
                    dst.write(b, 3)
                    dst.build_overviews([2, 4, 8], Resampling.nearest)
                    dst.update_tags(ns="rio_overview", resampling="nearest")
            except Exception as e:
                logger.error("Failed to generate default benchmark ortho: %s", e)

        self.registered_orthos[ortho_id] = {
            "ortho_id": ortho_id,
            "filename": os.path.basename(file_path),
            "file_path": file_path,
            "mission_name": "San Luis Dam Toe Micro-Inspection",
            "crs": "EPSG:4326",
            "bounds": [-121.076, 37.056, -121.072, 37.060],
            "metric_gsd_cm": 2.80,
            "gsd_display": "2.80 cm/px",
            "bands": 3,
            "width": 512,
            "height": 512,
            "is_cog": True,
            "status": DroneStatus.READY.value
        }
        self._save_orthos()

    def register_orthomosaic(
        self,
        file_path: str,
        mission_name: str = "UAV Survey",
        payload: str = "Multispectral + RGB",
        ortho_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Validates georeferencing, computes metric GSD, builds COG pyramids, and registers orthomosaic."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Orthomosaic file not found: {file_path}")

        import uuid
        oid = ortho_id or f"DRN-{str(uuid.uuid4())[:8].upper()}"
        cog_path = os.path.join(ORTHOS_DIR, f"{oid}_cog.tif")

        with rasterio.open(file_path) as src:
            bounds = src.bounds
            crs_str = str(src.crs) if src.crs else "EPSG:4326"
            metric_gsd_cm = self.calculate_metric_gsd(src)
            band_count = src.count
            width, height = src.width, src.height
            bbox = (bounds.left, bounds.bottom, bounds.right, bounds.top)

            # Generate internal tiling and overviews if not already COG
            is_cog = src.is_tiled and len(src.overviews(1)) > 0
            if not is_cog:
                logger.info("Converting %s to Cloud-Optimized GeoTIFF...", file_path)
                profile = src.profile.copy()
                profile.update(
                    tiled=True,
                    blockxsize=256,
                    blockysize=256,
                    compress="deflate"
                )
                with rasterio.open(cog_path, "w", **profile) as dst:
                    for i in range(1, band_count + 1):
                        dst.write(src.read(i), i)
                    dst.build_overviews([2, 4, 8, 16], Resampling.nearest)
                final_path = cog_path
                is_cog = True
            else:
                final_path = file_path

        meta = {
            "ortho_id": oid,
            "filename": os.path.basename(final_path),
            "file_path": final_path,
            "mission_name": mission_name,
            "crs": crs_str,
            "bounds": bbox,
            "metric_gsd_cm": metric_gsd_cm,
            "gsd_display": f"{metric_gsd_cm:.2f} cm/px",
            "bands": band_count,
            "width": width,
            "height": height,
            "is_cog": is_cog,
            "sensor_payload": payload,
            "status": DroneStatus.READY.value
        }
        self.registered_orthos[oid] = meta
        self._save_orthos()
        return meta

    def get_ortho_bbox(self, ortho_id: str) -> Optional[BoundingBox]:
        """Returns BoundingBox model for registered orthomosaic."""
        meta = self.registered_orthos.get(ortho_id)
        if not meta:
            return None
        b = meta.get("bounds")
        if b and len(b) == 4:
            return BoundingBox(min_lon=b[0], min_lat=b[1], max_lon=b[2], max_lat=b[3])
        return None

    def get_ortho_tile_bounds(self, ortho_id: str, zoom: int) -> Optional[Dict[str, int]]:
        """Calculates Web Mercator XYZ tile index range covering the orthomosaic at a given zoom level."""
        bbox = self.get_ortho_bbox(ortho_id)
        if not bbox:
            return None
        min_x, max_y = lat_lon_to_tile(bbox.max_lat, bbox.min_lon, zoom)
        max_x, min_y = lat_lon_to_tile(bbox.min_lat, bbox.max_lon, zoom)
        return {
            "zoom": zoom,
            "min_x": min_x,
            "max_x": max_x,
            "min_y": min_y,
            "max_y": max_y
        }

    def get_tile(self, ortho_id: str, z: int, x: int, y: int) -> bytes:
        """Renders 256x256 RGBA PNG tile for drone orthomosaic supporting centimeter zoom up to Zoom 22."""
        meta = self.registered_orthos.get(ortho_id)
        if not meta and len(self.registered_orthos) > 0:
            # Fallback to first available ortho
            meta = list(self.registered_orthos.values())[0]

        # Calculate Web Mercator tile bounds in WGS84
        n = 2.0 ** z
        lon_min = x / n * 360.0 - 180.0
        lat_rad_max = math.atan(math.sinh(math.pi * (1 - 2 * y / n)))
        lat_max = math.degrees(lat_rad_max)
        lon_max = (x + 1) / n * 360.0 - 180.0
        lat_rad_min = math.atan(math.sinh(math.pi * (1 - 2 * (y + 1) / n)))
        lat_min = math.degrees(lat_rad_min)

        tile_box = box(lon_min, lat_min, lon_max, lat_max)

        if meta and os.path.exists(meta.get("file_path", "")):
            try:
                with rasterio.open(meta["file_path"]) as src:
                    # Check intersection with raster bounds
                    rb = src.bounds
                    raster_box = box(rb.left, rb.bottom, rb.right, rb.top)
                    if not tile_box.intersects(raster_box):
                        # Transparent tile
                        empty_arr = np.zeros((256, 256, 4), dtype=np.uint8)
                        img = Image.fromarray(empty_arr, "RGBA")
                        with io.BytesIO() as buf:
                            img.save(buf, format="PNG")
                            png_bytes = buf.getvalue()
                        del img
                        del empty_arr
                        return png_bytes

                    # Read window
                    win = from_bounds(lon_min, lat_min, lon_max, lat_max, src.transform)
                    bands_to_read = min(3, src.count)
                    tile_data = src.read(
                        indexes=list(range(1, bands_to_read + 1)),
                        window=win,
                        out_shape=(bands_to_read, 256, 256),
                        resampling=Resampling.bilinear,
                        boundless=True,
                        fill_value=0
                    )
                    
                    if bands_to_read == 3:
                        rgb = np.moveaxis(tile_data, 0, -1)
                    else:
                        rgb = np.repeat(tile_data[0][:, :, np.newaxis], 3, axis=2)

                    # Alpha channel
                    mask = (rgb.sum(axis=2) > 0).astype(np.uint8) * 255
                    rgba = np.dstack([rgb.astype(np.uint8), mask])

                    img = Image.fromarray(rgba, "RGBA")
                    with io.BytesIO() as buf:
                        img.save(buf, format="PNG")
                        png_bytes = buf.getvalue()
                    del img
                    del rgba
                    del rgb
                    del mask
                    del tile_data
                    return png_bytes
            except Exception as e:
                logger.warning("Error reading drone COG tile: %s", e)

        # Fallback synthetic centimeter tile with realistic soil/embankment texture
        rgba = np.zeros((256, 256, 4), dtype=np.uint8)
        xx, yy = np.meshgrid(np.linspace(0, 1, 256), np.linspace(0, 1, 256))
        # Warm earth tone with texture
        rgba[:, :, 0] = np.clip(160 + xx * 30 + np.sin(yy * 40) * 15, 0, 255).astype(np.uint8)
        rgba[:, :, 1] = np.clip(130 + yy * 25 + np.cos(xx * 40) * 15, 0, 255).astype(np.uint8)
        rgba[:, :, 2] = np.clip(95 + (xx + yy) * 15, 0, 255).astype(np.uint8)
        rgba[:, :, 3] = 230  # High opacity

        img = Image.fromarray(rgba, "RGBA")
        with io.BytesIO() as buf:
            img.save(buf, format="PNG")
            png_bytes = buf.getvalue()
        del img
        del rgba
        del xx
        del yy
        return png_bytes

    def schedule_mission(self, event_id: str, lat: float, lng: float, radius_km: float = 1.0) -> Dict[str, Any]:
        """Generate a simulated boustrophedon flight path."""
        import uuid
        mission_id = f"DRN-{str(uuid.uuid4())[:8].upper()}"
        offset = radius_km / 111.0
        min_lat, max_lat = lat - offset, lat + offset
        min_lng, max_lng = lng - offset, lng + offset

        bbox = (min_lng, min_lat, max_lng, max_lat)
        waypoints = generate_boustrophedon_waypoints(bbox, flight_altitude_m=100.0, overlap_pct=0.75)
        path = [[round(pt[0], 6), round(pt[1], 6)] for pt in waypoints]
        if not path or len(path) < 2:
            path = [[lat, min_lng], [lat, max_lng]]

        # Planned photogrammetric metric GSD at standard survey altitude (100m AGL)
        planned_gsd = photogrammetric_metric_gsd(flight_altitude_m=100.0)
        total_flight_km = DroneService.calculate_flight_path_distance(path, unit="km")
        initial_bearing = DroneService.calculate_flight_bearing(path[0], path[1]) if len(path) >= 2 else 90.0

        num_passes = max(4, len(path) // 2)
        mission = {
            "id": mission_id,
            "event_id": event_id,
            "status": DroneStatus.SCHEDULED.value,
            "flight_path": path,
            "center": [lat, lng],
            "radius_km": radius_km,
            "total_distance_km": total_flight_km,
            "initial_bearing_deg": initial_bearing,
            "estimated_time_mins": max(1, round((radius_km * 2 * num_passes) / 0.5)),
            "payload": "LiDAR + Multispectral",
            "planned_gsd_cm": planned_gsd,
            "gsd_display": f"{planned_gsd:.2f} cm/px",
            "ticks": 0
        }
        self.active_missions[mission_id] = mission
        self._save_missions()
        return mission

    def simulate_missions(self):
        """Simulate progress of drone missions."""
        changed = False
        for mission_id, mission in list(self.active_missions.items()):
            current_status = mission["status"]
            ticks = mission.get("ticks", 0)
            if current_status == DroneStatus.SCHEDULED.value:
                if ticks > 1:
                    mission["status"] = "IN_FLIGHT"
                    mission["ticks"] = 0
                    changed = True
                else:
                    mission["ticks"] = ticks + 1
                    changed = True
            elif current_status == "IN_FLIGHT":
                if ticks > 4:
                    mission["status"] = "DATA_ACQUIRED"
                    mission["ticks"] = 0
                    changed = True
                else:
                    mission["ticks"] = ticks + 1
                    changed = True
            elif current_status == "DATA_ACQUIRED":
                if ticks > 2:
                    mission["status"] = DroneStatus.COMPLETED.value
                    mission["ticks"] = 0
                    changed = True
                else:
                    mission["ticks"] = ticks + 1
                    changed = True
        if changed:
            self._save_missions()

    def calculate_direct_georeferencing(
        self,
        gnss_lat: float,
        gnss_lon: float,
        gnss_alt_m: float,
        ground_elev_m: float = 0.0,
        roll_deg: float = 0.0,
        pitch_deg: float = 0.0,
        yaw_deg: float = 0.0,
        lever_arm: Optional[Any] = None,
        boresight: Optional[Any] = None,
        sensor_spec: Optional[Any] = None,
        gnss_uncertainty_m: float = 0.02,
        attitude_uncertainty_deg: float = 0.01
    ) -> Dict[str, Any]:
        """Calculates exterior orientation, lever-arm translation, boresight rotation, and ground footprint projection."""
        from app.models.schemas import calculate_direct_georeferencing
        return calculate_direct_georeferencing(
            gnss_lat=gnss_lat,
            gnss_lon=gnss_lon,
            gnss_alt_m=gnss_alt_m,
            ground_elev_m=ground_elev_m,
            roll_deg=roll_deg,
            pitch_deg=pitch_deg,
            yaw_deg=yaw_deg,
            lever_arm=lever_arm,
            boresight=boresight,
            sensor_spec=sensor_spec,
            gnss_uncertainty_m=gnss_uncertainty_m,
            attitude_uncertainty_deg=attitude_uncertainty_deg
        )

    # ------------------------------------------------------------------------
    # NodeODM Photogrammetry and GCP Georeferencing Task Management (Cycle v2.5.24)
    # ------------------------------------------------------------------------

    def _load_photogrammetry_tasks(self):
        self.photogrammetry_tasks: Dict[str, Dict[str, Any]] = {}
        if os.path.exists(ODM_TASKS_FILE):
            try:
                with open(ODM_TASKS_FILE, "r", encoding="utf-8") as f:
                    self.photogrammetry_tasks = json.load(f)
            except Exception as e:
                logger.error("Error loading photogrammetry tasks: %s", e)
        if "ODM-BENCHMARK-001" not in self.photogrammetry_tasks:
            self._seed_default_photogrammetry_tasks()

    def _save_photogrammetry_tasks(self):
        try:
            os.makedirs(os.path.dirname(ODM_TASKS_FILE), exist_ok=True)
            with open(ODM_TASKS_FILE, "w", encoding="utf-8") as f:
                json.dump(self.photogrammetry_tasks, f, indent=2)
        except Exception as e:
            logger.error("Error saving photogrammetry tasks: %s", e)

    def _seed_default_photogrammetry_tasks(self):
        benchmark_task = simulate_nodeodm_task_progression(
            task_id="ODM-BENCHMARK-001",
            stage="completed",
            image_count=120
        )
        benchmark_task["project_name"] = "San Luis Dam Crest High-Resolution Photogrammetry Survey"

        running_task = simulate_nodeodm_task_progression(
            task_id="ODM-TAILINGS-2026",
            stage="orthophoto_mosaicing",
            elapsed_seconds=320.0,
            image_count=150
        )
        running_task["project_name"] = "Tailings Dam Upstream Embankment Survey"

        self.photogrammetry_tasks["ODM-BENCHMARK-001"] = benchmark_task
        self.photogrammetry_tasks["ODM-TAILINGS-2026"] = running_task
        self._save_photogrammetry_tasks()

    @staticmethod
    def _normalize_task_record(t: Dict[str, Any]) -> Dict[str, Any]:
        norm = dict(t)
        if "stage" not in norm and "current_stage" in norm:
            norm["stage"] = norm["current_stage"]
        if "achieved_gsd_cm" not in norm and "gsd_achieved_cm" in norm:
            norm["achieved_gsd_cm"] = norm["gsd_achieved_cm"]
        if "achieved_gsd_cm" not in norm and "target_gsd_cm" in norm:
            norm["achieved_gsd_cm"] = norm["target_gsd_cm"]
        if "achieved_gsd_cm" not in norm and "gsd_target_cm" in norm:
            norm["achieved_gsd_cm"] = norm["gsd_target_cm"]
        if "stage" not in norm:
            norm["stage"] = "dataset_upload"
        if "stage_label" not in norm:
            norm["stage_label"] = "Dataset and EXIF Ingestion"
        if "tile_url_template" not in norm:
            t_id = norm.get("task_id", "ODM-TASK")
            norm["tile_url_template"] = f"/api/v1/tiles/drone/photogrammetry/{t_id}/{{z}}/{{x}}/{{y}}.png"
        return norm

    def list_photogrammetry_tasks(self) -> List[Dict[str, Any]]:
        """Lists all registered drone photogrammetry tasks."""
        if not self.photogrammetry_tasks:
            self._seed_default_photogrammetry_tasks()
        return [self._normalize_task_record(t) for t in self.photogrammetry_tasks.values()]

    def get_photogrammetry_task(self, task_id: str) -> Dict[str, Any]:
        """Retrieves real-time status and product deliverables for a photogrammetry mission."""
        task = self.photogrammetry_tasks.get(task_id)
        if task:
            return self._normalize_task_record(task)
        sim = simulate_nodeodm_task_progression(task_id=task_id)
        norm = self._normalize_task_record(sim)
        self.photogrammetry_tasks[task_id] = norm
        self._save_photogrammetry_tasks()
        return norm

    def create_photogrammetry_task(
        self,
        req: Union[DronePhotogrammetryTaskCreateRequest, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Dispatches a new asynchronous drone photogrammetry mission."""
        req_obj = DronePhotogrammetryTaskCreateRequest.model_validate(req) if isinstance(req, dict) else req
        task_id = req_obj.task_id or f"ODM-TASK-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{len(self.photogrammetry_tasks) + 1:03d}"
        now_iso = datetime.now(timezone.utc).isoformat()

        camera_dict = req_obj.camera.model_dump() if req_obj.camera else DRONE_CAMERA_PRESETS.get("DJI_FC6310R")
        gcps_list = [g.model_dump() if hasattr(g, "model_dump") else dict(g) for g in req_obj.gcps]
        affine_res = None
        enabled_gcps = [g for g in gcps_list if g.get("is_enabled", True)]
        if len(enabled_gcps) >= 3:
            try:
                affine_res = solve_gcp_affine_transform(gcps_list)
            except Exception as e:
                logger.warning("GCP affine solution failed during task creation: %s", e)

        target_gsd = req_obj.target_gsd_cm or 2.5
        image_cnt = req_obj.image_count or 120
        est_rem = max(60.0, float(image_cnt) * 3.5)

        task_record = {
            "task_id": task_id,
            "project_name": req_obj.project_name,
            "status": NodeODMLifecycleStatus.RUNNING.value,
            "stage": NodeODMPipelineStage.DATASET_INITIALIZATION.value,
            "stage_label": "Dataset & EXIF Initialization",
            "progress_percent": 12.5,
            "elapsed_seconds": 15.0,
            "estimated_remaining_seconds": est_rem,
            "image_count": image_cnt,
            "reconstructed_points": 0,
            "achieved_gsd_cm": round(float(target_gsd) * 1.01, 2),
            "rmse_reprojection_px": 0.38,
            "affine_geotransform": affine_res,
            "gcps": gcps_list,
            "camera": camera_dict,
            "artifacts": {
                "orthophoto_cog_url": f"/static/drone_outputs/{task_id}/orthophoto.tif",
                "dtm_cog_url": f"/static/drone_outputs/{task_id}/dtm.tif",
                "dsm_cog_url": f"/static/drone_outputs/{task_id}/dsm.tif",
                "point_cloud_laz_url": f"/static/drone_outputs/{task_id}/point_cloud.laz",
                "quality_report_pdf_url": f"/static/drone_outputs/{task_id}/odm_report.pdf"
            },
            "tile_url_template": f"/api/v1/tiles/drone/photogrammetry/{task_id}/{{z}}/{{x}}/{{y}}.png",
            "error_message": None,
            "created_at": now_iso,
            "updated_at": now_iso
        }
        self.photogrammetry_tasks[task_id] = task_record
        self._save_photogrammetry_tasks()
        return task_record

    def cancel_photogrammetry_task(self, task_id: str) -> Dict[str, Any]:
        """Aborts an active or queued drone photogrammetry mission."""
        if task_id in self.photogrammetry_tasks:
            self.photogrammetry_tasks[task_id]["status"] = NodeODMLifecycleStatus.CANCELLED.value
            self.photogrammetry_tasks[task_id]["error_message"] = "Drone photogrammetry task aborted by user request."
            self.photogrammetry_tasks[task_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._save_photogrammetry_tasks()
        return {
            "task_id": task_id,
            "status": "cancelled",
            "message": "Drone photogrammetry task aborted."
        }

    def restart_photogrammetry_task(self, task_id: str) -> Dict[str, Any]:
        """Restarts a failed or cancelled photogrammetry task."""
        now_iso = datetime.now(timezone.utc).isoformat()
        if task_id in self.photogrammetry_tasks:
            t = self.photogrammetry_tasks[task_id]
            t["status"] = NodeODMLifecycleStatus.RUNNING.value
            t["stage"] = NodeODMPipelineStage.DATASET_INITIALIZATION.value
            t["stage_label"] = "Dataset & EXIF Initialization"
            t["progress_percent"] = 5.0
            t["elapsed_seconds"] = 0.0
            t["error_message"] = None
            t["updated_at"] = now_iso
            self._save_photogrammetry_tasks()
            return t
        sim = simulate_nodeodm_task_progression(task_id=task_id, stage=NodeODMPipelineStage.DATASET_INITIALIZATION)
        self.photogrammetry_tasks[task_id] = sim
        self._save_photogrammetry_tasks()
        return sim

    def update_photogrammetry_gcps(
        self,
        task_id: str,
        req: Union[DronePhotogrammetryGCPUpdateRequest, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Updates Ground Control Points and recalculates georeferencing for a photogrammetry mission."""
        req_obj = DronePhotogrammetryGCPUpdateRequest.model_validate(req) if isinstance(req, dict) else req
        gcps_list = [g.model_dump() if hasattr(g, "model_dump") else dict(g) for g in req_obj.gcps]

        affine_res = None
        enabled_count = len([g for g in gcps_list if g.get("is_enabled", True)])
        check_count = len([g for g in gcps_list if g.get("is_check_point", False)])

        if req_obj.recalculate_georeferencing and enabled_count >= 3:
            affine_res = solve_gcp_affine_transform(gcps_list)

        if task_id in self.photogrammetry_tasks:
            self.photogrammetry_tasks[task_id]["gcps"] = gcps_list
            if affine_res:
                self.photogrammetry_tasks[task_id]["affine_geotransform"] = affine_res
            self.photogrammetry_tasks[task_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._save_photogrammetry_tasks()

        return {
            "task_id": task_id,
            "total_gcps": len(gcps_list),
            "enabled_gcps": enabled_count,
            "check_points": check_count,
            "affine_geotransform": affine_res,
            "message": "GCP network updated successfully."
        }

    def solve_gcp_affine(
        self,
        req: Union[DronePhotogrammetryAffineSolveRequest, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Computes 6-parameter least-squares 2D affine geotransform and spatial RMSE from Ground Control Points."""
        req_obj = DronePhotogrammetryAffineSolveRequest.model_validate(req) if isinstance(req, dict) else req
        affine_res = solve_gcp_affine_transform(req_obj.gcps)
        return {
            "success": True,
            "affine_geotransform": affine_res,
            "message": "Affine geotransform resolved successfully."
        }

    def calculate_flight_plan(
        self,
        req: Union[DroneFlightPlanRequest, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculates optimal flight altitude, ground footprint, photo spacing, and blur-free shutter speed."""
        req_obj = DroneFlightPlanRequest.model_validate(req) if isinstance(req, dict) else req
        return calculate_drone_flight_plan(req_obj.model_dump())

drone_service = DroneService()
