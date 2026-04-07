"""
ERD Viewer - Table Detail Service

Fetches detailed column information for tables using SQL queries.
All queries go through the SQL warehouse with the user's token,
respecting UC permissions via the 'sql' OAuth scope.
"""

import logging
from utils.database import execute_query_with_columns, get_connection
from models.table import TableDetail, ColumnDetail
from services.uc_browser import list_tables

logger = logging.getLogger(__name__)


def get_table_detail(user_token: str, catalog: str, schema: str, table: str) -> TableDetail | None:
    """
    Get full table details including columns, types, and constraints.
    Uses DESCRIBE TABLE (SQL) for column metadata.
    """
    full_name = f"{catalog}.{schema}.{table}"
    conn = get_connection(user_token=user_token, catalog=catalog)

    try:
        columns = _get_columns_via_sql(user_token, catalog, schema, table, conn=conn)
        if not columns:
            return None

        pk_columns = _get_primary_key_columns(user_token, catalog, schema, table, conn=conn)
        fk_columns = _get_foreign_key_columns(user_token, catalog, schema, table, conn=conn)
        for col in columns:
            if col.name in pk_columns:
                col.is_primary_key = True
            if col.name in fk_columns:
                col.is_foreign_key = True

        meta = _get_extended_metadata(user_token, catalog, schema, table, conn=conn)

        return TableDetail(
            name=table,
            full_name=full_name,
            table_type=meta["table_type"] or "MANAGED",
            comment=meta["comment"],
            owner=meta["owner"],
            columns=columns,
            partition_columns=meta["partition_columns"],
            created_at=meta["created_at"],
            updated_at=meta["updated_at"],
        )

    except Exception as e:
        logger.error(f"Failed to get table detail for '{full_name}': {e}")
        return None
    finally:
        conn.close()


def get_tables_with_columns(user_token: str, catalog: str, schema: str) -> list[TableDetail]:
    """
    Get all tables in a schema with their column details.
    Uses a single connection and bulk PK/FK queries for performance.
    """
    conn = get_connection(user_token=user_token, catalog=catalog, schema=schema)

    try:
        # 1 query: list all tables
        table_summaries = list_tables(user_token, catalog, schema, conn=conn)

        # 1 query each: bulk PK/FK for entire schema
        all_pks = _get_all_primary_keys(user_token, catalog, schema, conn=conn)
        all_fks = _get_all_foreign_keys(user_token, catalog, schema, conn=conn)

        tables = []
        for summary in table_summaries:
            # 1 query per table: DESCRIBE TABLE (cannot be consolidated)
            columns = _get_columns_via_sql(user_token, catalog, schema, summary.name, conn=conn)

            pk_columns = all_pks.get(summary.name, set())
            fk_columns = all_fks.get(summary.name, set())
            for col in columns:
                if col.name in pk_columns:
                    col.is_primary_key = True
                if col.name in fk_columns:
                    col.is_foreign_key = True

            tables.append(TableDetail(
                name=summary.name,
                full_name=summary.full_name,
                table_type=summary.table_type,
                comment=summary.comment,
                owner=summary.owner,
                columns=columns,
            ))

        return tables
    except Exception as e:
        logger.error(f"Failed to get tables with columns for '{catalog}.{schema}': {e}")
        return []
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Bulk schema-wide PK/FK queries (used by get_tables_with_columns)
# ---------------------------------------------------------------------------

def _get_all_primary_keys(user_token: str, catalog: str, schema: str, conn=None) -> dict[str, set[str]]:
    """Fetch all PK columns for every table in the schema in one query."""
    try:
        rows, _ = execute_query_with_columns(
            f"""
            SELECT tc.table_name, kcu.column_name
            FROM `{catalog}`.information_schema.table_constraints tc
            JOIN `{catalog}`.information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.constraint_schema = kcu.constraint_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema = '{schema}'
            """,
            user_token=user_token, catalog=catalog, conn=conn,
        )
        result: dict[str, set[str]] = {}
        for row in rows:
            tbl = row.get("table_name", "")
            col = row.get("column_name", "")
            if tbl and col:
                result.setdefault(tbl, set()).add(col)
        return result
    except Exception as e:
        logger.debug(f"Could not fetch bulk PKs for {catalog}.{schema}: {e}")
        return {}


def _get_all_foreign_keys(user_token: str, catalog: str, schema: str, conn=None) -> dict[str, set[str]]:
    """Fetch all FK columns for every table in the schema in one query."""
    try:
        rows, _ = execute_query_with_columns(
            f"""
            SELECT tc.table_name, kcu.column_name
            FROM `{catalog}`.information_schema.table_constraints tc
            JOIN `{catalog}`.information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.constraint_schema = kcu.constraint_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = '{schema}'
            """,
            user_token=user_token, catalog=catalog, conn=conn,
        )
        result: dict[str, set[str]] = {}
        for row in rows:
            tbl = row.get("table_name", "")
            col = row.get("column_name", "")
            if tbl and col:
                result.setdefault(tbl, set()).add(col)
        return result
    except Exception as e:
        logger.debug(f"Could not fetch bulk FKs for {catalog}.{schema}: {e}")
        return {}


