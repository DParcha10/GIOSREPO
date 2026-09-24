"""Geotechnical Defect Annotations, Maintenance Work Orders, and AOI Subscriptions Routes."""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    DefectCategory,
    DefectSeverity,
    DefectStatus,
    GeotechnicalAnnotation,
    CreateAnnotationRequest,
    UpdateAnnotationStatusRequest,
    MaintenanceWorkOrder,
    CreateWorkOrderRequest,
    SubscriptionTriggerType,
    NotificationChannel,
    AOISubscriptionRequest,
    AOISubscriptionResponse,
    annotation_to_geojson_feature,
    annotations_to_feature_collection,
    parse_bbox
)

annotations_router = APIRouter(prefix="/annotations", tags=["Geotechnical Defect Annotations"])
work_orders_router = APIRouter(prefix="/work-orders", tags=["Maintenance Work Orders"])
subscriptions_router = APIRouter(prefix="/subscriptions", tags=["Automated AOI Subscriptions"])

# ============================================================================
# IN-MEMORY DATA STORES (Station & Field Initial Baselines)
# ============================================================================

_ANNOTATIONS_DB: Dict[str, GeotechnicalAnnotation] = {
    "ANN-001": GeotechnicalAnnotation(
        annotation_id="ANN-001",
        title="Right Abutment Seepage Boil",
        category=DefectCategory.SEEPAGE_BOIL,
        severity=DefectSeverity.HIGH,
        status=DefectStatus.OPEN,
        lat=37.0562,
        lng=-121.0778,
        elevation_m=218.4,
        asset_id="SAN-LUIS-DAM",
        drone_ortho_id="DRONE-SLD-2026-08",
        photo_urls=["/static/photos/seepage_boil_01.jpg"],
        notes="Turbid discharge detected at downstream toe berm; estimated flow 12 gpm. Sand boils forming along riprap.",
        inspector="Field Engineer (Civil/Geotech)",
        created_at="2026-08-20T14:30:00Z",
        updated_at="2026-08-20T14:30:00Z"
    ),
    "ANN-002": GeotechnicalAnnotation(
        annotation_id="ANN-002",
        title="Spillway Approach Crest Longitudinal Crack",
        category=DefectCategory.CREST_CRACK,
        severity=DefectSeverity.MODERATE,
        status=DefectStatus.INVESTIGATING,
        lat=37.0614,
        lng=-121.0691,
        elevation_m=245.8,
        asset_id="SAN-LUIS-DAM",
        drone_ortho_id="DRONE-SLD-2026-08",
        photo_urls=["/static/photos/crest_crack_02.jpg"],
        notes="15m longitudinal tension crack along asphalt crest roadway. Width 12mm, depth 45mm. Settlement monitoring active.",
        inspector="Senior Dam Safety Officer",
        created_at="2026-08-18T10:15:00Z",
        updated_at="2026-08-21T09:00:00Z"
    )
}

_WORK_ORDERS_DB: Dict[str, MaintenanceWorkOrder] = {
    "WO-001": MaintenanceWorkOrder(
        work_order_id="WO-001",
        annotation_id="ANN-001",
        asset_id="SAN-LUIS-DAM",
        priority=DefectSeverity.HIGH,
        description="Install inverted filter ring and gravel toe drain berm to arrest piping at Right Abutment Seepage Boil.",
        assigned_crew="Civil Earthworks Maintenance Crew B",
        target_completion_date="2026-09-30",
        status="dispatched",
        estimated_hours=48.0,
        created_at="2026-08-21T11:00:00Z"
    )
}

_SUBSCRIPTIONS_DB: Dict[str, AOISubscriptionResponse] = {
    "SUB-001": AOISubscriptionResponse(
        subscription_id="SUB-001",
        name="San Luis Dam Crest & Downstream Toe Watchdog",
        asset_id="SAN-LUIS-DAM",
        collection="sentinel-2-l2a",
        indices=["ndmi", "ndvi"],
        trigger_type=SubscriptionTriggerType.Z_SCORE_ANOMALY,
        z_score_threshold=2.5,
        channels=["in_app_alert", "webhook"],
        webhook_url="https://api.gios.internal/webhooks/dam-safety",
        is_active=True,
        created_at="2026-08-01T00:00:00Z",
        last_checked_at="2026-09-23T18:00:00Z",
        alerts_triggered_count=2
    )
}


