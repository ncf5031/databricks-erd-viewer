# Configuration Reference

## Databricks Asset Bundle (`databricks.yml`)

The bundle configuration controls deployment targets, warehouse bindings, and permissions. Copy `example.databricks.yml` to `databricks.yml` and fill in your values.

### Key Sections

**`sync`** — Controls which files are uploaded to Databricks:
- `include`: Force-includes gitignored files needed at runtime (`backend/static/`, `backend/app.yaml`)
- `exclude`: Prevents dev-only files from being uploaded (frontend source, docs, config files)

**`resources.apps`** — Defines the Databricks App:
- `source_code_path`: Points to `./backend` (the FastAPI app)
- `resources`: Binds the SQL Warehouse via `valueFrom: sql-warehouse`
- `permissions`: Controls who can access the app
- `budget_policy_id`: Optional — ties the app to a budget policy

**`targets`** — Environment-specific overrides:
- Each target specifies `workspace.host`, `workspace.profile`, and `warehouse_id`
- `mode: development` for dev/uat, `mode: production` for prod
- Production can optionally use `run_as` with a service principal

## App Configuration (`backend/app.yaml`)

Controls the app runtime. Copy `backend/example.app.yaml` to `backend/app.yaml`.

| Field | Description |
|-------|-------------|
| `command` | App startup command (`uvicorn app:app`) |
| `user_api_scopes` | OAuth scopes requested from users (must include `sql`) |
| `env` | Environment variables injected at runtime |

## Environment Variables

### Required

| Variable | Source | Description |
|----------|--------|-------------|
| `SQL_WAREHOUSE_ID` | `app.yaml` via `valueFrom: sql-warehouse` | SQL Warehouse for metadata queries. Resolved from the bundle resource binding. |
| `DATABRICKS_HOST` | Injected by Databricks runtime | Workspace URL. Set manually for local dev. |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_TTL_SECONDS` | `300` | How long metadata is cached (seconds). Lower for faster refresh, higher for fewer warehouse queries. |
| `CACHE_MAX_ENTRIES` | `1000` | Maximum cache entries per category. Increase for workspaces with many schemas. |
| `MAX_TABLES_ON_CANVAS` | `100` | Safety limit for canvas rendering. Schemas with more tables than this show a warning. |
| `LOG_LEVEL` | `INFO` | Python logging level. Set to `DEBUG` for detailed SQL query logging. |

### Auto-Injected (Databricks Runtime)

These are set automatically when running as a Databricks App — do not set them manually:

| Variable | Description |
|----------|-------------|
| `DATABRICKS_HOST` | Workspace URL |
| `DATABRICKS_CLIENT_ID` | Service principal client ID (for health checks) |
| `DATABRICKS_CLIENT_SECRET` | Service principal secret (for health checks) |

## Authentication

### On-Behalf-of-User (OBO)

The app uses Databricks Apps' OBO authorization model:
- Users access the app through the Databricks workspace
- The platform forwards the user's OAuth access token via the `x-forwarded-access-token` header
- All SQL queries execute as the logged-in user, respecting Unity Catalog permissions
- The `sql` scope must be added via the app's Authorization settings in the Databricks UI

### OAuth Scopes

| Scope | Required | Purpose |
|-------|----------|---------|
| `sql` | Yes | Execute SQL queries against the warehouse (SHOW CATALOGS/SCHEMAS/TABLES, DESCRIBE, etc.) |

Other scopes (like `catalog.catalogs:read`) are **not needed** because the app uses SQL commands rather than the UC REST API.

### Local Development Auth

For local development, the backend falls back to Databricks SDK's `Config()` which picks up:
1. CLI auth (`databricks auth login`)
2. Environment variables (`DATABRICKS_TOKEN`)
3. Profile configuration (`~/.databrickscfg`)

## Cache Behavior

- Caches are **in-memory** (no persistence across restarts)
- Scoped **per-user** via the authenticated user's email
- Categories: catalogs, schemas, tables, relationships, lineage
- All data endpoints support `?refresh=true` to bypass cache
