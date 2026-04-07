"""
ERD Viewer - Column Lineage Pydantic Models
"""

from pydantic import BaseModel


class ColumnLineage(BaseModel):
    source_table: str
    source_column: str
    target_table: str
    target_column: str


class TableLineageResult(BaseModel):
    """Lineage for a specific table: what feeds it and what it feeds."""
    table_full_name: str
    upstream: list[ColumnLineage]    # rows where this table is the target
    downstream: list[ColumnLineage]  # rows where this table is the source
    upstream_tables: list[str]       # unique source table names
    downstream_tables: list[str]     # unique target table names
