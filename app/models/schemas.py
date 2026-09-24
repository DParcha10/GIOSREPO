"""GIOS Data Models, Enums, and Pydantic Schemas.

Comprehensive shared contracts for GIOS v2.5:
- Dynamic XYZ COG Tile Server (Section 4 Contract 1)
- USGS FIREMON Two-Scene Differenced Burn Severity (Section 4 Contract 2)
- Interactive Pixel Probe & BOA Reflectance (Section 4 Contract 3)
- Real Polygon Zonal Statistics & Histograms (Section 4 Contract 4)
- Centimeter-Scale Drone Orthomosaic Ingestion
- Climatological MAD Seasonality & Theil-Sen Trend Analysis
- Automated Hazard Alerting & Webhooks
"""
import math
import re
from enum import Enum
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple, Union, Sequence
from pydantic import BaseModel, Field, model_validator

# ============================================================================
# ENUMS
# ============================================================================

class SatelliteCollection(str, Enum):
    """Supported satellite and aerial imagery collections."""
    SENTINEL_2 = "sentinel-2-l2a"
    LANDSAT_C2_L2 = "landsat-c2-l2"
    DRONE_ORTHO = "drone-ortho"
    DRONE = "drone"
    WILDFIRE = "wildfire"
    SENTINEL_1_RTC = "sentinel-1-rtc"
    COP_DEM = "cop-dem-glo-30"

class SpectralIndex(str, Enum):
    """Core biophysical and environmental hazard spectral indices."""
    NDVI = "ndvi"
    NDMI = "ndmi"
    NDCI = "ndci"
    MNDWI = "mndwi"
    LST = "lst"
    NBR = "nbr"
    EVI = "evi"
    SAVI = "savi"
    RGB = "rgb"
    DNBR = "dnbr"
    RDNBR = "rdnbr"

class TileColormap(str, Enum):
    """Supported palette colormaps for dynamic XYZ raster tile rendering."""
    SPECTRAL = "spectral"
    VIRIDIS = "viridis"
    TURBO = "turbo"
    RDYLBU = "rdylbu"
    TERRAIN = "terrain"
    MAGMA = "magma"
    INFERNO = "inferno"
    CIVIDIS = "cividis"

class HazardCategory(str, Enum):
    """Primary geotechnical and environmental hazard domains."""
    SEEPAGE = "seepage"
    INUNDATION = "inundation"
    HAB = "hab"
    DROUGHT = "drought"
    WILDFIRE = "wildfire"

class HazardSeverity(str, Enum):
    """Operational hazard severity tiers."""
    CRITICAL = "critical"
    WARNING = "warning"
    MODERATE = "moderate"
    LOW = "low"

class AlertSeverity(str, Enum):
    """Alert priority levels for automated watchdog notifications."""
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"

class DroneStatus(str, Enum):
    """Status lifecycle for drone orthomosaic ingestion, missions, and overview generation."""
    READY = "READY"
    PROCESSING = "PROCESSING"
    FAILED = "FAILED"
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    PENDING = "PENDING"

class ProactiveAlertType(str, Enum):
    """Proactive alert types streamed by backend over SSE (/api/v1/agent/stream-alerts)."""
    JARVIS = "jarvis_proactive_alert"
    SATELLITE = "satellite_anomaly_alert"

# ============================================================================
# SHARED METADATA MODELS & CATALOGS (BIOPHYSICAL INDICES & COLORMAPS)
# ============================================================================

class SpectralIndexMetadata(BaseModel):
    """Certified biophysical spectral index metadata matching frontend configuration."""
    key: SpectralIndex = Field(..., description="Spectral index identifier enum")
    name: str = Field(..., description="Short index code (e.g. NDMI, NDVI)")
    label: str = Field(..., description="Full descriptive name")
    domain: str = Field(..., description="Primary hazard or biophysical domain")
    formula: str = Field(..., description="Mathematical formulation")
    bands: List[str] = Field(default_factory=list, description="Primary Sentinel-2 / Landsat spectral bands utilized")
    default_colormap: Optional[TileColormap] = Field(default=None, description="Recommended default colormap palette")
    default_rescale: str = Field(default="-1.0,1.0", description="Recommended default min,max linear rescale range")
    unit: str = Field(default="dimensionless", description="Physical unit of measurement")
    description: str = Field(..., description="Physical definition and hazard monitoring utility")
    is_differenced: bool = Field(default=False, description="Whether index requires multi-temporal pre/post scene differencing")
    requires_thermal: bool = Field(default=False, description="Whether index requires thermal infrared band (e.g. Landsat Band 10)")
    requires_rededge: bool = Field(default=False, description="Whether index requires red-edge bands (e.g. Sentinel-2 Band 5)")
    auto_stretch: Tuple[float, float] = Field(default=(-1.0, 1.0), description="2%-98% cumulative contrast stretch recommended bounds")

    def parse_rescale(self) -> Tuple[float, float]:
        """Parses default rescale string into numeric (min, max) tuple."""
        try:
            parts = [float(p.strip()) for p in self.default_rescale.split(",")]
            return (parts[0], parts[1])
        except Exception:
            return (-1.0, 1.0)

class ColormapMetadata(BaseModel):
    """Raster colormap palette metadata matching dynamic XYZ tile server capabilities."""
    key: TileColormap = Field(..., description="Colormap palette identifier enum")
    label: str = Field(..., description="Descriptive colormap name with typical application domain")
    description: Optional[str] = Field(default=None, description="Detailed palette description")
    gradient_css: str = Field(default="", description="Tailwind CSS color gradient classes for frontend UI")
    color_stops: List[str] = Field(default_factory=list, description="Hex color stops defining the palette ramp")

SPECTRAL_INDICES_METADATA: Dict[str, SpectralIndexMetadata] = {
    "ndmi": SpectralIndexMetadata(
        key=SpectralIndex.NDMI,
        name="NDMI",
        label="Normalized Difference Moisture Index",
        domain="Seepage & Canopy Moisture",
        formula="(NIR - SWIR1) / (NIR + SWIR1)",
        bands=["B08", "B11"],
        default_colormap=TileColormap.SPECTRAL,
        default_rescale="-0.2,0.6",
        unit="dimensionless",
        description="Sensitive to water content in vegetation canopy and soil moisture along embankment toes.",
        auto_stretch=(0.05, 0.45)
    ),
    "ndvi": SpectralIndexMetadata(
        key=SpectralIndex.NDVI,
        name="NDVI",
        label="Normalized Difference Vegetation Index",
        domain="Vegetation Health & Biomass",
        formula="(NIR - Red) / (NIR + Red)",
        bands=["B08", "B04"],
        default_colormap=TileColormap.VIRIDIS,
        default_rescale="-0.1,0.85",
        unit="dimensionless",
        description="Evaluates live green plant biomass, chlorophyll density, and vegetative vigor.",
        auto_stretch=(0.15, 0.85)
    ),
    "mndwi": SpectralIndexMetadata(
        key=SpectralIndex.MNDWI,
        name="MNDWI",
        label="Modified Normalized Difference Water Index",
        domain="Surface Inundation & Flood Extent",
        formula="(Green - SWIR1) / (Green + SWIR1)",
        bands=["B03", "B11"],
        default_colormap=TileColormap.TURBO,
        default_rescale="-0.3,0.5",
        unit="dimensionless",
        description="Suppresses built-up urban features while amplifying open water bodies and flood inundation.",
        auto_stretch=(-0.2, 0.4)
    ),
    "ndci": SpectralIndexMetadata(
        key=SpectralIndex.NDCI,
        name="NDCI",
        label="Normalized Difference Chlorophyll Index",
        domain="Harmful Algae Blooms (HAB)",
        formula="(RedEdge1 - Red) / (RedEdge1 + Red)",
        bands=["B05", "B04"],
        default_colormap=TileColormap.VIRIDIS,
        default_rescale="-0.1,0.5",
        unit="dimensionless",
        description="Quantifies chlorophyll-a concentration and microcystin bloom risk in inland reservoirs.",
        requires_rededge=True,
        auto_stretch=(-0.05, 0.4)
    ),
    "nbr": SpectralIndexMetadata(
        key=SpectralIndex.NBR,
        name="NBR",
        label="Normalized Burn Ratio",
        domain="Fire Scars & Fuel Moisture",
        formula="(NIR - SWIR2) / (NIR + SWIR2)",
        bands=["B08", "B12"],
        default_colormap=TileColormap.TURBO,
        default_rescale="-0.4,0.8",
        unit="dimensionless",
        description="Highlights burned areas and high-heat signatures by contrasting NIR and SWIR2 reflectance.",
        auto_stretch=(-0.2, 0.6)
    ),
    "evi": SpectralIndexMetadata(
        key=SpectralIndex.EVI,
        name="EVI",
        label="Enhanced Vegetation Index",
        domain="Dense Canopy Vegetation",
        formula="2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)",
        bands=["B08", "B04", "B02"],
        default_colormap=TileColormap.VIRIDIS,
        default_rescale="-0.1,0.9",
        unit="dimensionless",
        description="Atmospherically corrected vegetation index that resists saturation in high-biomass regions.",
        auto_stretch=(0.1, 0.8)
    ),
    "savi": SpectralIndexMetadata(
        key=SpectralIndex.SAVI,
        name="SAVI",
        label="Soil-Adjusted Vegetation Index",
        domain="Arid & Sparse Vegetation",
        formula="(1 + L) * (NIR - Red) / (NIR + Red + L)",
        bands=["B08", "B04"],
        default_colormap=TileColormap.VIRIDIS,
        default_rescale="-0.1,0.8",
        unit="dimensionless",
        description="Incorporates a soil brightness correction factor (L=0.5) for arid soils and embankments.",
        auto_stretch=(0.1, 0.7)
    ),
    "lst": SpectralIndexMetadata(
        key=SpectralIndex.LST,
        name="LST",
        label="Land Surface Temperature",
        domain="Thermal & Geotechnical Hotspots",
        formula="Landsat B10 Radiance -> Celsius",
        bands=["B10"],
        default_colormap=TileColormap.MAGMA,
        default_rescale="10.0,45.0",
        unit="°C",
        description="Calibrated radiometric surface skin temperature in degrees Celsius from thermal infrared.",
        requires_thermal=True,
        auto_stretch=(12.0, 42.0)
    ),
    "rgb": SpectralIndexMetadata(
        key=SpectralIndex.RGB,
        name="True Color (RGB)",
        label="Natural Color Composite",
        domain="Visual Baseline Inspection",
        formula="Red (B04), Green (B03), Blue (B02)",
        bands=["B04", "B03", "B02"],
        default_colormap=None,
        default_rescale="0,255",
        unit="reflectance",
        description="Calibrated surface reflectance composite simulating natural human eye perception.",
        auto_stretch=(10.0, 240.0)
    ),
    "dnbr": SpectralIndexMetadata(
        key=SpectralIndex.DNBR,
        name="ΔNBR",
        label="Differenced Normalized Burn Ratio",
        domain="USGS FIREMON Burn Severity",
        formula="NBR_pre - NBR_post",
        bands=["B08", "B12"],
        default_colormap=TileColormap.TURBO,
        default_rescale="-0.2,0.8",
        unit="dimensionless",
        description="Differenced NBR assessing fire severity and biomass loss between pre- and post-fire scenes.",
        is_differenced=True,
        auto_stretch=(0.1, 0.66)
    ),
    "rdnbr": SpectralIndexMetadata(
        key=SpectralIndex.RDNBR,
        name="RdNBR",
        label="Relative Differenced Normalized Burn Ratio",
        domain="High-Slope Fire Severity",
        formula="dNBR / sqrt(|NBR_pre|)",
        bands=["B08", "B12"],
        default_colormap=TileColormap.TURBO,
        default_rescale="-0.5,1.5",
        unit="dimensionless",
        description="Relative differenced NBR normalized by pre-fire canopy density for steep terrain assessment.",
        is_differenced=True,
        auto_stretch=(0.15, 1.2)
    ),
}

COLORMAPS_METADATA: Dict[str, ColormapMetadata] = {
    "spectral": ColormapMetadata(
        key=TileColormap.SPECTRAL,
        label="Spectral (Moisture & Hazard Detection)",
        description="High-contrast diverging palette for soil moisture and seepage",
        gradient_css="from-blue-600 via-green-400 via-yellow-400 to-red-600",
        color_stops=["#2b83ba", "#abdda4", "#ffffbf", "#fdae61", "#d7191c"]
    ),
    "viridis": ColormapMetadata(
        key=TileColormap.VIRIDIS,
        label="Viridis (Vegetation & Biophysical Health)",
        description="Perceptually uniform sequential palette for vegetation vigor",
        gradient_css="from-purple-900 via-teal-500 to-yellow-300",
        color_stops=["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"]
    ),
    "turbo": ColormapMetadata(
        key=TileColormap.TURBO,
        label="Turbo (Thermal & High-Contrast Severity)",
        description="Rainbow alternative with improved perceptual linearity for wildfire and inundation",
        gradient_css="from-blue-700 via-cyan-400 via-green-400 via-yellow-400 to-red-600",
        color_stops=["#30123b", "#1ae4b6", "#a2fc3c", "#febb2d", "#7a0403"]
    ),
    "rdylbu": ColormapMetadata(
        key=TileColormap.RDYLBU,
        label="Red-Yellow-Blue (Diverging Water & Drought)",
        description="Diverging palette for drought stress and hydrological anomalies",
        gradient_css="from-red-600 via-yellow-300 to-blue-600",
        color_stops=["#d73027", "#f46d43", "#fdae61", "#fee090", "#e0f3f8", "#abd9e9", "#74add1", "#4575b4"]
    ),
    "terrain": ColormapMetadata(
        key=TileColormap.TERRAIN,
        label="Terrain (Topography & Physical Elevation)",
        description="Earth-tone palette suitable for digital elevation models and bathymetry",
        gradient_css="from-blue-700 via-emerald-600 via-yellow-600 to-stone-200",
        color_stops=["#333399", "#006600", "#669900", "#ffff66", "#cc6600", "#ffffff"]
    ),
    "magma": ColormapMetadata(
        key=TileColormap.MAGMA,
        label="Magma (Thermal Infrared & Radiation)",
        description="High-radiance dark-to-bright palette for Land Surface Temperature",
        gradient_css="from-black via-purple-800 via-pink-600 to-amber-300",
        color_stops=["#000004", "#51127c", "#b73779", "#fc8961", "#fec087"]
    ),
    "inferno": ColormapMetadata(
        key=TileColormap.INFERNO,
        label="Inferno (High Radiance / Active Fire)",
        description="Saturated thermal palette for high-intensity wildfire and hotspot tracking",
        gradient_css="from-black via-red-800 via-amber-500 to-yellow-200",
        color_stops=["#000004", "#57106e", "#bb3754", "#f98e09", "#fcffa4"]
    ),
    "cividis": ColormapMetadata(
        key=TileColormap.CIVIDIS,
        label="Cividis (Colorblind Accessible)",
        description="Color-vision-deficiency optimized palette for universal accessibility",
        gradient_css="from-blue-950 via-teal-700 to-yellow-400",
        color_stops=["#00204d", "#414d6b", "#7c7b78", "#c3af6d", "#ffea46"]
    ),
}

def get_spectral_index_metadata(index: Union[str, SpectralIndex]) -> Optional[SpectralIndexMetadata]:
    """Look up full metadata specification for a spectral index."""
    key = index.value if hasattr(index, "value") else str(index).lower().strip()
    return SPECTRAL_INDICES_METADATA.get(key)

def list_spectral_indices() -> List[SpectralIndexMetadata]:
    """Return all certified biophysical spectral index metadata specifications."""
    return list(SPECTRAL_INDICES_METADATA.values())

def get_colormap_metadata(colormap: Union[str, TileColormap]) -> Optional[ColormapMetadata]:
    """Look up full metadata specification for a tile colormap palette."""
    key = colormap.value if hasattr(colormap, "value") else str(colormap).lower().strip()
    return COLORMAPS_METADATA.get(key)

def list_colormaps() -> List[ColormapMetadata]:
    """Return all supported dynamic tile colormap metadata specifications."""
    return list(COLORMAPS_METADATA.values())

def get_auto_stretch(index: Union[str, SpectralIndex, None], default: Tuple[float, float] = (-0.2, 0.6)) -> Tuple[float, float]:
    """Retrieves standard 2%-98% cumulative auto stretch bounds for a spectral index."""
    if not index:
        return default
    meta = get_spectral_index_metadata(index)
    if meta and hasattr(meta, "auto_stretch") and meta.auto_stretch:
        return meta.auto_stretch
    return default

def get_colormap_gradient(colormap: Union[str, TileColormap, None], default: str = "from-blue-600 via-green-400 via-yellow-400 to-red-600") -> str:
    """Retrieves Tailwind CSS color gradient classes for a colormap palette."""
    if not colormap:
        return default
    meta = get_colormap_metadata(colormap)
    if meta and getattr(meta, "gradient_css", None):
        return meta.gradient_css
    return default

def get_colormap_color_stops(colormap: Union[str, TileColormap, None], default: Optional[List[str]] = None) -> List[str]:
    """Retrieves hex color stops defining the ramp for a colormap palette."""
    if default is None:
        default = ["#2b83ba", "#abdda4", "#ffffbf", "#fdae61", "#d7191c"]
    if not colormap:
        return default
    meta = get_colormap_metadata(colormap)
    if meta and getattr(meta, "color_stops", None):
        return meta.color_stops
    return default

def parse_rescale(rescale: Union[str, List[float], Tuple[float, float], None], default: Tuple[float, float] = (-1.0, 1.0)) -> Tuple[float, float]:
    """Parses a comma-separated rescale string (e.g. "-0.2,0.6") or sequence into a numeric (min, max) tuple.
    Parity implementation with parseRescale() in gios-react/src/config/constants.js.
    """
    if rescale is None:
        return default
    if isinstance(rescale, (list, tuple)) and len(rescale) == 2:
        try:
            p0, p1 = float(rescale[0]), float(rescale[1])
            if not (math.isnan(p0) or math.isnan(p1)):
                return (p0, p1)
        except Exception:
            return default
    if isinstance(rescale, str):
        try:
            parts = [float(p.strip()) for p in rescale.split(",")]
            if len(parts) == 2 and not (math.isnan(parts[0]) or math.isnan(parts[1])):
                return (parts[0], parts[1])
        except Exception:
            pass
    return default

