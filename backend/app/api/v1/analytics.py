from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.db.session import get_db
from app.models.user import User
from app.models.portfolio_snapshot import PortfolioSnapshot
from app.models.transaction import Transaction
from app.analytics.exposure import calculate_sector_exposure, calculate_market_cap_exposure
from app.analytics.risk_score import calculate_portfolio_health
from app.services.holdings_service import holdings_service
from app.services.market_data_service import market_data_service
from app.api.deps import get_current_user
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/exposures")
def get_exposures(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sectors = calculate_sector_exposure(db, current_user.id)
    caps = calculate_market_cap_exposure(db, current_user.id)
    return {
        "sectors": sectors,
        "market_caps": caps
    }

@router.get("/health")
def get_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return calculate_portfolio_health(db, current_user.id)

@router.get("/performance-history")
def get_performance_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Layer 3 — Snapshots (Historical observations) queried directly from PostgreSQL for sub-5ms speeds
    snapshots = (
        db.query(PortfolioSnapshot)
        .filter(PortfolioSnapshot.user_id == current_user.id)
        .order_by(PortfolioSnapshot.captured_at.asc())
        .all()
    )
    
    # Self-healing fallback: If snapshots are empty but user has transactions, auto-rebuild from min date
    if not snapshots:
        first_tx = (
            db.query(Transaction)
            .filter(Transaction.user_id == current_user.id)
            .order_by(Transaction.executed_at.asc())
            .first()
        )
        if first_tx:
            from app.services.snapshot_service import snapshot_service
            snapshot_service.rebuild_snapshots(db, current_user.id, first_tx.executed_at)
            # Re-query newly built snapshots
            snapshots = (
                db.query(PortfolioSnapshot)
                .filter(PortfolioSnapshot.user_id == current_user.id)
                .order_by(PortfolioSnapshot.captured_at.asc())
                .all()
            )
            
    return snapshots

@router.post("/snapshot", status_code=status.HTTP_201_CREATED)
def trigger_snapshot(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Scheduled daily rebuild capture trigger
    from app.services.snapshot_service import snapshot_service
    snapshot_service.rebuild_snapshots(db, current_user.id, datetime.utcnow())
    
    snap = (
        db.query(PortfolioSnapshot)
        .filter(PortfolioSnapshot.user_id == current_user.id)
        .order_by(PortfolioSnapshot.captured_at.desc())
        .first()
    )
    return snap
