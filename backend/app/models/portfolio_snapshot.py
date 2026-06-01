from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base

class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    captured_at = Column(DateTime(timezone=True), default=func.now(), index=True, nullable=False)
    total_value = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)
    risk_score = Column(Float, default=5.0, nullable=False)
    diversification_score = Column(Float, default=50.0, nullable=False)
