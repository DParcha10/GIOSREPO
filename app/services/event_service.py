"""Hazard Event Database Service."""
import json
import os
import logging
from typing import List, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

INITIAL_EVENTS = [
    {
        "id": "SEEPAGE-01",
        "title": "San Luis Dam Embankment",
        "subtitle": "Santa Nella, CA | Subsurface Seepage Anomaly",
        "category": "seepage",
        "severity": "critical",
        "severity_label": "HIGH HAZARD",
        "lat": 37.0582,
        "lng": -121.0744,
        "zoom": 14,
        "metric": "ndmi",
        "sensor": "sentinel-2-l2a",
        "start_date": "2026-06-01",
        "end_date": "2026-08-30",
        "usgs_station": "11262900",
        "station_name": "USGS #11262900 (San Luis Creek)",
        "impact_area": "34.2 Hectares",
        "peak_zscore": "+2.84 σ",
        "hazard_type": "Subsurface Embankment Seepage",
        "drone_status": "Drone LiDAR & Multispec Recommended",
        "description": "Pore-pressure and moisture anomaly detected along downstream toe following reservoir hydraulic cycling."
    },
    {
        "id": "HAB-02",
        "title": "Lake Erie Western Basin",
        "subtitle": "Toledo, OH | Microcystin Cyanobacteria Bloom",
        "category": "hab",
        "severity": "critical",
        "severity_label": "SEVERE BLOOM",
        "lat": 41.7450,
        "lng": -83.2500,
        "zoom": 11,
        "metric": "ndci",
        "sensor": "sentinel-2-l2a",
        "start_date": "2026-07-01",
        "end_date": "2026-08-28",
        "usgs_station": "04193500",
        "station_name": "USGS #04193500 (Maumee River Inflow)",
        "impact_area": "428.5 km²",
        "peak_zscore": "+3.12 σ",
        "hazard_type": "Harmful Cyanobacterial Bloom (HAB)",
        "drone_status": "Satellite Sufficient (Macro Bloom)",
        "description": "High-density chlorophyll-a bloom originating from Maumee River agricultural phosphorus discharge plume."
    },
    {
        "id": "INUNDATION-03",
        "title": "Lower Brazos River Basin",
        "subtitle": "Richmond, TX | Flash Flood Inundation",
        "category": "inundation",
        "severity": "warning",
        "severity_label": "ACTION STAGE",
        "lat": 29.5822,
        "lng": -95.7655,
        "zoom": 12,
        "metric": "mndwi",
        "sensor": "sentinel-2-l2a",
        "start_date": "2026-05-15",
        "end_date": "2026-06-30",
        "usgs_station": "08114000",
        "station_name": "USGS #08114000 (Brazos River at Richmond)",
        "impact_area": "1,240.8 Hectares",
        "peak_zscore": "+2.45 σ",
        "hazard_type": "Riverine Floodplain Inundation",
        "drone_status": "Aerial Survey Completed",
        "description": "Overbank flood pulse and soil saturation across agricultural bottomlands threatening earthen protection berms."
    },
    {
        "id": "TAILINGS-04",
        "title": "Silver Bell Mine Impoundment",
        "subtitle": "Pima County, AZ | Embankment Stability & Moisture",
        "category": "seepage",
        "severity": "warning",
        "severity_label": "MONITORING",
        "lat": 32.3912,
        "lng": -111.4920,
        "zoom": 14,
        "metric": "ndmi",
        "sensor": "sentinel-2-l2a",
        "start_date": "2026-04-01",
        "end_date": "2026-07-20",
        "usgs_station": "09486000",
        "station_name": "USGS #09486000 (Brawley Basin)",
        "impact_area": "18.6 Hectares",
        "peak_zscore": "+1.95 σ",
        "hazard_type": "Tailings Dam Toe Saturation",
        "drone_status": "Drone Micro-Survey Active",
        "description": "Localized thermal and canopy moisture departures observed along northwestern tailings retention buttress."
    }
]

class EventService:
    def __init__(self, db_path: str = settings.events_db_file):
        self.db_path = db_path
        self._load_events()

    def _load_events(self):
        if not os.path.exists(self.db_path):
            self.events = {e["id"]: e for e in INITIAL_EVENTS}
            self._save()
        else:
            try:
                with open(self.db_path, "r", encoding="utf-8") as f:
                    self.events = json.load(f)
            except Exception as e:
                logger.error("Error loading events DB: %s", e)
                self.events = {e["id"]: e for e in INITIAL_EVENTS}

    def _save(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump(self.events, f, indent=2)

    def list_events(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        if category and category != "all":
            return [e for e in self.events.values() if e.get("category") == category]
        return list(self.events.values())

    def get_event(self, event_id: str) -> Optional[Dict[str, Any]]:
        return self.events.get(event_id)

    def add_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        self.events[event_data["id"]] = event_data
        self._save()
        return event_data

event_service = EventService()
