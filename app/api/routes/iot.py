from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List
from app.models.schemas import SensorData

router = APIRouter(prefix="/iot", tags=["iot"])

from app.services.alerting import alert_engine

# In-memory store for simulation purposes
iot_data_store: List[SensorData] = []

async def _check_thresholds(data: SensorData):
    if data.soil_moisture_pct < 10.0 or data.temperature_c > 45.0:
        mock_data = {
            "site_id": data.sensor_id,
            "soil_moisture_pct": data.soil_moisture_pct,
            "temperature_c": data.temperature_c
        }
        await alert_engine.trigger_jarvis_alert(f"IoT Sensor {data.sensor_id}", mock_data)

@router.post("/ingest")
async def ingest_sensor_data(data: SensorData, bg_tasks: BackgroundTasks):
    """
    Ingest live IoT sensor data for fusion with satellite imagery.
    """
    iot_data_store.append(data)
    bg_tasks.add_task(_check_thresholds, data)
    return {"status": "success", "message": "Data ingested"}

@router.get("/data", response_model=List[SensorData])
def get_sensor_data():
    """
    Retrieve ingested IoT sensor data.
    """
    return iot_data_store
