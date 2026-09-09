"""GIOS Data Models, Enums, and Pydantic Schemas."""
from enum import Enum
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field

class SatelliteCollection(str, Enum):
    SENTINEL_2 = "sentinel-2-l2a"
    LANDSAT_C2_L2 = "landsat-c2-l2"
    DRONE_ORTHO = "drone-ortho"

class SpectralIndex(str, Enum):
    NDVI = "ndvi"
    NDMI = "ndmi"
    NDCI = "ndci"
    MNDWI = "mndwi"
    LST = "lst"
    NBR = "nbr"
    EVI = "evi"

class HazardCategory(str, Enum):
    SEEPAGE = "seepage"
    INUNDATION = "inundation"
    HAB = "hab"
    DROUGHT = "drought"
    WILDFIRE = "wildfire"

class HazardSeverity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    MODERATE = "moderate"
    LOW = "low"

# Request Schemas
class SearchParams(BaseModel):
    bbox: Tuple[float, float, float, float] = Field(..., description="[min_lon, min_lat, max_lon, max_lat]")
    start_date: str = Field(..., description="YYYY-MM-DD")
    end_date: str = Field(..., description="YYYY-MM-DD")
    collection: SatelliteCollection = SatelliteCollection.SENTINEL_2
    max_cloud_cover: float = Field(default=30.0, ge=0.0, le=100.0)

class IndexRequest(BaseModel):
    bbox: Tuple[float, float, float, float]
    start_date: str
    end_date: str
    index: SpectralIndex = SpectralIndex.NDMI
    collection: SatelliteCollection = SatelliteCollection.SENTINEL_2
    resolution: Optional[float] = Field(default=10.0, description="Spatial resolution in meters")

class ZonalStatsRequest(BaseModel):
    geojson_geometry: Dict[str, Any]
    index: SpectralIndex
    start_date: str
    end_date: str
    collection: SatelliteCollection = SatelliteCollection.SENTINEL_2

class TrendRequest(BaseModel):
    bbox: Tuple[float, float, float, float]
    index: SpectralIndex
    start_date: str
    end_date: str
    frequency: str = Field(default="monthly", description="monthly | biweekly")

class EventCreateRequest(BaseModel):
    id: str
    title: str
    subtitle: str
    category: HazardCategory
    severity: HazardSeverity
    severity_label: str
    lat: float
    lng: float
    zoom: int = 13
    metric: SpectralIndex
    sensor: SatelliteCollection = SatelliteCollection.SENTINEL_2
    start_date: str
    end_date: str
    usgs_station: Optional[str] = None
    station_name: Optional[str] = None
    impact_area: str
    peak_zscore: str
    hazard_type: str
    drone_status: str
    description: str

class DroneUploadMetadata(BaseModel):
    mission_name: str
    sensor_payload: str
    altitude_m: Optional[float] = 60.0
    estimated_gsd_cm: Optional[float] = 3.0

# Response Schemas
class HealthResponse(BaseModel):
    status: str
    version: str
    active_services: List[str]

class SceneMetadata(BaseModel):
    id: str
    datetime: str
    cloud_cover: float
    collection: str
    thumbnail_url: Optional[str] = None

class SearchResponse(BaseModel):
    count: int
    scenes: List[SceneMetadata]

class IndexResultSummary(BaseModel):
    index: str
    mean: float
    median: float
    min: float
    max: float
    std: float
    valid_pixels: int
    timestamp: str

class TimeSeriesPoint(BaseModel):
    date: str
    value: float
    baseline_median: float
    z_score: float
    is_anomaly: bool

class TimeSeriesResponse(BaseModel):
    index: str
    slope_per_month: float
    anomaly_count: int
    data_points: List[TimeSeriesPoint]

class EventResponse(BaseModel):
    events: List[Dict[str, Any]]
    total_count: int

class DroneMissionResponse(BaseModel):
    mission_id: str
    filename: str
    gsd_cm: float
    bbox: Tuple[float, float, float, float]
    bands: int
    is_cog: bool
    status: str
