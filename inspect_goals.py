from app.db.session import SessionLocal
from app.models.goal import Goal

db = SessionLocal()
goals = db.query(Goal).all()
for g in goals:
    print(f"Goal {g.id}: status={g.status}, target={g.target_amount}, current={g.current_amount}, lock_type={g.lock_type}, icon={g.icon}")
