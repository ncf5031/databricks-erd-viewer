"""
ERD Viewer - Unity Catalog Browser Service

Lists catalogs, schemas, and tables via SQL queries through the warehouse.
Uses SHOW CATALOGS/SCHEMAS/TABLES which respects per-user UC permissions
and only requires the 'sql' OAuth scope.
"""

import logging
from utils.database import execute_query_with_columns, validate_identifier, quote_identifier
from models.catalog import CatalogInfo, SchemaInfo
from models.table import TableSummary

logger = logging.getLogger(__name__)


def list_catalogs(user_token: str) -> list[CatalogInfo]:
    """List all catalogs accessible to the current user via SQL."""
    try:
        rows, _ = execute_query_with_columns(
            "SHOW CATALOGS", user_token=user_token,
        )
        catalogs = []
        for row in rows:
            catalogs.append(CatalogInfo(
                name=row.get("catalog", ""),
                comment=row.get("comment"),
                owner=row.get("owner"),
            ))
        return catalogs
    except Exception as e:
        logger.warning(f"Failed to list catalogs: {e}")
        return []


def list_schemas(user_token: str, catalog_name: str) -> list[SchemaInfo]:
    """List all schemas in a catalog accessible to the current user via SQL."""
    validate_identifier(catalog_name, "catalog")
    try:
        rows, _ = execute_query_with_columns(
            f"SHOW SCHEMAS IN {quote_identifier(catalog_name)}",
            user_token=user_token, catalog=catalog_name,
        )
        schemas = []
        for row in rows:
            schema_name = row.get("databaseName", row.get("schema_name", row.get("namespace", "")))
            # Skip information_schema — not useful for ERD browsing
            if schema_name == "information_schema":
                continue
            schemas.append(SchemaInfo(
                name=schema_name,
                catalog_name=catalog_name,
                comment=row.get("comment"),
                owner=row.get("owner"),
            ))
        return schemas
    except Exception as e:
        logger.warning(f"Failed to list schemas for catalog '{catalog_name}': {e}")
        return []


def list_tables(user_token: str, catalog_name: str, schema_name: str, conn=None) -> list[TableSummary]:
    """List all tables in a schema accessible to the current user via SQL."""
    validate_identifier(catalog_name, "catalog")
    validate_identifier(schema_name, "schema")
    try:
        rows, _ = execute_query_with_columns(
            f"SHOW TABLES IN {quote_identifier(catalog_name)}.{quote_identifier(schema_name)}",
            user_token=user_token, catalog=catalog_name, schema=schema_name, conn=conn,
        )
        tables = []
        for row in rows:
            table_name = row.get("tableName", row.get("table_name", ""))
            is_temp = row.get("isTemporary", "false")
            tables.append(TableSummary(
                name=table_name,
                full_name=f"{catalog_name}.{schema_name}.{table_name}",
                table_type="TEMPORARY" if is_temp == "true" else "MANAGED",
                comment=row.get("comment"),
                owner=row.get("owner"),
            ))
        return tables
    except Exception as e:
        logger.warning(f"Failed to list tables for '{catalog_name}.{schema_name}': {e}")
        return []
