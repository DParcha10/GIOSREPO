"""Drone fleet, mission management, and centimeter-scale orthomosaic tile endpoints."""
import os
import shutil
from typing import Optional, Dict, Any, List, Union
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Response
from app.services.drone_service import drone_service
from app.models.schemas import (
    DroneMissionResponse,
    DroneUploadMetadata,
    DroneRegisterRequest,
    DroneScheduleMissionRequest,
    DroneUploadResponse,
    DroneMissionScheduleResponse,
    DroneMissionsListResponse,
    DroneOrthomosaicsListResponse,
    GCPRole,
    GCPTargetType,
    GCPCoordinate,
    GCPResidual,
    RMSEMetrics,
    CameraInteriorOrientation,
    GCPQualityAssessmentRequest,
    GCPQualityAssessmentResponse,
    calculate_gcp_residuals_and_rmse,
    gcp_to_geojson_feature,
    gcps_to_feature_collection,
    CAMERA_CALIBRATION_PRESETS,
    get_camera_calibration_preset,
    list_camera_calibration_presets
)

router = APIRouter(prefix="/drone", tags=["Drone Fleet"])

DEFAULT_CAMERA_CALIBRATIONS: Dict[str, CameraInteriorOrientation] = {
    **CAMERA_CALIBRATION_PRESETS,
    "DJI-ZENMUSE-P1-01": CameraInteriorOrientation(
        camera_id="DJI-ZENMUSE-P1-01",
        focal_length_mm=35.0,
        focal_length_px=7954.5,
        principal_point_x_px=4096.0,
        principal_point_y_px=2730.0,
        radial_distortion_k1=-0.012,
        radial_distortion_k2=0.005,
        radial_distortion_k3=0.0,
        tangential_distortion_p1=0.0001,
        tangential_distortion_p2=-0.0001,
        sensor_width_mm=35.9,
        sensor_height_mm=24.0
    ),
    "DJI-P1-01": CameraInteriorOrientation(
        camera_id="DJI-P1-01",
        focal_length_mm=35.0,
        focal_length_px=7954.5,
        principal_point_x_px=4096.0,
        principal_point_y_px=2730.0,
        radial_distortion_k1=-0.012,
        radial_distortion_k2=0.005,
        radial_distortion_k3=0.0,
        tangential_distortion_p1=0.0001,
        tangential_distortion_p2=-0.0001,
        sensor_width_mm=35.9,
        sensor_height_mm=24.0
    ),
    "PHANTOM-4-RTK": CameraInteriorOrientation(
        camera_id="PHANTOM-4-RTK",
        focal_length_mm=8.8,
        focal_length_px=3666.7,
        principal_point_x_px=2736.0,
        principal_point_y_px=1824.0,
        radial_distortion_k1=-0.025,
        radial_distortion_k2=0.010,
        radial_distortion_k3=-0.001,
        tangential_distortion_p1=0.0002,
        tangential_distortion_p2=-0.0001,
        sensor_width_mm=13.2,
        sensor_height_mm=8.8
    )
}

@router.post("/gcp/quality", response_model=GCPQualityAssessmentResponse)
@router.post("/gcp-quality", response_model=GCPQualityAssessmentResponse, include_in_schema=False)
async def assess_gcp_quality(req: GCPQualityAssessmentRequest):
    """Evaluates drone photogrammetry Ground Control Points (GCP) and Check Points accuracy metrics."""
    residuals, ctrl_rmse, check_rmse = calculate_gcp_residuals_and_rmse(
        measured_points=req.control_points,
        estimated_points=req.estimated_positions
    )
    survey_grade = ctrl_rmse.rmse_3d_m <= 0.05
    return GCPQualityAssessmentResponse(
        ortho_id=req.ortho_id,
        control_rmse=ctrl_rmse,
        check_rmse=check_rmse,
        residuals=residuals,
        survey_grade_achieved=survey_grade,
        camera_calibration=req.camera_calibration,
        assessed_at=datetime.now(timezone.utc).isoformat()
    )

