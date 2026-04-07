"""
ERD Viewer - Export API Route
"""

import logging
from fastapi import APIRouter, Request
from pydantic import BaseModel

from services.ddl_generator import get_ddl_batch
from auth import get_user_token

logger = logging.getLogger(__name__)

router = APIRouter()


class DDLExportRequest(BaseModel):
    catalog: str
    schema_name: str  # 'schema' is a reserved Pydantic field name
    tables: list[str]


class DDLExportResponse(BaseModel):
    ddl: str


@router.post("/api/export/ddl", response_model=DDLExportResponse)
async def export_ddl(request: Request, body: DDLExportRequest):
    """
    Generate CREATE TABLE DDL for the specified tables.
    Returns combined DDL for all requested tables.
    """
    token = get_user_token(request)
    ddl = get_ddl_batch(token, body.catalog, body.schema_name, body.tables)
    return DDLExportResponse(ddl=ddl)
