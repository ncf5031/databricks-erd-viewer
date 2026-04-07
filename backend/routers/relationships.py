"""
ERD Viewer - Relationships API Route
"""

import logging
from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse

from models.relationship import Relationship
from services.relationship_svc import get_explicit_relationships, get_inferred_relationships
from services.table_detail import get_tables_with_columns
from cache import metadata_cache
from auth import get_user_email, get_user_token

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/api/catalogs/{catalog}/schemas/{schema}/relationships",
    response_model=list[Relationship],
)
async def get_relationships(
    catalog: str,
    schema: str,
    request: Request,
    include_inferred: bool = Query(False, description="Include heuristic-inferred relationships"),
    refresh: bool = Query(False, description="Bypass cache"),
):
    """
    Get relationships for all tables in a schema.

    By default returns only explicit FK constraints from information_schema.
    Set include_inferred=true to also get heuristic-inferred relationships.
    """
    user = get_user_email(request)
    cache_key_suffix = "with_inferred" if include_inferred else "explicit_only"

    if not refresh:
        cached = metadata_cache.get("relationships", user, catalog, schema, cache_key_suffix)
        if cached is not None:
            return cached

    # Always fetch explicit FKs
    token = get_user_token(request)
    try:
        relationships = get_explicit_relationships(token, catalog, schema)
    except PermissionError as e:
        return JSONResponse(status_code=403, content={"detail": str(e)})

    # Mark FK columns in table details for inference accuracy
    if include_inferred:
        tables = get_tables_with_columns(token, catalog, schema)

        # Mark columns that are already explicit FKs
        explicit_fk_cols = set()
        for rel in relationships:
            explicit_fk_cols.add((rel.source_table, rel.source_column))

        for table in tables:
            for col in table.columns:
                if (table.name, col.name) in explicit_fk_cols:
                    col.is_foreign_key = True

        inferred = get_inferred_relationships(tables)

        # Filter out inferred relationships that duplicate explicit ones
        explicit_set = {
            (r.source_table, r.source_column, r.target_table, r.target_column)
            for r in relationships
        }
        for inf_rel in inferred:
            key = (inf_rel.source_table, inf_rel.source_column, inf_rel.target_table, inf_rel.target_column)
            if key not in explicit_set:
                relationships.append(inf_rel)

    metadata_cache.set("relationships", user, catalog, schema, cache_key_suffix, value=relationships)
    return relationships