def validate_spectral_index(index: Union[str, SpectralIndex, None], default: SpectralIndex = SpectralIndex.RGB) -> SpectralIndex:
    """Safely validates and normalizes a spectral index string or enum with fallback default."""
    if isinstance(index, SpectralIndex):
        return index
    if not index or not isinstance(index, str):
        return default
    try:
        return SpectralIndex(index.lower().strip())
    except ValueError:
        return default

def validate_colormap(colormap: Union[str, TileColormap, None], default: TileColormap = TileColormap.SPECTRAL) -> TileColormap:
    """Safely validates and normalizes a tile colormap string or enum with fallback default."""
    if isinstance(colormap, TileColormap):
        return colormap
    if not colormap or not isinstance(colormap, str):
        return default
    try:
        return TileColormap(colormap.lower().strip())
    except ValueError:
        return default

class SatelliteCollectionMetadata(BaseModel):
    """Metadata specification for supported satellite and aerial imagery collections."""
    id: SatelliteCollection = Field(..., description="Collection identifier enum")
    label: str = Field(..., description="Descriptive collection name")
    description: str = Field(..., description="Sensor characteristics and ground resolution")
    resolution_m: float = Field(..., description="Spatial resolution in meters")
    revisit_days: Optional[float] = Field(default=None, description="Typical temporal revisit period in days")

SATELLITE_COLLECTIONS_METADATA: Dict[str, SatelliteCollectionMetadata] = {
    "sentinel-2-l2a": SatelliteCollectionMetadata(
        id=SatelliteCollection.SENTINEL_2,
        label="Sentinel-2 MSI Level-2A (ESA / 10m-20m)",
        description="Multi-spectral surface reflectance with 5-day revisit cycle.",
        resolution_m=10.0,
        revisit_days=5.0
    ),
    "landsat-c2-l2": SatelliteCollectionMetadata(
        id=SatelliteCollection.LANDSAT_C2_L2,
        label="Landsat 8/9 Collection 2 Level-2 (USGS / 30m)",
        description="Multi-spectral and thermal infrared surface temperature.",
        resolution_m=30.0,
        revisit_days=16.0
    ),
    "drone-ortho": SatelliteCollectionMetadata(
        id=SatelliteCollection.DRONE_ORTHO,
        label="High-Resolution UAS Orthomosaic (<3cm GSD)",
        description="Centimeter-scale drone survey photogrammetry Cloud-Optimized GeoTIFF.",
        resolution_m=0.028,
        revisit_days=None
    ),
    "sentinel-1-rtc": SatelliteCollectionMetadata(
        id=SatelliteCollection.SENTINEL_1_RTC,
        label="Sentinel-1 SAR RTC (ESA / 10m C-Band Radar)",
        description="All-weather synthetic aperture radar for cloud-penetrating moisture and flood mapping.",
        resolution_m=10.0,
        revisit_days=6.0
    ),
    "cop-dem-glo-30": SatelliteCollectionMetadata(
        id=SatelliteCollection.COP_DEM,
        label="Copernicus DEM GLO-30 (ESA / 30m Global DEM)",
        description="Digital surface elevation model for slope, aspect, and hydrological drainage analysis.",
        resolution_m=30.0,
        revisit_days=None
    )
}

def get_satellite_collection_metadata(collection: Union[str, SatelliteCollection]) -> Optional[SatelliteCollectionMetadata]:
    """Look up metadata specification for an imagery collection."""
    key = collection.value if hasattr(collection, "value") else str(collection).lower().strip()
    return SATELLITE_COLLECTIONS_METADATA.get(key)

def list_satellite_collections() -> List[SatelliteCollectionMetadata]:
    """Return all supported satellite and drone collection metadata specifications."""
    return list(SATELLITE_COLLECTIONS_METADATA.values())

class MapViewportConfig(BaseModel):
    """Standardized map viewport configuration and zoom thresholds."""
    center: Tuple[float, float] = Field(default=(37.0582, -121.0744), description="Center coordinates [lat, lng]")
    default_zoom: int = Field(default=13, ge=0, le=24, description="Default map zoom level")
    macro_zoom: int = Field(default=13, ge=0, le=24, description="Macro regional satellite zoom level (10m)")
    micro_zoom: int = Field(default=19, ge=0, le=24, description="Micro drone inspection zoom level (2.8cm)")
    min_zoom: int = Field(default=2, ge=0, le=24, description="Minimum allowable zoom level")
    max_zoom: int = Field(default=24, ge=0, le=24, description="Maximum map zoom level")
    max_native_zoom: int = Field(default=22, ge=0, le=24, description="Maximum native raster tile zoom level")

DEFAULT_MAP_VIEWPORT_CONFIG = MapViewportConfig()

API_ROUTE_CONTRACTS: Dict[str, str] = {
    "health": "/health",
    "auth_token": "/api/v1/auth/token",
    "auth_register": "/api/v1/auth/register",
    "auth_me": "/api/v1/auth/me",
    "events": "/api/v1/events",
    "event_detail": "/api/v1/events/{event_id}",
    "analysis_indices": "/api/v1/analysis/indices",
    "analysis_pixel_probe": "/api/v1/analysis/pixel-probe",
    "analysis_zonal_stats": "/api/v1/analysis/zonal-stats",
    "tiles_dynamic": "/api/v1/tiles/{collection}/{item_id}/{z}/{x}/{y}.png",
    "wildfire_burn_severity": "/api/v1/wildfire/burn-severity",
    "wildfire_dnbr_tile": "/api/v1/tiles/wildfire/dnbr/{z}/{x}/{y}.png",
    "drone_missions": "/api/v1/drone/missions",
    "drone_schedule": "/api/v1/drone/missions/schedule",
    "drone_orthomosaics": "/api/v1/drone/orthomosaics",
    "drone_register": "/api/v1/drone/register",
    "drone_upload": "/api/v1/drone/upload",
    "drone_tile": "/api/v1/drone/{ortho_id}/tiles/{z}/{x}/{y}.png",
    "timeseries_trend": "/api/v1/timeseries/trend",
    "agent_chat": "/api/v1/agent/chat",
    "agent_stream_alerts": "/api/v1/agent/stream-alerts",
    "agent_trigger_mock_alert": "/api/v1/agent/trigger-mock-alert",
    "spatial_buffer": "/api/v1/spatial/buffer",
    "spatial_layers": "/api/v1/spatial/layers/{layer_id}",
    "reports_pdf": "/api/v1/reports/pdf",
    "data_search": "/api/v1/data/search",
    "integration_usgs": "/api/v1/integration/usgs/{site_id}",
    "satellite_gee": "/api/v1/satellite/gee",
    "satellite_sentinel": "/api/v1/satellite/sentinel",
    "iot_ingest": "/api/v1/iot/ingest",
    "iot_data": "/api/v1/iot/data",
    "analysis_terrain": "/api/v1/analysis/terrain",
    "analysis_sar": "/api/v1/analysis/sar",
    "tiles_terrain": "/api/v1/tiles/terrain/{metric}/{z}/{x}/{y}.png",
    "tiles_sar": "/api/v1/tiles/sar/{polarization}/{z}/{x}/{y}.png",
    "analysis_transect": "/api/v1/analysis/transect",
    "analysis_volumetric": "/api/v1/analysis/volumetric",
    "analysis_export": "/api/v1/analysis/export",
    "analysis_animation_sequence": "/api/v1/analysis/animation-sequence",
    "analysis_composite": "/api/v1/analysis/composite",
    "tiles_composite": "/api/v1/tiles/composite/{composite_id}/{z}/{x}/{y}.png",
    "annotations": "/api/v1/annotations",
    "annotation_detail": "/api/v1/annotations/{annotation_id}",
    "work_orders": "/api/v1/work-orders",
    "subscriptions": "/api/v1/subscriptions",
    "subscription_detail": "/api/v1/subscriptions/{subscription_id}",
    "analysis_vrt": "/api/v1/analysis/vrt",
    "tiles_vrt": "/api/v1/tiles/vrt/{vrt_id}/{z}/{x}/{y}.png",
}

def format_api_route(route_name: str, **kwargs) -> str:
    """Format a canonical API route contract path with dynamic parameter substitutions.
    
    Example:
        format_api_route("event_detail", event_id="EVT-01") -> "/api/v1/events/EVT-01"
        format_api_route("tiles_dynamic", collection="sentinel-2-l2a", item_id="S2A_123", z=12, x=100, y=200)
    """
    if route_name not in API_ROUTE_CONTRACTS:
        raise KeyError(f"Unknown API route contract '{route_name}'. Registered: {list(API_ROUTE_CONTRACTS.keys())}")
    template = API_ROUTE_CONTRACTS[route_name]
    return template.format(**kwargs)

class BoundingBox(BaseModel):
    """Standardized WGS84 geographic bounding box [min_lon, min_lat, max_lon, max_lat]."""
    min_lon: float = Field(..., description="Westernmost longitude in WGS84 degrees")
    min_lat: float = Field(..., description="Southernmost latitude in WGS84 degrees")
    max_lon: float = Field(..., description="Easternmost longitude in WGS84 degrees")
    max_lat: float = Field(..., description="Northernmost latitude in WGS84 degrees")

    def to_tuple(self) -> Tuple[float, float, float, float]:
        """Convert to standard (min_lon, min_lat, max_lon, max_lat) tuple."""
        return (self.min_lon, self.min_lat, self.max_lon, self.max_lat)

    def to_str(self) -> str:
        """Convert to comma-separated string 'min_lon,min_lat,max_lon,max_lat'."""
        return f"{self.min_lon},{self.min_lat},{self.max_lon},{self.max_lat}"

    def to_leaflet_bounds(self) -> List[List[float]]:
        """Convert to Leaflet LatLngBounds format [[south, west], [north, east]]."""
        return [[self.min_lat, self.min_lon], [self.max_lat, self.max_lon]]

    def contains_point(self, lat: float, lng: float) -> bool:
        """Check if a point (lat, lng) is within the bounding box."""
        return self.min_lat <= lat <= self.max_lat and self.min_lon <= lng <= self.max_lon

    def expand(self, buffer_pct: float = 0.1) -> "BoundingBox":
        """Expands bounding box by given fractional percentage (e.g. 0.1 for 10% expansion)."""
        width = self.max_lon - self.min_lon
        height = self.max_lat - self.min_lat
        d_lon = width * max(0.0, float(buffer_pct)) * 0.5
        d_lat = height * max(0.0, float(buffer_pct)) * 0.5
        return BoundingBox(
            min_lon=max(-180.0, round(self.min_lon - d_lon, 6)),
            min_lat=max(-90.0, round(self.min_lat - d_lat, 6)),
            max_lon=min(180.0, round(self.max_lon + d_lon, 6)),
            max_lat=min(90.0, round(self.max_lat + d_lat, 6))
        )

    def intersects(self, other: Any) -> bool:
        """Determines if this bounding box intersects with another bounding box."""
        if hasattr(other, "min_lon"):
            o_min_lon, o_min_lat, o_max_lon, o_max_lat = other.min_lon, other.min_lat, other.max_lon, other.max_lat
        elif isinstance(other, (list, tuple)) and len(other) >= 4:
            o_min_lon, o_min_lat, o_max_lon, o_max_lat = float(other[0]), float(other[1]), float(other[2]), float(other[3])
        else:
            return False
        return not (
            self.max_lon < o_min_lon or
            self.min_lon > o_max_lon or
            self.max_lat < o_min_lat or
            self.min_lat > o_max_lat
        )

    def intersection(self, other: Any) -> Optional["BoundingBox"]:
        """Computes the intersecting BoundingBox between two bounding boxes, or None if disjoint."""
        if not self.intersects(other):
            return None
        if hasattr(other, "min_lon"):
            o_min_lon, o_min_lat, o_max_lon, o_max_lat = other.min_lon, other.min_lat, other.max_lon, other.max_lat
        else:
            o_min_lon, o_min_lat, o_max_lon, o_max_lat = float(other[0]), float(other[1]), float(other[2]), float(other[3])
        return BoundingBox(
            min_lon=round(max(self.min_lon, o_min_lon), 6),
            min_lat=round(max(self.min_lat, o_min_lat), 6),
            max_lon=round(min(self.max_lon, o_max_lon), 6),
            max_lat=round(min(self.max_lat, o_max_lat), 6)
        )

    def contains_bbox(self, other: Any) -> bool:
        """Determines if this bounding box completely encloses another bounding box."""
        if hasattr(other, "min_lon"):
            o_min_lon, o_min_lat, o_max_lon, o_max_lat = other.min_lon, other.min_lat, other.max_lon, other.max_lat
        elif isinstance(other, (list, tuple)) and len(other) >= 4:
            o_min_lon, o_min_lat, o_max_lon, o_max_lat = float(other[0]), float(other[1]), float(other[2]), float(other[3])
        else:
            return False
        return (
            self.min_lon <= o_min_lon and
            self.max_lon >= o_max_lon and
            self.min_lat <= o_min_lat and
            self.max_lat >= o_max_lat
        )

    def overlap_ratio(self, other: Any) -> float:
        """Calculates Intersection over Union (IoU) overlap ratio in range [0.0, 1.0]."""
        inter = self.intersection(other)
        if inter is None:
            return 0.0
        inter_area = (inter.max_lon - inter.min_lon) * (inter.max_lat - inter.min_lat)
        self_area = (self.max_lon - self.min_lon) * (self.max_lat - self.min_lat)
        if hasattr(other, "min_lon"):
            other_area = (other.max_lon - other.min_lon) * (other.max_lat - other.min_lat)
        else:
            other_area = (float(other[2]) - float(other[0])) * (float(other[3]) - float(other[1]))
        union_area = self_area + other_area - inter_area
        return round(inter_area / union_area, 4) if union_area > 0 else 0.0

    @classmethod
    def from_points(cls, points: Sequence[Sequence[float]], coord_format: str = "lat_lon") -> "BoundingBox":
        """Calculates enclosing BoundingBox from a sequence of point coordinates.
        
        Args:
            points: List/tuple of coordinate pairs.
            coord_format: 'lat_lon' [lat, lon] (Leaflet default) or 'lon_lat' [lon, lat] (GeoJSON default).
        """
        if not points:
            return cls(min_lon=-121.2, min_lat=36.95, max_lon=-120.95, max_lat=37.15)
        lats: List[float] = []
        lons: List[float] = []
        for pt in points:
            if len(pt) >= 2:
                try:
                    if coord_format == "lon_lat":
                        lon_val, lat_val = float(pt[0]), float(pt[1])
                    else:
                        lat_val, lon_val = float(pt[0]), float(pt[1])
                    if math.isfinite(lat_val) and math.isfinite(lon_val):
                        lats.append(lat_val)
                        lons.append(lon_val)
                except (ValueError, TypeError):
                    continue
        if not lats or not lons:
            return cls(min_lon=-121.2, min_lat=36.95, max_lon=-120.95, max_lat=37.15)
        return cls(
            min_lon=round(min(lons), 6),
            min_lat=round(min(lats), 6),
            max_lon=round(max(lons), 6),
            max_lat=round(max(lats), 6)
        )

def parse_bbox(
    val: Union[str, Sequence[float], Dict[str, float], BoundingBox, None],
    default: Tuple[float, float, float, float] = (-121.2, 36.95, -120.95, 37.15)
) -> Tuple[float, float, float, float]:
    """Parses bounding box from string, tuple/list, dict, or BoundingBox model into (min_lon, min_lat, max_lon, max_lat).
    Parity implementation with parseBbox() in gios-react/src/config/constants.js.
    """
    if val is None:
        return default
    if isinstance(val, BoundingBox):
        return val.to_tuple()
    if isinstance(val, (list, tuple)) and len(val) == 4:
        try:
            coords = tuple(float(x) for x in val)
            if all(math.isfinite(c) for c in coords):
                return coords  # type: ignore
        except Exception:
            return default
    if isinstance(val, dict):
        try:
            min_lon = float(val.get("min_lon", val.get("west", val.get("min_x", 0))))
            min_lat = float(val.get("min_lat", val.get("south", val.get("min_y", 0))))
            max_lon = float(val.get("max_lon", val.get("east", val.get("max_x", 0))))
            max_lat = float(val.get("max_lat", val.get("north", val.get("max_y", 0))))
            if all(math.isfinite(c) for c in (min_lon, min_lat, max_lon, max_lat)):
                return (min_lon, min_lat, max_lon, max_lat)
        except Exception:
            return default
    if isinstance(val, str):
        try:
            parts = [float(p.strip()) for p in val.split(",")]
            if len(parts) == 4 and all(math.isfinite(p) for p in parts):
                return (parts[0], parts[1], parts[2], parts[3])
        except Exception:
            return default
    return default

class ApiErrorResponse(BaseModel):
    """Standardized API error response contract shared between backend and frontend."""
    detail: str = Field(..., description="Human-readable error explanation or message")
    error_code: Optional[str] = Field(default=None, description="Standard machine-readable error code")
    status_code: int = Field(default=400, description="HTTP status code")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), description="Error occurrence timestamp (ISO 8601)")

# ============================================================================
# CLIMATOLOGICAL ANOMALIES & SHARED WATCHDOG THRESHOLDS
# ============================================================================

