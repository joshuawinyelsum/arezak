# Arezak

Arezak is a constraint-based money management system that helps users allocate, protect, and control money through explicit financial rules and goal-based locks.

> **Money is not merely tracked. Money is governed by rules.**

## Overview

A normal budgeting application simply says: "You spent GH₵500."
Arezak says: "You cannot spend this GH₵500 because you committed it to a protected goal."

Arezak separates your money into three pools:
- **Available**: Ready to spend.
- **Reserved**: Assigned to upcoming obligations.
- **Locked**: Strictly protected by goal targets or date conditions.

## Architecture

- **Frontend**: Next.js App Router (React, Tailwind CSS, Zustand, TanStack Query)
- **Backend**: FastAPI (Python 3.12, Pydantic, SQLAlchemy)
- **Database**: PostgreSQL (Integer minor units / pesewas for financial safety)
- **Authentication**: HTTP-Only Secure Cookies + JWT
- **Constraint Engine**: First-class rule evaluation for all mutations.

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.12+

### Quickstart

1. Clone the repository and navigate into it.
2. Start the database:
   ```bash
   docker compose up -d
   ```
3. Setup Backend:
   ```bash
   python -m venv .venv
   source .venv/bin/activate # or .\.venv\Scripts\activate
   pip install -r backend/requirements.txt
   
   # Run migrations
   alembic upgrade head
   
   # Start server
   uvicorn app.main:app --reload
   ```
4. Setup Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Development Commands

- `cd frontend && npm run lint`: Lint frontend
- `cd frontend && npm run build`: Build frontend
- `pytest backend/tests`: Run backend rules tests
- `alembic revision --autogenerate -m "msg"`: Create new DB migration

## License
MIT

