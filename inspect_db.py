from app.db.session import SessionLocal
from app.models.goal import Goal
db = SessionLocal()
goals = db.query(Goal).order_by(Goal.created_at.desc()).all()
for g in goals:
    print(f"Goal {g.id}: {g.name} - {g.created_at}")
