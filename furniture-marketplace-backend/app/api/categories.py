from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import DbSession
from app.models.entities import Category, Product
from app.schemas.product import CategoryOut

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
async def list_categories(db: DbSession):
    available_counts = (
        select(
            Product.category.label("name"),
            func.count(Product.id).label("product_count"),
        )
        .where(Product.status == "active", Product.stock > 0)
        .group_by(Product.category)
        .subquery()
    )
    result = await db.execute(
        select(Category, func.coalesce(available_counts.c.product_count, 0))
        .outerjoin(available_counts, Category.name == available_counts.c.name)
        .order_by(Category.name)
    )
    return [
        CategoryOut(
            id=c.id,
            name=c.name,
            slug=c.slug,
            image=c.image,
            product_count=product_count,
        )
        for c, product_count in result.all()
    ]
