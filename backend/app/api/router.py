from fastapi import APIRouter
from app.api.v1 import health, profile, transactions, portfolio, analytics, watchlist, news, insights, ask, auth

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(profile.router, prefix="/profile", tags=["profile"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(watchlist.router, prefix="/watchlist", tags=["watchlist"])
api_router.include_router(news.router, prefix="/news", tags=["news"])
api_router.include_router(insights.router, prefix="/insights", tags=["insights"])
api_router.include_router(ask.router, prefix="/ask", tags=["ask"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])



