from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List
from datetime import datetime

from app.services.alerting import check_sensor_thresholds

router = APIRouter(prefix="/iot", tags=["iot"])

class SensorData(BaseModel):
    sensor_id: str
    location_lat: float
    location_lon: float
    soil_moisture_pct: float
    temperature_c: float
    timestamp: datetime = datetime.utcnow()

# In-memory store for simulation purposes
iot_data_store: List[SensorData] = []

@router.post("/ingest")
def ingest_sensor_data(data: SensorData, background_tasks: BackgroundTasks):
    """
    Ingest live IoT sensor data for fusion with satellite imagery.
    """
    iot_data_store.append(data)
    # Trigger background alerting if thresholds are breached
    background_tasks.add_task(check_sensor_thresholds, data)
    return {"status": "success", "message": "Data ingested"}

@router.get("/data", response_model=List[SensorData])
def get_sensor_data():
    """
    Retrieve ingested IoT sensor data.
    """
    return iot_data_store
