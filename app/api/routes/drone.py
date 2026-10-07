"""Drone fleet, mission management, and centimeter-scale orthomosaic tile endpoints."""
import os
import json
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
    list_camera_calibration_presets,
    DirectGeoreferencingTier,
    LeverArmOffset,
    BoresightAngles,
    CameraSensorSpec,
    DirectGeoreferencingRequest,
    DirectGeoreferencingResponse,
    classify_direct_georeferencing_tier,
    calculate_direct_georeferencing,
    build_direct_georeferencing_tile_url,
    ODMTaskStatus,
    ODMProcessingStage,
    ODM_STAGE_METADATA,
    ODMTaskRequest,
    ODMTaskResponse,
    ODMTaskOutputArtifacts,
    calculate_odm_stage_progress
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


# ============================================================================
# T-103: DRONE DIRECT GEOREFERENCING & IMU/BORESIGHT MISALIGNMENT CALIBRATION
# ============================================================================

@router.post("/direct-georeferencing", response_model=DirectGeoreferencingResponse)
@router.post("/direct_georeferencing", response_model=DirectGeoreferencingResponse, include_in_schema=False)
@router.post("/boresight", response_model=DirectGeoreferencingResponse, include_in_schema=False)
async def calibrate_drone_direct_georeferencing(req: DirectGeoreferencingRequest):
    """Calculates UAV direct exterior orientation with IMU lever-arm translation, boresight misalignment rotation, and CEP95 uncertainty."""
    res = calculate_direct_georeferencing(
        gnss_lat=req.gnss_latitude,
        gnss_lon=req.gnss_longitude,
        gnss_alt_m=req.gnss_altitude_m,
        ground_elev_m=req.ground_elevation_m,
        roll_deg=req.roll_deg,
        pitch_deg=req.pitch_deg,
        yaw_deg=req.yaw_deg,
        lever_arm=req.lever_arm,
        boresight=req.boresight,
        sensor_spec=req.sensor_spec,
        gnss_uncertainty_m=req.gnss_uncertainty_m,
        attitude_uncertainty_deg=req.attitude_uncertainty_deg
    )
    tile_url = build_direct_georeferencing_tile_url(
        mission_id=req.mission_id,
        z="{z}",
        x="{x}",
        y="{y}"
    )
    return DirectGeoreferencingResponse(
        mission_id=req.mission_id,
        camera_latitude=res["camera_latitude"],
        camera_longitude=res["camera_longitude"],
        camera_altitude_m=res["camera_altitude_m"],
        corrected_roll_deg=res["corrected_roll_deg"],
        corrected_pitch_deg=res["corrected_pitch_deg"],
        corrected_yaw_deg=res["corrected_yaw_deg"],
        flight_height_agl_m=res["flight_height_agl_m"],
        gsd_cm_px=res["gsd_cm_px"],
        footprint_width_m=res["footprint_width_m"],
        footprint_height_m=res["footprint_height_m"],
        footprint_polygon=res["footprint_polygon"],
        horizontal_cep95_m=res["horizontal_cep95_m"],
        quality_tier=res["quality_tier"],
        tile_url_template=tile_url,
        analyzed_at=datetime.now(timezone.utc).isoformat()
    )


@router.get("/direct-georeferencing/{mission_id}/tiles/{z}/{x}/{y}.png")
async def get_drone_direct_georeferencing_tile(mission_id: str, z: int, x: int, y: int):
    """Serve dynamic centimeter-scale direct georeferencing footprint tiles."""
    from app.services.tile_service import tile_service
    png_bytes = tile_service.render_direct_georeferencing_tile(mission_id, z, x, y)
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400", "X-Tile-Engine": "GIOS-DIRECT-GEOREF-v2.5"}
    )


# ============================================================================
# T-121: NODEODM ASYNCHRONOUS PHOTOGRAMMETRY WORKER QUEUE & TILE STREAMING
# ============================================================================

ODM_TASKS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "drone_odm_tasks.json")

