from fastapi import APIRouter, HTTPException
from typing import Optional
from app.services.event_service import event_service
from app.models.schemas import EventResponse, EventCreateRequest, HazardEventDetail

router = APIRouter(prefix="/events", tags=["Hazard Events Database"])

@router.get("", response_model=EventResponse)
def list_hazard_events(category: Optional[str] = None):
    evts = event_service.list_events(category)
    return {"events": evts, "total_count": len(evts)}

@router.get("/{event_id}", response_model=HazardEventDetail)
def get_hazard_event(event_id: str):
    evt = event_service.get_event(event_id)
    if not evt:
        raise HTTPException(status_code=404, detail="Hazard event not found")
    return evt

@router.post("", response_model=HazardEventDetail)
def create_hazard_event(event: EventCreateRequest):
    return event_service.add_event(event.dict())
