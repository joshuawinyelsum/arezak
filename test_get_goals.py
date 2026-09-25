from app.db.session import SessionLocal
from app.models.user import User
from app.api.v1.goals import get_goals
from fastapi import Request

db = SessionLocal()
user = db.query(User).first()
if user:
    goals = get_goals(db=db, current_user=user)
    print(f"Goal icon returned from get_goals API: {goals[0].icon}")