CLIMATOLOGICAL_ANOMALY_LEVELS: List[Dict[str, Any]] = [
    {
        "level": "CRITICAL_ANOMALY",
        "min_z": 2.5,
        "severity": "critical",
        "label": "Critical Anomaly (|z| ≥ 2.5)",
        "badge_class": "bg-red-950/80 text-red-300 border-red-800",
        "badgeClass": "bg-red-950/80 text-red-300 border-red-800",
        "is_anomaly": True,
        "description": "Severe statistical anomaly exceeding 2.5 MAD from historical seasonal baseline."
    },
    {
        "level": "WARNING_ANOMALY",
        "min_z": 2.0,
        "severity": "warning",
        "label": "Severe Warning (2.0 ≤ |z| < 2.5)",
        "badge_class": "bg-amber-950/80 text-amber-300 border-amber-800",
        "badgeClass": "bg-amber-950/80 text-amber-300 border-amber-800",
        "is_anomaly": True,
        "description": "Substantial deviation from seasonal expectation requiring operational monitoring."
    },
    {
        "level": "MODERATE_ANOMALY",
        "min_z": 1.5,
        "severity": "moderate",
        "label": "Moderate Anomaly (1.5 ≤ |z| < 2.0)",
        "badge_class": "bg-yellow-950/80 text-yellow-300 border-yellow-800",
        "badgeClass": "bg-yellow-950/80 text-yellow-300 border-yellow-800",
        "is_anomaly": False,
        "description": "Elevated variation within acceptable seasonal boundary thresholds."
    },
    {
        "level": "NOMINAL",
        "min_z": 0.0,
        "severity": "nominal",
        "label": "Nominal / Baseline (|z| < 1.5)",
        "badge_class": "bg-emerald-950/80 text-emerald-300 border-emerald-800",
        "badgeClass": "bg-emerald-950/80 text-emerald-300 border-emerald-800",
        "is_anomaly": False,
        "description": "Observations conform to climatological median baseline."
    }
]

def classify_z_score(z: Any) -> Dict[str, Any]:
    """Classifies a climatological seasonal z-score against operational anomaly thresholds.
    Parity implementation with frontend classifyZScore() in constants.js.
    """
    if z is None:
        return CLIMATOLOGICAL_ANOMALY_LEVELS[-1]
    try:
        val = abs(float(z))
        if math.isnan(val) or not math.isfinite(val):
            return CLIMATOLOGICAL_ANOMALY_LEVELS[-1]
        for level in CLIMATOLOGICAL_ANOMALY_LEVELS:
            if val >= level["min_z"]:
                return level
    except (ValueError, TypeError):
        pass
    return CLIMATOLOGICAL_ANOMALY_LEVELS[-1]

# ============================================================================
# SLIPPY MAP TILE MATH & GEOMETRY CONVENTIONS
# ============================================================================

def lat_lon_to_tile(lat: float, lon: float, zoom: int) -> Tuple[int, int]:
    """Converts WGS84 geographic coordinates (lat, lon) to Web Mercator XYZ tile coordinates (x, y) at zoom.
    
    Standard slippy map tile projection:
    x = floor((lon + 180) / 360 * 2^zoom)
    lat_rad = lat * pi / 180
    y = floor((1 - asinh(tan(lat_rad)) / pi) / 2 * 2^zoom)
    """
    n = 2.0 ** zoom
    x = int(math.floor((lon + 180.0) / 360.0 * n))
    lat_rad = math.radians(lat)
    y = int(math.floor((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n))
    max_tile = int(n) - 1
    return (max(0, min(x, max_tile)), max(0, min(y, max_tile)))

def tile_to_bbox(z: int, x: int, y: int) -> BoundingBox:
    """Calculates the WGS84 geographic bounding box [min_lon, min_lat, max_lon, max_lat] for tile (z, x, y)."""
    n = 2.0 ** z
    min_lon = x / n * 360.0 - 180.0
    max_lon = (x + 1) / n * 360.0 - 180.0
    lat_rad_top = math.atan(math.sinh(math.pi * (1.0 - 2.0 * y / n)))
    lat_rad_bottom = math.atan(math.sinh(math.pi * (1.0 - 2.0 * (y + 1) / n)))
    max_lat = math.degrees(lat_rad_top)
    min_lat = math.degrees(lat_rad_bottom)
    return BoundingBox(
        min_lon=round(min_lon, 6),
        min_lat=round(min_lat, 6),
        max_lon=round(max_lon, 6),
        max_lat=round(max_lat, 6)
    )

def calculate_metric_gsd(
    altitude_m: float = 60.0,
    focal_length_mm: float = 8.8,
    sensor_width_mm: float = 13.2,
    image_width_px: int = 5472,
    flight_altitude_m: Optional[float] = None
) -> float:
    """Calculates Ground Sample Distance (GSD) in centimeters per pixel from flight parameters.
    
    Formula: GSD (cm/px) = (altitude_m * 100 * sensor_width_mm) / (focal_length_mm * image_width_px)
    """
    alt = flight_altitude_m if flight_altitude_m is not None else altitude_m
    if alt <= 0 or focal_length_mm <= 0 or image_width_px <= 0:
        return 0.0
    gsd_cm = (alt * 100.0 * sensor_width_mm) / (focal_length_mm * image_width_px)
    return round(gsd_cm, 3)

def normalize_geojson_polygon(geometry: Any) -> Optional[Dict[str, Any]]:
    """Validates and normalizes GeoJSON Polygon geometry, ensuring closed coordinate rings.
    
    Returns standard {'type': 'Polygon', 'coordinates': [[[lon, lat], ...]]} or None.
    """
    if not isinstance(geometry, dict):
        return None
    gtype = geometry.get("type")
    coords = geometry.get("coordinates")
    if gtype != "Polygon" or not isinstance(coords, list) or len(coords) == 0:
        return None
    ring = coords[0]
    if not isinstance(ring, list) or len(ring) < 3:
        return None
    # Validate each coordinate pair
    clean_ring = []
    for pt in ring:
        if isinstance(pt, (list, tuple)) and len(pt) >= 2:
            try:
                lon, lat = float(pt[0]), float(pt[1])
                if math.isfinite(lon) and math.isfinite(lat):
                    clean_ring.append([lon, lat])
            except (ValueError, TypeError):
                continue
    if len(clean_ring) < 3:
        return None
    # Ensure linear ring is closed (first point equals last point)
    if clean_ring[0] != clean_ring[-1]:
        clean_ring.append(list(clean_ring[0]))
    return {"type": "Polygon", "coordinates": [clean_ring]}

# ============================================================================
# GEODESIC & SPATIAL GEOMETRY CONVENTIONS
# ============================================================================

def calculate_haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float, unit: str = "km"
) -> float:
    """Calculates geodesic great-circle distance between two WGS84 points using the Haversine formula.
    
    Args:
        lat1: First point latitude in degrees
        lon1: First point longitude in degrees
        lat2: Second point latitude in degrees
        lon2: Second point longitude in degrees
        unit: 'km' (kilometers) or 'm' (meters)
    
    Returns:
        Geodesic distance in requested unit, rounded to 3 decimal places.
    """
    R_KM = 6371.0  # Mean radius of the Earth in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    distance_km = R_KM * c

    if unit.lower() == "m":
        return round(distance_km * 1000.0, 3)
    return round(distance_km, 3)

def calculate_initial_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the initial compass bearing (forward azimuth) from point 1 to point 2 in degrees [0, 360)."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    bearing_rad = math.atan2(y, x)
    bearing_deg = (math.degrees(bearing_rad) + 360.0) % 360.0
    return round(bearing_deg, 2)

def calculate_polygon_centroid(geometry: Any) -> Tuple[float, float]:
    """Calculates geographic center (latitude, longitude) of a GeoJSON polygon ring.
    
    Returns:
        (latitude, longitude) tuple in WGS84 degrees.
    """
    if not isinstance(geometry, dict):
        return (37.0582, -121.0744)
    coords = geometry.get("coordinates")
    if not coords or not isinstance(coords, list) or len(coords) == 0:
        return (37.0582, -121.0744)
    ring = coords[0]
    if not isinstance(ring, list) or len(ring) == 0:
        return (37.0582, -121.0744)
    pts = ring[:-1] if len(ring) > 3 and ring[0] == ring[-1] else ring
    lons: List[float] = []
    lats: List[float] = []
    for p in pts:
        if isinstance(p, (list, tuple)) and len(p) >= 2:
            try:
                lon, lat = float(p[0]), float(p[1])
                if math.isfinite(lon) and math.isfinite(lat):
                    lons.append(lon)
                    lats.append(lat)
            except (ValueError, TypeError):
                continue
    if not lons or not lats:
        return (37.0582, -121.0744)
    return (round(sum(lats) / len(lats), 6), round(sum(lons) / len(lons), 6))

# ============================================================================
# MULTI-SPECTRAL BAND SPECIFICATIONS CATALOG
# ============================================================================

class BandSpecMetadata(BaseModel):
    """Calibrated physical sensor band specification matching remote sensing standards."""
    key: str = Field(..., description="Canonical band identifier code (e.g. 'b02', 'b08', 'b10')")
    name: str = Field(..., description="Descriptive band name (e.g. 'Blue', 'NIR Broad', 'Thermal')")
    center_wavelength_nm: float = Field(..., description="Center spectral wavelength in nanometers")
    bandwidth_nm: float = Field(..., description="Full width at half maximum (FWHM) in nanometers")
    spatial_resolution_m: float = Field(..., description="Native ground sampling distance in meters")
    spectrum_domain: str = Field(..., description="Electromagnetic spectrum region (e.g. 'Visible', 'NIR', 'SWIR', 'TIR')")
    common_name: str = Field(..., description="STAC common band name (e.g. 'blue', 'nir', 'swir16')")

BAND_SPECS: Dict[str, BandSpecMetadata] = {
    "b02": BandSpecMetadata(key="b02", name="Blue", center_wavelength_nm=490.0, bandwidth_nm=65.0, spatial_resolution_m=10.0, spectrum_domain="Visible Blue", common_name="blue"),
    "b03": BandSpecMetadata(key="b03", name="Green", center_wavelength_nm=560.0, bandwidth_nm=35.0, spatial_resolution_m=10.0, spectrum_domain="Visible Green", common_name="green"),
    "b04": BandSpecMetadata(key="b04", name="Red", center_wavelength_nm=665.0, bandwidth_nm=30.0, spatial_resolution_m=10.0, spectrum_domain="Visible Red", common_name="red"),
    "b05": BandSpecMetadata(key="b05", name="RedEdge 1", center_wavelength_nm=705.0, bandwidth_nm=15.0, spatial_resolution_m=20.0, spectrum_domain="Vegetation Red-Edge", common_name="rededge"),
    "b06": BandSpecMetadata(key="b06", name="RedEdge 2", center_wavelength_nm=740.0, bandwidth_nm=15.0, spatial_resolution_m=20.0, spectrum_domain="Vegetation Red-Edge", common_name="rededge2"),
    "b07": BandSpecMetadata(key="b07", name="RedEdge 3", center_wavelength_nm=783.0, bandwidth_nm=20.0, spatial_resolution_m=20.0, spectrum_domain="Vegetation Red-Edge", common_name="rededge3"),
    "b08": BandSpecMetadata(key="b08", name="NIR Broad", center_wavelength_nm=842.0, bandwidth_nm=115.0, spatial_resolution_m=10.0, spectrum_domain="Near Infrared", common_name="nir"),
    "b8a": BandSpecMetadata(key="b8a", name="NIR Narrow", center_wavelength_nm=865.0, bandwidth_nm=20.0, spatial_resolution_m=20.0, spectrum_domain="Near Infrared Narrow", common_name="nir08"),
    "b11": BandSpecMetadata(key="b11", name="SWIR 1", center_wavelength_nm=1610.0, bandwidth_nm=90.0, spatial_resolution_m=20.0, spectrum_domain="Shortwave Infrared", common_name="swir16"),
    "b12": BandSpecMetadata(key="b12", name="SWIR 2", center_wavelength_nm=2190.0, bandwidth_nm=180.0, spatial_resolution_m=20.0, spectrum_domain="Shortwave Infrared", common_name="swir22"),
    "b10": BandSpecMetadata(key="b10", name="Thermal Infrared", center_wavelength_nm=10895.0, bandwidth_nm=590.0, spatial_resolution_m=30.0, spectrum_domain="Thermal Infrared", common_name="lwir11"),
}

def get_band_spec(band_key: str) -> Optional[BandSpecMetadata]:
    """Looks up band physical specification by key (case-insensitive)."""
    if not band_key:
        return None
    return BAND_SPECS.get(str(band_key).lower().strip())

def list_band_specs() -> List[BandSpecMetadata]:
    """Returns all registered physical sensor band specifications."""
    return list(BAND_SPECS.values())

def get_band_wavelength(band_key: str, default: float = 0.0) -> float:
    """Retrieves center wavelength in nanometers for a band code."""
    spec = get_band_spec(band_key)
    return spec.center_wavelength_nm if spec else default

# Mapping of common satellite band aliases to canonical BAND_SPECS keys
BAND_ALIAS_MAP: Dict[str, str] = {
    "blue": "b02",
    "b2": "b02",
    "b02": "b02",
    "green": "b03",
    "b3": "b03",
    "b03": "b03",
    "red": "b04",
    "b4": "b04",
    "b04": "b04",
    "rededge1": "b05",
    "rededge": "b05",
    "b5": "b05",
    "b05": "b05",
    "rededge2": "b06",
    "b6": "b06",
    "b06": "b06",
    "rededge3": "b07",
    "b7": "b07",
    "b07": "b07",
    "nir": "b08",
    "nir_broad": "b08",
    "b8": "b08",
    "b08": "b08",
    "nir_narrow": "b8a",
    "b8a": "b8a",
    "swir1": "b11",
    "swir16": "b11",
    "b11": "b11",
    "swir2": "b12",
    "swir22": "b12",
    "b12": "b12",
    "thermal": "b10",
    "tir": "b10",
    "lwir": "b10",
    "b10": "b10",
}

class SpectralBandValue(BaseModel):
    """Calibrated reflectance measurement for a specific physical spectral band."""
    band_key: str = Field(..., description="Canonical band identifier code (e.g. 'b02', 'b08')")
    name: str = Field(..., description="Human-readable band display name")
    wavelength_nm: float = Field(..., description="Center wavelength in nanometers")
    reflectance: float = Field(..., description="Calibrated surface reflectance [0.0, 1.0]")
    domain: str = Field(..., description="Electromagnetic spectrum domain")

def format_spectral_profile(surface_reflectance: Dict[str, float]) -> List[SpectralBandValue]:
    """Transforms raw band reflectance dict into a sorted list of physical SpectralBandValue records.
    Ordered in ascending wavelength order from Visible Blue (490nm) to Thermal IR (10895nm).
    """
    if not surface_reflectance or not isinstance(surface_reflectance, dict):
        return []
    records: List[SpectralBandValue] = []
    for raw_key, refl in surface_reflectance.items():
        if refl is None:
            continue
        try:
            val = float(refl)
            if math.isnan(val) or not math.isfinite(val):
                continue
        except (ValueError, TypeError):
            continue

        canonical = BAND_ALIAS_MAP.get(str(raw_key).lower().strip())
        spec = get_band_spec(canonical) if canonical else None
        if spec:
            records.append(SpectralBandValue(
                band_key=spec.key,
                name=spec.name,
                wavelength_nm=spec.center_wavelength_nm,
                reflectance=round(val, 4),
                domain=spec.spectrum_domain
            ))
        else:
            records.append(SpectralBandValue(
                band_key=str(raw_key),
                name=str(raw_key).capitalize(),
                wavelength_nm=500.0,
                reflectance=round(val, 4),
                domain="Custom"
            ))
    records.sort(key=lambda r: r.wavelength_nm)
    return records

# ============================================================================
# SPATIAL GIS VECTOR LAYER SPECIFICATIONS & REGISTRY
# ============================================================================

class SpatialLayerType(str, Enum):
    """Registered GIS vector layer categories."""
    CRITICAL_INFRASTRUCTURE = "critical_infrastructure"
    SENSOR_GRID = "sensor_grid"
    HAZARD_ZONES = "hazard_zones"
    DRONE_FLIGHT_BOUNDS = "drone_flight_bounds"

class SpatialLayerMetadata(BaseModel):
    """Metadata specification for dynamic GIS vector layers."""
    layer_id: SpatialLayerType = Field(..., description="Unique vector layer type enum")
    label: str = Field(..., description="Human-readable layer display title")
    description: str = Field(..., description="Detailed content narrative")
    icon: str = Field(default="MapPin", description="Lucide icon identifier for UI rendering")
    color: str = Field(default="#00ffaa", description="Hex styling color")
    default_visible: bool = Field(default=True, description="Whether layer is displayed on initial map load")

SPATIAL_LAYERS_METADATA: Dict[str, SpatialLayerMetadata] = {
    "critical_infrastructure": SpatialLayerMetadata(
        layer_id=SpatialLayerType.CRITICAL_INFRASTRUCTURE,
        label="Critical Infrastructure Assets",
        description="Hydraulic plants, dams, spillways, and intake towers.",
        icon="ShieldAlert",
        color="#00ffaa",
        default_visible=True
    ),
    "sensor_grid": SpatialLayerMetadata(
        layer_id=SpatialLayerType.SENSOR_GRID,
        label="In-Situ Sensor & Piezometer Grid",
        description="Embankment moisture probes, piezometer arrays, and USGS telemetry anchors.",
        icon="Activity",
        color="#38bdf8",
        default_visible=True
    ),
    "hazard_zones": SpatialLayerMetadata(
        layer_id=SpatialLayerType.HAZARD_ZONES,
        label="Active Hazard Boundaries",
        description="Seepage alert perimeters, wildfire perimeters, and flood inundation polygons.",
        icon="AlertTriangle",
        color="#f87171",
        default_visible=True
    ),
    "drone_flight_bounds": SpatialLayerMetadata(
        layer_id=SpatialLayerType.DRONE_FLIGHT_BOUNDS,
        label="UAS Survey Extents & Geofences",
        description="Autonomous drone inspection flight plans, waypoints, and orthomosaic footprints.",
        icon="Plane",
        color="#fbbf24",
        default_visible=False
    ),
}

def get_spatial_layer_metadata(layer_id: Union[str, SpatialLayerType]) -> Optional[SpatialLayerMetadata]:
    """Look up metadata specification for a vector layer type."""
    key = layer_id.value if hasattr(layer_id, "value") else str(layer_id).lower().strip()
    return SPATIAL_LAYERS_METADATA.get(key)

def list_spatial_layer_types() -> List[SpatialLayerMetadata]:
    """Returns all supported vector layer metadata specifications."""
    return list(SPATIAL_LAYERS_METADATA.values())

# ============================================================================
# MULTI-TEMPORAL SWIPE CURTAIN CONTRACTS & PRESETS
# ============================================================================

