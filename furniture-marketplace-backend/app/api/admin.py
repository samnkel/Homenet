import logging
import smtplib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import selectinload

from app.api.businesses import _business_out, _slugify
from app.api.deps import CurrentUser, DbSession, require_roles
from app.core.config import get_settings
from app.core.email import send_email
from app.core.security import hash_password
from app.models.entities import (
    Address,
    Business,
    Conversation,
    Message,
    Notification,
    Order,
    OrderItem,
    PasswordResetToken,
    Product,
    Promotion,
    Review,
    User,
    WishlistItem,
)
from app.schemas.business import BusinessOut

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)
settings = get_settings()


class EnrollSellerRequest(BaseModel):
    email: EmailStr
    first_name: str = Field(..., alias="firstName")
    last_name: str = Field(..., alias="lastName")
    phone: str | None = None
    business_name: str = Field(..., alias="businessName")
    description: str = ""
    city: str
    suburb: str
    address: str
    business_phone: str = Field("", alias="businessPhone")
    business_email: str | None = Field(None, alias="businessEmail")
    delivery_areas: list[str] = Field(default_factory=list, alias="deliveryAreas")
    temporary_password: str = Field(
        ..., alias="temporaryPassword", min_length=12, max_length=128
    )

    model_config = {"populate_by_name": True}


class DashboardStats(BaseModel):
    total_users: int
    total_sellers: int
    total_products: int
    total_orders: int
    orders_today: int
    platform_commission_earned: float
    revenue_today: float
    total_revenue: float


@router.get("/stats", response_model=DashboardStats)
async def admin_stats(
    db: DbSession,
    user: User = Depends(require_roles("admin")),
):
    from datetime import datetime, timezone

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    total_sellers = (
        await db.execute(select(func.count()).select_from(User).where(User.role == "seller"))
    ).scalar() or 0
    total_products = (await db.execute(select(func.count()).select_from(Product))).scalar() or 0
    total_orders = (await db.execute(select(func.count()).select_from(Order))).scalar() or 0
    orders_today = (
        await db.execute(
            select(func.count()).select_from(Order).where(Order.created_at >= today_start)
        )
    ).scalar() or 0

    fees = (
        await db.execute(
            select(func.coalesce(func.sum(Order.platform_fee), 0)).where(
                Order.payment_status == "paid"
            )
        )
    ).scalar() or 0
    revenue_today = (
        await db.execute(
            select(func.coalesce(func.sum(Order.total), 0)).where(
                Order.created_at >= today_start,
                Order.payment_status == "paid",
            )
        )
    ).scalar() or 0
    total_revenue = (
        await db.execute(
            select(func.coalesce(func.sum(Order.total), 0)).where(
                Order.payment_status == "paid"
            )
        )
    ).scalar() or 0

    return DashboardStats(
        total_users=total_users,
        total_sellers=total_sellers,
        total_products=total_products,
        total_orders=total_orders,
        orders_today=orders_today,
        platform_commission_earned=float(fees),
        revenue_today=float(revenue_today),
        total_revenue=float(total_revenue),
    )


