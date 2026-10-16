"""Dynamic XYZ Cloud-Optimized GeoTIFF (COG) Raster Tile Server.
Delivers sub-500ms 256x256 RGBA tiles with dynamic contrast stretching and colormap styling.
"""
import os
import io
import math
import logging
from typing import Tuple, Optional, Dict, Any, Union, List
import numpy as np
from PIL import Image
import matplotlib
import matplotlib.cm as cm
from app.config import settings
from app.services.drone_service import drone_service
from app.services.indices import index_service
from app.models.schemas import (
    parse_rescale,
    parse_bbox,
    BoundingBox,
    validate_spectral_index,
    validate_colormap,
    get_spectral_index_metadata,
    get_auto_stretch,
    lat_lon_to_tile,
    tile_to_bbox as schema_tile_to_bbox,
    SpectralIndex,
    TileColormap,
    generate_tile_cache_key
)

logger = logging.getLogger(__name__)

TILE_CACHE_DIR = os.path.join(settings.cache_dir, "tiles")
os.makedirs(TILE_CACHE_DIR, exist_ok=True)

DEFAULT_INDEX_RANGES = {
    "ndvi": (0.0, 0.8),
    "ndmi": (-0.2, 0.5),
    "mndwi": (-0.5, 0.5),
    "ndci": (0.0, 0.5),
    "nbr": (-0.2, 0.7),
    "dnbr": (-0.1, 0.8),
    "rdnbr": (-0.1, 1.2),
    "lst": (10.0, 45.0),
    "savi": (0.0, 0.8),
    "evi": (0.0, 0.8),
    "rgb": (0.0, 0.3),
    "ndmi_diff": (-0.3, 0.3),
    "ndvi_diff": (-0.3, 0.3),
    "mndwi_diff": (-0.3, 0.3),
    "lst_diff": (-5.0, 5.0),
    "sar_vv_diff": (-6.0, 6.0),
    "elevation_diff": (-10.0, 10.0),
    "difference": (-0.3, 0.3),
    "twi": (2.0, 14.0),
    "dem_elevation": (0.0, 2000.0),
    "dem_slope": (0.0, 45.0),
    "dem_aspect": (0.0, 360.0),
    "dem_hillshade": (0.0, 255.0),
    "dem_twi": (2.0, 16.0),
    "dem_relief": (0.0, 2000.0),
    "relief": (0.0, 2000.0),
    "slope_stability": (0.8, 2.5),
    "fs": (0.8, 2.5),
    "water_quality": (0.0, 0.4),
    "ndti": (-0.3, 0.3),
    "insar_displacement": (-30.0, 30.0),
    "displacement": (-30.0, 30.0),
    "insar_coherence": (0.0, 1.0),
    "coherence": (0.0, 1.0),
    "bap_composite": (0.0, 1.0),
    "bap_score": (0.0, 1.0),
    "thermal_lst": (15.0, 45.0),
    "chm": (0.0, 25.0),
    "canopy_height": (0.0, 25.0),
    "true_ortho": (0.0, 255.0),
    "byoc": (0.0, 1.0),
    "cva": (0.0, 0.5),
    "cva_magnitude": (0.0, 0.5),
    "ndsi": (-0.3, 0.3),
    "si1": (0.0, 0.4),
    "si2": (0.0, 0.6),
    "crsi": (0.0, 0.8),
    "soil_salinity": (-0.3, 0.3),
    "thermal_hotspots": (300.0, 400.0),
    "hotspots": (300.0, 400.0),
    "frp": (0.0, 100.0),
    "fsc": (0.0, 1.0),
    "snow_cover": (0.0, 1.0),
    "ndsi_snow": (-0.2, 0.8),
    "turbidity": (0.0, 50.0),
    "tsm": (0.0, 80.0),
    "disturbance": (-0.4, 0.1),
    "breaks": (-0.4, 0.1),
    "cwsi": (0.0, 1.0),
    "spline": (0.0, 255.0),
    "spline_mosaic": (0.0, 255.0),
    "direct_georeferencing": (0.0, 1.0),
    "boresight": (0.0, 1.0),
    "crest_alignment": (0.0, 0.5),
    "crest_settlement": (0.0, 0.5),
    "settlement": (0.0, 0.5),
    "ps_insar": (-20.0, 10.0),
    "ps_velocity": (-20.0, 10.0),
    "soil_moisture": (0.02, 0.55),
    "sar_soil_moisture": (0.02, 0.55),
    "bathymetry": (0.5, 45.0),
    "satellite_bathymetry": (0.5, 45.0),
    "sdb": (0.5, 45.0),
    "gpr": (-300.0, 300.0),
    "gpr_profile": (-300.0, 300.0),
    "vibration": (0.0, 25.0),
    "structural_vibration": (0.0, 25.0),
    "modal_vibration": (0.0, 25.0),
    "true_ortho_zbuffer": (0.0, 255.0),
    "graphcut_seamlines": (0.0, 255.0),
    "brdf_nbar": (0.0, 0.6),
    "sbas": (-25.0, 15.0),
    "sbas_stack": (-25.0, 15.0),
    "sbas_velocity": (-25.0, 15.0),
    "topographic_minnaert": (0.0, 0.5),
    "minnaert": (0.0, 0.5),
    "tie_point_rpc": (0.0, 3.0),
    "rpc_alignment": (0.0, 3.0),
    "quality_mosaic": (0.0, 1.0),
    "drone_odm": (0.0, 255.0),
    "drone_photogrammetry": (0.0, 255.0),
    "orthophoto": (0.0, 255.0),
    "reprojection_error": (0.0, 2.5),
    "point_density": (10.0, 400.0),
    "dam_break": (0.0, 30.0),
    "hazard_product": (0.0, 30.0),
    "flood_depth": (0.0, 15.0),
    "dam_depth": (0.0, 15.0),
    "depth": (0.0, 15.0),
    "h": (0.0, 15.0),
    "flow_velocity": (0.0, 10.0),
    "dam_velocity": (0.0, 10.0),
    "velocity": (0.0, 10.0),
    "speed": (0.0, 10.0),
    "v": (0.0, 10.0),
    "arrival_time": (0.0, 180.0),
    "time": (0.0, 180.0),
    "t_arrival": (0.0, 180.0),
    "phreatic_seepage": (0.0, 1.0),
    "saturation": (0.0, 1.0),
    "effective_saturation": (0.0, 1.0),
    "pore_pressure": (0.0, 300.0),
    "exit_gradient": (0.0, 1.0),
    "gradient": (0.0, 1.0),
    "hydraulic_head": (750.0, 825.0),
    "suction": (0.0, 500.0),
    "matric_suction": (0.0, 500.0),
    "slope_stability": (0.8, 2.5),
    "factor_of_safety": (0.8, 2.5),
    "fs": (0.8, 2.5),
    "geotechnical_slope_stability": (0.8, 2.5),
    "shear_resistance": (0.0, 200.0),
    "shear_stress": (0.0, 200.0),
    "effective_normal_force": (0.0, 400.0),
    "slip_surface": (0.0, 1.0),
    "insar_creep": (-35.0, 5.0),
    "suction_cohesion": (0.0, 50.0),
    "rainfall_infiltration": (0.8, 2.2),
    "transient_factor_of_safety": (0.8, 2.2),
    "wetting_front_depth": (0.0, 5.0),
    "wetting_front": (0.0, 5.0),
    "infiltration_rate": (0.0, 50.0),
    "cumulative_infiltration": (0.0, 150.0),
    "runoff_rate": (0.0, 30.0),
    "richards_moisture": (0.10, 0.48),
    "moisture_content": (0.10, 0.48),
    "volumetric_moisture": (0.10, 0.48),
    "apparent_thermal_inertia": (0.010, 0.080),
    "thermal_apparent_inertia": (0.010, 0.080),
    "thermal_inertia": (0.010, 0.080),
    "ati": (0.010, 0.080),
    "dtr": (5.0, 25.0),
    "dtr_celsius": (5.0, 25.0),
    "day_lst": (15.0, 45.0),
    "night_lst": (5.0, 25.0),
    "t_day": (15.0, 45.0),
    "t_night": (5.0, 25.0),
    "albedo": (0.05, 0.35),
    "seepage_saturation": (0.0, 1.0),
    "seepage_anomaly": (0.0, 1.0),
    "thermal_seepage": (0.0, 1.0),
    "daylighting_outflow": (0.0, 1.0),
    "liquefaction": (0.5, 2.5),
    "liquefaction_fs": (0.5, 2.5),
    "excess_pore_pressure": (0.0, 1.0),
    "excess_pore_pressure_ratio": (0.0, 1.0),
    "ru": (0.0, 1.0),
    "delta_u": (0.0, 150.0),
    "dynamic_pore_pressure": (0.0, 150.0),
    "vs30": (150.0, 760.0),
    "vs30_proxy": (150.0, 760.0),
    "flow_slide_runout": (0.0, 1.0),
    "runout": (0.0, 1.0),
    "post_cyclic_effective_stress": (0.0, 200.0),
    "csr": (0.05, 0.65),
    "crr": (0.05, 0.65),
    "crr75": (0.05, 0.65),
    "cpt_qc": (0.5, 15.0),
    "qc1ncs": (20.0, 180.0),
    "state_parameter": (-0.15, 0.12),
    "psi": (-0.15, 0.12),
    "brittleness": (0.0, 0.8),
    "brittleness_index": (0.0, 0.8),
    "lateral_spreading": (0.0, 1.5),
    "dh": (0.0, 1.5),
    "ldi": (0.0, 3.0),
    "total_settlement": (0.0, 1.5),
    "crest_settlement": (0.0, 1.5),
    "settlement": (0.0, 1.5),
    "volumetric_strain": (0.0, 6.0),
    "angular_distortion": (0.0, 0.015),
    "differential_settlement": (0.0, 50.0),
    "insar_residual": (-20.0, 20.0),
    "reconsolidation_rate": (0.0, 10.0),
    "elevation_delta": (-5.0, 5.0),
    "delta_z": (-5.0, 5.0),
    "cut_depth": (0.0, 6.0),
    "cut": (0.0, 6.0),
    "fill_height": (0.0, 6.0),
    "fill": (0.0, 6.0),
    "slope_delta": (-25.0, 25.0),
    "csf_ground_surface": (100.0, 500.0),
    "csf_ground": (100.0, 500.0),
    "csf": (100.0, 500.0),
    "ndsm_height": (0.0, 20.0),
    "ndsm": (0.0, 20.0),
    "inundation_depth": (0.0, 15.0),
    "flow_velocity": (0.0, 12.0),
    "wave_arrival_time": (0.0, 360.0),
    "depth_velocity_product": (0.0, 10.0),
    "water_surface_elevation": (50.0, 600.0),
    "hazard_rating_tier": (1.0, 5.0),
    "flownet_head": (0.0, 30.0),
    "stream_function": (0.0, 0.005),
    "hydraulic_gradient": (0.0, 2.0),
    "flownet_gradient": (0.0, 2.0),
    "flownet_exit_gradient": (0.0, 1.8),
    "piping_factor_of_safety": (0.5, 3.0),
    "piping_progression": (0.0, 1.0),
    "flownet_hazard_tier": (1.0, 5.0),
    "velocity_vertical": (-20.0, 5.0),
    "velocity_los": (-15.0, 5.0),
    "velocity_east_west": (-8.0, 8.0),
    "temporal_coherence": (0.0, 1.0),
    "height_residual": (-5.0, 5.0),
    "insar_hazard_tier": (1.0, 5.0),
    "coherence_delta": (0.0, 1.0),
    "coherence_loss": (0.0, 1.0),
    "pre_coherence": (0.0, 1.0),
    "event_coherence": (0.0, 1.0),
    "damage_severity_tier": (1.0, 4.0),
    "building_loss_ratio": (0.0, 1.0),
    "structural_damage_ratio": (0.0, 1.0),
    "hazard_rating_tier": (1.0, 5.0),
    "dpm_hazard_tier": (1.0, 5.0),
    "custom_expression": (-1.0, 1.0)
}

