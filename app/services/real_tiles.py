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


# ---------------------------------------------------------------------------
# Terrain (Copernicus DEM GLO-30) and radar (Sentinel-1 RTC) layers
# ---------------------------------------------------------------------------
STATS_URL = "https://planetarycomputer.microsoft.com/api/data/v1/item/statistics"

LAYERS = {
    ("terrain", "elevation"): {
        "collection": "cop-dem-glo-30", "params": {"assets": "data"},
        "stretch": "dem", "title": "Elevation (shaded relief)", "unit": "m above EGM2008 geoid",
        "low": "Lower", "high": "Higher", "colormap": "hypso",
    },
    ("terrain", "hillshade"): {
        "collection": "cop-dem-glo-30", "params": {"assets": "data", "algorithm": "hillshade", "buffer": "3"},
        "title": "Hillshade", "unit": "sun azimuth 315°, altitude 45°",
        "low": "Shadow", "high": "Lit", "colormap": "greys", "range": [0, 255],
    },
    ("terrain", "slope"): {
        "collection": "cop-dem-glo-30",
        "params": {"assets": "data", "algorithm": "slope", "buffer": "3", "rescale": "0,45", "colormap_name": "ylorrd"},
        "title": "Slope", "unit": "degrees", "low": "Flat", "high": "Steep (45°+)", "colormap": "ylorrd", "range": [0, 45],
    },
    ("sar", "vv"): {
        "collection": "sentinel-1-rtc",
        "params": {"expression": "10*log10(vv)", "asset_as_band": "True", "rescale": "-25,0", "colormap_name": "greys_r"},
        "title": "Sentinel-1 VV backscatter", "unit": "dB (gamma0, terrain corrected)",
        "low": "Smooth / water", "high": "Rough / built-up", "colormap": "greys_r", "range": [-25, 0],
    },
    ("sar", "vh"): {
        "collection": "sentinel-1-rtc",
        "params": {"expression": "10*log10(vh)", "asset_as_band": "True", "rescale": "-30,-5", "colormap_name": "greys_r"},
        "title": "Sentinel-1 VH backscatter", "unit": "dB (gamma0, terrain corrected)",
        "low": "Smooth / water", "high": "Vegetation volume", "colormap": "greys_r", "range": [-30, -5],
    },
    ("sar", "ratio_vh_vv"): {
        "collection": "sentinel-1-rtc",
        "params": {"expression": "10*log10(vh/vv)", "asset_as_band": "True", "rescale": "-20,-5", "colormap_name": "viridis"},
        "title": "Sentinel-1 VH/VV ratio", "unit": "dB", "low": "Surface scattering", "high": "Volume scattering",
        "colormap": "viridis", "range": [-20, -5],
    },
    ("sar", "dual_pol_rgb"): {
        "collection": "sentinel-1-rtc",
        "params": {"expression": "10*log10(vv);10*log10(vh);10*log10(vv/vh)", "asset_as_band": "True",
                   "rescale": ["-25,0", "-30,-5", "0,15"]},
        "title": "Sentinel-1 dual-pol composite", "unit": "R = VV, G = VH, B = VV/VH (dB)",
        "low": "", "high": "", "colormap": "rgb",
    },
}

_dem_stats: dict = {}


def layer_supported(kind: str, key: str) -> bool:
    return enabled() and (kind, (key or "").lower()) in LAYERS


def _find_item(collection: str, lon: float, lat: float, pre=None, post=None) -> Optional[dict]:
    key = (collection, round(lon, 1), round(lat, 1), pre, post)
    hit = _scene_cache.get(key)
    if hit and time.time() - hit[0] < 6 * 3600:
        return hit[1]
    body = {"collections": [collection], "intersects": {"type": "Point", "coordinates": [lon, lat]}, "limit": 1}
    if collection == "sentinel-1-rtc":
        body["datetime"] = _window(pre, post)
        body["sortby"] = [{"field": "datetime", "direction": "desc"}]
    try:
        r = httpx.post(STAC_SEARCH, json=body, timeout=20)
        r.raise_for_status()
        feats = r.json().get("features") or []
    except Exception as exc:
        logger.warning("%s search failed: %s", collection, exc)
        return None
    item = None
    if feats:
        f = feats[0]
        p = f.get("properties", {})
        item = {"item_id": f["id"], "datetime": p.get("datetime"), "platform": p.get("platform"),
                "orbit": p.get("sat:orbit_state"), "collection": collection}
    _scene_cache[key] = (time.time(), item)
    return item


def _dem_range(item_id: str) -> tuple:
    if item_id in _dem_stats:
        return _dem_stats[item_id]
    rng = (0.0, 1000.0)
    try:
        r = httpx.get(STATS_URL, params={"collection": "cop-dem-glo-30", "item": item_id, "assets": "data",
                                         "max_size": "512"}, timeout=30)
        band = next(iter(r.json().values()))
        lo, hi = float(band["percentile_2"]), float(band["percentile_98"])
        if hi > lo:
            rng = (round(lo), round(hi))
    except Exception as exc:
        logger.warning("DEM statistics failed: %s", exc)
    _dem_stats[item_id] = rng
    return rng


