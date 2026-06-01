from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict, Any, Optional

class PortfolioReviewResponse(BaseModel):
    id: int
    user_id: int
    created_at: datetime
    
    risk_summary: str
    diversification_summary: str
    
    rebalancing_ideas: Optional[List[Dict[str, Any]]] = []
    potential_stock_picks: Optional[List[Dict[str, Any]]] = []
    warnings: Optional[List[Dict[str, Any]]] = []
    market_impact: Optional[str] = None
    
    evidence: Optional[Dict[str, Any]] = None
    disclaimers: Optional[str] = None

    class Config:
        from_attributes = True
