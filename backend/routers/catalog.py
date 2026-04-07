"""
ERD Viewer - Catalog & Schema API Routes
"""

import logging
from fastapi import APIRouter, Request, Query

from models.catalog import CatalogInfo, SchemaInfo
from services.uc_browser import list_catalogs, list_schemas
from cache import metadata_cache
from auth import get_user_email, get_user_token

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/catalogs", response_model=list[CatalogInfo])
async def get_catalogs(
    request: Request,
    refresh: bool = Query(False, description="Bypass cache"),
):
    """List all accessible Unity Catalog catalogs."""
    user = get_user_email(request)
    cache_key = "all"

    if not refresh:
        cached = metadata_cache.get("catalogs", user, cache_key)
        if cached is not None:
            return cached

    token = get_user_token(request)
    catalogs = list_catalogs(token)
    metadata_cache.set("catalogs", user, cache_key, value=catalogs)
    return catalogs


@router.get("/api/catalogs/{catalog}/schemas", response_model=list[SchemaInfo])
async def get_schemas(
    catalog: str,
    request: Request,
    refresh: bool = Query(False, description="Bypass cache"),
):
    """List all schemas in a catalog."""
    user = get_user_email(request)
    cache_key = catalog

    if not refresh:
        cached = metadata_cache.get("schemas", user, cache_key)
        if cached is not None:
            return cached

    token = get_user_token(request)
    schemas = list_schemas(token, catalog)
    metadata_cache.set("schemas", user, cache_key, value=schemas)
    return schemas