# ============================================================================
# GEOTECHNICAL DEFECT ANNOTATIONS ENDPOINTS
# ============================================================================

@annotations_router.get("", response_model=List[GeotechnicalAnnotation])
def list_annotations(
    asset_id: Optional[str] = Query(None, description="Filter by infrastructure asset ID"),
    category: Optional[str] = Query(None, description="Filter by defect category"),
    severity: Optional[str] = Query(None, description="Filter by risk severity tier"),
    status: Optional[str] = Query(None, description="Filter by workflow state")
):
    """Lists registered geotechnical defect annotations with optional filtering."""
    results = list(_ANNOTATIONS_DB.values())
    if asset_id:
        results = [a for a in results if a.asset_id.lower() == asset_id.lower()]
    if category:
        results = [a for a in results if a.category.value == category or str(a.category) == category]
    if severity:
        results = [a for a in results if a.severity.value == severity or str(a.severity) == severity]
    if status:
        results = [a for a in results if a.status.value == status or str(a.status) == status]
    return results

@annotations_router.get("/geojson")
def list_annotations_geojson(
    asset_id: Optional[str] = None,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None
):
    """Returns defect annotations as an RFC 7946 GeoJSON FeatureCollection."""
    anns = list_annotations(asset_id, category, severity, status)
    return annotations_to_feature_collection(anns)

@annotations_router.post("", response_model=GeotechnicalAnnotation)
def create_annotation(req: CreateAnnotationRequest):
    """Registers a new geotechnical defect observation with coordinate pinning."""
    ann_id = f"ANN-{uuid.uuid4().hex[:6].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_ann = GeotechnicalAnnotation(
        annotation_id=ann_id,
        title=req.title,
        category=req.category,
        severity=req.severity,
        status=DefectStatus.OPEN,
        lat=req.lat,
        lng=req.lng,
        elevation_m=req.elevation_m,
        asset_id=req.asset_id,
        drone_ortho_id=req.drone_ortho_id,
        photo_urls=req.photo_urls or [],
        notes=req.notes or "",
        inspector=req.inspector or "Field Engineer",
        created_at=now_iso,
        updated_at=now_iso
    )
    _ANNOTATIONS_DB[ann_id] = new_ann
    return new_ann

@annotations_router.get("/{annotation_id}", response_model=GeotechnicalAnnotation)
def get_annotation(annotation_id: str):
    """Retrieves specific geotechnical defect annotation details."""
    ann = _ANNOTATIONS_DB.get(annotation_id)
    if not ann:
        raise HTTPException(status_code=404, detail=f"Annotation '{annotation_id}' not found.")
    return ann

@annotations_router.patch("/{annotation_id}", response_model=GeotechnicalAnnotation)
def update_annotation_status(annotation_id: str, req: UpdateAnnotationStatusRequest):
    """Updates defect annotation workflow state and appends inspection notes."""
    ann = _ANNOTATIONS_DB.get(annotation_id)
    if not ann:
        raise HTTPException(status_code=404, detail=f"Annotation '{annotation_id}' not found.")

    updated_notes = ann.notes
    if req.notes:
        updated_notes = f"{ann.notes}\n[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}] {req.notes}".strip()

    updated = GeotechnicalAnnotation(
        annotation_id=ann.annotation_id,
        title=ann.title,
        category=ann.category,
        severity=ann.severity,
        status=req.status,
        lat=ann.lat,
        lng=ann.lng,
        elevation_m=ann.elevation_m,
        asset_id=ann.asset_id,
        drone_ortho_id=ann.drone_ortho_id,
        photo_urls=ann.photo_urls,
        notes=updated_notes,
        inspector=ann.inspector,
        created_at=ann.created_at,
        updated_at=datetime.now(timezone.utc).isoformat()
    )
    _ANNOTATIONS_DB[annotation_id] = updated
    return updated


# ============================================================================
# MAINTENANCE WORK ORDERS ENDPOINTS
# ============================================================================

@work_orders_router.get("", response_model=List[MaintenanceWorkOrder])
def list_work_orders(
    asset_id: Optional[str] = Query(None, description="Filter by asset ID"),
    status: Optional[str] = Query(None, description="Filter by order status"),
    priority: Optional[str] = Query(None, description="Filter by priority tier")
):
    """Lists dispatched maintenance work orders."""
    results = list(_WORK_ORDERS_DB.values())
    if asset_id:
        results = [w for w in results if w.asset_id.lower() == asset_id.lower()]
    if status:
        results = [w for w in results if w.status.lower() == status.lower()]
    if priority:
        results = [w for w in results if w.priority.value == priority or str(w.priority) == priority]
    return results

