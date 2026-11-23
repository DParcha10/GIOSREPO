"""Serve the built web app (gios-react/dist) from the API server.

Used for single-service hosting (for example Render), so the site and the
API share one address and the same-site login cookie works. Only active when
the build folder exists. The pages themselves are public; every API call they
make still goes through the login check.
"""
from __future__ import annotations

import mimetypes
import os
import re

STATIC_DIR = os.environ.get(
    "TIEPOINT_STATIC_DIR",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "gios-react", "dist"),
)

# Client-side routes of the React app (see gios-react/src/App.jsx).
_SPA_ROUTES = re.compile(
    r"^/(|login|map|dashboard|analytics|methodology|info|settings|agent|ai-agent|event/[A-Za-z0-9_-]{1,64})/?$"
)
_ASSET = re.compile(r"^/(assets/[A-Za-z0-9_.-]{1,200}|[A-Za-z0-9_-]{1,64}\.(svg|png|ico|txt|webmanifest))$")


def _file_response_parts(path: str):
    with open(path, "rb") as f:
        body = f.read()
    ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
    return body, ctype


class FrontendMiddleware:
    def __init__(self, app, static_dir: str = STATIC_DIR):
        self.app = app
        self.static_dir = os.path.realpath(static_dir)
        self.index = os.path.join(self.static_dir, "index.html")
        self.enabled = os.path.isfile(self.index)

    def _target(self, scope) -> str | None:
        if not self.enabled or scope["type"] != "http" or scope["method"] not in ("GET", "HEAD"):
            return None
        path = scope["path"]
        if _ASSET.match(path):
            candidate = os.path.realpath(os.path.join(self.static_dir, path.lstrip("/")))
            if candidate.startswith(self.static_dir + os.sep) and os.path.isfile(candidate):
                return candidate
            return None
        if _SPA_ROUTES.match(path):
            accept = dict(scope.get("headers") or []).get(b"accept", b"").decode("latin-1")
            # Browsers navigating to a page ask for HTML; API clients don't.
            if "text/html" in accept:
                return self.index
        return None

    async def __call__(self, scope, receive, send):
        target = self._target(scope)
        if target is None:
            await self.app(scope, receive, send)
            return
        body, ctype = _file_response_parts(target)
        cache = b"public, max-age=31536000, immutable" if "/assets/" in target else b"no-cache"
        await send({
            "type": "http.response.start",
            "status": 200,
            "headers": [
                (b"content-type", ctype.encode()),
                (b"content-length", str(len(body)).encode()),
                (b"cache-control", cache),
                (b"x-content-type-options", b"nosniff"),
            ],
        })
        await send({"type": "http.response.body", "body": b"" if scope["method"] == "HEAD" else body})
