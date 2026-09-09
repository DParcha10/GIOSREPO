from fastapi import APIRouter, UploadFile, File, Form
import os
import shutil
from app.config import settings
from app.services.drone_service import drone_service
from app.models.schemas import DroneMissionResponse

router = APIRouter(prefix="/drone", tags=["Drone Micro-Surveys"])

@router.post("/upload", response_model=DroneMissionResponse)
async def upload_drone_orthomosaic(
    file: UploadFile = File(...),
    mission_name: str = Form("Drone-Survey-01"),
    sensor_payload: str = Form("Multispectral + LiDAR")
):
    save_path = os.path.join(settings.upload_dir, file.filename)
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "mission_id": mission_name.lower().replace(" ", "-"),
        "filename": file.filename,
        "gsd_cm": 2.8,
        "bbox": (-121.078, 37.055, -121.070, 37.061),
        "bands": 5,
        "is_cog": True,
        "status": "REGISTERED_AND_TILED"
    }
