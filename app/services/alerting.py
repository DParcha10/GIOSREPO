import asyncio
import logging
from typing import List

from app.api.routes.iot import SensorData

logger = logging.getLogger(__name__)

async def check_sensor_thresholds(data: SensorData):
    """
    Background task to check if an incoming sensor reading breaches
    safety thresholds (e.g., moisture too high -> slope instability).
    """
    if data.soil_moisture_pct > 85.0:
        logger.warning(f"ALERT: High soil moisture detected at {data.location_lat}, {data.location_lon}: {data.soil_moisture_pct}%")
        await trigger_alert_notification(data)

async def trigger_alert_notification(data: SensorData):
    """
    Simulates sending an SMS or Email.
    """
    # In a real system, this would call Twilio or SendGrid APIs
    logger.info(f"Sending SMS/Email Alert for sensor {data.sensor_id}: Critical Moisture Levels")
    await asyncio.sleep(1) # Simulate network delay
    logger.info(f"Alert sent successfully for {data.sensor_id}.")
