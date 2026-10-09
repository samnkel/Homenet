import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, require_roles
from app.api.messages import create_notification
from app.core.config import get_settings
from app.core.paystack import initialize_transaction, verify_transaction
from app.models.entities import Business, Order, OrderItem, Product, User
from app.api.payments import _release_stock, confirm_orders_paid, expire_pending_payments
from app.schemas.order import (
    OrderCreate,
    OrderOut,
    OrderStatusUpdate,
    PaystackCheckoutOut,
    PaymentStatusOut,
)

router = APIRouter(prefix="/orders", tags=["orders"])
settings = get_settings()
logger = logging.getLogger(__name__)
CENT = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _order_number() -> str:
    return f"FL-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"


def _within_customer_cancellation_window(
    created_at: datetime, now: datetime | None = None
) -> bool:
    placed_at = created_at
    if placed_at.tzinfo is None:
        placed_at = placed_at.replace(tzinfo=timezone.utc)
    current_time = now or datetime.now(timezone.utc)
    return current_time - placed_at <= timedelta(hours=24)


def _order_out(o: Order) -> OrderOut:
    return OrderOut(
        id=o.id,
        order_number=o.order_number,
        customer_id=o.customer_id,
        customer_name=o.customer_name,
        customer_email=o.customer_email,
        business_id=o.business_id,
        business_name=o.business_name,
        items=[
            {
                "id": i.id,
                "product_id": i.product_id,
                "product_name": i.product_name,
                "product_image": i.product_image,
                "sku": i.sku,
                "variant": i.variant,
                "quantity": i.quantity,
                "unit_price": i.unit_price,
                "total_price": i.total_price,
            }
            for i in o.items
        ],
        subtotal=o.subtotal,
        delivery_fee=o.delivery_fee,
        discount=o.discount,
        platform_fee=o.platform_fee,
        total=o.total,
        status=o.status,
        payment_status=o.payment_status,
        payment_method=o.payment_method,
        delivery_address=o.delivery_address,
        estimated_delivery=o.estimated_delivery,
        tracking_steps=o.tracking_steps or [],
        created_at=o.created_at,
        updated_at=o.updated_at,
    )


