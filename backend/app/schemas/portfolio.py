from pydantic import BaseModel
from typing import List, Optional

class HoldingResponse(BaseModel):
    symbol: str
    company_name: Optional[str] = None
    quantity: float
    average_buy_price: float
    market_price: float
    market_value: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    allocation_percent: float

class PortfolioSummaryResponse(BaseModel):
    total_cost: float
    total_value: float
    total_unrealized_pnl: float
    total_unrealized_pnl_percent: float
    total_realized_pnl: float

class PortfolioHoldingsListResponse(BaseModel):
    holdings: List[HoldingResponse]
    summary: PortfolioSummaryResponse
