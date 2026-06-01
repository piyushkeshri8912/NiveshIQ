from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionResponse, TransactionUpdate
from app.services.market_data_service import market_data_service
from app.services.snapshot_service import snapshot_service
from app.api.deps import get_current_user

router = APIRouter()

@router.get("", response_model=List[TransactionResponse])
def get_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.executed_at.desc())
        .all()
    )

@router.post("", response_model=TransactionResponse)
def create_transaction(
    tx_in: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tx_data = tx_in.model_dump()
    symbol = tx_data["symbol"].upper().strip()
    tx_data["symbol"] = symbol
    
    # Auto-populate company name if missing
    if not tx_data.get("company_name"):
        tx_data["company_name"] = market_data_service.get_company_name(symbol)
        
    db_tx = Transaction(user_id=current_user.id, **tx_data)
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    
    # Chronological Rebuild Trigger
    snapshot_service.rebuild_snapshots(db, current_user.id, db_tx.executed_at)
    
    return db_tx

@router.put("/{tx_id}", response_model=TransactionResponse)
def update_transaction(
    tx_id: int,
    tx_in: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_tx = (
        db.query(Transaction)
        .filter(Transaction.id == tx_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not db_tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
        
    # Capture old execution date
    old_executed_at = db_tx.executed_at
    
    tx_data = tx_in.model_dump(exclude_unset=True)
    if "symbol" in tx_data:
        tx_data["symbol"] = tx_data["symbol"].upper().strip()
        # Update company name as well if changed
        if not tx_data.get("company_name"):
            tx_data["company_name"] = market_data_service.get_company_name(tx_data["symbol"])
            
    for key, value in tx_data.items():
        setattr(db_tx, key, value)
        
    db.commit()
    db.refresh(db_tx)
    
    # Chronological Rebuild Trigger using the earliest target date
    from_date = min(db_tx.executed_at, old_executed_at)
    snapshot_service.rebuild_snapshots(db, current_user.id, from_date)
    
    return db_tx

@router.delete("/{tx_id}")
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_tx = (
        db.query(Transaction)
        .filter(Transaction.id == tx_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not db_tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    old_executed_at = db_tx.executed_at
    
    db.delete(db_tx)
    db.commit()
    
    # Chronological Rebuild Trigger
    snapshot_service.rebuild_snapshots(db, current_user.id, old_executed_at)
    
    return {"message": "Transaction deleted successfully"}
