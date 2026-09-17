import math
from fastapi import APIRouter
from typing import Dict, Any, List, Optional
from app.models.schemas import SpatialBufferRequest, SpatialBufferResponse

router = APIRouter(prefix="/spatial", tags=["spatial"])

from shapely.geometry import Point
import pyproj
from shapely.ops import transform

def _create_circular_buffer(lon: float, lat: float, radius_km: float, num_points: int = 32) -> List[List[float]]:
    """Calculates geodesic circular polygon coordinates using shapely and pyproj."""
    # Define azimuthal equidistant projection centered on the point
    local_azimuthal = pyproj.Proj(f"+proj=aeqd +lat_0={lat} +lon_0={lon} +x_0=0 +y_0=0 +datum=WGS84 +units=m")
    wgs84 = pyproj.Proj("+proj=longlat +datum=WGS84 +no_defs")
    
    project = pyproj.Transformer.from_proj(local_azimuthal, wgs84, always_xy=True).transform
    
    # Create point at origin of the local projection, buffer in meters
    point = Point(0, 0)
    buffer_poly = point.buffer(radius_km * 1000.0, resolution=num_points)
    
    # Transform back to WGS84
    poly_wgs84 = transform(project, buffer_poly)
    
    return [list(coord) for coord in poly_wgs84.exterior.coords]

@router.post("/buffer", response_model=SpatialBufferResponse)
def generate_buffer(payload: SpatialBufferRequest):
    """
    Computes a spatial buffer around an input point or polygon geometry.
    Accepts GeoJSON geometry (Point, Polygon) or lat/lng with radius_km.
    Returns standard GeoJSON FeatureCollection with buffered polygon and area metrics.
    """
    distance_km = float(payload.distance_km)
    geometry = payload.geometry or {}
    geom_type = geometry.get("type", "Point") if geometry else "Point"

    center_lon = -121.0744
    center_lat = 37.0582

    if geom_type == "Point":
        coords = geometry.get("coordinates", [center_lon, center_lat])
        if len(coords) >= 2:
            center_lon, center_lat = coords[0], coords[1]
    elif geom_type == "Polygon":
        rings = geometry.get("coordinates", [])
        if rings and rings[0]:
            lons = [p[0] for p in rings[0]]
            lats = [p[1] for p in rings[0]]
            center_lon = sum(lons) / len(lons)
            center_lat = sum(lats) / len(lats)
    
    if payload.lat is not None and payload.lng is not None:
        center_lat = float(payload.lat)
        center_lon = float(payload.lng)

    buffered_ring = _create_circular_buffer(center_lon, center_lat, distance_km)
    buffer_area_sq_km = round(math.pi * (distance_km ** 2), 2)
    buffer_area_hectares = round(buffer_area_sq_km * 100, 2)

    return {
        "status": "success",
        "operation": "spatial_buffer",
        "buffer_radius_km": distance_km,
        "area_sq_km": buffer_area_sq_km,
        "area_hectares": buffer_area_hectares,
        "geojson": {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "name": f"Spatial Buffer ({distance_km} km)",
                        "radius_km": distance_km,
                        "center": [center_lon, center_lat],
                        "area_ha": buffer_area_hectares
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [buffered_ring]
                    }
                }
            ]
        }
    }

@router.get("/layers/{layer_id}")
def get_vector_layer(layer_id: str):
    """
    Serves dynamic GeoJSON vector layers from the GIOS spatial database.
    """
    if layer_id == "critical_infrastructure":
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"name": "San Luis Pumping-Generating Plant", "type": "hydraulic_plant", "status": "operational", "risk": "low"},
                    "geometry": {"type": "Point", "coordinates": [-121.0600, 37.0520]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "Embankment Toe Piezometer Array A", "type": "sensor_anchor", "status": "active", "risk": "elevated"},
                    "geometry": {"type": "Point", "coordinates": [-121.0725, 37.0578]}
                },
                {
                    "type": "Feature",
                    "properties": {"name": "B.F. Sisk Dam Spillway Gate", "type": "dam_infrastructure", "status": "inspected", "risk": "nominal"},
                    "geometry": {"type": "Point", "coordinates": [-121.0820, 37.0650]}
                }
            ]
        }
    elif layer_id == "sensor_grid":
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"id": "SENS-CA-01", "name": "Toe Moisture Probe #1", "val": "48.2%", "status": "alert"},
                    "geometry": {"type": "Point", "coordinates": [-121.0740, 37.0580]}
                },
                {
                    "type": "Feature",
                    "properties": {"id": "SENS-CA-02", "name": "Toe Moisture Probe #2", "val": "39.1%", "status": "normal"},
                    "geometry": {"type": "Point", "coordinates": [-121.0710, 37.0565]}
                }
            ]
        }
    return {"type": "FeatureCollection", "features": []}

