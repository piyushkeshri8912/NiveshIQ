from pydantic import BaseModel, Field
from typing import Optional
from app.schemas.profile import UserProfileResponse

class UserBase(BaseModel):
    email: str = Field(..., description="User Email")

class UserCreate(UserBase):
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    profile: Optional[UserProfileResponse] = None

    class Config:
        from_attributes = True
