from fastapi import APIRouter, HTTPException
from typing import Optional
from app.services.event_service import event_service
from app.models.schemas import (
    EventResponse,
    EventCreateRequest,
    HazardEventDetail,
    GeoJSONFeature,
    GeoJSONFeatureCollection,
    hazard_event_to_geojson_feature,
    hazard_events_to_feature_collection
)

router = APIRouter(prefix="/events", tags=["Hazard Events Database"])

@router.get("", response_model=EventResponse)
def list_hazard_events(category: Optional[str] = None):
    evts = event_service.list_events(category)
    return {"events": evts, "total_count": len(evts)}

@router.get("/geojson", response_model=GeoJSONFeatureCollection)
def list_hazard_events_geojson(category: Optional[str] = None):
    """Returns registered hazard events as a standardized GeoJSON FeatureCollection."""
    evts = event_service.list_events(category)
    return hazard_events_to_feature_collection(evts)

@router.get("/{event_id}", response_model=HazardEventDetail)
def get_hazard_event(event_id: str):
    evt = event_service.get_event(event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Hazard event not found")
    return evt

@router.get("/{event_id}/geojson", response_model=GeoJSONFeature)
def get_hazard_event_geojson(event_id: str):
    """Returns a specific hazard event formatted as a GeoJSON Feature."""
    evt = event_service.get_event(event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Hazard event not found")
    return hazard_event_to_geojson_feature(evt)

@router.post("", response_model=HazardEventDetail)
def create_hazard_event(event: EventCreateRequest):
    return event_service.add_event(event.dict())
