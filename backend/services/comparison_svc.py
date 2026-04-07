"""
ERD Viewer - Schema Comparison Service

Compares tables and schemas across catalogs to detect schema drift.
"""

import logging
from utils.database import execute_query_with_columns, get_connection, validate_identifier, quote_identifier
from models.comparison import (
    ColumnDiff,
    DiffStatus,
    TableComparisonResult,
    TableDiffSummary,
    SchemaComparisonResult,
)
from services.uc_browser import list_tables
from models.table import TableDetail, ColumnDetail

logger = logging.getLogger(__name__)


def _fetch_table_columns(
    user_token: str,
    catalog: str,
    schema: str,
    table: str,
    conn=None,
) -> list[ColumnDetail]:
    """Fetch columns for a table."""
    validate_identifier(catalog, "catalog")
    validate_identifier(schema, "schema")
    validate_identifier(table, "table")
    fqn = f"{quote_identifier(catalog)}.{quote_identifier(schema)}.{quote_identifier(table)}"
    try:
        rows, _ = execute_query_with_columns(
            f"DESCRIBE TABLE {fqn}",
            user_token=user_token,
            catalog=catalog,
            schema=schema,
            conn=conn,
        )
        columns = []
        for row in rows:
            col_name = row.get("col_name", "")
            if not col_name or col_name.startswith("#") or col_name.strip() == "":
                break
            columns.append(ColumnDetail(
                name=col_name,
                type_name=row.get("data_type", "UNKNOWN"),
                nullable=True,
                comment=row.get("comment") if row.get("comment") else None,
            ))
        return columns
    except Exception as e:
        logger.warning(f"Failed to describe {catalog}.{schema}.{table}: {e}")
        return []


def compare_tables(
    user_token: str,
    left_catalog: str,
    left_schema: str,
    left_table: str,
    right_catalog: str,
    right_schema: str,
    right_table: str,
) -> TableComparisonResult | None:
    """Compare two tables and return a detailed diff."""
    conn = get_connection(user_token=user_token)
    try:
        left_columns = _fetch_table_columns(
            user_token, left_catalog, left_schema, left_table, conn=conn,
        )
        right_columns = _fetch_table_columns(
            user_token, right_catalog, right_schema, right_table, conn=conn,
        )
    finally:
        conn.close()

    if not left_columns and not right_columns:
        logger.warning("Comparison failed — both tables returned no columns")
        return None

    left_full = f"{left_catalog}.{left_schema}.{left_table}"
    right_full = f"{right_catalog}.{right_schema}.{right_table}"

    left_detail = TableDetail(
        name=left_table, full_name=left_full, table_type="MANAGED",
        columns=left_columns,
    )
    right_detail = TableDetail(
        name=right_table, full_name=right_full, table_type="MANAGED",
        columns=right_columns,
    )

    column_diffs = _diff_columns(left_detail, right_detail)
    partition_diff = {"left_only": [], "right_only": [], "both": []}

    summary = {"added": 0, "removed": 0, "modified": 0, "unchanged": 0}
    for diff in column_diffs:
        summary[diff.status.value] += 1

    return TableComparisonResult(
        left_full_name=left_full,
        right_full_name=right_full,
        column_diffs=column_diffs,
        partition_diff=partition_diff,
        summary=summary,
    )


