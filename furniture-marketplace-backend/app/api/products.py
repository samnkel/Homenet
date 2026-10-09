from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession, require_roles
from app.models.entities import Business, OrderItem, Product, User, WishlistItem
from app.schemas.product import (
    ProductBulkCreate,
    ProductCreate,
    ProductListResponse,
    ProductOut,
    ProductUpdate,
)

router = APIRouter(prefix="/products", tags=["products"])


def _slugify(text: str) -> str:
    import re

    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s[:200]


def _product_out(p: Product) -> ProductOut:
    data = {
        "id": p.id,
        "name": p.name,
        "slug": p.slug,
        "description": p.description,
        "category": p.category,
        "business_id": p.business_id,
        "business_name": p.business.name if p.business else "",
        "images": p.images or [],
        "price": p.price,
        "sale_price": p.sale_price,
        "rating": p.rating,
        "review_count": p.review_count,
        "stock": p.stock,
        "sku": p.sku,
        "material": p.material,
        "dimensions": p.dimensions,
        "weight": p.weight,
        "warranty": p.warranty,
        "assembly": p.assembly,
        "care": p.care,
        "delivery_estimate": p.delivery_estimate,
        "colors": p.colors or [],
        "sizes": p.sizes or [],
        "style": p.style,
        "featured": p.featured,
        "new_arrival": p.new_arrival,
        "status": p.status,
        "variants": p.variants or [],
        "created_at": p.created_at,
    }
    return ProductOut.model_validate(data)


def _new_product(body: ProductCreate, business_id: str) -> Product:
    return Product(
        name=body.name,
        slug=_slugify(body.name),
        description=body.description,
        category=body.category,
        business_id=business_id,
        images=body.images,
        price=body.price,
        sale_price=body.sale_price,
        stock=body.stock,
        sku=body.sku.strip(),
        material=body.material,
        dimensions=body.dimensions,
        weight=body.weight,
        warranty=body.warranty,
        assembly=body.assembly,
        care=body.care,
        delivery_estimate=body.delivery_estimate,
        colors=body.colors,
        sizes=body.sizes,
        style=body.style,
        featured=body.featured,
        new_arrival=body.new_arrival,
        status=body.status,
    )


@router.get("", response_model=ProductListResponse)
async def list_products(
    db: DbSession,
    q: str | None = None,
    category: str | None = None,
    business_id: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    featured: bool | None = None,
    status_filter: str | None = Query("active", alias="status"),
    include_archived: bool = Query(False, alias="includeArchived"),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100, alias="pageSize"),
):
    stmt = select(Product).options(selectinload(Product.business), selectinload(Product.variants))
    count_stmt = select(func.count()).select_from(Product)

    filters = []
    if status_filter:
        filters.append(Product.status == status_filter)
    elif not include_archived:
        filters.append(Product.status != "archived")
    if category:
        filters.append(Product.category == category)
    if business_id:
        filters.append(Product.business_id == business_id)
    if featured is not None:
        filters.append(Product.featured == featured)
    if min_price is not None:
        filters.append(Product.price >= min_price)
    if max_price is not None:
        filters.append(Product.price <= max_price)
    if q:
        like = f"%{q}%"
        filters.append(
            or_(
                Product.name.ilike(like),
                Product.description.ilike(like),
                Product.sku.ilike(like),
                Product.style.ilike(like),
            )
        )

    for f in filters:
        stmt = stmt.where(f)
        count_stmt = count_stmt.where(f)

    total = (await db.execute(count_stmt)).scalar() or 0
    stmt = stmt.order_by(Product.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    products = result.scalars().unique().all()

    return ProductListResponse(
        items=[_product_out(p) for p in products],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: str, db: DbSession):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.business), selectinload(Product.variants))
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return _product_out(product)


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    body: ProductCreate,
    db: DbSession,
    user: User = Depends(require_roles("seller", "admin")),
):
    business_id = body.business_id
    if user.role == "seller":
        biz_result = await db.execute(select(Business).where(Business.owner_id == user.id))
        biz = biz_result.scalar_one_or_none()
        if not biz:
            raise HTTPException(status_code=400, detail="Seller has no business profile")
        business_id = biz.id
    elif not business_id:
        raise HTTPException(status_code=400, detail="businessId is required for admin")

    biz_check = await db.execute(select(Business).where(Business.id == business_id))
    business = biz_check.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    product = _new_product(body, business_id)
    db.add(product)
    business.product_count = (business.product_count or 0) + 1
    await db.flush()
    await db.refresh(product)
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.business), selectinload(Product.variants))
        .where(Product.id == product.id)
    )
    return _product_out(result.scalar_one())


