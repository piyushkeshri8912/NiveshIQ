from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.db.session import Base

class AIUsage(Base):
    __tablename__ = "ai_usages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    model_name = Column(String, nullable=False)
    prompt_tokens = Column(Integer, default=0, nullable=False)
    candidates_tokens = Column(Integer, default=0, nullable=False)
    total_tokens = Column(Integer, default=0, nullable=False)
    cost = Column(Float, default=0.0, nullable=False)
    queried_at = Column(DateTime, default=datetime.utcnow, nullable=False)
