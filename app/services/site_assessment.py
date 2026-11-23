"""Measured site assessments from real Sentinel-2 imagery.

Replaces the invented hazard ratings ("HIGH HAZARD", "+2.84 sigma"). For each
site we take the clearest Sentinel-2 L2A scene in the event's date window and
the clearest scene in the same window one year earlier, compute the site's
index over a fixed box around it (Planetary Computer statistics API), and
report the difference.

This is a screening comparison, not a hazard rating: it says whether the
surface signal changed compared with last year, using fixed, published
thresholds. It does not say why.
"""
from __future__ import annotations

import logging
import math
import time
from datetime import date
from typing import Optional

import httpx

from app.services.real_tiles import INDICES, STAC_SEARCH

logger = logging.getLogger(__name__)

STATS_URL = "https://planetarycomputer.microsoft.com/api/data/v1/item/statistics"
CACHE_SECONDS = 6 * 3600
_cache: dict = {}

# Box half-size (degrees) per site: small for structures, larger for lakes and floodplains.
HALF_SIZE = {"SEEPAGE-01": 0.0045, "HAB-02": 0.03, "INUNDATION-03": 0.02, "TAILINGS-04": 0.0045}

# Screening thresholds: change in index mean (or in open-water share, in points).
THRESHOLD = {"ndmi": 0.05, "ndvi": 0.05, "ndci": 0.05, "nbr": 0.1, "mndwi": 5.0, "ndwi": 5.0}

WORDS = {
    "ndmi": ("Wetter than", "Drier than", "attention_if_up"),
    "ndvi": ("Greener than", "Less vegetated than", "attention_if_down"),
    "ndci": ("More chlorophyll than", "Less chlorophyll than", "attention_if_up"),
    "nbr": ("Recovered since", "Burned or cleared since", "attention_if_down"),
    "mndwi": ("More open water than", "Less open water than", "attention_if_up"),
    "ndwi": ("More open water than", "Less open water than", "attention_if_up"),
}


def _box(lat: float, lon: float, d: float) -> dict:
    return {"type": "Polygon", "coordinates": [[[lon - d, lat - d], [lon + d, lat - d], [lon + d, lat + d],
                                                [lon - d, lat + d], [lon - d, lat - d]]]}


def _area_km2(lat: float, d: float) -> float:
    return round((2 * d * 111.32) * (2 * d * 111.32 * math.cos(math.radians(lat))), 2)


def _shift_year(iso: str, years: int) -> str:
    d = date.fromisoformat(iso)
    try:
        return d.replace(year=d.year + years).isoformat()
    except ValueError:  # 29 Feb
        return d.replace(year=d.year + years, day=28).isoformat()


def _clearest_scene(geom: dict, start: str, end: str) -> Optional[dict]:
    feats = []
    for max_cloud in (20, 50):  # rainy seasons may have nothing under 20%
        r = httpx.post(STAC_SEARCH, json={
            "collections": ["sentinel-2-l2a"], "intersects": geom, "datetime": f"{start}/{end}",
            "query": {"eo:cloud_cover": {"lt": max_cloud}},
            "sortby": [{"field": "eo:cloud_cover", "direction": "asc"}], "limit": 1}, timeout=30)
        r.raise_for_status()
        feats = r.json().get("features") or []
        if feats:
            break
    if not feats:
        return None
    p = feats[0]["properties"]
    return {"item_id": feats[0]["id"], "date": (p.get("datetime") or "")[:10],
            "cloud_cover": round(float(p.get("eo:cloud_cover") or 0), 2), "platform": p.get("platform")}


