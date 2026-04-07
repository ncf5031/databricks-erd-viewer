#!/bin/bash

# =============================================================================
# Deploy Script for ERD Viewer (FastAPI + React on Databricks Apps)
# =============================================================================
# This script:
# 1. Builds the React frontend
# 2. Copies build artifacts to backend/static/
# 3. Validates the Databricks Asset Bundle configuration
# 4. Deploys via Databricks Asset Bundle (creates all resources automatically)
# 5. Starts the Databricks App
#
# Usage:
#   ./deploy.sh [target]
#
# Examples:
#   ./deploy.sh dev      # Deploy to development (default)
#   ./deploy.sh uat      # Deploy to UAT
#   ./deploy.sh prod     # Deploy to production
#   ./deploy.sh          # Deploy to default target (dev)
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get target from command line (default: dev)
TARGET=${1:-dev}
APP_NAME="erd-viewer"

# Git branch check
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo -e "${BLUE}Current Git branch: ${CURRENT_BRANCH}${NC}"

if [ "${TARGET}" = "prod" ] && [ "${CURRENT_BRANCH}" != "main" ]; then
    echo -e "${RED}WARNING: Deploying to ${TARGET} from branch '${CURRENT_BRANCH}' (not 'main')${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deploying ERD Viewer${NC}"
echo -e "${BLUE}Target: ${TARGET}${NC}"
echo -e "${BLUE}========================================${NC}"

# Step 1: Build React frontend
echo -e "\n${YELLOW}[1/5] Building React frontend...${NC}"
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing npm dependencies...${NC}"
    npm install
fi

# Build React app
echo -e "${GREEN}Running: npm run build${NC}"
npm run build

# Verify build output
if [ ! -d "dist" ]; then
    echo -e "${RED}Build failed: dist/ directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}React build complete${NC}"
cd ..

# Step 2: Copy build artifacts to backend/static/
echo -e "\n${YELLOW}[2/5] Copying build artifacts to backend/static/${NC}"

# Create static directory if it doesn't exist
mkdir -p backend/static

# Remove old static files
echo -e "${YELLOW}Cleaning old static files...${NC}"
rm -rf backend/static/*

# Copy new build files
echo -e "${GREEN}Copying frontend/dist/* to backend/static/${NC}"
cp -r frontend/dist/* backend/static/

# Verify copy
if [ ! -f "backend/static/index.html" ]; then
    echo -e "${RED}Copy failed: backend/static/index.html not found${NC}"
    exit 1
fi

echo -e "${GREEN}Static files copied${NC}"

# Show build summary
echo -e "\n${BLUE}Build Summary:${NC}"
echo -e "  - Frontend build: ${GREEN}$(du -sh frontend/dist | cut -f1)${NC}"
echo -e "  - Backend static: ${GREEN}$(du -sh backend/static | cut -f1)${NC}"

# List key files
echo -e "\n${BLUE}Key files in backend/static/:${NC}"
ls -lh backend/static/ | head -n 10

# Step 3: Validate databricks.yml
echo -e "\n${YELLOW}[3/5] Validating Databricks Bundle configuration...${NC}"

if [ ! -f "databricks.yml" ]; then
    echo -e "${RED}databricks.yml not found${NC}"
    exit 1
fi

echo -e "${GREEN}Running: databricks bundle validate -t ${TARGET}${NC}"

if databricks bundle validate -t "${TARGET}"; then
    echo -e "${GREEN}Bundle configuration is valid${NC}"
else
    echo -e "${RED}Bundle validation failed${NC}"
    echo -e "${YELLOW}Please fix the errors above before deploying${NC}"
    exit 1
fi

# Step 4: Deploy via Databricks Bundle
echo -e "\n${YELLOW}[4/5] Deploying to Databricks (target: ${TARGET})...${NC}"
echo -e "${GREEN}Running: databricks bundle deploy -t ${TARGET}${NC}"

databricks bundle deploy -t "${TARGET}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Bundle deployment complete${NC}"

    # Step 5: Start the Databricks App
    echo -e "\n${YELLOW}[5/5] Starting Databricks App...${NC}"
    echo -e "${GREEN}Running: databricks apps start ${APP_NAME}${NC}"

    if databricks apps start "${APP_NAME}" --no-wait; then
        echo -e "${GREEN}App start initiated${NC}"
    else
        echo -e "${YELLOW}App start returned non-zero (app may already be running)${NC}"
    fi

    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment successful!${NC}"
    echo -e "${GREEN}========================================${NC}"

    echo -e "\n${BLUE}Next steps:${NC}"
    echo -e "  1. Wait for app to reach RUNNING state"
    echo -e "     ${YELLOW}databricks apps get ${APP_NAME}${NC}"
    echo -e "  2. Open app URL in Databricks workspace"
    echo -e "     Compute -> Apps -> ${APP_NAME}"

    echo -e "\n${BLUE}Troubleshooting:${NC}"
    echo -e "  - View logs: ${YELLOW}databricks apps logs ${APP_NAME}${NC}"
    echo -e "  - Check bundle: ${YELLOW}databricks bundle summary -t ${TARGET}${NC}"
    echo -e "  - Redeploy: ${YELLOW}./deploy.sh ${TARGET}${NC}"
else
    echo -e "\n${RED}========================================${NC}"
    echo -e "${RED}Deployment failed${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
