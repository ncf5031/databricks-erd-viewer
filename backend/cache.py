"""
ERD Viewer - Cache Layer

In-memory TTL cache with LRU eviction for UC metadata.
Per-user cache keys for security isolation.
"""

import logging
from cachetools import TTLCache

from config import CACHE_TTL_SECONDS, CACHE_MAX_ENTRIES

logger = logging.getLogger(__name__)


class MetadataCache:
    """
    Multi-tier cache for Unity Catalog metadata.
    Each data type gets its own cache with appropriate TTL.
    Cache keys include user identity for per-user isolation.
    """

    def __init__(self):
        # Catalog list changes rarely — 10 minute TTL
        self.catalogs = TTLCache(maxsize=CACHE_MAX_ENTRIES, ttl=600)

        # Schema/table metadata — 5 minute TTL (configurable)
        self.schemas = TTLCache(maxsize=CACHE_MAX_ENTRIES, ttl=CACHE_TTL_SECONDS)
        self.tables = TTLCache(maxsize=CACHE_MAX_ENTRIES, ttl=CACHE_TTL_SECONDS)
        self.table_details = TTLCache(maxsize=CACHE_MAX_ENTRIES, ttl=CACHE_TTL_SECONDS)
        self.relationships = TTLCache(maxsize=CACHE_MAX_ENTRIES, ttl=CACHE_TTL_SECONDS)

        # DDL changes rarely — 10 minute TTL
        self.ddl = TTLCache(maxsize=CACHE_MAX_ENTRIES, ttl=600)

        # Stats tracking
        self._hits = 0
        self._misses = 0

    def _make_key(self, user_email: str, *parts: str) -> str:
        """Create a cache key scoped to the user."""
        return f"{user_email}:{':'.join(parts)}"

    def get(self, cache_name: str, user_email: str, *key_parts: str):
        """
        Get a value from the named cache.

        Args:
            cache_name: Which cache tier to use (catalogs, schemas, tables, etc.)
            user_email: User identity for cache key scoping
            *key_parts: Additional key components (catalog, schema, table names)

        Returns:
            Cached value or None if not found
        """
        cache = getattr(self, cache_name, None)
        if cache is None:
            return None

        key = self._make_key(user_email, *key_parts)
        value = cache.get(key)

        if value is not None:
            self._hits += 1
            logger.debug(f"Cache HIT: {cache_name}:{key}")
        else:
            self._misses += 1
            logger.debug(f"Cache MISS: {cache_name}:{key}")

        return value

    def set(self, cache_name: str, user_email: str, *key_parts: str, value):
        """
        Set a value in the named cache.

        Args:
            cache_name: Which cache tier to use
            user_email: User identity for cache key scoping
            *key_parts: Additional key components
            value: Value to cache (must be passed as keyword argument)
        """
        cache = getattr(self, cache_name, None)
        if cache is None:
            return

        key = self._make_key(user_email, *key_parts)
        cache[key] = value
        logger.debug(f"Cache SET: {cache_name}:{key}")

    def invalidate(self, cache_name: str, user_email: str, *key_parts: str):
        """Remove a specific entry from cache."""
        cache = getattr(self, cache_name, None)
        if cache is None:
            return

        key = self._make_key(user_email, *key_parts)
        cache.pop(key, None)

    def clear_all(self):
        """Clear all caches."""
        self.catalogs.clear()
        self.schemas.clear()
        self.tables.clear()
        self.table_details.clear()
        self.relationships.clear()
        self.ddl.clear()
        self._hits = 0
        self._misses = 0

    @property
    def stats(self) -> dict:
        """Return cache statistics."""
        total = self._hits + self._misses
        return {
            "entries": (
                len(self.catalogs) + len(self.schemas) + len(self.tables)
                + len(self.table_details) + len(self.relationships) + len(self.ddl)
            ),
            "hit_rate": round(self._hits / total, 2) if total > 0 else 0.0,
            "hits": self._hits,
            "misses": self._misses,
        }


# Global cache instance
metadata_cache = MetadataCache()
