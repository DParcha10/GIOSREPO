# app/api/routes/satellite.py

"""FastAPI routes exposing satellite data integration services.
These endpoints wrap the placeholder async functions in
`app.services.satellite_integration`. In a production system you would
replace the placeholder logic with real calls to the Google Earth Engine
Python API and the Sentinel Hub SDK.
"""

from fastapi import APIRouter, Query
from typing import Tuple
from app.models.schemas import GEEImageResponse, SentinelHubTileResponse
from app.services.satellite_integration import (
    get_gee_image,
    get_sentinel_hub_tile,
)

router = APIRouter(prefix="/satellite", tags=["Satellite Data Integration"])

@router.get("/gee", response_model=GEEImageResponse)
async def gee_image(
    collection: str = Query(..., description="Earth Engine collection ID"),
    start_date: str = Query(..., description="ISO start date, e.g. 2023-01-01"),
    end_date: str = Query(..., description="ISO end date, e.g. 2023-01-31"),
    bbox: Tuple[float, float, float, float] = Query(
        ..., description="Bounding box as west,south,east,north"
    ),
):
    """Return metadata (and eventually a preview URL) for a GEE image collection.
    """
    return await get_gee_image(collection, start_date, end_date, bbox)

@router.get("/sentinel", response_model=SentinelHubTileResponse)
async def sentinel_tile(
    collection: str = Query(..., description="Sentinel Hub collection ID"),
    date: str = Query(..., description="ISO date for the tile, e.g. 2023-01-15"),
    bbox: Tuple[float, float, float, float] = Query(
        ..., description="Bounding box as west,south,east,north"
    ),
    zoom: int = Query(12, description="Tile zoom level"),
):
    """Return a mock tile URL for Sentinel Hub.
    """
    return await get_sentinel_hub_tile(collection, date, bbox, zoom)
