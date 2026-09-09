"""GIOS Platform Configuration Settings."""
import os
from typing import List, Tuple
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "GIOS - Geospatial Integrated Orthomosaic Systems"
    app_version: str = "1.0.0"
    debug: bool = True
    
    # STAC & Earth Observation Catalogs
    stac_api_url: str = "https://planetarycomputer.microsoft.com/api/stac/v1"
    planetary_computer_key: str = ""
    default_collection: str = "sentinel-2-l2a"
    max_cloud_cover: float = 30.0
    
    # In-Situ Sensor APIs
    noaa_api_url: str = "https://api.weather.gov"
    usgs_water_api_url: str = "https://waterservices.usgs.gov/nwis/iv"
    
    # Cache & Local Storage
    cache_dir: str = ".gios_cache"
    cache_ttl_seconds: int = 3600
    upload_dir: str = "data/uploads"
    events_db_file: str = "data/hazard_events.json"
    
    # Default Spatial Extent (San Luis Basin / Central Valley, CA)
    default_bbox: Tuple[float, float, float, float] = (-121.2, 36.95, -120.95, 37.15)
    
    # CORS Origins
    cors_origins: List[str] = ["*"]
    
    class Config:
        env_prefix = "GIOS_"
        case_sensitive = False

settings = Settings()
os.makedirs(settings.cache_dir, exist_ok=True)
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(os.path.dirname(settings.events_db_file), exist_ok=True)