class SwipeComparisonMode(str, Enum):
    """Operational comparison modes for multi-temporal swipe curtain."""
    OPTICAL_VS_ANOMALY = "optical_vs_anomaly"
    PRE_VS_POST = "pre_vs_post"
    SATELLITE_VS_DRONE = "satellite_vs_drone"
    INDEX_VS_INDEX = "index_vs_index"

class SwipePaneLayer(BaseModel):
    """Configuration for a single pane within the multi-temporal swipe curtain."""
    title: str = Field(..., description="Display title for pane header")
    collection: SatelliteCollection = Field(default=SatelliteCollection.SENTINEL_2, description="Imagery collection")
    item_id: Optional[str] = Field(default=None, description="Scene or orthomosaic ID")
    date: str = Field(..., description="Acquisition date (YYYY-MM-DD)")
    sensor: str = Field(default="Sentinel-2 L2A", description="Sensor label")
    index: SpectralIndex = Field(default=SpectralIndex.RGB, description="Spectral index")
    colormap: Optional[TileColormap] = Field(default=None, description="Tile colormap")

class SwipeCurtainConfig(BaseModel):
    """Complete state and configuration contract for multi-temporal swipe curtain comparison."""
    mode: SwipeComparisonMode = Field(default=SwipeComparisonMode.OPTICAL_VS_ANOMALY, description="Comparison mode")
    slider_pos: float = Field(default=50.0, ge=2.0, le=98.0, description="Curtain split percentage [2.0, 98.0]")
    left_layer: SwipePaneLayer = Field(..., description="Baseline / pre-event layer")
    right_layer: SwipePaneLayer = Field(..., description="Anomaly / post-event layer")

SWIPE_PRESET_RATIOS: List[int] = [25, 50, 75]

def get_swipe_preset_ratios() -> List[int]:
    """Returns standard swipe curtain split percentage presets."""
    return list(SWIPE_PRESET_RATIOS)

# ============================================================================
# DETERMINISTIC TILE CACHE KEY GENERATION
# ============================================================================

def generate_tile_cache_key(
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
    """Generates a standardized deterministic cache key for XYZ tiles.
    Shared contract between backend tile caching and frontend tile prefetching.
    """
    col = str(collection).lower().strip()
    item = str(item_id).strip()
    idx = str(index or "rgb").lower().strip()
    resc = str(rescale).strip() if rescale else "default"
    cmap = str(colormap or "spectral").lower().strip()
    parts = [col, item, f"z{z}", f"x{x}", f"y{y}", idx, f"rescale_{resc}", cmap]
    if pre:
        parts.append(f"pre_{pre}")
    if post:
        parts.append(f"post_{post}")
    raw = "_".join(parts)
    return "".join(c if c.isalnum() or c in ("-", "_", ".") else "_" for c in raw)

# ============================================================================
# MULTI-SCALE SPATIAL LEVEL OF DETAIL (LOD) & ZOOM SCAFFOLDING
# ============================================================================

class SpatialLODTier(str, Enum):
    """Multi-scale spatial Level of Detail (LOD) tiers for hybrid satellite and drone fusion."""
    MACRO_REGIONAL = "macro_regional"        # Zoom 0-9: 60m+ resolution
    SATELLITE_SYNOPTIC = "satellite_synoptic" # Zoom 10-15: 10m-30m Sentinel-2 / Landsat
    SUBMETER_TRANSITION = "submeter_transition" # Zoom 16-18: 0.5m-2.0m aerial & orthomosaic overviews
    MICRO_INSPECTION = "micro_inspection"     # Zoom 19-24: 1cm-5cm ultra-high-resolution drone photogrammetry

ZOOM_LOD_TIERS: Dict[str, Dict[str, Any]] = {
    "macro_regional": {
        "tier": SpatialLODTier.MACRO_REGIONAL,
        "label": "Macro Regional Overview",
        "zoom_range": (0, 9),
        "typical_gsd": "60m - 500m",
        "description": "Basin-scale overview and wide-area hazard reconnaissance."
    },
    "satellite_synoptic": {
        "tier": SpatialLODTier.SATELLITE_SYNOPTIC,
        "label": "Satellite Synoptic Monitoring",
        "zoom_range": (10, 15),
        "typical_gsd": "10m - 30m",
        "description": "Multi-spectral surface reflectance and seasonal anomaly detection."
    },
    "submeter_transition": {
        "tier": SpatialLODTier.SUBMETER_TRANSITION,
        "label": "Sub-Meter Transition",
        "zoom_range": (16, 18),
        "typical_gsd": "0.5m - 2.0m",
        "description": "Aerial orthomosaic overviews and structural context."
    },
    "micro_inspection": {
        "tier": SpatialLODTier.MICRO_INSPECTION,
        "label": "Micro Centimeter Inspection",
        "zoom_range": (19, 24),
        "typical_gsd": "1cm - 5cm",
        "description": "Centimeter-level crack, toe seepage, and displacement photogrammetry."
    }
}

def get_spatial_lod_tier(zoom: int) -> SpatialLODTier:
    """Classifies a map zoom level into its operational Spatial LOD tier."""
    z = int(zoom)
    if z < 10:
        return SpatialLODTier.MACRO_REGIONAL
    elif z <= 15:
        return SpatialLODTier.SATELLITE_SYNOPTIC
    elif z <= 18:
        return SpatialLODTier.SUBMETER_TRANSITION
    return SpatialLODTier.MICRO_INSPECTION

def get_collection_recommended_zoom(collection: Union[str, SatelliteCollection]) -> Tuple[int, int]:
    """Retrieves recommended [min_zoom, max_zoom] viewing range for an imagery collection."""
    col = collection.value if hasattr(collection, "value") else str(collection).lower().strip()
    if "drone" in col:
        return (16, 24)
    elif "landsat" in col:
        return (7, 15)
    return (8, 16)

# ============================================================================
# CONTINUOUS COLORMAP VALUE-TO-COLOR INTERPOLATION
# ============================================================================

def get_colormap_color_at_value(
    colormap: Union[str, TileColormap, None],
    value: float,
    vmin: float = 0.0,
    vmax: float = 1.0
) -> str:
    """Maps a scalar value onto a colormap palette to produce an interpolated hex color string."""
    stops = get_colormap_color_stops(colormap)
    if not stops:
        return "#2b83ba"
    if len(stops) == 1:
        return stops[0]

    try:
        val = float(value)
        lo = float(vmin)
        hi = float(vmax)
        if math.isnan(val) or not math.isfinite(val):
            return stops[0]
        if hi <= lo:
            t = 0.5
        else:
            t = max(0.0, min(1.0, (val - lo) / (hi - lo)))
    except Exception:
        return stops[0]

    n_segments = len(stops) - 1
    pos = t * n_segments
    idx = int(pos)
    if idx >= n_segments:
        return stops[-1]
    frac = pos - idx

    def _hex_to_rgb(h: str) -> Tuple[int, int, int]:
        c = h.lstrip("#")
        return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16))

    try:
        r1, g1, b1 = _hex_to_rgb(stops[idx])
        r2, g2, b2 = _hex_to_rgb(stops[idx + 1])
        r = int(round(r1 + (r2 - r1) * frac))
        g = int(round(g1 + (g2 - g1) * frac))
        b = int(round(b1 + (b2 - b1) * frac))
        return f"#{r:02x}{g:02x}{b:02x}"
    except Exception:
        return stops[idx]

# ============================================================================
# BOUSTROPHEDON SURVEY WAYPOINT GENERATOR SCAFFOLDING
# ============================================================================

def generate_boustrophedon_waypoints(
    bbox: Union[BoundingBox, Tuple[float, float, float, float], Sequence[float], str],
    flight_altitude_m: float = 60.0,
    overlap_pct: float = 0.75,
    sensor_fov_deg: float = 70.0
) -> List[Tuple[float, float]]:
    """Calculates serpentine boustrophedon (lawnmower) flight survey waypoints across a bounding box."""
    b = parse_bbox(bbox)
    min_lon, min_lat, max_lon, max_lat = b
    
    fov_rad = math.radians(sensor_fov_deg)
    swath_width_m = 2.0 * flight_altitude_m * math.tan(fov_rad / 2.0)
    lane_spacing_m = swath_width_m * (1.0 - min(0.9, max(0.1, overlap_pct)))
    
    lat_step = lane_spacing_m / 111320.0
    if lat_step <= 0.00001:
        lat_step = 0.0001
        
    waypoints: List[Tuple[float, float]] = []
    current_lat = min_lat
    direction_east = True
    
    while current_lat <= max_lat + (lat_step * 0.5):
        lat_clamped = round(min(max_lat, current_lat), 6)
        if direction_east:
            waypoints.append((lat_clamped, round(min_lon, 6)))
            waypoints.append((lat_clamped, round(max_lon, 6)))
        else:
            waypoints.append((lat_clamped, round(max_lon, 6)))
            waypoints.append((lat_clamped, round(min_lon, 6)))
        direction_east = not direction_east
        current_lat += lat_step
        
    return waypoints

# ============================================================================
# CONTRACT 1: DYNAMIC XYZ TILE SERVER SCHEMAS
# ============================================================================

class DynamicTileParams(BaseModel):
    """Query and path parameters for dynamic XYZ Cloud-Optimized GeoTIFF raster tiling."""
    collection: str = Field(..., description="Satellite or drone collection (sentinel-2-l2a, landsat-c2-l2, drone-ortho, wildfire)")
    item_id: str = Field(..., description="STAC Item ID or registered Drone Orthomosaic ID")
    z: int = Field(..., ge=0, le=24, description="Web Mercator zoom level (0-24)")
    x: int = Field(..., ge=0, description="Web Mercator X tile coordinate")
    y: int = Field(..., ge=0, description="Web Mercator Y tile coordinate")
    index: Optional[SpectralIndex] = Field(default=SpectralIndex.RGB, description="Spectral index (e.g. ndvi, ndmi, rgb)")
    rescale: Optional[str] = Field(default=None, description="Rescale range min,max (e.g. -0.2,0.6 or 2,98)")
    colormap: Optional[TileColormap] = Field(default=TileColormap.SPECTRAL, description="Colormap palette name")
    pre: Optional[str] = Field(default=None, description="Pre-event baseline date for differenced burn severity tiles (YYYY-MM-DD)")
    post: Optional[str] = Field(default=None, description="Post-event assessment date for differenced burn severity tiles (YYYY-MM-DD)")

    def get_rescale_bounds(self) -> Tuple[float, float]:
        """Resolves active (min, max) rescale bounds from query params or index defaults."""
        if self.rescale:
            return parse_rescale(self.rescale, default=(-1.0, 1.0))
        meta = get_spectral_index_metadata(self.index)
        if meta:
            return meta.parse_rescale()
        return (0.0, 1.0) if self.index == SpectralIndex.RGB else (-1.0, 1.0)

    def get_colormap_name(self) -> str:
        """Returns the effective colormap palette string."""
        if self.colormap:
            return self.colormap.value if hasattr(self.colormap, "value") else str(self.colormap)
        meta = get_spectral_index_metadata(self.index)
        if meta and meta.default_colormap:
            return meta.default_colormap.value
        return "spectral"

    def to_query_params(self) -> Dict[str, str]:
        """Convert dynamic tile parameters into URL query parameters dictionary."""
        params: Dict[str, str] = {}
        if self.index:
            params["index"] = self.index.value if hasattr(self.index, "value") else str(self.index)
        if self.rescale:
            params["rescale"] = str(self.rescale)
        if self.colormap:
            params["colormap"] = self.colormap.value if hasattr(self.colormap, "value") else str(self.colormap)
        if self.pre:
            params["pre"] = str(self.pre)
        if self.post:
            params["post"] = str(self.post)
        return params

    def build_tile_url(self, base_prefix: str = "/api/v1") -> str:
        """Constructs the canonical tile path with query parameters."""
        path = f"{base_prefix}/tiles/{self.collection}/{self.item_id}/{self.z}/{self.x}/{self.y}.png"
        qp = self.to_query_params()
        if qp:
            from urllib.parse import urlencode
            return f"{path}?{urlencode(qp)}"
        return path

    @classmethod
    def build_drone_tile_url(cls, ortho_id: str, z: Union[int, str], x: Union[int, str], y: Union[int, str], base_prefix: str = "/api/v1") -> str:
        """Constructs the canonical tile path for a registered drone orthomosaic."""
        return f"{base_prefix}/drone/{ortho_id}/tiles/{z}/{x}/{y}.png"

    @classmethod
    def build_wildfire_tile_url(
        cls,
        z: Union[int, str],
        x: Union[int, str],
        y: Union[int, str],
        pre: Optional[str] = None,
        post: Optional[str] = None,
        colormap: Optional[str] = "turbo",
        rescale: Optional[str] = "-0.2,0.8",
        base_prefix: str = "/api/v1"
    ) -> str:
        """Constructs the canonical tile path for wildfire dnbr differencing with query parameters."""
        base = f"{base_prefix}/tiles/wildfire/dnbr/{z}/{x}/{y}.png"
        query_parts = []
        if pre:
            query_parts.append(f"pre={pre}")
        if post:
            query_parts.append(f"post={post}")
        if colormap:
            query_parts.append(f"colormap={colormap}")
        if rescale:
            from urllib.parse import quote
            query_parts.append(f"rescale={quote(str(rescale), safe='')}")
        if query_parts:
            return f"{base}?{'&'.join(query_parts)}"
        return base

# ============================================================================
# CONTRACT 2: USGS FIREMON PRE/POST DIFFERENCED BURN SEVERITY SCHEMAS
# ============================================================================

class BurnSeverityRequest(BaseModel):
    """Request payload for USGS FIREMON two-scene differenced burn severity (ΔNBR / RdNBR)."""
    aoi_id: Optional[str] = Field(default="AOI-DEFAULT", description="Area of Interest identifier")
    geometry: Optional[Dict[str, Any]] = Field(default=None, description="GeoJSON Polygon geometry")
    pre_event_date: Optional[str] = Field(default=None, description="Pre-fire baseline date (YYYY-MM-DD), auto-harvested if omitted")
    post_event_date: Optional[str] = Field(default=None, description="Post-fire assessment date (YYYY-MM-DD)")
    nbr_pre: Optional[Union[float, List[float]]] = Field(default=None, description="Pre-fire NBR value(s)")
    nbr_post: Optional[Union[float, List[float]]] = Field(default=None, description="Post-fire NBR value(s)")
    pre_nbr: Optional[Union[float, List[float]]] = Field(default=None, description="Pre-fire NBR value(s) alias")
    post_nbr: Optional[Union[float, List[float]]] = Field(default=None, description="Post-fire NBR value(s) alias")
    # Backward compatibility fields
    bbox: Optional[Tuple[float, float, float, float]] = Field(default=None, description="[min_lon, min_lat, max_lon, max_lat]")
    start_date: Optional[str] = Field(default=None, description="Legacy query start date")
    end_date: Optional[str] = Field(default=None, description="Legacy query end date")
    nbr_values: Optional[List[float]] = Field(default=None, description="Optional raw or simulated NBR array")

# Alias for API route compatibility
BurnSeverityApiRequest = BurnSeverityRequest

class BurnSeverityCategoryDetail(BaseModel):
    """Categorized burn severity breakdown matching USGS FIREMON specifications."""
    category: str = Field(..., description="Severity category name (e.g. High Severity, Unburned)")
    min_dnbr: float = Field(..., description="Minimum delta-NBR threshold")
    percentage: float = Field(..., description="Percentage of affected area")
    hectares: float = Field(..., description="Area in hectares")

FIREMON_THRESHOLDS: List[Dict[str, Any]] = [
    {
        "category": "High Severity",
        "min_dnbr": 0.660,
        "color": "#7f0000",
        "badge_class": "bg-red-950/80 text-red-300 border-red-800",
        "badgeClass": "bg-red-950/80 text-red-300 border-red-800",
        "description": "Deep canopy mortality, total ground char, high post-fire erosion susceptibility."
    },
    {
        "category": "Moderate-High Severity",
        "min_dnbr": 0.440,
        "color": "#d7301f",
        "badge_class": "bg-orange-950/80 text-orange-300 border-orange-800",
        "badgeClass": "bg-orange-950/80 text-orange-300 border-orange-800",
        "description": "Substantial canopy scorched, understory consumed."
    },
    {
        "category": "Moderate-Low Severity",
        "min_dnbr": 0.270,
        "color": "#fc8d59",
        "badge_class": "bg-amber-950/80 text-amber-300 border-amber-800",
        "badgeClass": "bg-amber-950/80 text-amber-300 border-amber-800",
        "description": "Mixed surface fire, light scorch, localized duff consumption."
    },
    {
        "category": "Low Severity",
        "min_dnbr": 0.100,
        "color": "#fdbb84",
        "badge_class": "bg-yellow-950/80 text-yellow-300 border-yellow-800",
        "badgeClass": "bg-yellow-950/80 text-yellow-300 border-yellow-800",
        "description": "Surface char on litter, minimal crown or overstory scorch."
    },
    {
        "category": "Unburned / Low Change",
        "min_dnbr": -0.100,
        "color": "#2ca25f",
        "badge_class": "bg-emerald-950/80 text-emerald-300 border-emerald-800",
        "badgeClass": "bg-emerald-950/80 text-emerald-300 border-emerald-800",
        "description": "No detectable fire damage or enhanced post-event vegetation regrowth."
    },
]

def classify_dnbr(dnbr: Any) -> Dict[str, Any]:
    """Classifies a scalar delta-NBR value according to USGS FIREMON standards.
    Parity implementation with frontend classifyDnbr() in constants.js.
    """
    if dnbr is None:
        return FIREMON_THRESHOLDS[-1]
    try:
        val = float(dnbr)
        if math.isnan(val) or not math.isfinite(val):
            return FIREMON_THRESHOLDS[-1]
        for level in FIREMON_THRESHOLDS:
            if val >= level["min_dnbr"]:
                return level
    except (ValueError, TypeError):
        pass
    return FIREMON_THRESHOLDS[-1]


class BurnSeverityCategory(BaseModel):
    """Legacy severity category model for backwards compatibility."""
    category: str
    percentage: float
    pixel_count: Optional[int] = None
    min_dnbr: Optional[float] = None
    hectares: Optional[float] = None

