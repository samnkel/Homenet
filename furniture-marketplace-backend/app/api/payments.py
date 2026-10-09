import json
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP

import httpx
from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession
from app.api.messages import create_notification
from app.core.config import get_settings
from app.core.paystack import verify_transaction, verify_webhook_signature
from app.models.entities import Order, Product

router = APIRouter(prefix="/payments", tags=["payments"])
settings = get_settings()
logger = logging.getLogger(__name__)


async def _release_stock(db: AsyncSession, orders: list[Order]) -> None:
    product_ids = {item.product_id for order in orders for item in order.items}
    products_result = await db.execute(
        select(Product)
        .where(Product.id.in_(product_ids))
        .order_by(Product.id)
        .with_for_update()
    )
    products = {product.id: product for product in products_result.scalars().all()}
    for order in orders:
        for item in order.items:
            product = products.get(item.product_id)
            if product:
                product.stock += item.quantity
                if product.status == "out_of_stock" and product.stock > 0:
                    product.status = "active"
        order.payment_status = "failed"
        order.status = "cancelled"


async def expire_pending_payments(db: AsyncSession) -> None:
    expires_before = datetime.now(timezone.utc) - timedelta(
        minutes=settings.PAYSTACK_PAYMENT_EXPIRY_MINUTES
    )
    references_result = await db.execute(
        select(Order.payment_reference)
        .where(
            Order.payment_status == "pending",
            Order.payment_expires_at <= expires_before,
            Order.payment_reference.is_not(None),
        )
        .distinct()
    )
    for reference in references_result.scalars().all():
        orders_result = await db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.payment_reference == reference)
            .order_by(Order.id)
            .with_for_update()
        )
        orders = list(orders_result.scalars().unique().all())
        if orders and all(order.payment_status == "pending" for order in orders):
            await _release_stock(db, orders)


async def confirm_orders_paid(
    db: AsyncSession, orders: list[Order], reference: str
) -> bool:
    if not orders:
        return False
    if all(order.payment_status == "paid" for order in orders):
        return True
    if any(order.payment_status != "pending" for order in orders):
        logger.error(
            "Paystack completed a payment after its order was no longer pending; "
            "manual refund review required for reference %s",
            reference,
        )
        return False

    timestamp = datetime.now(timezone.utc).isoformat()
    for order in orders:
        order.payment_status = "paid"
        order.status = "confirmed"
        await create_notification(
            db,
            user_id=order.customer_id,
            title="Payment confirmed",
            message=f"Payment for order {order.order_number} was received.",
            notification_type="order",
            link="/account",
        )
        steps = list(order.tracking_steps or [])
        for step in steps:
            if step.get("label") == "Confirmed by seller":
                step["completed"] = True
                step["date"] = timestamp
        order.tracking_steps = steps
    return True


@router.post("/paystack/webhook")
async def paystack_webhook(request: Request, db: DbSession):
    if not settings.PAYSTACK_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Paystack webhook is not configured",
        )
    raw_body = await request.body()
    if len(raw_body) > 64 * 1024:
        raise HTTPException(status_code=413, detail="Payment notification is too large")

    try:
        event = json.loads(raw_body)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=400, detail="Invalid payment notification") from error

    signature = request.headers.get("x-paystack-signature", "")
    if not signature or not verify_webhook_signature(
        raw_body, signature, settings.PAYSTACK_SECRET_KEY
    ):
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    if not isinstance(event, dict):
        raise HTTPException(status_code=400, detail="Invalid payment notification")
    event_type = event.get("event")
    if not isinstance(event_type, str) or event_type not in {
        "charge.success",
        "charge.failed",
    }:
        return {"status": "accepted"}
    event_data = event.get("data")
    if not isinstance(event_data, dict):
        raise HTTPException(status_code=400, detail="Invalid payment notification")
    reference = event_data.get("reference")
    if not isinstance(reference, str) or not reference:
        raise HTTPException(status_code=400, detail="Payment reference is missing")
    try:
        transaction = await verify_transaction(reference, settings)
    except (httpx.HTTPError, ValueError) as error:
        logger.exception("Unable to verify Paystack transaction")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment notification could not be validated",
        ) from error

    orders_result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.payment_reference == reference)
        .order_by(Order.id)
        .with_for_update()
    )
    orders = list(orders_result.scalars().unique().all())
    if not reference or not orders:
        raise HTTPException(status_code=404, detail="Payment reference not found")

    expected_amount = sum(
        (Decimal(str(order.total)) for order in orders), Decimal("0")
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if transaction.get("reference") != reference or transaction.get("currency") != "ZAR":
        logger.warning("Paystack reference or currency mismatch for %s", reference)
        raise HTTPException(status_code=400, detail="Payment reference or currency does not match")
    if (
        type(transaction.get("amount")) is not int
        or transaction["amount"] != int(expected_amount * 100)
    ):
        logger.warning("Paystack amount or reference mismatch for %s", reference)
        raise HTTPException(status_code=400, detail="Payment amount does not match the order")

    expected_status = "success" if event_type == "charge.success" else "failed"
    if transaction.get("status") != expected_status:
        logger.warning("Paystack status mismatch for payment reference %s", reference)
        return {"status": "accepted"}

    if event_type == "charge.success":
        await confirm_orders_paid(db, orders, reference)
        return {"status": "accepted"}

    if any(order.payment_status == "paid" for order in orders):
        logger.warning(
            "Ignoring failed Paystack notification for already-paid reference %s",
            reference,
        )
        return {"status": "accepted"}
    if all(order.payment_status == "pending" for order in orders):
        await _release_stock(db, orders)
        for order in orders:
            await create_notification(
                db,
                user_id=order.customer_id,
                title="Payment not completed",
                message=f"Payment for order {order.order_number} was not completed.",
                notification_type="order",
                link="/cart",
            )

    return {"status": "accepted"}
