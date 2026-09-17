from fastapi import FastAPI, Depends, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import get_db
from app.core.config import settings
from app.api.v1 import auth, transactions, accounts, goals, goal_categories

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

@app.middleware("http")
async def csrf_protect(request: Request, call_next):
    # Only protect state-changing methods
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        # We require a custom header to ensure the request was made via fetch/XHR (which triggers CORS preflight)
        # This prevents simple form submissions from malicious sites (which bypass preflight)
        if not request.headers.get("x-requested-with"):
            return JSONResponse(status_code=403, content={"detail": "CSRF protection: missing x-requested-with header"})
    return await call_next(request)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True, # Important for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(transactions.router, prefix=settings.API_V1_STR)
app.include_router(accounts.router, prefix=settings.API_V1_STR)
app.include_router(goals.router, prefix=settings.API_V1_STR)
app.include_router(goal_categories.router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}

@app.get("/health/ready")
def readiness_check(db: Session = Depends(get_db)):
    # Check DB connection
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected", "environment": settings.ENVIRONMENT}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="Database not ready")
