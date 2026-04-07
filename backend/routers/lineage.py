"""
ERD Viewer - Column Lineage API Routes
"""

import logging
from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse

from models.lineage import ColumnLineage, TableLineageResult
from services.lineage_svc import get_column_lineage, get_table_lineage
from cache import metadata_cache
from auth import get_user_email, get_user_token

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/api/catalogs/{catalog}/schemas/{schema}/lineage",
    response_model=list[ColumnLineage],
)
async def get_schema_lineage(
    catalog: str,
    schema: str,
    request: Request,
    refresh: bool = Query(False, description="Bypass cache"),
):
    """Get column-level lineage for all tables in a schema (last 7 days)."""
    user = get_user_email(request)

    if not refresh:
        cached = metadata_cache.get("relationships", user, catalog, schema, "lineage")
        if cached is not None:
            return cached

    token = get_user_token(request)
    try:
        lineage = get_column_lineage(token, catalog, schema)
    except PermissionError as e:
        return JSONResponse(status_code=403, content={"detail": str(e)})
    metadata_cache.set("relationships", user, catalog, schema, "lineage", value=lineage)
    return lineage


@router.get(
    "/api/catalogs/{catalog}/schemas/{schema}/tables/{table}/lineage",
    response_model=TableLineageResult,
)
async def get_table_lineage_endpoint(
    catalog: str,
    schema: str,
    table: str,
    request: Request,
    refresh: bool = Query(False, description="Bypass cache"),
):
    """Get upstream and downstream lineage for a specific table."""
    user = get_user_email(request)

    if not refresh:
        cached = metadata_cache.get("relationships", user, catalog, schema, table, "table_lineage")
        if cached is not None:
            return cached

    token = get_user_token(request)
    try:
        result = get_table_lineage(token, catalog, schema, table)
    except PermissionError as e:
        return JSONResponse(status_code=403, content={"detail": str(e)})
    metadata_cache.set("relationships", user, catalog, schema, table, "table_lineage", value=result)
    return result
