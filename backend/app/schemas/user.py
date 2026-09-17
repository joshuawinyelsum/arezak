import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict

# Shared properties
class UserBase(BaseModel):
    email: EmailStr
    name: str
    currency: str | None = "GHS"
    timezone: str | None = "UTC"

# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str

# Properties to return via API
class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

