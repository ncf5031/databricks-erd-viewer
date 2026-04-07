# Installation Guide

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Databricks workspace | Unity Catalog enabled | Any cloud (AWS, Azure, GCP) |
| SQL Warehouse | Serverless, Pro, or Classic | Needed for metadata queries |
| Databricks CLI | v0.270.0+ | For Asset Bundle deployment |
| Python | 3.11+ | Backend development |
| Node.js | 18+ | Frontend build |

## Step 1: Clone and Configure

```bash
git clone <repo-url>
cd erd-viewer
```

Copy the template files and fill in your workspace values:

```bash
cp example.databricks.yml databricks.yml
cp backend/example.app.yaml backend/app.yaml
```

Edit `databricks.yml` — replace all `# TODO` comments with your values:

| Field | Where to Find |
|-------|--------------|
| `workspace.host` | Your Databricks workspace URL (e.g., `https://adb-1234567890.12.azuredatabricks.net/`) |
| `workspace.profile` | Your Databricks CLI profile name (run `databricks auth profiles` to list) |
| `warehouse_id` | Compute > SQL Warehouses > click warehouse > copy the ID from the URL or details panel |
| `user_name` | Your Databricks email address |
| `budget_policy_id` | Optional — your organization's budget policy ID, or remove the line |
| `group_name` | Optional — a Databricks group to grant app access, or remove the line |

The `backend/app.yaml` template works as-is for most deployments. Only edit it if you need custom cache or logging settings.

## Step 2: Deploy

```bash
./deploy.sh dev
```

This script:
1. Builds the React frontend (`npm run build`)
2. Copies the build output to `backend/static/`
3. Validates the Databricks Asset Bundle
4. Deploys to your workspace
5. Starts the app

## Step 3: Configure Authorization Scopes

After the first deploy, you must add the `sql` scope:

1. Go to your Databricks workspace
2. Navigate to **Compute > Apps > erd-viewer**
3. Click **Authorization** (or **Configure**)
4. Click **+Add scope** and select `sql`
5. Save and restart the app

This step is required because `user_api_scopes` in `app.yaml` declares the scope, but Databricks requires it to also be explicitly added through the UI.

## Step 4: Open the App

Navigate to the app URL shown in the deployment output. On first visit, you'll be prompted to consent to the SQL scope — this is a one-time OAuth consent flow.

**Tip**: If catalogs don't appear, open the app in an incognito window to trigger a fresh OAuth consent.

## Deploying to Multiple Environments

The `databricks.yml` template includes `dev`, `uat`, and `prod` targets. Configure each target's workspace host, profile, and warehouse ID, then deploy:

```bash
./deploy.sh dev    # Development
./deploy.sh uat    # UAT/Staging
./deploy.sh prod   # Production
```

The deploy script warns if you try to deploy to `prod` from a non-`main` branch.

## Local Development

For running the app locally without deploying to Databricks:

```bash
cp .env.example .env
# Edit .env with your DATABRICKS_HOST and SQL_WAREHOUSE_ID
```

```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
uvicorn app:app --reload          # http://localhost:8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

The Vite dev server proxies `/api` requests to the backend. You need Databricks CLI auth configured (`databricks auth login`) for the backend to connect to your workspace.

## Troubleshooting

See the [Troubleshooting section](../README.md#troubleshooting) in the README, or check [docs/CONFIGURATION.md](CONFIGURATION.md) for environment variable details.
