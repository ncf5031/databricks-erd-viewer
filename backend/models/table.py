"""
ERD Viewer - Table & Column Pydantic Models
"""

from typing import Optional
from pydantic import BaseModel


class ColumnDetail(BaseModel):
    name: str
    type_name: str
    nullable: bool = True
    comment: Optional[str] = None
    is_primary_key: bool = False
    is_foreign_key: bool = False


class TableSummary(BaseModel):
    name: str
    full_name: str
    table_type: str  # MANAGED, EXTERNAL, VIEW
    comment: Optional[str] = None
    owner: Optional[str] = None


class TableDetail(TableSummary):
    columns: list[ColumnDetail] = []
    partition_columns: list[str] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    properties: dict[str, str] = {}
