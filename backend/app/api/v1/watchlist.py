from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.user import User
from app.models.user_profile import UserProfile
from app.models.watchlist_item import WatchlistItem
from app.schemas.watchlist import WatchlistItemCreate, WatchlistItemResponse, WatchlistPriorityResponse, WatchlistAIRecommendation
from app.services.market_data_service import market_data_service
from app.services.holdings_service import holdings_service
from app.analytics.exposure import get_market_cap_bucket
from app.api.deps import get_current_user

router = APIRouter()

@router.get("", response_model=List[WatchlistItemResponse])
def get_watchlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == current_user.id)
        .order_by(WatchlistItem.added_at.desc())
        .all()
    )

@router.post("", response_model=WatchlistItemResponse)
def add_watchlist_item(
    item_in: WatchlistItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    symbol = item_in.symbol.upper().strip()
    
    # Check if already exists on user's watchlist
    existing = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == current_user.id, WatchlistItem.symbol == symbol)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{symbol} is already on your watchlist"
        )
    
    # Auto-resolve company name via yfinance
    company_name = market_data_service.get_company_name(symbol)
    
    db_item = WatchlistItem(
        user_id=current_user.id,
        symbol=symbol,
        company_name=company_name,
        watch_reason=item_in.watch_reason
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_watchlist_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_item = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.id == item_id, WatchlistItem.user_id == current_user.id)
        .first()
    )
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist item not found"
        )
    db.delete(db_item)
    db.commit()
    return {"message": "Watchlist item removed successfully"}

@router.get("/priorities", response_model=List[WatchlistPriorityResponse])
def get_watchlist_priorities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch user's active holdings & calculate total portfolio value
    holdings_res = holdings_service.calculate_holdings(db, current_user.id)
    holdings = holdings_res.holdings
    total_val = holdings_res.summary.total_value
    
    # 2. Compute current exposure weights per sector
    sector_vals = {}
    for h in holdings:
        sec = market_data_service.get_sector(h.symbol)
        sector_vals[sec] = sector_vals.get(sec, 0.0) + h.market_value
        
    # 3. Retrieve user profile for risk appetite & sector constraints
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    risk_appetite = profile.risk_appetite if profile else "MODERATE"
    avoid_sectors = profile.avoid_sectors if (profile and profile.avoid_sectors) else []
    preferred_sectors = profile.preferred_sectors if (profile and profile.preferred_sectors) else []
    
    # 4. Fetch user's raw watchlist items
    watchlist_items = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == current_user.id)
        .all()
    )
    
    # Pre-fetch live prices in bulk for performance
    symbols = [item.symbol for item in watchlist_items]
    prices = market_data_service.get_prices_bulk(symbols)
    
    prioritized = []
    
    for item in watchlist_items:
        symbol = item.symbol
        mkt_price = prices.get(symbol, 100.0)
        sector = market_data_service.get_sector(symbol)
        mkt_cap = market_data_service.get_market_cap(symbol)
        cap_bucket = get_market_cap_bucket(symbol, mkt_cap)
        
        # Calculate current sector weight in user's portfolio
        sec_val = sector_vals.get(sector, 0.0)
        sec_weight = (sec_val / total_val * 100.0) if total_val > 0 else 0.0
        
        score = 5.0
        commentary_points = []
        is_avoid = False
        
        # Check avoid sector violation
        if sector in avoid_sectors:
            is_avoid = True
            score = 1.0
            commentary_points.append(f"Sector Avoid Violation: {sector} belongs to an industry marked to avoid in your profile.")
        else:
            # 1. Sector Gaps (Diversification Boost)
            if sec_weight == 0.0:
                score += 2.0
                commentary_points.append(f"{sector} sector is currently underexposed (0% weight), providing a +2.0 diversification boost.")
            elif sec_weight < 5.0:
                score += 1.0
                commentary_points.append(f"{sector} sector has low exposure ({sec_weight:.1f}% weight), providing a +1.0 diversification boost.")
                
            # 2. Concentration Risk (Overexposure Penalty)
            if sec_weight > 50.0:
                score -= 3.0
                commentary_points.append(f"High concentration risk in {sector} ({sec_weight:.1f}% weight) triggers a -3.0 penalty.")
            elif sec_weight > 35.0:
                score -= 2.0
                commentary_points.append(f"Medium concentration risk in {sector} ({sec_weight:.1f}% weight) triggers a -2.0 penalty.")
            elif sec_weight > 25.0:
                score -= 1.0
                commentary_points.append(f"Minor concentration risk in {sector} ({sec_weight:.1f}% weight) triggers a -1.0 penalty.")
                
            # 3. Preferred Sector Boost
            if sector in preferred_sectors:
                score += 1.5
                commentary_points.append(f"{sector} is in your preferred sectors, adding a +1.5 boost.")
                
            # 4. Profile Cap Alignment
            if risk_appetite == "CONSERVATIVE":
                if cap_bucket == "SMALL":
                    score -= 2.0
                    commentary_points.append("Conservative profile penalizes Small-Cap volatility with a -2.0 deduction.")
                elif cap_bucket == "LARGE":
                    score += 1.5
                    commentary_points.append("Conservative profile boosts Large-Cap stability with a +1.5 addition.")
            elif risk_appetite == "AGGRESSIVE":
                if cap_bucket == "SMALL":
                    score += 1.0
                    commentary_points.append("Aggressive profile boosts Small-Cap growth potential with a +1.0 addition.")
                    
        # Clamp score between 1.0 and 10.0 (unless it's an avoid violation, which is strictly 1.0)
        if not is_avoid:
            score = max(1.0, min(10.0, score))
            
        # Determine compatibility rating
        if is_avoid:
            compatibility = "AVOID"
        elif score >= 8.0:
            compatibility = "EXCELLENT"
        elif score >= 6.0:
            compatibility = "GOOD"
        elif score >= 4.0:
            compatibility = "NEUTRAL"
        else:
            compatibility = "AVOID"
            
        # Join points into a single string
        if not commentary_points:
            commentary = "Balanced profile alignment with neutral sector concentration."
        else:
            commentary = " ".join(commentary_points)
            
        prioritized.append(
            WatchlistPriorityResponse(
                id=item.id,
                symbol=symbol,
                company_name=item.company_name,
                watch_reason=item.watch_reason,
                sector=sector,
                market_cap_bucket=cap_bucket,
                market_price=mkt_price,
                fit_score=round(score, 1),
                compatibility=compatibility,
                commentary=commentary
            )
        )
        
    # Sort prioritized list by fit score descending
    prioritized.sort(key=lambda x: x.fit_score, reverse=True)
    return prioritized

@router.get("/ai-recommendations", response_model=List[WatchlistAIRecommendation])
def get_watchlist_ai_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate or fetch AI-based watchlist stock recommendations matching market sentiment and risk profile.
    """
    from app.services.insights_engine import insights_engine
    return insights_engine.generate_watchlist_recommendations(db, current_user.id)