def compare_schemas(
    user_token: str,
    left_catalog: str,
    left_schema: str,
    right_catalog: str,
    right_schema: str,
) -> SchemaComparisonResult:
    """Compare all tables across two schemas and return a detailed diff."""
    left_tables = list_tables(user_token, left_catalog, left_schema)
    right_tables = list_tables(user_token, right_catalog, right_schema)

    left_names = {t.name for t in left_tables}
    right_names = {t.name for t in right_tables}

    left_only = left_names - right_names
    right_only = right_names - left_names
    matched = left_names & right_names

    table_diffs: list[TableDiffSummary] = []
    table_details: dict[str, TableComparisonResult] = {}
    summary = {"added": 0, "removed": 0, "modified": 0, "unchanged": 0}

    # Left-only → removed
    for name in sorted(left_only):
        table_diffs.append(TableDiffSummary(table_name=name, status=DiffStatus.REMOVED))
        summary["removed"] += 1

    # Right-only → added
    for name in sorted(right_only):
        table_diffs.append(TableDiffSummary(table_name=name, status=DiffStatus.ADDED))
        summary["added"] += 1

    # Matched → compare columns
    conn = get_connection(user_token=user_token)
    try:
        for name in sorted(matched):
            left_cols = _fetch_table_columns(
                user_token, left_catalog, left_schema, name, conn=conn,
            )
            right_cols = _fetch_table_columns(
                user_token, right_catalog, right_schema, name, conn=conn,
            )

            left_detail = TableDetail(
                name=name, full_name=f"{left_catalog}.{left_schema}.{name}",
                table_type="MANAGED", columns=left_cols,
            )
            right_detail = TableDetail(
                name=name, full_name=f"{right_catalog}.{right_schema}.{name}",
                table_type="MANAGED", columns=right_cols,
            )

            column_diffs = _diff_columns(left_detail, right_detail)
            col_summary = {"added": 0, "removed": 0, "modified": 0, "unchanged": 0}
            for diff in column_diffs:
                col_summary[diff.status.value] += 1

            has_changes = col_summary["added"] + col_summary["removed"] + col_summary["modified"] > 0
            status = DiffStatus.MODIFIED if has_changes else DiffStatus.UNCHANGED

            table_diffs.append(TableDiffSummary(
                table_name=name, status=status, column_summary=col_summary,
            ))
            summary["modified" if has_changes else "unchanged"] += 1

            # Store full detail for matched tables
            table_details[name] = TableComparisonResult(
                left_full_name=f"{left_catalog}.{left_schema}.{name}",
                right_full_name=f"{right_catalog}.{right_schema}.{name}",
                column_diffs=column_diffs,
                partition_diff={"left_only": [], "right_only": [], "both": []},
                summary=col_summary,
            )
    finally:
        conn.close()

    # Sort: modified first, then added, removed, unchanged
    status_order = {DiffStatus.MODIFIED: 0, DiffStatus.ADDED: 1, DiffStatus.REMOVED: 2, DiffStatus.UNCHANGED: 3}
    table_diffs.sort(key=lambda t: (status_order.get(t.status, 4), t.table_name))

    left_full = f"{left_catalog}.{left_schema}"
    right_full = f"{right_catalog}.{right_schema}"

    logger.info(
        f"Schema comparison {left_full} vs {right_full}: "
        f"{summary['added']} added, {summary['removed']} removed, "
        f"{summary['modified']} modified, {summary['unchanged']} unchanged"
    )

    return SchemaComparisonResult(
        left_full_name=left_full,
        right_full_name=right_full,
        table_diffs=table_diffs,
        table_details=table_details,
        summary=summary,
    )


def _diff_columns(left: TableDetail, right: TableDetail) -> list[ColumnDiff]:
    """Compare columns between two tables."""
    left_cols = {col.name: col for col in left.columns}
    right_cols = {col.name: col for col in right.columns}

    all_names = list(dict.fromkeys(
        list(left_cols.keys()) + list(right_cols.keys())
    ))

    diffs = []
    for name in all_names:
        l_col = left_cols.get(name)
        r_col = right_cols.get(name)

        if l_col and not r_col:
            diffs.append(ColumnDiff(
                column_name=name, status=DiffStatus.REMOVED,
                left_type=l_col.type_name, left_nullable=l_col.nullable, left_comment=l_col.comment,
            ))
        elif r_col and not l_col:
            diffs.append(ColumnDiff(
                column_name=name, status=DiffStatus.ADDED,
                right_type=r_col.type_name, right_nullable=r_col.nullable, right_comment=r_col.comment,
            ))
        elif l_col and r_col:
            changes = []
            if l_col.type_name != r_col.type_name:
                changes.append(f"type: {l_col.type_name} \u2192 {r_col.type_name}")
            if l_col.nullable != r_col.nullable:
                changes.append(f"nullable: {'yes' if l_col.nullable else 'no'} \u2192 {'yes' if r_col.nullable else 'no'}")
            if (l_col.comment or "") != (r_col.comment or ""):
                changes.append("comment changed")

            diffs.append(ColumnDiff(
                column_name=name,
                status=DiffStatus.MODIFIED if changes else DiffStatus.UNCHANGED,
                left_type=l_col.type_name, left_nullable=l_col.nullable, left_comment=l_col.comment,
                right_type=r_col.type_name, right_nullable=r_col.nullable, right_comment=r_col.comment,
                changes=changes,
            ))

    return diffs
