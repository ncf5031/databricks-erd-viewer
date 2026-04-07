# ERD Viewer — Unity Catalog ERD Visualization App

## Project Overview
Read-only interactive Entity-Relationship Diagram viewer for Databricks Unity Catalog.
Deployed as a Databricks App (FastAPI backend + React Flow frontend).

## Architecture
- **Backend**: FastAPI (Python 3.11+) at `backend/`
- **Frontend**: React 18 + TypeScript + React Flow + ELK.js at `frontend/`
- **Styling**: Tailwind CSS v3 with dark mode (class strategy)
- **State**: Zustand stores (catalogStore, diagramStore, uiStore, comparisonStore)
- **Caching**: cachetools TTLCache (in-memory, per-user keys)
- **Auth**: On-behalf-of-user via `databricks-sql-connector` with `access_token`
- **Deploy**: Databricks Asset Bundles (databricks.yml) + deploy.sh

## Key Directories
```
backend/
├── app.py              # FastAPI entry point
├── auth.py             # OBO auth: get_user_token(), get_app_client()
├── config.py           # Environment configuration
├── cache.py            # TTL cache layer
├── routers/
│   ├── catalog.py      # GET /api/catalogs, schemas
│   ├── tables.py       # GET /api/.../tables
│   ├── relationships.py # GET /api/.../relationships
│   ├── comparison.py   # POST /api/compare
│   ├── lineage.py      # GET /api/.../lineage
│   ├── export.py       # POST /api/export/ddl
│   └── health.py       # GET /health, /api/health, /api/config
├── services/
│   ├── uc_browser.py       # SHOW CATALOGS/SCHEMAS/TABLES (SQL, not UC REST API)
│   ├── table_detail.py     # DESCRIBE TABLE (SQL)
│   ├── relationship_svc.py # information_schema FK + heuristic inference
│   ├── comparison_svc.py   # Cross-catalog schema diff
│   ├── lineage_svc.py      # system.access.column_lineage
│   └── ddl_generator.py    # SHOW CREATE TABLE
├── models/             # Pydantic response models
├── utils/database.py   # databricks-sql-connector: _connect(), execute_query()
└── static/             # Built React app (copied from frontend/dist/ by deploy.sh)

frontend/
├── src/
│   ├── components/
│   │   ├── Canvas/     # ERDCanvas, TableNode, RelationshipEdge
│   │   ├── Sidebar/    # CatalogTree (catalog→schema→table browser)
│   │   ├── Toolbar/    # ViewControls (layout, export, compare, theme)
│   │   ├── DetailPanel/ # TableDetail, DDL preview
│   │   ├── Compare/    # ComparePanel, CompareResults (cross-catalog diff)
│   │   └── Shared/     # ErrorBoundary, Legend, LoadingStates
│   ├── stores/         # Zustand (catalogStore, diagramStore, uiStore, comparisonStore)
│   ├── api/client.ts   # Typed backend API client
│   ├── layouts/elkLayout.ts # ELK.js (TB, LR, force-directed)
│   ├── hooks/          # useExport, useKeyboardShortcuts, useShareableURL
│   ├── types/          # TypeScript interfaces
│   └── utils/          # Colors, formatters, constants
```

## Authentication Model
- **On-behalf-of-user**: Databricks App proxy forwards `x-forwarded-access-token` header
- `auth.py:get_user_token(request)` extracts the token string
- Token passed directly to `databricks-sql-connector` as `access_token` (NOT via WorkspaceClient)
- All SQL queries run as the logged-in user — they only see what they have access to
- `app.yaml` declares `user_api_scopes: [sql]` — the only scope needed
- Scopes must ALSO be added via Databricks UI: Compute → Apps → Configure → +Add scope
- After adding scopes, users must consent (open app in incognito first time)
- App-level service principal used only for health checks at startup
- **All UC browsing uses SQL** (SHOW CATALOGS/SCHEMAS/TABLES), not the UC REST API
- This avoids needing the `unity-catalog` scope which isn't available in the UI scope picker

## Development Commands
```bash
# Backend
cd backend && pip install -r requirements.txt
cd backend && uvicorn app:app --reload          # http://localhost:8000

# Frontend
cd frontend && npm install
cd frontend && npm run dev                       # http://localhost:5173
cd frontend && npm run build                     # Output to frontend/dist/

# Deploy (builds, copies static, validates, deploys, starts)
./deploy.sh dev
```

## Dark Mode Colors
- Frame (sidebar + navbar): `#1e1e1e` — neutral dark gray, no purple tint
- Canvas: `#000000` (true black) with `rounded-tl-xl` corner
- Node cards: `#222`
- Borders: `#2a2a2a` (subtle) or `#333`
- Hover states: `#2a2940`
- Layout: navbar full-width top, sidebar below — seamless L-frame, no borders between them

## Deployment Notes
- `backend/static/` and `backend/app.yaml` are gitignored — must be in `sync.include` in databricks.yml
- `valueFrom: sql-warehouse` resource name uses HYPHENS (proven in 4DX project)
- `sql` scope must be added via Databricks App UI each deploy (doesn't persist from app.yaml alone)
- After consent, works in normal browser (incognito only needed first time after scope change)
- Cross-workspace comparison NOT possible (app container can't reach other workspace hosts)

## Important Notes
- **Read-only**: Never modify UC schema data
- **Vite builds to `frontend/dist/`**: deploy.sh copies to `backend/static/`
- **CORS**: Only enabled in dev mode (is_production() checks for static/index.html)
- **Cache keys**: Scoped per-user via `request.state.user_email`
- **SPA 404 handler**: Preserves API error details, serves index.html for non-API routes
- **Lineage**: Requires access to system.access.column_lineage (gracefully returns empty)
