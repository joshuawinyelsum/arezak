from fastapi import APIRouter, Depends
from sqlalchemy import text
from app.api.deps import SessionDep
import traceback

router = APIRouter(prefix="/debug", tags=["debug"])

@router.get("/check_data")
def check_data(db: SessionDep):
    try:
        # Read a few rows of each to see if there's any invalid enum
        txs = db.execute(text("SELECT id, type, status, currency, amount FROM transactions")).fetchall()
        accounts = db.execute(text("SELECT id, currency, available_balance FROM accounts")).fetchall()
        goals = db.execute(text("SELECT id, status, currency FROM goals")).fetchall()
        
        return {
            "txs": [dict(t._mapping) for t in txs],
            "accounts": [dict(a._mapping) for a in accounts],
            "goals": [dict(g._mapping) for g in goals]
        }
    except Exception as e:
        return {"error": traceback.format_exc()}
