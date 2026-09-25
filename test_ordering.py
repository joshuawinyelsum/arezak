from app.db.session import SessionLocal
from app.models.user import User
from app.api.v1.goals import get_goals

db = SessionLocal()
user = db.query(User).first()
if user:
    goals = get_goals(db=db, current_user=user)
    for g in goals:
        print(f"Goal: {g.name}, Created At: {g.created_at}")
