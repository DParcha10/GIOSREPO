"""Outbound URL checks.

Anything the server fetches or posts to on a user's behalf (webhooks, the
assistant's page reader) goes through here first, so a user cannot point the
server at localhost, the cloud metadata service or a private network.

Limit: the check resolves the name once. A hostile DNS server can still answer
differently on the second lookup (DNS rebinding). Run the backend behind an
egress firewall if that matters for your deployment.
"""
from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlsplit, urljoin

import httpx

MAX_REDIRECTS = 3


class BlockedURL(ValueError):
    """Raised when a URL points somewhere the server must not reach."""


def _is_public(ip: str) -> bool:
    addr = ipaddress.ip_address(ip)
    if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
        addr = addr.ipv4_mapped
    return addr.is_global and not addr.is_multicast


def check_public_url(url: str) -> str:
    """Return the URL if it is http(s) and every address it resolves to is public."""
    parts = urlsplit(url or "")
    if parts.scheme not in ("http", "https"):
        raise BlockedURL("Only http and https URLs are allowed")
    if parts.username or parts.password:
        raise BlockedURL("URLs with embedded credentials are not allowed")
    host = parts.hostname
    if not host:
        raise BlockedURL("URL has no host")
    try:
        port = parts.port or (443 if parts.scheme == "https" else 80)
    except ValueError as exc:
        raise BlockedURL("URL has an invalid port") from exc
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise BlockedURL("Host does not resolve") from exc
    if not infos:
        raise BlockedURL("Host does not resolve")
    for info in infos:
        if not _is_public(info[4][0]):
            raise BlockedURL("URL points to a private or reserved address")
    return url


async def safe_request(method: str, url: str, *, timeout: float = 10.0, **kwargs) -> httpx.Response:
    """Send a request, re-checking every redirect hop against check_public_url."""
    current = check_public_url(url)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        for _ in range(MAX_REDIRECTS + 1):
            resp = await client.request(method, current, **kwargs)
            if resp.is_redirect and resp.headers.get("location"):
                current = check_public_url(urljoin(current, resp.headers["location"]))
                method, kwargs = "GET", {k: v for k, v in kwargs.items() if k == "headers"}
                continue
            return resp
    raise BlockedURL("Too many redirects")