class BurnSeverityResponse(BaseModel):
    """Response payload for two-scene differenced burn severity analysis."""
    aoi_id: Optional[str] = Field(default="AOI-DEFAULT", description="Area of interest identifier")
    pre_event_date: Optional[str] = Field(default=None, description="Pre-event baseline scene date")
    post_event_date: Optional[str] = Field(default="", description="Post-event scene date")
    mean_dnbr: Optional[float] = Field(default=0.0, description="Mean delta-NBR across AOI")
    mean_rdnbr: Optional[float] = Field(default=0.0, description="Mean relative differenced NBR")
    burned_area_hectares: Optional[float] = Field(default=0.0, description="Total burned hectares (>= Low Severity)")
    categories: Union[List[BurnSeverityCategoryDetail], List[BurnSeverityCategory]] = Field(default_factory=list, description="USGS FIREMON severity breakdown")
    tile_url_template: Optional[str] = Field(default="", description="XYZ tile endpoint template for visual overlay")
    mean_nbr: Optional[float] = Field(default=None, description="Legacy mean single-date NBR")
    timestamp: Optional[str] = Field(default=None, description="Processing timestamp (ISO 8601)")

    @staticmethod
    def build_tile_url_template(pre_date: Optional[str] = None, post_date: Optional[str] = None, base_prefix: str = "/api/v1") -> str:
        """Constructs the canonical XYZ tile URL template for wildfire differencing."""
        base = f"{base_prefix}/tiles/wildfire/dnbr/{{z}}/{{x}}/{{y}}.png"
        query = []
        if pre_date:
            query.append(f"pre={pre_date}")
        if post_date:
            query.append(f"post={post_date}")
        if query:
            return f"{base}?{'&'.join(query)}"
        return base

# ============================================================================
# CONTRACT 3: INTERACTIVE PIXEL PROBE SCHEMAS
# ============================================================================

class PixelCoordinates(BaseModel):
    """Geographic point coordinates for coordinate probing."""
    latitude: float = Field(..., description="Latitude coordinate in WGS84")
    longitude: float = Field(..., description="Longitude coordinate in WGS84")

    @property
    def lat(self) -> float:
        """Alias for latitude matching frontend coordinate properties."""
        return self.latitude

    @property
    def lng(self) -> float:
        """Alias for longitude matching frontend coordinate properties."""
        return self.longitude

class ClimatologicalContext(BaseModel):
    """Climatological baseline context and anomaly diagnostics for a point coordinate."""
    historical_august_median_ndmi: Optional[float] = Field(default=None, description="Historical month median baseline")
    baseline_median: Optional[float] = Field(default=None, description="Monthly climatological baseline median")
    baseline_mad: Optional[float] = Field(default=None, description="Monthly Median Absolute Deviation")
    seasonal_z_score: Optional[float] = Field(default=None, description="Seasonally normalized z-score")
    anomaly_flag: Optional[str] = Field(default=None, description="Anomaly classification tag (e.g. HIGH_MOISTURE_ANOMALY)")

class PixelProbeRequest(BaseModel):
    """Query parameters for interactive pixel probe."""
    lat: float = Field(..., description="Latitude coordinate")
    lng: float = Field(..., description="Longitude coordinate")
    collection: str = Field(default="sentinel-2-l2a", description="Satellite collection")
    item_id: str = Field(..., description="STAC item ID")

class PixelProbeResponse(BaseModel):
    """Calibrated surface reflectance, biophysical indices, and baseline context at a single pixel."""
    coordinates: Union[PixelCoordinates, Dict[str, float]] = Field(..., description="Point coordinates {'latitude': float, 'longitude': float}")
    acquisition_date: str = Field(..., description="Acquisition datetime (ISO 8601)")
    surface_reflectance: Dict[str, float] = Field(..., description="Calibrated BOA surface reflectance per band")
    indices: Dict[str, float] = Field(..., description="Computed spectral index values at queried pixel")
    climatological_context: Union[ClimatologicalContext, Dict[str, Any]] = Field(..., description="Baseline median, seasonal z-score, anomaly flag")
    spectral_profile: Optional[List[SpectralBandValue]] = Field(default=None, description="Physical wavelength-ordered spectral reflectance profile")

# ============================================================================
# CONTRACT 4: REAL POLYGON ZONAL STATISTICS SCHEMAS
# ============================================================================

class ZonalStatsRealRequest(BaseModel):
    """Request payload for polygon zonal statistics clipped over a STAC data cube."""
    geometry: Dict[str, Any] = Field(..., description="GeoJSON Polygon geometry")
    collection: str = Field(default="sentinel-2-l2a", description="Satellite collection identifier")
    item_id: str = Field(..., description="STAC Item ID")
    index: SpectralIndex = Field(default=SpectralIndex.NDMI, description="Target spectral index")

class ZonalDistributionStats(BaseModel):
    """Parametric and non-parametric distribution statistics over a masked polygon."""
    mean: float = Field(..., description="Arithmetic mean")
    median: float = Field(..., description="50th percentile / median")
    std_dev: float = Field(..., description="Standard deviation")
    min: float = Field(..., description="Minimum value")
    max: float = Field(..., description="Maximum value")
    percentile_10: float = Field(..., description="10th percentile")
    percentile_90: float = Field(..., description="90th percentile")

class ZonalHistogram(BaseModel):
    """Binned frequency distribution across the polygon."""
    bin_edges: List[float] = Field(..., description="Histogram bin division boundaries")
    counts: List[int] = Field(..., description="Pixel frequency counts per bin")

class ZonalStatsRealResponse(BaseModel):
    """Response payload returning ground truth surface area and statistical distributions."""
    index: str = Field(..., description="Spectral index name")
    area_hectares: float = Field(..., description="True calculated surface area in hectares")
    valid_pixels: int = Field(..., description="Number of valid, unmasked pixels")
    cloud_covered_pixels: int = Field(..., description="Number of cloud/shadow masked pixels")
    statistics: ZonalDistributionStats = Field(..., description="Parametric and non-parametric distribution statistics")
    histogram: ZonalHistogram = Field(..., description="Binned frequency distribution")

    @property
    def total_pixels(self) -> int:
        """Total pixels within the analyzed polygon geometry (valid + masked)."""
        return self.valid_pixels + self.cloud_covered_pixels

    @property
    def cloud_fraction(self) -> float:
        """Fraction of polygon area obscured by clouds or invalid mask."""
        tot = self.total_pixels
        return (self.cloud_covered_pixels / tot) if tot > 0 else 0.0

# ============================================================================
# DRONE ORTHOMOSAIC INGESTION & MISSION SCHEMAS
# ============================================================================

class DroneUploadMetadata(BaseModel):
    """Mission parameters submitted during drone GeoTIFF upload."""
    mission_name: str = Field(..., description="Human-readable mission identifier")
    sensor_payload: Optional[str] = Field(default="RGB / Multispectral", description="Camera or sensor model")
    altitude_m: Optional[float] = Field(default=60.0, description="Flight altitude Above Ground Level in meters")
    estimated_gsd_cm: Optional[float] = Field(default=3.0, description="Expected Ground Sample Distance in cm")

class DroneOrthomosaicMetadata(BaseModel):
    """Validated metadata for a registered centimeter-scale drone Cloud-Optimized GeoTIFF."""
    ortho_id: str = Field(..., description="Unique drone orthomosaic registration ID")
    filename: str = Field(..., description="Stored GeoTIFF/COG filename")
    crs: str = Field(default="EPSG:3857", description="Coordinate Reference System")
    bounds: Tuple[float, float, float, float] = Field(..., description="Bounding box [min_lon, min_lat, max_lon, max_lat]")
    metric_gsd_cm: float = Field(..., description="Calculated metric ground sample distance in centimeters")
    bands: int = Field(default=3, description="Number of raster bands")
    is_cog: bool = Field(default=True, description="Whether raster is Cloud-Optimized GeoTIFF with internal pyramids")
    status: str = Field(default="READY", description="Processing status (READY, PROCESSING, FAILED)")
    upload_timestamp: Optional[str] = Field(default=None, description="Upload and ingestion timestamp (ISO 8601)")

    def contains_point(self, lat: float, lng: float) -> bool:
        """Determines if a geographic point (lat, lng) falls within the orthomosaic bounds."""
        min_lon, min_lat, max_lon, max_lat = self.bounds
        return min_lat <= lat <= max_lat and min_lon <= lng <= max_lon

    @property
    def gsd_display(self) -> str:
        """Formatted ground sample distance string (e.g. '2.85 cm/px')."""
        return f"{self.metric_gsd_cm:.2f} cm/px"

    @property
    def bbox(self) -> BoundingBox:
        """BoundingBox representation of orthomosaic geographic extents."""
        return BoundingBox(
            min_lon=self.bounds[0],
            min_lat=self.bounds[1],
            max_lon=self.bounds[2],
            max_lat=self.bounds[3]
        )

class DroneMissionResponse(BaseModel):
    """Active or registered drone mission response."""
    mission_id: Optional[str] = None
    ortho_id: Optional[str] = None
    filename: Optional[str] = None
    crs: Optional[str] = "EPSG:4326"
    bounds: Optional[Tuple[float, float, float, float]] = None
    gsd_cm: Optional[float] = None
    metric_gsd_cm: Optional[float] = None
    bbox: Optional[Tuple[float, float, float, float]] = None
    bands: int = 3
    is_cog: bool = True
    status: str = "READY"

class DroneRegisterRequest(BaseModel):
    """Payload for registering a pre-stitched drone GeoTIFF orthomosaic."""
    file_path: str = Field(..., description="Local file path or cloud URI to drone GeoTIFF")
    mission_name: Optional[str] = Field(default="UAV Orthomosaic Survey", description="Human-readable mission name")
    sensor_payload: Optional[str] = Field(default="RGB + Multispectral", description="Camera or sensor payload description")
    ortho_id: Optional[str] = Field(default=None, description="Optional unique orthomosaic identifier")

class DroneScheduleMissionRequest(BaseModel):
    """Payload for scheduling an autonomous or manual UAS flight mission."""
    event_id: Optional[str] = Field(default="MANUAL", description="Associated hazard event ID")
    lat: float = Field(default=0.0, description="Target survey latitude coordinate")
    lng: float = Field(default=0.0, description="Target survey longitude coordinate")
    radius_km: float = Field(default=1.0, ge=0.1, le=50.0, description="Flight survey radius in kilometers")

class DroneUploadResponse(BaseModel):
    """Response payload for uploaded drone orthomosaic ingestion."""
    status: str = Field(default="success", description="Upload ingestion status")
    orthomosaic: Union[DroneOrthomosaicMetadata, Dict[str, Any]] = Field(..., description="Registered orthomosaic metadata")

class DroneMissionScheduleResponse(BaseModel):
    """Response payload for scheduling an autonomous or manual drone mission."""
    status: str = Field(default="success", description="Scheduling status")
    mission: Union[DroneMissionResponse, Dict[str, Any]] = Field(..., description="Scheduled mission details")

class DroneMissionsListResponse(BaseModel):
    """List of active drone fleet missions."""
    missions: List[Union[DroneMissionResponse, Dict[str, Any]]] = Field(default_factory=list, description="Fleet missions")

class DroneOrthomosaicsListResponse(BaseModel):
    """List of registered drone Cloud-Optimized GeoTIFFs."""
    orthomosaics: List[Union[DroneOrthomosaicMetadata, Dict[str, Any]]] = Field(default_factory=list, description="Registered drone orthomosaics")

# ============================================================================
# TIME-SERIES & CLIMATOLOGY SCHEMAS
# ============================================================================

class TrendRequest(BaseModel):
    """Request payload for multi-temporal index trend analysis."""
    bbox: Tuple[float, float, float, float] = Field(..., description="[min_lon, min_lat, max_lon, max_lat]")
    index: SpectralIndex = Field(default=SpectralIndex.NDMI, description="Target spectral index")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="End date (YYYY-MM-DD)")
    frequency: str = Field(default="monthly", description="Aggregation frequency: monthly | biweekly")

class TimeSeriesPoint(BaseModel):
    """Single temporal observation with climatological baseline envelope."""
    date: str = Field(..., description="Observation date (YYYY-MM-DD)")
    value: float = Field(..., description="Observed spectral index value")
    baseline_median: float = Field(..., description="Monthly climatological median")
    baseline_mad: Optional[float] = Field(default=None, description="Median Absolute Deviation for that calendar month")
    percentile_10: Optional[float] = Field(default=None, description="10th percentile climatological lower bound")
    percentile_90: Optional[float] = Field(default=None, description="90th percentile climatological upper bound")
    z_score: float = Field(..., description="Seasonally normalized z-score (MAD based)")
    is_anomaly: bool = Field(..., description="Whether |z| >= threshold (default 2.0 or 2.5)")

class TimeSeriesResponse(BaseModel):
    """Multi-temporal time series response with trend statistics."""
    index: str = Field(..., description="Spectral index analyzed")
    slope_per_month: float = Field(..., description="Estimated slope per month")
    theil_sen_slope: Optional[float] = Field(default=None, description="Robust non-parametric Theil-Sen median slope")
    mann_kendall_p_value: Optional[float] = Field(default=None, description="Mann-Kendall trend significance p-value")
    anomaly_count: int = Field(..., description="Number of anomalous points detected")
    data_points: List[TimeSeriesPoint] = Field(..., description="Temporal data points with seasonal context")

# ============================================================================
# AUTOMATED ALERTING & WATCHDOG SCHEMAS
# ============================================================================

class AlertRecord(BaseModel):
    """Persistent hazard alert record stored in database."""
    id: str = Field(..., description="Unique alert identifier")
    site_id: str = Field(..., description="Monitored site / asset ID")
    site_name: str = Field(..., description="Human-readable asset name")
    metric: str = Field(..., description="Trigger metric (e.g. NDMI, discharge_cfs)")
    severity: AlertSeverity = Field(default=AlertSeverity.WARNING, description="Alert severity level")
    z_score: float = Field(..., description="Detected anomaly z-score")
    message: str = Field(..., description="Alert briefing or emergency notification message")
    timestamp: str = Field(..., description="Trigger timestamp (ISO 8601)")
    status: str = Field(default="active", description="Alert lifecycle state (active, acknowledged, resolved)")

class AlertWebhookPayload(BaseModel):
    """Outgoing webhook notification payload dispatched upon anomaly detection."""
    event_type: str = Field(default="hazard_anomaly_alert", description="Webhook event category")
    alert: AlertRecord = Field(..., description="Alert details payload")
    sent_at: str = Field(..., description="Dispatch timestamp (ISO 8601)")

class ProactiveJarvisAlert(BaseModel):
    """Proactive emergency briefing dispatched by JARVIS LLM over SSE stream."""
    type: Union[ProactiveAlertType, str] = Field(default=ProactiveAlertType.JARVIS, description="Proactive alert event type")
    message: str = Field(..., description="Emergency briefing narrative")
    site: str = Field(..., description="Monitored site or infrastructure asset name")
    data: Dict[str, Any] = Field(default_factory=dict, description="Associated sensor or telemetry payload")

class SatelliteAnomalyAlert(BaseModel):
    """Proactive satellite radiometric anomaly alert dispatched over SSE stream."""
    type: Union[ProactiveAlertType, str] = Field(default=ProactiveAlertType.SATELLITE, description="Satellite alert event type")
    data: AlertRecord = Field(..., description="Detected radiometric anomaly record")

# ============================================================================
# SEARCH, EVENT & HEALTH SCHEMAS
# ============================================================================

class SearchParams(BaseModel):
    """Spatial and temporal parameters for STAC catalog scene queries."""
    bbox: Tuple[float, float, float, float] = Field(..., description="[min_lon, min_lat, max_lon, max_lat]")
    start_date: str = Field(..., description="YYYY-MM-DD")
    end_date: str = Field(..., description="YYYY-MM-DD")
    collection: SatelliteCollection = SatelliteCollection.SENTINEL_2
    max_cloud_cover: float = Field(default=30.0, ge=0.0, le=100.0)

class IndexRequest(BaseModel):
    """Request payload for regional multi-spectral index calculation."""
    bbox: Tuple[float, float, float, float]
    start_date: str
    end_date: str
    index: SpectralIndex = SpectralIndex.NDMI
    collection: SatelliteCollection = SatelliteCollection.SENTINEL_2
    resolution: Optional[float] = Field(default=10.0, description="Spatial resolution in meters")

class ZonalStatsRequest(BaseModel):
    """Legacy zonal stats request."""
    geojson_geometry: Dict[str, Any]
    index: SpectralIndex
    start_date: str
    end_date: str
    collection: SatelliteCollection = SatelliteCollection.SENTINEL_2

class HazardEventDetail(BaseModel):
    """Detailed record of a registered geotechnical or environmental hazard event."""
    id: str = Field(..., description="Unique event identifier")
    title: str = Field(..., description="Human-readable event title")
    subtitle: str = Field(..., description="Event location or description subtitle")
    category: HazardCategory = Field(..., description="Hazard domain classification")
    severity: HazardSeverity = Field(..., description="Operational severity tier")
    severity_label: str = Field(..., description="Display label for severity (e.g. HIGH HAZARD, CRITICAL)")
    lat: float = Field(..., description="Latitude coordinate")
    lng: float = Field(..., description="Longitude coordinate")
    zoom: int = Field(default=13, description="Focus map zoom level")
    metric: SpectralIndex = Field(..., description="Primary biophysical indicator metric")
    sensor: SatelliteCollection = Field(default=SatelliteCollection.SENTINEL_2, description="Primary EO sensor")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="End date (YYYY-MM-DD)")
    usgs_station: Optional[str] = Field(default=None, description="Associated USGS streamgage station")
    station_name: Optional[str] = Field(default=None, description="USGS streamgage station name")
    impact_area: str = Field(..., description="Estimated impact area")
    peak_zscore: str = Field(..., description="Peak anomaly z-score")
    hazard_type: str = Field(..., description="Specific hazard classification")
    drone_status: str = Field(default="READY", description="Associated UAS mission status")
    description: str = Field(..., description="Detailed situation narrative")

# Alias for HazardEventDetail to match frontend JSDoc contracts
HazardEvent = HazardEventDetail

