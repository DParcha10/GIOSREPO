"""In-Situ Sensor Integration Routes: USGS NWIS Hydrological Telemetry and Geotechnical In-Situ Instrumentation."""
import math
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Union
from fastapi import APIRouter, HTTPException, Query, Response

from app.models.schemas import (
    USGSStationData,
    GeotechnicalSensorType,
    SensorReadingStatus,
    GeotechnicalSensor,
    SensorReading,
    GeotechnicalNetworkSummary,
    CreateGeotechnicalSensorRequest,
    sensor_to_geojson_feature,
    sensors_to_feature_collection
)
from app.services.integration import integration_service

router = APIRouter(prefix="/integration", tags=["In-Situ Sensor Integration"])

# ============================================================================
# IN-MEMORY GEOTECHNICAL SENSOR DATA STORE (San Luis Dam & Asset Baselines)
# ============================================================================

_GEOTECHNICAL_SENSORS_DB: Dict[str, GeotechnicalSensor] = {
    "PZ-SL-101": GeotechnicalSensor(
        sensor_id="PZ-SL-101",
        name="Vibrating Wire Piezometer PZ-101 (Downstream Toe Berm)",
        sensor_type=GeotechnicalSensorType.PIEZOMETER,
        asset_id="SAN-LUIS-DAM-01",
        lat=37.0562,
        lng=-121.0778,
        installation_elevation_m=218.4,
        installation_depth_m=18.5,
        unit="kPa",
        current_value=142.5,
        alert_threshold_low=80.0,
        alert_threshold_high=190.0,
        critical_threshold_high=230.0,
        status=SensorReadingStatus.NORMAL,
        last_reading_time="2026-09-24T04:00:00Z"
    ),
    "PZ-SL-102": GeotechnicalSensor(
        sensor_id="PZ-SL-102",
        name="Vibrating Wire Piezometer PZ-102 (Right Abutment Seepage Station)",
        sensor_type=GeotechnicalSensorType.PIEZOMETER,
        asset_id="SAN-LUIS-DAM-01",
        lat=37.0585,
        lng=-121.0740,
        installation_elevation_m=225.0,
        installation_depth_m=22.0,
        unit="kPa",
        current_value=188.2,
        alert_threshold_low=90.0,
        alert_threshold_high=185.0,
        critical_threshold_high=225.0,
        status=SensorReadingStatus.ADVISORY,
        last_reading_time="2026-09-24T04:00:00Z"
    ),
    "INC-SL-01": GeotechnicalSensor(
        sensor_id="INC-SL-01",
        name="Digital Inclinometer Casing INC-01 (Embankment Crest Station 12+50)",
        sensor_type=GeotechnicalSensorType.INCLINOMETER,
        asset_id="SAN-LUIS-DAM-01",
        lat=37.0614,
        lng=-121.0691,
        installation_elevation_m=245.8,
        installation_depth_m=40.0,
        unit="mm",
        current_value=4.2,
        alert_threshold_low=0.0,
        alert_threshold_high=15.0,
        critical_threshold_high=25.0,
        status=SensorReadingStatus.NORMAL,
        last_reading_time="2026-09-24T04:00:00Z"
    ),
    "SW-SL-01": GeotechnicalSensor(
        sensor_id="SW-SL-01",
        name="V-Notch Seepage Weir SW-01 (Toe Drainage Ditch)",
        sensor_type=GeotechnicalSensorType.SEEPAGE_WEIR,
        asset_id="SAN-LUIS-DAM-01",
        lat=37.0548,
        lng=-121.0792,
        installation_elevation_m=210.2,
        installation_depth_m=1.2,
        unit="L/s",
        current_value=8.4,
        alert_threshold_low=0.5,
        alert_threshold_high=18.0,
        critical_threshold_high=30.0,
        status=SensorReadingStatus.NORMAL,
        last_reading_time="2026-09-24T04:00:00Z"
    ),
    "SG-SL-01": GeotechnicalSensor(
        sensor_id="SG-SL-01",
        name="Radar Stage Gauge SG-01 (Reservoir Pool Forebay)",
        sensor_type=GeotechnicalSensorType.STAGE_GAUGE,
        asset_id="SAN-LUIS-DAM-01",
        lat=37.0650,
        lng=-121.0720,
        installation_elevation_m=250.0,
        installation_depth_m=0.0,
        unit="m",
        current_value=236.4,
        alert_threshold_low=180.0,
        alert_threshold_high=248.0,
        critical_threshold_high=252.0,
        status=SensorReadingStatus.NORMAL,
        last_reading_time="2026-09-24T04:00:00Z"
    ),
    "SP-SL-01": GeotechnicalSensor(
        sensor_id="SP-SL-01",
        name="Settlement Plate SP-01 (Maximum Section Centerline)",
        sensor_type=GeotechnicalSensorType.SETTLEMENT_PLATE,
        asset_id="SAN-LUIS-DAM-01",
        lat=37.0602,
        lng=-121.0705,
        installation_elevation_m=246.1,
        installation_depth_m=5.0,
        unit="mm",
        current_value=12.8,
        alert_threshold_low=0.0,
        alert_threshold_high=35.0,
        critical_threshold_high=60.0,
        status=SensorReadingStatus.NORMAL,
        last_reading_time="2026-09-24T04:00:00Z"
    )
}