@router.post("", response_model=PaystackCheckoutOut, status_code=status.HTTP_201_CREATED)
async def create_orders(body: OrderCreate, db: DbSession, user: CurrentUser):
    """
    Create pending orders per seller and return a Paystack hosted-checkout URL.
    """
    if user.role != "customer":
        raise HTTPException(status_code=403, detail="Only customers can place orders")
    if not body.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    if not settings.PAYSTACK_SECRET_KEY or settings.PAYSTACK_PAYMENT_EXPIRY_MINUTES < 1:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Paystack checkout is not configured. Set PAYSTACK_SECRET_KEY.",
        )

    product_ids = {str(i.product_id) for i in body.items}
    await expire_pending_payments(db)
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.business))
        .where(Product.id.in_(product_ids))
        .order_by(Product.id)
        .with_for_update()
    )
    products = {p.id: p for p in result.scalars().all()}

    by_business: dict[str, list] = {}
    requested_quantities: dict[str, int] = {}
    for item in body.items:
        product_id = str(item.product_id)
        requested_quantities[product_id] = (
            requested_quantities.get(product_id, 0) + item.quantity
        )
        p = products.get(product_id)
        if not p:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if p.status != "active":
            raise HTTPException(status_code=400, detail=f"{p.name} is not available")
        by_business.setdefault(p.business_id, []).append((item, p))

    for product_id, quantity in requested_quantities.items():
        product = products[product_id]
        if product.stock < quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")

    address = body.delivery_address.model_dump(by_alias=True, exclude_none=True)
    basket_subtotal = sum(
        (
            Decimal(str(p.sale_price if p.sale_price is not None else p.price))
            * item.quantity
            for item in body.items
            for p in [products[str(item.product_id)]]
        ),
        Decimal("0"),
    )
    if basket_subtotal <= 0:
        raise HTTPException(status_code=400, detail="Order total must be greater than zero")
    if body.delivery_method == "express":
        delivery_fee_total = Decimal("550.00")
    else:
        delivery_fee_total = Decimal("0.00")

    delivery_fee_cents, fee_remainder = divmod(
        int(delivery_fee_total * 100), len(by_business)
    )
    business_fees = [
        Decimal(delivery_fee_cents + (1 if i < fee_remainder else 0)) / 100
        for i in range(len(by_business))
    ]
    reference = str(uuid.uuid4())
    created: list[Order] = []

    for business_index, (business_id, pairs) in enumerate(by_business.items()):
        first_product = pairs[0][1]
        business = first_product.business
        if not business:
            biz_r = await db.execute(select(Business).where(Business.id == business_id))
            business = biz_r.scalar_one()

        subtotal = Decimal("0")
        order_items: list[OrderItem] = []
        for item, p in pairs:
            unit = Decimal(str(p.sale_price if p.sale_price is not None else p.price))
            line_total = unit * item.quantity
            subtotal += line_total
            variant_label = item.variant or " / ".join(
                filter(None, [item.selected_color, item.selected_size])
            ) or None
            order_items.append(
                OrderItem(
                    product_id=p.id,
                    product_name=p.name,
                    product_image=(p.images[0] if p.images else None),
                    sku=p.sku,
                    variant=variant_label,
                    quantity=item.quantity,
                    unit_price=float(unit),
                    total_price=float(line_total),
                )
            )
        delivery_fee = business_fees[business_index]
        platform_fee = _money(subtotal * Decimal(str(settings.PLATFORM_FEE_RATE)))
        total = _money(subtotal + delivery_fee)

        order = Order(
            order_number=_order_number(),
            customer_id=user.id,
            customer_name=f"{user.first_name} {user.last_name}",
            customer_email=user.email,
            business_id=business_id,
            business_name=business.name,
            subtotal=float(_money(subtotal)),
            delivery_fee=float(delivery_fee),
            discount=0,
            platform_fee=float(platform_fee),
            total=float(total),
            status="pending",
            payment_status="pending",
            payment_method="paystack",
            payment_reference=reference,
            payment_expires_at=datetime.now(timezone.utc)
            + timedelta(
                minutes=settings.PAYSTACK_PAYMENT_EXPIRY_MINUTES
            ),
            delivery_address=address,
            estimated_delivery=(
                "1–2 business days"
                if body.delivery_method == "express"
                else "3–5 business days"
            ),
            tracking_steps=[
                {"label": "Order placed", "completed": True, "date": datetime.now(timezone.utc).isoformat()},
                {"label": "Confirmed by seller", "completed": False},
                {"label": "Processing", "completed": False},
                {"label": "Shipped", "completed": False},
                {"label": "Delivered", "completed": False},
            ],
            items=order_items,
        )
        db.add(order)
        created.append(order)

    for product_id, quantity in requested_quantities.items():
        product = products[product_id]
        product.stock -= quantity
        if product.stock == 0:
            product.status = "out_of_stock"

    await db.flush()
    total = _money(sum((Decimal(str(order.total)) for order in created), Decimal("0")))
    try:
        payment_url = await initialize_transaction(
            settings=settings,
            reference=reference,
            amount_minor=int(total * 100),
            email=user.email,
            callback_url=(
                f"{settings.FRONTEND_URL.rstrip('/')}/checkout"
                f"?payment=return&reference={reference}"
            ),
        )
    except (httpx.HTTPError, ValueError) as error:
        logger.exception("Unable to initialize Paystack transaction")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Checkout could not be initialized. Please try again.",
        ) from error
    return PaystackCheckoutOut(
        payment_url=payment_url,
        reference=reference,
        total=float(total),
    )


