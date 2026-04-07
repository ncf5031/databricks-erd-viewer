"""
ERD Viewer - Health Check Models
"""

from typing import Optional
from pydantic import BaseModel


class HealthCheckDetail(BaseModel):
    ok: bool
    latency_ms: Optional[float] = None
    error: Optional[str] = None


class CacheStats(BaseModel):
    entries: int = 0
    hit_rate: float = 0.0


class HealthResponse(BaseModel):
    status: str  # "healthy", "degraded", "unhealthy"
    version: str
    checks: dict[str, HealthCheckDetail | CacheStats]
    config: dict[str, str | int]
