"""DiskCache Wrapper for Deterministic Geo Caching."""
import hashlib
import json
import logging
from typing import Any, Optional
import diskcache as dc
from app.config import settings

logger = logging.getLogger(__name__)

class CacheManager:
    def __init__(self, directory: str = settings.cache_dir, default_ttl: int = settings.cache_ttl_seconds):
        self.cache = dc.Cache(directory)
        self.default_ttl = default_ttl

    def _generate_key(self, prefix: str, params: Any) -> str:
        serialized = json.dumps(params, sort_keys=True, default=str)
        hashed = hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:16]
        return f"{prefix}:{hashed}"

    def get(self, prefix: str, params: Any) -> Optional[Any]:
        key = self._generate_key(prefix, params)
        val = self.cache.get(key)
        if val is not None:
            logger.debug("Cache hit for %s", key)
        return val

    def set(self, prefix: str, params: Any, value: Any, ttl: Optional[int] = None) -> None:
        key = self._generate_key(prefix, params)
        expire = ttl if ttl is not None else self.default_ttl
        self.cache.set(key, value, expire=expire)
        logger.debug("Cached %s for %ds", key, expire)

    def clear(self) -> None:
        self.cache.clear()

cache_manager = CacheManager()
