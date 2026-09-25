from app.db.session import SessionLocal
from app.models.user import User
from app.services.goal_service import create_goal

db = SessionLocal()
user = db.query(User).first()
if user:
    goal = create_goal(
        db=db,
        user_id=user.id,
        name="Test API Icon",
        icon="Camera",
        target_amount=1000
    )
    db.commit()
    print(f"Goal icon in DB: {goal.icon}")