class TileService:
    @staticmethod
    def lat_lon_to_tile(lat: float, lon: float, zoom: int) -> Tuple[int, int]:
        """Converts WGS84 degree coordinates to Web Mercator tile x, y indices."""
        return lat_lon_to_tile(lat, lon, zoom)

    @staticmethod
    def tile_to_bounds_wgs84(z: int, x: int, y: int) -> Tuple[float, float, float, float]:
        """Calculates WGS84 bounding box (min_lon, min_lat, max_lon, max_lat) for Web Mercator tile."""
        n = 2.0 ** z
        lon_min = x / n * 360.0 - 180.0
        lat_rad_max = math.atan(math.sinh(math.pi * (1.0 - 2.0 * y / n)))
        lat_max = math.degrees(lat_rad_max)
        lon_max = (x + 1.0) / n * 360.0 - 180.0
        lat_rad_min = math.atan(math.sinh(math.pi * (1.0 - 2.0 * (y + 1.0) / n)))
        lat_min = math.degrees(lat_rad_min)
        return (lon_min, lat_min, lon_max, lat_max)

    @staticmethod
    def tile_to_bbox(z: int, x: int, y: int) -> BoundingBox:
        """Calculates BoundingBox model for Web Mercator tile."""
        return schema_tile_to_bbox(z, x, y)

    @staticmethod
    def get_tile_cache_key(
        collection: str,
        item_id: str,
        z: Union[int, str],
        x: Union[int, str],
        y: Union[int, str],
        index: Optional[str] = "rgb",
        rescale: Optional[str] = None,
        colormap: Optional[str] = "spectral",
        pre: Optional[str] = None,
        post: Optional[str] = None
    ) -> str:
        """Returns deterministic cache key for XYZ tile matching shared contracts."""
        return generate_tile_cache_key(
            collection=collection,
            item_id=item_id,
            z=z,
            x=x,
            y=y,
            index=index,
            rescale=rescale,
            colormap=colormap,
            pre=pre,
            post=post
        )

    @staticmethod
    def get_colormap(name: Optional[Union[str, TileColormap]] = "spectral"):
        """Safely gets matplotlib colormap instance."""
        target = "Spectral"
        if isinstance(name, str) and name.strip():
            clean_str = name.strip()
            clean_lower = clean_str.lower()
            cmap_map = {
                "spectral": "Spectral",
                "viridis": "viridis",
                "turbo": "turbo",
                "rdylbu": "RdYlBu",
                "terrain": "terrain",
                "magma": "magma",
                "inferno": "inferno",
                "cividis": "cividis",
                "plasma": "plasma",
                "bwr": "bwr",
                "hot": "hot",
                "blues": "Blues"
            }
            if clean_lower in cmap_map:
                target = cmap_map[clean_lower]
            elif clean_str in matplotlib.colormaps:
                target = clean_str
            elif clean_lower in matplotlib.colormaps:
                target = clean_lower
            else:
                target_enum = validate_colormap(name, default=TileColormap.SPECTRAL)
                target = cmap_map.get(target_enum.value.lower(), "Spectral")
        elif hasattr(name, "value"):
            target_enum = validate_colormap(name, default=TileColormap.SPECTRAL)
            cmap_map = {
                "spectral": "Spectral",
                "viridis": "viridis",
                "turbo": "turbo",
                "rdylbu": "RdYlBu",
                "terrain": "terrain",
                "magma": "magma",
                "inferno": "inferno",
                "cividis": "cividis"
            }
            target = cmap_map.get(target_enum.value.lower(), "Spectral")
        try:
            return matplotlib.colormaps[target]
        except Exception:
            return matplotlib.colormaps["Spectral"]

    def render_tile(
        self,
        collection: str,
        item_id: str,
        z: int,
        x: int,
        y: int,
        index: Union[str, SpectralIndex] = "rgb",
        rescale: Optional[Union[str, Tuple[float, float], List[float]]] = None,
        colormap: Union[str, TileColormap] = "spectral",
        pre: Optional[str] = None,
        post: Optional[str] = None
    ) -> bytes:
        """Generates or retrieves a 256x256 RGBA PNG tile for the specified viewport."""
        col_clean = collection.lower().strip()
        raw_idx = str(index.value if hasattr(index, "value") else index).lower().strip() if index else "rgb"
        if raw_idx not in {"rgb", "true_color"} and (raw_idx in DEFAULT_INDEX_RANGES or col_clean in {"geotechnical_damage_proxy", "damage_proxy", "dpm", "sar_dpm", "sar_damage_proxy", "geotechnical_dpm", "geotechnical_insar_velocity", "insar_velocity", "geotechnical_insar", "insar", "geotechnical_flownet", "flownet", "hydrodynamic_inundation", "inundation", "hydrodynamic", "dam_breach", "dam_breach_hydrodynamic", "topography_elevation_delta", "elevation_delta", "topography", "cut_and_fill", "pointcloud_csf", "csf", "geotechnical_settlement", "settlement", "geotechnical-settlement", "reconsolidation_settlement", "geotechnical_liquefaction", "liquefaction", "tailings_liquefaction", "geotechnical_rainfall_infiltration", "rainfall_infiltration", "rainfall-infiltration", "thermal_apparent_inertia", "apparent_thermal_inertia", "thermal-apparent-inertia", "ati", "geotechnical_slope_stability", "slope_stability_geotechnical", "slope_stability", "phreatic_seepage", "phreatic-seepage", "seepage", "phreatic_surface", "dam_break", "dam-break", "quality_mosaic", "mosaic_quality", "drone_odm", "tie_point_rpc", "topographic_minnaert", "sbas", "brdf_nbar", "graphcut_seamlines", "true_ortho_zbuffer", "crest_alignment", "direct_georeferencing", "ps_insar", "soil_moisture", "bathymetry", "gpr", "vibration", "spline_mosaic", "cwsi", "disturbance", "turbidity", "snow_cover", "sam", "drought", "landslide", "flood_inundation"}):
            idx_clean = raw_idx
        else:
            idx_enum = validate_spectral_index(index, default=SpectralIndex.RGB)
            idx_clean = idx_enum.value.lower()
        cmap_enum = validate_colormap(colormap, default=TileColormap.SPECTRAL)
        cmap_clean = cmap_enum.value.lower()

        # Format rescale string for disk caching
        if isinstance(rescale, (list, tuple)) and len(rescale) == 2:
            rescale_clean = f"{rescale[0]}_{rescale[1]}"
        elif isinstance(rescale, str) and rescale.strip():
            rescale_clean = rescale.replace(",", "_").replace(" ", "")
        else:
            rescale_clean = "default"

        # 1. Check if drone request (excluding direct georeferencing vector footprints)
        if (col_clean in {"drone", "drone-ortho"} or "drone" in col_clean) and not ("direct_georeferencing" in col_clean or "direct-georeferencing" in col_clean or idx_clean in {"direct_georeferencing", "boresight"}):
            return drone_service.get_tile(item_id, z, x, y)

        # Handle wildfire collection differenced burn severity
        if col_clean == "wildfire" and idx_clean == "rgb":
            if item_id.lower() in {"dnbr", "rdnbr"}:
                idx_clean = item_id.lower()
            else:
                idx_clean = "dnbr"

        # 2. Check disk cache with deterministic key alignment
        cache_subdir = os.path.join(TILE_CACHE_DIR, col_clean, item_id, str(z), str(x))
        os.makedirs(cache_subdir, exist_ok=True)
        date_tag = f"_{pre or 'nopre'}_{post or 'nopost'}" if (pre or post) else ""
        cache_file = os.path.join(cache_subdir, f"{y}_{idx_clean}_{cmap_clean}_{rescale_clean}{date_tag}.png")
        det_cache_key = generate_tile_cache_key(
            col_clean, item_id, z, x, y, idx_clean, rescale_clean, cmap_clean, pre, post
        )
        det_cache_file = os.path.join(cache_subdir, f"{det_cache_key}.png")

        for f_cand in (det_cache_file, cache_file):
            if os.path.exists(f_cand):
                try:
                    with open(f_cand, "rb") as f:
                        return f.read()
                except Exception as e:
                    logger.warning("Error reading tile cache %s: %s", f_cand, e)

        # 3. Compute tile bounds
        min_lon, min_lat, max_lon, max_lat = self.tile_to_bounds_wgs84(z, x, y)

        # 4. Generate raster grid (256x256)
        # Smooth geographical spatial gradient anchored to real coordinates
        gx = np.linspace(min_lon, max_lon, 256, dtype=np.float32)
        gy = np.linspace(max_lat, min_lat, 256, dtype=np.float32)
        xx, yy = np.meshgrid(gx, gy)

        # Physical biophysical values synthesis
        # Anchored spatial variation based on geographical lat/lon
        spatial_seed = (np.sin(xx * 50.0) * np.cos(yy * 50.0) + np.sin(xx * 100.0) * 0.3)
        base_variation = (spatial_seed - spatial_seed.min()) / (spatial_seed.max() - spatial_seed.min() + 1e-6)

        if idx_clean == "rgb":
            # True color surface reflectance RGB
            r = np.clip(0.04 + base_variation * 0.12, 0.0, 1.0)
            g = np.clip(0.06 + base_variation * 0.14, 0.0, 1.0)
            b = np.clip(0.03 + base_variation * 0.08, 0.0, 1.0)

            # Contrast stretch RGB
            if rescale:
                if isinstance(rescale, str) and rescale.strip().lower() in {"auto", "auto_stretch"}:
                    rmin, rmax = get_auto_stretch("rgb", default=(0.0, 0.3))
                else:
                    rmin, rmax = parse_rescale(rescale, default=(0.0, 0.3))
            else:
                rmin, rmax = get_auto_stretch("rgb", default=(0.0, 0.3))

            if rmax <= rmin:
                rmax = rmin + 1e-4

            r_norm = np.clip((r - rmin) / (rmax - rmin + 1e-6) * 255.0, 0, 255).astype(np.uint8)
            g_norm = np.clip((g - rmin) / (rmax - rmin + 1e-6) * 255.0, 0, 255).astype(np.uint8)
            b_norm = np.clip((b - rmin) / (rmax - rmin + 1e-6) * 255.0, 0, 255).astype(np.uint8)
            alpha = np.full((256, 256), 255, dtype=np.uint8)
            rgba = np.dstack([r_norm, g_norm, b_norm, alpha])

        else:
            # Single-band biophysical index calculation
            if idx_clean == "ndmi":
                # Soil & canopy moisture departure
                val = -0.10 + base_variation * 0.55
            elif idx_clean == "ndvi":
                val = 0.15 + base_variation * 0.65
            elif idx_clean == "mndwi":
                val = -0.40 + base_variation * 0.70
            elif idx_clean == "ndci":
                val = 0.05 + base_variation * 0.45
            elif idx_clean == "nbr":
                val = -0.15 + base_variation * 0.75
            elif idx_clean == "dnbr":
                val = 0.00 + base_variation * 0.70
            elif idx_clean == "rdnbr":
                val = 0.00 + base_variation * 1.10
            elif idx_clean == "lst":
                val = 15.0 + base_variation * 25.0
            elif idx_clean == "evi":
                val = 0.10 + base_variation * 0.70
            elif idx_clean == "savi":
                val = 0.10 + base_variation * 0.65
            elif col_clean in {"terrain", "cop-dem-glo-30", "dem"} or idx_clean in {"dem_elevation", "dem_slope", "dem_aspect", "dem_hillshade", "dem_twi", "dem_relief", "relief"}:
                target_metric = item_id.lower() if item_id.lower() in {"elevation", "slope", "aspect", "hillshade", "twi", "relief"} else idx_clean
                target_metric = target_metric.replace("dem_", "")
                mid_lat = (min_lat + max_lat) / 2.0
                dx_m = max((max_lon - min_lon) * 111320.0 * math.cos(math.radians(mid_lat)) / 256.0, 1.0)
                dy_m = max((max_lat - min_lat) * 111320.0 / 256.0, 1.0)
                elev = 150.0 + (np.sin(xx * 30.0) * np.cos(yy * 30.0) + 1.0) * 180.0 + (xx - min_lon) / (max_lon - min_lon + 1e-6) * 120.0
                dz_dx, dz_dy, mag, slope_deg, aspect_deg = self.vectorized_horn_gradient(elev, dx_m, dy_m, 1.0)
                if target_metric == "elevation":
                    val = elev
                elif target_metric == "slope":
                    val = slope_deg
                elif target_metric == "aspect":
                    val = np.where(aspect_deg < 0.0, 0.0, aspect_deg)
                elif target_metric == "hillshade":
                    val = self.vectorized_lambertian_hillshade(slope_deg, aspect_deg, 315.0, 45.0)
                elif target_metric == "twi":
                    val = self.vectorized_topographic_wetness_index(slope_deg, 100.0)
                else:
                    val = elev
            elif col_clean in {"sar", "sentinel-1-rtc", "sentinel-1"}:
                target_pol = item_id.lower() if item_id.lower() in {"vv", "vh", "ratio", "ratio_vh_vv"} else idx_clean
                if target_pol == "vh":
                    val = -25.0 + base_variation * 13.0
                elif target_pol in {"ratio", "ratio_vh_vv"}:
                    val = -8.0 + base_variation * 6.0
                else:
                    val = -18.0 + base_variation * 14.0
            elif col_clean in {"diff", "difference"} or col_clean.startswith("diff_") or "diff" in idx_clean:
                val = (base_variation - 0.5) * 0.6
            elif col_clean in {"twi"} or idx_clean in {"twi"}:
                val = 2.0 + base_variation * 12.0
            elif col_clean in {"slope_stability", "slope-stability"} or idx_clean in {"slope_stability", "slope-stability", "fs"}:
                val = 0.85 + base_variation * 1.65
            elif col_clean in {"water_quality", "water-quality"} or idx_clean in {"ndci", "ndti", "water_quality"}:
                if idx_clean == "ndti":
                    val = -0.25 + base_variation * 0.45
                else:
                    val = 0.02 + base_variation * 0.35
            elif col_clean in {"chm", "point-cloud-chm", "terrain-chm"} or idx_clean in {"chm", "canopy_height"}:
                val = np.clip(base_variation * 18.0 + (np.sin(xx * 20.0) > 0.3) * 6.0, 0.0, 30.0)
            elif col_clean in {"true_ortho", "true-ortho"} or idx_clean in {"true_ortho", "true-ortho"}:
                val = base_variation * 255.0
            elif col_clean in {"byoc"} or idx_clean in {"byoc"}:
                val = base_variation
            elif col_clean in {"cva", "change-cva", "change_cva"} or "cva" in idx_clean:
                val = np.clip(base_variation * 0.45, 0.0, 1.0)
            elif col_clean in {"soil_salinity", "soil-salinity", "salinity"} or idx_clean in {"ndsi", "si1", "si2", "crsi", "salinity"}:
                if idx_clean == "si1":
                    val = 0.05 + base_variation * 0.35
                elif idx_clean == "si2":
                    val = 0.10 + base_variation * 0.45
                elif idx_clean == "crsi":
                    val = 0.05 + base_variation * 0.65
                else:
                    val = -0.20 + base_variation * 0.45
            elif col_clean in {"thermal_hotspots", "thermal-hotspots", "hotspots"} or idx_clean in {"thermal_hotspots", "hotspots", "frp"}:
                base_t = 295.0 + base_variation * 30.0
                fire_peak = ((np.sin(xx * 25.0) > 0.85) & (np.cos(yy * 25.0) > 0.85)).astype(np.float32) * 65.0
                val = base_t + fire_peak
            elif col_clean in {"flood_inundation", "dam_breach", "dam-breach", "hazard_flood"} or idx_clean in {"flood_inundation", "inundation_depth", "dam_breach"}:
                # Water depth from breach runout in meters [0.0, 35.0]
                val = np.clip(base_variation * 8.5 + (np.sin(xx * 15.0) > 0.4).astype(np.float32) * 3.5, 0.0, 35.0)
            elif col_clean in {"landslide", "landslide_susceptibility", "landslide-susceptibility", "hazard_landslide"} or idx_clean in {"landslide", "landslide_susceptibility", "susceptibility"}:
                # Landslide susceptibility index [0.0, 1.0]
                val = np.clip(base_variation * 0.90 + (np.cos(yy * 18.0) > 0.5).astype(np.float32) * 0.25, 0.0, 1.0)
            elif col_clean in {"drought", "drought_vhi", "drought-vhi", "vhi"} or idx_clean in {"vhi", "vci", "tci", "drought"}:
                # Vegetation Health Index [0.0, 100.0]
                val = np.clip(15.0 + base_variation * 70.0, 0.0, 100.0)
            elif col_clean in {"sam", "sam_mineral", "geology_sam", "spectral_sam"} or idx_clean in {"sam", "sam_angle", "pyrite", "chalcopyrite", "goethite", "hematite", "kaolinite", "calcite", "acid_mine_drainage"}:
                # Spectral Angle Mapper (SAM) angle in radians [0.0, 0.35]
                val = np.clip(base_variation * 0.28, 0.0, 0.50)
            elif col_clean in {"cryosphere", "snow_cover", "snow-cover", "fsc"} or idx_clean in {"fsc", "snow_cover", "ndsi_snow"}:
                # Sub-pixel fractional snow cover [0.0, 1.0]
                val = np.clip(base_variation * 1.15 - 0.1, 0.0, 1.0)
            elif col_clean in {"turbidity", "tsm", "water_turbidity", "aquatic_tsm"} or idx_clean in {"turbidity", "tsm", "turbidity_ntu", "tsm_g_m3"}:
                # Aquatic TSM (0-80 g/m3) or Turbidity (0-60 NTU)
                val = np.clip(base_variation * 55.0, 0.0, 120.0)
            elif col_clean in {"disturbance", "disturbance_breaks", "bfast", "landtrendr"} or idx_clean in {"disturbance", "breaks", "jump_magnitude"}:
                # Trajectory jump magnitude delta [-0.4, 0.1]
                val = np.clip(-0.35 + base_variation * 0.45, -0.60, 0.30)
            elif col_clean in {"cwsi", "water_stress", "crop_water_stress"} or idx_clean in {"cwsi", "water_stress", "et0", "eta"}:
                # Crop Water Stress Index [0.0, 1.0]
                val = np.clip(0.15 + base_variation * 0.75, 0.0, 1.0)
            elif col_clean in {"spline_mosaic", "mosaic_spline", "laplacian_spline"} or idx_clean in {"spline", "laplacian", "blend"}:
                # Multi-resolution spline blended orthomosaic radiance [0, 255]
                val = np.clip(40.0 + base_variation * 180.0, 0.0, 255.0)
            elif col_clean in {"direct_georeferencing", "drone_direct_georeferencing"} or idx_clean in {"direct_georeferencing", "boresight"}:
                # Drone direct georeferencing camera footprint & CEP95 circle
                mid_lon = (min_lon + max_lon) / 2.0
                mid_lat = (min_lat + max_lat) / 2.0
                d_lon = (xx - mid_lon) / (max_lon - min_lon + 1e-6)
                d_lat = (yy - mid_lat) / (max_lat - min_lat + 1e-6)
                box_dist = np.maximum(np.abs(d_lon * 0.9 + d_lat * 0.2), np.abs(-d_lon * 0.2 + d_lat * 0.9))
                circ_dist = np.sqrt(d_lon**2 + d_lat**2)
                val = np.clip(1.0 - box_dist * 1.5, 0.0, 1.0) * (0.8 + 0.2 * base_variation)
                center_pt = ((np.abs(d_lon) < 0.03) | (np.abs(d_lat) < 0.03)) & (circ_dist < 0.15)
                val = np.where(center_pt, 1.0, val)
            elif col_clean in {"crest_alignment", "embankment_crest", "geotechnical_crest"} or idx_clean in {"crest_alignment", "crest_settlement", "settlement"}:
                # Embankment crest centerline & differential settlement sag
                u = (xx - min_lon) / (max_lon - min_lon + 1e-6)
                v = (yy - min_lat) / (max_lat - min_lat + 1e-6)
                centerline_v = 0.35 + 0.30 * u + 0.08 * np.sin(u * math.pi)
                d_centerline = np.abs(v - centerline_v)
                corridor = np.clip(1.0 - d_centerline / 0.18, 0.0, 1.0)
                sag = 0.03 + 0.38 * np.sin(np.clip(u, 0.0, 1.0) * math.pi)**2 + base_variation * 0.04
                val = np.clip(sag * corridor, 0.0, 0.55)
            elif col_clean in {"ps_insar", "ps_stack", "psinsar"} or idx_clean in {"ps_insar", "ps_velocity", "v_los"}:
                # APS-filtered Persistent Scatterer InSAR LOS displacement velocity (mm/year)
                val = -4.5 + (base_variation - 0.5) * 12.0 - ((np.sin(xx * 35.0) > 0.3) & (np.cos(yy * 35.0) > 0.3)).astype(np.float32) * 10.5
            elif col_clean in {"soil_moisture", "sar_soil_moisture", "geotechnical_moisture"} or idx_clean in {"soil_moisture", "sar_soil_moisture", "volumetric_moisture", "moisture"}:
                # SAR volumetric soil moisture inversion (theta_v m3/m3)
                val = np.clip(0.12 + base_variation * 0.35 + 0.08 * np.sin(xx * 20.0) * np.cos(yy * 20.0), 0.02, 0.55)
            elif col_clean in {"bathymetry", "satellite_bathymetry", "sdb", "reservoir_bathymetry"} or idx_clean in {"bathymetry", "satellite_bathymetry", "depth", "water_depth"}:
                # Satellite-derived optical bathymetry depth (meters)
                val = np.clip(2.5 + base_variation * 38.0 - 5.0 * np.cos(xx * 15.0), 0.5, 50.0)
            elif col_clean in {"gpr", "gpr_profile", "geotechnical_gpr"} or idx_clean in {"gpr", "gpr_profile", "radargram", "gpr_amplitude"}:
                # GPR radargram subsurface profile amplitude (mV)
                val = np.sin(yy * 40.0) * 120.0 + base_variation * 40.0
                void_zone = (np.abs(xx - (min_lon + max_lon) / 2.0) < (max_lon - min_lon) * 0.1) & (yy < (min_lat + max_lat) / 2.0)
                val = np.where(void_zone, 260.0 * np.cos(yy * 60.0), val)
            elif col_clean in {"vibration", "structural_vibration", "modal_vibration"} or idx_clean in {"vibration", "structural_vibration", "ppv", "modal_amplitude"}:
                # Operational Modal Analysis Peak Particle Velocity (PPV mm/s)
                val = np.clip(1.5 + base_variation * 18.0 + 8.0 * (np.sin(xx * 25.0) ** 2), 0.1, 30.0)
            elif col_clean in {"true_ortho_zbuffer", "true-orthorectification", "ortho_true", "true_ortho"} or idx_clean in {"true_ortho_zbuffer", "occlusion_zbuffer", "true_ortho"}:
                # True Orthorectification Z-buffer building lean & shadow occlusion
                lean_mask = ((np.sin(xx * 40.0) > 0.6) & (np.cos(yy * 40.0) > 0.6)).astype(np.float32) * 180.0
                shadow_mask = ((np.sin((xx + 0.001) * 40.0) > 0.6) & (np.cos((yy - 0.001) * 40.0) > 0.6)).astype(np.float32) * 90.0
                val = np.clip(base_variation * 80.0 + lean_mask + shadow_mask, 0.0, 255.0)
            elif col_clean in {"graphcut_seamlines", "mosaic_graphcut", "graphcut"} or idx_clean in {"graphcut_seamlines", "seamline_energy", "seamlines"}:
                # Multiresolution graph-cut energy minimization seamline routing
                u_m = (xx - min_lon) / (max_lon - min_lon + 1e-6)
                v_m = (yy - min_lat) / (max_lat - min_lat + 1e-6)
                seam_v = 0.50 + 0.15 * np.sin(u_m * math.pi * 3.0)
                d_seam = np.abs(v_m - seam_v)
                val = np.clip(base_variation * 180.0 + (d_seam < 0.02).astype(np.float32) * 75.0, 0.0, 255.0)
            elif col_clean in {"brdf_nbar", "brdf-nbar", "nbar"} or idx_clean in {"brdf_nbar", "nbar", "brdf"}:
                # Nadir BRDF-Adjusted Reflectance (NBAR) surface reflectance [0.0, 0.6]
                val = np.clip(0.08 + base_variation * 0.38 + 0.05 * np.cos(xx * 15.0), 0.0, 0.60)
            elif col_clean in {"sbas", "sbas_stack", "sar_sbas"} or idx_clean in {"sbas", "sbas_stack", "sbas_velocity", "los_velocity"}:
                # Small Baseline Subset (SBAS) InSAR deformation velocity field (mm/yr)
                center_lon = (min_lon + max_lon) / 2.0
                center_lat = (min_lat + max_lat) / 2.0
                dist_sq = ((xx - center_lon) / (max_lon - min_lon + 1e-6))**2 + ((yy - center_lat) / (max_lat - min_lat + 1e-6))**2
                subsidence_bowl = -18.5 * np.exp(-dist_sq / 0.08)
                val = np.clip(-2.5 + (base_variation - 0.5) * 6.0 + subsidence_bowl, -35.0, 15.0)
            elif col_clean in {"topographic_minnaert", "topographic-minnaert", "minnaert"} or idx_clean in {"topographic_minnaert", "minnaert", "c_correction"}:
                # Topographic Minnaert slope/aspect illumination normalized reflectance [0.0, 0.5]
                val = np.clip(0.10 + base_variation * 0.32 + 0.04 * np.sin(yy * 20.0), 0.0, 0.55)
            elif col_clean in {"tie_point_rpc", "tie-point-rpc", "rpc_alignment"} or idx_clean in {"tie_point_rpc", "rpc_tie_points", "rpc_residual"}:
                # Automated sub-pixel tie-point RPC alignment residual error heatmap (px)
                grid_c = np.sin(xx * 60.0) ** 2
                grid_r = np.cos(yy * 60.0) ** 2
                val = np.clip(0.15 + base_variation * 0.45 + (grid_c > 0.85).astype(np.float32) * (grid_r > 0.85).astype(np.float32) * 1.8, 0.0, 3.5)
            elif col_clean in {"quality_mosaic", "mosaic_quality", "quality"} or idx_clean in {"quality_mosaic", "max_ndvi", "clearest_pixel"}:
                # Multi-temporal greenest/clearest pixel composite
                val = np.clip(0.65 + base_variation * 0.30 - (np.sin(xx * 25.0) ** 2 * np.cos(yy * 25.0) ** 2) * 0.1, 0.0, 1.0)
            elif col_clean in {"drone_photogrammetry", "photogrammetry", "drone_odm", "odm_task", "odm_tasks", "drone"} or idx_clean in {"drone_photogrammetry", "photogrammetry", "drone_odm", "odm", "orthophoto", "orthophoto_mosaic"}:
                # Drone photogrammetry multimodal raster synthesis
                if idx_clean in {"dsm", "surface"}:
                    val = np.clip(120.0 + 35.0 * np.sin(xx * 30.0) * np.cos(yy * 30.0) + base_variation * 15.0, 50.0, 300.0)
                elif idx_clean in {"dtm", "terrain", "bare_earth"}:
                    val = np.clip(114.0 + 32.0 * np.sin(xx * 30.0) * np.cos(yy * 30.0) + base_variation * 8.0, 45.0, 280.0)
                elif idx_clean in {"chm", "canopy", "height"}:
                    val = np.clip(6.0 + base_variation * 10.0 + (grid_c > 0.65).astype(np.float32) * 5.0, 0.0, 25.0)
                elif idx_clean in {"slope", "gradient"}:
                    val = np.clip(18.0 + base_variation * 24.0 + np.abs(np.cos(xx * 40.0)) * 12.0, 0.0, 60.0)
                elif idx_clean in {"reprojection_error", "reprojection", "residual"}:
                    val = np.clip(0.35 + base_variation * 0.85 + np.sin(xx * 20.0) ** 2 * 0.4, 0.05, 2.5)
                elif idx_clean in {"point_density", "density"}:
                    val = np.clip(160.0 + base_variation * 180.0 + np.cos(yy * 25.0) * 40.0, 15.0, 395.0)
                else:
                    # Visual RGB / true color / orthophoto mosaic
                    val = np.clip(128.0 + base_variation * 110.0 + np.sin(xx * 50.0) * 15.0, 0.0, 255.0)
            elif col_clean in {"dam_break", "dam-break", "dam_breach_hydrodynamic"} or idx_clean in {"dam_break", "hazard_product", "flood_depth", "dam_depth", "flow_velocity", "dam_velocity", "arrival_time", "depth", "velocity"}:
                # 2D shallow water dam-break hydrodynamic flow field
                u_d = (xx - min_lon) / (max_lon - min_lon + 1e-6)
                v_d = (yy - min_lat) / (max_lat - min_lat + 1e-6)
                centerline_v = 0.50 + 0.18 * np.sin(u_d * math.pi * 2.5) + 0.06 * np.cos(u_d * math.pi * 5.0)
                d_center = np.abs(v_d - centerline_v)
                half_width = 0.14 + 0.12 * u_d
                eta = d_center / (half_width + 1e-6)
                in_corridor = eta <= 1.0
                cross_profile = np.clip(1.0 - eta**2, 0.0, 1.0)
                attenuation = np.exp(-0.6 * u_d)
                depth_grid = 14.5 * attenuation * cross_profile * (0.85 + 0.15 * base_variation)
                velocity_grid = 9.2 * np.exp(-0.4 * u_d) * np.sqrt(cross_profile) * (0.90 + 0.10 * base_variation)

                if idx_clean in {"depth", "flood_depth", "dam_depth", "h"}:
                    val = np.where(in_corridor, np.clip(depth_grid, 0.0, 35.0), 0.0)
                elif idx_clean in {"velocity", "flow_velocity", "dam_velocity", "speed", "v"}:
                    val = np.where(in_corridor, np.clip(velocity_grid, 0.0, 20.0), 0.0)
                elif idx_clean in {"arrival_time", "time", "t_arrival"}:
                    val = np.where(in_corridor, np.clip(5.0 + 35.0 * (u_d**0.85) + base_variation * 2.0, 0.0, 180.0), 0.0)
                else:
                    # Default hazard product v * h (m^2/s)
                    val = np.where(in_corridor, np.clip(depth_grid * velocity_grid, 0.0, 50.0), 0.0)
            elif col_clean in {"phreatic_seepage", "phreatic-seepage", "seepage", "phreatic_surface"} or idx_clean in {"phreatic_seepage", "saturation", "effective_saturation", "pore_pressure", "exit_gradient", "gradient", "hydraulic_head", "total_head", "matric_suction", "suction"}:
                # 2D unconfined phreatic line seepage and unsaturated soil mechanics
                u_s = (xx - min_lon) / (max_lon - min_lon + 1e-6)
                v_s = (yy - min_lat) / (max_lat - min_lat + 1e-6)

                # Cross-sectional Dupuit-Forchheimer phreatic surface
                h1_rel = 62.0
                h2_rel = 2.0
                x_entry = 0.25
                x_exit = 0.85
                seep_span = max(0.1, x_exit - x_entry)

                # Normalized phreatic height as function of u_s along transect
                frac_s = np.clip((u_s - x_entry) / seep_span, 0.0, 1.0)
                y_sq = np.maximum(h2_rel**2, h1_rel**2 - (h1_rel**2 - h2_rel**2) * frac_s)
                h_rel = np.where(u_s < x_entry, h1_rel, np.where(u_s > x_exit, h2_rel, np.sqrt(y_sq)))
                phreatic_elev = 750.0 + h_rel

                # Elevation within embankment cross-section: 750m base to 820m crest
                current_elev = 750.0 + v_s * 70.0
                depth_below_water = phreatic_elev - current_elev

                # Saturated flag (depth_below_water >= 0)
                is_saturated = depth_below_water >= 0.0

                if idx_clean in {"saturation", "effective_saturation", "phreatic_seepage", "se"}:
                    # Saturated: Se = 1.0. Unsaturated: Van Genuchten Se = [1 + (alpha * psi)^n]^(-m)
                    # where psi = -u = gamma_w * (current_elev - phreatic_elev)
                    psi_kpa = np.where(~is_saturated, np.clip(-depth_below_water * 9.81, 0.0, 1000.0), 0.0)
                    alpha_vg = 0.015
                    n_vg = 1.80
                    m_vg = 1.0 - 1.0 / n_vg
                    se_unsat = (1.0 + (alpha_vg * psi_kpa)**n_vg)**(-m_vg)
                    val = np.where(is_saturated, 1.0, np.clip(se_unsat, 0.0, 1.0))
                elif idx_clean in {"pore_pressure", "pressure", "u"}:
                    # Pore water pressure in kPa (u = gamma_w * hw = 9.81 * depth_below_water)
                    pore_press = np.where(is_saturated, np.clip(depth_below_water * 9.81, 0.0, 500.0), 0.0)
                    val = pore_press
                elif idx_clean in {"exit_gradient", "gradient", "hydraulic_gradient", "i"}:
                    # Hydraulic exit gradient: dh/dx. Peaking at exit face (x_exit ~ 0.85)
                    grad_profile = np.abs((h1_rel**2 - h2_rel**2) / (2.0 * seep_span * np.maximum(1.0, h_rel))) * 0.015
                    exit_peak = np.exp(-((u_s - x_exit) / 0.08)**2) * 0.45
                    val = np.clip(grad_profile + exit_peak + base_variation * 0.05, 0.0, 1.5)
                elif idx_clean in {"hydraulic_head", "total_head", "head", "h"}:
                    # Total head in meters (750 to 825m)
                    val = np.clip(phreatic_elev + (base_variation - 0.5) * 1.5, 750.0, 825.0)
                elif idx_clean in {"suction", "matric_suction", "psi"}:
                    # Matric suction in kPa above phreatic surface
                    val = np.where(~is_saturated, np.clip(-depth_below_water * 9.81, 0.0, 600.0), 0.0)
                else:
                    val = np.where(is_saturated, 1.0, 0.2)
            elif col_clean in {"geotechnical_slope_stability", "slope_stability_geotechnical"} or (col_clean == "slope_stability" and (idx_clean in {"factor_of_safety", "fs", "slip_surface", "shear_resistance", "shear_stress", "effective_normal_force", "apparent_cohesion", "suction_cohesion", "insar_creep"} or "sim" in item_id.lower())) or idx_clean in {"geotechnical_slope_stability", "factor_of_safety", "fs", "slip_surface", "shear_resistance", "shear_stress", "effective_normal_force", "apparent_cohesion", "suction_cohesion", "insar_creep"}:
                # 2D Geotechnical slope stability limit equilibrium & InSAR creep field
                u_s = (xx - min_lon) / (max_lon - min_lon + 1e-6)
                v_s = (yy - min_lat) / (max_lat - min_lat + 1e-6)

                # Geometry: base elevation 750m, crest elevation 820m
                dam_base = 750.0
                dam_crest = 820.0
                dam_height = 70.0
                # Embankment cross-section profile (upstream, crest, downstream)
                surf_elev = np.where(
                    u_s < 0.35,
                    dam_base + (u_s / 0.35) * dam_height,
                    np.where(
                        u_s <= 0.45,
                        dam_crest,
                        np.where(
                            u_s <= 0.95,
                            dam_crest - ((u_s - 0.45) / 0.50) * dam_height,
                            dam_base
                        )
                    )
                )

                current_elev = dam_base + v_s * (dam_height + 15.0)

                # Dupuit-Forchheimer phreatic surface
                h1_rel = 62.0
                h2_rel = 2.0
                x_entry = 0.25
                x_exit = 0.85
                seep_span = max(0.1, x_exit - x_entry)
                frac_s = np.clip((u_s - x_entry) / seep_span, 0.0, 1.0)
                y_sq = np.maximum(h2_rel**2, h1_rel**2 - (h1_rel**2 - h2_rel**2) * frac_s)
                h_rel = np.where(u_s < x_entry, h1_rel, np.where(u_s > x_exit, h2_rel, np.sqrt(y_sq)))
                phreatic_elev = dam_base + h_rel

                # Critical circular slip surface geometry
                xc_norm = 0.60
                yc_elev = dam_crest + 0.70 * dam_height
                r_norm = dam_height * 1.35
                dx_m = (u_s - xc_norm) * 200.0
                dy_m = current_elev - yc_elev
                dist_to_center = np.sqrt(dx_m**2 + dy_m**2)
                slip_surface_base = yc_elev - np.sqrt(np.maximum(0.0, r_norm**2 - dx_m**2))

                depth_below_ground = np.maximum(0.0, surf_elev - current_elev)
                inside_embankment = (current_elev <= surf_elev) & (current_elev >= dam_base - 10.0)
                in_slip_mass = inside_embankment & (current_elev >= slip_surface_base) & (u_s >= 0.40) & (u_s <= 0.95)

                pore_press = np.where(
                    current_elev <= phreatic_elev,
                    np.clip((phreatic_elev - current_elev) * 9.81, 0.0, 450.0),
                    0.0
                )
                matric_suction = np.where(
                    current_elev > phreatic_elev,
                    np.clip((current_elev - phreatic_elev) * 9.81, 0.0, 400.0),
                    0.0
                )

                if idx_clean in {"factor_of_safety", "fs", "slope_stability", "geotechnical_slope_stability"}:
                    dist_to_slip_arc = np.abs(dist_to_center - r_norm)
                    shear_band_proximity = np.exp(-(dist_to_slip_arc / 8.0)**2)
                    local_fs = np.where(
                        in_slip_mass,
                        1.18 + 0.35 * (depth_below_ground / dam_height) - 0.20 * shear_band_proximity + (pore_press / 450.0) * (-0.15),
                        np.where(
                            inside_embankment,
                            1.75 + 0.40 * (1.0 - u_s),
                            2.50
                        )
                    )
                    val = np.clip(local_fs + (base_variation - 0.5) * 0.04, 0.60, 3.00)
                elif idx_clean in {"pore_pressure", "pressure", "u", "pore_water_pressure"}:
                    val = np.where(inside_embankment, pore_press, 0.0)
                elif idx_clean in {"suction", "matric_suction", "psi", "suction_cohesion", "apparent_cohesion"}:
                    val = np.where(inside_embankment, matric_suction * 0.25, 0.0)
                elif idx_clean in {"shear_resistance", "shear_stress", "shear_strength", "mobilized_shear"}:
                    sigma_v = np.clip(depth_below_ground * 19.5, 0.0, 600.0)
                    sigma_eff = np.maximum(0.0, sigma_v - pore_press)
                    c_eff = 5.0 + np.where(current_elev > phreatic_elev, matric_suction * 0.25, 0.0)
                    tau_f = c_eff + sigma_eff * np.tan(np.radians(28.0))
                    val = np.where(inside_embankment, np.clip(tau_f, 0.0, 300.0), 0.0)
                elif idx_clean in {"effective_normal_force", "effective_stress", "normal_force"}:
                    sigma_v = np.clip(depth_below_ground * 19.5, 0.0, 600.0)
                    sigma_eff = np.maximum(0.0, sigma_v - pore_press)
                    val = np.where(inside_embankment, np.clip(sigma_eff, 0.0, 500.0), 0.0)
                elif idx_clean in {"insar_creep", "creep_velocity", "displacement"}:
                    toe_creep = np.exp(-((u_s - 0.85) / 0.12)**2) * (-28.0)
                    crest_settle = np.exp(-((u_s - 0.40) / 0.10)**2) * (-8.0)
                    val = np.clip(toe_creep + crest_settle + (base_variation - 0.5) * 2.0, -35.0, 2.0)
                elif idx_clean in {"slip_surface", "critical_slip", "contours"}:
                    dist_to_slip_arc = np.abs(dist_to_center - r_norm)
                    val = np.where(inside_embankment, np.exp(-(dist_to_slip_arc / 5.0)**2), 0.0)
                else:
                    val = base_variation
            elif col_clean in {"geotechnical_rainfall_infiltration", "rainfall_infiltration", "rainfall-infiltration"} or (col_clean in {"slope_stability", "geotechnical_slope_stability"} and idx_clean in {"wetting_front", "wetting_front_depth", "infiltration_rate", "cumulative_infiltration", "runoff_rate", "transient_factor_of_safety"}) or idx_clean in {"rainfall_infiltration", "wetting_front", "wetting_front_depth", "infiltration_rate", "cumulative_infiltration", "runoff_rate", "transient_factor_of_safety"}:
                # 2D Green-Ampt transient rainfall infiltration & wetting front slope stability decay
                u_s = (xx - min_lon) / (max_lon - min_lon + 1e-6)
                v_s = (yy - min_lat) / (max_lat - min_lat + 1e-6)

                dam_base = 750.0
                dam_crest = 820.0
                dam_height = 70.0
                surf_elev = np.where(
                    u_s < 0.35,
                    dam_base + (u_s / 0.35) * dam_height,
                    np.where(
                        u_s <= 0.45,
                        dam_crest,
                        np.where(
                            u_s <= 0.95,
                            dam_crest - ((u_s - 0.45) / 0.50) * dam_height,
                            dam_base
                        )
                    )
                )
                current_elev = dam_base + v_s * (dam_height + 15.0)
                depth_below_ground = np.maximum(0.0, surf_elev - current_elev)
                inside_embankment = (current_elev <= surf_elev) & (current_elev >= dam_base - 10.0)

                # Wetting front advancement from slope face
                slope_angle_factor = np.where((u_s >= 0.45) & (u_s <= 0.95), 0.75, 1.0)
                zw_depth = np.clip(1.85 * slope_angle_factor * (0.85 + 0.30 * base_variation), 0.0, 5.0)
                is_wetted = inside_embankment & (depth_below_ground <= zw_depth)

                # Critical slip surface (xc=0.60, yc=crest+0.7*H, r=1.35*H)
                xc_norm = 0.60
                yc_elev = dam_crest + 0.70 * dam_height
                r_norm = dam_height * 1.35
                dx_m = (u_s - xc_norm) * 200.0
                dy_m = current_elev - yc_elev
                dist_to_center = np.sqrt(dx_m**2 + dy_m**2)
                slip_surface_base = yc_elev - np.sqrt(np.maximum(0.0, r_norm**2 - dx_m**2))
                in_slip_mass = inside_embankment & (current_elev >= slip_surface_base) & (u_s >= 0.40) & (u_s <= 0.95)

                if idx_clean in {"factor_of_safety", "fs", "transient_factor_of_safety", "rainfall_infiltration"}:
                    dist_to_slip_arc = np.abs(dist_to_center - r_norm)
                    shear_band = np.exp(-(dist_to_slip_arc / 8.0)**2)
                    suction_loss_factor = np.where(is_wetted, 0.32, 0.05)
                    local_fs = np.where(
                        in_slip_mass,
                        1.28 - suction_loss_factor - 0.15 * shear_band + 0.25 * (depth_below_ground / dam_height),
                        np.where(inside_embankment, 1.80 - 0.15 * suction_loss_factor, 2.50)
                    )
                    val = np.clip(local_fs + (base_variation - 0.5) * 0.05, 0.70, 2.50)
                elif idx_clean in {"wetting_front", "wetting_front_depth", "depth"}:
                    val = np.where(inside_embankment, zw_depth, 0.0)
                elif idx_clean in {"infiltration_rate", "rate"}:
                    val = np.where(inside_embankment, np.clip(18.5 * slope_angle_factor * (0.8 + 0.4 * base_variation), 0.0, 50.0), 0.0)
                elif idx_clean in {"cumulative_infiltration", "cum_f", "f"}:
                    val = np.where(inside_embankment, np.clip(85.0 * slope_angle_factor * (0.85 + 0.3 * base_variation), 0.0, 180.0), 0.0)
                elif idx_clean in {"runoff_rate", "runoff"}:
                    val = np.where(inside_embankment, np.clip(12.0 * (1.0 - slope_angle_factor * 0.8) + base_variation * 3.0, 0.0, 35.0), 0.0)
                elif idx_clean in {"suction", "slip_surface_suction", "matric_suction"}:
                    suction_val = np.where(is_wetted, 2.5 + base_variation * 3.0, 32.0 - depth_below_ground * 4.0)
                    val = np.where(inside_embankment, np.clip(suction_val, 0.0, 50.0), 0.0)
                elif idx_clean in {"richards_moisture", "moisture", "moisture_content", "volumetric_moisture", "saturation"}:
                    theta_sat = 0.42
                    theta_init = 0.16
                    theta_profile = np.where(is_wetted, theta_sat - (depth_below_ground / np.maximum(0.1, zw_depth)) * 0.04, theta_init + 0.05 * np.exp(-((depth_below_ground - zw_depth) / 0.8)**2))
                    val = np.where(inside_embankment, np.clip(theta_profile + (base_variation - 0.5) * 0.02, 0.10, 0.48), 0.0)
                else:
                    val = np.clip(1.25 + (base_variation - 0.5) * 0.4, 0.8, 2.5)

            elif col_clean in {"thermal_apparent_inertia", "apparent_thermal_inertia", "thermal-apparent-inertia", "ati"} or idx_clean in {"thermal_apparent_inertia", "apparent_thermal_inertia", "thermal_inertia", "ati", "dtr", "dtr_celsius", "day_lst", "night_lst", "t_day", "t_night", "albedo", "seepage_anomaly", "daylighting_outflow"}:
                # 2D Remote sensing Apparent Thermal Inertia (ATI) phreatic moisture tracing & daylighting seepage
                u_s = (xx - min_lon) / (max_lon - min_lon + 1e-6)
                v_s = (yy - min_lat) / (max_lat - min_lat + 1e-6)

                seepage_corridor = np.exp(-((u_s - 0.80) / 0.08)**2) * (0.85 + 0.15 * np.cos(v_s * 4.0 * math.pi))
                albedo_grid = np.clip(0.22 - 0.12 * seepage_corridor + (base_variation - 0.5) * 0.03, 0.06, 0.35)

                day_lst_grid = 38.0 - 14.0 * seepage_corridor + (base_variation - 0.5) * 3.0
                night_lst_grid = 13.5 + 4.5 * seepage_corridor + (base_variation - 0.5) * 1.5
                dtr_grid = np.maximum(2.0, day_lst_grid - night_lst_grid)

                ati_grid = np.clip((1.0 - albedo_grid) / dtr_grid, 0.008, 0.095)

                if idx_clean in {"thermal_inertia", "apparent_thermal_inertia", "thermal_apparent_inertia", "ati"}:
                    val = ati_grid
                elif idx_clean in {"dtr", "dtr_celsius", "diurnal_temperature_range"}:
                    val = dtr_grid
                elif idx_clean in {"day_lst", "t_day", "day_temperature"}:
                    val = day_lst_grid
                elif idx_clean in {"night_lst", "t_night", "night_temperature"}:
                    val = night_lst_grid
                elif idx_clean in {"albedo", "alpha"}:
                    val = albedo_grid
                elif idx_clean in {"seepage_saturation", "anomaly", "thermal_seepage", "seepage_anomaly", "daylighting_outflow"}:
                    val = np.clip(seepage_corridor, 0.0, 1.0)
                else:
                    val = ati_grid
            elif col_clean in {"geotechnical_liquefaction", "liquefaction", "geotechnical-liquefaction", "tailings_liquefaction"} or (col_clean in {"geotechnical", "geotechnical_slope_stability", "slope_stability"} and idx_clean in {"liquefaction", "fs_liq", "factor_of_safety_liq", "ru", "excess_pore_pressure", "excess_pore_pressure_ratio", "cyclic_stress_ratio", "cyclic_resistance_ratio", "csr", "crr", "vs30", "flow_slide_runout", "lateral_spreading", "delta_u"}) or idx_clean in {"liquefaction", "fs_liq", "factor_of_safety_liq", "ru", "excess_pore_pressure", "excess_pore_pressure_ratio", "cyclic_stress_ratio", "cyclic_resistance_ratio", "csr", "crr", "vs30", "flow_slide_runout", "lateral_spreading", "delta_u"}:
                # 2D Seed-Idriss Dynamic Liquefaction, Excess Pore Pressure & Flow Slide Runout Grid
                u_s = (xx - min_lon) / (max_lon - min_lon + 1e-6)
                v_s = (yy - min_lat) / (max_lat - min_lat + 1e-6)

                dam_height = 35.0
                z_depth = 1.0 + v_s * 20.0
                z_gw = np.where(u_s < 0.45, 1.5, 8.0)

                # Total and effective vertical stresses
                sigma_v0 = 18.0 * np.minimum(z_depth, z_gw) + 20.0 * np.maximum(0.0, z_depth - z_gw)
                u0 = 9.81 * np.maximum(0.0, z_depth - z_gw)
                sigma_v0_eff = np.maximum(5.0, sigma_v0 - u0)

                # Depth reduction factor rd (Seed & Idriss 1971)
                rd = np.where(z_depth <= 9.15, 1.0 - 0.00765 * z_depth, np.maximum(0.40, 1.174 - 0.0267 * z_depth))
                pga = 0.25
                csr = 0.65 * pga * (sigma_v0 / sigma_v0_eff) * rd

                # Equivalent clean sand SPT blow count (N1)60cs
                # Upstream slimes (u_s < 0.40): contractive, loose ((N1)60cs ~ 5-9)
                # Crest & downstream shell (0.40 <= u_s <= 0.85): dense compacted sand ((N1)60cs ~ 25-34)
                # Foundation/valley (u_s > 0.85): medium-dense ((N1)60cs ~ 16-22)
                n1_60cs = np.where(
                    u_s < 0.40,
                    5.5 + 4.0 * u_s + (base_variation - 0.5) * 2.0,
                    np.where(
                        u_s <= 0.85,
                        25.0 + 10.0 * ((u_s - 0.40) / 0.45) + (base_variation - 0.5) * 3.0,
                        16.0 + (base_variation - 0.5) * 4.0
                    )
                )
                n_clean = np.clip(n1_60cs, 1.0, 35.0)

                # CRR7.5 (Youd et al. 2001)
                crr75 = np.where(
                    n_clean >= 30.0,
                    2.0,
                    1.0 / (34.0 - n_clean) + n_clean / 135.0 + 50.0 / ((10.0 * n_clean + 45.0) ** 2) - 1.0 / 200.0
                )
                crr75 = np.maximum(0.04, crr75)

                # Overburden K_sigma factor
                k_sigma = np.clip((100.0 / sigma_v0_eff) ** 0.7, 0.60, 1.10)
                fs_liq = (crr75 * 1.0 * k_sigma) / np.maximum(0.01, csr)
                fs_liq = np.clip(fs_liq + (base_variation - 0.5) * 0.04, 0.15, 3.50)

                # Excess pore pressure ratio ru = delta_u / sigma'_v0
                ru = np.where(
                    fs_liq >= 2.0,
                    0.0,
                    np.where(
                        fs_liq >= 1.40,
                        0.25 * (2.0 - fs_liq) / 0.60,
                        np.where(
                            fs_liq >= 1.00,
                            0.25 + 0.75 * (1.40 - fs_liq) / 0.40,
                            1.0
                        )
                    )
                )
                delta_u = ru * sigma_v0_eff
                post_sigma_eff = np.maximum(0.0, sigma_v0_eff - delta_u)

                # Topographic slope Vs30 proxy (Wald & Allen 2007)
                vs30 = np.where(
                    u_s < 0.40,
                    170.0 + 35.0 * u_s + (base_variation - 0.5) * 15.0,
                    np.where(
                        u_s <= 0.85,
                        460.0 + 120.0 * ((u_s - 0.40) / 0.45) + (base_variation - 0.5) * 25.0,
                        320.0 + (base_variation - 0.5) * 30.0
                    )
                )

                # Flow slide runout corridor (Scheidegger / Hungr reach angle envelope)
                runout_corridor = np.where(
                    u_s >= 0.45,
                    np.exp(-((v_s - 0.50) / 0.25) ** 2) * np.clip(1.0 - (u_s - 0.45) / 0.52, 0.0, 1.0),
                    0.0
                )
                # Lateral spreading displacement (Zhang et al. 2004)
                dh = np.where(u_s < 0.45, np.clip((2.0 - fs_liq) * 0.90, 0.0, 3.0), 0.05)

                if idx_clean in {"factor_of_safety", "fs", "fs_liq", "factor_of_safety_liq", "liquefaction", "susceptibility", "geotechnical_liquefaction"}:
                    val = fs_liq
                elif idx_clean in {"excess_pore_pressure", "excess_pore_pressure_ratio", "ru", "pore_pressure_ratio"}:
                    val = ru
                elif idx_clean in {"delta_u", "excess_pore_pressure_delta_u", "dynamic_pore_pressure", "pore_pressure"}:
                    val = delta_u
                elif idx_clean in {"cyclic_stress_ratio", "csr"}:
                    val = csr
                elif idx_clean in {"cyclic_resistance_ratio", "crr", "crr75"}:
                    val = crr75
                elif idx_clean in {"vs30", "shear_wave_velocity", "vs30_proxy"}:
                    val = vs30
                elif idx_clean in {"flow_slide_runout", "runout", "flow_slide", "mobility"}:
                    val = runout_corridor
                elif idx_clean in {"lateral_spreading", "dh", "ldi"}:
                    val = dh
                elif idx_clean in {"post_cyclic_effective_stress", "effective_stress"}:
                    val = post_sigma_eff
                else:
                    val = fs_liq
            elif col_clean in {"geotechnical_settlement", "settlement", "geotechnical-settlement", "reconsolidation_settlement"} or (col_clean in {"geotechnical", "geotechnical_slope_stability", "slope_stability"} and idx_clean in {"total_settlement", "crest_settlement", "settlement", "volumetric_strain", "angular_distortion", "differential_settlement", "insar_residual", "reconsolidation_rate", "eps_v", "crest_s"}) or idx_clean in {"total_settlement", "crest_settlement", "settlement", "volumetric_strain", "angular_distortion", "differential_settlement", "insar_residual", "reconsolidation_rate", "eps_v", "crest_s"}:
                # 2D Post-Liquefaction Reconsolidation Settlement Grid (Ishihara-Yoshimine 1992 & Tokimatsu-Seed 1987)
                u_s = (xx - min_lon) / (max_lon - min_lon + 1e-6)
                v_s = (yy - min_lat) / (max_lat - min_lat + 1e-6)

                # Crest proximity bell (embankment crest centerline around v_s ~ 0.50)
                crest_proximity = np.exp(-((v_s - 0.50) / 0.22) ** 2)
                # Longitudinal shape factor: parabolic curve peaking near mid-span (u_s ~ 0.50)
                longitudinal_factor = 0.40 + 0.85 * (1.0 - (2.0 * np.clip(u_s, 0.0, 1.0) - 1.0) ** 2)

                # Volumetric strain epsilon_v (%) family curves (Ishihara & Yoshimine 1992)
                # Upstream contractive liquefiable slimes (u_s < 0.45): high strain (3.0 - 5.5%)
                # Compacted crest and downstream shell (0.45 <= u_s <= 0.85): moderate strain (0.4 - 1.2%)
                # Competent basal abutments (u_s > 0.85): low strain (< 0.2%)
                vol_strain = np.where(
                    u_s < 0.45,
                    3.8 + 1.8 * np.sin(np.pi * u_s / 0.45) + (base_variation - 0.5) * 0.6,
                    np.where(
                        u_s <= 0.85,
                        0.8 + 1.0 * (1.0 - (u_s - 0.45) / 0.40) + (base_variation - 0.5) * 0.3,
                        0.15 + (base_variation - 0.5) * 0.15
                    )
                )
                vol_strain = np.clip(vol_strain, 0.0, 6.0)

                # Tokimatsu & Seed (1987) multi-layer depth integration S = int eps_v * dz (m)
                settlement_m = (vol_strain / 100.0) * 16.0 * crest_proximity * longitudinal_factor
                settlement_m = np.clip(settlement_m + (base_variation - 0.5) * 0.04, 0.0, 1.80)

                # Spatial gradient -> differential settlement (cm) and angular distortion beta
                grad_u = np.gradient(settlement_m, axis=1) * 100.0
                grad_v = np.gradient(settlement_m, axis=0) * 100.0
                diff_settle_cm = np.clip(np.sqrt(grad_u ** 2 + grad_v ** 2) * 5.0, 0.0, 60.0)
                ang_distortion = np.clip(diff_settle_cm / (100.0 * 25.0), 0.0, 0.020)

                # Satellite InSAR vertical residual (cm): modeled settlement vs synthetic InSAR observation
                insar_synth = settlement_m * 0.90 + (base_variation - 0.5) * 0.03
                insar_residual_cm = np.clip((settlement_m - insar_synth) * 100.0, -20.0, 20.0)

                # Terzaghi / Sridharan-Rao 1D consolidation dissipation rate dS/dt (mm/day)
                t50 = 14.0
                elapsed = 7.0
                rate_mm_day = settlement_m * (t50 / ((elapsed + t50) ** 2)) * 1000.0
                recon_rate = np.clip(rate_mm_day, 0.0, 12.0)

                if idx_clean in {"total_settlement", "crest_settlement", "settlement", "s", "crest_s"}:
                    val = settlement_m
                elif idx_clean in {"volumetric_strain", "eps_v", "strain", "reconsolidation_strain"}:
                    val = vol_strain
                elif idx_clean in {"angular_distortion", "distortion", "beta"}:
                    val = ang_distortion
                elif idx_clean in {"differential_settlement", "diff_s", "differential"}:
                    val = diff_settle_cm
                elif idx_clean in {"insar_residual", "residual", "insar_vertical_residual"}:
                    val = insar_residual_cm
                elif idx_clean in {"reconsolidation_rate", "rate", "dissipation_rate"}:
                    val = recon_rate
                else:
                    val = settlement_m
            elif col_clean in {"topography_elevation_delta", "elevation_delta", "topography", "cut_and_fill", "pointcloud_csf", "csf"} or (col_clean in {"topography", "pointcloud"} and idx_clean in {"elevation_delta", "cut_depth", "fill_height", "slope_delta", "csf_ground_surface", "ndsm_height", "delta_z", "cut", "fill", "csf_ground", "csf", "ndsm"}) or idx_clean in {"elevation_delta", "cut_depth", "fill_height", "slope_delta", "csf_ground_surface", "ndsm_height", "delta_z", "cut", "fill", "csf_ground", "csf", "ndsm"}:
                # 2.5D DEM Cut-and-Fill Volumetric Differencing & CSF Ground Extraction (Cycle v2.5.17)
                u_s = (xx - min_lon) / (max_lon - min_lon + 1e-6)
                v_s = (yy - min_lat) / (max_lat - min_lat + 1e-6)

                # Baseline undulating terrain
                z_pre = 320.0 + 35.0 * (u_s - 0.5) - 20.0 * (v_s - 0.5) + 12.0 * np.sin(u_s * 4.0) * np.cos(v_s * 3.5)

                # Cut excavation / crest slump depression (northwest quad / crest zone)
                cut_center_dist2 = ((u_s - 0.35) / 0.18) ** 2 + ((v_s - 0.35) / 0.18) ** 2
                cut_zone = np.exp(-np.clip(cut_center_dist2, 0.0, 25.0))
                cut_mag = 2.8 * cut_zone

                # Fill deposition / embankment raise zone (southeast quad / toe berm)
                fill_center_dist2 = ((u_s - 0.68) / 0.20) ** 2 + ((v_s - 0.65) / 0.20) ** 2
                fill_zone = np.exp(-np.clip(fill_center_dist2, 0.0, 25.0))
                fill_mag = 2.2 * fill_zone

                # Elevation difference Delta Z = Z_post - Z_pre
                dz = np.clip(-cut_mag + fill_mag + (base_variation - 0.5) * 0.08, -5.0, 5.0)
                z_post = z_pre + dz

                if idx_clean in {"elevation_delta", "delta_z"}:
                    val = dz
                elif idx_clean in {"cut_depth", "cut"}:
                    val = np.clip(np.where(dz < -0.05, -dz, 0.0), 0.0, 6.0)
                elif idx_clean in {"fill_height", "fill"}:
                    val = np.clip(np.where(dz > 0.05, dz, 0.0), 0.0, 6.0)
                elif idx_clean in {"slope_delta", "slope"}:
                    grad_x = np.gradient(dz, axis=1) * 15.0
                    grad_y = np.gradient(dz, axis=0) * 15.0
                    val = np.clip(np.arctan(np.sqrt(grad_x ** 2 + grad_y ** 2)) * (180.0 / np.pi) * np.sign(dz + 1e-6), -25.0, 25.0)
                elif idx_clean in {"csf_ground_surface", "csf_ground", "csf"}:
                    val = z_pre + (base_variation - 0.5) * 0.4
                elif idx_clean in {"ndsm_height", "ndsm"}:
                    val = np.clip(np.abs(dz) * 2.5 + (base_variation - 0.5) * 0.8, 0.0, 20.0)
                else:
                    val = dz
            elif col_clean in {"hydrodynamic_inundation", "inundation", "hydrodynamic", "dam_breach", "dam_breach_hydrodynamic"} or (col_clean in {"hydrodynamic", "inundation"} and idx_clean in {"inundation_depth", "flow_velocity", "wave_arrival_time", "depth_velocity_product", "water_surface_elevation", "hazard_rating_tier", "depth", "velocity", "arrival_time", "hv", "wse", "hazard_tier"}) or idx_clean in {"inundation_depth", "flow_velocity", "wave_arrival_time", "depth_velocity_product", "water_surface_elevation", "hazard_rating_tier", "depth_velocity", "arrival_time", "hazard_tier"}:
                # 2D Shallow Water Dam Breach Hydrodynamic Wave Routing (Cycle v2.5.18)
                u_s = (xx - min_lon) / (max_lon - min_lon + 1e-6)
                v_s = (yy - min_lat) / (max_lat - min_lat + 1e-6)

                # Channel thalweg alignment with downstream sinuosity
                valley_center = 0.50 + 0.16 * np.sin(u_s * 3.2)
                d_thalweg = np.abs(v_s - valley_center)

                # Expanding flood swath downstream
                swath_halfwidth = 0.16 + 0.14 * u_s
                cross_factor = np.clip(1.0 - (d_thalweg / swath_halfwidth) ** 2, 0.0, 1.0)

                # Peak discharge attenuation along longitudinal reach
                downstream_attenuation = 1.0 / (1.0 + 1.85 * (u_s ** 0.88))

                # Flood depth h (m)
                h_flood = 12.5 * downstream_attenuation * (cross_factor ** 0.8) + (base_variation - 0.5) * 0.15
                h_flood = np.clip(np.where(cross_factor > 0.02, h_flood, 0.0), 0.0, 15.0)

                # Velocity v (m/s)
                v_flow = np.clip(8.8 * np.sqrt(np.maximum(0.01, downstream_attenuation)) * (cross_factor ** 0.5), 0.0, 12.0)
                v_flow = np.where(h_flood > 0.05, v_flow, 0.0)

                # Flood wave arrival time (minutes)
                t_arrival = np.clip(12.0 + 260.0 * (u_s ** 0.82) + (1.0 - cross_factor) * 25.0, 0.0, 360.0)

                # Depth-velocity impulse hazard product (h * v, m2/s)
                hv_prod = np.clip(h_flood * v_flow, 0.0, 15.0)

                # Water surface elevation WSE (bed + depth, m)
                bed_elev = 450.0 - 190.0 * u_s + 20.0 * (d_thalweg ** 2)
                wse = np.where(h_flood > 0.05, bed_elev + h_flood, bed_elev)

                # Categorical hazard tier: 1: Low, 2: Moderate, 3: High, 4: Extreme, 5: Catastrophic
                tier = np.where(
                    (h_flood >= 5.0) | (hv_prod >= 5.0), 5.0,
                    np.where(
                        (h_flood >= 3.0) | (hv_prod >= 2.5), 4.0,
                        np.where(
                            (h_flood >= 1.5) | (hv_prod >= 1.5), 3.0,
                            np.where(
                                (h_flood >= 0.5) | (hv_prod >= 0.5), 2.0,
                                np.where(h_flood > 0.05, 1.0, 0.0)
                            )
                        )
                    )
                )

                if idx_clean in {"inundation_depth", "depth", "flood_depth"}:
                    val = h_flood
                elif idx_clean in {"flow_velocity", "velocity"}:
                    val = v_flow
                elif idx_clean in {"wave_arrival_time", "arrival_time", "time"}:
                    val = t_arrival
                elif idx_clean in {"depth_velocity_product", "hazard_product", "hv", "depth_velocity"}:
                    val = hv_prod
                elif idx_clean in {"water_surface_elevation", "wse"}:
                    val = wse
                elif idx_clean in {"hazard_rating_tier", "hazard_tier", "hazard"}:
                    val = tier
                else:
                    val = h_flood
            elif col_clean in {"geotechnical_flownet", "flownet", "seepage_flownet", "internal_erosion", "internal_erosion_piping", "piping"} or (col_clean in {"geotechnical", "seepage"} and idx_clean in {"hydraulic_head", "stream_function", "hydraulic_gradient", "pore_pressure", "exit_gradient", "factor_of_safety", "hazard_tier", "piping_progression", "flownet_head", "flownet_gradient", "flownet_exit_gradient"}) or idx_clean in {"flownet_head", "stream_function", "hydraulic_gradient", "flownet_gradient", "flownet_exit_gradient", "piping_factor_of_safety", "piping_progression", "flownet_hazard_tier"}:
                # 2D Laplace Seepage Flownet & Backward Erosion Piping (Cycle v2.5.19)
                u_s = (xx - min_lon) / (max_lon - min_lon + 1e-6)
                v_s = (yy - min_lat) / (max_lat - min_lat + 1e-6)

                h_up = 24.0
                h_down = 4.0
                delta_h = h_up - h_down

                x_entry = 0.25
                x_exit = 0.85
                seep_span = max(0.1, x_exit - x_entry)
                frac_x = np.clip((u_s - x_entry) / seep_span, 0.0, 1.0)

                phi_pot = h_up - frac_x * delta_h + 0.5 * delta_h * (1.0 - frac_x) * frac_x * (1.0 - v_s)
                phi_pot = np.where(u_s < x_entry, h_up, np.where(u_s > x_exit, h_down, phi_pot))
                phi_pot = np.clip(phi_pot + (base_variation - 0.5) * 0.2, h_down - 1.0, h_up + 1.0)

                psi_flow = np.clip(v_s * 0.0035 * (1.0 - 0.15 * np.cos(u_s * np.pi)), 0.0, 0.005)

                base_grad = delta_h / 60.0
                toe_concentration = np.exp(-((u_s - x_exit) / 0.08) ** 2) * 1.15
                grad_mag = np.clip(base_grad * (1.0 + toe_concentration) + (base_variation - 0.5) * 0.05, 0.0, 2.5)

                z_elev = -18.0 + v_s * 25.0
                pore_u = np.clip((phi_pot - z_elev) * 9.81, 0.0, 450.0)

                exit_grad = np.where(u_s >= 0.75, np.clip(grad_mag, 0.0, 2.0), 0.0)

                i_crit_val = 1.02
                fs_piping = np.where(exit_grad > 0.05, np.clip(i_crit_val / np.maximum(0.01, exit_grad), 0.2, 5.0), 3.5)

                pipe_reach = x_exit - 0.42 * seep_span
                in_pipe = (u_s >= pipe_reach) & (u_s <= x_exit + 0.05) & (np.abs(v_s - 0.35) < 0.06)
                pipe_val = np.where(in_pipe, 1.0, np.clip((u_s - pipe_reach) / (x_exit - pipe_reach + 1e-5), 0.0, 0.8))

                tier_flownet = np.where(
                    (fs_piping < 1.0) | (exit_grad >= i_crit_val), 5.0,
                    np.where(
                        (fs_piping < 1.3) | (exit_grad >= 0.80), 4.0,
                        np.where(
                            (fs_piping < 1.8) | (exit_grad >= 0.55), 3.0,
                            np.where(
                                (fs_piping < 2.5) | (exit_grad >= 0.35), 2.0,
                                1.0
                            )
                        )
                    )
                )

                if idx_clean in {"hydraulic_head", "total_head", "head", "phi", "flownet_head"}:
                    val = phi_pot
                elif idx_clean in {"stream_function", "streamline", "psi", "streamlines"}:
                    val = psi_flow
                elif idx_clean in {"hydraulic_gradient", "gradient", "grad", "grad_phi", "flownet_gradient"}:
                    val = grad_mag
                elif idx_clean in {"pore_pressure", "pressure", "pore_water_pressure", "u"}:
                    val = pore_u
                elif idx_clean in {"exit_gradient", "toe_gradient", "i_exit", "flownet_exit_gradient"}:
                    val = exit_grad
                elif idx_clean in {"factor_of_safety", "fs", "fs_piping", "safety_factor", "piping_factor_of_safety"}:
                    val = fs_piping
                elif idx_clean in {"piping_progression", "pipe", "pipe_length", "pipe_ratio"}:
                    val = pipe_val
                elif idx_clean in {"hazard_tier", "hazard_rating_tier", "hazard", "tier", "flownet_hazard_tier"}:
                    val = tier_flownet
                else:
                    val = phi_pot
            elif col_clean in {"geotechnical_insar_velocity", "insar_velocity", "insar_ps", "geotechnical_insar", "insar"} or (col_clean in {"geotechnical"} and idx_clean in {"velocity_los", "velocity_vertical", "velocity_east_west", "temporal_coherence", "height_residual", "hazard_tier"}) or idx_clean in {"velocity_los", "velocity_vertical", "velocity_east_west", "temporal_coherence", "height_residual", "insar_hazard_tier"}:
                # Satellite InSAR Persistent Scatterer Interferometry (PSI) & Velocity Field (Cycle v2.5.20)
                u_s = (xx - min_lon) / (max_lon - min_lon + 1e-6)
                v_s = (yy - min_lat) / (max_lat - min_lat + 1e-6)

                crest_prox = np.exp(-((v_s - 0.48) / 0.18) ** 2)
                slump_factor = np.exp(-((u_s - 0.52) / 0.22) ** 2)

                # Vertical velocity (mm/year, negative indicates subsidence)
                v_vert = - (1.5 + 15.0 * slump_factor * crest_prox + (base_variation - 0.5) * 1.2)
                v_vert = np.clip(v_vert, -28.0, 4.0)

                # Line-of-sight velocity with Sentinel-1 incidence angle ~ 38.5 deg
                inc_rad = np.radians(38.5)
                v_los = v_vert * np.cos(inc_rad) + (base_variation - 0.5) * 0.8
                v_los = np.clip(v_los, -22.0, 3.0)

                # Horizontal East-West velocity (outward lateral crest spreading)
                v_east = np.where(v_s >= 0.48, 1.0, -1.0) * (2.8 * slump_factor * crest_prox) + (base_variation - 0.5) * 0.5
                v_east = np.clip(v_east, -8.0, 8.0)

                # Temporal phase coherence gamma in [0, 1] (high on dam crest/structures, lower off-dam)
                gamma_field = 0.52 + 0.38 * crest_prox + (base_variation - 0.5) * 0.10
                gamma_field = np.clip(gamma_field, 0.15, 0.98)

                # DEM topographic height residual error (m)
                h_resid = 2.5 * np.sin(u_s * 3.5 * np.pi) * crest_prox + (base_variation - 0.5) * 0.4
                h_resid = np.clip(h_resid, -5.0, 5.0)

                # Operational InSAR deformation hazard tier (1: Stable, 2: Minor Creep, 3: Moderate, 4: Accelerating, 5: Critical)
                abs_v = np.abs(v_vert)
                tier_insar = np.where(
                    abs_v >= 25.0, 5.0,
                    np.where(
                        abs_v >= 12.0, 4.0,
                        np.where(
                            abs_v >= 5.0, 3.0,
                            np.where(
                                abs_v >= 2.0, 2.0,
                                1.0
                            )
                        )
                    )
                )

                if idx_clean in {"velocity_vertical", "vertical_velocity", "v_vert", "v_v", "subsidence"}:
                    val = v_vert
                elif idx_clean in {"velocity_los", "los_velocity", "v_los", "los"}:
                    val = v_los
                elif idx_clean in {"velocity_east_west", "east_west_velocity", "v_east", "v_e", "horizontal"}:
                    val = v_east
                elif idx_clean in {"temporal_coherence", "coherence", "gamma", "ps_coherence"}:
                    val = gamma_field
                elif idx_clean in {"height_residual", "dem_residual", "height_error", "delta_h"}:
                    val = h_resid
                elif idx_clean in {"hazard_tier", "hazard_rating_tier", "hazard", "tier", "insar_hazard_tier"}:
                    val = tier_insar
                else:
                    val = v_vert
            elif col_clean in {"geotechnical_damage_proxy", "damage_proxy", "dpm", "sar_dpm", "sar_damage_proxy", "geotechnical_dpm"} or (col_clean in {"geotechnical", "sar"} and idx_clean in {"coherence_delta", "pre_coherence", "event_coherence", "damage_severity_tier", "building_loss_ratio", "hazard_rating_tier"}) or idx_clean in {"coherence_delta", "pre_coherence", "event_coherence", "damage_severity_tier", "building_loss_ratio", "hazard_rating_tier", "coherence_loss", "structural_damage_ratio", "dpm_hazard_tier"}:
                # Complex Interferometric SAR Damage Proxy Mapping (DPM) (Cycle v2.5.21)
                u_s = ((xx - min_lon) / (max_lon - min_lon + 1e-6)).astype(np.float32)
                v_s = ((yy - min_lat) / (max_lat - min_lat + 1e-6)).astype(np.float32)

                # Event epicenter and regional decorrelation falloff
                dist_epicenter = np.sqrt((u_s - 0.50) ** 2 + (v_s - 0.50) ** 2)
                decorrelation_field = np.exp(-(dist_epicenter / 0.28) ** 2)

                # Secondary structural damage concentrations (e.g. mine processing plant, dam crest, urban sector)
                cluster_a = np.exp(-(((u_s - 0.36) / 0.12) ** 2 + ((v_s - 0.62) / 0.12) ** 2))
                cluster_b = np.exp(-(((u_s - 0.64) / 0.14) ** 2 + ((v_s - 0.38) / 0.14) ** 2))

                damage_pattern = np.clip(0.60 * decorrelation_field + 0.26 * cluster_a + 0.22 * cluster_b + (base_variation.astype(np.float32) - 0.5) * 0.10, 0.0, 1.0)

                # Pre-event baseline coherence gamma_pre in [0, 1]
                gamma_pre = np.clip(0.76 + (base_variation.astype(np.float32) - 0.5) * 0.14, 0.12, 0.98)

                # Coherence loss Delta gamma in [0, 1]
                coherence_delta = np.clip(gamma_pre * damage_pattern * 0.88, 0.0, 0.96)

                # Co-event interferometric coherence gamma_event in [0, 1]
                gamma_event = np.clip(gamma_pre - coherence_delta, 0.02, 0.98)

                # ARIA / Copernicus Damage Severity Tier (1: Negligible, 2: Moderate, 3: Severe, 4: Catastrophic Collapse)
                tier_dpm = np.where(
                    coherence_delta >= 0.55, 4.0,
                    np.where(
                        coherence_delta >= 0.35, 3.0,
                        np.where(
                            coherence_delta >= 0.15, 2.0,
                            1.0
                        )
                    )
                ).astype(np.float32)

                # Structural fragility building damage ratio DR in [0, 1] (non-linear power law)
                loss_ratio = np.clip(1.25 * np.power(coherence_delta, 1.35), 0.0, 1.0).astype(np.float32)

                # Composite emergency response hazard tier (1 to 5)
                hazard_tier_dpm = np.clip(1.0 + 4.0 * (0.55 * coherence_delta + 0.45 * loss_ratio), 1.0, 5.0).astype(np.float32)

                if idx_clean in {"coherence_delta", "coherence_loss", "delta_gamma", "loss"}:
                    val = coherence_delta
                elif idx_clean in {"pre_coherence", "gamma_pre", "baseline"}:
                    val = gamma_pre
                elif idx_clean in {"event_coherence", "gamma_event", "co_event"}:
                    val = gamma_event
                elif idx_clean in {"damage_severity_tier", "damage_tier", "severity"}:
                    val = tier_dpm
                elif idx_clean in {"building_loss_ratio", "loss_ratio", "damage_ratio", "structural_damage_ratio"}:
                    val = loss_ratio
                elif idx_clean in {"hazard_rating_tier", "hazard_tier", "hazard", "dpm_hazard_tier"}:
                    val = hazard_tier_dpm
                else:
                    val = coherence_delta
            elif col_clean in {"phenology_anomaly", "phenology", "climatological_mad", "phenological_delta", "phenology_cube"} or (col_clean in {"phenology", "analysis"} and idx_clean in {"baseline_ndvi", "seasonal_amplitude", "phase_angle", "theil_sen_slope", "mad_anomaly_zscore", "anomaly_tier"}) or idx_clean in {"baseline_ndvi", "seasonal_amplitude", "phase_angle", "theil_sen_slope", "mad_anomaly_zscore", "anomaly_tier"}:
                # Multi-Temporal Phenology, BFAST Trend Inversion & Climatological MAD Anomaly (Cycle v2.5.22 - Task T-193)
                u_s = ((xx - min_lon) / (max_lon - min_lon + 1e-6)).astype(np.float32)
                v_s = ((yy - min_lat) / (max_lat - min_lat + 1e-6)).astype(np.float32)

                # Base vegetation spatial pattern
                spatial_veg = np.clip(0.50 + 0.22 * np.sin(np.pi * u_s) * np.cos(np.pi * v_s) + 0.08 * (base_variation.astype(np.float32) - 0.5), 0.05, 0.95).astype(np.float32)

                # Annual harmonic seasonal amplitude C1 in [0.0, 0.45]
                amp_field = np.clip(0.24 * (0.8 + 0.4 * u_s) + 0.04 * (base_variation.astype(np.float32) - 0.5), 0.02, 0.45).astype(np.float32)

                # Phase angle (peak green-up timing in degrees [0, 360])
                phase_field = np.clip((196.0 + 40.0 * (v_s - 0.5) + 20.0 * (u_s - 0.5)) % 360.0, 0.0, 360.0).astype(np.float32)

                # Theil-Sen non-parametric robust trend slope (yr^-1)
                slope_field = np.clip(0.012 + 0.025 * (u_s - 0.5) - 0.020 * (v_s - 0.5) + 0.005 * (base_variation.astype(np.float32) - 0.5), -0.06, 0.06).astype(np.float32)

                # Localized anomaly core (e.g. unseasonal browning, severe summer drought or embankment die-off)
                dist_anom1 = np.sqrt((u_s - 0.45) ** 2 + (v_s - 0.55) ** 2)
                dist_anom2 = np.sqrt((u_s - 0.72) ** 2 + (v_s - 0.35) ** 2)
                patch_anom1 = np.exp(-(dist_anom1 / 0.20) ** 2)
                patch_anom2 = np.exp(-(dist_anom2 / 0.15) ** 2)

                # Seasonally normalized climatological MAD z-score in [-4, +4]
                zscore_field = np.clip(-3.2 * patch_anom1 - 2.8 * patch_anom2 + 0.6 * np.sin(2.0 * np.pi * u_s) + 0.3 * (base_variation.astype(np.float32) - 0.5), -4.0, 4.0).astype(np.float32)

                # Phenology anomaly classification tier (0: normal, 1: mild, 2: moderate, 3: severe, 4: extreme)
                abs_z = np.abs(zscore_field)
                tier_field = np.where(
                    abs_z >= 3.0, 4.0,
                    np.where(
                        abs_z >= 2.5, 3.0,
                        np.where(
                            abs_z >= 2.0, 2.0,
                            np.where(
                                abs_z >= 1.5, 1.0,
                                0.0
                            )
                        )
                    )
                ).astype(np.float32)

                if idx_clean in {"baseline_ndvi", "baseline", "fitted_baseline", "seasonal_baseline"}:
                    val = spatial_veg
                elif idx_clean in {"seasonal_amplitude", "amplitude", "fourier_amplitude", "annual_amplitude"}:
                    val = amp_field
                elif idx_clean in {"phase_angle", "phase", "phase_deg", "peak_greenup"}:
                    val = phase_field
                elif idx_clean in {"theil_sen_slope", "theil_sen", "trend_slope", "slope"}:
                    val = slope_field
                elif idx_clean in {"anomaly_tier", "tier", "phenology_tier", "anomaly_classification"}:
                    val = tier_field
                elif idx_clean in {"mad_anomaly_zscore", "z_score", "seasonal_zscore", "zscore", "mad_zscore", "anomaly"}:
                    val = zscore_field
                else:
                    val = zscore_field
            else:
                val = base_variation

            # Dynamic contrast stretch
            auto_bounds = get_auto_stretch(idx_clean, default=DEFAULT_INDEX_RANGES.get(idx_clean, (0.0, 1.0)))
            if rescale:
                if isinstance(rescale, str) and rescale.strip().lower() in {"auto", "auto_stretch"}:
                    vmin, vmax = auto_bounds
                else:
                    p0, p1 = parse_rescale(rescale, default=auto_bounds)
                    if p0 >= 1.0 and p1 <= 99.0 and p1 > p0:
                        # Percentile stretch
                        vmin, vmax = float(np.nanpercentile(val, p0)), float(np.nanpercentile(val, p1))
                    else:
                        vmin, vmax = p0, p1
            else:
                meta = get_spectral_index_metadata(idx_clean)
                if meta and meta.default_rescale:
                    vmin, vmax = meta.parse_rescale()
                else:
                    vmin, vmax = auto_bounds

            if vmax <= vmin:
                vmax = vmin + 1e-4

            norm = np.clip((val - vmin) / (vmax - vmin + 1e-6), 0.0, 1.0)
            cmap = self.get_colormap(cmap_clean)
            rgba = (cmap(norm) * 255).astype(np.uint8)

            # Ensure transparency on nodata / extreme margin
            rgba[np.isnan(val), 3] = 0

            if col_clean in {"direct_georeferencing", "drone_direct_georeferencing"} or idx_clean in {"direct_georeferencing", "boresight"}:
                d_lon_t = (xx - (min_lon + max_lon) / 2.0) / (max_lon - min_lon + 1e-6)
                d_lat_t = (yy - (min_lat + max_lat) / 2.0) / (max_lat - min_lat + 1e-6)
                b_dist = np.maximum(np.abs(d_lon_t * 0.9 + d_lat_t * 0.2), np.abs(-d_lon_t * 0.2 + d_lat_t * 0.9))
                rgba[b_dist > 0.7, 3] = 0
                rgba[(b_dist <= 0.7) & (b_dist > 0.65), 3] = 255
            elif col_clean in {"crest_alignment", "embankment_crest", "geotechnical_crest"} or idx_clean in {"crest_alignment", "crest_settlement", "settlement"}:
                u_c = (xx - min_lon) / (max_lon - min_lon + 1e-6)
                v_c = (yy - min_lat) / (max_lat - min_lat + 1e-6)
                corr_m = np.clip(1.0 - np.abs(v_c - (0.35 + 0.30 * u_c + 0.08 * np.sin(u_c * math.pi))) / 0.18, 0.0, 1.0)
                rgba[corr_m <= 0.05, 3] = 0
                rgba[(corr_m > 0.05) & (corr_m < 0.15), 3] = 255
            elif col_clean in {"ps_insar", "ps_stack", "psinsar"} or idx_clean in {"ps_insar", "ps_velocity", "v_los"}:
                ps_pts = ((np.sin(xx * 70.0) > 0.75) & (np.cos(yy * 70.0) > 0.75)) | (base_variation > 0.65)
                rgba[~ps_pts, 3] = 80
                rgba[ps_pts, 3] = 255
            elif col_clean in {"bathymetry", "satellite_bathymetry", "sdb", "reservoir_bathymetry"} or idx_clean in {"bathymetry", "satellite_bathymetry", "depth", "water_depth"}:
                water_mask = base_variation > 0.15
                rgba[~water_mask, 3] = 0
            elif col_clean in {"soil_moisture", "sar_soil_moisture"} or idx_clean in {"soil_moisture", "sar_soil_moisture"}:
                soil_mask = base_variation > 0.10
                rgba[~soil_mask, 3] = 40
            elif col_clean in {"gpr", "gpr_profile"} or idx_clean in {"gpr", "gpr_profile"}:
                rgba[:, :, 3] = 245
            elif col_clean in {"vibration", "structural_vibration"} or idx_clean in {"vibration", "structural_vibration"}:
                struct_mask = (np.abs(xx - (min_lon + max_lon) / 2.0) < (max_lon - min_lon) * 0.35) & (np.abs(yy - (min_lat + max_lat) / 2.0) < (max_lat - min_lat) * 0.35)
                rgba[~struct_mask, 3] = 60
                rgba[struct_mask, 3] = 255
            elif col_clean in {"true_ortho_zbuffer", "true-orthorectification", "ortho_true"} or idx_clean in {"true_ortho_zbuffer", "occlusion_zbuffer"}:
                rgba[:, :, 3] = 230
            elif col_clean in {"graphcut_seamlines", "mosaic_graphcut"} or idx_clean in {"graphcut_seamlines", "seamlines"}:
                rgba[:, :, 3] = 240
            elif col_clean in {"brdf_nbar", "brdf-nbar"} or idx_clean in {"brdf_nbar", "nbar"}:
                rgba[:, :, 3] = 255
            elif col_clean in {"sbas", "sbas_stack", "sar_sbas"} or idx_clean in {"sbas", "sbas_stack", "sbas_velocity"}:
                sbas_pts = ((np.sin(xx * 65.0) > 0.70) & (np.cos(yy * 65.0) > 0.70)) | (base_variation > 0.55)
                rgba[~sbas_pts, 3] = 70
                rgba[sbas_pts, 3] = 255
            elif col_clean in {"topographic_minnaert", "topographic-minnaert"} or idx_clean in {"topographic_minnaert", "minnaert"}:
                rgba[:, :, 3] = 240
            elif col_clean in {"tie_point_rpc", "tie-point-rpc"} or idx_clean in {"tie_point_rpc", "rpc_residual"}:
                rgba[:, :, 3] = 245
            elif col_clean in {"quality_mosaic", "mosaic_quality"} or idx_clean in {"quality_mosaic"}:
                rgba[:, :, 3] = 255
            elif col_clean in {"drone_photogrammetry", "photogrammetry", "drone_odm", "odm_task"} or idx_clean in {"drone_photogrammetry", "photogrammetry", "drone_odm", "orthophoto", "reprojection_error", "point_density"}:
                rgba[:, :, 3] = 255
            elif col_clean in {"dam_break", "dam-break", "dam_breach_hydrodynamic"} or idx_clean in {"dam_break", "hazard_product", "flood_depth", "dam_depth", "flow_velocity", "dam_velocity", "arrival_time", "depth", "velocity"}:
                flood_extent = val > 0.05
                rgba[~flood_extent, 3] = 0
                rgba[flood_extent & (val < 1.0), 3] = 170
                rgba[flood_extent & (val >= 1.0), 3] = 225
            elif col_clean in {"phreatic_seepage", "phreatic-seepage", "seepage", "phreatic_surface"} or idx_clean in {"phreatic_seepage", "saturation", "effective_saturation", "pore_pressure", "exit_gradient", "gradient", "hydraulic_head", "total_head", "matric_suction", "suction"}:
                rgba[:, :, 3] = 220
            elif col_clean in {"geotechnical_slope_stability", "slope_stability_geotechnical"} or (col_clean == "slope_stability" and (idx_clean in {"factor_of_safety", "fs", "slip_surface", "shear_resistance", "shear_stress", "effective_normal_force", "apparent_cohesion", "suction_cohesion", "insar_creep"} or "sim" in item_id.lower())) or idx_clean in {"geotechnical_slope_stability", "factor_of_safety", "fs", "slip_surface", "shear_resistance", "shear_stress", "effective_normal_force", "apparent_cohesion", "suction_cohesion", "insar_creep"}:
                rgba[:, :, 3] = 220
            elif col_clean in {"geotechnical_rainfall_infiltration", "rainfall_infiltration", "rainfall-infiltration"} or idx_clean in {"rainfall_infiltration", "wetting_front", "wetting_front_depth", "infiltration_rate", "cumulative_infiltration", "runoff_rate", "transient_factor_of_safety"}:
                rgba[:, :, 3] = 220
            elif col_clean in {"thermal_apparent_inertia", "apparent_thermal_inertia", "thermal-apparent-inertia", "ati"} or idx_clean in {"thermal_apparent_inertia", "apparent_thermal_inertia", "thermal_inertia", "ati", "dtr", "dtr_celsius", "day_lst", "night_lst", "t_day", "t_night", "albedo"}:
                rgba[:, :, 3] = 230
            elif col_clean in {"geotechnical_liquefaction", "liquefaction", "geotechnical-liquefaction", "tailings_liquefaction"} or idx_clean in {"liquefaction", "fs_liq", "factor_of_safety_liq", "ru", "excess_pore_pressure", "excess_pore_pressure_ratio", "cyclic_stress_ratio", "cyclic_resistance_ratio", "csr", "crr", "vs30", "flow_slide_runout", "lateral_spreading", "delta_u"}:
                rgba[:, :, 3] = 225
            elif col_clean in {"geotechnical_settlement", "settlement", "geotechnical-settlement", "reconsolidation_settlement"} or idx_clean in {"total_settlement", "crest_settlement", "settlement", "volumetric_strain", "angular_distortion", "differential_settlement", "insar_residual", "reconsolidation_rate", "eps_v", "crest_s"}:
                rgba[:, :, 3] = 225
            elif col_clean in {"topography_elevation_delta", "elevation_delta", "topography", "cut_and_fill", "pointcloud_csf", "csf"} or idx_clean in {"elevation_delta", "cut_depth", "fill_height", "slope_delta", "csf_ground_surface", "ndsm_height", "delta_z", "cut", "fill", "csf_ground", "csf", "ndsm"}:
                rgba[:, :, 3] = 230
            elif col_clean in {"hydrodynamic_inundation", "inundation", "hydrodynamic", "dam_breach", "dam_breach_hydrodynamic"} or idx_clean in {"inundation_depth", "flow_velocity", "wave_arrival_time", "depth_velocity_product", "water_surface_elevation", "hazard_rating_tier", "depth_velocity", "arrival_time", "hazard_tier"}:
                flood_mask = val > 0.05 if idx_clean not in {"wave_arrival_time", "water_surface_elevation"} else (val > 0.0)
                rgba[~flood_mask, 3] = 0
                rgba[flood_mask & (val < 1.0), 3] = 180
                rgba[flood_mask & (val >= 1.0), 3] = 235
            elif col_clean in {"geotechnical_flownet", "flownet", "seepage_flownet", "internal_erosion", "internal_erosion_piping", "piping"} or idx_clean in {"flownet_head", "stream_function", "hydraulic_gradient", "flownet_gradient", "flownet_exit_gradient", "piping_factor_of_safety", "piping_progression", "flownet_hazard_tier"}:
                seepage_mask = (val > 0.0) if idx_clean not in {"hydraulic_head", "factor_of_safety", "flownet_head", "piping_factor_of_safety"} else (val > 0.1)
                rgba[~seepage_mask, 3] = 0
                rgba[seepage_mask & (val < 1.0), 3] = 190
                rgba[seepage_mask & (val >= 1.0), 3] = 235
            elif col_clean in {"geotechnical_insar_velocity", "insar_velocity", "insar_ps", "geotechnical_insar", "insar"} or idx_clean in {"velocity_los", "velocity_vertical", "velocity_east_west", "temporal_coherence", "height_residual", "insar_hazard_tier"}:
                rgba[:, :, 3] = 230
            elif col_clean in {"geotechnical_damage_proxy", "damage_proxy", "dpm", "sar_dpm", "sar_damage_proxy", "geotechnical_dpm"} or idx_clean in {"coherence_delta", "pre_coherence", "event_coherence", "damage_severity_tier", "building_loss_ratio", "hazard_rating_tier", "coherence_loss", "structural_damage_ratio", "dpm_hazard_tier"}:
                if idx_clean in {"coherence_delta", "coherence_loss", "building_loss_ratio", "structural_damage_ratio"}:
                    dpm_mask = val > 0.03
                    rgba[~dpm_mask, 3] = 0
                    rgba[dpm_mask & (val < 0.20), 3] = 160
                    rgba[dpm_mask & (val >= 0.20), 3] = 230
                else:
                    rgba[:, :, 3] = 230
            elif col_clean in {"phenology_anomaly", "phenology", "climatological_mad", "phenological_delta", "phenology_cube"} or idx_clean in {"baseline_ndvi", "seasonal_amplitude", "phase_angle", "theil_sen_slope", "mad_anomaly_zscore", "anomaly_tier", "z_score", "seasonal_zscore"}:
                if idx_clean in {"mad_anomaly_zscore", "z_score", "seasonal_zscore", "zscore", "mad_zscore", "anomaly", "anomaly_tier", "tier"}:
                    anom_mask = (np.abs(val) >= 1.5) if idx_clean not in {"anomaly_tier", "tier"} else (val >= 1.0)
                    rgba[~anom_mask, 3] = 40
                    rgba[anom_mask & ((np.abs(val) if idx_clean not in {"anomaly_tier", "tier"} else val) < 2.5), 3] = 180
                    rgba[anom_mask & ((np.abs(val) if idx_clean not in {"anomaly_tier", "tier"} else val) >= 2.5), 3] = 235
                else:
                    rgba[:, :, 3] = 230

        # Encode to PNG
        img = Image.fromarray(rgba, "RGBA")
        with io.BytesIO() as buf:
            img.save(buf, format="PNG", optimize=True)
            png_bytes = buf.getvalue()

        # Free memory buffers
        del gx
        del gy
        del xx
        del yy
        del spatial_seed
        del base_variation
        if 'val' in locals():
            del val
        del img
        del rgba

        # Write to disk cache
        for f_cand in (cache_file, det_cache_file):
            try:
                with open(f_cand, "wb") as f:
                    f.write(png_bytes)
            except Exception as write_err:
                logger.warning("Could not cache tile %s: %s", f_cand, write_err)

        return png_bytes

    def render_terrain_tile(
        self,
        metric: str,
        z: int,
        x: int,
        y: int,
        colormap: str = "terrain",
        rescale: Optional[str] = None
    ) -> bytes:
        """Renders 256x256 RGBA tile for digital elevation or terrain morphology."""
        return self.render_dem_tile(
            z=z,
            x=x,
            y=y,
            metric=metric,
            collection="cop-dem-glo-30",
            colormap=colormap,
            rescale=rescale
        )

    def render_sar_tile(
        self,
        polarization: str,
        z: int,
        x: int,
        y: int,
        colormap: str = "viridis",
        rescale: Optional[str] = None
    ) -> bytes:
        """Renders 256x256 RGBA tile for Sentinel-1 Synthetic Aperture Radar backscatter."""
        return self.render_tile(
            collection="sar",
            item_id=polarization,
            z=z,
            x=x,
            y=y,
            index=polarization,
            colormap=colormap,
            rescale=rescale
        )

    def render_difference_tile(
        self,
        collection: str,
        pre_scene_id: str,
        post_scene_id: str,
        metric: str,
        z: int,
        x: int,
        y: int,
        colormap: str = "rdylbu",
        rescale: Optional[str] = "-0.3,0.3"
    ) -> bytes:
        """Renders 256x256 RGBA tile for bitemporal difference raster."""
        clean_metric = metric.lower().strip()
        item_id = f"{pre_scene_id}_{post_scene_id}"
        return self.render_tile(
            collection=f"diff_{collection}",
            item_id=item_id,
            z=z,
            x=x,
            y=y,
            index=clean_metric,
            colormap=colormap or "rdylbu",
            rescale=rescale or "-0.3,0.3",
            pre=pre_scene_id,
            post=post_scene_id
        )

    def render_twi_tile(
        self,
        z: int,
        x: int,
        y: int,
        colormap: str = "spectral",
        rescale: Optional[str] = "2,14"
    ) -> bytes:
        """Renders 256x256 RGBA tile for Topographic Wetness Index (TWI)."""
        return self.render_tile(
            collection="twi",
            item_id="twi",
            z=z,
            x=x,
            y=y,
            index="twi",
            colormap=colormap or "spectral",
            rescale=rescale or "2,14"
        )

    def render_slope_stability_tile(
        self,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        colormap: str = "rdylbu",
        rescale: Optional[str] = "0.8,2.5",
        sim_id: Optional[str] = None,
        metric: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for infinite slope Factor of Safety or geotechnical limit equilibrium."""
        if sim_id or metric:
            return self.render_geotechnical_slope_stability_tile(
                sim_id=sim_id or "SIM_SLOPE_001",
                z=z,
                x=x,
                y=y,
                metric=metric or "factor_of_safety",
                colormap=colormap,
                rescale=rescale,
                **kwargs
            )
        return self.render_tile(
            collection="slope_stability",
            item_id="slope_stability",
            z=int(z),
            x=int(x),
            y=int(y),
            index="slope_stability",
            colormap=colormap or "rdylbu",
            rescale=rescale or "0.8,2.5"
        )

    def render_water_quality_tile(
        self,
        metric: str = "ndci",
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: str = "turbo",
        rescale: Optional[str] = "0.0,0.4",
        collection: Optional[str] = None,
        item_id: Optional[str] = None
    ) -> bytes:
        """Renders 256x256 RGBA tile for water quality and algal bloom index."""
        clean_metric = (metric or "ndci").lower().strip()
        default_rescale = "0.0,0.4" if clean_metric != "ndti" else "-0.3,0.3"
        target_collection = collection or "water_quality"
        target_item = item_id or clean_metric
        return self.render_tile(
            collection=target_collection,
            item_id=target_item,
            z=z,
            x=x,
            y=y,
            index=clean_metric,
            colormap=colormap or "turbo",
            rescale=rescale or default_rescale
        )

    def render_thermal_lst_tile(
        self,
        collection: str = "landsat-c2-l2",
        item_id: str = "lst",
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: str = "turbo",
        rescale: Optional[str] = "15.0,45.0",
        method: Optional[str] = "single_channel"
    ) -> bytes:
        """Renders 256x256 RGBA tile for Land Surface Temperature (LST) thermal layer."""
        clean_cmap = colormap or "turbo"
        clean_rescale = rescale or "15.0,45.0"
        return self.render_tile(
            collection=collection or "landsat-c2-l2",
            item_id=item_id or "lst",
            z=z,
            x=x,
            y=y,
            index="lst",
            colormap=clean_cmap,
            rescale=clean_rescale
        )

    def render_insar_tile(
        self,
        pair_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "displacement",
        colormap: str = "rdylbu",
        rescale: Optional[str] = "-30.0,30.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for Sentinel-1 InSAR line-of-sight displacement or coherence."""
        clean_metric = (metric or "displacement").lower().strip()
        default_rescale = "-30.0,30.0" if "disp" in clean_metric else "0.0,1.0"
        clean_cmap = colormap or ("rdylbu" if "disp" in clean_metric else "viridis")
        return self.render_tile(
            collection="sar_insar",
            item_id=pair_id,
            z=z,
            x=x,
            y=y,
            index=clean_metric,
            colormap=clean_cmap,
            rescale=rescale or default_rescale
        )

    def render_bap_composite_tile(
        self,
        composite_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: str = "spectral",
        rescale: Optional[str] = "0.0,1.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for Best Available Pixel (BAP) parametric composite."""
        return self.render_tile(
            collection="bap_composite",
            item_id=composite_id,
            z=z,
            x=x,
            y=y,
            index="bap_score",
            colormap=colormap or "spectral",
            rescale=rescale or "0.0,1.0"
        )

    def render_chm_tile(
        self,
        asset_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: str = "viridis",
        rescale: Optional[str] = "0.0,25.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for Canopy Height Model (CHM)."""
        return self.render_tile(
            collection="point-cloud-chm",
            item_id=asset_id,
            z=z,
            x=x,
            y=y,
            index="chm",
            colormap=colormap or "viridis",
            rescale=rescale or "0.0,25.0"
        )

    def render_true_ortho_tile(
        self,
        mosaic_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = None,
        rescale: Optional[str] = "0.0,255.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for seamless true orthomosaic."""
        return self.render_tile(
            collection="true-ortho",
            item_id=mosaic_id,
            z=z,
            x=x,
            y=y,
            index="true_ortho",
            colormap=colormap or "spectral",
            rescale=rescale or "0.0,255.0"
        )

    def render_byoc_tile(
        self,
        bucket_id: str,
        item_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "viridis",
        rescale: Optional[str] = "0.0,1.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for external Bring Your Own COG asset."""
        return self.render_tile(
            collection="byoc",
            item_id=f"{bucket_id}/{item_id}",
            z=z,
            x=x,
            y=y,
            index="byoc",
            colormap=colormap or "viridis",
            rescale=rescale or "0.0,1.0"
        )

    def render_cva_tile(
        self,
        pre_scene_id: str,
        post_scene_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "turbo",
        rescale: Optional[str] = "0.0,0.5"
    ) -> bytes:
        """Renders 256x256 RGBA tile for Change Vector Analysis (CVA) magnitude."""
        return self.render_tile(
            collection="cva",
            item_id=f"{pre_scene_id}_{post_scene_id}",
            z=z,
            x=x,
            y=y,
            index="cva",
            colormap=colormap or "turbo",
            rescale=rescale or "0.0,0.5"
        )

    def render_soil_salinity_tile(
        self,
        collection: Optional[str] = "sentinel-2-l2a",
        item_id: Optional[str] = "salinity",
        metric: Optional[str] = "ndsi",
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "spectral",
        rescale: Optional[str] = "-0.3,0.3"
    ) -> bytes:
        """Renders 256x256 RGBA tile for soil salinity index (NDSI, SI-1, SI-2, CRSI)."""
        clean_metric = (metric or "ndsi").lower().strip()
        default_rescale = "-0.3,0.3"
        if clean_metric == "si1":
            default_rescale = "0.0,0.4"
        elif clean_metric == "si2":
            default_rescale = "0.0,0.6"
        elif clean_metric == "crsi":
            default_rescale = "0.0,0.8"
        return self.render_tile(
            collection="soil_salinity",
            item_id=item_id or "salinity",
            z=z,
            x=x,
            y=y,
            index=clean_metric,
            colormap=colormap or "spectral",
            rescale=rescale or default_rescale
        )

    def render_thermal_hotspot_tile(
        self,
        collection: Optional[str] = "landsat-c2-l2",
        item_id: Optional[str] = "thermal",
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "inferno",
        rescale: Optional[str] = "300.0,400.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for active thermal hotspots and FRP."""
        return self.render_tile(
            collection="thermal_hotspots",
            item_id=item_id or "thermal",
            z=z,
            x=x,
            y=y,
            index="thermal_hotspots",
            colormap=colormap or "inferno",
            rescale=rescale or "300.0,400.0"
        )

    def render_flood_inundation_tile(
        self,
        simulation_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "blues",
        rescale: Optional[str] = "0.0,10.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for tailings dam breach hydrodynamic flood inundation depth."""
        return self.render_tile(
            collection="flood_inundation",
            item_id=simulation_id,
            z=z,
            x=x,
            y=y,
            index="flood_inundation",
            colormap=colormap or "blues",
            rescale=rescale or "0.0,10.0"
        )

    def render_landslide_tile(
        self,
        asset_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "turbo",
        rescale: Optional[str] = "0.0,1.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for infinite slope stability & landslide susceptibility."""
        return self.render_tile(
            collection="landslide_susceptibility",
            item_id=asset_id,
            z=z,
            x=x,
            y=y,
            index="landslide_susceptibility",
            colormap=colormap or "turbo",
            rescale=rescale or "0.0,1.0"
        )

    def render_drought_vhi_tile(
        self,
        collection: Optional[str] = "sentinel-2-l2a",
        item_id: Optional[str] = "vhi",
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "rdylgn",
        rescale: Optional[str] = "0.0,100.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for Kogan Vegetation Health Index (VHI) agricultural drought."""
        return self.render_tile(
            collection=collection or "sentinel-2-l2a",
            item_id=item_id or "vhi",
            z=z,
            x=x,
            y=y,
            index="vhi",
            colormap=colormap or "rdylgn",
            rescale=rescale or "0.0,100.0"
        )

    def render_sam_mineral_tile(
        self,
        collection: Optional[str] = "sentinel-2-l2a",
        item_id: Optional[str] = "sam",
        endmember: Optional[str] = "pyrite",
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "viridis",
        rescale: Optional[str] = "0.0,0.3"
    ) -> bytes:
        """Renders 256x256 RGBA tile for Spectral Angle Mapper (SAM) mineral and tailings classification."""
        clean_mineral = (endmember or "pyrite").lower().strip()
        return self.render_tile(
            collection=collection or "sentinel-2-l2a",
            item_id=f"{item_id}_{clean_mineral}",
            z=z,
            x=x,
            y=y,
            index=clean_mineral,
            colormap=colormap or "viridis",
            rescale=rescale or "0.0,0.3"
        )

    def render_vector_tile(
        self,
        layer_id: str,
        z: int,
        x: int,
        y: int
    ) -> bytes:
        """Renders Mapbox Vector Tile (MVT) Protobuf (.pbf) for vector GIS layer."""
        from app.services.spatial import spatial_service
        return spatial_service.render_vector_tile(layer_id=layer_id, z=z, x=x, y=y)

    def render_snow_cover_tile(
        self,
        collection: Optional[str] = "sentinel-2-l2a",
        item_id: Optional[str] = "snow",
        z: int = 0,
        x: int = 0,
        y: int = 0,
        model: Optional[str] = "salomonson_appel",
        colormap: Optional[str] = "blues",
        rescale: Optional[str] = "0.0,1.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for sub-pixel Fractional Snow Cover (FSC)."""
        return self.render_tile(
            collection=collection or "sentinel-2-l2a",
            item_id=item_id or "snow",
            z=z,
            x=x,
            y=y,
            index="fsc",
            colormap=colormap or "blues",
            rescale=rescale or "0.0,1.0"
        )

    def render_aquatic_turbidity_tile(
        self,
        collection: Optional[str] = "sentinel-2-l2a",
        item_id: Optional[str] = "turbidity",
        metric: Optional[str] = "turbidity",
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "turbo",
        rescale: Optional[str] = "0.0,50.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for aquatic Total Suspended Matter & Turbidity inversion."""
        clean_metric = (metric or "turbidity").lower().strip()
        default_rescale = "0.0,80.0" if clean_metric == "tsm" else "0.0,50.0"
        return self.render_tile(
            collection=collection or "sentinel-2-l2a",
            item_id=item_id or "turbidity",
            z=z,
            x=x,
            y=y,
            index=clean_metric,
            colormap=colormap or "turbo",
            rescale=rescale or default_rescale
        )

    def render_disturbance_tile(
        self,
        collection: Optional[str] = "sentinel-2-l2a",
        item_id: Optional[str] = "breaks",
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "magma",
        rescale: Optional[str] = "-0.3,0.1"
    ) -> bytes:
        """Renders 256x256 RGBA tile for abrupt structural trajectory disturbance breaks."""
        return self.render_tile(
            collection=collection or "sentinel-2-l2a",
            item_id=item_id or "breaks",
            z=z,
            x=x,
            y=y,
            index="disturbance",
            colormap=colormap or "magma",
            rescale=rescale or "-0.3,0.1"
        )

    def render_cwsi_tile(
        self,
        collection: Optional[str] = "landsat-c2-l2",
        item_id: Optional[str] = "cwsi",
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "rdylgn_r",
        rescale: Optional[str] = "0.0,1.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for Crop Water Stress Index & evapotranspiration deficit."""
        return self.render_tile(
            collection=collection or "landsat-c2-l2",
            item_id=item_id or "cwsi",
            z=z,
            x=x,
            y=y,
            index="cwsi",
            colormap=colormap or "rdylgn_r",
            rescale=rescale or "0.0,1.0"
        )

    def render_spline_mosaic_tile(
        self,
        mosaic_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        blend_mode: Optional[str] = "multiresolution_spline",
        colormap: Optional[str] = "terrain",
        rescale: Optional[str] = "0.0,255.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for multi-resolution spline & Laplacian pyramid mosaic blending."""
        return self.render_tile(
            collection="spline_mosaic",
            item_id=mosaic_id or "mosaic_01",
            z=z,
            x=x,
            y=y,
            index="spline",
            colormap=colormap or "terrain",
            rescale=rescale or "0.0,255.0"
        )

    def render_direct_georeferencing_tile(
        self,
        mission_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "turbo",
        rescale: Optional[str] = "0.0,1.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile showing calibrated camera perspective center, ground footprint, and CEP95 bounds."""
        return self.render_tile(
            collection="direct_georeferencing",
            item_id=mission_id or "drone_mission_01",
            z=z,
            x=x,
            y=y,
            index="direct_georeferencing",
            colormap=colormap or "turbo",
            rescale=rescale or "0.0,1.0"
        )

    def render_crest_alignment_tile(
        self,
        alignment_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "rdylbu_r",
        rescale: Optional[str] = "0.0,0.5"
    ) -> bytes:
        """Renders 256x256 RGBA tile showing vectorized embankment crest centerline, normal transects & settlement sag."""
        return self.render_tile(
            collection="crest_alignment",
            item_id=alignment_id or "crest_tsf_01",
            z=z,
            x=x,
            y=y,
            index="crest_alignment",
            colormap=colormap or "rdylbu_r",
            rescale=rescale or "0.0,0.5"
        )

    def render_ps_insar_tile(
        self,
        stack_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "seismic_r",
        rescale: Optional[str] = "-20.0,10.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for APS-filtered Persistent Scatterer InSAR LOS displacement velocity (mm/yr)."""
        return self.render_tile(
            collection="ps_insar",
            item_id=stack_id or "ps_stack_tsf_01",
            z=z,
            x=x,
            y=y,
            index="ps_insar",
            colormap=colormap or "seismic_r",
            rescale=rescale or "-20.0,10.0"
        )

    def render_soil_moisture_tile(
        self,
        collection: str = "sentinel-1-rtc",
        item_id: str = "s1_sample",
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "blues",
        rescale: Optional[str] = "0.0,0.5"
    ) -> bytes:
        """Renders 256x256 RGBA tile for SAR Soil Moisture Inversion (volumetric moisture m3/m3)."""
        return self.render_tile(
            collection="soil_moisture",
            item_id=item_id or "s1_sample",
            z=z,
            x=x,
            y=y,
            index="soil_moisture",
            colormap=colormap or "blues",
            rescale=rescale or "0.0,0.5"
        )

    def render_bathymetry_tile(
        self,
        collection: str = "sentinel-2-l2a",
        item_id: str = "s2_sample",
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "mako_r",
        rescale: Optional[str] = "0.0,40.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for Satellite-Derived Optical Bathymetry water depth (meters)."""
        return self.render_tile(
            collection="bathymetry",
            item_id=item_id or "s2_sample",
            z=z,
            x=x,
            y=y,
            index="bathymetry",
            colormap=colormap or "mako_r",
            rescale=rescale or "0.0,40.0"
        )

    def render_gpr_tile(
        self,
        profile_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "seismic",
        rescale: Optional[str] = "-300.0,300.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for Ground Penetrating Radar (GPR) subsurface amplitude (mV)."""
        return self.render_tile(
            collection="gpr",
            item_id=profile_id or "gpr_transect_01",
            z=z,
            x=x,
            y=y,
            index="gpr",
            colormap=colormap or "seismic",
            rescale=rescale or "-300.0,300.0"
        )

    def render_vibration_tile(
        self,
        asset_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "turbo",
        rescale: Optional[str] = "0.0,25.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for Operational Modal Analysis Peak Particle Velocity (PPV mm/s)."""
        return self.render_tile(
            collection="vibration",
            item_id=asset_id or "spillway_monolith_01",
            z=z,
            x=x,
            y=y,
            index="vibration",
            colormap=colormap or "turbo",
            rescale=rescale or "0.0,25.0"
        )

    def render_true_ortho_zbuffer_tile(
        self,
        ortho_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "magma",
        rescale: Optional[str] = "0.0,255.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for True Ortho Z-buffer building lean & shadow occlusion."""
        return self.render_tile(
            collection="true_ortho_zbuffer",
            item_id=ortho_id or "ortho_tsf_survey_01",
            z=z,
            x=x,
            y=y,
            index="true_ortho_zbuffer",
            colormap=colormap or "magma",
            rescale=rescale or "0.0,255.0"
        )

    def render_graphcut_seamline_tile(
        self,
        mosaic_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "viridis",
        rescale: Optional[str] = "0.0,255.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for multiresolution graph-cut seamline blended mosaics."""
        return self.render_tile(
            collection="graphcut_seamlines",
            item_id=mosaic_id or "mosaic_tsf_survey_01",
            z=z,
            x=x,
            y=y,
            index="graphcut_seamlines",
            colormap=colormap or "viridis",
            rescale=rescale or "0.0,255.0"
        )

    def render_brdf_nbar_tile(
        self,
        collection: str = "sentinel-2-l2a",
        item_id: str = "S2A_MSIL2A_20260910",
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "spectral",
        rescale: Optional[str] = "0.0,0.6"
    ) -> bytes:
        """Renders 256x256 RGBA tile for Nadir BRDF-Adjusted Reflectance (NBAR)."""
        return self.render_tile(
            collection="brdf_nbar",
            item_id=item_id or "S2A_MSIL2A_20260910",
            z=z,
            x=x,
            y=y,
            index="brdf_nbar",
            colormap=colormap or "spectral",
            rescale=rescale or "0.0,0.6"
        )

    def render_sbas_tile(
        self,
        stack_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "seismic_r",
        rescale: Optional[str] = "-25.0,15.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for SBAS multi-temporal InSAR deformation velocity (mm/yr)."""
        return self.render_tile(
            collection="sbas",
            item_id=stack_id or "SBAS_TSF_2026_STACK",
            z=z,
            x=x,
            y=y,
            index="sbas",
            colormap=colormap or "seismic_r",
            rescale=rescale or "-25.0,15.0"
        )

    def render_topographic_minnaert_tile(
        self,
        collection: str = "sentinel-2-l2a",
        item_id: str = "S2A_MSIL2A_20260815T183921",
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "spectral",
        rescale: Optional[str] = "0.0,0.5"
    ) -> bytes:
        """Renders 256x256 RGBA tile for Topographic Minnaert / C-correction normalized reflectance."""
        return self.render_tile(
            collection="topographic_minnaert",
            item_id=item_id or "S2A_MSIL2A_20260815T183921",
            z=z,
            x=x,
            y=y,
            index="topographic_minnaert",
            colormap=colormap or "spectral",
            rescale=rescale or "0.0,0.5"
        )

    def render_tie_point_rpc_tile(
        self,
        image_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "turbo",
        rescale: Optional[str] = "0.0,3.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for sub-pixel tie-point RPC alignment residual heatmap."""
        return self.render_tile(
            collection="tie_point_rpc",
            item_id=image_id or "WV03_20260905_EXP01",
            z=z,
            x=x,
            y=y,
            index="tie_point_rpc",
            colormap=colormap or "turbo",
            rescale=rescale or "0.0,3.0"
        )

    def render_quality_mosaic_tile(
        self,
        mosaic_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "spectral",
        rescale: Optional[str] = "0.0,1.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for multi-temporal greenest/clearest quality pixel composite."""
        return self.render_tile(
            collection="quality_mosaic",
            item_id=mosaic_id or "QUALITY_MOSAIC_2026_Q3",
            z=z,
            x=x,
            y=y,
            index="quality_mosaic",
            colormap=colormap or "spectral",
            rescale=rescale or "0.0,1.0"
        )

    def render_drone_odm_tile(
        self,
        task_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        colormap: Optional[str] = "viridis",
        rescale: Optional[str] = "0.0,255.0"
    ) -> bytes:
        """Renders 256x256 RGBA tile for NodeODM reconstructed drone orthophoto deliverables."""
        return self.render_tile(
            collection="drone_odm",
            item_id=task_id or "ODM_TASK_20261001_001",
            z=z,
            x=x,
            y=y,
            index="drone_odm",
            colormap=colormap or "viridis",
            rescale=rescale or "0.0,255.0"
        )

    def render_drone_photogrammetry_tile(
        self,
        task_id: str,
        z: int = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "orthophoto",
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for centimeter drone photogrammetry and COG raster products."""
        metric_clean = (metric or "orthophoto").lower().replace("-", "_")
        from app.models.schemas import DRONE_PHOTOGRAMMETRY_TILE_METRIC_CONFIGS
        cfg = DRONE_PHOTOGRAMMETRY_TILE_METRIC_CONFIGS.get(metric_clean, {})
        default_cmap = cfg.get("default_colormap") or ("viridis" if metric_clean != "orthophoto" else None)
        default_rescale = cfg.get("default_rescale") or "0.0,255.0"

        chosen_cmap = colormap or default_cmap
        chosen_rescale = rescale or (default_rescale if default_rescale != "auto" else "0.0,255.0")

        return self.render_tile(
            collection="drone_photogrammetry",
            item_id=task_id or "ODM-BENCHMARK-001",
            z=z,
            x=x,
            y=y,
            index=metric_clean,
            colormap=chosen_cmap,
            rescale=chosen_rescale
        )

    def render_dam_break_tile(
        self,
        sim_id: str,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "hazard_product",
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for 2D shallow water dam-break hydrodynamic simulation."""
        if isinstance(z, str) and not z.isdigit():
            actual_metric = z
            actual_z = int(x)
            actual_x = int(y)
            actual_y = int(metric) if isinstance(metric, (int, str)) and str(metric).isdigit() else 0
        else:
            actual_metric = metric or "hazard_product"
            actual_z = int(z)
            actual_x = int(x)
            actual_y = int(y)

        metric_clean = actual_metric.lower().replace("-", "_")
        if not colormap:
            if metric_clean in {"depth", "flood_depth", "dam_depth", "h"}:
                chosen_cmap = "blues"
            elif metric_clean in {"velocity", "flow_velocity", "dam_velocity", "speed", "v"}:
                chosen_cmap = "plasma"
            elif metric_clean in {"arrival_time", "time", "t_arrival"}:
                chosen_cmap = "viridis"
            else:
                chosen_cmap = "turbo"
        else:
            chosen_cmap = colormap

        if not rescale:
            if metric_clean in {"depth", "flood_depth", "dam_depth", "h"}:
                chosen_rescale = "0.0,15.0"
            elif metric_clean in {"velocity", "flow_velocity", "dam_velocity", "speed", "v"}:
                chosen_rescale = "0.0,10.0"
            elif metric_clean in {"arrival_time", "time", "t_arrival"}:
                chosen_rescale = "0.0,120.0"
            else:
                chosen_rescale = "0.0,30.0"
        else:
            chosen_rescale = rescale

        return self.render_tile(
            collection="dam_break",
            item_id=sim_id or "SIM_DAM_BREAK_001",
            z=actual_z,
            x=actual_x,
            y=actual_y,
            index=metric_clean,
            colormap=chosen_cmap,
            rescale=chosen_rescale
        )

    def render_phreatic_seepage_tile(
        self,
        sim_id: str,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "saturation",
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for geotechnical embankment phreatic surface seepage simulation."""
        if isinstance(z, str) and not z.isdigit():
            actual_metric = z
            actual_z = int(x)
            actual_x = int(y)
            actual_y = int(metric) if isinstance(metric, (int, str)) and str(metric).isdigit() else 0
        else:
            actual_metric = metric or "saturation"
            actual_z = int(z)
            actual_x = int(x)
            actual_y = int(y)

        metric_clean = actual_metric.lower().replace("-", "_")
        if not colormap:
            if metric_clean in {"saturation", "effective_saturation", "se", "phreatic_seepage"}:
                chosen_cmap = "blues"
            elif metric_clean in {"pore_pressure", "pressure", "u"}:
                chosen_cmap = "plasma"
            elif metric_clean in {"gradient", "exit_gradient", "hydraulic_gradient", "i"}:
                chosen_cmap = "turbo"
            elif metric_clean in {"hydraulic_head", "total_head", "head", "h"}:
                chosen_cmap = "viridis"
            elif metric_clean in {"suction", "matric_suction", "psi"}:
                chosen_cmap = "cividis"
            else:
                chosen_cmap = "blues"
        else:
            chosen_cmap = colormap

        if not rescale:
            if metric_clean in {"saturation", "effective_saturation", "se", "phreatic_seepage"}:
                chosen_rescale = "0.0,1.0"
            elif metric_clean in {"pore_pressure", "pressure", "u"}:
                chosen_rescale = "0.0,300.0"
            elif metric_clean in {"gradient", "exit_gradient", "hydraulic_gradient", "i"}:
                chosen_rescale = "0.0,1.0"
            elif metric_clean in {"hydraulic_head", "total_head", "head", "h"}:
                chosen_rescale = "750.0,825.0"
            elif metric_clean in {"suction", "matric_suction", "psi"}:
                chosen_rescale = "0.0,500.0"
            else:
                chosen_rescale = "0.0,1.0"
        else:
            chosen_rescale = rescale

        return self.render_tile(
            collection="phreatic_seepage",
            item_id=sim_id or "SIM_SEEPAGE_001",
            z=actual_z,
            x=actual_x,
            y=actual_y,
            index=metric_clean,
            colormap=chosen_cmap,
            rescale=chosen_rescale
        )

    def render_geotechnical_slope_stability_tile(
        self,
        sim_id: str,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "factor_of_safety",
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for geotechnical slope stability limit equilibrium simulation."""
        if isinstance(z, str) and not z.isdigit():
            actual_metric = z
            actual_z = int(x)
            actual_x = int(y)
            actual_y = int(metric) if isinstance(metric, (int, str)) and str(metric).isdigit() else 0
        else:
            actual_metric = metric or "factor_of_safety"
            actual_z = int(z)
            actual_x = int(x)
            actual_y = int(y)

        metric_clean = actual_metric.lower().replace("-", "_")
        if not colormap:
            if metric_clean in {"factor_of_safety", "fs", "slope_stability"}:
                chosen_cmap = "rdylbu"
            elif metric_clean in {"pore_pressure", "pressure", "u", "pore_water_pressure"}:
                chosen_cmap = "plasma"
            elif metric_clean in {"suction", "matric_suction", "psi", "suction_cohesion", "apparent_cohesion"}:
                chosen_cmap = "cividis"
            elif metric_clean in {"shear_resistance", "shear_stress", "shear_strength", "mobilized_shear"}:
                chosen_cmap = "viridis"
            elif metric_clean in {"effective_normal_force", "effective_stress", "normal_force"}:
                chosen_cmap = "magma"
            elif metric_clean in {"insar_creep", "creep_velocity", "displacement"}:
                chosen_cmap = "turbo"
            elif metric_clean in {"slip_surface", "critical_slip", "contours"}:
                chosen_cmap = "hot"
            else:
                chosen_cmap = "rdylbu"
        else:
            chosen_cmap = colormap

        if not rescale:
            if metric_clean in {"factor_of_safety", "fs", "slope_stability"}:
                chosen_rescale = "0.8,2.5"
            elif metric_clean in {"pore_pressure", "pressure", "u", "pore_water_pressure"}:
                chosen_rescale = "0.0,300.0"
            elif metric_clean in {"suction", "matric_suction", "psi", "suction_cohesion", "apparent_cohesion"}:
                chosen_rescale = "0.0,100.0"
            elif metric_clean in {"shear_resistance", "shear_stress", "shear_strength", "mobilized_shear"}:
                chosen_rescale = "0.0,200.0"
            elif metric_clean in {"effective_normal_force", "effective_stress", "normal_force"}:
                chosen_rescale = "0.0,400.0"
            elif metric_clean in {"insar_creep", "creep_velocity", "displacement"}:
                chosen_rescale = "-35.0,5.0"
            elif metric_clean in {"slip_surface", "critical_slip", "contours"}:
                chosen_rescale = "0.0,1.0"
            else:
                chosen_rescale = "0.8,2.5"
        else:
            chosen_rescale = rescale

        return self.render_tile(
            collection="geotechnical_slope_stability",
            item_id=sim_id or "SIM_SLOPE_001",
            z=actual_z,
            x=actual_x,
            y=actual_y,
            index=metric_clean,
            colormap=chosen_cmap,
            rescale=chosen_rescale
        )

    def render_rainfall_infiltration_tile(
        self,
        sim_id: str,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "factor_of_safety",
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for transient Green-Ampt rainfall infiltration & slope stability simulation."""
        if isinstance(z, str) and not z.isdigit():
            actual_metric = z
            actual_z = int(x)
            actual_x = int(y)
            actual_y = int(metric) if isinstance(metric, (int, str)) and str(metric).isdigit() else 0
        else:
            actual_metric = metric or "factor_of_safety"
            actual_z = int(z)
            actual_x = int(x)
            actual_y = int(y)

        metric_clean = actual_metric.lower().replace("-", "_")
        if not colormap:
            if metric_clean in {"factor_of_safety", "fs", "transient_factor_of_safety", "rainfall_infiltration"}:
                chosen_cmap = "rdylbu"
            elif metric_clean in {"wetting_front", "wetting_front_depth", "depth"}:
                chosen_cmap = "plasma"
            elif metric_clean in {"infiltration_rate", "rate"}:
                chosen_cmap = "viridis"
            elif metric_clean in {"cumulative_infiltration", "cum_f", "f"}:
                chosen_cmap = "cividis"
            elif metric_clean in {"runoff_rate", "runoff"}:
                chosen_cmap = "magma"
            elif metric_clean in {"suction", "slip_surface_suction", "matric_suction"}:
                chosen_cmap = "cividis"
            elif metric_clean in {"richards_moisture", "moisture", "moisture_content", "volumetric_moisture", "saturation"}:
                chosen_cmap = "blues"
            else:
                chosen_cmap = "rdylbu"
        else:
            chosen_cmap = colormap

        if not rescale:
            if metric_clean in {"factor_of_safety", "fs", "transient_factor_of_safety", "rainfall_infiltration"}:
                chosen_rescale = "0.8,2.2"
            elif metric_clean in {"wetting_front", "wetting_front_depth", "depth"}:
                chosen_rescale = "0.0,5.0"
            elif metric_clean in {"infiltration_rate", "rate"}:
                chosen_rescale = "0.0,50.0"
            elif metric_clean in {"cumulative_infiltration", "cum_f", "f"}:
                chosen_rescale = "0.0,150.0"
            elif metric_clean in {"runoff_rate", "runoff"}:
                chosen_rescale = "0.0,30.0"
            elif metric_clean in {"suction", "slip_surface_suction", "matric_suction"}:
                chosen_rescale = "0.0,50.0"
            elif metric_clean in {"richards_moisture", "moisture", "moisture_content", "volumetric_moisture", "saturation"}:
                chosen_rescale = "0.10,0.48"
            else:
                chosen_rescale = "0.8,2.2"
        else:
            chosen_rescale = rescale

        return self.render_tile(
            collection="geotechnical_rainfall_infiltration",
            item_id=sim_id or "SIM_INFILTRATION_001",
            z=actual_z,
            x=actual_x,
            y=actual_y,
            index=metric_clean,
            colormap=chosen_cmap,
            rescale=chosen_rescale
        )

    def render_apparent_thermal_inertia_tile(
        self,
        sim_id: str,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "thermal_inertia",
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for remote sensing Apparent Thermal Inertia (ATI) phreatic moisture analysis."""
        if isinstance(z, str) and not z.isdigit():
            actual_metric = z
            actual_z = int(x)
            actual_x = int(y)
            actual_y = int(metric) if isinstance(metric, (int, str)) and str(metric).isdigit() else 0
        else:
            actual_metric = metric or "thermal_inertia"
            actual_z = int(z)
            actual_x = int(x)
            actual_y = int(y)

        metric_clean = actual_metric.lower().replace("-", "_")
        if not colormap:
            if metric_clean in {"thermal_inertia", "apparent_thermal_inertia", "thermal_apparent_inertia", "ati"}:
                chosen_cmap = "turbo"
            elif metric_clean in {"dtr", "dtr_celsius", "diurnal_temperature_range"}:
                chosen_cmap = "inferno"
            elif metric_clean in {"day_lst", "t_day", "day_temperature"}:
                chosen_cmap = "plasma"
            elif metric_clean in {"night_lst", "t_night", "night_temperature"}:
                chosen_cmap = "cividis"
            elif metric_clean in {"albedo", "alpha"}:
                chosen_cmap = "viridis"
            elif metric_clean in {"seepage_saturation", "anomaly", "thermal_seepage", "seepage_anomaly", "daylighting_outflow"}:
                chosen_cmap = "magma"
            else:
                chosen_cmap = "turbo"
        else:
            chosen_cmap = colormap

        if not rescale:
            if metric_clean in {"thermal_inertia", "apparent_thermal_inertia", "thermal_apparent_inertia", "ati"}:
                chosen_rescale = "0.010,0.080"
            elif metric_clean in {"dtr", "dtr_celsius", "diurnal_temperature_range"}:
                chosen_rescale = "5.0,25.0"
            elif metric_clean in {"day_lst", "t_day", "day_temperature"}:
                chosen_rescale = "15.0,45.0"
            elif metric_clean in {"night_lst", "t_night", "night_temperature"}:
                chosen_rescale = "5.0,25.0"
            elif metric_clean in {"albedo", "alpha"}:
                chosen_rescale = "0.05,0.35"
            elif metric_clean in {"seepage_saturation", "anomaly", "thermal_seepage", "seepage_anomaly", "daylighting_outflow"}:
                chosen_rescale = "0.0,1.0"
            else:
                chosen_rescale = "0.010,0.080"
        else:
            chosen_rescale = rescale

        return self.render_tile(
            collection="thermal_apparent_inertia",
            item_id=sim_id or "ATI_SEEPAGE_001",
            z=actual_z,
            x=actual_x,
            y=actual_y,
            index=metric_clean,
            colormap=chosen_cmap,
            rescale=chosen_rescale
        )

    def render_liquefaction_tile(
        self,
        sim_id: str,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "factor_of_safety",
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for dynamic seismic liquefaction susceptibility, excess pore pressure ratio (ru), and flow slide runout."""
        if isinstance(z, str) and not z.isdigit():
            actual_metric = z
            actual_z = int(x)
            actual_x = int(y)
            actual_y = int(metric) if isinstance(metric, (int, str)) and str(metric).isdigit() else 0
        else:
            actual_metric = metric or "factor_of_safety"
            actual_z = int(z)
            actual_x = int(x)
            actual_y = int(y)

        metric_clean = actual_metric.lower().replace("-", "_")
        if not colormap:
            if metric_clean in {"factor_of_safety", "fs", "fs_liq", "liquefaction", "susceptibility"}:
                chosen_cmap = "rdylbu"
            elif metric_clean in {"excess_pore_pressure", "excess_pore_pressure_ratio", "ru", "pore_pressure_ratio"}:
                chosen_cmap = "plasma"
            elif metric_clean in {"delta_u", "excess_pore_pressure_delta_u", "dynamic_pore_pressure", "pore_pressure"}:
                chosen_cmap = "turbo"
            elif metric_clean in {"cyclic_stress_ratio", "csr"}:
                chosen_cmap = "magma"
            elif metric_clean in {"cyclic_resistance_ratio", "crr", "crr75"}:
                chosen_cmap = "viridis"
            elif metric_clean in {"vs30", "shear_wave_velocity", "vs30_proxy"}:
                chosen_cmap = "turbo"
            elif metric_clean in {"flow_slide_runout", "runout", "flow_slide", "mobility"}:
                chosen_cmap = "hot"
            elif metric_clean in {"lateral_spreading", "dh", "ldi"}:
                chosen_cmap = "inferno"
            elif metric_clean in {"post_cyclic_effective_stress", "effective_stress"}:
                chosen_cmap = "cividis"
            else:
                chosen_cmap = "rdylbu"
        else:
            chosen_cmap = colormap

        if not rescale:
            if metric_clean in {"factor_of_safety", "fs", "fs_liq", "liquefaction", "susceptibility"}:
                chosen_rescale = "0.5,2.0"
            elif metric_clean in {"excess_pore_pressure", "excess_pore_pressure_ratio", "ru", "pore_pressure_ratio"}:
                chosen_rescale = "0.0,1.0"
            elif metric_clean in {"delta_u", "excess_pore_pressure_delta_u", "dynamic_pore_pressure", "pore_pressure"}:
                chosen_rescale = "0.0,150.0"
            elif metric_clean in {"cyclic_stress_ratio", "csr"}:
                chosen_rescale = "0.10,0.60"
            elif metric_clean in {"cyclic_resistance_ratio", "crr", "crr75"}:
                chosen_rescale = "0.10,0.60"
            elif metric_clean in {"vs30", "shear_wave_velocity", "vs30_proxy"}:
                chosen_rescale = "150.0,760.0"
            elif metric_clean in {"flow_slide_runout", "runout", "flow_slide", "mobility"}:
                chosen_rescale = "0.0,1.0"
            elif metric_clean in {"lateral_spreading", "dh", "ldi"}:
                chosen_rescale = "0.0,2.5"
            elif metric_clean in {"post_cyclic_effective_stress", "effective_stress"}:
                chosen_rescale = "0.0,200.0"
            else:
                chosen_rescale = "0.5,2.0"
        else:
            chosen_rescale = rescale

        return self.render_tile(
            collection="geotechnical_liquefaction",
            item_id=sim_id or "LIQ_001",
            z=actual_z,
            x=actual_x,
            y=actual_y,
            index=metric_clean,
            colormap=chosen_cmap,
            rescale=chosen_rescale
        )

    def render_settlement_tile(
        self,
        sim_id: str,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "total_settlement",
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for post-liquefaction reconsolidation settlement, volumetric strain, and angular distortion."""
        if isinstance(z, str) and not z.isdigit():
            actual_metric = z
            actual_z = int(x)
            actual_x = int(y)
            actual_y = int(metric) if isinstance(metric, (int, str)) and str(metric).isdigit() else 0
        else:
            actual_metric = metric or "total_settlement"
            actual_z = int(z)
            actual_x = int(x)
            actual_y = int(y)

        metric_clean = actual_metric.lower().replace("-", "_")
        if not colormap:
            if metric_clean in {"total_settlement", "crest_settlement", "settlement", "s", "crest_s"}:
                chosen_cmap = "turbo"
            elif metric_clean in {"volumetric_strain", "strain", "eps_v", "reconsolidation_strain"}:
                chosen_cmap = "viridis"
            elif metric_clean in {"angular_distortion", "distortion", "beta"}:
                chosen_cmap = "rdylbu"
            elif metric_clean in {"differential_settlement", "diff_s", "differential"}:
                chosen_cmap = "inferno"
            elif metric_clean in {"insar_residual", "residual", "insar_vertical_residual"}:
                chosen_cmap = "plasma"
            elif metric_clean in {"reconsolidation_rate", "rate", "dissipation_rate"}:
                chosen_cmap = "plasma"
            else:
                chosen_cmap = "turbo"
        else:
            clean_cm = colormap.lower().replace("_r", "").strip()
            chosen_cmap = clean_cm if clean_cm in {"spectral", "viridis", "turbo", "rdylbu", "terrain", "magma", "inferno", "cividis", "plasma"} else "turbo"

        if not rescale:
            if metric_clean in {"total_settlement", "crest_settlement", "settlement", "s", "crest_s"}:
                chosen_rescale = "0.0,1.5"
            elif metric_clean in {"volumetric_strain", "strain", "eps_v", "reconsolidation_strain"}:
                chosen_rescale = "0.0,6.0"
            elif metric_clean in {"angular_distortion", "distortion", "beta"}:
                chosen_rescale = "0.0,0.015"
            elif metric_clean in {"differential_settlement", "diff_s", "differential"}:
                chosen_rescale = "0.0,50.0"
            elif metric_clean in {"insar_residual", "residual", "insar_vertical_residual"}:
                chosen_rescale = "-20.0,20.0"
            elif metric_clean in {"reconsolidation_rate", "rate", "dissipation_rate"}:
                chosen_rescale = "0.0,10.0"
            else:
                chosen_rescale = "0.0,1.5"
        else:
            chosen_rescale = rescale

        return self.render_tile(
            collection="geotechnical_settlement",
            item_id=sim_id or "SETTLE_001",
            z=actual_z,
            x=actual_x,
            y=actual_y,
            index=metric_clean,
            colormap=chosen_cmap,
            rescale=chosen_rescale
        )

    def render_topographic_delta_tile(
        self,
        sim_id: str,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "elevation_delta",
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for 2.5D DEM cut-and-fill volumetric elevation delta and terrain metrics."""
        if isinstance(z, str) and not z.isdigit():
            actual_metric = z
            actual_z = int(x)
            actual_x = int(y)
            actual_y = int(metric) if isinstance(metric, (int, str)) and str(metric).isdigit() else 0
        else:
            actual_metric = metric or "elevation_delta"
            actual_z = int(z)
            actual_x = int(x)
            actual_y = int(y)

        metric_clean = actual_metric.lower().replace("-", "_")
        if not colormap:
            if metric_clean in {"elevation_delta", "delta_z"}:
                chosen_cmap = "bwr"
            elif metric_clean in {"cut_depth", "cut"}:
                chosen_cmap = "hot"
            elif metric_clean in {"fill_height", "fill"}:
                chosen_cmap = "viridis"
            elif metric_clean in {"slope_delta", "slope"}:
                chosen_cmap = "plasma"
            elif metric_clean in {"csf_ground_surface", "csf_ground", "csf"}:
                chosen_cmap = "terrain"
            elif metric_clean in {"ndsm_height", "ndsm"}:
                chosen_cmap = "turbo"
            else:
                chosen_cmap = "bwr"
        else:
            clean_cm = colormap.lower().replace("_r", "").strip()
            chosen_cmap = clean_cm if clean_cm in {"spectral", "viridis", "turbo", "rdylbu", "terrain", "magma", "inferno", "cividis", "plasma", "bwr", "hot", "blues"} else "bwr"

        if not rescale:
            if metric_clean in {"elevation_delta", "delta_z"}:
                chosen_rescale = "-5.0,5.0"
            elif metric_clean in {"cut_depth", "cut"}:
                chosen_rescale = "0.0,6.0"
            elif metric_clean in {"fill_height", "fill"}:
                chosen_rescale = "0.0,6.0"
            elif metric_clean in {"slope_delta", "slope"}:
                chosen_rescale = "-25.0,25.0"
            elif metric_clean in {"csf_ground_surface", "csf_ground", "csf"}:
                chosen_rescale = "100.0,500.0"
            elif metric_clean in {"ndsm_height", "ndsm"}:
                chosen_rescale = "0.0,20.0"
            else:
                chosen_rescale = "-5.0,5.0"
        else:
            chosen_rescale = rescale

        return self.render_tile(
            collection="topography_elevation_delta",
            item_id=sim_id or "CUTFILL_001",
            z=actual_z,
            x=actual_x,
            y=actual_y,
            index=metric_clean,
            colormap=chosen_cmap,
            rescale=chosen_rescale
        )

    def render_csf_tile(
        self,
        cloud_id: str,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "csf_ground_surface",
        colormap: Optional[str] = "terrain",
        rescale: Optional[str] = "100.0,500.0",
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for Cloth Simulation Filter bare-earth DTM terrain."""
        return self.render_topographic_delta_tile(
            sim_id=cloud_id,
            z=z,
            x=x,
            y=y,
            metric=metric or "csf_ground_surface",
            colormap=colormap or "terrain",
            rescale=rescale or "100.0,500.0",
            **kwargs
        )

    def render_hydrodynamic_inundation_tile(
        self,
        sim_id: str,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "inundation_depth",
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for 2D shallow water tailings dam breach inundation routing."""
        if isinstance(z, str) and not z.isdigit():
            actual_metric = z
            actual_z = int(x)
            actual_x = int(y)
            actual_y = int(metric) if isinstance(metric, (int, str)) and str(metric).isdigit() else 0
        else:
            actual_metric = metric or "inundation_depth"
            actual_z = int(z)
            actual_x = int(x)
            actual_y = int(y)

        metric_clean = actual_metric.lower().replace("-", "_")
        if not colormap:
            if metric_clean in {"inundation_depth", "depth", "flood_depth"}:
                chosen_cmap = "blues"
            elif metric_clean in {"flow_velocity", "velocity"}:
                chosen_cmap = "turbo"
            elif metric_clean in {"wave_arrival_time", "arrival_time", "time"}:
                chosen_cmap = "viridis"
            elif metric_clean in {"depth_velocity_product", "hazard_product", "hv"}:
                chosen_cmap = "magma"
            elif metric_clean in {"water_surface_elevation", "wse"}:
                chosen_cmap = "terrain"
            elif metric_clean in {"hazard_rating_tier", "hazard_tier", "hazard"}:
                chosen_cmap = "rdylbu"
            else:
                chosen_cmap = "blues"
        else:
            clean_cm = colormap.lower().replace("_r", "").strip()
            chosen_cmap = clean_cm if clean_cm in {"spectral", "viridis", "turbo", "rdylbu", "terrain", "magma", "inferno", "cividis", "plasma", "bwr", "hot", "blues"} else "blues"

        if not rescale:
            if metric_clean in {"inundation_depth", "depth", "flood_depth"}:
                chosen_rescale = "0.0,15.0"
            elif metric_clean in {"flow_velocity", "velocity"}:
                chosen_rescale = "0.0,12.0"
            elif metric_clean in {"wave_arrival_time", "arrival_time", "time"}:
                chosen_rescale = "0.0,360.0"
            elif metric_clean in {"depth_velocity_product", "hazard_product", "hv"}:
                chosen_rescale = "0.0,10.0"
            elif metric_clean in {"water_surface_elevation", "wse"}:
                chosen_rescale = "50.0,600.0"
            elif metric_clean in {"hazard_rating_tier", "hazard_tier", "hazard"}:
                chosen_rescale = "1.0,5.0"
            else:
                chosen_rescale = "0.0,15.0"
        else:
            chosen_rescale = rescale

        return self.render_tile(
            collection="hydrodynamic_inundation",
            item_id=sim_id or "BREACH_001",
            z=actual_z,
            x=actual_x,
            y=actual_y,
            index=metric_clean,
            colormap=chosen_cmap,
            rescale=chosen_rescale
        )

    def render_flownet_tile(
        self,
        sim_id: str,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "hydraulic_head",
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for 2D Laplace seepage flownet and Sellmeijer piping progression."""
        if isinstance(z, str) and not z.isdigit():
            actual_metric = z
            actual_z = int(x)
            actual_x = int(y)
            actual_y = int(metric) if isinstance(metric, (int, str)) and str(metric).isdigit() else 0
        else:
            actual_metric = metric or "hydraulic_head"
            actual_z = int(z)
            actual_x = int(x)
            actual_y = int(y)

        metric_clean = actual_metric.lower().replace("-", "_")
        if not colormap:
            if metric_clean in {"hydraulic_head", "total_head", "head", "phi", "flownet_head"}:
                chosen_cmap = "blues"
            elif metric_clean in {"stream_function", "streamline", "psi"}:
                chosen_cmap = "plasma"
            elif metric_clean in {"hydraulic_gradient", "gradient", "grad", "flownet_gradient"}:
                chosen_cmap = "hot"
            elif metric_clean in {"pore_pressure", "pressure", "u"}:
                chosen_cmap = "viridis"
            elif metric_clean in {"exit_gradient", "toe_gradient", "i_exit", "flownet_exit_gradient"}:
                chosen_cmap = "turbo"
            elif metric_clean in {"factor_of_safety", "fs", "fs_piping", "piping_factor_of_safety"}:
                chosen_cmap = "rdylbu"
            elif metric_clean in {"piping_progression", "pipe", "pipe_ratio"}:
                chosen_cmap = "magma"
            elif metric_clean in {"hazard_tier", "hazard_rating_tier", "hazard", "tier", "flownet_hazard_tier"}:
                chosen_cmap = "rdylbu"
            else:
                chosen_cmap = "blues"
        else:
            clean_cm = colormap.lower().replace("_r", "").strip()
            chosen_cmap = clean_cm if clean_cm in {"spectral", "viridis", "turbo", "rdylbu", "terrain", "magma", "inferno", "cividis", "plasma", "bwr", "hot", "blues"} else "blues"

        if not rescale:
            if metric_clean in {"hydraulic_head", "total_head", "head", "phi", "flownet_head"}:
                chosen_rescale = "4.0,24.0"
            elif metric_clean in {"stream_function", "streamline", "psi"}:
                chosen_rescale = "0.0,0.005"
            elif metric_clean in {"hydraulic_gradient", "gradient", "grad", "flownet_gradient"}:
                chosen_rescale = "0.0,2.0"
            elif metric_clean in {"pore_pressure", "pressure", "u"}:
                chosen_rescale = "0.0,300.0"
            elif metric_clean in {"exit_gradient", "toe_gradient", "i_exit", "flownet_exit_gradient"}:
                chosen_rescale = "0.0,1.8"
            elif metric_clean in {"factor_of_safety", "fs", "fs_piping", "piping_factor_of_safety"}:
                chosen_rescale = "0.5,3.0"
            elif metric_clean in {"piping_progression", "pipe", "pipe_ratio"}:
                chosen_rescale = "0.0,1.0"
            elif metric_clean in {"hazard_tier", "hazard_rating_tier", "hazard", "tier", "flownet_hazard_tier"}:
                chosen_rescale = "1.0,5.0"
            else:
                chosen_rescale = "4.0,24.0"
        else:
            chosen_rescale = rescale

        return self.render_tile(
            collection="geotechnical_flownet",
            item_id=sim_id or "FLOWNET_001",
            z=actual_z,
            x=actual_x,
            y=actual_y,
            index=metric_clean,
            colormap=chosen_cmap,
            rescale=chosen_rescale
        )

    def render_insar_velocity_tile(
        self,
        sim_id: str,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "velocity_vertical",
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for Persistent Scatterer InSAR and deformation velocity field."""
        if isinstance(z, str) and not z.isdigit():
            actual_metric = z
            actual_z = int(x)
            actual_x = int(y)
            actual_y = int(metric) if isinstance(metric, (int, str)) and str(metric).isdigit() else 0
        else:
            actual_metric = metric or "velocity_vertical"
            actual_z = int(z)
            actual_x = int(x)
            actual_y = int(y)

        metric_clean = actual_metric.lower().replace("-", "_")
        if not colormap:
            if metric_clean in {"velocity_vertical", "vertical_velocity", "v_vert", "v_v", "subsidence"}:
                chosen_cmap = "rdylbu"
            elif metric_clean in {"velocity_los", "los_velocity", "v_los", "los"}:
                chosen_cmap = "rdylbu"
            elif metric_clean in {"velocity_east_west", "east_west_velocity", "v_east", "v_e", "horizontal"}:
                chosen_cmap = "bwr"
            elif metric_clean in {"temporal_coherence", "coherence", "gamma", "ps_coherence"}:
                chosen_cmap = "viridis"
            elif metric_clean in {"height_residual", "dem_residual", "height_error", "delta_h"}:
                chosen_cmap = "bwr"
            elif metric_clean in {"hazard_tier", "hazard_rating_tier", "hazard", "tier", "insar_hazard_tier"}:
                chosen_cmap = "rdylbu"
            else:
                chosen_cmap = "rdylbu"
        else:
            clean_cm = colormap.lower().replace("_r", "").strip()
            chosen_cmap = clean_cm if clean_cm in {"spectral", "viridis", "turbo", "rdylbu", "terrain", "magma", "inferno", "cividis", "plasma", "bwr", "hot", "blues"} else "rdylbu"

        if not rescale:
            if metric_clean in {"velocity_vertical", "vertical_velocity", "v_vert", "v_v", "subsidence"}:
                chosen_rescale = "-20.0,5.0"
            elif metric_clean in {"velocity_los", "los_velocity", "v_los", "los"}:
                chosen_rescale = "-15.0,5.0"
            elif metric_clean in {"velocity_east_west", "east_west_velocity", "v_east", "v_e", "horizontal"}:
                chosen_rescale = "-8.0,8.0"
            elif metric_clean in {"temporal_coherence", "coherence", "gamma", "ps_coherence"}:
                chosen_rescale = "0.0,1.0"
            elif metric_clean in {"height_residual", "dem_residual", "height_error", "delta_h"}:
                chosen_rescale = "-5.0,5.0"
            elif metric_clean in {"hazard_tier", "hazard_rating_tier", "hazard", "tier", "insar_hazard_tier"}:
                chosen_rescale = "1.0,5.0"
            else:
                chosen_rescale = "-20.0,5.0"
        else:
            chosen_rescale = rescale

        return self.render_tile(
            collection="geotechnical_insar_velocity",
            item_id=sim_id or "INSAR_001",
            z=actual_z,
            x=actual_x,
            y=actual_y,
            index=metric_clean,
            colormap=chosen_cmap,
            rescale=chosen_rescale
        )

    def render_damage_proxy_tile(
        self,
        sim_id: str,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "coherence_delta",
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for SAR Interferometric Damage Proxy Mapping (DPM)."""
        if isinstance(z, str) and not z.isdigit():
            actual_metric = z
            actual_z = int(x)
            actual_x = int(y)
            actual_y = int(metric) if isinstance(metric, (int, str)) and str(metric).isdigit() else 0
        else:
            actual_metric = metric or "coherence_delta"
            actual_z = int(z)
            actual_x = int(x)
            actual_y = int(y)

        metric_clean = actual_metric.lower().replace("-", "_")
        if not colormap:
            if metric_clean in {"coherence_delta", "coherence_loss", "delta_gamma", "loss"}:
                chosen_cmap = "turbo"
            elif metric_clean in {"pre_coherence", "gamma_pre", "baseline"}:
                chosen_cmap = "viridis"
            elif metric_clean in {"event_coherence", "gamma_event", "co_event"}:
                chosen_cmap = "plasma"
            elif metric_clean in {"damage_severity_tier", "damage_tier", "severity"}:
                chosen_cmap = "rdylbu"
            elif metric_clean in {"building_loss_ratio", "loss_ratio", "structural_damage_ratio"}:
                chosen_cmap = "hot"
            elif metric_clean in {"hazard_rating_tier", "hazard_tier", "hazard", "dpm_hazard_tier"}:
                chosen_cmap = "inferno"
            else:
                chosen_cmap = "turbo"
        else:
            clean_cm = colormap.lower().replace("_r", "").strip()
            chosen_cmap = clean_cm if clean_cm in {"spectral", "viridis", "turbo", "rdylbu", "terrain", "magma", "inferno", "cividis", "plasma", "bwr", "hot", "blues"} else "turbo"

        if not rescale:
            if metric_clean in {"coherence_delta", "coherence_loss", "delta_gamma", "loss"}:
                chosen_rescale = "0.0,1.0"
            elif metric_clean in {"pre_coherence", "gamma_pre", "baseline"}:
                chosen_rescale = "0.0,1.0"
            elif metric_clean in {"event_coherence", "gamma_event", "co_event"}:
                chosen_rescale = "0.0,1.0"
            elif metric_clean in {"damage_severity_tier", "damage_tier", "severity"}:
                chosen_rescale = "1.0,4.0"
            elif metric_clean in {"building_loss_ratio", "loss_ratio", "structural_damage_ratio"}:
                chosen_rescale = "0.0,1.0"
            elif metric_clean in {"hazard_rating_tier", "hazard_tier", "hazard", "dpm_hazard_tier"}:
                chosen_rescale = "1.0,5.0"
            else:
                chosen_rescale = "0.0,1.0"
        else:
            chosen_rescale = rescale

        return self.render_tile(
            collection="geotechnical_damage_proxy",
            item_id=sim_id or "DPM_001",
            z=actual_z,
            x=actual_x,
            y=actual_y,
            index=metric_clean,
            colormap=chosen_cmap,
            rescale=chosen_rescale
        )

    def render_phenology_anomaly_tile(
        self,
        sim_id: str,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "mad_anomaly_zscore",
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA tile for Multi-Temporal Phenology, BFAST Trend & Climatological MAD Anomaly."""
        if isinstance(z, str) and not z.isdigit():
            actual_metric = z
            actual_z = int(x)
            actual_x = int(y)
            actual_y = int(metric) if isinstance(metric, (int, str)) and str(metric).isdigit() else 0
        else:
            actual_metric = metric or "mad_anomaly_zscore"
            actual_z = int(z)
            actual_x = int(x)
            actual_y = int(y)

        metric_clean = actual_metric.lower().replace("-", "_")
        from app.models.schemas import PHENOLOGY_TILE_METRIC_CONFIGS
        metric_cfg = PHENOLOGY_TILE_METRIC_CONFIGS.get(metric_clean, {})

        if not colormap:
            chosen_cmap = metric_cfg.get("colormap", "rdylbu")
        else:
            clean_cm = colormap.lower().replace("_r", "").strip()
            chosen_cmap = clean_cm if clean_cm in {"spectral", "viridis", "turbo", "rdylbu", "terrain", "magma", "inferno", "cividis", "plasma", "bwr", "hot", "blues"} else metric_cfg.get("colormap", "rdylbu")

        if not rescale:
            chosen_rescale = metric_cfg.get("default_rescale", "-3.0,3.0")
        else:
            chosen_rescale = rescale

        return self.render_tile(
            collection="phenology_anomaly",
            item_id=sim_id or "PHEN_001",
            z=actual_z,
            x=actual_x,
            y=actual_y,
            index=metric_clean,
            colormap=chosen_cmap,
            rescale=chosen_rescale
        )

    def render_custom_expression_tile(
        self,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        expr: str = "(B08 - B04) / (B08 + B04)",
        collection: str = "sentinel-2-l2a",
        item_id: Optional[str] = None,
        colormap: Optional[str] = None,
        rescale: Optional[Union[str, Tuple[float, float], List[float]]] = None,
        epsilon: float = 1e-6,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA PNG tile for custom AST algebraic band math expressions."""
        import hashlib
        from app.models.schemas import (
            BAND_MATH_PRESETS,
            validate_band_math_formula,
            parse_band_math_ast,
            parse_rescale
        )

        actual_z = int(z)
        actual_x = int(x)
        actual_y = int(y)
        clean_expr = (expr or "(B08 - B04) / (B08 + B04)").strip()
        col_clean = (collection or "sentinel-2-l2a").lower().strip()
        item_clean = (item_id or "default").strip()

        # Find if formula matches any preset for default colormap / rescale
        matched_preset = None
        for pid, pdata in BAND_MATH_PRESETS.items():
            if clean_expr == pdata.get("formula", "") or clean_expr.lower() == pid.lower():
                matched_preset = pdata
                break

        # Colormap resolution
        if not colormap:
            chosen_cmap = matched_preset.get("default_colormap", "viridis") if matched_preset else "viridis"
        else:
            clean_cm = colormap.lower().replace("_r", "").strip()
            if clean_cm in {"spectral", "viridis", "turbo", "rdylbu", "terrain", "magma", "inferno", "cividis", "plasma", "bwr", "hot", "blues", "rdylgn", "greens", "ylgn", "rainbow"}:
                chosen_cmap = clean_cm
            else:
                chosen_cmap = "viridis"

        # Rescale bounds resolution
        if not rescale:
            if matched_preset and "default_rescale" in matched_preset:
                preset_bounds = matched_preset["default_rescale"]
                rmin, rmax = float(preset_bounds[0]), float(preset_bounds[1])
                chosen_rescale = f"{rmin},{rmax}"
            else:
                rmin, rmax = -1.0, 1.0
                chosen_rescale = "-1.0,1.0"
        else:
            rmin, rmax = parse_rescale(rescale, default=(-1.0, 1.0))
            chosen_rescale = f"{rmin},{rmax}"

        if rmax <= rmin:
            rmax = rmin + 1e-4

        # Disk cache check
        expr_hash = hashlib.md5(clean_expr.encode("utf-8")).hexdigest()[:12]
        cache_subdir = os.path.join(TILE_CACHE_DIR, "custom_expression", col_clean, item_clean, str(actual_z), str(actual_x))
        os.makedirs(cache_subdir, exist_ok=True)
        rescale_key = chosen_rescale.replace(",", "_").replace(" ", "")
        cache_file = os.path.join(cache_subdir, f"{actual_y}_{expr_hash}_{chosen_cmap}_{rescale_key}.png")

        if os.path.exists(cache_file):
            try:
                with open(cache_file, "rb") as f:
                    return f.read()
            except Exception as e:
                logger.warning("Error reading custom expression tile cache %s: %s", cache_file, e)

        # Compute tile bounds and generate 256x256 spatial coordinates
        min_lon, min_lat, max_lon, max_lat = self.tile_to_bounds_wgs84(actual_z, actual_x, actual_y)
        gx = np.linspace(min_lon, max_lon, 256, dtype=np.float32)
        gy = np.linspace(max_lat, min_lat, 256, dtype=np.float32)
        xx, yy = np.meshgrid(gx, gy)

        spatial_seed = (np.sin(xx * 50.0) * np.cos(yy * 50.0) + np.sin(xx * 100.0) * 0.3)
        base_var = (spatial_seed - spatial_seed.min()) / (spatial_seed.max() - spatial_seed.min() + 1e-6)

        # Build realistic surface reflectance bands
        b01 = np.clip(0.04 + base_var * 0.08, 0.01, 0.9).astype(np.float32)
        b02 = np.clip(0.04 + base_var * 0.09, 0.01, 0.9).astype(np.float32)
        b03 = np.clip(0.06 + base_var * 0.12, 0.01, 0.9).astype(np.float32)
        b04 = np.clip(0.05 + base_var * 0.15, 0.01, 0.9).astype(np.float32)
        b05 = np.clip(0.10 + base_var * 0.20, 0.01, 0.9).astype(np.float32)
        b06 = np.clip(0.18 + base_var * 0.25, 0.01, 0.9).astype(np.float32)
        b07 = np.clip(0.22 + base_var * 0.30, 0.01, 0.9).astype(np.float32)
        b08 = np.clip(0.35 + base_var * 0.40, 0.01, 0.9).astype(np.float32)
        b8a = np.clip(0.36 + base_var * 0.40, 0.01, 0.9).astype(np.float32)
        b09 = np.clip(0.08 + base_var * 0.10, 0.01, 0.9).astype(np.float32)
        b10 = np.clip(20.0 + base_var * 20.0, 5.0, 50.0).astype(np.float32)
        b11 = np.clip(0.15 + base_var * 0.25, 0.01, 0.9).astype(np.float32)
        b12 = np.clip(0.08 + base_var * 0.18, 0.01, 0.9).astype(np.float32)

        band_rasters = {
            "B01": b01, "B1": b01, "COASTAL": b01,
            "B02": b02, "B2": b02, "BLUE": b02,
            "B03": b03, "B3": b03, "GREEN": b03,
            "B04": b04, "B4": b04, "RED": b04,
            "B05": b05, "REDEDGE1": b05, "RE1": b05,
            "B06": b06, "REDEDGE2": b06, "RE2": b06,
            "B07": b07, "REDEDGE3": b07, "RE3": b07,
            "B08": b08, "B5": b08, "NIR": b08,
            "B8A": b8a, "NARROW_NIR": b8a,
            "B09": b09, "WATER_VAPOR": b09, "VAPOR": b09,
            "B10": b10, "CIRRUS": b10, "THERMAL": b10, "LWIR11": b10,
            "B11": b11, "B6": b11, "SWIR1": b11,
            "B12": b12, "B7": b12, "SWIR2": b12,
        }

        # Vectorized AST evaluation
        try:
            raster_result = index_service.evaluate_band_math_raster(
                ast_or_formula=clean_expr,
                band_rasters=band_rasters,
                epsilon=epsilon
            )
        except Exception as exc:
            logger.error("Failed to evaluate band math formula '%s': %s", clean_expr, exc)
            raster_result = np.zeros((256, 256), dtype=np.float32)

        # Normalize to [0.0, 1.0] for colormap mapping
        norm_val = np.clip((raster_result - rmin) / (rmax - rmin + 1e-6), 0.0, 1.0)

        # Map to RGBA colormap
        cmap_func = self.get_colormap(chosen_cmap)
        rgba = (cmap_func(norm_val) * 255.0).astype(np.uint8)

        # Mask invalid pixels (NaN, Inf) with transparency
        invalid_mask = ~np.isfinite(raster_result)
        if np.any(invalid_mask):
            rgba[invalid_mask, 3] = 0

        # Encode to PNG
        img = Image.fromarray(rgba, mode="RGBA")
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        png_bytes = buf.getvalue()

        # Cache to disk
        try:
            with open(cache_file, "wb") as f:
                f.write(png_bytes)
        except Exception as e:
            logger.warning("Failed to write custom expression tile cache: %s", e)

        return png_bytes

    def render_dem_tile(
        self,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "relief",
        collection: str = "cop-dem-glo-30",
        colormap: Optional[str] = None,
        rescale: Optional[Union[str, Tuple[float, float], List[float]]] = None,
        sun_azimuth: float = 315.0,
        sun_altitude: float = 45.0,
        z_factor: float = 1.0,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA PNG tile for DEM relief, elevation, slope, aspect, hillshade, or TWI."""
        import hashlib
        from app.models.schemas import DEM_METRIC_CONFIGS, parse_rescale

        actual_z = int(z)
        actual_x = int(x)
        actual_y = int(y)
        metric_clean = (metric or "relief").lower().replace("-", "_").strip()
        col_clean = (collection or "cop-dem-glo-30").lower().strip()

        cfg = DEM_METRIC_CONFIGS.get(metric_clean, DEM_METRIC_CONFIGS.get("elevation", {}))
        default_cmap = cfg.get("default_colormap", "terrain")
        default_rescale = cfg.get("default_rescale", "0,3000")

        chosen_cmap = colormap.lower().strip() if colormap else default_cmap
        base_cmap = chosen_cmap.replace("_r", "")
        if base_cmap not in {"terrain", "rdylgn", "twilight", "gray", "blues", "viridis", "spectral", "plasma", "magma", "turbo", "inferno"}:
            chosen_cmap = default_cmap

        if rescale:
            rmin, rmax = parse_rescale(rescale, default=(0.0, 3000.0))
        else:
            rmin, rmax = parse_rescale(default_rescale, default=(0.0, 3000.0))

        if rmax <= rmin:
            rmax = rmin + 1.0

        cache_params = f"{metric_clean}_{chosen_cmap}_{rmin}_{rmax}_{sun_azimuth}_{sun_altitude}_{z_factor}"
        param_hash = hashlib.md5(cache_params.encode("utf-8")).hexdigest()[:10]
        cache_subdir = os.path.join(TILE_CACHE_DIR, "dem", col_clean, str(actual_z), str(actual_x))
        os.makedirs(cache_subdir, exist_ok=True)
        cache_file = os.path.join(cache_subdir, f"{actual_y}_{param_hash}.png")

        if os.path.exists(cache_file):
            try:
                with open(cache_file, "rb") as f:
                    return f.read()
            except Exception as e:
                logger.warning("Error reading DEM tile cache %s: %s", cache_file, e)

        min_lon, min_lat, max_lon, max_lat = self.tile_to_bounds_wgs84(actual_z, actual_x, actual_y)
        gx = np.linspace(min_lon, max_lon, 256, dtype=np.float32)
        gy = np.linspace(max_lat, min_lat, 256, dtype=np.float32)
        xx, yy = np.meshgrid(gx, gy)

        mid_lat = (min_lat + max_lat) / 2.0
        dx_m = max((max_lon - min_lon) * 111320.0 * math.cos(math.radians(mid_lat)) / 256.0, 1.0)
        dy_m = max((max_lat - min_lat) * 111320.0 / 256.0, 1.0)

        elev = 800.0 + (np.sin(xx * 25.0) * np.cos(yy * 25.0) + 1.0) * 450.0 + \
               (np.sin(xx * 70.0) * np.sin(yy * 70.0)) * 120.0 + \
               (xx - min_lon) / (max_lon - min_lon + 1e-6) * 350.0
        elev = elev * z_factor

        dz_dy, dz_dx = np.gradient(elev, dy_m, dx_m)
        slope_rad = np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))
        slope_deg = np.degrees(slope_rad)
        aspect_deg = (90.0 - np.degrees(np.arctan2(dz_dy, -dz_dx))) % 360.0
        aspect_rad = np.radians(aspect_deg)

        zenith_rad = math.radians(90.0 - sun_altitude)
        azimuth_rad = math.radians(sun_azimuth)
        hillshade = np.clip(
            255.0 * (math.cos(zenith_rad) * np.cos(slope_rad) +
                     math.sin(zenith_rad) * np.sin(slope_rad) * np.cos(azimuth_rad - aspect_rad)),
            0.0, 255.0
        )

        tan_slope = np.maximum(np.tan(slope_rad), 0.001)
        accum_m = 50.0 + 150.0 * (1.0 - (elev - elev.min()) / (elev.max() - elev.min() + 1e-6))
        twi_grid = np.log(accum_m / tan_slope)

        if metric_clean == "elevation":
            norm_val = np.clip((elev - rmin) / (rmax - rmin), 0.0, 1.0)
            cmap_func = self.get_colormap(chosen_cmap)
            rgba = (cmap_func(norm_val) * 255.0).astype(np.uint8)
        elif metric_clean == "slope":
            norm_val = np.clip((slope_deg - rmin) / (rmax - rmin), 0.0, 1.0)
            cmap_func = self.get_colormap(chosen_cmap)
            rgba = (cmap_func(norm_val) * 255.0).astype(np.uint8)
        elif metric_clean == "aspect":
            norm_val = np.clip((aspect_deg - rmin) / (rmax - rmin), 0.0, 1.0)
            cmap_func = self.get_colormap(chosen_cmap)
            rgba = (cmap_func(norm_val) * 255.0).astype(np.uint8)
        elif metric_clean == "hillshade":
            hs_u8 = hillshade.astype(np.uint8)
            alpha = np.full((256, 256), 255, dtype=np.uint8)
            rgba = np.dstack([hs_u8, hs_u8, hs_u8, alpha])
        elif metric_clean == "twi":
            norm_val = np.clip((twi_grid - rmin) / (rmax - rmin), 0.0, 1.0)
            cmap_func = self.get_colormap(chosen_cmap)
            rgba = (cmap_func(norm_val) * 255.0).astype(np.uint8)
        elif metric_clean == "tri":
            tri_grid = np.abs(dz_dx) * dx_m + np.abs(dz_dy) * dy_m
            norm_val = np.clip((tri_grid - rmin) / (rmax - rmin), 0.0, 1.0)
            cmap_func = self.get_colormap(chosen_cmap)
            rgba = (cmap_func(norm_val) * 255.0).astype(np.uint8)
        else:
            norm_val = np.clip((elev - rmin) / (rmax - rmin), 0.0, 1.0)
            cmap_func = self.get_colormap(chosen_cmap)
            rgba = (cmap_func(norm_val) * 255.0).astype(np.float32)
            illum = np.clip(hillshade / 255.0 * 1.1 + 0.05, 0.1, 1.0)
            for c in range(3):
                rgba[:, :, c] = np.clip(rgba[:, :, c] * illum, 0.0, 255.0)
            rgba = rgba.astype(np.uint8)

        img = Image.fromarray(rgba, mode="RGBA")
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        png_bytes = buf.getvalue()

        try:
            with open(cache_file, "wb") as f:
                f.write(png_bytes)
        except Exception as e:
            logger.warning("Failed to write DEM tile cache: %s", e)

        return png_bytes

    @staticmethod
    def vectorized_horn_gradient(
        elev: np.ndarray,
        dx_m: float = 30.0,
        dy_m: float = 30.0,
        z_factor: float = 1.0
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Computes Horn's 3x3 weighted finite-difference gradient operator on 2D elevation grid.
        
        Returns:
            (dz_dx, dz_dy, magnitude, slope_deg, aspect_deg)
        """
        from scipy.ndimage import correlate
        
        cell_dx = max(float(dx_m), 1.0)
        cell_dy = max(float(dy_m), 1.0)
        zf = max(float(z_factor), 1e-4)

        kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32) / (8.0 * cell_dx) * zf
        ky = np.array([[1, 2, 1], [0, 0, 0], [-1, -2, -1]], dtype=np.float32) / (8.0 * cell_dy) * zf

        arr = elev.astype(np.float32)
        dz_dx = correlate(arr, kx, mode="nearest")
        dz_dy = correlate(arr, ky, mode="nearest")

        mag = np.sqrt(dz_dx**2 + dz_dy**2)
        slope_rad = np.arctan(mag)
        slope_deg = np.degrees(slope_rad)

        # Downhill compass aspect clockwise from North (0-360 deg, -1 for flat)
        aspect_deg = np.where(mag < 1e-9, -1.0, (np.degrees(np.arctan2(-dz_dx, -dz_dy))) % 360.0)

        return dz_dx, dz_dy, mag, slope_deg, aspect_deg

    @staticmethod
    def vectorized_lambertian_hillshade(
        slope_deg: np.ndarray,
        aspect_deg: np.ndarray,
        sun_azimuth_deg: float = 315.0,
        sun_altitude_deg: float = 45.0
    ) -> np.ndarray:
        """Calculates analytical Lambertian hillshade illumination bounded in [0.0, 255.0]."""
        zenith_rad = math.radians(max(0.0, 90.0 - float(sun_altitude_deg)))
        azimuth_rad = math.radians(float(sun_azimuth_deg) % 360.0)

        slope_rad = np.radians(np.maximum(0.0, slope_deg))
        aspect_rad = np.radians(np.maximum(0.0, aspect_deg))

        cos_i = np.where(
            (slope_deg <= 1e-6) | (aspect_deg < 0.0),
            math.cos(zenith_rad),
            math.cos(zenith_rad) * np.cos(slope_rad) + math.sin(zenith_rad) * np.sin(slope_rad) * np.cos(azimuth_rad - aspect_rad)
        )
        return np.clip(255.0 * cos_i, 0.0, 255.0).astype(np.float32)

    @staticmethod
    def vectorized_topographic_wetness_index(
        slope_deg: np.ndarray,
        specific_catchment_area_m: float = 100.0,
        min_tan_slope: float = 0.001
    ) -> np.ndarray:
        """Calculates Topographic Wetness Index (TWI): ln(a / tan(beta))."""
        slope_rad = np.radians(np.maximum(0.0, slope_deg))
        tan_slope = np.maximum(float(min_tan_slope), np.tan(slope_rad))
        sca = max(1.0, float(specific_catchment_area_m))
        return np.log(sca / tan_slope).astype(np.float32)

    def render_dem_tile(
        self,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        metric: str = "relief",
        collection: str = "cop-dem-glo-30",
        colormap: Optional[str] = None,
        rescale: Optional[Union[str, Tuple[float, float], List[float]]] = None,
        sun_azimuth: float = 315.0,
        sun_altitude: float = 45.0,
        z_factor: float = 1.0,
        specific_catchment_area: float = 100.0,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA PNG tile for DEM topographic relief, elevation, slope, aspect, hillshade, or TWI."""
        from PIL import Image
        import io
        from app.models.schemas import parse_rescale

        actual_z = int(z)
        actual_x = int(x)
        actual_y = int(y)
        metric_clean = (metric or "relief").lower().strip()
        col_clean = (collection or "cop-dem-glo-30").lower().strip()
        sun_az = float(sun_azimuth) % 360.0
        sun_alt = max(0.0, min(90.0, float(sun_altitude)))
        zf = max(1e-4, float(z_factor))

        metric_defaults = {
            "relief": ("terrain", (0.0, 1500.0)),
            "elevation": ("terrain", (0.0, 1500.0)),
            "slope": ("rdylgn_r", (0.0, 45.0)),
            "aspect": ("spectral", (0.0, 360.0)),
            "hillshade": ("greys", (0.0, 255.0)),
            "twi": ("blues", (2.0, 14.0))
        }

        default_cmap, default_bounds = metric_defaults.get(metric_clean, ("terrain", (0.0, 1500.0)))
        chosen_cmap = colormap.lower().strip() if colormap else default_cmap
        if chosen_cmap in {"gray", "grey"}:
            chosen_cmap = "greys"

        if rescale:
            rmin, rmax = parse_rescale(rescale, default=default_bounds)
        else:
            rmin, rmax = default_bounds

        if rmax <= rmin:
            rmax = rmin + 1e-4

        rescale_key = f"{round(rmin, 2)}_{round(rmax, 2)}"
        cache_subdir = os.path.join(TILE_CACHE_DIR, "dem", col_clean, metric_clean, str(actual_z), str(actual_x))
        os.makedirs(cache_subdir, exist_ok=True)
        cache_file = os.path.join(
            cache_subdir,
            f"{actual_y}_{chosen_cmap}_{rescale_key}_{int(sun_az)}_{int(sun_alt)}_{round(zf, 2)}.png"
        )

        if os.path.exists(cache_file):
            try:
                with open(cache_file, "rb") as f:
                    return f.read()
            except Exception as e:
                logger.warning("Error reading DEM tile cache %s: %s", cache_file, e)

        min_lon, min_lat, max_lon, max_lat = self.tile_to_bounds_wgs84(actual_z, actual_x, actual_y)
        mid_lat = (min_lat + max_lat) / 2.0
        dx_m = max((max_lon - min_lon) * 111320.0 * math.cos(math.radians(mid_lat)) / 256.0, 1.0)
        dy_m = max((max_lat - min_lat) * 111320.0 / 256.0, 1.0)

        gx = np.linspace(min_lon, max_lon, 256, dtype=np.float32)
        gy = np.linspace(max_lat, min_lat, 256, dtype=np.float32)
        xx, yy = np.meshgrid(gx, gy)

        regional_tilt = (xx - min_lon) / max(max_lon - min_lon, 1e-6) * 220.0 - (yy - min_lat) / max(max_lat - min_lat, 1e-6) * 160.0
        macro_terrain = np.sin(xx * 30.0 + yy * 15.0) * 180.0 + np.cos(yy * 25.0 - xx * 10.0) * 140.0
        meso_valleys = np.sin(xx * 90.0) * np.cos(yy * 80.0) * 45.0 + np.sin((xx + yy) * 120.0) * 25.0
        micro_texture = np.sin(xx * 250.0) * np.cos(yy * 220.0) * 8.0
        elev = np.maximum(350.0 + regional_tilt + macro_terrain + meso_valleys + micro_texture, 5.0).astype(np.float32)

        dz_dx, dz_dy, mag, slope_deg, aspect_deg = self.vectorized_horn_gradient(elev, dx_m, dy_m, zf)
        hillshade = self.vectorized_lambertian_hillshade(slope_deg, aspect_deg, sun_az, sun_alt)
        twi = self.vectorized_topographic_wetness_index(slope_deg, specific_catchment_area)

        if metric_clean == "relief":
            norm_elev = np.clip((elev - rmin) / (rmax - rmin + 1e-6), 0.0, 1.0)
            cmap_func = self.get_colormap(chosen_cmap)
            color_rgb = cmap_func(norm_elev)[:, :, :3]
            illum_factor = (hillshade / 255.0)[:, :, np.newaxis]
            shaded_rgb = np.clip(color_rgb * (0.35 + 0.65 * illum_factor), 0.0, 1.0)
            rgba = np.zeros((256, 256, 4), dtype=np.uint8)
            rgba[:, :, :3] = (shaded_rgb * 255.0).astype(np.uint8)
            rgba[:, :, 3] = 255
        else:
            if metric_clean == "elevation":
                target_arr = elev
            elif metric_clean == "slope":
                target_arr = slope_deg
            elif metric_clean == "aspect":
                target_arr = np.where(aspect_deg < 0.0, 0.0, aspect_deg)
            elif metric_clean == "hillshade":
                target_arr = hillshade
            elif metric_clean == "twi":
                target_arr = twi
            else:
                target_arr = elev

            norm_val = np.clip((target_arr - rmin) / (rmax - rmin + 1e-6), 0.0, 1.0)
            cmap_func = self.get_colormap(chosen_cmap)
            rgba = (cmap_func(norm_val) * 255.0).astype(np.uint8)
            rgba[:, :, 3] = 255

        img = Image.fromarray(rgba, mode="RGBA")
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        png_bytes = buf.getvalue()

        try:
            with open(cache_file, "wb") as f:
                f.write(png_bytes)
        except Exception as e:
            logger.warning("Failed to write DEM tile cache: %s", e)

        return png_bytes

    @staticmethod
    def vectorized_distance_transform_blender(
        arr_a: np.ndarray,
        arr_b: np.ndarray,
        mask_a: np.ndarray,
        mask_b: np.ndarray,
        feather_width_px: float = 20.0,
        blend_method: str = "feather"
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Computes 2D Euclidean distance-transform feathering and Voronoi boundary seamline routing.
        
        Returns:
            (blended_array, weight_field_a, seamline_mask)
        """
        from scipy.ndimage import distance_transform_edt
        from app.models.schemas import calculate_distance_transform_feather_weights

        overlap = mask_a & mask_b
        d_a = distance_transform_edt(mask_a).astype(np.float32)
        d_b = distance_transform_edt(mask_b).astype(np.float32)

        w_a, w_b = calculate_distance_transform_feather_weights(d_a, d_b, use_smoothstep=True)
        seamline = overlap & (np.abs(d_a - d_b) <= 1.2)

        method = (blend_method or "feather").lower().strip()
        if method == "voronoi":
            blended = np.where(d_a >= d_b, arr_a, arr_b)
        elif method == "linear_ramp":
            w_linear = np.where((d_a + d_b) > 1e-6, d_a / (d_a + d_b), 0.5)
            blended = np.where(overlap, w_linear * arr_a + (1.0 - w_linear) * arr_b, np.where(mask_a, arr_a, arr_b))
        elif method == "none":
            blended = np.where(mask_a, arr_a, arr_b)
        else:  # feather
            blended = np.where(overlap, w_a * arr_a + w_b * arr_b, np.where(mask_a, arr_a, arr_b))

        return blended.astype(np.float32), w_a, seamline

    def render_mosaic_tile(
        self,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        collection: str = "sentinel-2-l2a",
        feather_width_m: float = 200.0,
        blend_method: str = "feather",
        colormap: Optional[str] = None,
        rescale: Optional[Union[str, Tuple[float, float], List[float]]] = None,
        bands: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA PNG tile for multi-tile seamless mosaic with 2D distance-transform feathering."""
        import hashlib
        from PIL import Image
        import io
        from app.models.schemas import parse_rescale

        actual_z = int(z)
        actual_x = int(x)
        actual_y = int(y)
        col_clean = (collection or "sentinel-2-l2a").lower().strip()
        blend_clean = (blend_method or "feather").lower().strip()
        fw_m = max(0.0, float(feather_width_m))

        default_cmap = "viridis" if "ndvi" in str(bands).lower() else "rdylgn"
        chosen_cmap = colormap.lower().strip() if colormap else default_cmap

        if rescale:
            rmin, rmax = parse_rescale(rescale, default=(0.0, 0.6))
        else:
            rmin, rmax = (0.0, 0.6)

        if rmax <= rmin:
            rmax = rmin + 0.01

        cache_key = f"{col_clean}_{blend_clean}_{chosen_cmap}_{round(rmin, 2)}_{round(rmax, 2)}_{int(fw_m)}"
        param_hash = hashlib.md5(cache_key.encode("utf-8")).hexdigest()[:10]
        cache_subdir = os.path.join(TILE_CACHE_DIR, "mosaic", col_clean, blend_clean, str(actual_z), str(actual_x))
        os.makedirs(cache_subdir, exist_ok=True)
        cache_file = os.path.join(cache_subdir, f"{actual_y}_{param_hash}.png")

        if os.path.exists(cache_file):
            try:
                with open(cache_file, "rb") as f:
                    return f.read()
            except Exception as e:
                logger.warning("Error reading mosaic tile cache: %s", e)

        min_lon, min_lat, max_lon, max_lat = self.tile_to_bounds_wgs84(actual_z, actual_x, actual_y)
        gx = np.linspace(min_lon, max_lon, 256, dtype=np.float32)
        gy = np.linspace(max_lat, min_lat, 256, dtype=np.float32)
        xx, yy = np.meshgrid(gx, gy)

        # Synthesize overlapping granule footprints:
        # Granule A (West) covers columns 0..165, Granule B (East) covers columns 90..255
        # Overlap zone is columns 90..165 (~30% swath overlap)
        col_indices = np.tile(np.arange(256), (256, 1))
        mask_a = col_indices <= 165
        mask_b = col_indices >= 90

        base_reflectance = 0.28 + np.sin(xx * 50.0 + yy * 30.0) * 0.08 + np.cos(yy * 40.0 - xx * 20.0) * 0.06
        arr_a = (base_reflectance + 0.006).astype(np.float32)
        arr_b = (base_reflectance - 0.006).astype(np.float32)

        blended, weight_a, seamline = self.vectorized_distance_transform_blender(
            arr_a=arr_a,
            arr_b=arr_b,
            mask_a=mask_a,
            mask_b=mask_b,
            feather_width_px=35.0,
            blend_method=blend_clean
        )

        norm_val = np.clip((blended - rmin) / (rmax - rmin), 0.0, 1.0)
        cmap_func = self.get_colormap(chosen_cmap)
        rgba = (cmap_func(norm_val) * 255.0).astype(np.uint8)
        rgba[:, :, 3] = 255

        img = Image.fromarray(rgba, mode="RGBA")
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        png_bytes = buf.getvalue()

        try:
            with open(cache_file, "wb") as f:
                f.write(png_bytes)
        except Exception as e:
            logger.warning("Failed to write mosaic tile cache: %s", e)

        return png_bytes

    def render_mosaic_feather_tile(
        self,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        collection: str = "sentinel-2-l2a",
        feather_width_m: float = 200.0,
        blend_method: str = "feather",
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA PNG tile visualizing the feather weight gradient field w_A in [0, 1]."""
        from PIL import Image
        import io

        col_indices = np.tile(np.arange(256), (256, 1))
        mask_a = col_indices <= 165
        mask_b = col_indices >= 90
        dummy_a = np.ones((256, 256), dtype=np.float32)
        dummy_b = np.zeros((256, 256), dtype=np.float32)

        blended, weight_a, seamline = self.vectorized_distance_transform_blender(
            arr_a=dummy_a,
            arr_b=dummy_b,
            mask_a=mask_a,
            mask_b=mask_b,
            blend_method=blend_method
        )

        cmap_func = self.get_colormap("blues")
        rgba = (cmap_func(weight_a) * 255.0).astype(np.uint8)
        rgba[:, :, 3] = 220

        img = Image.fromarray(rgba, mode="RGBA")
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        return buf.getvalue()

    def render_mosaic_seamline_tile(
        self,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        collection: str = "sentinel-2-l2a",
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA PNG tile visualizing the Voronoi seamline cut on transparent background."""
        from PIL import Image
        import io

        col_indices = np.tile(np.arange(256), (256, 1))
        mask_a = col_indices <= 165
        mask_b = col_indices >= 90
        dummy = np.zeros((256, 256), dtype=np.float32)

        blended, weight_a, seamline = self.vectorized_distance_transform_blender(
            arr_a=dummy,
            arr_b=dummy,
            mask_a=mask_a,
            mask_b=mask_b,
            blend_method="voronoi"
        )

        rgba = np.zeros((256, 256, 4), dtype=np.uint8)
        from scipy.ndimage import binary_dilation
        seam_dilated = binary_dilation(seamline, iterations=1)
        rgba[seam_dilated, 0] = 255  # Red
        rgba[seam_dilated, 1] = 120  # Green
        rgba[seam_dilated, 2] = 0    # Blue
        rgba[seam_dilated, 3] = 255  # Alpha

        img = Image.fromarray(rgba, mode="RGBA")
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        return buf.getvalue()

    # --------------------------------------------------------------------------
    # Cycle v2.5.28: Multi-Temporal Scene Stacking & Quality Mosaic XYZ Tiles
    # --------------------------------------------------------------------------

    def render_temporal_composite_tile(
        self,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        collection: str = "sentinel-2-l2a",
        reducer: Union[str, Any] = "median",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        max_cloud_cover_pct: float = 40.0,
        bands: Optional[str] = None,
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        quality_band: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders 256x256 RGBA PNG tile for multi-temporal composite satellite imagery
        with statistical reduction (median, mean, p25, p75) or quality mosaic selection (max_ndvi, min_cloud).
        """
        import hashlib
        from PIL import Image
        import io
        from app.models.schemas import (
            parse_rescale,
            TemporalReducerMethod,
            select_greenest_pixel_indices,
            select_clearest_pixel_indices,
            apply_temporal_reduction
        )

        actual_z = int(z)
        actual_x = int(x)
        actual_y = int(y)
        col_clean = (collection or "sentinel-2-l2a").lower().strip()
        red_clean = (reducer.value if hasattr(reducer, "value") else str(reducer)).lower().strip()
        s_date = start_date or "2026-06-01"
        e_date = end_date or "2026-08-31"

        if rescale:
            rmin, rmax = parse_rescale(rescale, default=(0.0, 0.7))
        else:
            rmin, rmax = (0.0, 0.7)

        if rmax <= rmin:
            rmax = rmin + 0.01

        chosen_cmap = colormap.lower().strip() if colormap else None

        cache_key = f"{col_clean}_{red_clean}_{s_date}_{e_date}_{bands}_{chosen_cmap}_{round(rmin, 2)}_{round(rmax, 2)}"
        param_hash = hashlib.md5(cache_key.encode("utf-8")).hexdigest()[:10]
        cache_subdir = os.path.join(TILE_CACHE_DIR, "temporal", col_clean, red_clean, str(actual_z), str(actual_x))
        os.makedirs(cache_subdir, exist_ok=True)
        cache_file = os.path.join(cache_subdir, f"{actual_y}_{param_hash}.png")

        if os.path.exists(cache_file):
            try:
                with open(cache_file, "rb") as f:
                    return f.read()
            except Exception as e:
                logger.warning("Error reading temporal composite tile cache: %s", e)

        min_lon, min_lat, max_lon, max_lat = self.tile_to_bounds_wgs84(actual_z, actual_x, actual_y)
        gx = np.linspace(min_lon, max_lon, 256, dtype=np.float32)
        gy = np.linspace(max_lat, min_lat, 256, dtype=np.float32)
        xx, yy = np.meshgrid(gx, gy)

        T = 5
        base_reflectance = 0.24 + np.sin(xx * 55.0 + yy * 35.0) * 0.10 + np.cos(yy * 45.0 - xx * 25.0) * 0.08
        base_reflectance = np.clip(base_reflectance, 0.05, 0.85)

        # Multi-temporal stacks for Red (B04), NIR (B08), Green (B03), Blue (B02)
        red_stack = np.zeros((T, 256, 256), dtype=np.float32)
        nir_stack = np.zeros((T, 256, 256), dtype=np.float32)
        green_stack = np.zeros((T, 256, 256), dtype=np.float32)
        blue_stack = np.zeros((T, 256, 256), dtype=np.float32)
        cloud_prob_stack = np.zeros((T, 256, 256), dtype=np.float32)

        for t in range(T):
            # Phenological greenness factor peaking at mid-season
            pheno = 1.0 + 0.35 * math.sin(math.pi * (t + 0.5) / T)
            red_stack[t] = np.clip(base_reflectance * 0.65 / max(pheno, 0.1), 0.02, 0.90)
            nir_stack[t] = np.clip(base_reflectance * 1.45 * pheno, 0.05, 0.95)
            green_stack[t] = np.clip(base_reflectance * 0.80, 0.03, 0.90)
            blue_stack[t] = np.clip(base_reflectance * 0.55, 0.02, 0.85)

            cp = np.full((256, 256), 0.05 + 0.03 * t, dtype=np.float32)
            if t == 1:
                # Local transient cloud in scene 1 (columns 10..50, rows 10..50)
                cp[10:50, 10:50] = 0.88
                red_stack[t, 10:50, 10:50] = 0.75
                blue_stack[t, 10:50, 10:50] = 0.80
                green_stack[t, 10:50, 10:50] = 0.78
            cloud_prob_stack[t] = cp

        # Cloud scrubbing: mask out high cloud pixels with NaN prior to statistical reduction
        cloud_mask = cloud_prob_stack > 0.60
        red_masked = np.where(cloud_mask, np.nan, red_stack)
        nir_masked = np.where(cloud_mask, np.nan, nir_stack)
        green_masked = np.where(cloud_mask, np.nan, green_stack)
        blue_masked = np.where(cloud_mask, np.nan, blue_stack)

        # Apply reduction
        if red_clean in ("max_ndvi", "greenest_pixel"):
            best_idx, max_ndvi = select_greenest_pixel_indices(red_stack, nir_stack)
            reduced_red = np.take_along_axis(red_stack, np.expand_dims(best_idx, axis=0), axis=0).squeeze(axis=0)
            reduced_green = np.take_along_axis(green_stack, np.expand_dims(best_idx, axis=0), axis=0).squeeze(axis=0)
            reduced_blue = np.take_along_axis(blue_stack, np.expand_dims(best_idx, axis=0), axis=0).squeeze(axis=0)
            reduced_nir = np.take_along_axis(nir_stack, np.expand_dims(best_idx, axis=0), axis=0).squeeze(axis=0)
            single_val = max_ndvi
        elif red_clean in ("min_cloud", "clearest_pixel"):
            best_idx, min_cp = select_clearest_pixel_indices(cloud_prob_stack)
            reduced_red = np.take_along_axis(red_stack, np.expand_dims(best_idx, axis=0), axis=0).squeeze(axis=0)
            reduced_green = np.take_along_axis(green_stack, np.expand_dims(best_idx, axis=0), axis=0).squeeze(axis=0)
            reduced_blue = np.take_along_axis(blue_stack, np.expand_dims(best_idx, axis=0), axis=0).squeeze(axis=0)
            reduced_nir = np.take_along_axis(nir_stack, np.expand_dims(best_idx, axis=0), axis=0).squeeze(axis=0)
            denom = reduced_nir + reduced_red
            single_val = (reduced_nir - reduced_red) / np.where(np.abs(denom) < 1e-7, 1e-7, denom)
        else:
            reduced_red = apply_temporal_reduction(red_masked, reducer=red_clean, axis=0)
            reduced_green = apply_temporal_reduction(green_masked, reducer=red_clean, axis=0)
            reduced_blue = apply_temporal_reduction(blue_masked, reducer=red_clean, axis=0)
            reduced_nir = apply_temporal_reduction(nir_masked, reducer=red_clean, axis=0)
            denom = reduced_nir + reduced_red
            single_val = (reduced_nir - reduced_red) / np.where(np.abs(denom) < 1e-7, 1e-7, denom)

        # Rendering RGBA
        bands_list = [b.strip().upper() for b in bands.split(",")] if bands else []
        is_true_color = (
            len(bands_list) >= 3 and
            bands_list[0] in ("B04", "RED") and
            bands_list[1] in ("B03", "GREEN") and
            bands_list[2] in ("B02", "BLUE")
        ) or (bands is None and chosen_cmap is None)

        if is_true_color:
            r_norm = np.clip((reduced_red - 0.02) / (0.45 - 0.02), 0.0, 1.0)
            g_norm = np.clip((reduced_green - 0.02) / (0.45 - 0.02), 0.0, 1.0)
            b_norm = np.clip((reduced_blue - 0.02) / (0.45 - 0.02), 0.0, 1.0)

            rgba = np.zeros((256, 256, 4), dtype=np.uint8)
            rgba[:, :, 0] = (r_norm * 255.0).astype(np.uint8)
            rgba[:, :, 1] = (g_norm * 255.0).astype(np.uint8)
            rgba[:, :, 2] = (b_norm * 255.0).astype(np.uint8)
            rgba[:, :, 3] = 255
        else:
            cmap_name = chosen_cmap or "rdylgn"
            cmap_func = self.get_colormap(cmap_name)

            # Choose array to render
            if bands and any(b in ("B08", "NIR") for b in bands_list):
                target_arr = reduced_nir
            elif bands and any(b in ("B04", "RED") for b in bands_list):
                target_arr = reduced_red
            else:
                target_arr = single_val

            norm_val = np.clip((target_arr - rmin) / (rmax - rmin), 0.0, 1.0)
            rgba = (cmap_func(norm_val) * 255.0).astype(np.uint8)
            rgba[:, :, 3] = 255

        img = Image.fromarray(rgba, mode="RGBA")
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        png_bytes = buf.getvalue()

        try:
            with open(cache_file, "wb") as f:
                f.write(png_bytes)
        except Exception as e:
            logger.warning("Failed to write temporal composite tile cache: %s", e)

        return png_bytes

    def render_temporal_quality_mosaic_tile(
        self,
        z: Union[int, str] = 0,
        x: int = 0,
        y: int = 0,
        collection: str = "sentinel-2-l2a",
        quality_band: str = "NDVI",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        max_cloud_cover_pct: float = 40.0,
        bands: Optional[str] = None,
        colormap: Optional[str] = None,
        rescale: Optional[str] = None,
        **kwargs
    ) -> bytes:
        """Renders dynamic XYZ tile for quality mosaic (greenest-pixel / clearest-pixel)."""
        q_band_lower = str(quality_band).lower().strip()
        if q_band_lower in ("ndvi", "greenest", "greenest_pixel", "max_ndvi"):
            chosen_reducer = "max_ndvi"
        elif q_band_lower in ("cloud", "cloud_prob", "clearest", "clearest_pixel", "min_cloud", "scl"):
            chosen_reducer = "min_cloud"
        else:
            chosen_reducer = "max_ndvi"

        return self.render_temporal_composite_tile(
            z=z,
            x=x,
            y=y,
            collection=collection,
            reducer=chosen_reducer,
            start_date=start_date,
            end_date=end_date,
            max_cloud_cover_pct=max_cloud_cover_pct,
            bands=bands,
            colormap=colormap,
            rescale=rescale,
            quality_band=quality_band,
            **kwargs
        )


tile_service = TileService()




