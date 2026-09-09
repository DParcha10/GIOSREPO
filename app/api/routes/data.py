from fastapi import APIRouter
from app.models.schemas import SearchParams, SearchResponse
from app.services.data_acquisition import data_acquisition_service

router = APIRouter(prefix="/data", tags=["Data Acquisition"])

@router.post("/search", response_model=SearchResponse)
def search_satellite_scenes(params: SearchParams):
    scenes = data_acquisition_service.search_scenes(
        bbox=params.bbox,
        start_date=params.start_date,
        end_date=params.end_date,
        collection=params.collection.value,
        max_cloud=params.max_cloud_cover
    )
    return {"count": len(scenes), "scenes": scenes}