@router.get("/payment/{reference}", response_model=PaymentStatusOut)
async def get_payment_status(
    reference: str,
    db: DbSession,
    user: CurrentUser,
):
    await expire_pending_payments(db)
    orders_result = await db.execute(
        select(Order)
        .where(Order.payment_reference == reference, Order.customer_id == user.id)
        .order_by(Order.created_at)
    )
    orders = list(orders_result.scalars().all())
    if not orders:
        raise HTTPException(status_code=404, detail="Payment not found")

    statuses = {order.payment_status for order in orders}
    if statuses == {"pending"}:
        if not settings.PAYSTACK_SECRET_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Paystack payment verification is not configured",
            )
        try:
            transaction = await verify_transaction(reference, settings)
        except (httpx.HTTPError, ValueError) as error:
            logger.exception("Unable to verify Paystack transaction")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment could not be verified. Please check again shortly.",
            ) from error

        expected_amount = sum(
            (Decimal(str(order.total)) for order in orders), Decimal("0")
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if (
            transaction.get("reference") != reference
            or transaction.get("currency") != "ZAR"
            or type(transaction.get("amount")) is not int
            or transaction["amount"] != int(expected_amount * 100)
        ):
            logger.warning("Paystack verification mismatch for reference %s", reference)
            raise HTTPException(
                status_code=400,
                detail="Payment reference, currency, or amount does not match the order",
            )

        if transaction.get("status") == "success":
            current_orders_result = await db.execute(
                select(Order)
                .where(
                    Order.payment_reference == reference,
                    Order.customer_id == user.id,
                )
                .order_by(Order.id)
                .with_for_update()
                .execution_options(populate_existing=True)
            )
            orders = list(current_orders_result.scalars().all())
            if not orders:
                raise HTTPException(status_code=404, detail="Payment not found")
            await confirm_orders_paid(db, orders, reference)
            statuses = {order.payment_status for order in orders}

    payment_status = "paid" if statuses == {"paid"} else (
        "failed" if statuses.intersection({"failed", "refunded"}) else "pending"
    )
    return PaymentStatusOut(
        reference=reference,
        status=payment_status,
        total=float(_money(sum((Decimal(str(o.total)) for o in orders), Decimal("0")))),
        order_numbers=[order.order_number for order in orders],
        delivery_address=orders[0].delivery_address,
        estimated_delivery=orders[0].estimated_delivery,
    )


@router.get("", response_model=list[OrderOut])
async def list_orders(
    db: DbSession,
    user: CurrentUser,
    status_filter: str | None = Query(None, alias="status"),
):
    stmt = select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc())

    if user.role == "customer":
        stmt = stmt.where(Order.customer_id == user.id)
    elif user.role == "seller":
        biz = (
            await db.execute(select(Business).where(Business.owner_id == user.id))
        ).scalar_one_or_none()
        if not biz:
            return []
        stmt = stmt.where(Order.business_id == biz.id)
    # admin sees all

    if status_filter:
        stmt = stmt.where(Order.status == status_filter)

    result = await db.execute(stmt)
    return [_order_out(o) for o in result.scalars().unique().all()]


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: str, db: DbSession, user: CurrentUser):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if user.role == "customer" and order.customer_id != user.id:
        raise HTTPException(status_code=403, detail="Not your order")
    if user.role == "seller":
        biz = (
            await db.execute(select(Business).where(Business.owner_id == user.id))
        ).scalar_one_or_none()
        if not biz or order.business_id != biz.id:
            raise HTTPException(status_code=403, detail="Not your order")

    return _order_out(order)


@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: str,
    body: OrderStatusUpdate,
    db: DbSession,
    user: User = Depends(require_roles("seller", "admin")),
):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if user.role == "seller":
        biz = (
            await db.execute(select(Business).where(Business.owner_id == user.id))
        ).scalar_one_or_none()
        if not biz or order.business_id != biz.id:
            raise HTTPException(status_code=403, detail="Not your order")

    allowed = {"pending", "confirmed", "processing", "shipped", "delivered", "cancelled"}
    if user.role == "seller":
        allowed -= {"delivered", "cancelled"}
        if order.status in {"delivered", "cancelled"}:
            raise HTTPException(
                status_code=409,
                detail="Customers control delivery confirmation and cancellation.",
            )
    if body.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {allowed}")
    if order.payment_status != "paid":
        raise HTTPException(status_code=409, detail="Order status cannot change before payment")

    previous_status = order.status
    order.status = body.status
    if previous_status != body.status:
        await create_notification(
            db,
            user_id=order.customer_id,
            title="Order update",
            message=f"Order {order.order_number} is now {body.status}.",
            notification_type="order",
            link="/account",
        )
    # update tracking steps roughly
    steps = list(order.tracking_steps or [])
    label_map = {
        "processing": "Processing",
        "shipped": "Shipped",
        "delivered": "Delivered",
    }
    if body.status in label_map:
        for step in steps:
            if step.get("label") == label_map[body.status]:
                step["completed"] = True
                step["date"] = datetime.now(timezone.utc).isoformat()
        order.tracking_steps = steps

    await db.flush()
    await db.refresh(order)
    return _order_out(order)


