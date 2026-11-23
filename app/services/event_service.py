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
        # Sentinel-2 tile that covers this site; the scene date is a placeholder.
        "scene_id": "S2A_MSIL2A_20260820_T10SFG",
        "title": "San Luis Dam Embankment",
        "subtitle": "Santa Nella, CA | Embankment moisture",
        "category": "seepage",
        "severity": "critical",
        "severity_label": "Not yet assessed",
        "lat": 37.0582,
        "lng": -121.0744,
        "zoom": 14,
        "metric": "ndmi",
        "sensor": "sentinel-2-l2a",
        "start_date": "2026-06-01",
        "end_date": "2026-08-30",
        "usgs_station": "11262900",
        "station_name": "USGS #11262900 (Mud Slough near Gustine, about 27 km from the dam)",
        "impact_area": "",
        "peak_zscore": "",
        "hazard_type": "Embankment moisture (seepage screening)",
        "drone_status": "No drone survey uploaded",
        "description": "Earthfill dam on San Luis Reservoir. Seepage often shows up as wetter ground on the downstream side. Tiepoint compares surface moisture (NDMI) around the dam between the same season in consecutive years."
    },
    {
        "id": "HAB-02",
        # Sentinel-2 tile that covers this site; the scene date is a placeholder.
        "scene_id": "S2A_MSIL2A_20260820_T17TLG",
        "title": "Lake Erie Western Basin",
        "subtitle": "Toledo, OH | Chlorophyll in surface water",
        "category": "hab",
        "severity": "critical",
        "severity_label": "Not yet assessed",
        "lat": 41.7450,
        "lng": -83.2500,
        "zoom": 11,
        "metric": "ndci",
        "sensor": "sentinel-2-l2a",
        "start_date": "2026-07-01",
        "end_date": "2026-08-28",
        "usgs_station": "04193500",
        "station_name": "USGS #04193500 (Maumee River Inflow)",
        "impact_area": "",
        "peak_zscore": "",
        "hazard_type": "Algal bloom screening (chlorophyll index)",
        "drone_status": "No drone survey uploaded",
        "description": "Western Lake Erie near the Maumee River mouth, where summer cyanobacteria blooms are common. Tiepoint compares a chlorophyll index (NDCI) over the water between the same season in consecutive years. NDCI is a screening proxy, not a toxin measurement."
    },
    {
        "id": "INUNDATION-03",
        # Sentinel-2 tile that covers this site; the scene date is a placeholder.
        "scene_id": "S2A_MSIL2A_20260820_T15RTN",
        "title": "Lower Brazos River Basin",
        "subtitle": "Richmond, TX | Surface water extent",
        "category": "inundation",
        "severity": "warning",
        "severity_label": "Not yet assessed",
        "lat": 29.5822,
        "lng": -95.7655,
        "zoom": 12,
        "metric": "mndwi",
        "sensor": "sentinel-2-l2a",
        "start_date": "2026-05-15",
        "end_date": "2026-06-30",
        "usgs_station": "08114000",
        "station_name": "USGS #08114000 (Brazos River at Richmond)",
        "impact_area": "",
        "peak_zscore": "",
        "hazard_type": "Flood extent screening (water index)",
        "drone_status": "No drone survey uploaded",
        "description": "Brazos River floodplain near Richmond. Tiepoint measures how much of the area is open water (MNDWI above 0) and compares it with the same season a year earlier."
    },
    {
        "id": "TAILINGS-04",
        # Sentinel-2 tile that covers this site; the scene date is a placeholder.
        "scene_id": "S2A_MSIL2A_20260820_T12SVA",
        "title": "Silver Bell Mine Impoundment",
        "subtitle": "Pima County, AZ | Surface moisture near tailings",
        "category": "seepage",
        "severity": "warning",
        "severity_label": "Not yet assessed",
        "lat": 32.3912,
        "lng": -111.4920,
        "zoom": 14,
        "metric": "ndmi",
        "sensor": "sentinel-2-l2a",
        "start_date": "2026-04-01",
        "end_date": "2026-07-20",
        "usgs_station": "09486000",
        "station_name": "USGS #09486000 (Rillito Creek, Tucson AZ: not at the mine site)",
        "impact_area": "",
        "peak_zscore": "",
        "hazard_type": "Tailings area moisture screening",
        "drone_status": "No drone survey uploaded",
        "description": "Silver Bell mine tailings area. Tiepoint compares surface moisture (NDMI) between the same season in consecutive years; wetter ground near a tailings toe can warrant an inspection."
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
                # Built-in sites: refresh reference fields that were corrected in code
                # (gauge names, scene tiles) so old saved copies don't keep wrong labels.
                for base in INITIAL_EVENTS:
                    saved = self.events.get(base["id"])
                    if saved is not None:
                        for key in ("station_name", "scene_id", "subtitle", "hazard_type", "description",
                                    "severity_label", "impact_area", "peak_zscore", "drone_status"):
                            if key in base:
                                saved[key] = base[key]
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
