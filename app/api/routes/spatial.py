import math
from typing import Dict, Any, List, Optional, Union
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    SpatialBufferRequest,
    SpatialBufferResponse,
    GeoJSONFeatureCollection,
    SpatialLayerType,
    SpatialLayerMetadata,
    get_spatial_layer_metadata,
    list_spatial_layer_types,
    calculate_polygon_centroid,
    calculate_haversine_distance
)
from app.services.drone_service import drone_service

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
            center_lon, center_lat = float(coords[0]), float(coords[1])
    elif geom_type == "Polygon":
        c_lat, c_lon = calculate_polygon_centroid(geometry)
        center_lat, center_lon = c_lat, c_lon
    
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

@router.get("/layers", response_model=List[SpatialLayerMetadata])
def list_vector_layer_catalog():
    """Lists metadata specifications for all registered GIS vector layer types."""
    return list_spatial_layer_types()

@router.get("/layers/{layer_id}/metadata", response_model=SpatialLayerMetadata)
def get_vector_layer_metadata(layer_id: str):
    """Retrieves metadata specification for a specific vector layer."""
    meta = get_spatial_layer_metadata(layer_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Layer '{layer_id}' not found in spatial registry.")
    return meta

@router.get("/layers/{layer_id}", response_model=GeoJSONFeatureCollection)
def get_vector_layer(layer_id: str):
    """
    Serves dynamic GeoJSON vector layers from the GIOS spatial database matching SpatialLayerType.
    """
    col_clean = str(layer_id).lower().strip()
    if col_clean in {"critical_infrastructure", SpatialLayerType.CRITICAL_INFRASTRUCTURE.value}:
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
    elif col_clean in {"sensor_grid", SpatialLayerType.SENSOR_GRID.value}:
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
                },
                {
                    "type": "Feature",
                    "properties": {"id": "USGS-11262900", "name": "USGS 11262900 San Luis Creek", "type": "usgs_streamgage", "status": "active"},
                    "geometry": {"type": "Point", "coordinates": [-121.0700, 37.0550]}
                }
            ]
        }
    elif col_clean in {"hazard_zones", SpatialLayerType.HAZARD_ZONES.value}:
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "id": "HAZ-SEEP-01",
                        "name": "San Luis Dam Toe Embankment Seepage Perimeter",
                        "hazard_type": "Dam Embankment Seepage",
                        "severity": "CRITICAL",
                        "peak_zscore": "+3.12 σ",
                        "impact_area_ha": 384.2
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-121.0820, 37.0520],
                            [-121.0650, 37.0520],
                            [-121.0650, 37.0620],
                            [-121.0820, 37.0620],
                            [-121.0820, 37.0520]
                        ]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "id": "HAZ-FIRE-02",
                        "name": "Mill Creek Wildfire Burn Scar Perimeter",
                        "hazard_type": "Wildfire Burn Scar",
                        "severity": "HIGH",
                        "peak_zscore": "+2.84 σ",
                        "impact_area_ha": 1420.5
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-121.6500, 39.8500],
                            [-121.5800, 39.8500],
                            [-121.5800, 39.9200],
                            [-121.6500, 39.9200],
                            [-121.6500, 39.8500]
                        ]]
                    }
                }
            ]
        }
    elif col_clean in {"drone_flight_bounds", SpatialLayerType.DRONE_FLIGHT_BOUNDS.value}:
        features = [
            {
                "type": "Feature",
                "properties": {
                    "ortho_id": "DRN-ORTHO-01",
                    "name": "San Luis Dam Toe Micro-Inspection Footprint",
                    "gsd": "2.80 cm/px",
                    "status": "COMPLETED",
                    "sensor": "RGB + LiDAR"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-121.0760, 37.0560],
                        [-121.0720, 37.0560],
                        [-121.0720, 37.0600],
                        [-121.0760, 37.0600],
                        [-121.0760, 37.0560]
                    ]]
                }
            }
        ]
        for m_id, m in list(drone_service.active_missions.items()):
            path = m.get("flight_path")
            if path and len(path) >= 2:
                coords = [[float(pt[1]), float(pt[0])] for pt in path]
                features.append({
                    "type": "Feature",
                    "properties": {
                        "mission_id": m_id,
                        "event_id": m.get("event_id"),
                        "name": f"UAS Mission {m_id}",
                        "status": m.get("status"),
                        "total_distance_km": m.get("total_distance_km"),
                        "planned_gsd": m.get("gsd_display")
                    },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coords
                    }
                })
        return {
            "type": "FeatureCollection",
            "features": features
        }
    return {"type": "FeatureCollection", "features": []}

