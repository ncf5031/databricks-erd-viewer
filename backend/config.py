"""
ERD Viewer - Application Configuration

Loads configuration from environment variables with sensible defaults.
Environment variables are set in app.yaml for Databricks Apps deployment.
"""

import os


# Database / Warehouse Configuration
SQL_WAREHOUSE_ID = os.environ.get("SQL_WAREHOUSE_ID", "")

# Cache Configuration
CACHE_TTL_SECONDS = int(os.environ.get("CACHE_TTL_SECONDS", "300"))  # 5 minutes default
CACHE_MAX_ENTRIES = int(os.environ.get("CACHE_MAX_ENTRIES", "1000"))

# Application Limits
MAX_TABLES_ON_CANVAS = int(os.environ.get("MAX_TABLES_ON_CANVAS", "100"))

# Logging
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

# Application Metadata
APP_VERSION = "1.0.0"
APP_NAME = "ERD Viewer"
APP_DESCRIPTION = "Unity Catalog ERD Viewer — interactive entity-relationship diagrams"
