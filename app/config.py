import os
from typing import List, Tuple
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="GIOS_", case_sensitive=False, extra="ignore")

    app_name: str = "GIOS - Geospatial Integrated Orthomosaic Systems"
    app_version: str = "2.5.0"
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
    tile_cache_dir: str = ".gios_cache/tiles"
    cache_ttl_seconds: int = 3600
    upload_dir: str = "data/uploads"
    drone_upload_dir: str = "data/drone_orthos"
    events_db_file: str = "data/hazard_events.json"
    
    # Tile Server & Symbology Defaults
    default_colormap: str = "spectral"
    default_rescale: str = "-0.2,0.6"
    tile_size_px: int = 256
    max_drone_zoom: int = 24
    
    # Scientific Calibration Constants
    sentinel2_pb_offset_date: str = "2022-01-25"
    sentinel2_pb_offset_dn: int = 1000
    climatology_z_threshold: float = 2.5
    
    # Default Spatial Extent (San Luis Basin / Central Valley, CA)
    default_bbox: Tuple[float, float, float, float] = (-121.2, 36.95, -120.95, 37.15)
    
    # CORS Origins
    cors_origins: List[str] = ["*"]

settings = Settings()
os.makedirs(settings.cache_dir, exist_ok=True)
os.makedirs(settings.tile_cache_dir, exist_ok=True)
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.drone_upload_dir, exist_ok=True)
os.makedirs(os.path.dirname(settings.events_db_file), exist_ok=True)

