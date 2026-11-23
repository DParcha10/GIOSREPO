"""Real Sentinel-2 index tiles from Microsoft Planetary Computer.

Replaces the synthetic sine-wave tiles for the band-ratio indices that can be
computed directly from Sentinel-2 L2A surface reflectance. For each request we
find the least-cloudy scene covering the tile in the date window (public STAC
search, no account needed), then ask Planetary Computer's tile service to
compute the index and colour it.

Set TIEPOINT_REAL_TILES=0 to turn this off (the test suite does, to stay offline).
"""
from __future__ import annotations

import logging
import math
import os
import threading
import time
from collections import OrderedDict
from datetime import date, timedelta
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

STAC_SEARCH = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
TILE_URL = "https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png"
COLLECTION = "sentinel-2-l2a"

# Normalized-difference indices: (expression, default display range, default colormap, legend low, legend high)
INDICES = {
    "mndwi": ("(B03-B11)/(B03+B11)", (-0.6, 0.6), "rdbu", "Dry land", "Open water"),
    "ndwi": ("(B03-B08)/(B03+B08)", (-0.6, 0.6), "rdbu", "Vegetation / land", "Open water"),
    "ndvi": ("(B08-B04)/(B08+B04)", (-0.2, 0.9), "rdylgn", "Bare / water", "Dense vegetation"),
    "ndmi": ("(B08-B11)/(B08+B11)", (-0.4, 0.6), "brbg", "Dry", "Moist vegetation"),
    "ndci": ("(B05-B04)/(B05+B04)", (-0.1, 0.3), "viridis", "Low chlorophyll", "High chlorophyll"),
    "nbr": ("(B08-B12)/(B08+B12)", (-0.5, 0.8), "rdylgn", "Burned / bare", "Healthy vegetation"),
}

# Colormap names the frontend sends, mapped to Planetary Computer (rio-tiler) names.
_CMAPS = {"spectral": "spectral", "rdbu": "rdbu", "rdylgn": "rdylgn", "viridis": "viridis",
          "magma": "magma", "inferno": "inferno", "plasma": "plasma", "brbg": "brbg",
          "blues": "blues", "greens": "greens", "ylgnbu": "ylgnbu", "terrain": "terrain"}

_scene_cache: dict = {}
_tile_cache: "OrderedDict[str, bytes]" = OrderedDict()
_lock = threading.Lock()
_TILE_CACHE_MAX = 2000


def enabled() -> bool:
    return os.environ.get("TIEPOINT_REAL_TILES", "1") != "0"


def supports(collection: str, index: Optional[str]) -> bool:
    return enabled() and (collection or "").lower() == COLLECTION and (index or "").lower() in INDICES


def tile_center(z: int, x: int, y: int) -> tuple:
    n = 2 ** z
    lon = (x + 0.5) / n * 360.0 - 180.0
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + 0.5) / n))))
    return lon, lat


def _window(pre: Optional[str], post: Optional[str]) -> str:
    try:
        end = date.fromisoformat(post) if post else date.today()
    except ValueError:
        end = date.today()
    try:
        start = date.fromisoformat(pre) if pre else end - timedelta(days=90)
    except ValueError:
        start = end - timedelta(days=90)
    if start >= end:
        start = end - timedelta(days=90)
    return f"{start.isoformat()}/{end.isoformat()}"


def find_scene(lon: float, lat: float, pre: Optional[str] = None, post: Optional[str] = None) -> Optional[dict]:
    """Least-cloudy Sentinel-2 L2A scene covering the point in the window (cached)."""
    window = _window(pre, post)
    key = (round(lon, 1), round(lat, 1), window)
    hit = _scene_cache.get(key)
    if hit and time.time() - hit[0] < 6 * 3600:
        return hit[1]
    body = {
        "collections": [COLLECTION],
        "intersects": {"type": "Point", "coordinates": [lon, lat]},
        "datetime": window,
        "query": {"eo:cloud_cover": {"lt": 30}},
        "sortby": [{"field": "eo:cloud_cover", "direction": "asc"}],
        "limit": 1,
    }
    scene = None
    try:
        r = httpx.post(STAC_SEARCH, json=body, timeout=20)
        r.raise_for_status()
        feats = r.json().get("features") or []
        if feats:
            f = feats[0]
            p = f.get("properties", {})
            scene = {
                "item_id": f["id"],
                "datetime": p.get("datetime"),
                "cloud_cover": p.get("eo:cloud_cover"),
                "mgrs_tile": p.get("s2:mgrs_tile"),
                "platform": p.get("platform"),
            }
    except Exception as exc:  # network trouble: caller falls back
        logger.warning("Sentinel-2 scene search failed: %s", exc)
        return None
    _scene_cache[key] = (time.time(), scene)
    return scene


def render(z: int, x: int, y: int, index: str, rescale: Optional[str], colormap: Optional[str],
           pre: Optional[str], post: Optional[str]) -> Optional[tuple]:
    """Return (png_bytes, scene) or None if no real tile could be produced."""
    index = index.lower()
    expr, default_range, default_cmap, _, _ = INDICES[index]
    lon, lat = tile_center(z, x, y)
    scene = find_scene(lon, lat, pre, post)
    if not scene:
        return None
    # Fixed, documented stretch per index so the legend always matches the tiles.
    lo, hi = default_range
    requested = (colormap or "").lower()
    cmap = default_cmap if requested in ("", "spectral") else _CMAPS.get(requested, default_cmap)
    key = f"{scene['item_id']}|{index}|{z}/{x}/{y}|{lo},{hi}|{cmap}"
    with _lock:
        if key in _tile_cache:
            _tile_cache.move_to_end(key)
            return _tile_cache[key], scene
    params = {
        "collection": COLLECTION, "item": scene["item_id"], "expression": expr,
        "rescale": f"{lo},{hi}", "colormap_name": cmap, "asset_as_band": "True", "nodata": "0",
    }
    try:
        r = httpx.get(TILE_URL.format(z=z, x=x, y=y), params=params, timeout=30)
    except Exception as exc:
        logger.warning("Sentinel-2 tile fetch failed: %s", exc)
        return None
    if r.status_code == 404:
        return TRANSPARENT_PNG, scene  # tile outside the scene footprint
    if r.status_code != 200 or not r.headers.get("content-type", "").startswith("image/"):
        logger.warning("Sentinel-2 tile service returned %s", r.status_code)
        return None
    with _lock:
        _tile_cache[key] = r.content
        while len(_tile_cache) > _TILE_CACHE_MAX:
            _tile_cache.popitem(last=False)
    return r.content, scene


def legend(index: str) -> Optional[dict]:
    spec = INDICES.get((index or "").lower())
    if not spec:
        return None
    expr, (lo, hi), cmap, low_label, high_label = spec
    return {"index": index.lower(), "expression": expr, "range": [lo, hi], "colormap": cmap,
            "low_label": low_label, "high_label": high_label}


def _transparent_png() -> bytes:
    import struct
    import zlib

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + b"\x00\x00\x00\x00" * 256 for _ in range(256))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 256, 256, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


TRANSPARENT_PNG = _transparent_png()
