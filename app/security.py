"""Security primitives for GIOS: default-deny authentication and safe file paths.

Standard library only, so it can be tested without the geospatial stack.
"""
import hashlib
import json
import os
import re
from http.cookies import CookieError, SimpleCookie
from typing import Awaitable, Callable, Iterable, Optional

SESSION_COOKIE = "gios_session"

# (method, path) pairs reachable without logging in. Everything else is denied,
# including routes added in the future.
PUBLIC_ROUTES = frozenset(
    {("GET", "/health"), ("HEAD", "/health")}
    | {
        ("POST", prefix + path)
        for prefix in ("", "/api/v1")
        for path in ("/auth/token", "/auth/register", "/auth/logout")
    }
)

# Requests the browser issues itself (<img> tiles, EventSource, download links)
# cannot carry an Authorization header. Only these GETs may use the cookie.
_COOKIE_SUFFIXES = (".png", ".pbf", "/alerts/stream", "/agent/stream-alerts", "/reports/pdf")
_COOKIE_EXACT = frozenset({"/docs", "/openapi.json"})

_SAFE_COMPONENT = re.compile(r"[A-Za-z0-9_.,=+ -]{1,200}")
_ORTHO_ID = re.compile(r"[A-Za-z0-9_-]{1,64}")
_TIFF_MAGIC = (b"II*\x00", b"MM\x00*", b"II+\x00", b"MM\x00+")


def is_public(method: str, path: str) -> bool:
    return (method, path) in PUBLIC_ROUTES


def allows_cookie(method: str, path: str) -> bool:
    if method not in ("GET", "HEAD"):
        return False
    return path in _COOKIE_EXACT or path.endswith(_COOKIE_SUFFIXES) or "/export/" in path


class RequireLoginMiddleware:
    """Pure ASGI middleware, so streaming responses are never buffered."""

    def __init__(self, app, authenticate: Callable[[str], Awaitable[bool]]):
        self.app = app
        self.authenticate = authenticate

    async def __call__(self, scope, receive, send):
        kind = scope["type"]
        if kind == "lifespan":
            return await self.app(scope, receive, send)
        if kind == "http":
            method, path = scope["method"], scope["path"]
            if is_public(method, path):
                return await self.app(scope, receive, send)
            token = self._token(scope, method, path)
            if token and await self.authenticate(token):
                return await self.app(scope, receive, send)
            return await self._reject(send)
        if kind == "websocket":
            await send({"type": "websocket.close", "code": 1008})

    @staticmethod
    def _token(scope, method: str, path: str) -> Optional[str]:
        authorization, cookies = None, []
        for key, value in scope.get("headers", []):
            key = key.lower()
            if key == b"authorization":
                authorization = value.decode("latin-1")
            elif key == b"cookie":
                cookies.append(value.decode("latin-1"))
        if authorization is not None:
            scheme, _, credential = authorization.partition(" ")
            return credential.strip() if scheme.lower() == "bearer" else None
        if cookies and allows_cookie(method, path):
            jar = SimpleCookie()
            try:
                jar.load("; ".join(cookies))
            except CookieError:
                return None
            if SESSION_COOKIE in jar:
                return jar[SESSION_COOKIE].value
        return None

    @staticmethod
    async def _reject(send):
        body = json.dumps({"detail": "Not authenticated"}).encode()
        await send({
            "type": "http.response.start",
            "status": 401,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
                (b"www-authenticate", b"Bearer"),
                (b"cache-control", b"no-store"),
            ],
        })
        await send({"type": "http.response.body", "body": body})


def safe_component(value) -> str:
    """Return value as one harmless path component, hashing anything unsafe."""
    text = os.fspath(value)
    # Trailing dots and spaces are rejected because Windows strips them.
    if _SAFE_COMPONENT.fullmatch(text) and text[-1] not in ". ":
        return text
    digest = "unsafe-" + hashlib.sha256(text.encode("utf-8", "surrogatepass")).hexdigest()
    extension = re.search(r"\.[A-Za-z0-9]{1,8}\Z", text)
    return digest + (extension.group(0) if extension else "")


def safe_join(root: str, *parts) -> str:
    """os.path.join for untrusted parts. Only root may contain separators."""
    return os.path.join(root, *(safe_component(part) for part in parts))


def validate_ortho_id(value: str) -> str:
    if not _ORTHO_ID.fullmatch(value):
        raise ValueError("ortho_id may contain only letters, digits, '-' and '_' (max 64)")
    return value


def resolve_geotiff(path: str, allowed_roots: Iterable[str]) -> str:
    """Resolve path, requiring a real TIFF inside one of allowed_roots.

    The magic-byte check stops GDAL virtual formats (which can reference other
    files or URLs) being smuggled in under a .tif name.
    """
    error = ValueError("file_path must be a GeoTIFF inside a GIOS drone data directory")
    if not path or "\x00" in path or not path.lower().endswith((".tif", ".tiff")):
        raise error
    resolved = os.path.realpath(path)
    for root in allowed_roots:
        root = os.path.realpath(root)
        if resolved.startswith(os.path.join(root, "")):
            break
    else:
        raise error
    if not os.path.isfile(resolved):
        raise error
    with open(resolved, "rb") as handle:
        if handle.read(4) not in _TIFF_MAGIC:
            raise error
    return resolved
