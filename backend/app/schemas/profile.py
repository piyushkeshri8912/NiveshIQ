from pydantic import BaseModel, Field
from typing import List, Optional

class UserProfileBase(BaseModel):
    risk_appetite: str = Field(..., description="Risk profile: CONSERVATIVE, MODERATE, AGGRESSIVE")
    time_horizon: str = Field(..., description="Horizon: SHORT_TERM, MEDIUM_TERM, LONG_TERM")
    investment_goal: str = Field(..., description="Goal: WEALTH_ACCUMULATION, RETIREMENT, INCOME, BALANCED")
    preferred_sectors: Optional[List[str]] = Field(default=[], description="Preferred sectors")
    avoid_sectors: Optional[List[str]] = Field(default=[], description="Avoided sectors")
    liquidity_preference: Optional[str] = Field(default="MEDIUM", description="Liquidity: HIGH, MEDIUM, LOW")
    dividend_vs_growth: Optional[str] = Field(default="BALANCED", description="Dividend/Growth: GROWTH, DIVIDEND, BALANCED")
    monthly_investment_budget: Optional[float] = Field(default=0.0, description="Monthly surplus investment budget")
    notes: Optional[str] = Field(default=None, description="Extra profile notes")
    full_name: Optional[str] = Field(default=None, description="Full Name")
    dob: Optional[str] = Field(default=None, description="Date of Birth (YYYY-MM-DD)")
    profession: Optional[str] = Field(default=None, description="Profession")

class UserProfileCreate(UserProfileBase):
    pass

class UserProfileUpdate(BaseModel):
    risk_appetite: Optional[str] = None
    time_horizon: Optional[str] = None
    investment_goal: Optional[str] = None
    preferred_sectors: Optional[List[str]] = None
    avoid_sectors: Optional[List[str]] = None
    liquidity_preference: Optional[str] = None
    dividend_vs_growth: Optional[str] = None
    monthly_investment_budget: Optional[float] = None
    notes: Optional[str] = None
    full_name: Optional[str] = None
    dob: Optional[str] = None
    profession: Optional[str] = None

class UserProfileResponse(UserProfileBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True
