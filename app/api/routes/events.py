from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict, Any, Union
from app.services.event_service import event_service
from app.services.alerting import alert_engine
from app.models.schemas import (
    EventResponse,
    EventCreateRequest,
    HazardEventDetail,
    GeoJSONFeature,
    GeoJSONFeatureCollection,
    hazard_event_to_geojson_feature,
    hazard_events_to_feature_collection,
    HazardAlertSubscriptionRequest,
    HazardAlertEvent,
    HazardAlertDispatchResponse
)

router = APIRouter(prefix="/events", tags=["Hazard Events Database"])
alerts_router = APIRouter(prefix="/alerts", tags=["Multi-Hazard Early Warning Alerts"])

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


# ============================================================================
# T-121: MULTI-HAZARD EARLY-WARNING ALERT SUBSCRIPTIONS, DISPATCH & SSE STREAM
# ============================================================================

@alerts_router.post("/subscriptions")
@router.post("/alerts/subscriptions", include_in_schema=False)
def create_alert_subscription(req: HazardAlertSubscriptionRequest):
    """Subscribes an endpoint/channel to real-time multi-hazard early warning alerts."""
    return alert_engine.subscribe(req)


@alerts_router.get("/subscriptions")
@router.get("/alerts/subscriptions", include_in_schema=False)
def get_alert_subscriptions():
    """Lists all active multi-hazard early warning alert subscriptions."""
    return alert_engine.list_subscriptions()


@alerts_router.post("/dispatch", response_model=HazardAlertDispatchResponse)
@router.post("/alerts/dispatch", response_model=HazardAlertDispatchResponse, include_in_schema=False)
def dispatch_hazard_alert_endpoint(req: Union[HazardAlertEvent, Dict[str, Any]]):
    """Triggers and dispatches a multi-hazard alert notification across configured channels."""
    return alert_engine.dispatch_hazard_alert(req)


@alerts_router.get("/stream")
@router.get("/alerts/stream", include_in_schema=False)
async def stream_hazard_alerts():
    """Server-Sent Events (SSE) live stream for real-time multi-hazard telemetry and alerts."""
    return StreamingResponse(
        alert_engine.stream_alerts(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

