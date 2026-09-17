"""Drone fleet, mission management, and centimeter-scale orthomosaic tile endpoints."""
import os
import shutil
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Response
from pydantic import BaseModel
from app.services.drone_service import drone_service
from app.models.schemas import DroneMissionResponse, DroneUploadMetadata

router = APIRouter(prefix="/drone", tags=["Drone Fleet"])

class DroneRegisterRequest(BaseModel):
    file_path: str
    mission_name: Optional[str] = "UAV Orthomosaic Survey"
    sensor_payload: Optional[str] = "RGB + Multispectral"
    ortho_id: Optional[str] = None

@router.get("/missions")
async def list_missions():
    """List all active drone missions."""
    return {"missions": list(drone_service.active_missions.values())}

@router.post("/missions/schedule")
async def schedule_mission(req: dict):
    """Manually schedule a mission."""
    mission = drone_service.schedule_mission(
        event_id=req.get("event_id", "MANUAL"),
        lat=req.get("lat", 0.0),
        lng=req.get("lng", 0.0),
        radius_km=req.get("radius_km", 1.0)
    )
    return {"status": "success", "mission": mission}

@router.get("/orthomosaics")
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

@router.post("/upload")
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