class EventCreateRequest(BaseModel):
    """Hazard event creation payload."""
    id: str = Field(..., description="Unique event identifier")
    title: str = Field(..., description="Event title")
    subtitle: str = Field(..., description="Event subtitle")
    category: HazardCategory = Field(..., description="Hazard domain")
    severity: HazardSeverity = Field(..., description="Severity tier")
    severity_label: str = Field(..., description="Severity label")
    lat: float = Field(..., description="Latitude coordinate")
    lng: float = Field(..., description="Longitude coordinate")
    zoom: int = Field(default=13, description="Focus zoom level")
    metric: SpectralIndex = Field(..., description="Biophysical metric")
    sensor: SatelliteCollection = Field(default=SatelliteCollection.SENTINEL_2, description="Sensor")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="End date (YYYY-MM-DD)")
    usgs_station: Optional[str] = Field(default=None, description="Associated USGS streamgage station")
    station_name: Optional[str] = Field(default=None, description="Station name")
    impact_area: str = Field(..., description="Impact area")
    peak_zscore: str = Field(..., description="Peak anomaly z-score")
    hazard_type: str = Field(..., description="Hazard type")
    drone_status: str = Field(default="READY", description="Drone status")
    description: str = Field(..., description="Description")

class HealthResponse(BaseModel):
    """Platform health and service availability response."""
    status: str = Field(default="healthy", description="System health status")
    platform: Optional[str] = Field(default="GIOS", description="Platform identifier name")
    version: str = Field(default="2.5.0", description="Semantic platform release version")
    active_services: Optional[List[str]] = Field(default_factory=list, description="Active microservices")
    active_modules: Optional[List[str]] = Field(default_factory=list, description="Active backend processing modules")

class SceneMetadata(BaseModel):
    """STAC catalog scene metadata record."""
    id: str
    datetime: str
    cloud_cover: float
    collection: str
    thumbnail_url: Optional[str] = None

class SearchResponse(BaseModel):
    """List of matching STAC scenes."""
    count: int
    scenes: List[SceneMetadata]

class IndexResultSummary(BaseModel):
    """Summary statistics for regional spectral index evaluation."""
    index: str
    mean: float
    median: float
    min: float
    max: float
    std: float
    valid_pixels: int
    timestamp: str

class EventResponse(BaseModel):
    """List of registered hazard events."""
    events: List[Union[HazardEventDetail, Dict[str, Any]]] = Field(default_factory=list, description="List of hazard event records")
    total_count: int = Field(..., description="Total event count")

class SensorIngestResponse(BaseModel):
    """Response payload for IoT sensor telemetry ingestion."""
    status: str = Field(default="success", description="Ingestion status")
    message: str = Field(default="Data ingested", description="Ingestion status message")

class MockAlertResponse(BaseModel):
    """Response payload for administrative mock alert trigger."""
    status: str = Field(default="success", description="Execution status")
    message: str = Field(default="Mock alert triggered", description="Status message description")

# ============================================================================
# IN-SITU, SATELLITE INTEGRATION & SPATIAL BUFFER SCHEMAS
# ============================================================================

class USGSStationData(BaseModel):
    """In-situ streamflow and water quality telemetry from USGS Water Services."""
    site_id: str = Field(..., description="USGS Station Identifier")
    discharge_cfs: Optional[float] = Field(default=None, description="Streamflow discharge in cubic feet per second")
    gage_height_ft: Optional[float] = Field(default=None, description="Gage height in feet")
    water_temp_c: Optional[float] = Field(default=None, description="Water temperature in degrees Celsius")

class GEEImageRequest(BaseModel):
    """Query parameters for Google Earth Engine image metadata/preview."""
    collection: str = Field(..., description="Earth Engine collection ID (e.g. COPERNICUS/S2_SR)")
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="End date (YYYY-MM-DD)")
    bbox: Tuple[float, float, float, float] = Field(..., description="Bounding box [west, south, east, north]")

class GEEImageResponse(BaseModel):
    """Metadata and preview URL response for Google Earth Engine image."""
    provider: str = Field(default="GEE", description="Provider identifier")
    collection: str = Field(..., description="Earth Engine collection ID")
    time_range: Dict[str, str] = Field(..., description="Start and end dates")
    bbox: Tuple[float, float, float, float] = Field(..., description="Bounding box [west, south, east, north]")
    preview_url: str = Field(..., description="Earth Engine preview URL")

class SentinelHubTileRequest(BaseModel):
    """Query parameters for Sentinel Hub OGC/WMTS tile generation."""
    collection: str = Field(..., description="Sentinel Hub collection ID")
    date: str = Field(..., description="Acquisition date (YYYY-MM-DD)")
    bbox: Tuple[float, float, float, float] = Field(..., description="Bounding box [west, south, east, north]")
    zoom: int = Field(default=12, description="Tile zoom level")

class SentinelHubTileResponse(BaseModel):
    """Sentinel Hub OGC/WMTS tile response."""
    provider: str = Field(default="SentinelHub", description="Provider identifier")
    collection: str = Field(..., description="Sentinel Hub collection ID")
    date: str = Field(..., description="Acquisition date (YYYY-MM-DD)")
    bbox: Tuple[float, float, float, float] = Field(..., description="Bounding box [west, south, east, north]")
    tile_url: str = Field(..., description="Sentinel Hub OGC WMTS tile URL")

class GeoJSONFeature(BaseModel):
    """GeoJSON Feature representation for GIS vector layers."""
    type: str = Field(default="Feature", description="GeoJSON object type")
    properties: Dict[str, Any] = Field(default_factory=dict, description="Feature attributes and metadata properties")
    geometry: Dict[str, Any] = Field(..., description="GeoJSON geometry object (Point, Polygon, etc.)")

class GeoJSONFeatureCollection(BaseModel):
    """GeoJSON FeatureCollection for vector GIS layer streaming and spatial buffers."""
    type: str = Field(default="FeatureCollection", description="GeoJSON FeatureCollection type")
    features: List[GeoJSONFeature] = Field(default_factory=list, description="Array of GeoJSON Features")

# Vector layer alias
VectorLayerResponse = GeoJSONFeatureCollection

# ============================================================================
# HAZARD EVENT TO GEOJSON CONVERSION SCAFFOLDING
# ============================================================================

def hazard_event_to_geojson_feature(event: Any) -> GeoJSONFeature:
    """Converts a HazardEventDetail or hazard event dict into a GeoJSON Feature."""
    if hasattr(event, "model_dump"):
        data = event.model_dump()
    elif isinstance(event, dict):
        data = dict(event)
    else:
        data = {}

    lat = float(data.get("lat") or data.get("latitude") or 0.0)
    lng = float(data.get("lng") or data.get("longitude") or 0.0)
    evt_id = str(data.get("id") or "EVT-UNKNOWN")
    props = {k: v for k, v in data.items() if k not in ("lat", "lng", "latitude", "longitude")}
    props["id"] = evt_id
    return GeoJSONFeature(
        type="Feature",
        geometry={"type": "Point", "coordinates": [lng, lat]},
        properties=props
    )

def hazard_events_to_feature_collection(events: Sequence[Any]) -> GeoJSONFeatureCollection:
    """Converts a sequence of hazard events into a GeoJSON FeatureCollection."""
    feats = [hazard_event_to_geojson_feature(e) for e in events if e is not None]
    return GeoJSONFeatureCollection(type="FeatureCollection", features=feats)

class SpatialBufferRequest(BaseModel):
    """Payload for computing geodesic spatial buffers."""
    distance_km: float = Field(default=2.0, description="Buffer distance in kilometers")
    geometry: Optional[Dict[str, Any]] = Field(default=None, description="Optional GeoJSON Point or Polygon geometry")
    lat: Optional[float] = Field(default=None, description="Center latitude coordinate")
    lng: Optional[float] = Field(default=None, description="Center longitude coordinate")

class SpatialBufferResponse(BaseModel):
    """GeoJSON FeatureCollection spatial buffer response."""
    status: str = Field(default="success", description="Status string")
    operation: str = Field(default="spatial_buffer", description="Spatial operation identifier")
    buffer_radius_km: float = Field(..., description="Buffer radius in kilometers")
    area_sq_km: float = Field(..., description="Buffer area in square kilometers")
    area_hectares: float = Field(..., description="Buffer area in hectares")
    geojson: Union[GeoJSONFeatureCollection, Dict[str, Any]] = Field(..., description="GeoJSON FeatureCollection containing buffered geometry")

# ============================================================================
# AGENTIC AI CHAT SCHEMAS
# ============================================================================

class AgentChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str

class AgentChatRequest(BaseModel):
    message: str
    history: Optional[List[AgentChatMessage]] = None
    event_id: Optional[str] = None

class AgentToolAction(BaseModel):
    tool: str
    args: Dict[str, Any]
    output: Dict[str, Any]

class MapAction(BaseModel):
    action: str = "MARK"  # "MARK" | "FLY_TO" | "CLEAR_MARKS"
    lat: float
    lng: float
    zoom: Optional[int] = 14
    label: str
    event_id: Optional[str] = None
    color: Optional[str] = "#00ffaa"

class NavigationAction(BaseModel):
    target_path: str  # "/map" | "/dashboard" | "/analytics" | "/methodology"
    reason: str
    auto_switch: bool = True

class AgentChatResponse(BaseModel):
    response: str
    tool_calls: Optional[List[AgentToolAction]] = None
    map_action: Optional[MapAction] = None
    navigation: Optional[NavigationAction] = None
    memory_updates: Optional[List[str]] = None
    suggested_prompts: Optional[List[str]] = None
    sources: Optional[List[Dict[str, Any]]] = None
    data_analysis: Optional[Dict[str, Any]] = None
    thinking: Optional[str] = None

# ============================================================================
# IOT & IN-SITU SENSOR TELEMETRY SCHEMAS
# ============================================================================

class SensorData(BaseModel):
    """In-situ IoT environmental sensor reading for multi-sensor fusion."""
    sensor_id: str = Field(..., description="Unique sensor identifier")
    location_lat: float = Field(..., description="Sensor latitude coordinate")
    location_lon: float = Field(..., description="Sensor longitude coordinate")
    soil_moisture_pct: float = Field(..., description="Soil volumetric moisture percentage")
    temperature_c: float = Field(..., description="Temperature in degrees Celsius")
    timestamp: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc), description="Measurement timestamp")

# ============================================================================
# AUTHENTICATION & ACCESS CONTROL SCHEMAS
# ============================================================================

class UserLoginRequest(BaseModel):
    """User credentials for OAuth2 authentication."""
    username: str = Field(..., description="User account username")
    password: str = Field(..., description="User account password")

class UserRegisterRequest(BaseModel):
    """Payload for registering a new user account."""
    username: str = Field(..., description="Desired username")
    password: str = Field(..., description="Account password")
    role: str = Field(default="viewer", description="Assigned role (viewer, admin)")

class TokenResponse(BaseModel):
    """OAuth2 JWT access token response."""
    access_token: str = Field(..., description="JWT Bearer access token")
    token_type: str = Field(default="bearer", description="Token authorization scheme")

class UserResponse(BaseModel):
    """Authenticated user profile information."""
    id: int = Field(..., description="User database ID")
    username: str = Field(..., description="Username")
    role: str = Field(default="viewer", description="User role authorization level (viewer, admin)")
    status: str = Field(default="authenticated", description="Authentication state")

class UserRegisterResponse(BaseModel):
    """User account registration response."""
    msg: str = Field(..., description="Status message")
    username: str = Field(..., description="Created username")

# ============================================================================
# COMPLIANCE REPORTING SCHEMAS
# ============================================================================

class ReportPdfParams(BaseModel):
    """Query parameters for environmental regulatory compliance PDF reports."""
    bbox: str = Field(..., description="Bounding box formatted as 'min_lon,min_lat,max_lon,max_lat'")
    index_type: str = Field(default="ndmi", description="Spectral index analyzed in the report")

# ============================================================================
# TERRAIN & TOPOGRAPHY ANALYSIS SCHEMAS
# ============================================================================

class TerrainMetric(str, Enum):
    """Digital elevation and terrain morphology metrics."""
    ELEVATION = "elevation"
    SLOPE = "slope"
    ASPECT = "aspect"
    HILLSHADE = "hillshade"

class TerrainAnalysisRequest(BaseModel):
    """Payload for digital elevation and terrain analysis over an AOI."""
    bbox: Union[Tuple[float, float, float, float], List[float], str] = Field(..., description="[min_lon, min_lat, max_lon, max_lat]")
    metric: TerrainMetric = Field(default=TerrainMetric.ELEVATION, description="Terrain morphology indicator")
    sun_azimuth_deg: float = Field(default=315.0, description="Illumination azimuth angle for hillshade [0, 360)")
    sun_altitude_deg: float = Field(default=45.0, description="Illumination altitude angle for hillshade [0, 90]")

class TerrainAnalysisResponse(BaseModel):
    """Terrain evaluation results and distribution statistics."""
    metric: str = Field(..., description="Analyzed terrain metric")
    min_value: float = Field(..., description="Minimum value within AOI")
    max_value: float = Field(..., description="Maximum value within AOI")
    mean_value: float = Field(..., description="Mean value within AOI")
    unit: str = Field(default="m", description="Unit of measurement (m, deg)")
    tile_url_template: str = Field(..., description="XYZ tile template for visual elevation rendering")
    statistics: Dict[str, float] = Field(default_factory=dict, description="Detailed statistical moments")

# ============================================================================
# SYNTHETIC APERTURE RADAR (SAR) ANALYSIS SCHEMAS
# ============================================================================

class SARPolarization(str, Enum):
    """Synthetic Aperture Radar backscatter polarization channels."""
    VV = "vv"
    VH = "vh"
    RATIO = "ratio_vh_vv"

