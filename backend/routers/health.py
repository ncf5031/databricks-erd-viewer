"""
ERD Viewer - Health Check Router

Provides detailed health check endpoint with warehouse and UC connectivity tests.
"""

import time
import logging
from fastapi import APIRouter

from config import SQL_WAREHOUSE_ID, CACHE_TTL_SECONDS, MAX_TABLES_ON_CANVAS, APP_VERSION
from models.health import HealthResponse, HealthCheckDetail, CacheStats

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/health", response_model=HealthResponse)
async def detailed_health_check():
    """
    Detailed health check with warehouse and UC API connectivity tests.
    Returns status: healthy, degraded, or unhealthy.
    """
    checks = {}
    overall_status = "healthy"

    # Check SQL Warehouse connectivity
    warehouse_check = HealthCheckDetail(ok=False)
    try:
        from utils.database import execute_query
        start = time.time()
        execute_query("SELECT 1 AS test")
        latency = (time.time() - start) * 1000
        warehouse_check.ok = True
        warehouse_check.latency_ms = round(latency, 1)

        if latency > 5000:
            overall_status = "degraded"
    except RuntimeError as e:
        warehouse_check.ok = False
        warehouse_check.error = str(e)
        overall_status = "unhealthy"
    except Exception as e:
        warehouse_check.ok = False
        warehouse_check.error = f"Unexpected error: {str(e)}"
        overall_status = "unhealthy"
    checks["warehouse"] = warehouse_check

    # Check UC API connectivity
    uc_check = HealthCheckDetail(ok=False)
    try:
        from auth import get_app_client as _get_app_client
        start = time.time()
        client = _get_app_client()
        # Simple UC API call to verify connectivity
        list(client.catalogs.list())
        latency = (time.time() - start) * 1000
        uc_check.ok = True
        uc_check.latency_ms = round(latency, 1)
    except Exception as e:
        uc_check.ok = False
        uc_check.error = str(e)
        if overall_status == "healthy":
            overall_status = "unhealthy"
    checks["uc_api"] = uc_check

    # Cache stats (will be populated once cache module is built)
    checks["cache"] = CacheStats(entries=0, hit_rate=0.0)

    return HealthResponse(
        status=overall_status,
        version=APP_VERSION,
        checks=checks,
        config={
            "warehouse_id": SQL_WAREHOUSE_ID[:8] + "..." if SQL_WAREHOUSE_ID else "not configured",
            "cache_ttl": CACHE_TTL_SECONDS,
            "max_canvas_tables": MAX_TABLES_ON_CANVAS,
        }
    )


@router.get("/api/config")
async def get_config():
    """Return application configuration (non-sensitive)."""
    return {
        "version": APP_VERSION,
        "cache_ttl": CACHE_TTL_SECONDS,
        "max_canvas_tables": MAX_TABLES_ON_CANVAS,
        "warehouse_configured": bool(SQL_WAREHOUSE_ID),
    }