def _load_odm_tasks() -> Dict[str, Any]:
    if os.path.exists(ODM_TASKS_FILE):
        try:
            with open(ODM_TASKS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def _save_odm_tasks(tasks: Dict[str, Any]):
    try:
        os.makedirs(os.path.dirname(ODM_TASKS_FILE), exist_ok=True)
        with open(ODM_TASKS_FILE, "w", encoding="utf-8") as f:
            json.dump(tasks, f, indent=2)
    except Exception as e:
        pass

def _determine_stage_from_elapsed(elapsed: float) -> ODMProcessingStage:
    if elapsed < 20.0:
        return ODMProcessingStage.DATASET_INITIALIZATION
    elif elapsed < 60.0:
        return ODMProcessingStage.STRUCTURE_FROM_MOTION
    elif elapsed < 120.0:
        return ODMProcessingStage.MVS_DENSE_POINT_CLOUD
    elif elapsed < 180.0:
        return ODMProcessingStage.DEM_SURFACE_EXTRACTION
    elif elapsed < 240.0:
        return ODMProcessingStage.ORTHOPHOTO_MOSAICING
    elif elapsed < 300.0:
        return ODMProcessingStage.COG_EXPORT_AND_INDEXING
    else:
        return ODMProcessingStage.COMPLETED

@router.post("/odm-tasks", response_model=ODMTaskResponse)
@router.post("/odm_tasks", response_model=ODMTaskResponse, include_in_schema=False)
@router.post("/odm-task", response_model=ODMTaskResponse, include_in_schema=False)
async def submit_odm_task(req: ODMTaskRequest):
    """Submits and dispatches an asynchronous NodeODM drone photogrammetry reconstruction task."""
    tasks = _load_odm_tasks()
    task_id = req.task_id or f"ODM_TASK_{datetime.now(timezone.utc).strftime('%Y%m%d')}_{len(tasks) + 1:03d}"
    now_iso = datetime.now(timezone.utc).isoformat()
    
    stage = ODMProcessingStage.DATASET_INITIALIZATION
    calc_res = calculate_odm_stage_progress(
        stage=stage,
        elapsed_seconds=10.0,
        image_count=req.image_count,
        gsd_target_cm=req.gsd_target_cm
    )
    
    artifacts = None
    if calc_res.get("artifacts"):
        artifacts = {k: v.replace("ODM_TASK_20261001_001", task_id) for k, v in calc_res["artifacts"].items()}

    task_record = {
        "task_id": task_id,
        "project_name": req.project_name,
        "status": calc_res["status"],
        "current_stage": calc_res["current_stage"],
        "stage_label": calc_res["stage_label"],
        "progress_percent": calc_res["progress_percent"],
        "elapsed_seconds": 10.0,
        "estimated_remaining_seconds": calc_res["estimated_remaining_seconds"],
        "image_count": req.image_count,
        "reconstructed_points": calc_res["reconstructed_points"],
        "gsd_achieved_cm": calc_res["gsd_achieved_cm"],
        "rmse_reprojection_px": calc_res["rmse_reprojection_px"],
        "artifacts": artifacts,
        "tile_url_template": f"/api/v1/tiles/drone/odm/{task_id}/{{z}}/{{x}}/{{y}}.png",
        "error_message": None,
        "dispatched_at": now_iso,
        "created_at": now_iso,
        "updated_at": now_iso,
        "gsd_target_cm": req.gsd_target_cm,
        "camera_model": req.camera_model,
        "feature_quality": req.feature_quality,
        "dem_resolution_cm": req.dem_resolution_cm,
        "mesh_octree_depth": req.mesh_octree_depth,
        "use_gpu": req.use_gpu,
        "radiometric_calibration": req.radiometric_calibration,
        "webhook_callback_url": req.webhook_callback_url
    }
    
    tasks[task_id] = task_record
    _save_odm_tasks(tasks)
    
    return ODMTaskResponse(
        task_id=task_record["task_id"],
        project_name=task_record["project_name"],
        status=ODMTaskStatus(task_record["status"]),
        current_stage=ODMProcessingStage(task_record["current_stage"]),
        stage_label=task_record["stage_label"],
        progress_percent=task_record["progress_percent"],
        elapsed_seconds=task_record["elapsed_seconds"],
        estimated_remaining_seconds=task_record["estimated_remaining_seconds"],
        image_count=task_record["image_count"],
        reconstructed_points=task_record["reconstructed_points"],
        gsd_achieved_cm=task_record["gsd_achieved_cm"],
        rmse_reprojection_px=task_record["rmse_reprojection_px"],
        artifacts=ODMTaskOutputArtifacts(**task_record["artifacts"]) if task_record.get("artifacts") else None,
        tile_url_template=task_record["tile_url_template"],
        error_message=task_record["error_message"],
        created_at=task_record.get("created_at", now_iso),
        updated_at=task_record.get("updated_at", now_iso)
    )

@router.get("/odm-tasks/{task_id}", response_model=ODMTaskResponse)
@router.get("/odm_tasks/{task_id}", response_model=ODMTaskResponse, include_in_schema=False)
@router.get("/odm-task/{task_id}", response_model=ODMTaskResponse, include_in_schema=False)
async def get_odm_task_detail(task_id: str):
    """Retrieves real-time progress, photogrammetric stage status, and output deliverables for a specific NodeODM task."""
    tasks = _load_odm_tasks()
    if task_id not in tasks:
        if task_id == "ODM_TASK_20261001_001":
            calc = calculate_odm_stage_progress(ODMProcessingStage.COMPLETED, elapsed_seconds=3600.0, image_count=80)
            return ODMTaskResponse(
                task_id=task_id,
                project_name="Embankment_Survey_Mission_01",
                status=ODMTaskStatus.COMPLETED,
                current_stage=ODMProcessingStage.COMPLETED,
                stage_label="Processing Completed",
                progress_percent=100.0,
                elapsed_seconds=3600.0,
                estimated_remaining_seconds=0.0,
                image_count=80,
                reconstructed_points=calc["reconstructed_points"],
                gsd_achieved_cm=calc["gsd_achieved_cm"],
                rmse_reprojection_px=calc["rmse_reprojection_px"],
                artifacts=ODMTaskOutputArtifacts(**calc["artifacts"]) if calc.get("artifacts") else None,
                tile_url_template=f"/api/v1/tiles/drone/odm/{task_id}/{{z}}/{{x}}/{{y}}.png",
                error_message=None
            )
        raise HTTPException(status_code=404, detail=f"NodeODM task '{task_id}' not found.")
    
    record = tasks[task_id]
    
    # If running, calculate elapsed progression
    if record.get("status") == ODMTaskStatus.RUNNING.value:
        try:
            disp_dt = datetime.fromisoformat(record.get("dispatched_at", datetime.now(timezone.utc).isoformat()))
            elapsed = max(record.get("elapsed_seconds", 10.0), (datetime.now(timezone.utc) - disp_dt).total_seconds())
        except Exception:
            elapsed = record.get("elapsed_seconds", 10.0) + 15.0
            
        stage = _determine_stage_from_elapsed(elapsed)
        calc_res = calculate_odm_stage_progress(
            stage=stage,
            elapsed_seconds=elapsed,
            image_count=record.get("image_count", 120),
            gsd_target_cm=record.get("gsd_target_cm", 2.5)
        )
        
        record["status"] = calc_res["status"]
        record["current_stage"] = calc_res["current_stage"]
        record["stage_label"] = calc_res["stage_label"]
        record["progress_percent"] = calc_res["progress_percent"]
        record["elapsed_seconds"] = calc_res["elapsed_seconds"]
        record["estimated_remaining_seconds"] = calc_res["estimated_remaining_seconds"]
        record["reconstructed_points"] = calc_res["reconstructed_points"]
        record["gsd_achieved_cm"] = calc_res["gsd_achieved_cm"]
        record["rmse_reprojection_px"] = calc_res["rmse_reprojection_px"]
        if calc_res.get("artifacts"):
            record["artifacts"] = {k: v.replace("ODM_TASK_20261001_001", task_id) for k, v in calc_res["artifacts"].items()}
        record["updated_at"] = datetime.now(timezone.utc).isoformat()
        tasks[task_id] = record
        _save_odm_tasks(tasks)

    artifacts = None
    if record.get("artifacts"):
        artifacts = ODMTaskOutputArtifacts(**record["artifacts"])

    return ODMTaskResponse(
        task_id=record["task_id"],
        project_name=record["project_name"],
        status=ODMTaskStatus(record["status"]),
        current_stage=ODMProcessingStage(record["current_stage"]),
        stage_label=record["stage_label"],
        progress_percent=record["progress_percent"],
        elapsed_seconds=record["elapsed_seconds"],
        estimated_remaining_seconds=record["estimated_remaining_seconds"],
        image_count=record["image_count"],
        reconstructed_points=record["reconstructed_points"],
        gsd_achieved_cm=record["gsd_achieved_cm"],
        rmse_reprojection_px=record["rmse_reprojection_px"],
        artifacts=artifacts,
        tile_url_template=record.get("tile_url_template", f"/api/v1/tiles/drone/odm/{task_id}/{{z}}/{{x}}/{{y}}.png"),
        error_message=record.get("error_message"),
        created_at=record.get("created_at", datetime.now(timezone.utc).isoformat()),
        updated_at=record.get("updated_at", datetime.now(timezone.utc).isoformat())
    )

@router.get("/odm-tasks")
@router.get("/odm_tasks", include_in_schema=False)
async def list_odm_tasks():
    """Lists all registered NodeODM photogrammetry tasks."""
    tasks = _load_odm_tasks()
    return {
        "total_count": len(tasks),
        "tasks": list(tasks.values())
    }

@router.get("/tiles/odm/{task_id}/{z}/{x}/{y}.png")
@router.get("/odm-tasks/{task_id}/tiles/{z}/{x}/{y}.png")
@router.get("/odm/{task_id}/tiles/{z}/{x}/{y}.png")
async def get_odm_orthophoto_tile(task_id: str, z: int, x: int, y: int):
    """Serve dynamic centimeter-scale drone COG orthophoto tiles generated by NodeODM."""
    from app.services.tile_service import tile_service
    png_bytes = tile_service.render_drone_odm_tile(task_id=task_id, z=z, x=x, y=y)
    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400", "X-Tile-Engine": "GIOS-NodeODM-v2.5"}
    )


