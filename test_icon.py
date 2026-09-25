from app.db.session import SessionLocal
from app.models.user import User
from app.services.goal_service import create_goal

db = SessionLocal()
user = db.query(User).first()
if user:
    goal = create_goal(db, user.id, 'Test Icon', 1000, icon='Laptop')
    db.commit()
    print(f"Goal created with icon: {goal.icon}")
