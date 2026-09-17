# Arezak Deployment Guide

This document outlines the deployment strategy for Arezak across local, staging, and future production environments.

## Architecture

Arezak uses a decoupled architecture:
- **Frontend**: Next.js (Vercel)
- **Backend**: FastAPI (Railway)
- **Database**: PostgreSQL (Railway)

### Environments

1. **Local**: Docker Compose (PostgreSQL) + local FastAPI + local Next.js.
2. **Staging**: Hosted on Vercel & Railway. Completely separate database. Used for validation and smoke testing.
3. **Production**: **NOT YET PROVISIONED**. Will be an isolated replica of the staging architecture.

## Environment Variables

> **WARNING:** Never commit actual secrets or `.env` files to Git.

### Backend Configurations

- `ENVIRONMENT`: `development`, `staging`, or `production`.
- `DB_DIALECT`: `sqlite` or `postgresql` (sqlite strictly disabled in staging/production).
- `POSTGRES_SERVER`: Hostname (e.g., `localhost` or Railway private network URL).
- `POSTGRES_USER`: Database user.
- `POSTGRES_PASSWORD`: Database password.
- `POSTGRES_DB`: Database name.
- `SECRET_KEY`: Used for JWT signing. Must be securely generated and injected in staging/production.
- `CORS_ORIGINS`: Comma-separated list of allowed frontend origins (e.g., `https://staging-frontend.vercel.app`).

### Frontend Configurations

- `NEXT_PUBLIC_API_URL`: The full URL to the backend API (e.g., `https://arezak-staging-api.up.railway.app/api/v1`).

## Deployment Process (Staging)

### 1. Database (Railway)
- Provision a PostgreSQL database in a Railway project.
- No schema needs to be manually created; Alembic handles it.

### 2. Backend (Railway)
- Connect Railway to the GitHub repository.
- Set the **Root Directory** to `backend/`.
- Inject the required environment variables (see above).
- Railway will automatically detect the Python environment.
- The `start.sh` script executes `alembic upgrade head` followed by `uvicorn app.main:app`.
- **Health Checks**: Configure Railway healthchecks against `/health/ready`.

### 3. Frontend (Vercel)
- Connect Vercel to the GitHub repository.
- Set the **Root Directory** to `frontend/`.
- Set `NEXT_PUBLIC_API_URL` to the deployed Railway backend URL.

## Smoke Testing & Data Seeding

Staging uses strictly synthetic test data (no real money or production user accounts).
To rebuild staging data:
1. Ensure the database is completely empty (destroy/recreate the Railway DB service).
2. Redeploy the backend (runs migrations automatically).
3. Connect to the Railway environment and run: `python scripts/seed_staging.py`.
4. Run manual smoke tests on the frontend UI: Income -> Goal Creation -> Contribution -> Achievement -> Release -> Normal Expense.

## Rollback Procedure

If a deployment fails:
1. **Frontend**: Use Vercel's "Instant Rollback" button in the dashboard to revert to the previous working deployment.
2. **Backend**: Use Railway's deployment history to rollback to the previous successful commit.
3. **Database Migrations**: If a migration causes data corruption in staging, it is faster to destroy the staging database, recreate it, run `alembic upgrade head` on the previous backend commit, and re-run `seed_staging.py`. Do not attempt manual SQL hotfixes.

## Branch Workflow

- `main`: Stable, deployable branch.
- `staging`: Target for feature merges. Triggers deployment to the staging environment.
- `feature/*`: Local development.
