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
from enum import Enum
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple, Union
from pydantic import BaseModel, Field

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
    """Status lifecycle for drone orthomosaic ingestion and overview generation."""
    READY = "READY"
    PROCESSING = "PROCESSING"
    FAILED = "FAILED"

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

class ColormapMetadata(BaseModel):
    """Raster colormap palette metadata matching dynamic XYZ tile server capabilities."""
    key: TileColormap = Field(..., description="Colormap palette identifier enum")
    label: str = Field(..., description="Descriptive colormap name with typical application domain")
    description: Optional[str] = Field(default=None, description="Detailed palette description")

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
        description="Sensitive to water content in vegetation canopy and soil moisture along embankment toes."
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
        description="Evaluates live green plant biomass, chlorophyll density, and vegetative vigor."
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
        description="Suppresses built-up urban features while amplifying open water bodies and flood inundation."
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
        description="Quantifies chlorophyll-a concentration and microcystin bloom risk in inland reservoirs."
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
        description="Highlights burned areas and high-heat signatures by contrasting NIR and SWIR2 reflectance."
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
        description="Atmospherically corrected vegetation index that resists saturation in high-biomass regions."
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
        description="Incorporates a soil brightness correction factor (L=0.5) for arid soils and embankments."
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
        description="Calibrated radiometric surface skin temperature in degrees Celsius from thermal infrared."
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
        description="Calibrated surface reflectance composite simulating natural human eye perception."
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
        description="Differenced NBR assessing fire severity and biomass loss between pre- and post-fire scenes."
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
        description="Relative differenced NBR normalized by pre-fire canopy density for steep terrain assessment."
    ),
}

COLORMAPS_METADATA: Dict[str, ColormapMetadata] = {
    "spectral": ColormapMetadata(key=TileColormap.SPECTRAL, label="Spectral (Moisture & Hazard Detection)", description="High-contrast diverging palette for soil moisture and seepage"),
    "viridis": ColormapMetadata(key=TileColormap.VIRIDIS, label="Viridis (Vegetation & Biophysical Health)", description="Perceptually uniform sequential palette for vegetation vigor"),
    "turbo": ColormapMetadata(key=TileColormap.TURBO, label="Turbo (Thermal & High-Contrast Severity)", description="Rainbow alternative with improved perceptual linearity for wildfire and inundation"),
    "rdylbu": ColormapMetadata(key=TileColormap.RDYLBU, label="Red-Yellow-Blue (Diverging Water & Drought)", description="Diverging palette for drought stress and hydrological anomalies"),
    "terrain": ColormapMetadata(key=TileColormap.TERRAIN, label="Terrain (Topography & Physical Elevation)", description="Earth-tone palette suitable for digital elevation models and bathymetry"),
    "magma": ColormapMetadata(key=TileColormap.MAGMA, label="Magma (Thermal Infrared & Radiation)", description="High-radiance dark-to-bright palette for Land Surface Temperature"),
    "inferno": ColormapMetadata(key=TileColormap.INFERNO, label="Inferno (High Radiance / Active Fire)", description="Saturated thermal palette for high-intensity wildfire and hotspot tracking"),
    "cividis": ColormapMetadata(key=TileColormap.CIVIDIS, label="Cividis (Colorblind Accessible)", description="Color-vision-deficiency optimized palette for universal accessibility"),
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
}

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
        "description": "Deep canopy mortality, total ground char, high post-fire erosion susceptibility."
    },
    {
        "category": "Moderate-High Severity",
        "min_dnbr": 0.440,
        "color": "#d7301f",
        "description": "Substantial canopy scorched, understory consumed."
    },
    {
        "category": "Moderate-Low Severity",
        "min_dnbr": 0.270,
        "color": "#fc8d59",
        "description": "Mixed surface fire, light scorch, localized duff consumption."
    },
    {
        "category": "Low Severity",
        "min_dnbr": 0.100,
        "color": "#fdbb84",
        "description": "Surface char on litter, minimal crown or overstory scorch."
    },
    {
        "category": "Unburned / Low Change",
        "min_dnbr": -0.100,
        "color": "#2ca25f",
        "description": "No detectable fire damage or enhanced post-event vegetation regrowth."
    },
]

def classify_dnbr(dnbr: Optional[float]) -> Dict[str, Any]:
    """Classifies a scalar delta-NBR value according to USGS FIREMON standards.
    Parity implementation with frontend classifyDnbr() in constants.js.
    """
    if dnbr is None or (isinstance(dnbr, (float, int)) and math.isnan(dnbr)):
        return FIREMON_THRESHOLDS[-1]
    for level in FIREMON_THRESHOLDS:
        if dnbr >= level["min_dnbr"]:
            return level
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

# ============================================================================
# CONTRACT 3: INTERACTIVE PIXEL PROBE SCHEMAS
# ============================================================================

class PixelCoordinates(BaseModel):
    """Geographic point coordinates for coordinate probing."""
    latitude: float = Field(..., description="Latitude coordinate in WGS84")
    longitude: float = Field(..., description="Longitude coordinate in WGS84")

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

