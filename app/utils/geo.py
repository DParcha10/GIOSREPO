"""Geospatial utilities for BBoxes, polygons, and CRS transformations."""
from typing import Tuple, Dict, Any
import math

def bbox_to_geojson(bbox: Tuple[float, float, float, float]) -> Dict[str, Any]:
    min_lon, min_lat, max_lon, max_lat = bbox
    return {
        "type": "Polygon",
        "coordinates": [[
            [min_lon, min_lat],
            [max_lon, min_lat],
            [max_lon, max_lat],
            [min_lon, max_lat],
            [min_lon, min_lat]
        ]]
    }

def calculate_bbox_area_km2(bbox: Tuple[float, float, float, float]) -> float:
    min_lon, min_lat, max_lon, max_lat = bbox
    lat_mid = (min_lat + max_lat) / 2.0
    lat_dist_km = (max_lat - min_lat) * 111.0
    lon_dist_km = (max_lon - min_lon) * 111.0 * math.cos(math.radians(lat_mid))
    return round(abs(lat_dist_km * lon_dist_km), 2)
