"""
ERD Viewer - Table API Routes
"""

import logging
from fastapi import APIRouter, Request, Query, HTTPException

from models.table import TableSummary, TableDetail
from services.uc_browser import list_tables
from services.table_detail import get_table_detail, get_tables_with_columns
from cache import metadata_cache
from auth import get_user_email, get_user_token

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/api/catalogs/{catalog}/schemas/{schema}/tables",
    response_model=list[TableDetail],
)
async def get_tables(
    catalog: str,
    schema: str,
    request: Request,
    refresh: bool = Query(False, description="Bypass cache"),
):
    """
    List all tables in a schema with column details.
    Returns tables with columns for ERD rendering.
    """
    user = get_user_email(request)

    if not refresh:
        cached = metadata_cache.get("tables", user, catalog, schema)
        if cached is not None:
            return cached

    token = get_user_token(request)
    tables = get_tables_with_columns(token, catalog, schema)
    metadata_cache.set("tables", user, catalog, schema, value=tables)
    return tables


@router.get(
    "/api/catalogs/{catalog}/schemas/{schema}/tables/{table}",
    response_model=TableDetail,
)
async def get_single_table(
    catalog: str,
    schema: str,
    table: str,
    request: Request,
    refresh: bool = Query(False, description="Bypass cache"),
):
    """Get full detail for a single table."""
    user = get_user_email(request)

    if not refresh:
        cached = metadata_cache.get("table_details", user, catalog, schema, table)
        if cached is not None:
            return cached

    token = get_user_token(request)
    detail = get_table_detail(token, catalog, schema, table)
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Table '{catalog}.{schema}.{table}' not found")

    metadata_cache.set("table_details", user, catalog, schema, table, value=detail)
    return detail