def _stats(item_id: str, expression: str, geom: dict) -> dict:
    r = httpx.post(STATS_URL, params={
        "collection": "sentinel-2-l2a", "item": item_id, "expression": expression,
        "asset_as_band": "True", "nodata": "0", "max_size": "1024", "histogram_bins": "40",
        "histogram_range": "-1,1"}, json={"type": "Feature", "properties": {}, "geometry": geom}, timeout=60)
    r.raise_for_status()
    stats = r.json()["properties"]["statistics"]
    band = next(iter(stats.values()))
    out = {"mean": round(band["mean"], 4), "std": round(band["std"], 4),
           "valid_percent": round(band.get("valid_percent", 100.0), 1)}
    hist = band.get("histogram")
    if hist and len(hist) == 2:
        counts, edges = hist
        total = sum(counts) or 1
        out["water_pct"] = round(100.0 * sum(c for c, e in zip(counts, edges) if e >= 0) / total, 1)
    return out


def assess(event: dict) -> dict:
    key = event["id"]
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_SECONDS:
        return hit[1]
    index = (event.get("metric") or "ndmi").lower()
    if index not in INDICES:
        return {"status": "unavailable", "label": "Not assessed", "reason": f"No real data method for {index.upper()}"}
    expr = INDICES[index][0]
    d = HALF_SIZE.get(key, 0.0045)
    geom = _box(event["lat"], event["lng"], d)
    start, end = event["start_date"], event["end_date"]
    try:
        now = _clearest_scene(geom, start, end)
        base = None
        if now:
            # Same time of year one year earlier (within 30 days), so seasons match.
            anchor = date.fromisoformat(_shift_year(now["date"], -1))
            base = _clearest_scene(geom, date.fromordinal(anchor.toordinal() - 30).isoformat(),
                                   date.fromordinal(anchor.toordinal() + 30).isoformat())
        if not now or not base:
            result = {"status": "unavailable", "label": "Not assessed",
                      "reason": "No Sentinel-2 scene under 50% cloud in one of the windows"}
        else:
            now["stats"] = _stats(now["item_id"], expr, geom)
            base["stats"] = _stats(base["item_id"], expr, geom)
            water = index in ("mndwi", "ndwi")
            if not water:
                now["stats"].pop("water_pct", None)
                base["stats"].pop("water_pct", None)
            if water:
                change = round(now["stats"]["water_pct"] - base["stats"]["water_pct"], 1)
            else:
                change = round(now["stats"]["mean"] - base["stats"]["mean"], 4)
            up, down, rule = WORDS[index]
            year = base["date"][:4]
            if abs(change) < THRESHOLD[index]:
                label, tone = f"No clear change vs {year}", "neutral"
            elif change > 0:
                label = f"{up} {year}"
                tone = "attention" if rule == "attention_if_up" else "neutral"
            else:
                label = f"{down} {year}"
                tone = "attention" if rule == "attention_if_down" else "neutral"
            cloudy = max(now["cloud_cover"], base["cloud_cover"]) > 20
            result = {
                "status": "ok", "index": index, "label": label, "tone": tone,
                "confidence": "low" if cloudy else "normal",
                "confidence_note": ("One or both scenes are over 20% cloud; clouds and shadows can bias the result."
                                    if cloudy else ""),
                "change": change, "change_unit": "percentage points of open water" if water else f"{index.upper()} units",
                "threshold": THRESHOLD[index],
                "aoi": {"half_size_deg": d, "area_km2": _area_km2(event["lat"], d)},
                "current": now, "baseline": base,
                "method": (f"Mean {index.upper()} ({expr}) over a {_area_km2(event['lat'], d)} km² box around the site, "
                           f"clearest Sentinel-2 L2A scene in {start} to {end} (under 20% cloud, or 50% if none), compared "
                           f"with the clearest scene within 30 days of the same date one year earlier. Changes smaller than {THRESHOLD[index]} "
                           f"{'points' if water else 'units'} are reported as no clear change. Screening only; "
                           f"clouds and shadows are not masked pixel by pixel."),
            }
    except Exception as exc:
        logger.warning("Assessment failed for %s: %s", key, exc)
        result = {"status": "unavailable", "label": "Not assessed", "reason": "Imagery service unreachable"}
        _cache[key] = (time.time() - CACHE_SECONDS + 300, result)  # retry in 5 minutes
        return result
    _cache[key] = (time.time(), result)
    return result