@router.post("/enroll-seller", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
async def enroll_seller(
    body: EnrollSellerRequest,
    db: DbSession,
    user: User = Depends(require_roles("admin")),
):
    existing = await db.execute(select(User).where(User.email == body.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    seller = User(
        email=body.email.lower(),
        hashed_password=hash_password(body.temporary_password),
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        role="seller",
        must_change_password=True,
        temporary_password_expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(seller)
    await db.flush()

    slug = _slugify(body.business_name)
    # ensure unique slug
    slug_check = await db.execute(select(Business).where(Business.slug == slug))
    if slug_check.scalar_one_or_none():
        slug = f"{slug}-{seller.id[:8]}"

    business = Business(
        name=body.business_name,
        slug=slug,
        owner_id=seller.id,
        description=body.description,
        city=body.city,
        suburb=body.suburb,
        address=body.address,
        phone=body.business_phone or body.phone or "",
        email=body.business_email or body.email,
        delivery_areas=body.delivery_areas,
        verified=True,
        status="verified",
        response_time="Usually replies within a few hours",
    )
    db.add(business)
    await db.flush()
    await db.refresh(business)

    result = await db.execute(
        select(Business).options(selectinload(Business.owner)).where(Business.id == business.id)
    )
    b = result.scalar_one()

    try:
        await send_email(
            seller.email,
            "Your Home-farry & Co seller account",
            (
                f"Hello {seller.first_name},\n\n"
                "An administrator created your Home-farry & Co seller account.\n"
                f"Sign in at {settings.FRONTEND_URL.rstrip('/')}/login with this temporary "
                f"password: {body.temporary_password}\n\n"
                "You must choose a new password after signing in. This temporary password "
                "expires in 24 hours."
            ),
        )
    except (OSError, RuntimeError, smtplib.SMTPException) as error:
        logger.exception("Unable to send seller enrollment email")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Seller invitation email could not be sent. Check the Gmail SMTP configuration.",
        ) from error

    return _business_out(b, owner_name=f"{seller.first_name} {seller.last_name}")


@router.patch("/businesses/{business_id}/status")
async def set_business_status(
    business_id: str,
    status_value: str,
    db: DbSession,
    user: User = Depends(require_roles("admin")),
):
    if status_value not in ("pending", "verified", "suspended", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status")
    result = await db.execute(select(Business).where(Business.id == business_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Business not found")
    b.status = status_value
    b.verified = status_value == "verified"
    await db.flush()
    return {"id": b.id, "status": b.status, "verified": b.verified}


@router.delete(
    "/businesses/{business_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_seller_permanently(
    business_id: str,
    db: DbSession,
    user: User = Depends(require_roles("admin")),
):
    business = await db.get(Business, business_id)
    if not business or business.status == "deleted" or not business.owner_id:
        raise HTTPException(status_code=404, detail="Seller not found")

    seller = await db.get(User, business.owner_id)
    if not seller or seller.role != "seller":
        raise HTTPException(status_code=404, detail="Seller account not found")

    product_ids = list(
        (
            await db.execute(
                select(Product.id).where(Product.business_id == business.id)
            )
        ).scalars().all()
    )
    conversation_ids = list(
        (
            await db.execute(
                select(Conversation.id).where(
                    or_(
                        Conversation.participants.contains([seller.id]),
                        Conversation.product_id.in_(product_ids)
                        if product_ids
                        else False,
                    )
                )
            )
        ).scalars().all()
    )

    if conversation_ids:
        await db.execute(
            delete(Message).where(Message.conversation_id.in_(conversation_ids))
        )
    await db.execute(delete(Message).where(Message.sender_id == seller.id))
    if conversation_ids:
        await db.execute(
            delete(Conversation).where(Conversation.id.in_(conversation_ids))
        )

    await db.execute(
        delete(Review).where(
            or_(
                Review.business_id == business.id,
                Review.customer_id == seller.id,
                Review.product_id.in_(product_ids) if product_ids else False,
            )
        )
    )
    await db.execute(delete(Promotion).where(Promotion.business_id == business.id))
    await db.execute(delete(WishlistItem).where(WishlistItem.user_id == seller.id))
    if product_ids:
        await db.execute(
            update(OrderItem)
            .where(OrderItem.product_id.in_(product_ids))
            .values(product_id=None)
        )
        await db.execute(
            delete(WishlistItem).where(WishlistItem.product_id.in_(product_ids))
        )
        await db.execute(delete(Product).where(Product.id.in_(product_ids)))

    await db.execute(
        update(Order)
        .where(Order.customer_id == seller.id)
        .values(
            customer_id=None,
            customer_name="Deleted account",
            customer_email="",
            delivery_address={},
        )
    )
    await db.execute(
        delete(Address).where(Address.user_id == seller.id)
    )
    await db.execute(
        delete(PasswordResetToken).where(PasswordResetToken.user_id == seller.id)
    )
    await db.execute(delete(Notification).where(Notification.user_id == seller.id))

    business.owner_id = None
    business.name = "Deleted seller"
    business.slug = f"deleted-seller-{business.id}"
    business.description = ""
    business.logo = None
    business.cover_image = None
    business.rating = 0
    business.review_count = 0
    business.product_count = 0
    business.city = ""
    business.suburb = ""
    business.address = ""
    business.verified = False
    business.status = "deleted"
    business.delivery_available = False
    business.delivery_areas = []
    business.opening_hours = []
    business.phone = ""
    business.email = ""
    business.response_time = ""

    await db.delete(seller)
    await db.flush()
