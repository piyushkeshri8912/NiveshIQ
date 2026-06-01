from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional

class WatchlistItemBase(BaseModel):
    symbol: str = Field(..., description="Stock Ticker Symbol (e.g. INFY.NS, AAPL)")
    watch_reason: Optional[str] = Field(default=None, description="Reason for watching this stock")

    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, v: str) -> str:
        s = v.strip().upper()
        if not s:
            raise ValueError("Symbol cannot be empty")
        return s

class WatchlistItemCreate(WatchlistItemBase):
    pass

class WatchlistItemResponse(BaseModel):
    id: int
    user_id: int
    symbol: str
    company_name: Optional[str] = None
    watch_reason: Optional[str] = None
    added_at: datetime

    class Config:
        from_attributes = True

class WatchlistPriorityResponse(BaseModel):
    id: int
    symbol: str
    company_name: Optional[str] = None
    watch_reason: Optional[str] = None
    sector: Optional[str] = None
    market_cap_bucket: Optional[str] = None
    market_price: Optional[float] = None
    fit_score: float
    compatibility: str  # EXCELLENT | GOOD | NEUTRAL | AVOID
    commentary: str

    class Config:
        from_attributes = True

class WatchlistAIRecommendation(BaseModel):
    symbol: str
    recommendation: str
    compatibility: str

