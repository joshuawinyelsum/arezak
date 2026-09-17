import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api.deps import SessionDep, CurrentUser
from app.models.goal_category import GoalCategory

router = APIRouter(prefix="/goal-categories", tags=["goal-categories"])

# Schemas
class GoalCategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    icon: str
    is_system: bool
    user_id: uuid.UUID | None = None
    
    model_config = ConfigDict(from_attributes=True)

class GoalCategoryCreate(BaseModel):
    name: str
    icon: str

# Endpoints
@router.get("/", response_model=list[GoalCategoryResponse])
def get_goal_categories(db: SessionDep, current_user: CurrentUser):
    categories = db.query(GoalCategory).filter(
        or_(
            GoalCategory.is_system == True,
            GoalCategory.user_id == current_user.id
        )
    ).order_by(GoalCategory.is_system.desc(), GoalCategory.name).all()
    
    return categories

@router.post("/", response_model=GoalCategoryResponse, status_code=201)
def create_goal_category(
    request: GoalCategoryCreate, 
    db: SessionDep, 
    current_user: CurrentUser
):
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
        
    if not request.icon:
        raise HTTPException(status_code=400, detail="Icon is required")
        
    # Check for duplicate for this user
    existing = db.query(GoalCategory).filter(
        GoalCategory.user_id == current_user.id,
        GoalCategory.name == name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Custom category with this name already exists")
        
    new_category = GoalCategory(
        name=name,
        icon=request.icon,
        user_id=current_user.id,
        is_system=False
    )
    
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    
    return new_category
