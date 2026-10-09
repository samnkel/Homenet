import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import admin, auth, businesses, categories, messages, orders, payments, products, wishlist
from app.core.config import get_settings
from app.db.session import AsyncSessionLocal, Base, engine

settings = get_settings()
logger = logging.getLogger(__name__)


async def _expire_pending_payments():
    while True:
        await asyncio.sleep(300)
        try:
            async with AsyncSessionLocal() as db:
                await payments.expire_pending_payments(db)
                await db.commit()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Unable to expire stale Paystack checkout reservations")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if they don't exist (for local/dev). Prefer migrations in production.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN IF NOT EXISTS temporary_password_expires_at TIMESTAMPTZ"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE users "
                "ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE orders "
                "ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100)"
            )
        )
        await conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_orders_payment_reference "
                "ON orders (payment_reference)"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE orders "
                "ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ"
            )
        )
        await conn.execute(text("ALTER TABLE businesses ALTER COLUMN owner_id DROP NOT NULL"))
        await conn.execute(text("ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL"))
        await conn.execute(text("ALTER TABLE order_items ALTER COLUMN product_id DROP NOT NULL"))
    expiry_task = asyncio.create_task(_expire_pending_payments())
    try:
        yield
    finally:
        expiry_task.cancel()
        try:
            await expiry_task
        except asyncio.CancelledError:
            pass
        await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(auth.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(businesses.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(wishlist.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.ENVIRONMENT}


app = CORSMiddleware(
    app=app,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
