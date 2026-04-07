"""
ERD Viewer - Authentication

Implements Databricks Apps authorization:
- App authorization: Service principal via env vars (DATABRICKS_CLIENT_ID/SECRET)
- User authorization: On-behalf-of-user via x-forwarded-access-token header

Ref: https://docs.databricks.com/dev-tools/databricks-apps/auth
"""

import logging
from databricks.sdk import WorkspaceClient
from fastapi import Request, HTTPException

logger = logging.getLogger(__name__)

# App-level service principal client (for health checks, startup)
_app_client: WorkspaceClient | None = None


def set_app_client(client: WorkspaceClient) -> None:
    """Set the app-level service principal client. Called during startup."""
    global _app_client
    _app_client = client


def get_app_client() -> WorkspaceClient | None:
    """Get the app-level service principal client."""
    return _app_client


def get_user_token(request: Request) -> str | None:
    """
    Extract the user's access token from the Databricks App proxy header.
    Returns None if not available (dev mode).
    """
    return request.headers.get("x-forwarded-access-token")


def require_user_token(request: Request) -> str:
    """
    FastAPI dependency that requires a valid user token.
    Returns the token string for passing to SQL connector.
    """
    token = get_user_token(request)
    if not token:
        raise HTTPException(
            status_code=503,
            detail="No user access token available. Access this app through Databricks.",
        )
    return token


def get_user_email(request: Request) -> str:
    """Extract user email from request state (set by middleware)."""
    return getattr(request.state, "user_email", "unknown")


def get_user_name(request: Request) -> str:
    """Extract user display name from request state (set by middleware)."""
    return getattr(request.state, "user_name", "unknown")
