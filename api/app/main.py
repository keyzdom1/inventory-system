from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from . import models  # noqa: F401
from .database import Base, engine
from .routers import auth, admin, products, customers, suppliers, sales, purchases, dashboard


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

    try:
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'users'"
            ))
            columns = {row[0] for row in result.fetchall()}
            if "is_approved" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT FALSE"))
            if "is_active" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE"))
            conn.commit()
    except Exception:
        pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Small Business Inventory & Sales System", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (
    auth.router,
    admin.router,
    products.router,
    customers.router,
    suppliers.router,
    sales.router,
    purchases.router,
    dashboard.router,
):
    app.include_router(router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
def root():
    return {"name": "Small Business Inventory & Sales System API", "docs": "/docs"}
