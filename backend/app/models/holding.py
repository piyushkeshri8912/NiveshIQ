from sqlalchemy import Column, Integer, String, Float, ForeignKey, UniqueConstraint
from app.db.session import Base

class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    symbol = Column(String(20), index=True, nullable=False)
    quantity = Column(Float, default=0.0, nullable=False)
    average_buy_price = Column(Float, default=0.0, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "symbol", name="uq_user_symbol"),
    )
