"""
ERD Viewer - Column-Level Lineage Service

Queries system.access.column_lineage to retrieve column-level data flow.
Supports both schema-wide and table-specific lineage queries.
"""

import logging
from utils.database import execute_query_with_columns, get_connection
from models.lineage import ColumnLineage, TableLineageResult

logger = logging.getLogger(__name__)


def get_column_lineage(user_token: str, catalog: str, schema: str) -> list[ColumnLineage]:
    """Get column-level lineage for all tables in a schema (last 30 days)."""
    sql = f"""
    SELECT DISTINCT
        source_table_full_name AS source_table,
        source_column_name AS source_column,
        target_table_full_name AS target_table,
        target_column_name AS target_column
    FROM system.access.column_lineage
    WHERE (
        (source_table_catalog = '{catalog}' AND source_table_schema = '{schema}')
        OR
        (target_table_catalog = '{catalog}' AND target_table_schema = '{schema}')
    )
    AND event_date >= current_date() - 30
    AND source_column_name IS NOT NULL
    AND target_column_name IS NOT NULL
    ORDER BY target_table, target_column
    """
    try:
        rows, _ = execute_query_with_columns(sql, user_token=user_token)
        return [ColumnLineage(
            source_table=r.get("source_table", ""),
            source_column=r.get("source_column", ""),
            target_table=r.get("target_table", ""),
            target_column=r.get("target_column", ""),
        ) for r in rows]
    except Exception as e:
        if "INSUFFICIENT_PERMISSIONS" in str(e):
            logger.warning(f"Column lineage permission denied for {catalog}.{schema}: {e}")
            raise PermissionError(
                f"Lineage requires SELECT on system.access.column_lineage. "
                f"Ask a metastore admin to grant access."
            ) from e
        logger.warning(f"Column lineage unavailable for {catalog}.{schema}: {e}")
        return []


def get_table_lineage(user_token: str, catalog: str, schema: str, table: str) -> TableLineageResult:
    """
    Get upstream and downstream lineage for a specific table.
    Upstream = tables that feed INTO this table (this table is the target).
    Downstream = tables that this table feeds INTO (this table is the source).
    """
    full_name = f"{catalog}.{schema}.{table}"

    # Upstream: what feeds into this table
    upstream_sql = f"""
    SELECT DISTINCT
        source_table_full_name AS source_table,
        source_column_name AS source_column,
        target_column_name AS target_column
    FROM system.access.column_lineage
    WHERE target_table_full_name = '{full_name}'
    AND event_date >= current_date() - 30
    AND source_column_name IS NOT NULL
    AND target_column_name IS NOT NULL
    ORDER BY source_table, source_column
    """

    # Downstream: what this table feeds into
    downstream_sql = f"""
    SELECT DISTINCT
        target_table_full_name AS target_table,
        source_column_name AS source_column,
        target_column_name AS target_column
    FROM system.access.column_lineage
    WHERE source_table_full_name = '{full_name}'
    AND event_date >= current_date() - 30
    AND source_column_name IS NOT NULL
    AND target_column_name IS NOT NULL
    ORDER BY target_table, target_column
    """

    upstream: list[ColumnLineage] = []
    downstream: list[ColumnLineage] = []

    conn = get_connection(user_token=user_token)
    try:
        try:
            rows, _ = execute_query_with_columns(upstream_sql, user_token=user_token, conn=conn)
            for r in rows:
                upstream.append(ColumnLineage(
                    source_table=r.get("source_table", ""),
                    source_column=r.get("source_column", ""),
                    target_table=full_name,
                    target_column=r.get("target_column", ""),
                ))
        except Exception as e:
            if "INSUFFICIENT_PERMISSIONS" in str(e):
                raise PermissionError(
                    f"Lineage requires SELECT on system.access.column_lineage. "
                    f"Ask a metastore admin to grant access."
                ) from e
            logger.warning(f"Upstream lineage unavailable for {full_name}: {e}")

        try:
            rows, _ = execute_query_with_columns(downstream_sql, user_token=user_token, conn=conn)
            for r in rows:
                downstream.append(ColumnLineage(
                    source_table=full_name,
                    source_column=r.get("source_column", ""),
                    target_table=r.get("target_table", ""),
                    target_column=r.get("target_column", ""),
                ))
        except Exception as e:
            if "INSUFFICIENT_PERMISSIONS" in str(e):
                raise PermissionError(
                    f"Lineage requires SELECT on system.access.column_lineage. "
                    f"Ask a metastore admin to grant access."
                ) from e
            logger.warning(f"Downstream lineage unavailable for {full_name}: {e}")
    finally:
        conn.close()

    upstream_tables = sorted(set(l.source_table for l in upstream))
    downstream_tables = sorted(set(l.target_table for l in downstream))

    return TableLineageResult(
        table_full_name=full_name,
        upstream=upstream,
        downstream=downstream,
        upstream_tables=upstream_tables,
        downstream_tables=downstream_tables,
    )