def _generate_default_readings(sensor: GeotechnicalSensor, count: int = 15) -> List[SensorReading]:
    readings = []
    base_time = datetime(2026, 9, 24, 4, 0, 0, tzinfo=timezone.utc)
    base_val = sensor.current_value if sensor.current_value is not None else 10.0
    for i in range(count):
        t = base_time - timedelta(hours=i * 6)
        t_iso = t.isoformat()
        drift = (math.sin(i * 0.8) * 0.05) * base_val
        val = round(base_val - drift, 2)
        
        pp = None
        ph = None
        flow = None
        disp = None
        
        if sensor.sensor_type == GeotechnicalSensorType.PIEZOMETER:
            pp = val
            # Hydrostatic head: head = collar - depth + (pp / 9.80665)
            ph = round(sensor.installation_elevation_m - (sensor.installation_depth_m or 0.0) + (val / 9.80665), 2)
        elif sensor.sensor_type == GeotechnicalSensorType.SEEPAGE_WEIR:
            flow = val
        elif sensor.sensor_type in {GeotechnicalSensorType.INCLINOMETER, GeotechnicalSensorType.SETTLEMENT_PLATE}:
            disp = val

        readings.append(SensorReading(
            reading_id=f"RD-{sensor.sensor_id}-{i:03d}",
            sensor_id=sensor.sensor_id,
            timestamp=t_iso,
            value=val,
            unit=sensor.unit,
            pore_pressure_kpa=pp,
            phreatic_head_m=ph,
            flow_rate_lps=flow,
            displacement_mm=disp,
            status=sensor.status
        ))
    return readings

_SENSOR_READINGS_DB: Dict[str, List[SensorReading]] = {
    s_id: _generate_default_readings(s) for s_id, s in _GEOTECHNICAL_SENSORS_DB.items()
}

def _compute_network_summary(asset_id: str) -> GeotechnicalNetworkSummary:
    sensors = [s for s in _GEOTECHNICAL_SENSORS_DB.values() if s.asset_id == asset_id or asset_id in s.asset_id or s.asset_id.startswith(asset_id)]
    if not sensors:
        sensors = list(_GEOTECHNICAL_SENSORS_DB.values())

    total = len(sensors)
    normal = sum(1 for s in sensors if s.status == SensorReadingStatus.NORMAL)
    advisory = sum(1 for s in sensors if s.status == SensorReadingStatus.ADVISORY)
    alert = sum(1 for s in sensors if s.status == SensorReadingStatus.ALERT)
    critical = sum(1 for s in sensors if s.status == SensorReadingStatus.CRITICAL)

    piezos = [s.current_value for s in sensors if s.sensor_type == GeotechnicalSensorType.PIEZOMETER and s.current_value is not None]
    max_pp = round(float(max(piezos)), 2) if piezos else 188.2

    weirs = [s.current_value for s in sensors if s.sensor_type == GeotechnicalSensorType.SEEPAGE_WEIR and s.current_value is not None]
    total_flow = round(float(sum(weirs)), 2) if weirs else 8.4

    warning = alert > 0 or critical > 0 or advisory >= 2

    return GeotechnicalNetworkSummary(
        asset_id=asset_id,
        total_sensors=total,
        sensors_normal=normal,
        sensors_advisory=advisory,
        sensors_alert=alert,
        sensors_critical=critical,
        max_pore_pressure_kpa=max_pp,
        total_seepage_flow_lps=total_flow,
        phreatic_surface_warning=warning,
        last_updated=datetime.now(timezone.utc).isoformat()
    )


# ============================================================================
# USGS NWIS HYDROLOGICAL TELEMETRY
# ============================================================================

@router.get("/usgs/{site_id}", response_model=USGSStationData)
async def get_usgs_gauge(site_id: str):
    """Fetches real-time USGS NWIS streamflow, gage height, and water temperature with calibrated physical fallback."""
    return await integration_service.get_usgs_station(site_id)


# ============================================================================
# IN-SITU GEOTECHNICAL SENSORS & SENSOR FUSION
# ============================================================================

@router.get("/geotechnical/sensors")
@router.get("/geotechnical-sensors", include_in_schema=False)
def list_geotechnical_sensors(
    asset_id: Optional[str] = Query(None, description="Filter by infrastructure asset ID"),
    sensor_type: Optional[str] = Query(None, description="Filter by instrument category"),
    status: Optional[str] = Query(None, description="Filter by operational status"),
    format: Optional[str] = Query(None, description="Output format ('json' or 'geojson')")
):
    """Retrieves in-situ geotechnical instruments, supporting filtering and RFC 7946 GeoJSON FeatureCollection export."""
    sensors = list(_GEOTECHNICAL_SENSORS_DB.values())

    if asset_id:
        target_aid = asset_id.strip().upper()
        sensors = [s for s in sensors if target_aid in s.asset_id.upper()]

    if sensor_type:
        st_clean = sensor_type.strip().lower()
        sensors = [s for s in sensors if (s.sensor_type.value if hasattr(s.sensor_type, "value") else str(s.sensor_type)).lower() == st_clean]

    if status:
        stat_clean = status.strip().lower()
        sensors = [s for s in sensors if (s.status.value if hasattr(s.status, "value") else str(s.status)).lower() == stat_clean]

    if format and format.strip().lower() == "geojson":
        return sensors_to_feature_collection(sensors)

    return sensors