@router.post("/{order_id}/cancel", response_model=OrderOut)
async def cancel_customer_order(
    order_id: str,
    db: DbSession,
    user: User = Depends(require_roles("customer")),
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.customer_id == user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status in {"cancelled", "delivered"}:
        raise HTTPException(status_code=409, detail=f"Order is already {order.status}")

    if not _within_customer_cancellation_window(order.created_at):
        raise HTTPException(
            status_code=409,
            detail="Orders can only be cancelled within 24 hours of being placed.",
        )

    cancelled_orders = [order]
    if order.payment_status == "pending":
        if order.payment_reference:
            checkout_result = await db.execute(
                select(Order)
                .options(selectinload(Order.items))
                .where(Order.payment_reference == order.payment_reference)
                .order_by(Order.id)
                .with_for_update()
                .execution_options(populate_existing=True)
            )
            checkout_orders = list(checkout_result.scalars().unique().all())
            if any(checkout_order.payment_status != "pending" for checkout_order in checkout_orders):
                raise HTTPException(
                    status_code=409,
                    detail="This checkout is no longer awaiting payment.",
                )
            cancelled_orders = checkout_orders
        elif order.payment_status == "pending":
            cancelled_orders = [order]

        await _release_stock(db, cancelled_orders)
        order = next(item for item in cancelled_orders if item.id == order_id)
    elif order.payment_status == "paid":
        result = await db.execute(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.id == order_id, Order.customer_id == user.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status in {"cancelled", "delivered"}:
            raise HTTPException(status_code=409, detail=f"Order is already {order.status}")
        if not _within_customer_cancellation_window(order.created_at):
            raise HTTPException(
                status_code=409,
                detail="Orders can only be cancelled within 24 hours of being placed.",
            )
        cancelled_orders = [order]

    else:
        raise HTTPException(status_code=409, detail="This order can no longer be cancelled.")

    if order.payment_status == "paid":
        if order.status != "shipped":
            product_quantities: dict[str, int] = {}
            for item in order.items:
                if item.product_id:
                    product_quantities[item.product_id] = (
                        product_quantities.get(item.product_id, 0) + item.quantity
                    )
            if product_quantities:
                products_result = await db.execute(
                    select(Product)
                    .where(Product.id.in_(product_quantities))
                    .order_by(Product.id)
                    .with_for_update()
                )
                for product in products_result.scalars().all():
                    product.stock += product_quantities[product.id]
                    if product.stock > 0 and product.status == "out_of_stock":
                        product.status = "active"
        order.status = "cancelled"

    for cancelled_order in cancelled_orders:
        business = await db.get(Business, cancelled_order.business_id)
        if business and business.owner_id:
            payment_note = (
                " Payment was already received; arrange any refund manually."
                if cancelled_order.payment_status == "paid"
                else " The unpaid checkout was cancelled."
            )
            await create_notification(
                db,
                user_id=business.owner_id,
                title="Customer cancelled an order",
                message=f"Order {cancelled_order.order_number} was cancelled by the customer.{payment_note}",
                notification_type="order",
                link="/seller/orders",
            )
    await db.flush()
    await db.refresh(order)
    return _order_out(order)


@router.post("/{order_id}/confirm-delivery", response_model=OrderOut)
async def confirm_customer_delivery(
    order_id: str,
    db: DbSession,
    user: User = Depends(require_roles("customer")),
):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.customer_id == user.id)
        .with_for_update()
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_status != "paid":
        raise HTTPException(status_code=409, detail="Only paid orders can be confirmed as delivered")
    if order.status == "cancelled":
        raise HTTPException(status_code=409, detail="Cancelled orders cannot be marked delivered")
    if order.status == "delivered":
        raise HTTPException(status_code=409, detail="Order is already marked as delivered")

    order.status = "delivered"
    timestamp = datetime.now(timezone.utc).isoformat()
    steps = list(order.tracking_steps or [])
    delivered_step = next(
        (step for step in steps if step.get("label") == "Delivered"),
        None,
    )
    if delivered_step is None:
        steps.append({"label": "Delivered", "completed": True, "date": timestamp})
    else:
        delivered_step["completed"] = True
        delivered_step["date"] = timestamp
    order.tracking_steps = steps

    business = await db.get(Business, order.business_id)
    if business and business.owner_id:
        await create_notification(
            db,
            user_id=business.owner_id,
            title="Customer confirmed delivery",
            message=f"Order {order.order_number} was marked as delivered by the customer.",
            notification_type="order",
            link="/seller/orders",
        )
    await db.flush()
    await db.refresh(order)
    return _order_out(order)
