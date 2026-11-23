"""Stamp "SIMULATED" onto every map tile that is not real data.

Real tiles (Sentinel-2, Sentinel-1, Copernicus DEM, uploaded drone surveys)
carry an X-Tiepoint-Source header. Any other PNG served from a tile route was
drawn by the old synthetic renderer, so it is hatched and labelled in the
image itself. A simulated map can then never be mistaken for a measurement,
whichever screen or export it ends up in.
"""
from __future__ import annotations

import io
from functools import lru_cache

from PIL import Image, ImageDraw, ImageFont

_MARK = "SIMULATED"


@lru_cache(maxsize=4)
def _overlay(size: tuple) -> Image.Image:
    w, h = size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    # Light diagonal hatching so the pattern reads as "not data" at a glance.
    for off in range(-h, w, 16):
        draw.line([(off, h), (off + h, 0)], fill=(134, 100, 18, 70), width=1)
    try:
        font = ImageFont.load_default(size=max(12, w // 12))
    except TypeError:  # older Pillow
        font = ImageFont.load_default()
    box = draw.textbbox((0, 0), _MARK, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    x, y = (w - tw) // 2, (h - th) // 2
    draw.rectangle([x - 6, y - 4, x + tw + 6, y + th + 8], fill=(246, 238, 214, 210), outline=(134, 100, 18, 255))
    draw.text((x, y), _MARK, fill=(134, 100, 18, 255), font=font)
    return layer


def stamp(png: bytes) -> bytes:
    try:
        img = Image.open(io.BytesIO(png)).convert("RGBA")
    except Exception:
        return png
    if img.width < 64 or img.height < 64:
        return png
    out = Image.alpha_composite(img, _overlay(img.size))
    buf = io.BytesIO()
    out.save(buf, format="PNG", compress_level=1)
    return buf.getvalue()


class SimulatedTileMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or "/tiles/" not in scope["path"]:
            await self.app(scope, receive, send)
            return

        start = {}
        chunks = []

        async def capture(message):
            if message["type"] == "http.response.start":
                start.update(message)
                return
            if message["type"] == "http.response.body":
                chunks.append(message.get("body", b""))
                if message.get("more_body"):
                    return
                headers = list(start.get("headers", []))
                names = {k.lower(): v for k, v in headers}
                body = b"".join(chunks)
                is_png = names.get(b"content-type", b"").startswith(b"image/png")
                if start.get("status") == 200 and is_png and b"x-tiepoint-source" not in names:
                    body = stamp(body)
                    headers = [(k, v) for k, v in headers if k.lower() not in (b"content-length", b"etag")]
                    headers += [(b"content-length", str(len(body)).encode()), (b"x-tiepoint-source", b"simulated")]
                    start["headers"] = headers
                await send(start)
                await send({"type": "http.response.body", "body": body})
                return
            await send(message)

        await self.app(scope, receive, capture)
