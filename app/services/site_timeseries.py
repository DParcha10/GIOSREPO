"""Real time series for a monitored site.

- Satellite: monthly index values over the site's assessment box, from the
  clearest Sentinel-2 L2A scene each month (Planetary Computer).
- Ground: daily mean discharge from the site's USGS stream gauge (NWIS).

Putting the two side by side is the point of Tiepoint: the satellite sees the
area, the gauge sees one point, and the question is whether they agree.
"""
from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

import httpx

from app.services.real_tiles import INDICES, STAC_SEARCH
from app.services.site_assessment import HALF_SIZE, _area_km2, _box, _stats

logger = logging.getLogger(__name__)

USGS_DV = "https://waterservices.usgs.gov/nwis/dv/"
CACHE_SECONDS = 6 * 3600
_cache: dict = {}


def _cached(key, fn):
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_SECONDS:
        return hit[1]
    value = fn()
    _cache[key] = (time.time(), value)
    return value


def index_timeseries(event: dict, months: int = 24) -> dict:
    def build():
        index = (event.get("metric") or "ndmi").lower()
        if index not in INDICES:
            return {"status": "unavailable", "reason": f"No real data method for {index.upper()}"}
        expr = INDICES[index][0]
        d = HALF_SIZE.get(event["id"], 0.0045)
        geom = _box(event["lat"], event["lng"], d)
        end = date.today()
        start = end - timedelta(days=int(months * 30.5))
        r = httpx.post(STAC_SEARCH, json={
            "collections": ["sentinel-2-l2a"], "intersects": geom,
            "datetime": f"{start.isoformat()}/{end.isoformat()}",
            "query": {"eo:cloud_cover": {"lt": 30}},
            "sortby": [{"field": "eo:cloud_cover", "direction": "asc"}], "limit": 500}, timeout=60)
        r.raise_for_status()
        best = {}
        for f in r.json().get("features") or []:
            p = f["properties"]
            month = (p.get("datetime") or "")[:7]
            if month and month not in best:  # sorted clearest first
                best[month] = {"item_id": f["id"], "date": p["datetime"][:10],
                               "cloud_cover": round(float(p.get("eo:cloud_cover") or 0), 2)}

        def measure(scene):
            try:
                st = _stats(scene["item_id"], expr, geom)
                out = {**scene, "mean": st["mean"], "std": st["std"]}
                if index in ("mndwi", "ndwi") and "water_pct" in st:
                    out["water_pct"] = st["water_pct"]
                return out
            except Exception as exc:
                logger.warning("Stats failed for %s: %s", scene["item_id"], exc)
                return None

        with ThreadPoolExecutor(max_workers=6) as pool:
            points = [p for p in pool.map(measure, [best[m] for m in sorted(best)]) if p]
        return {
            "status": "ok", "index": index, "expression": expr,
            "aoi_km2": _area_km2(event["lat"], d), "points": points,
            "method": ((f"Share of a {_area_km2(event['lat'], d)} km² box around the site that is open water "
                        f"({index.upper()} above 0)" if index in ("mndwi", "ndwi") else
                        f"Mean {index.upper()} over a {_area_km2(event['lat'], d)} km² box around the site")
                       + f", from the "
                       f"clearest Sentinel-2 L2A scene each month (under 30% cloud). Months with no such scene are "
                       f"left out. Clouds are not masked pixel by pixel."),
        }

    try:
        return _cached(("idx", event["id"], months), build)
    except Exception as exc:
        logger.warning("Time series failed for %s: %s", event["id"], exc)
        return {"status": "unavailable", "reason": "Imagery service unreachable"}


def gauge_daily(site_id: str, days: int = 730) -> dict:
    def build():
        r = httpx.get(USGS_DV, params={"format": "json", "sites": site_id, "parameterCd": "00060",
                                       "period": f"P{days}D"}, timeout=40)
        r.raise_for_status()
        series = r.json().get("value", {}).get("timeSeries") or []
        if not series:
            return {"status": "unavailable", "reason": "No discharge record from USGS for this gauge"}
        ts = series[0]
        values = []
        for v in ts["values"][0]["value"]:
            try:
                q = float(v["value"])
            except (TypeError, ValueError):
                continue
            if q < 0:  # USGS uses -999999 for missing
                continue
            values.append({"date": v["dateTime"][:10], "discharge_cfs": q,
                           "provisional": "P" in (v.get("qualifiers") or [])})
        return {"status": "ok", "site_id": site_id, "site_name": ts["sourceInfo"]["siteName"],
                "unit": "ft³/s (daily mean)", "values": values,
                "source": "USGS National Water Information System, daily values (00060). "
                          "Values marked provisional may be revised."}

    try:
        return _cached(("gauge", site_id, days), build)
    except Exception as exc:
        logger.warning("USGS daily values failed for %s: %s", site_id, exc)
        return {"status": "unavailable", "reason": "USGS service unreachable"}
