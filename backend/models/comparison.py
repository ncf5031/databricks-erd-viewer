"""
ERD Viewer - Schema Comparison Pydantic Models
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel


class DiffStatus(str, Enum):
    ADDED = "added"
    REMOVED = "removed"
    MODIFIED = "modified"
    UNCHANGED = "unchanged"


class ColumnDiff(BaseModel):
    column_name: str
    status: DiffStatus
    # Left side (source table)
    left_type: Optional[str] = None
    left_nullable: Optional[bool] = None
    left_comment: Optional[str] = None
    # Right side (target table)
    right_type: Optional[str] = None
    right_nullable: Optional[bool] = None
    right_comment: Optional[str] = None
    # What changed (for modified columns)
    changes: list[str] = []


class TableComparisonRequest(BaseModel):
    left_catalog: str
    left_schema: str
    left_table: str
    right_catalog: str
    right_schema: str
    right_table: str


class TableComparisonResult(BaseModel):
    left_full_name: str
    right_full_name: str
    column_diffs: list[ColumnDiff]
    partition_diff: dict[str, list[str]]  # {"left_only": [...], "right_only": [...], "both": [...]}
    summary: dict[str, int]  # {"added": N, "removed": N, "modified": N, "unchanged": N}


# --- Schema-level comparison ---

class TableDiffSummary(BaseModel):
    table_name: str
    status: DiffStatus
    column_summary: Optional[dict[str, int]] = None  # {"added": N, ...} for matched tables


class SchemaComparisonRequest(BaseModel):
    left_catalog: str
    left_schema: str
    right_catalog: str
    right_schema: str


class SchemaComparisonResult(BaseModel):
    left_full_name: str   # "catalog.schema"
    right_full_name: str
    table_diffs: list[TableDiffSummary]
    table_details: dict[str, TableComparisonResult]  # table_name → column-level diff
    summary: dict[str, int]  # {"added": N, "removed": N, "modified": N, "unchanged": N}
