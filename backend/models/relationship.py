"""
ERD Viewer - Relationship Pydantic Models
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel


class RelationshipType(str, Enum):
    EXPLICIT = "explicit"
    INFERRED = "inferred"


class Relationship(BaseModel):
    source_table: str
    source_column: str
    target_table: str
    target_column: str
    type: RelationshipType
    constraint_name: Optional[str] = None
    confidence: Optional[str] = None  # "high", "medium"
