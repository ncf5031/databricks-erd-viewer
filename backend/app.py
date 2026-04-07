"""
ERD Viewer - FastAPI Application

Main application entry point for the Unity Catalog ERD Viewer backend.
Deployed on Databricks Apps with React Flow frontend.

"""

import os
import logging
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from databricks.sdk import WorkspaceClient

from config import APP_NAME, APP_DESCRIPTION, APP_VERSION, LOG_LEVEL

# Import routers
from routers import health, catalog, tables, relationships, export, comparison, lineage

# Configure logging
logging.basicConfig(level=getattr(logging, LOG_LEVEL.upper(), logging.INFO))
logger = logging.getLogger(__name__)


def is_production() -> bool:
    """
    Check if running in production mode by detecting if static files exist.

    In production, the React app is built and copied to backend/static/.
    In development, React runs on a separate dev server (localhost:5173).
    """
    static_dir = os.path.join(os.path.dirname(__file__), "static", "index.html")
    exists = os.path.exists(static_dir)
    logger.info(f"is_production check: {static_dir} exists={exists}")
    return exists


# Create FastAPI app
app = FastAPI(
    title=f"{APP_NAME} API",
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)


# Configure CORS (development only)
# In production, React is served from same origin (no CORS needed)
if not is_production():
    logger.info("Development mode: Enabling CORS for localhost")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",    # Vite default port
            "http://localhost:3000",    # Alternate dev port
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    logger.info("Production mode: CORS disabled (same origin)")


# Middleware to log all requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests for debugging."""
    logger.info(f"REQUEST: {request.method} {request.url.path}")
    response = await call_next(request)
    return response


# Middleware to extract user identity from Databricks headers
@app.middleware("http")
async def add_user_context(request: Request, call_next):
    """
    Extract user identity from Databricks App headers.
    Databricks automatically injects user info in these headers.
    """
    request.state.user_email = request.headers.get("X-Forwarded-User", "unknown")
    request.state.user_name = request.headers.get("X-Forwarded-Preferred-Username", "unknown")
    response = await call_next(request)
    return response


# Handle invalid identifier names (from validate_identifier)
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Return 400 for invalid identifier names."""
    return JSONResponse(
        status_code=400,
        content={"error": "BAD_REQUEST", "message": str(exc)},
    )


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle uncaught exceptions with sanitized error response."""
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred. Please try again.",
        },
    )


# Root-level health check for Databricks Apps infrastructure
@app.get("/health")
async def root_health_check():
    """
    Root-level health check endpoint for Databricks Apps infrastructure.
    Returns simple 200 OK to indicate app is ready.
    """
    return {"status": "ok"}


# Metrics endpoint for Databricks Apps monitoring
@app.get("/metrics")
async def metrics_endpoint():
    """
    Metrics endpoint for Databricks Apps infrastructure monitoring.
    Returns simple 200 OK to indicate app is healthy.
    """
    return {"status": "ok", "healthy": True}


# User info endpoint
@app.get("/api/me")
async def get_current_user(request: Request):
    """
    Get current user information from Databricks headers.
    Automatically populated by Databricks Apps.
    """
    return {
        "email": request.state.user_email,
        "name": request.state.user_name,
        "authenticated": request.state.user_email != "unknown",
    }


# Startup event to initialize and verify connections
@app.on_event("startup")
async def startup():
    """Initialize application on startup and verify database connection."""
    from auth import set_app_client
    from utils.database import execute_query
    from config import SQL_WAREHOUSE_ID

    logger.info("=" * 60)
    logger.info(f"Initializing {APP_NAME}...")
    logger.info(f"Version: {APP_VERSION}")
    logger.info(f"Environment: {'Production' if is_production() else 'Development'}")
    logger.info(f"Warehouse: {SQL_WAREHOUSE_ID or 'NOT CONFIGURED'}")
    logger.info(f"DATABRICKS_HOST: {os.environ.get('DATABRICKS_HOST', 'not set')}")
    logger.info(f"SQL_WAREHOUSE_ID env: {os.environ.get('SQL_WAREHOUSE_ID', 'not set')}")

    # Initialize Databricks workspace client
    try:
        app.state.workspace_client = WorkspaceClient()
        set_app_client(app.state.workspace_client)
        logger.info("WorkspaceClient initialized")
    except Exception as e:
        logger.error(f"Failed to initialize WorkspaceClient: {e}")
        app.state.workspace_client = None

    # Verify database connection
    if SQL_WAREHOUSE_ID:
        try:
            result = execute_query("SELECT 1 AS test")
            if result and len(result) > 0:
                logger.info("Database connection successful")
            else:
                logger.warning("Database query returned no results")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            logger.error("API will start but database operations will fail")
    else:
        logger.warning("SQL_WAREHOUSE_ID not configured — database features disabled")

    logger.info(f"{APP_NAME} startup complete")
    logger.info("=" * 60)


# Include API routers
app.include_router(health.router)
app.include_router(catalog.router)
app.include_router(tables.router)
app.include_router(relationships.router)
app.include_router(export.router)
app.include_router(comparison.router)
app.include_router(lineage.router)


# Serve static React build (production only)
if is_production():
    from fastapi import HTTPException

    static_dir = os.path.join(os.path.dirname(__file__), "static")
    if os.path.exists(static_dir):
        # Mount static assets (JS, CSS, images) at /assets
        assets_dir = os.path.join(static_dir, "assets")
        if os.path.exists(assets_dir):
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        # Serve root-level static files (favicon, etc.)
        def create_static_route(filename: str, filepath: str):
            """Factory function to create static file routes with proper closure."""
            @app.get(f"/{filename}")
            async def serve_static_file():
                return FileResponse(filepath)
            return serve_static_file

        ROOT_STATIC_FILES = ["favicon.ico", "favicon.svg", "vite.svg"]

        for filename in ROOT_STATIC_FILES:
            file_path = os.path.join(static_dir, filename)
            if os.path.exists(file_path):
                create_static_route(filename, file_path)

        # Serve index.html at root (with no-cache to prevent stale asset references)
        @app.get("/")
        async def serve_root():
            """Serve index.html at root path."""
            index_path = os.path.join(static_dir, "index.html")
            if os.path.exists(index_path):
                return FileResponse(
                    index_path,
                    media_type="text/html",
                    headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
                )
            raise HTTPException(status_code=404, detail="index.html not found")

        # Custom 404 handler for SPA routing
        @app.exception_handler(404)
        async def spa_404_handler(request: Request, exc):
            """
            Handle 404 errors:
            - For API routes: return JSON 404 (preserving original error detail)
            - For other routes: serve React index.html (SPA routing)
            """
            if request.url.path.startswith("/api/"):
                # Preserve original error detail from HTTPException if available
                detail = getattr(exc, "detail", "The requested resource was not found")
                return JSONResponse(
                    status_code=404,
                    content={"error": "NOT_FOUND", "detail": detail},
                )

            index_path = os.path.join(static_dir, "index.html")
            if os.path.exists(index_path):
                return FileResponse(
                    index_path,
                    media_type="text/html",
                    headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
                )

            return JSONResponse(
                status_code=404,
                content={"error": "NOT_FOUND", "detail": "Frontend not built"},
            )

        logger.info(f"Serving React static files from {static_dir}")
    else:
        logger.warning(f"Static directory not found: {static_dir}")
        logger.warning("   Run 'npm run build' in frontend/ to build the React app")
else:
    logger.info("Development mode: Expecting React dev server on localhost:5173")


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