@router.get("/camera/calibration/{camera_id}", response_model=CameraInteriorOrientation)
@router.get("/calibration/camera/{camera_id}", response_model=CameraInteriorOrientation, include_in_schema=False)
@router.get("/camera-calibration/{camera_id}", response_model=CameraInteriorOrientation, include_in_schema=False)
async def get_camera_calibration(camera_id: str):
    """Retrieves Brown-Conrady interior camera orientation calibration parameters for a drone camera sensor."""
    preset = get_camera_calibration_preset(camera_id)
    if preset:
        return preset
    cid_upper = camera_id.upper().strip()
    if cid_upper in DEFAULT_CAMERA_CALIBRATIONS:
        return DEFAULT_CAMERA_CALIBRATIONS[cid_upper]
    for k, v in DEFAULT_CAMERA_CALIBRATIONS.items():
        if k in cid_upper or cid_upper in k:
            return v
    # Fallback to calibrated orientation for unknown camera ID
    return CameraInteriorOrientation(
        camera_id=camera_id,
        focal_length_mm=35.0,
        focal_length_px=7954.5,
        principal_point_x_px=4096.0,
        principal_point_y_px=2730.0,
        radial_distortion_k1=-0.012,
        radial_distortion_k2=0.005,
        radial_distortion_k3=0.0,
        tangential_distortion_p1=0.0001,
        tangential_distortion_p2=-0.0001,
        sensor_width_mm=35.9,
        sensor_height_mm=24.0
    )

@router.get("/camera-calibration", response_model=CameraInteriorOrientation, include_in_schema=False)
async def get_default_camera_calibration(camera_id: Optional[str] = "DJI-ZENMUSE-P1-01"):
    """Query parameter or default fallback route for camera interior calibration."""
    return await get_camera_calibration(camera_id or "DJI-ZENMUSE-P1-01")

@router.get("/camera/calibration", response_model=Union[List[CameraInteriorOrientation], CameraInteriorOrientation])
async def list_or_query_camera_calibrations(camera_id: Optional[str] = None):
    """List all registered camera calibration presets, or get calibration for a specific camera_id query."""
    if camera_id:
        return await get_camera_calibration(camera_id)
    return list_camera_calibration_presets()

@router.post("/gcp/geojson")
async def export_gcps_geojson(gcps: List[GCPCoordinate]):
    """Converts a sequence of GCP survey points into an RFC 7946 GeoJSON FeatureCollection."""
    return gcps_to_feature_collection(gcps)

@router.get("/missions", response_model=DroneMissionsListResponse)
async def list_missions():
    """List all active drone missions."""
    return {"missions": list(drone_service.active_missions.values())}

@router.post("/missions/schedule", response_model=DroneMissionScheduleResponse)
async def schedule_mission(req: DroneScheduleMissionRequest):
    """Manually schedule a mission."""
    mission = drone_service.schedule_mission(
        event_id=req.event_id or "MANUAL",
        lat=req.lat,
        lng=req.lng,
        radius_km=req.radius_km
    )
    return {"status": "success", "mission": mission}

@router.get("/orthomosaics", response_model=DroneOrthomosaicsListResponse)
async def list_orthomosaics():
    """List all registered centimeter-resolution drone orthomosaics."""
    return {"orthomosaics": list(drone_service.registered_orthos.values())}

@router.post("/register", response_model=DroneMissionResponse)
async def register_orthomosaic(req: DroneRegisterRequest):
    """Register a pre-stitched Drone GeoTIFF, calculate metric GSD, and build COG pyramids."""
    try:
        meta = drone_service.register_orthomosaic(
            file_path=req.file_path,
            mission_name=req.mission_name or "UAV Survey",
            payload=req.sensor_payload or "RGB",
            ortho_id=req.ortho_id
        )
        return DroneMissionResponse(
            ortho_id=meta["ortho_id"],
            mission_id=meta["ortho_id"],
            filename=meta["filename"],
            crs=meta["crs"],
            bounds=tuple(meta["bounds"]),
            gsd_cm=meta["metric_gsd_cm"],
            metric_gsd_cm=meta["metric_gsd_cm"],
            bbox=tuple(meta["bounds"]),
            bands=meta["bands"],
            is_cog=meta["is_cog"],
            status=meta["status"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload", response_model=DroneUploadResponse)
async def upload_drone_ortho(
    file: UploadFile = File(...),
    mission_name: str = Form("Uploaded Survey"),
    sensor_payload: str = Form("RGB")
):
    """Upload a drone orthomosaic GeoTIFF file and register it into the COG catalog."""
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    target_path = os.path.join(upload_dir, file.filename)
    with open(target_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    meta = drone_service.register_orthomosaic(
        file_path=target_path,
        mission_name=mission_name,
        payload=sensor_payload
    )
    return {"status": "success", "orthomosaic": meta}

@router.get("/{ortho_id}/tiles/{z}/{x}/{y}.png")
async def get_drone_tile(ortho_id: str, z: int, x: int, y: int):
    """Serve dynamic centimeter-scale drone COG tiles up to Zoom 22."""
    png_bytes = drone_service.get_tile(ortho_id, z, x, y)
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"}
    )
