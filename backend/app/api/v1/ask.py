from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.ask import AskRequest, AskResponse
from app.services.insights_engine import insights_engine

router = APIRouter()

@router.post("", response_model=AskResponse)
def ask_copilot(
    request: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute conversational portfolio copilot queries grounded in real context.
    """
    try:
        response = insights_engine.ask_copilot(db, current_user.id, request.query)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ask Copilot query failed: {e}"
        )
