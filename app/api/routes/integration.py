from fastapi import APIRouter
from app.services.integration import integration_service

router = APIRouter(prefix="/integration", tags=["In-Situ Sensor Integration"])

@router.get("/usgs/{site_id}")
async def get_usgs_gauge(site_id: str):
    return await integration_service.get_usgs_station(site_id)
