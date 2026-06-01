from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.portfolio import PortfolioHoldingsListResponse
from app.services.holdings_service import holdings_service
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/holdings", response_model=PortfolioHoldingsListResponse)
def get_holdings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return holdings_service.calculate_holdings(db, current_user.id)
