# Contributing

Thank you for your interest in contributing to the ERD Viewer!

## Getting Started

1. Fork the repository
2. Clone your fork and set up local development (see [INSTALL.md](INSTALL.md#local-development))
3. Create a feature branch from `main`

## Development Setup

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

The frontend dev server at `http://localhost:5173` proxies API requests to the backend at `http://localhost:8000`.

## Project Structure

| Directory | Description |
|-----------|-------------|
| `backend/` | FastAPI app — routers, services, models, auth |
| `backend/routers/` | API route handlers |
| `backend/services/` | Business logic (SQL queries, comparison, inference) |
| `backend/models/` | Pydantic request/response models |
| `frontend/src/` | React + TypeScript app |
| `frontend/src/components/` | UI components organized by feature |
| `frontend/src/stores/` | Zustand state management |
| `frontend/src/api/` | Typed API client |

## Making Changes

### Backend

- **New endpoint**: Add a router in `backend/routers/`, register it in `backend/app.py`
- **New service**: Add to `backend/services/`, import in the relevant router
- **New model**: Add to `backend/models/`, use in service and router

### Frontend

- **New component**: Add to the appropriate `frontend/src/components/` subfolder
- **New state**: Add to the relevant Zustand store in `frontend/src/stores/`
- **New API call**: Add to `frontend/src/api/client.ts` with proper typing

### Conventions

- Backend follows existing patterns: FastAPI routers, Pydantic models, service layer separation
- Frontend uses React functional components, TypeScript strict mode, Tailwind for styling
- Dark mode: all UI must support both light and dark themes (Tailwind `dark:` variants)
- The app is **read-only** — never modify Unity Catalog data

## Submitting Changes

1. Ensure the frontend builds cleanly:
   ```bash
   cd frontend && npm run build
   ```

2. Test your changes against a Databricks workspace (local dev or deployed)

3. Keep commits focused — one logical change per commit

4. Submit a pull request with:
   - A clear description of what changed and why
   - Any manual testing steps needed to verify

## Code of Conduct

Be respectful, constructive, and collaborative. We're all here to build something useful.
