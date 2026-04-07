"""
ERD Viewer - DDL Generator Service

Generates CREATE TABLE DDL statements from Unity Catalog metadata.
"""

import logging
from utils.database import execute_query, get_connection

logger = logging.getLogger(__name__)


def get_ddl(user_token: str, catalog: str, schema: str, table: str, conn=None) -> str:
    """
    Get DDL for a single table using SHOW CREATE TABLE.

    Returns the DDL string or an error message if unavailable.
    """
    full_name = f"{catalog}.{schema}.{table}"
    try:
        rows = execute_query(f"SHOW CREATE TABLE {full_name}", user_token=user_token, conn=conn)
        if rows:
            # SHOW CREATE TABLE returns rows that concatenate into the full DDL
            ddl_parts = [row[0] for row in rows if row]
            return "\n".join(ddl_parts)
        return f"-- No DDL available for {full_name}"
    except Exception as e:
        logger.warning(f"Failed to get DDL for {full_name}: {e}")
        return f"-- Error generating DDL for {full_name}: {str(e)}"


def get_ddl_batch(user_token: str, catalog: str, schema: str, table_names: list[str]) -> str:
    """
    Generate DDL for multiple tables, separated by blank lines.

    Args:
        catalog: Catalog name
        schema: Schema name
        table_names: List of table names to generate DDL for

    Returns:
        Combined DDL string for all requested tables
    """
    conn = get_connection(user_token=user_token, catalog=catalog, schema=schema)
    try:
        ddl_parts = []
        for table_name in table_names:
            ddl = get_ddl(user_token, catalog, schema, table_name, conn=conn)
            ddl_parts.append(ddl)
            ddl_parts.append("")  # Blank line separator

        return "\n".join(ddl_parts).strip()
    finally:
        conn.close()
