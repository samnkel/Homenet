from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, require_roles
from app.models.entities import Business, User
from app.schemas.business import BusinessCreate, BusinessOut, BusinessUpdate

router = APIRouter(prefix="/businesses", tags=["businesses"])


def _slugify(text: str) -> str:
    import re

    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s[:200]


def _business_out(b: Business, owner_name: str | None = None) -> BusinessOut:
    return BusinessOut(
        id=b.id,
        name=b.name,
        slug=b.slug,
        owner_id=b.owner_id,
        owner_name=owner_name,
        description=b.description,
        logo=b.logo,
        cover_image=b.cover_image,
        rating=b.rating,
        review_count=b.review_count,
        product_count=b.product_count,
        location={
            "city": b.city,
            "suburb": b.suburb,
            "address": b.address,
            "lat": b.lat,
            "lng": b.lng,
        },
        verified=b.verified,
        status=b.status,
        delivery_available=b.delivery_available,
        delivery_areas=b.delivery_areas or [],
        opening_hours=b.opening_hours or [],
        phone=b.phone,
        email=b.email,
        response_time=b.response_time,
        joined_at=b.joined_at,
    )


@router.get("", response_model=list[BusinessOut])
async def list_businesses(
    db: DbSession,
    status_filter: str | None = Query(None, alias="status"),
    city: str | None = None,
):
    stmt = (
        select(Business)
        .options(selectinload(Business.owner))
        .where(Business.status != "deleted")
    )
    if status_filter:
        stmt = stmt.where(Business.status == status_filter)
    if city:
        stmt = stmt.where(Business.city.ilike(f"%{city}%"))
    stmt = stmt.order_by(Business.name)
    result = await db.execute(stmt)
    businesses = result.scalars().all()
    return [
        _business_out(
            b,
            owner_name=f"{b.owner.first_name} {b.owner.last_name}" if b.owner else None,
        )
        for b in businesses
    ]


@router.get("/me/mine", response_model=BusinessOut | None)
async def my_business(db: DbSession, user: User = Depends(require_roles("seller", "admin"))):
    result = await db.execute(
        select(Business).options(selectinload(Business.owner)).where(Business.owner_id == user.id)
    )
    b = result.scalar_one_or_none()
    if not b:
        return None
    return _business_out(
        b, owner_name=f"{b.owner.first_name} {b.owner.last_name}" if b.owner else None
    )


@router.get("/{business_id}", response_model=BusinessOut)
async def get_business(business_id: str, db: DbSession):
    try:
        parsed_id = str(UUID(business_id))
    except ValueError:
        parsed_id = None

    stmt = select(Business).options(selectinload(Business.owner))
    if parsed_id:
        stmt = stmt.where(Business.id == parsed_id, Business.status != "deleted")
        result = await db.execute(stmt)
        b = result.scalar_one_or_none()
    else:
        b = None

    if not b:
        result = await db.execute(
            select(Business)
            .options(selectinload(Business.owner))
            .where(Business.slug == business_id, Business.status != "deleted")
        )
        b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Business not found")
    return _business_out(
        b, owner_name=f"{b.owner.first_name} {b.owner.last_name}" if b.owner else None
    )


@router.post("", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
async def create_business(
    body: BusinessCreate,
    db: DbSession,
    user: User = Depends(require_roles("admin")),
):
    raise HTTPException(
        status_code=400,
        detail="Use POST /admin/enroll-seller to create seller + business together",
    )


@router.patch("/{business_id}", response_model=BusinessOut)
async def update_business(
    business_id: str,
    body: BusinessUpdate,
    db: DbSession,
    user: CurrentUser,
):
    result = await db.execute(
        select(Business).options(selectinload(Business.owner)).where(Business.id == business_id)
    )
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Business not found")

    if user.role == "seller" and b.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your business")
    if user.role not in ("seller", "admin"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    data = body.model_dump(exclude_unset=True, by_alias=False)
    if user.role != "admin":
        data.pop("status", None)
        data.pop("verified", None)

    for key, value in data.items():
        if hasattr(b, key):
            setattr(b, key, value)

    await db.flush()
    await db.refresh(b)
    return _business_out(
        b, owner_name=f"{b.owner.first_name} {b.owner.last_name}" if b.owner else None
    )
