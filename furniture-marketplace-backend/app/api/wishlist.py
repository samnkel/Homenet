from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.api.products import _product_out
from app.models.entities import Product, WishlistItem
from app.schemas.product import ProductOut

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=list[ProductOut])
async def list_wishlist(db: DbSession, user: CurrentUser):
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.user_id == user.id)
        .order_by(WishlistItem.created_at.desc())
    )
    items = result.scalars().all()
    if not items:
        return []

    product_ids = [i.product_id for i in items]
    prod_result = await db.execute(
        select(Product)
        .options(selectinload(Product.business), selectinload(Product.variants))
        .where(Product.id.in_(product_ids))
    )
    products = {p.id: p for p in prod_result.scalars().unique().all()}
    return [_product_out(products[i.product_id]) for i in items if i.product_id in products]


@router.post("/{product_id}", status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(product_id: str, db: DbSession, user: CurrentUser):
    prod = await db.execute(select(Product).where(Product.id == product_id))
    if not prod.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Product not found")

    existing = await db.execute(
        select(WishlistItem).where(
            WishlistItem.user_id == user.id, WishlistItem.product_id == product_id
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "Already in wishlist"}

    db.add(WishlistItem(user_id=user.id, product_id=product_id))
    await db.flush()
    return {"message": "Added to wishlist"}


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_wishlist(product_id: str, db: DbSession, user: CurrentUser):
    result = await db.execute(
        select(WishlistItem).where(
            WishlistItem.user_id == user.id, WishlistItem.product_id == product_id
        )
    )
    item = result.scalar_one_or_none()
    if item:
        await db.delete(item)
