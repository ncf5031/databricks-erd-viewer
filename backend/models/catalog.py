"""
ERD Viewer - Catalog & Schema Pydantic Models
"""

from typing import Optional
from pydantic import BaseModel


class CatalogInfo(BaseModel):
    name: str
    comment: Optional[str] = None
    owner: Optional[str] = None


class SchemaInfo(BaseModel):
    name: str
    catalog_name: str
    comment: Optional[str] = None
    owner: Optional[str] = None
    table_count: int = 0
