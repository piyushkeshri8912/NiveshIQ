from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.services.holdings_service import holdings_service
from app.services.market_data_service import market_data_service
from app.analytics.exposure import calculate_sector_exposure, calculate_market_cap_exposure
from app.models.user_profile import UserProfile

def calculate_portfolio_health(db: Session, user_id: int) -> Dict[str, Any]:
    res = holdings_service.calculate_holdings(db, user_id)
    holdings = res.holdings
    
    if not holdings:
        return {
            "risk_score": 5.0,
            "diversification_score": 50.0,
            "warnings": [],
            "status": "No holdings logged"
        }

    # 1. Fetch User Profile for targeted thresholds
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    risk_appetite = profile.risk_appetite if profile else "MODERATE"
    avoid_sectors = profile.avoid_sectors if profile else []

    # 2. Diversification Score based on Sector HHI
    sector_exposures = calculate_sector_exposure(db, user_id)
    sector_hhi = sum(s["percentage"] ** 2 for s in sector_exposures)
    # HHI range is 0 to 10000. 10000 means 100% in one sector.
    # We invert it so low HHI (high diversification) yields score near 100.
    diversification_score = max(0.0, min(100.0, 100.0 - (sector_hhi / 100.0)))

    # 3. Dynamic Risk Score (1-10 Scale)
    # Combine Asset HHI, Small-Cap Ratio, and Sector HHI
    asset_hhi = sum(h.allocation_percent ** 2 for h in holdings)
    
    # Calculate Small-Cap exposure ratio
    cap_exposures = calculate_market_cap_exposure(db, user_id)
    small_cap_percentage = next((c["percentage"] for c in cap_exposures if c["bucket"] == "SMALL"), 0.0)
    
    # Base risk calculations:
    # Asset HHI contribution (0 to 4.0 points)
    asset_hhi_factor = (asset_hhi / 10000.0) * 4.0
    # Small-cap concentration contribution (0 to 3.0 points)
    small_cap_factor = (small_cap_percentage / 100.0) * 3.0
    # Sector concentration contribution (0 to 3.0 points)
    sector_hhi_factor = (sector_hhi / 10000.0) * 3.0

    raw_risk_score = 1.0 + asset_hhi_factor + small_cap_factor + sector_hhi_factor
    risk_score = max(1.0, min(10.0, raw_risk_score))

    # 4. Profile-aware Concentration & Sector Warnings
    warnings = []
    
    # Define concentration limit based on risk profile
    concentration_limit = 20.0  # default for MODERATE
    if risk_appetite == "CONSERVATIVE":
        concentration_limit = 10.0
    elif risk_appetite == "AGGRESSIVE":
        concentration_limit = 30.0

    for h in holdings:
        # Check single stock over-concentration
        if h.allocation_percent > concentration_limit:
            warnings.append({
                "type": "CONCENTRATION",
                "symbol": h.symbol,
                "message": f"{h.symbol} constitutes {h.allocation_percent:.1f}% of your portfolio, exceeding your targeted risk profile threshold of {concentration_limit:.1f}%."
            })
            
        # Check sector avoid violations
        sector = market_data_service.get_sector(h.symbol)
        if sector in avoid_sectors:
            warnings.append({
                "type": "AVOID_SECTOR",
                "symbol": h.symbol,
                "message": f"Asset {h.symbol} belongs to a sector you marked to avoid: {sector}."
            })

    # Assess Risk profile alignment
    target_risk_upper = 7.0 if risk_appetite == "MODERATE" else (4.0 if risk_appetite == "CONSERVATIVE" else 10.0)
    if risk_score > target_risk_upper:
        warnings.append({
            "type": "RISK_MISALIGNMENT",
            "symbol": "PORTFOLIO",
            "message": f"Your current portfolio risk level ({risk_score:.1f}) exceeds the target guidelines for your chosen {risk_appetite} profile."
        })

    return {
        "risk_score": float(risk_score),
        "diversification_score": float(diversification_score),
        "warnings": warnings,
        "status": "Aligned" if not warnings else "Review Needed"
    }
