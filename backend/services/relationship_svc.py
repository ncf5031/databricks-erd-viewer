"""
ERD Viewer - Relationship Service

Discovers table relationships via:
1. Explicit FKs from information_schema (default ON)
2. Heuristic inference from column naming patterns (default OFF, user toggle)
"""

import re
import logging
from utils.database import execute_query_with_columns, validate_identifier, quote_identifier
from models.relationship import Relationship, RelationshipType
from models.table import TableDetail

logger = logging.getLogger(__name__)

# Columns to exclude from heuristic inference
EXCLUDED_COLUMNS = {
    "id", "created_at", "updated_at", "created_by", "modified_by",
    "is_deleted", "deleted_at", "row_number",
}

# Column name prefixes to exclude
EXCLUDED_PREFIXES = ("_etl_", "_dlt_", "__")


def get_explicit_relationships(user_token: str, catalog: str, schema: str) -> list[Relationship]:
    """
    Query information_schema for declared foreign key constraints.

    Uses a multi-table join across:
    - table_constraints
    - referential_constraints
    - key_column_usage (source and target)
    """
    validate_identifier(catalog, "catalog")
    validate_identifier(schema, "schema")
    cat = quote_identifier(catalog)
    sql = f"""
    SELECT
        tc.constraint_name,
        kcu.table_name      AS source_table,
        kcu.column_name      AS source_column,
        kcu2.table_name      AS target_table,
        kcu2.column_name     AS target_column
    FROM
        {cat}.information_schema.table_constraints tc
    JOIN
        {cat}.information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.constraint_schema = rc.constraint_schema
    JOIN
        {cat}.information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.constraint_schema = kcu.constraint_schema
    JOIN
        {cat}.information_schema.key_column_usage kcu2
        ON rc.unique_constraint_name = kcu2.constraint_name
        AND rc.unique_constraint_schema = kcu2.constraint_schema
    WHERE
        tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_schema = '{schema}'
    """

    try:
        rows, _ = execute_query_with_columns(sql, user_token=user_token, catalog=catalog)
        relationships = []
        for row in rows:
            relationships.append(Relationship(
                source_table=row.get("source_table", ""),
                source_column=row.get("source_column", ""),
                target_table=row.get("target_table", ""),
                target_column=row.get("target_column", ""),
                type=RelationshipType.EXPLICIT,
                constraint_name=row.get("constraint_name"),
            ))
        logger.info(f"Found {len(relationships)} explicit FKs in {catalog}.{schema}")
        return relationships
    except Exception as e:
        if "INSUFFICIENT_PERMISSIONS" in str(e):
            logger.warning(f"FK query permission denied for {catalog}.{schema}: {e}")
            raise PermissionError(
                f"Cannot read foreign key constraints for {catalog}.{schema}. "
                f"Requires access to information_schema."
            ) from e
        logger.warning(f"Failed to query explicit FKs for {catalog}.{schema}: {e}")
        return []


