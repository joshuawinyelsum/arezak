from typing import Generator, Annotated
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.config import settings
from app.core.security import decode_access_token
from app.models.user import User

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

SessionDep = Annotated[Session, Depends(get_db)]

def get_token_from_cookie(request: Request) -> str | None:
    return request.cookies.get("access_token")

def get_current_user(
    db: SessionDep,
    token: str | None = Depends(get_token_from_cookie)
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    
    # Optional prefix removal if "Bearer " was added in the cookie for some reason, 
    # but we will just store the raw token in the cookie.
    
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
        
    if payload.get("scp") == "onboarding":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Complete onboarding first")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
        
    import uuid
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]


def get_onboarding_user(
    db: SessionDep,
    token: str | None = Depends(get_token_from_cookie)
) -> User:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    import uuid
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

OnboardingUser = Annotated[User, Depends(get_onboarding_user)]


def get_any_auth_user(
    db: SessionDep,
    token: str | None = Depends(get_token_from_cookie)
) -> User:
    """Accept any authenticated user regardless of onboarding scope."""
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
    import uuid
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

AnyAuthUser = Annotated[User, Depends(get_any_auth_user)]
