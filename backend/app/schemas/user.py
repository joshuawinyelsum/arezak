import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, Field

# Shared properties
class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone_number: str | None = Field(default=None, max_length=20)
    handle: str | None = Field(default=None, min_length=3, max_length=30)
    currency: str | None = "GHS"
    timezone: str | None = "UTC"

# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str

# Properties to return via API
class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str  # from @property
    phone_verified: bool
    email_verified: bool
    profile_photo_url: str | None
    created_at: datetime
    updated_at: datetime
