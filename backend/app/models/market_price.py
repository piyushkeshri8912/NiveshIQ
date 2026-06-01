from sqlalchemy import Column, String, Float, DateTime
from datetime import datetime
from app.db.session import Base

class MarketPrice(Base):
    __tablename__ = "market_prices"

    symbol = Column(String, primary_key=True, index=True)
    price = Column(Float, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