class SARAnalysisRequest(BaseModel):
    """Payload for Sentinel-1 Synthetic Aperture Radar all-weather flood/moisture analysis."""
    bbox: Union[Tuple[float, float, float, float], List[float], str] = Field(..., description="[min_lon, min_lat, max_lon, max_lat]")
    polarization: SARPolarization = Field(default=SARPolarization.VV, description="SAR polarization channel")
    start_date: Optional[str] = Field(default=None, description="Acquisition start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(default=None, description="Acquisition end date (YYYY-MM-DD)")

class SARAnalysisResponse(BaseModel):
    """SAR calibrated backscatter response."""
    polarization: str = Field(..., description="Analyzed polarization channel")
    mean_backscatter_db: float = Field(..., description="Mean radar backscatter in decibels (dB)")
    min_backscatter_db: float = Field(..., description="Minimum backscatter in dB")
    max_backscatter_db: float = Field(..., description="Maximum backscatter in dB")
    flood_inundation_hectares: Optional[float] = Field(default=None, description="Estimated dark-water flood inundation area")
    tile_url_template: str = Field(..., description="XYZ tile template for SAR intensity rendering")

# ============================================================================
# EMBANKMENT & TOPOGRAPHIC TRANSECT CROSS-SECTION SCHEMAS & MATH
# ============================================================================

class TransectSampleMethod(str, Enum):
    """Interpolation method for linear sampling along an engineering transect."""
    EQUIDISTANT_GEODESIC = "equidistant_geodesic"
    VERTEX_ONLY = "vertex_only"

class TransectPoint(BaseModel):
    """Sample point along a linear spatial transect."""
    distance_m: float = Field(..., description="Cumulative distance from transect start in meters")
    lat: float = Field(..., description="Latitude coordinate in WGS84 degrees")
    lon: float = Field(..., description="Longitude coordinate in WGS84 degrees")
    elevation_m: Optional[float] = Field(default=None, description="Surface elevation in meters Above Sea Level")
    slope_deg: Optional[float] = Field(default=None, description="Local topographic slope in degrees")
    metric_value: Optional[float] = Field(default=None, description="Interpolated biophysical or spectral index value")

class TransectProfileSummary(BaseModel):
    """Aggregate statistics across a spatial cross-section transect."""
    total_distance_m: float = Field(..., description="Total length of the transect polyline in meters")
    min_elevation_m: Optional[float] = Field(default=None, description="Minimum elevation along transect in meters")
    max_elevation_m: Optional[float] = Field(default=None, description="Maximum elevation along transect in meters")
    elevation_gain_m: Optional[float] = Field(default=None, description="Cumulative positive elevation gain in meters")
    elevation_loss_m: Optional[float] = Field(default=None, description="Cumulative negative elevation drop in meters")
    mean_slope_deg: Optional[float] = Field(default=None, description="Average terrain slope in degrees")
    max_slope_deg: Optional[float] = Field(default=None, description="Steepest slope angle in degrees")
    min_metric_value: Optional[float] = Field(default=None, description="Minimum spectral metric value")
    max_metric_value: Optional[float] = Field(default=None, description="Maximum spectral metric value")

class TransectAnalysisRequest(BaseModel):
    """Request payload for extracting cross-sectional profiles along an embankment or hazard boundary."""
    polyline: Optional[Union[List[Tuple[float, float]], List[List[float]], Dict[str, Any]]] = Field(
        default=None,
        description="Sequence of (lat, lon) coordinates or GeoJSON LineString geometry"
    )
    coordinates: Optional[Any] = Field(
        default=None,
        description="Alternative alias for polyline coordinates"
    )
    metric: Union[TerrainMetric, SpectralIndex, str] = Field(
        default=TerrainMetric.ELEVATION,
        description="Analyzed parameter along transect (elevation, slope, ndmi, etc.)"
    )
    sample_count: int = Field(default=50, ge=2, le=500, description="Number of equidistant sample points along transect")
    sample_method: Optional[Union[TransectSampleMethod, str]] = Field(
        default=TransectSampleMethod.EQUIDISTANT_GEODESIC,
        description="Sampling method along transect polyline"
    )
    collection: SatelliteCollection = Field(default=SatelliteCollection.COP_DEM, description="Primary sensor or elevation source")
    item_id: Optional[str] = Field(default=None, description="Optional scene or orthomosaic ID")

    @model_validator(mode="before")
    @classmethod
    def resolve_polyline_input(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("polyline") and data.get("coordinates"):
                data["polyline"] = data["coordinates"]
        return data

class TransectAnalysisResponse(BaseModel):
    """Response payload for engineering transect cross-section analysis."""
    metric: str = Field(..., description="Analyzed indicator metric")
    total_distance_m: float = Field(..., description="Total transect length in meters")
    sample_count: int = Field(..., description="Number of evaluation points")
    summary: TransectProfileSummary = Field(..., description="Summary statistics across transect profile")
    points: List[TransectPoint] = Field(default_factory=list, description="Ordered sequence of transect profile points")

def sample_polyline_equidistant(
    polyline: Any,
    sample_count: int = 50
) -> List[Tuple[float, float]]:
    """Generates equidistant (lat, lon) sample coordinates along a polyline.
    
    Accepts GeoJSON LineString dicts, LineString Feature dicts, or sequences of coordinates.
    Returns ordered list of (lat, lon) tuples with exact count = max(2, sample_count).
    """
    raw_pts: List[Tuple[float, float]] = []
    
    if isinstance(polyline, dict):
        if polyline.get("type") == "Feature" and isinstance(polyline.get("geometry"), dict):
            polyline = polyline["geometry"]
        coords = polyline.get("coordinates") if isinstance(polyline.get("coordinates"), list) else None
        if coords:
            for pt in coords:
                if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                    try:
                        lon, lat = float(pt[0]), float(pt[1])
                        raw_pts.append((lat, lon))
                    except (ValueError, TypeError):
                        continue
    elif isinstance(polyline, (list, tuple)):
        for pt in polyline:
            if isinstance(pt, dict):
                try:
                    lat = float(pt.get("lat") or pt.get("latitude") or 0.0)
                    lon = float(pt.get("lon") or pt.get("lng") or pt.get("longitude") or 0.0)
                    raw_pts.append((lat, lon))
                except (ValueError, TypeError):
                    continue
            elif isinstance(pt, (list, tuple)) and len(pt) >= 2:
                try:
                    v1, v2 = float(pt[0]), float(pt[1])
                    if abs(v1) > 90.0 and abs(v2) <= 90.0:
                        raw_pts.append((v2, v1))
                    elif abs(v2) > 90.0 and abs(v1) <= 90.0:
                        raw_pts.append((v1, v2))
                    else:
                        raw_pts.append((v1, v2))
                except (ValueError, TypeError):
                    continue

    if not raw_pts:
        return []

    target_count = max(2, int(sample_count))
    if len(raw_pts) == 1:
        return [raw_pts[0]] * target_count

    # Calculate cumulative distances in meters
    cum_dists = [0.0]
    for i in range(1, len(raw_pts)):
        d = calculate_haversine_distance(
            raw_pts[i - 1][0], raw_pts[i - 1][1],
            raw_pts[i][0], raw_pts[i][1],
            unit="m"
        )
        cum_dists.append(cum_dists[-1] + d)

    total_dist = cum_dists[-1]
    if total_dist <= 0.0001:
        return [raw_pts[0]] * target_count

    sampled: List[Tuple[float, float]] = []
    step = total_dist / float(target_count - 1)
    
    seg_idx = 0
    for k in range(target_count):
        target_d = min(total_dist, k * step)
        while seg_idx < len(cum_dists) - 2 and cum_dists[seg_idx + 1] < target_d:
            seg_idx += 1
            
        seg_start_d = cum_dists[seg_idx]
        seg_end_d = cum_dists[seg_idx + 1]
        seg_len = seg_end_d - seg_start_d
        
        if seg_len > 0.0:
            frac = (target_d - seg_start_d) / seg_len
        else:
            frac = 0.0
        frac = max(0.0, min(1.0, frac))
        
        p1 = raw_pts[seg_idx]
        p2 = raw_pts[seg_idx + 1]
        lat = round(p1[0] + frac * (p2[0] - p1[0]), 6)
        lon = round(p1[1] + frac * (p2[1] - p1[1]), 6)
        sampled.append((lat, lon))
        
    return sampled

# ============================================================================
# VOLUMETRIC & CUT-FILL EARTHWORK SCHEMAS & MATH
# ============================================================================

class VolumeCalculationMode(str, Enum):
    """Operational mode for digital volumetric earthwork calculation."""
    CUT_FILL = "cut_fill"
    RESERVOIR_STORAGE = "reservoir_storage"
    EMBANKMENT_FILL = "embankment_fill"

class VolumetricAnalysisRequest(BaseModel):
    """Request payload for 3D earthwork and reservoir storage volume calculation."""
    bbox: Union[Tuple[float, float, float, float], List[float], str, Dict[str, Any]] = Field(
        ...,
        description="Target Area of Interest bounding box or GeoJSON Polygon"
    )
    reference_elevation_m: float = Field(
        ...,
        description="Design datum or water surface plane elevation in meters ASL"
    )
    mode: VolumeCalculationMode = Field(
        default=VolumeCalculationMode.CUT_FILL,
        description="Volumetric calculation mode"
    )
    grid_resolution_m: float = Field(
        default=10.0,
        ge=0.5,
        le=100.0,
        description="Grid cell resolution in meters for volume integration"
    )
    cell_size_m: Optional[float] = Field(
        default=None,
        description="Alternative alias for grid_resolution_m"
    )
    collection: SatelliteCollection = Field(
        default=SatelliteCollection.COP_DEM,
        description="Digital elevation model collection"
    )

    @model_validator(mode="before")
    @classmethod
    def resolve_grid_resolution(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "grid_resolution_m" not in data and "cell_size_m" in data:
                data["grid_resolution_m"] = data["cell_size_m"]
        return data

class VolumetricAnalysisResponse(BaseModel):
    """Response payload for volumetric earthwork integration."""
    mode: str = Field(..., description="Volumetric analysis mode")
    reference_elevation_m: float = Field(..., description="Reference datum elevation in meters")
    surface_area_m2: float = Field(..., description="Surface footprint area in square meters")
    surface_area_hectares: float = Field(..., description="Surface footprint area in hectares")
    cut_volume_m3: float = Field(..., description="Excavation volume above reference datum in cubic meters")
    fill_volume_m3: float = Field(..., description="Fill volume below reference datum in cubic meters")
    net_volume_m3: float = Field(..., description="Net earthwork balance (cut - fill) in cubic meters")
    mean_elevation_m: float = Field(..., description="Mean ground elevation in meters")
    min_elevation_m: float = Field(..., description="Minimum ground elevation in meters")
    max_elevation_m: float = Field(..., description="Maximum ground elevation in meters")
    mean_depth_m: float = Field(default=0.0, description="Average depth or height relative to datum in meters")
    max_depth_m: float = Field(default=0.0, description="Maximum depth or height relative to datum in meters")

def calculate_cut_fill_volumes(
    elevation_grid: Sequence[Any],
    reference_elevation_m: float,
    cell_size_m: float = 10.0
) -> Dict[str, float]:
    """Computes cut, fill, and net volumetric metrics over an elevation grid array."""
    valid_elevs: List[float] = []
    for e in elevation_grid:
        if e is not None:
            try:
                val = float(e)
                if math.isfinite(val):
                    valid_elevs.append(val)
            except (ValueError, TypeError):
                continue

    if not valid_elevs:
        return {
            "surface_area_m2": 0.0,
            "surface_area_hectares": 0.0,
            "cut_volume_m3": 0.0,
            "fill_volume_m3": 0.0,
            "net_volume_m3": 0.0,
            "mean_elevation_m": 0.0,
            "min_elevation_m": 0.0,
            "max_elevation_m": 0.0,
            "mean_depth_m": 0.0,
            "max_depth_m": 0.0
        }

    cell_area = float(cell_size_m) * float(cell_size_m)
    cut_vol = 0.0
    fill_vol = 0.0
    depth_diffs: List[float] = []

    for z in valid_elevs:
        diff = z - float(reference_elevation_m)
        depth_diffs.append(abs(diff))
        if diff > 0.0:
            cut_vol += diff * cell_area
        elif diff < 0.0:
            fill_vol += (-diff) * cell_area

    total_area = len(valid_elevs) * cell_area
    mean_elev = sum(valid_elevs) / len(valid_elevs)
    min_elev = min(valid_elevs)
    max_elev = max(valid_elevs)
    mean_depth = sum(depth_diffs) / len(depth_diffs) if depth_diffs else 0.0
    max_depth = max(depth_diffs) if depth_diffs else 0.0

    return {
        "surface_area_m2": round(total_area, 2),
        "surface_area_hectares": round(total_area / 10000.0, 4),
        "cut_volume_m3": round(cut_vol, 2),
        "fill_volume_m3": round(fill_vol, 2),
        "net_volume_m3": round(cut_vol - fill_vol, 2),
        "mean_elevation_m": round(mean_elev, 2),
        "min_elevation_m": round(min_elev, 2),
        "max_elevation_m": round(max_elev, 2),
        "mean_depth_m": round(mean_depth, 2),
        "max_depth_m": round(max_depth, 2)
    }

# ============================================================================
# DATA EXPORT CONTRACTS & SPECIFICATIONS
# ============================================================================

class ExportRasterFormat(str, Enum):
    """Supported output formats for spatial and analytical raster export."""
    GEOTIFF = "geotiff"
    COG = "cog"
    PNG_RGBA = "png_rgba"
    GEOJSON_VECTOR = "geojson_vector"
    CSV_TABULAR = "csv_tabular"

class DataExportRequest(BaseModel):
    """Payload for exporting georeferenced raster scenes or derived biophysical layers."""
    bbox: Union[Tuple[float, float, float, float], List[float], str] = Field(
        ...,
        description="Target spatial bounds [min_lon, min_lat, max_lon, max_lat]"
    )
    collection: SatelliteCollection = Field(
        default=SatelliteCollection.SENTINEL_2,
        description="Target imagery or elevation collection"
    )
    item_id: Optional[str] = Field(default=None, description="Specific STAC item or orthomosaic ID")
    index: Optional[SpectralIndex] = Field(default=None, description="Optional spectral index to export")
    metric: Optional[TerrainMetric] = Field(default=None, description="Optional terrain metric to export")
    format: ExportRasterFormat = Field(default=ExportRasterFormat.GEOTIFF, description="Target export file format")
    crs: str = Field(default="EPSG:4326", description="Target spatial reference coordinate system")
    resolution_m: Optional[float] = Field(default=None, description="Target ground resolution in meters")
    rescale: Optional[str] = Field(default=None, description="Optional display contrast rescale min,max")
    colormap: Optional[TileColormap] = Field(default=None, description="Optional rendered colormap palette")

class DataExportResponse(BaseModel):
    """Response payload acknowledging raster export generation."""
    export_id: str = Field(..., description="Unique export task or file identifier")
    status: str = Field(default="ready", description="Export processing status (ready, processing)")
    format: str = Field(..., description="Exported file format")
    download_url: str = Field(..., description="Direct HTTP URL to retrieve the exported artifact")
    filename: str = Field(..., description="Suggested filename for download")
    file_size_bytes: Optional[int] = Field(default=None, description="File size in bytes if available")
    crs: str = Field(default="EPSG:4326", description="Output spatial coordinate reference system")
    bbox: Tuple[float, float, float, float] = Field(..., description="Georeferenced bounding box coordinates")
    created_at: str = Field(..., description="ISO 8601 generation timestamp")
    expires_at: str = Field(..., description="ISO 8601 URL expiration timestamp")

def format_export_filename(
    collection: Union[str, SatelliteCollection],
    item_id: str,
    format_type: Union[str, ExportRasterFormat] = ExportRasterFormat.GEOTIFF,
    index: Optional[Union[str, SpectralIndex]] = None
) -> str:
    """Generates standardized canonical filename for exported geospatial data files."""
    col_str = collection.value if hasattr(collection, "value") else str(collection).lower().strip()
    fmt_str = format_type.value if hasattr(format_type, "value") else str(format_type).lower().strip()
    clean_id = re.sub(r"[^a-zA-Z0-9_-]", "_", str(item_id).strip())

    ext_map = {
        "geotiff": "tif",
        "cog": "tif",
        "png_rgba": "png",
        "geojson_vector": "geojson",
        "csv_tabular": "csv"
    }
    ext = ext_map.get(fmt_str, "tif")

    prefix = f"gios_{col_str}_{clean_id}"
    if index:
        idx_str = index.value if hasattr(index, "value") else str(index).lower().strip()
        prefix = f"{prefix}_{idx_str}"

    return f"{prefix}.{ext}"

# ============================================================================
# TEMPORAL PLAYBACK & TIME-LAPSE ANIMATION KEYFRAME SCAFFOLDING
# ============================================================================

class AnimationPlaybackMode(str, Enum):
    """Temporal playback sequence progression modes."""
    LOOP = "loop"
    PING_PONG = "ping_pong"
    STEP = "step"

class AnimationKeyframe(BaseModel):
    """Individual temporal frame in an animated satellite observation sequence."""
    frame_index: int = Field(..., description="Zero-based sequence index")
    timestamp: str = Field(..., description="Acquisition date (YYYY-MM-DD)")
    scene_id: str = Field(..., description="STAC scene or observation identifier")
    cloud_cover: float = Field(default=0.0, description="Cloud coverage percentage")
    tile_url: str = Field(..., description="XYZ tile rendering URL for this observation")
    index: SpectralIndex = Field(default=SpectralIndex.RGB, description="Rendered spectral index")
    colormap: Optional[TileColormap] = Field(default=None, description="Applied colormap palette")

class AnimationSequenceConfig(BaseModel):
    """Configuration and frame catalog for multi-temporal animation playback."""
    collection: SatelliteCollection = Field(default=SatelliteCollection.SENTINEL_2, description="Satellite collection")
    start_date: str = Field(..., description="Sequence start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="Sequence end date (YYYY-MM-DD)")
    fps: float = Field(default=2.0, ge=0.1, le=30.0, description="Playback frame rate in frames per second")
    playback_mode: AnimationPlaybackMode = Field(default=AnimationPlaybackMode.LOOP, description="Animation playback mode")
    frames: List[AnimationKeyframe] = Field(default_factory=list, description="Ordered sequence of animation keyframes")

class AnimationSequenceRequest(BaseModel):
    """Request payload for multi-temporal animation keyframe sequence."""
    collection: SatelliteCollection = Field(default=SatelliteCollection.SENTINEL_2, description="Satellite collection")
    start_date: Optional[str] = Field(default=None, description="Sequence start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(default=None, description="Sequence end date (YYYY-MM-DD)")
    bbox: Optional[Union[Tuple[float, float, float, float], List[float], str, Dict[str, Any]]] = Field(
        default=None,
        description="Target spatial bounds [min_lon, min_lat, max_lon, max_lat]"
    )
    z: int = Field(default=12, ge=0, le=24, description="Map zoom level")
    x: Optional[int] = Field(default=None, ge=0, description="Mercator tile X coordinate")
    y: Optional[int] = Field(default=None, ge=0, description="Mercator tile Y coordinate")
    lat: Optional[float] = Field(default=None, description="Center latitude coordinate")
    lon: Optional[float] = Field(default=None, description="Center longitude coordinate")
    fps: float = Field(default=2.0, ge=0.1, le=30.0, description="Playback frame rate")
    playback_mode: AnimationPlaybackMode = Field(default=AnimationPlaybackMode.LOOP, description="Animation playback mode")
    index: Union[SpectralIndex, str] = Field(default=SpectralIndex.RGB, description="Rendered spectral index")
    colormap: Optional[Union[TileColormap, str]] = Field(default=None, description="Applied colormap palette")
    rescale: Optional[str] = Field(default=None, description="Contrast stretch min,max")

def build_animation_keyframes(
    scenes: Sequence[Any],
    z: int,
    x: int,
    y: int,
    index: Union[SpectralIndex, str] = SpectralIndex.RGB,
    colormap: Optional[Union[TileColormap, str]] = None,
    rescale: Optional[str] = None
) -> List[AnimationKeyframe]:
    """Constructs ordered AnimationKeyframe list from STAC scenes for tile viewport (z, x, y)."""
    idx_val = index.value if hasattr(index, "value") else str(index).lower().strip()
    idx_enum = SpectralIndex(idx_val) if idx_val in [e.value for e in SpectralIndex] else SpectralIndex.RGB
    cm_val = colormap.value if hasattr(colormap, "value") else (str(colormap).lower().strip() if colormap else None)
    cm_enum = TileColormap(cm_val) if cm_val in [c.value for c in TileColormap] else None

    sorted_scenes = []
    for sc in scenes:
        dt = getattr(sc, "datetime", None) or (sc.get("datetime") if isinstance(sc, dict) else None) or ""
        sorted_scenes.append((dt, sc))
    sorted_scenes.sort(key=lambda item: item[0])

    frames: List[AnimationKeyframe] = []
    for idx_pos, (dt_str, sc) in enumerate(sorted_scenes):
        sc_id = getattr(sc, "id", None) or (sc.get("id") if isinstance(sc, dict) else None) or f"SCENE-{idx_pos}"
        cc = getattr(sc, "cloud_cover", None) or (sc.get("cloud_cover") if isinstance(sc, dict) else None) or 0.0
        coll = getattr(sc, "collection", None) or (sc.get("collection") if isinstance(sc, dict) else None) or "sentinel-2-l2a"
        date_clean = dt_str.split("T")[0] if "T" in dt_str else (dt_str or "2026-01-01")

        tile_url = format_api_route("tiles_dynamic", collection=coll, item_id=sc_id, z=z, x=x, y=y)
        params = [f"index={idx_enum.value}"]
        if cm_enum:
            params.append(f"colormap={cm_enum.value}")
        if rescale:
            params.append(f"rescale={rescale}")
        tile_url = f"{tile_url}?{'&'.join(params)}"

        frames.append(AnimationKeyframe(
            frame_index=idx_pos,
            timestamp=date_clean,
            scene_id=str(sc_id),
            cloud_cover=float(cc),
            tile_url=tile_url,
            index=idx_enum,
            colormap=cm_enum
        ))

    return frames


# ============================================================================
# QUALITY MOSAICING & TEMPORAL COMPOSITES CONTRACTS
# ============================================================================

class CompositeReducer(str, Enum):
    """Statistical and quality pixel reducers for multi-temporal compositing."""
    MEDIAN = "median"
    GREENEST_PIXEL = "greenest_pixel"      # Max NDVI
    CLEAREST_PIXEL = "clearest_pixel"      # Min cloud probability
    MOST_RECENT = "most_recent"            # Latest valid cloud-free observation
    MAX_NDMI = "max_ndmi"                  # Peak moisture anomaly
    MIN_LST = "min_lst"                    # Coolest thermal observation

class TemporalCompositeRequest(BaseModel):
    """Request payload for multi-temporal cloud-free raster composite generation."""
    bbox: Union[Tuple[float, float, float, float], List[float], str] = Field(
        ...,
        description="Target geographic bounding box [min_lon, min_lat, max_lon, max_lat]"
    )
    collection: SatelliteCollection = Field(
        default=SatelliteCollection.SENTINEL_2,
        description="Target satellite imagery collection"
    )
    start_date: str = Field(..., description="Temporal window start date (YYYY-MM-DD)")
    end_date: str = Field(..., description="Temporal window end date (YYYY-MM-DD)")
    reducer: CompositeReducer = Field(
        default=CompositeReducer.MEDIAN,
        description="Pixel reduction algorithm"
    )
    max_cloud_cover: float = Field(
        default=30.0,
        ge=0.0,
        le=100.0,
        description="Maximum scene cloud cover threshold in percent"
    )
    index: Optional[SpectralIndex] = Field(default=None, description="Optional spectral index to composite")
    colormap: Optional[TileColormap] = Field(default=None, description="Optional rendering colormap")
    rescale: Optional[str] = Field(default=None, description="Optional contrast stretch min,max")

class TemporalCompositeResponse(BaseModel):
    """Response payload for multi-temporal composite synthesis."""
    composite_id: str = Field(..., description="Unique composite task or dataset identifier")
    status: str = Field(default="ready", description="Composite status (ready, processing)")
    reducer: CompositeReducer = Field(..., description="Applied pixel reduction algorithm")
    collection: str = Field(..., description="Source satellite collection")
    scene_count: int = Field(..., description="Number of scenes ingested into composite")
    contributing_scenes: List[str] = Field(default_factory=list, description="IDs of contributing scenes")
    bbox: Tuple[float, float, float, float] = Field(..., description="Spatial envelope bounds")
    time_window: str = Field(..., description="Temporal interval string YYYY-MM-DD to YYYY-MM-DD")
    tile_url_template: str = Field(..., description="XYZ tile template URL for streaming composite")
    created_at: str = Field(..., description="ISO 8601 generation timestamp")

def build_composite_tile_url(
    composite_id: str,
    z: int,
    x: int,
    y: int,
    index: Optional[Union[str, SpectralIndex]] = None,
    colormap: Optional[Union[str, TileColormap]] = None,
    rescale: Optional[str] = None
) -> str:
    """Builds canonical XYZ tile URL for streaming a temporal composite."""
    route = format_api_route("tiles_composite", composite_id=composite_id, z=z, x=x, y=y)
    params = []
    if index:
        idx_str = index.value if hasattr(index, "value") else str(index).lower().strip()
        params.append(f"index={idx_str}")
    if colormap:
        cm_str = colormap.value if hasattr(colormap, "value") else str(colormap).lower().strip()
        params.append(f"colormap={cm_str}")
    if rescale:
        params.append(f"rescale={rescale}")
    if params:
        return f"{route}?{'&'.join(params)}"
    return route


# ============================================================================
# GEOTECHNICAL FIELD INSPECTION & DEFECT ANNOTATION CONTRACTS
# ============================================================================

class DefectCategory(str, Enum):
    """Geotechnical defect classifications for dams, levees, and hazard perimeters."""
    SEEPAGE_BOIL = "seepage_boil"
    CREST_CRACK = "crest_crack"
    SLOPE_SLUMP = "slope_slump"
    PIPING_VOID = "piping_void"
    EROSION_GULLY = "erosion_gully"
    SUBSIDENCE = "subsidence"
    VEGETATION_ANOMALY = "vegetation_anomaly"

class DefectSeverity(str, Enum):
    """Risk severity levels for geotechnical defects."""
    CRITICAL = "critical"
    HIGH = "high"
    MODERATE = "moderate"
    LOW = "low"

class DefectStatus(str, Enum):
    """Lifecycle tracking states for geotechnical defect annotations."""
    OPEN = "open"
    INVESTIGATING = "investigating"
    WORK_ORDER_ISSUED = "work_order_issued"
    REPAIRED = "repaired"
    VERIFIED = "verified"

class GeotechnicalAnnotation(BaseModel):
    """Geotagged defect annotation pinned to a dam embankment or hazard zone."""
    annotation_id: str = Field(..., description="Unique defect annotation identifier")
    title: str = Field(..., description="Short summary title of the defect")
    category: DefectCategory = Field(..., description="Geotechnical defect classification")
    severity: DefectSeverity = Field(..., description="Risk severity tier")
    status: DefectStatus = Field(default=DefectStatus.OPEN, description="Current workflow state")
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in WGS84 degrees")
    lng: float = Field(..., ge=-180.0, le=180.0, description="Longitude in WGS84 degrees")
    elevation_m: Optional[float] = Field(default=None, description="Surface elevation in meters ASL")
    asset_id: str = Field(..., description="Associated critical infrastructure asset ID")
    drone_ortho_id: Optional[str] = Field(default=None, description="Optional drone orthomosaic survey reference")
    photo_urls: List[str] = Field(default_factory=list, description="Inspection evidence photos or drone crops")
    notes: str = Field(default="", description="Inspector narrative and geotechnical observations")
    inspector: str = Field(default="Field Engineer", description="Inspector identifier or username")
    created_at: str = Field(..., description="ISO 8601 creation timestamp")
    updated_at: str = Field(..., description="ISO 8601 last update timestamp")

class CreateAnnotationRequest(BaseModel):
    """Payload for submitting a new geotechnical defect observation."""
    title: str = Field(..., min_length=3, description="Descriptive title")
    category: DefectCategory = Field(..., description="Defect category")
    severity: DefectSeverity = Field(..., description="Risk severity level")
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude")
    lng: float = Field(..., ge=-180.0, le=180.0, description="Longitude")
    elevation_m: Optional[float] = Field(default=None, description="Elevation ASL")
    asset_id: str = Field(..., description="Infrastructure asset ID")
    drone_ortho_id: Optional[str] = Field(default=None, description="Drone survey ID")
    photo_urls: List[str] = Field(default_factory=list, description="Evidence photo URLs")
    notes: str = Field(default="", description="Field notes")
    inspector: Optional[str] = Field(default="Field Engineer", description="Inspector name")

class UpdateAnnotationStatusRequest(BaseModel):
    """Payload for updating defect annotation lifecycle status."""
    status: DefectStatus = Field(..., description="New lifecycle state")
    notes: Optional[str] = Field(default=None, description="Optional status change remarks")

class MaintenanceWorkOrder(BaseModel):
    """Actionable maintenance work order dispatched from a geotechnical defect."""
    work_order_id: str = Field(..., description="Unique work order identifier")
    annotation_id: str = Field(..., description="Linked defect annotation ID")
    asset_id: str = Field(..., description="Infrastructure asset identifier")
    priority: DefectSeverity = Field(..., description="Work order priority tier")
    description: str = Field(..., description="Remediation instructions and work scope")
    assigned_crew: str = Field(default="Geotechnical Repair Crew", description="Assigned engineering crew")
    target_completion_date: str = Field(..., description="Target completion deadline (YYYY-MM-DD)")
    status: str = Field(default="draft", description="Work order status: draft, dispatched, completed, closed")
    estimated_hours: Optional[float] = Field(default=None, description="Estimated labor hours")
    created_at: str = Field(..., description="ISO 8601 creation timestamp")

class CreateWorkOrderRequest(BaseModel):
    """Payload for issuing a maintenance work order from an annotation."""
    annotation_id: str = Field(..., description="Defect annotation ID")
    priority: DefectSeverity = Field(..., description="Priority tier")
    description: str = Field(..., description="Work scope and instructions")
    assigned_crew: Optional[str] = Field(default="Geotechnical Repair Crew", description="Assigned repair team")
    target_completion_date: str = Field(..., description="Target completion deadline (YYYY-MM-DD)")
    estimated_hours: Optional[float] = Field(default=None, description="Estimated labor hours")

def annotation_to_geojson_feature(annotation: Union[GeotechnicalAnnotation, Dict[str, Any]]) -> Dict[str, Any]:
    """Converts a GeotechnicalAnnotation model or dict into an RFC 7946 GeoJSON Feature."""
    if isinstance(annotation, BaseModel):
        data = annotation.model_dump()
    else:
        data = dict(annotation)

    lat = float(data.get("lat", 0.0))
    lng = float(data.get("lng", 0.0))
    ann_id = str(data.get("annotation_id", ""))

    return {
        "type": "Feature",
        "id": ann_id,
        "geometry": {
            "type": "Point",
            "coordinates": [lng, lat]
        },
        "properties": {
            "annotation_id": ann_id,
            "title": data.get("title", ""),
            "category": data.get("category", ""),
            "severity": data.get("severity", ""),
            "status": data.get("status", ""),
            "asset_id": data.get("asset_id", ""),
            "elevation_m": data.get("elevation_m"),
            "drone_ortho_id": data.get("drone_ortho_id"),
            "photo_urls": data.get("photo_urls", []),
            "notes": data.get("notes", ""),
            "inspector": data.get("inspector", ""),
            "created_at": data.get("created_at", ""),
            "updated_at": data.get("updated_at", "")
        }
    }

def annotations_to_feature_collection(
    annotations: Sequence[Union[GeotechnicalAnnotation, Dict[str, Any]]]
) -> Dict[str, Any]:
    """Converts a list of GeotechnicalAnnotations into an RFC 7946 GeoJSON FeatureCollection."""
    features = [annotation_to_geojson_feature(a) for a in annotations]
    return {
        "type": "FeatureCollection",
        "features": features
    }


# ============================================================================
# AUTOMATED AOI MONITORING SUBSCRIPTIONS & ALERT TRIGGER CONTRACTS
# ============================================================================

class SubscriptionTriggerType(str, Enum):
    """Trigger conditions for automated AOI satellite monitoring subscriptions."""
    Z_SCORE_ANOMALY = "z_score_anomaly"          # Seasonal MAD z-score exceeding threshold
    NEW_SCENE_INGESTED = "new_scene_ingested"    # Each new cloud-free scene publication
    INDEX_THRESHOLD = "index_threshold"          # Absolute index value breach

class NotificationChannel(str, Enum):
    """Outbound alerting dispatch channels."""
    WEBHOOK = "webhook"
    EMAIL = "email"
    SLACK = "slack"
    IN_APP_ALERT = "in_app_alert"

class AOISubscriptionRequest(BaseModel):
    """Payload for creating a continuous monitoring subscription over an AOI."""
    name: str = Field(..., min_length=3, description="Subscription label")
    bbox: Union[Tuple[float, float, float, float], List[float], str] = Field(
        ...,
        description="Monitored geographic bounding box [min_lon, min_lat, max_lon, max_lat]"
    )
    asset_id: Optional[str] = Field(default=None, description="Optional monitored asset ID")
    collection: SatelliteCollection = Field(
        default=SatelliteCollection.SENTINEL_2,
        description="Target satellite imagery collection"
    )
    indices: List[SpectralIndex] = Field(
        default_factory=lambda: [SpectralIndex.NDMI],
        description="List of biophysical spectral indices to monitor"
    )
    trigger_type: SubscriptionTriggerType = Field(
        default=SubscriptionTriggerType.Z_SCORE_ANOMALY,
        description="Condition triggering alert dispatch"
    )
    z_score_threshold: float = Field(
        default=2.5,
        ge=1.0,
        le=5.0,
        description="Seasonal MAD z-score sensitivity threshold"
    )
    channels: List[NotificationChannel] = Field(
        default_factory=lambda: [NotificationChannel.IN_APP_ALERT],
        description="Notification channels"
    )
    webhook_url: Optional[str] = Field(default=None, description="Target HTTP POST URL for webhooks")
    is_active: bool = Field(default=True, description="Subscription active state")

class AOISubscriptionResponse(BaseModel):
    """Response payload acknowledging an AOI monitoring subscription."""
    subscription_id: str = Field(..., description="Unique subscription identifier")
    name: str = Field(..., description="Subscription label")
    asset_id: Optional[str] = Field(default=None, description="Monitored asset ID")
    collection: str = Field(..., description="Target satellite collection")
    indices: List[str] = Field(..., description="Monitored indices")
    trigger_type: SubscriptionTriggerType = Field(..., description="Trigger condition")
    z_score_threshold: float = Field(..., description="Z-score threshold")
    channels: List[str] = Field(..., description="Active notification channels")
    webhook_url: Optional[str] = Field(default=None, description="Webhook endpoint URL")
    is_active: bool = Field(..., description="Active flag")
    created_at: str = Field(..., description="ISO 8601 creation timestamp")
    last_checked_at: Optional[str] = Field(default=None, description="Last automated scan timestamp")
    alerts_triggered_count: int = Field(default=0, description="Total alerts dispatched to date")

class SubscriptionAlertPayload(BaseModel):
    """Standardized webhook notification payload dispatched when an anomaly is detected."""
    subscription_id: str = Field(..., description="Source subscription identifier")
    asset_id: Optional[str] = Field(default=None, description="Associated asset identifier")
    trigger_type: SubscriptionTriggerType = Field(..., description="Triggered condition")
    z_score: Optional[float] = Field(default=None, description="Observed seasonal z-score")
    index: Optional[SpectralIndex] = Field(default=None, description="Triggering spectral index")
    message: str = Field(..., description="Human-readable notification text")
    scene_id: str = Field(..., description="STAC scene observation ID")
    thumbnail_url: Optional[str] = Field(default=None, description="Rendered thumbnail preview URL")
    triggered_at: str = Field(..., description="ISO 8601 alert timestamp")


# ============================================================================
# VIRTUAL RASTER (VRT) MULTI-GRANULE MOSAICING & MGRS GRID SCAFFOLDING
# ============================================================================

class SeamlineMode(str, Enum):
    """Seamline blending algorithms for multi-scene virtual raster mosaics."""
    FEATHER = "feather"            # Distance-weighted feathering across scene overlaps
    NEAREST = "nearest"            # Nearest neighbor boundary cut
    VORONOI_CUT = "voronoi_cut"    # Minimum-energy Voronoi graph-cut seamline
    AVERAGE = "average"            # Linear average over overlapping pixel regions

class MGRSTileSpec(BaseModel):
    """Military Grid Reference System (MGRS) tile specification for Sentinel-2 alignment."""
    tile_id: str = Field(..., description="MGRS 5-character tile identifier (e.g., '10SEJ')")
    utm_zone: int = Field(..., description="UTM zone number (1-60)")
    latitude_band: str = Field(..., description="UTM latitude band character")
    square_id: str = Field(..., description="100km square identification")
    epsg_code: int = Field(..., description="Target EPSG coordinate reference code")
    bbox: Tuple[float, float, float, float] = Field(..., description="WGS84 bounding envelope")

class VRTDatasetSpec(BaseModel):
    """Specification for a virtual multi-scene raster mosaic dataset."""
    vrt_id: str = Field(..., description="Unique VRT dataset identifier")
    target_crs: str = Field(default="EPSG:3857", description="Mosaic output coordinate reference system")
    resolution_m: float = Field(default=10.0, ge=0.01, description="Target pixel ground resolution in meters")
    source_scenes: List[str] = Field(..., min_length=1, description="List of source STAC item IDs")
    seamline_mode: SeamlineMode = Field(default=SeamlineMode.FEATHER, description="Seamline blending algorithm")
    bbox: Tuple[float, float, float, float] = Field(..., description="Combined spatial bounding envelope")
    band_count: int = Field(default=4, ge=1, description="Number of aligned raster bands")
    created_at: str = Field(..., description="ISO 8601 specification timestamp")

class VRTAnalysisRequest(BaseModel):
    """Request payload for configuring and analyzing a multi-scene virtual raster mosaic."""
    source_scenes: List[str] = Field(..., min_length=1, description="List of STAC scene IDs to mosaic")
    collection: SatelliteCollection = Field(
        default=SatelliteCollection.SENTINEL_2,
        description="Satellite collection"
    )
    seamline_mode: SeamlineMode = Field(
        default=SeamlineMode.FEATHER,
        description="Seamline blending algorithm"
    )
    target_crs: str = Field(default="EPSG:3857", description="Output CRS")
    index: Optional[SpectralIndex] = Field(default=None, description="Optional index to calculate across mosaic")
    colormap: Optional[TileColormap] = Field(default=None, description="Applied colormap palette")
    rescale: Optional[str] = Field(default=None, description="Contrast stretch min,max")

class VRTAnalysisResponse(BaseModel):
    """Response acknowledging virtual raster mosaic generation."""
    vrt_id: str = Field(..., description="Unique VRT dataset identifier")
    status: str = Field(default="ready", description="Processing state")
    source_scene_count: int = Field(..., description="Number of mosaiced granules")
    source_scenes: List[str] = Field(..., description="Mosaiced scene IDs")
    seamline_mode: SeamlineMode = Field(..., description="Applied seamline algorithm")
    bbox: Tuple[float, float, float, float] = Field(..., description="Mosaic spatial envelope")
    target_crs: str = Field(..., description="Target coordinate reference system")
    tile_url_template: str = Field(..., description="XYZ tile template URL for streaming the VRT")
    created_at: str = Field(..., description="ISO 8601 generation timestamp")

def build_vrt_tile_url(
    vrt_id: str,
    z: int,
    x: int,
    y: int,
    index: Optional[Union[str, SpectralIndex]] = None,
    colormap: Optional[Union[str, TileColormap]] = None,
    rescale: Optional[str] = None
) -> str:
    """Builds canonical XYZ tile URL for streaming a Virtual Raster (VRT) mosaic."""
    route = format_api_route("tiles_vrt", vrt_id=vrt_id, z=z, x=x, y=y)
    params = []
    if index:
        idx_str = index.value if hasattr(index, "value") else str(index).lower().strip()
        params.append(f"index={idx_str}")
    if colormap:
        cm_str = colormap.value if hasattr(colormap, "value") else str(colormap).lower().strip()
        params.append(f"colormap={cm_str}")
    if rescale:
        params.append(f"rescale={rescale}")
    if params:
        return f"{route}?{'&'.join(params)}"
    return route