@router.post("/bulk", response_model=list[ProductOut], status_code=status.HTTP_201_CREATED)
async def create_products_bulk(
    body: ProductBulkCreate,
    db: DbSession,
    user: User = Depends(require_roles("seller", "admin")),
):
    business_id: str | None = None
    if user.role == "seller":
        business_id = await db.scalar(
            select(Business.id).where(Business.owner_id == user.id)
        )
        if not business_id:
            raise HTTPException(status_code=400, detail="Seller has no business profile")

    skus = [product.sku.strip() for product in body.products]
    if any(not sku for sku in skus):
        raise HTTPException(status_code=422, detail="Every product must have a SKU")
    for index, product in enumerate(body.products, start=1):
        if product.price < 0 or product.stock < 0:
            raise HTTPException(
                status_code=422,
                detail=f"Product row {index}: price and stock cannot be negative",
            )
        if product.sale_price is not None and (
            product.sale_price < 0 or product.sale_price > product.price
        ):
            raise HTTPException(
                status_code=422,
                detail=f"Product row {index}: sale price must be between zero and price",
            )
    duplicate_skus = sorted({sku for sku in skus if skus.count(sku) > 1})
    if duplicate_skus:
        raise HTTPException(
            status_code=409,
            detail=f"Duplicate SKUs in CSV: {', '.join(duplicate_skus)}",
        )
    existing_skus = set(
        (
            await db.execute(select(Product.sku).where(Product.sku.in_(skus)))
        ).scalars().all()
    )
    if existing_skus:
        raise HTTPException(
            status_code=409,
            detail=f"These SKUs already exist: {', '.join(sorted(existing_skus))}",
        )

    if user.role == "admin":
        business_ids = {product.business_id for product in body.products}
        if len(business_ids) != 1 or None in business_ids:
            raise HTTPException(
                status_code=422,
                detail="Bulk products for an admin must all have the same businessId",
            )
        business_id = next(iter(business_ids))

    business = await db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    products = [_new_product(product, business.id) for product in body.products]
    db.add_all(products)
    business.product_count = (business.product_count or 0) + len(products)
    await db.flush()

    result = await db.execute(
        select(Product)
        .options(selectinload(Product.business), selectinload(Product.variants))
        .where(Product.id.in_([product.id for product in products]))
        .order_by(Product.created_at.desc())
    )
    return [_product_out(product) for product in result.scalars().unique().all()]


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str,
    body: ProductUpdate,
    db: DbSession,
    user: CurrentUser,
):
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.business), selectinload(Product.variants))
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    business = product.business
    if user.role == "seller":
        if not business or business.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Not your product")
    elif user.role != "admin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    updates = body.model_dump(exclude_unset=True, by_alias=False)
    # map aliases back to column names
    field_map = {
        "sale_price": "sale_price",
        "delivery_estimate": "delivery_estimate",
        "new_arrival": "new_arrival",
    }
    for key, value in updates.items():
        col = field_map.get(key, key)
        if hasattr(product, col):
            setattr(product, col, value)

    await db.flush()
    await db.refresh(product)
    return _product_out(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: str, db: DbSession, user: CurrentUser):
    result = await db.execute(
        select(Product).options(selectinload(Product.business)).where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if user.role == "seller":
        if not product.business or product.business.owner_id != user.id:
            raise HTTPException(status_code=403, detail="Not your product")
    elif user.role != "admin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    has_order_history = await db.scalar(
        select(OrderItem.id).where(OrderItem.product_id == product.id).limit(1)
    )
    await db.execute(
        delete(WishlistItem).where(WishlistItem.product_id == product.id)
    )

    if has_order_history:
        product.status = "archived"
        product.stock = 0
    else:
        await db.delete(product)

    if business:
        business.product_count = max(0, business.product_count - 1)
