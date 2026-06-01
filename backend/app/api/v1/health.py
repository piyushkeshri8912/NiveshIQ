from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter()

@router.get("")
def check_health(db: Session = Depends(get_db)):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception as e:
        # We catch all exceptions here and report DB connection status as disconnected
        print(f"Health check DB connection error: {str(e)}")

    return {
        "status": "healthy",
        "database": "connected" if db_ok else "disconnected",
        "api_version": "v1"
    }
