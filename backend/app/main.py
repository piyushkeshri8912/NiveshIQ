from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import api_router
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.user import User

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup DB schema creation (for dev/demo environments)
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed default user with ID = 1
    db = SessionLocal()
    try:
        from app.core.security import get_password_hash
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            user = User(
                id=1,
                email="demo@niveshiq.com",
                hashed_password=get_password_hash("DemoPassword123"),
                is_active=True,
                is_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print("Default demo user seeded successfully.")
        elif not user.hashed_password or not user.is_verified:
            user.hashed_password = get_password_hash("DemoPassword123")
            user.is_verified = True
            user.is_active = True
            db.commit()
            print("Default demo user credentials updated.")
            
        # Synchronize holdings and snapshots for the demo user on startup if transactions exist
        from app.models.transaction import Transaction
        first_tx = db.query(Transaction).filter(Transaction.user_id == 1).order_by(Transaction.executed_at.asc()).first()
        if first_tx:
            from app.services.snapshot_service import snapshot_service
            snapshot_service.rebuild_snapshots(db, 1, first_tx.executed_at)
            print("Successfully synchronized holdings and snapshots for demo user in PostgreSQL.")
    except Exception as e:
        print(f"Error seeding or syncing default demo user: {e}")
    finally:
        db.close()
        
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Configure CORS to allow Next.js dev server (usually localhost:3000) and other dev tools
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
