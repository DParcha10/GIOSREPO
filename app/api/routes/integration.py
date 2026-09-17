from fastapi import APIRouter
from app.models.schemas import USGSStationData
from app.services.integration import integration_service

router = APIRouter(prefix="/integration", tags=["In-Situ Sensor Integration"])

@router.get("/usgs/{site_id}", response_model=USGSStationData)
async def get_usgs_gauge(site_id: str):
    return await integration_service.get_usgs_station(site_id)
