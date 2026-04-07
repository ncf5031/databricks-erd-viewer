"""
ERD Viewer - Schema Comparison API Route
"""

import logging
from fastapi import APIRouter, HTTPException, Request

from models.comparison import (
    TableComparisonRequest,
    TableComparisonResult,
    SchemaComparisonRequest,
    SchemaComparisonResult,
)
from services.comparison_svc import compare_tables, compare_schemas
from auth import get_user_token

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/api/compare", response_model=TableComparisonResult)
async def compare_tables_endpoint(request: Request, body: TableComparisonRequest):
    """Compare two tables across catalogs."""
    token = get_user_token(request)
    result = compare_tables(
        user_token=token,
        left_catalog=body.left_catalog,
        left_schema=body.left_schema,
        left_table=body.left_table,
        right_catalog=body.right_catalog,
        right_schema=body.right_schema,
        right_table=body.right_table,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="One or both tables not found. Verify catalog/schema/table names and permissions.",
        )

    return result


@router.post("/api/compare/schemas", response_model=SchemaComparisonResult)
async def compare_schemas_endpoint(request: Request, body: SchemaComparisonRequest):
    """Compare all tables across two schemas."""
    token = get_user_token(request)
    result = compare_schemas(
        user_token=token,
        left_catalog=body.left_catalog,
        left_schema=body.left_schema,
        right_catalog=body.right_catalog,
        right_schema=body.right_schema,
    )
    return result