def layer_info(kind: str, key: str, lon: float, lat: float, pre=None, post=None) -> Optional[dict]:
    spec = LAYERS.get((kind, (key or "").lower()))
    if not spec:
        return None
    item = _find_item(spec["collection"], lon, lat, pre, post)
    if not item:
        return None
    legend = {k: spec[k] for k in ("title", "unit", "low", "high", "colormap") if k in spec}
    legend["range"] = list(_dem_range(item["item_id"])) if spec.get("stretch") == "dem" else spec.get("range")
    return {"scene": item, "legend": legend}


def render_layer(kind: str, key: str, z: int, x: int, y: int, pre=None, post=None,
                 rescale: Optional[str] = None) -> Optional[tuple]:
    spec = LAYERS[(kind, key.lower())]
    lon, lat = tile_center(z, x, y)
    item = _find_item(spec["collection"], lon, lat, pre, post)
    if not item:
        return None
    params = {"collection": spec["collection"], "item": item["item_id"], "nodata": "0", **spec["params"]}
    if spec["collection"] == "cop-dem-glo-30":
        params.pop("nodata")
    if spec.get("stretch") == "dem":
        # One stretch for the whole view (sent by the client from the legend),
        # so neighbouring 1-degree DEM tiles don't show seams.
        lo, hi = _dem_range(item["item_id"])
        if rescale:
            try:
                a, b = (float(v) for v in rescale.split(",")[:2])
                if a < b:
                    lo, hi = a, b
            except ValueError:
                pass
        params["rescale"] = f"{lo},{hi}"
    cache_key = f"{kind}|{key}|{item['item_id']}|{z}/{x}/{y}|{params.get('rescale')}"
    with _lock:
        if cache_key in _tile_cache:
            _tile_cache.move_to_end(cache_key)
            return _tile_cache[cache_key], item
    try:
        r = httpx.get(TILE_URL.format(z=z, x=x, y=y), params=params, timeout=30)
    except Exception as exc:
        logger.warning("%s tile fetch failed: %s", kind, exc)
        return None
    if r.status_code == 404:
        return TRANSPARENT_PNG, item
    if r.status_code != 200 or not r.headers.get("content-type", "").startswith("image/"):
        logger.warning("%s tile service returned %s: %s", kind, r.status_code, r.text[:200])
        return None
    with _lock:
        _tile_cache[cache_key] = r.content
        while len(_tile_cache) > _TILE_CACHE_MAX:
            _tile_cache.popitem(last=False)
    return r.content, item


# ---------------------------------------------------------------------------
# Mosaics: stitch every scene covering a tile (no seams or blank squares at
# scene / DEM-cell edges). Planetary Computer keeps registered searches, so
# each (collection, window) is registered once and reused.
# ---------------------------------------------------------------------------
DATA_API = "https://planetarycomputer.microsoft.com/api/data/v1"
MOSAIC_TILE = DATA_API + "/mosaic/{sid}/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png"
_mosaics: dict = {}


def mosaic_id(collection: str, pre=None, post=None) -> Optional[str]:
    window = _window(pre, post) if collection != "cop-dem-glo-30" else None
    key = (collection, window)
    if key in _mosaics:
        return _mosaics[key]
    body = {"collections": [collection]}
    if collection == "sentinel-2-l2a":
        body.update({"datetime": window, "filter-lang": "cql2-json",
                     "filter": {"op": "<=", "args": [{"property": "eo:cloud_cover"}, 20]},
                     "sortby": [{"field": "eo:cloud_cover", "direction": "asc"}]})
    elif collection == "sentinel-1-rtc":
        body.update({"datetime": window, "sortby": [{"field": "datetime", "direction": "desc"}]})
    try:
        r = httpx.post(DATA_API + "/mosaic/register", json=body, timeout=30)
        r.raise_for_status()
        data = r.json()
        sid = data.get("searchid") or data.get("id")
    except Exception as exc:
        logger.warning("Mosaic registration failed for %s: %s", collection, exc)
        return None
    _mosaics[key] = sid
    return sid


def fetch_mosaic_tile(collection: str, z: int, x: int, y: int, params: dict, pre=None, post=None) -> Optional[bytes]:
    sid = mosaic_id(collection, pre, post)
    if not sid:
        return None
    cache_key = f"mosaic|{sid}|{z}/{x}/{y}|{sorted((k, str(v)) for k, v in params.items())}"
    with _lock:
        if cache_key in _tile_cache:
            _tile_cache.move_to_end(cache_key)
            return _tile_cache[cache_key]
    try:
        r = httpx.get(MOSAIC_TILE.format(sid=sid, z=z, x=x, y=y),
                      params={"collection": collection, **params}, timeout=40)
    except Exception as exc:
        logger.warning("Mosaic tile fetch failed: %s", exc)
        return None
    if r.status_code in (204, 404):
        return TRANSPARENT_PNG  # no scenes cover this tile in the window
    if r.status_code != 200 or not r.headers.get("content-type", "").startswith("image/"):
        logger.warning("Mosaic tile service returned %s: %s", r.status_code, r.text[:200])
        return None
    with _lock:
        _tile_cache[cache_key] = r.content
        while len(_tile_cache) > _TILE_CACHE_MAX:
            _tile_cache.popitem(last=False)
    return r.content