# ---------------------------------------------------------------------------
# Per-table helpers (used by get_table_detail for single-table lookups)
# ---------------------------------------------------------------------------

def _get_columns_via_sql(user_token: str, catalog: str, schema: str, table: str, conn=None) -> list[ColumnDetail]:
    """Get column info via DESCRIBE TABLE SQL."""
    try:
        rows, _ = execute_query_with_columns(
            f"DESCRIBE TABLE `{catalog}`.`{schema}`.`{table}`",
            user_token=user_token, catalog=catalog, schema=schema, conn=conn,
        )
        columns = []
        for row in rows:
            col_name = row.get("col_name", "")
            # DESCRIBE EXTENDED has separator rows and metadata sections
            if not col_name or col_name.startswith("#") or col_name.strip() == "":
                break  # Stop at the metadata separator
            columns.append(ColumnDetail(
                name=col_name,
                type_name=row.get("data_type", "UNKNOWN"),
                nullable=True,
                comment=row.get("comment") if row.get("comment") else None,
            ))
        return columns
    except Exception as e:
        logger.warning(f"Failed to DESCRIBE `{catalog}`.`{schema}`.`{table}`: {e}")
        return []


def _get_primary_key_columns(user_token: str, catalog: str, schema: str, table: str, conn=None) -> set[str]:
    """Query information_schema for primary key columns."""
    try:
        rows, _ = execute_query_with_columns(
            f"""
            SELECT kcu.column_name
            FROM `{catalog}`.information_schema.table_constraints tc
            JOIN `{catalog}`.information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.constraint_schema = kcu.constraint_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema = '{schema}'
                AND tc.table_name = '{table}'
            """,
            user_token=user_token, catalog=catalog, conn=conn,
        )
        return {row["column_name"] for row in rows if row.get("column_name")}
    except Exception as e:
        logger.debug(f"Could not fetch PKs for {catalog}.{schema}.{table}: {e}")
        return set()


def _get_foreign_key_columns(user_token: str, catalog: str, schema: str, table: str, conn=None) -> set[str]:
    """Query information_schema for foreign key columns on this table."""
    try:
        rows, _ = execute_query_with_columns(
            f"""
            SELECT kcu.column_name
            FROM `{catalog}`.information_schema.table_constraints tc
            JOIN `{catalog}`.information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.constraint_schema = kcu.constraint_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = '{schema}'
                AND tc.table_name = '{table}'
            """,
            user_token=user_token, catalog=catalog, conn=conn,
        )
        return {row["column_name"] for row in rows if row.get("column_name")}
    except Exception as e:
        logger.debug(f"Could not fetch FKs for {catalog}.{schema}.{table}: {e}")
        return set()


def _get_extended_metadata(user_token: str, catalog: str, schema: str, table: str, conn=None) -> dict:
    """
    Extract table metadata from DESCRIBE EXTENDED output.

    Returns dict with: owner, created_at, updated_at, table_type, comment, partition_columns
    """
    result: dict = {
        "owner": None,
        "created_at": None,
        "updated_at": None,
        "table_type": None,
        "comment": None,
        "partition_columns": [],
    }

    try:
        rows, _ = execute_query_with_columns(
            f"DESCRIBE EXTENDED `{catalog}`.`{schema}`.`{table}`",
            user_token=user_token, catalog=catalog, schema=schema, conn=conn,
        )

        in_detail_section = False
        in_partition_section = False

        for row in rows:
            col_name = row.get("col_name", "").strip()
            data_type = row.get("data_type", "").strip() if row.get("data_type") else ""

            # Detect section markers
            if col_name == "# Detailed Table Information":
                in_detail_section = True
                in_partition_section = False
                continue
            if col_name == "# Partition Information":
                in_partition_section = True
                in_detail_section = False
                continue

            # Parse detailed metadata section
            if in_detail_section and col_name and data_type:
                key = col_name.lower()
                if key == "owner":
                    result["owner"] = data_type
                elif key in ("created time", "created"):
                    result["created_at"] = data_type
                elif key in ("last access", "last modified time"):
                    if data_type != "UNKNOWN":
                        result["updated_at"] = data_type
                elif key == "type":
                    result["table_type"] = data_type
                elif key == "comment":
                    result["comment"] = data_type

            # Parse partition section
            if in_partition_section:
                if col_name.startswith("#") or col_name == "":
                    if result["partition_columns"]:
                        break
                    continue
                result["partition_columns"].append(col_name)

    except Exception as e:
        logger.debug(f"Could not fetch extended metadata for {catalog}.{schema}.{table}: {e}")

    return result
