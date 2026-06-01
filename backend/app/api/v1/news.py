from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.db.session import get_db
from app.models.user import User
from app.models.holding import Holding
from app.models.watchlist_item import WatchlistItem
from app.services.market_data_service import market_data_service
from app.services.news_service import news_service
from app.analytics.exposure import get_market_cap_bucket
from app.api.deps import get_current_user

router = APIRouter()

class NewsItemResponse(BaseModel):
    symbol: str
    company_name: Optional[str] = None
    title: str
    link: str
    source: str
    published_at: str
    why_matters: str

@router.get("", response_model=List[NewsItemResponse])
def get_portfolio_news(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Retrieve user's active holdings
    holdings = (
        db.query(Holding)
        .filter(Holding.user_id == current_user.id, Holding.quantity > 0.0)
        .all()
    )
    
    # 2. Retrieve user's watchlist items
    watchlist = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == current_user.id)
        .all()
    )
    
    # Map holdings and watchlist details for context
    holdings_qty = {h.symbol.upper(): h.quantity for h in holdings}
    watchlist_reasons = {w.symbol.upper(): w.watch_reason for w in watchlist}
    
    # 3. Aggregate unique symbols and map to company names
    symbols_map = {}
    for h in holdings:
        sym = h.symbol.upper().strip()
        symbols_map[sym] = market_data_service.get_company_name(sym)
        
    for w in watchlist:
        sym = w.symbol.upper().strip()
        if sym not in symbols_map:
            symbols_map[sym] = w.company_name or market_data_service.get_company_name(sym)
            
    # 4. Fetch bulk news in parallel/sequence through feedparser cached pipeline
    bulk_news = news_service.fetch_news_bulk(symbols_map)
    
    # 5. Build enriched context-aware response
    enriched_feed = []
    for symbol, articles in bulk_news.items():
        comp_name = symbols_map.get(symbol, symbol)
        qty = holdings_qty.get(symbol, 0.0)
        reason = watchlist_reasons.get(symbol)
        
        sector = market_data_service.get_sector(symbol)
        mkt_cap = market_data_service.get_market_cap(symbol)
        cap_bucket = get_market_cap_bucket(symbol, mkt_cap)
        
        # Calculate dynamic context commentary
        why_matters = news_service.get_why_matters_label(
            symbol=symbol,
            sector=sector,
            cap_bucket=cap_bucket,
            holding_qty=qty,
            watch_reason=reason
        )
        
        for art in articles:
            enriched_feed.append(
                NewsItemResponse(
                    symbol=symbol,
                    company_name=comp_name,
                    title=art["title"],
                    link=art["link"],
                    source=art["source"],
                    published_at=art["published_at"],
                    why_matters=why_matters
                )
            )
            
    # Sort chronological aggregations (published_at descending)
    enriched_feed.sort(key=lambda x: x.published_at, reverse=True)
    return enriched_feed