@router.get("/geotechnical/sensors/geojson")
@router.get("/geotechnical-sensors/geojson", include_in_schema=False)
def get_geotechnical_sensors_geojson(
    asset_id: Optional[str] = Query(None, description="Filter by infrastructure asset ID")
):
    """Retrieves all registered in-situ geotechnical sensors as an RFC 7946 GeoJSON FeatureCollection."""
    sensors = list(_GEOTECHNICAL_SENSORS_DB.values())
    if asset_id:
        sensors = [s for s in sensors if asset_id.strip().upper() in s.asset_id.upper()]
    return sensors_to_feature_collection(sensors)

@router.post("/geotechnical/sensors", response_model=GeotechnicalSensor)
@router.post("/geotechnical-sensors", response_model=GeotechnicalSensor, include_in_schema=False)
def register_geotechnical_sensor(req: CreateGeotechnicalSensorRequest):
    """Registers a new in-situ geotechnical sensor instrument."""
    if req.sensor_id in _GEOTECHNICAL_SENSORS_DB:
        raise HTTPException(status_code=409, detail=f"Sensor '{req.sensor_id}' already registered.")

    new_sensor = GeotechnicalSensor(
        sensor_id=req.sensor_id,
        name=req.name,
        sensor_type=req.sensor_type,
        asset_id=req.asset_id,
        lat=req.lat,
        lng=req.lng,
        installation_elevation_m=req.installation_elevation_m,
        installation_depth_m=req.installation_depth_m,
        unit=req.unit,
        current_value=None,
        alert_threshold_low=None,
        alert_threshold_high=req.alert_threshold_high,
        critical_threshold_high=req.critical_threshold_high,
        status=SensorReadingStatus.NORMAL,
        last_reading_time=datetime.now(timezone.utc).isoformat()
    )
    _GEOTECHNICAL_SENSORS_DB[req.sensor_id] = new_sensor
    _SENSOR_READINGS_DB[req.sensor_id] = _generate_default_readings(new_sensor, count=5)
    return new_sensor

@router.get("/geotechnical/sensors/{sensor_id}", response_model=GeotechnicalSensor)
@router.get("/geotechnical-sensors/{sensor_id}", response_model=GeotechnicalSensor, include_in_schema=False)
def get_geotechnical_sensor_detail(sensor_id: str):
    """Retrieves detailed record for a specific in-situ geotechnical sensor."""
    sensor = _GEOTECHNICAL_SENSORS_DB.get(sensor_id)
    if not sensor:
        raise HTTPException(status_code=404, detail=f"Geotechnical sensor '{sensor_id}' not found.")
    return sensor

@router.get("/geotechnical/sensors/{sensor_id}/readings", response_model=List[SensorReading])
@router.get("/geotechnical-sensors/{sensor_id}/readings", response_model=List[SensorReading], include_in_schema=False)
def get_geotechnical_sensor_readings(
    sensor_id: str,
    start_date: Optional[str] = Query(None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date filter (YYYY-MM-DD)"),
    limit: int = Query(50, ge=1, le=500, description="Max readings to return")
):
    """Retrieves historical time-series observation readings for an in-situ geotechnical sensor."""
    if sensor_id not in _GEOTECHNICAL_SENSORS_DB:
        raise HTTPException(status_code=404, detail=f"Geotechnical sensor '{sensor_id}' not found.")

    readings = _SENSOR_READINGS_DB.get(sensor_id, [])
    if start_date:
        readings = [r for r in readings if r.timestamp >= start_date]
    if end_date:
        readings = [r for r in readings if r.timestamp <= end_date]

    return readings[:limit]

@router.get("/geotechnical/summary/{asset_id}", response_model=GeotechnicalNetworkSummary)
@router.get("/geotechnical-summary/{asset_id}", response_model=GeotechnicalNetworkSummary, include_in_schema=False)
def get_geotechnical_network_summary(asset_id: str):
    """Retrieves aggregated in-situ geotechnical instrumentation network status for an infrastructure asset."""
    return _compute_network_summary(asset_id)

@router.get("/geotechnical/summary", response_model=GeotechnicalNetworkSummary)
@router.get("/geotechnical-summary", response_model=GeotechnicalNetworkSummary, include_in_schema=False)
def get_default_geotechnical_network_summary():
    """Retrieves default geotechnical instrumentation network status (San Luis Dam)."""
    return _compute_network_summary("SAN-LUIS-DAM-01")
