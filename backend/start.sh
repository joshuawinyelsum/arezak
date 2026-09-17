#!/bin/bash
set -e

echo "Starting Arezak Backend..."

echo "Running Alembic migrations..."
alembic upgrade head

echo "Starting FastAPI server..."
# Use PORT from environment or fallback to 8000
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