@work_orders_router.post("", response_model=MaintenanceWorkOrder)
def create_work_order(req: CreateWorkOrderRequest):
    """Issues and dispatches an actionable maintenance work order linked to an annotation."""
    wo_id = f"WO-{uuid.uuid4().hex[:6].upper()}"
    ann = _ANNOTATIONS_DB.get(req.annotation_id)
    asset_id = ann.asset_id if ann else "ASSET-GENERAL"

    new_wo = MaintenanceWorkOrder(
        work_order_id=wo_id,
        annotation_id=req.annotation_id,
        asset_id=asset_id,
        priority=req.priority,
        description=req.description,
        assigned_crew=req.assigned_crew or "Geotechnical Repair Crew",
        target_completion_date=req.target_completion_date,
        status="dispatched",
        estimated_hours=req.estimated_hours,
        created_at=datetime.now(timezone.utc).isoformat()
    )
    _WORK_ORDERS_DB[wo_id] = new_wo

    # If annotation exists, advance workflow to work_order_issued
    if ann and ann.status in {DefectStatus.OPEN, DefectStatus.INVESTIGATING}:
        _ANNOTATIONS_DB[req.annotation_id] = GeotechnicalAnnotation(
            annotation_id=ann.annotation_id,
            title=ann.title,
            category=ann.category,
            severity=ann.severity,
            status=DefectStatus.WORK_ORDER_ISSUED,
            lat=ann.lat,
            lng=ann.lng,
            elevation_m=ann.elevation_m,
            asset_id=ann.asset_id,
            drone_ortho_id=ann.drone_ortho_id,
            photo_urls=ann.photo_urls,
            notes=f"{ann.notes}\n[Work Order {wo_id} dispatched]",
            inspector=ann.inspector,
            created_at=ann.created_at,
            updated_at=datetime.now(timezone.utc).isoformat()
        )

    return new_wo


# ============================================================================
# AUTOMATED AOI MONITORING SUBSCRIPTIONS ENDPOINTS
# ============================================================================

@subscriptions_router.get("", response_model=List[AOISubscriptionResponse])
def list_subscriptions():
    """Lists all active automated continuous satellite monitoring subscriptions."""
    return list(_SUBSCRIPTIONS_DB.values())

@subscriptions_router.post("", response_model=AOISubscriptionResponse)
def create_subscription(req: AOISubscriptionRequest):
    """Creates a continuous satellite anomaly monitoring subscription over an AOI."""
    sub_id = f"SUB-{uuid.uuid4().hex[:6].upper()}"
    col_str = req.collection.value if hasattr(req.collection, "value") else str(req.collection).lower().strip()
    idx_strs = [i.value if hasattr(i, "value") else str(i).lower().strip() for i in req.indices]
    channel_strs = [c.value if hasattr(c, "value") else str(c).lower().strip() for c in req.channels]

    sub = AOISubscriptionResponse(
        subscription_id=sub_id,
        name=req.name,
        asset_id=req.asset_id,
        collection=col_str,
        indices=idx_strs,
        trigger_type=req.trigger_type,
        z_score_threshold=req.z_score_threshold,
        channels=channel_strs,
        webhook_url=req.webhook_url,
        is_active=req.is_active,
        created_at=datetime.now(timezone.utc).isoformat(),
        last_checked_at=None,
        alerts_triggered_count=0
    )
    _SUBSCRIPTIONS_DB[sub_id] = sub
    return sub

@subscriptions_router.get("/{subscription_id}", response_model=AOISubscriptionResponse)
def get_subscription(subscription_id: str):
    """Retrieves specific AOI monitoring subscription details."""
    sub = _SUBSCRIPTIONS_DB.get(subscription_id)
    if not sub:
        raise HTTPException(status_code=404, detail=f"Subscription '{subscription_id}' not found.")
    return sub

@subscriptions_router.delete("/{subscription_id}")
def delete_subscription(subscription_id: str):
    """Deletes or cancels an AOI monitoring subscription."""
    if subscription_id not in _SUBSCRIPTIONS_DB:
        raise HTTPException(status_code=404, detail=f"Subscription '{subscription_id}' not found.")
    del _SUBSCRIPTIONS_DB[subscription_id]
    return {"status": "deleted", "subscription_id": subscription_id}
