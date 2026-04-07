"""
ERD Viewer - Database Utilities

Executes SQL via Databricks SQL Connector using on-behalf-of-user authorization.
Follows the documented pattern: user's access token passed directly to sql.connect().
Ref: https://docs.databricks.com/dev-tools/databricks-apps/auth
"""

import os
import re
import logging
from databricks.sdk.core import Config
from databricks import sql as dbsql

from config import SQL_WAREHOUSE_ID

logger = logging.getLogger(__name__)

# Regex for valid UC identifiers: letters, digits, underscores, hyphens, dots (for FQN parts)
_VALID_IDENTIFIER_RE = re.compile(r"^[a-zA-Z0-9_\-]+$")


def validate_identifier(name: str, label: str = "identifier") -> str:
    """
    Validate a Unity Catalog identifier (catalog, schema, or table name).

    Rejects names containing characters that could enable SQL injection.
    Valid characters: letters, digits, underscores, hyphens.

    Args:
        name: The identifier to validate
        label: Human-readable label for error messages (e.g., "catalog", "schema")

    Returns:
        The validated name (unchanged)

    Raises:
        ValueError: If the name contains invalid characters
    """
    if not name or not _VALID_IDENTIFIER_RE.match(name):
        raise ValueError(
            f"Invalid {label} name: '{name}'. "
            f"Names may only contain letters, digits, underscores, and hyphens."
        )
    return name


def quote_identifier(name: str) -> str:
    """
    Safely quote a UC identifier with backticks, escaping any embedded backticks.

    Should be used AFTER validate_identifier() for defense-in-depth.
    """
    return f"`{name.replace('`', '``')}`"


# Warehouse HTTP path derived from warehouse ID
_WAREHOUSE_HTTP_PATH = f"/sql/1.0/warehouses/{SQL_WAREHOUSE_ID}" if SQL_WAREHOUSE_ID else ""


def _get_host() -> str:
    """Get workspace hostname from environment."""
    host = os.environ.get("DATABRICKS_HOST", "")
    if host and not host.startswith("https://"):
        host = f"https://{host}"
    return host.rstrip("/")


def get_connection(
    user_token: str | None = None,
    catalog: str | None = None,
    schema: str | None = None,
):
    """Create a Databricks SQL connection."""
    host = _get_host()
    if not host:
        raise RuntimeError("No host configured.")
    if not SQL_WAREHOUSE_ID:
        raise RuntimeError("SQL_WAREHOUSE_ID not configured.")

    server_hostname = host.replace("https://", "").rstrip("/")

    connect_kwargs: dict = {
        "server_hostname": server_hostname,
        "http_path": _WAREHOUSE_HTTP_PATH,
    }

    if user_token:
        connect_kwargs["access_token"] = user_token
    else:
        cfg = Config()
        connect_kwargs["credentials_provider"] = lambda: cfg.authenticate

    if catalog:
        connect_kwargs["catalog"] = catalog
    if schema:
        connect_kwargs["schema"] = schema

    return dbsql.connect(**connect_kwargs)


# Backward-compatible alias
_connect = get_connection


def execute_query(
    sql_statement: str,
    user_token: str | None = None,
    catalog: str | None = None,
    schema: str | None = None,
    conn=None,
) -> list[list[str]]:
    """
    Execute a SQL query via the Databricks SQL Connector.

    Args:
        sql_statement: SQL statement to execute
        user_token: User's access token
        catalog: Optional catalog context
        schema: Optional schema context
        conn: Optional existing connection to reuse
    """
    logger.debug(f"Executing SQL: {sql_statement[:200]}...")

    owns_conn = conn is None
    if owns_conn:
        conn = get_connection(user_token=user_token, catalog=catalog, schema=schema)
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql_statement)
            rows = cursor.fetchall()
            return [[str(v) if v is not None else None for v in row] for row in rows]
    finally:
        if owns_conn:
            conn.close()


def execute_query_with_columns(
    sql_statement: str,
    user_token: str | None = None,
    catalog: str | None = None,
    schema: str | None = None,
    # Keep client param for backward compatibility (ignored)
    client=None,
    conn=None,
) -> tuple[list[dict], list[str]]:
    """
    Execute a SQL query and return results as list of dicts with column names.

    Args:
        sql_statement: SQL statement to execute
        user_token: User's access token
        catalog: Optional catalog context
        schema: Optional schema context
        conn: Optional existing connection to reuse
    """
    logger.debug(f"Executing SQL: {sql_statement[:200]}...")

    owns_conn = conn is None
    if owns_conn:
        conn = get_connection(user_token=user_token, catalog=catalog, schema=schema)
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql_statement)
            column_names = [desc[0] for desc in cursor.description] if cursor.description else []
            rows_raw = cursor.fetchall()
            rows = []
            for row in rows_raw:
                row_dict = {}
                for i, col_name in enumerate(column_names):
                    val = row[i] if i < len(row) else None
                    row_dict[col_name] = str(val) if val is not None else None
                rows.append(row_dict)
            return rows, column_names
    finally:
        if owns_conn:
            conn.close()