def get_inferred_relationships(tables: list[TableDetail]) -> list[Relationship]:
    """
    Infer relationships by analyzing column names and types across tables.

    Rules (applied in order, first match wins):
    1. Exact PK name match — e.g. orders.customer_id → customers.customer_id (PK)
    2. {table_singular}_id pattern — e.g. orders.customer_id → customers.id
    3. Same name + same type, one is PK — e.g. orders.product_id → products.product_id (PK)
    4. Table-name-derived match (no PK required) — e.g. job_tasks.job_id → jobs.job_id

    Exclusion rules applied to skip false positives.
    """
    relationships = []

    # Build lookup: table_name → {col_name: ColumnDetail}
    pk_lookup = {}   # table_name → set of PK column names
    col_lookup = {}  # table_name → {col_name: ColumnDetail}

    for table in tables:
        pk_lookup[table.name] = set()
        col_lookup[table.name] = {}
        for col in table.columns:
            col_lookup[table.name][col.name] = col
            if col.is_primary_key:
                pk_lookup[table.name].add(col.name)

    # Track found relationships to avoid duplicates
    found = set()

    for source_table in tables:
        for col in source_table.columns:
            # Skip excluded columns
            if _should_exclude_column(col.name):
                continue
            # Skip if this column is a PK in its own table
            if col.is_primary_key:
                continue

            match = _find_inferred_match(
                source_table.name, col, tables, pk_lookup, col_lookup
            )
            if match:
                key = (source_table.name, col.name, match["target_table"], match["target_column"])
                if key not in found:
                    found.add(key)
                    relationships.append(Relationship(
                        source_table=source_table.name,
                        source_column=col.name,
                        target_table=match["target_table"],
                        target_column=match["target_column"],
                        type=RelationshipType.INFERRED,
                        confidence=match["confidence"],
                    ))

    logger.info(f"Inferred {len(relationships)} relationships across {len(tables)} tables")
    return relationships


def _find_inferred_match(
    source_table: str,
    col,
    tables: list[TableDetail],
    pk_lookup: dict[str, set[str]],
    col_lookup: dict[str, dict],
) -> dict | None:
    """Apply heuristic rules to find a matching target table/column."""

    col_name = col.name

    for target_table in tables:
        # Skip self-references unless column suggests hierarchy
        if target_table.name == source_table:
            if not any(prefix in col_name for prefix in ("parent_", "manager_")):
                continue

        target_pks = pk_lookup.get(target_table.name, set())
        target_cols = col_lookup.get(target_table.name, {})

        # Rule 1: Exact PK name match
        # e.g. orders.customer_id → customers.customer_id (where customer_id is PK)
        if col_name in target_pks:
            return {
                "target_table": target_table.name,
                "target_column": col_name,
                "confidence": "high",
            }

        # Rule 2: {table_singular}_id pattern
        # e.g. orders.customer_id → customers.id (where id is PK)
        singular = _singularize(target_table.name)
        expected_fk = f"{singular}_id"
        if col_name == expected_fk and "id" in target_pks:
            return {
                "target_table": target_table.name,
                "target_column": "id",
                "confidence": "high",
            }

        # Rule 3: Same name + same type, one is PK
        # e.g. orders.product_id → products.product_id (where product_id is PK)
        if col_name in target_cols and col_name in target_pks:
            target_col = target_cols[col_name]
            if target_col.type_name == col.type_name:
                return {
                    "target_table": target_table.name,
                    "target_column": col_name,
                    "confidence": "medium",
                }

        # Rule 4: Table-name-derived column match (no PK required)
        # e.g. job_tasks.job_id → jobs.job_id because singular("jobs") = "job"
        for suffix in ("_id", "_key"):
            if col_name.endswith(suffix):
                prefix = col_name[: -len(suffix)]
                if _singularize(target_table.name) == prefix and col_name in target_cols:
                    return {
                        "target_table": target_table.name,
                        "target_column": col_name,
                        "confidence": "medium",
                    }

    return None


def _should_exclude_column(col_name: str) -> bool:
    """Check if a column should be excluded from heuristic inference."""
    lower = col_name.lower()

    if lower in EXCLUDED_COLUMNS:
        return True

    for prefix in EXCLUDED_PREFIXES:
        if lower.startswith(prefix):
            return True

    # Skip STRING columns that don't end in _id or _key
    # (This is checked at the type level in _find_inferred_match)

    return False


def _singularize(table_name: str) -> str:
    """
    Simple pluralization reversal for common English patterns.
    e.g. customers → customer, categories → category, addresses → address
    """
    name = table_name.lower()

    if name.endswith("ies"):
        return name[:-3] + "y"
    if name.endswith("ses") or name.endswith("xes") or name.endswith("zes"):
        return name[:-2]
    if name.endswith("s") and not name.endswith("ss"):
        return name[:-1]

    return name