def render_index_mosaic(z, x, y, index, colormap, pre, post) -> Optional[tuple]:
    expr, (lo, hi), default_cmap, _, _ = INDICES[index.lower()]
    requested = (colormap or "").lower()
    cmap = default_cmap if requested in ("", "spectral") else _CMAPS.get(requested, default_cmap)
    png = fetch_mosaic_tile(COLLECTION, z, x, y, {
        "expression": expr, "asset_as_band": "True", "rescale": f"{lo},{hi}",
        "colormap_name": cmap, "nodata": "0"}, pre, post)
    if png is None:
        return None
    return png, {"item_id": f"mosaic:{mosaic_id(COLLECTION, pre, post)}", "collection": COLLECTION}


def render_layer_mosaic(kind, key, z, x, y, pre=None, post=None, rescale=None) -> Optional[tuple]:
    spec = LAYERS[(kind, key.lower())]
    params = dict(spec["params"])
    if spec["collection"] != "cop-dem-glo-30":
        params["nodata"] = "0"
    if spec.get("stretch") == "dem":
        lo, hi = 0.0, 1000.0
        if rescale:
            try:
                a, b = (float(v) for v in rescale.split(",")[:2])
                if a < b:
                    lo, hi = a, b
            except ValueError:
                pass
        else:
            lon, lat = tile_center(z, x, y)
            item = _find_item("cop-dem-glo-30", lon, lat)
            if item:
                lo, hi = _dem_range(item["item_id"])
        params["rescale"] = f"{lo},{hi}"
        params.pop("colormap_name", None)
        grey = fetch_mosaic_tile(spec["collection"], z, x, y, params, pre, post)
        if grey is None:
            return None
        if grey is TRANSPARENT_PNG:
            png = grey
        else:
            shade = fetch_mosaic_tile(spec["collection"], z, x, y,
                                      {"assets": "data", "algorithm": "hillshade", "buffer": "3"})
            png = shaded_relief(grey, shade if shade is not TRANSPARENT_PNG else None)
        return png, {"item_id": f"mosaic:{mosaic_id(spec['collection'])}", "collection": spec["collection"]}
    png = fetch_mosaic_tile(spec["collection"], z, x, y, params, pre, post)
    if png is None:
        return None
    return png, {"item_id": f"mosaic:{mosaic_id(spec['collection'], pre, post)}", "collection": spec["collection"]}


# ---------------------------------------------------------------------------
# Shaded-relief elevation: hypsometric tint (green lowlands, tan, brown,
# white peaks) multiplied by hillshade, as on printed topographic maps.
# Colour is applied here because the tint is too long to pass in a URL.
# ---------------------------------------------------------------------------
_HYPSO_STOPS = [(0, (74, 121, 74)), (60, (140, 170, 96)), (120, (216, 204, 140)),
                (180, (186, 140, 92)), (225, (150, 110, 90)), (255, (248, 246, 242))]
HYPSO_RAMP_CSS = ["#4a794a", "#8caa60", "#d8cc8c", "#ba8c5c", "#966e5a", "#f8f6f2"]


def _hypso_lut():
    import numpy as np
    lut = np.zeros((256, 3), dtype=np.uint8)
    for (a, ca), (b, cb) in zip(_HYPSO_STOPS, _HYPSO_STOPS[1:]):
        for v in range(a, b + 1):
            t = (v - a) / (b - a)
            lut[v] = [round(ca[i] + (cb[i] - ca[i]) * t) for i in range(3)]
    return lut


def shaded_relief(grey_png: bytes, shade_png: Optional[bytes]) -> bytes:
    import io
    import numpy as np
    from PIL import Image
    g = Image.open(io.BytesIO(grey_png))
    alpha = None
    if g.mode in ("LA", "RGBA"):
        alpha = np.asarray(g.getchannel("A"))
    grey = np.asarray(g.convert("L"))
    rgb = _hypso_lut()[grey].astype(np.float32)
    if shade_png:
        hs = np.asarray(Image.open(io.BytesIO(shade_png)).convert("L"), dtype=np.float32) / 255.0
        rgb *= (0.45 + 0.65 * hs)[..., None]
    out = np.clip(rgb, 0, 255).astype(np.uint8)
    a = alpha if alpha is not None else np.full(grey.shape, 255, np.uint8)
    buf = io.BytesIO()
    Image.fromarray(np.dstack([out, a]), "RGBA").save(buf, format="PNG", compress_level=1)
    return buf.getvalue()
