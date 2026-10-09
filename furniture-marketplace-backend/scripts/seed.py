"""
Seed Supabase / Postgres with demo users, businesses, categories, and products.

Usage:
  cd furniture-marketplace-backend
  python -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  # set DATABASE_URL in .env
  python scripts/seed.py
"""

from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# allow importing app
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal, Base, engine
from app.models.entities import Business, Category, Product, User

DATA_DIR = Path(__file__).parent / "data"


def load_json(name: str):
    with open(DATA_DIR / name, encoding="utf-8") as f:
        return json.load(f)


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    products_data = load_json("products.json")
    businesses_data = load_json("businesses.json")
    categories_data = load_json("categories.json")

    async with AsyncSessionLocal() as db:
        # --- Demo users ---
        demo_users = [
            {
                "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
                "email": "admin@furnilocal.co.za",
                "password": "admin123",
                "first_name": "Admin",
                "last_name": "User",
                "role": "admin",
            },
            {
                "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
                "email": "seller@abcfurniture.co.za",
                "password": "seller123",
                "first_name": "Sipho",
                "last_name": "Ndlovu",
                "phone": "+27 31 555 0123",
                "role": "seller",
            },
            {
                "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
                "email": "customer@example.com",
                "password": "customer123",
                "first_name": "Thandi",
                "last_name": "Molefe",
                "phone": "+27 82 555 0100",
                "role": "customer",
            },
        ]

        # Map old owner ids (user-s1 … user-s10) → real UUIDs
        owner_map: dict[str, str] = {}
        seller_emails = [
            ("user-s1", "seller@abcfurniture.co.za", "Sipho", "Ndlovu", "+27 31 555 0123"),
            ("user-s2", "seller@capecraft.co.za", "Lindiwe", "Botha", "+27 21 555 0489"),
            ("user-s3", "seller@joziliving.co.za", "Kagiso", "Mokoena", "+27 11 555 0333"),
            ("user-s4", "seller@pretoriapines.co.za", "Anika", "van Wyk", "+27 12 555 0444"),
            ("user-s5", "seller@durbanloft.co.za", "Farah", "Patel", "+27 31 555 0555"),
            ("user-s6", "seller@stellenboschwood.co.za", "Pieter", "du Plessis", "+27 21 555 0666"),
            ("user-s7", "seller@sandtonstyle.co.za", "Nomsa", "Dlamini", "+27 11 555 0777"),
            ("user-s8", "seller@portelizabeth.co.za", "James", "Naidoo", "+27 41 555 0888"),
            ("user-s9", "seller@minimalhome.co.za", "Emma", "Clarke", "+27 21 555 0999"),
            ("user-s10", "seller@gardenstate.co.za", "Ravi", "Singh", "+27 11 555 0523"),
        ]

        # Admin + customer
        for u in demo_users:
            existing = await db.execute(select(User).where(User.email == u["email"]))
            if existing.scalar_one_or_none():
                continue
            db.add(
                User(
                    id=u["id"],
                    email=u["email"],
                    hashed_password=hash_password(u["password"]),
                    first_name=u["first_name"],
                    last_name=u["last_name"],
                    phone=u.get("phone"),
                    role=u["role"],
                )
            )
        await db.flush()

        # Sellers (reuse seller@abcfurniture for user-s1)
        for i, (old_id, email, first, last, phone) in enumerate(seller_emails):
            existing = await db.execute(select(User).where(User.email == email))
            row = existing.scalar_one_or_none()
            if row:
                owner_map[old_id] = row.id
                continue
            uid = f"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb{i+1:02d}"
            user = User(
                id=uid,
                email=email,
                hashed_password=hash_password("seller123"),
                first_name=first,
                last_name=last,
                phone=phone,
                role="seller",
            )
            db.add(user)
            owner_map[old_id] = uid
        await db.flush()

        # Ensure user-s1 points to the main demo seller
        main_seller = (
            await db.execute(select(User).where(User.email == "seller@abcfurniture.co.za"))
        ).scalar_one()
        owner_map["user-s1"] = main_seller.id

        # --- Categories ---
        for c in categories_data:
            existing = await db.execute(select(Category).where(Category.slug == c["slug"]))
            if existing.scalar_one_or_none():
                continue
            db.add(
                Category(
                    name=c["name"],
                    slug=c["slug"],
                    image=c.get("image"),
                    product_count=c.get("productCount", 0),
                )
            )
        await db.flush()

        # --- Businesses ---
        # Map old biz-001 ids → keep same string ids if valid UUID, else generate stable ones
        biz_id_map: dict[str, str] = {}
        for b in businesses_data:
            old_id = b["id"]
            # Use deterministic UUID-like ids from old ids
            stable_id = f"cccccccc-cccc-cccc-cccc-ccccccc{old_id.replace('biz-', '').zfill(5)}"
            existing = await db.execute(select(Business).where(Business.slug == b["slug"]))
            row = existing.scalar_one_or_none()
            if row:
                biz_id_map[old_id] = row.id
                continue
            owner_id = owner_map.get(b.get("ownerId"), main_seller.id)
            loc = b.get("location") or {}
            joined = b.get("joinedAt")
            joined_at = None
            if joined:
                try:
                    joined_at = datetime.fromisoformat(joined).replace(tzinfo=timezone.utc)
                except ValueError:
                    joined_at = datetime.now(timezone.utc)

            business = Business(
                id=stable_id,
                name=b["name"],
                slug=b["slug"],
                owner_id=owner_id,
                description=b.get("description", ""),
                logo=b.get("logo"),
                cover_image=b.get("coverImage"),
                rating=b.get("rating", 0),
                review_count=b.get("reviewCount", 0),
                product_count=b.get("productCount", 0),
                city=loc.get("city", ""),
                suburb=loc.get("suburb", ""),
                address=loc.get("address", ""),
                lat=loc.get("lat"),
                lng=loc.get("lng"),
                verified=b.get("verified", False),
                status=b.get("status", "pending"),
                delivery_available=b.get("deliveryAvailable", True),
                delivery_areas=b.get("deliveryAreas") or [],
                opening_hours=b.get("openingHours") or [],
                phone=b.get("phone", ""),
                email=b.get("email", ""),
                response_time=b.get("responseTime", ""),
                joined_at=joined_at or datetime.now(timezone.utc),
            )
            db.add(business)
            biz_id_map[old_id] = stable_id
        await db.flush()

        # --- Products ---
        for p in products_data:
            existing = await db.execute(select(Product).where(Product.sku == p["sku"]))
            if existing.scalar_one_or_none():
                continue
            old_biz = p.get("businessId")
            business_id = biz_id_map.get(old_biz)
            if not business_id:
                print(f"  skip product {p['sku']}: unknown business {old_biz}")
                continue
            created = p.get("createdAt")
            created_at = None
            if created:
                try:
                    created_at = datetime.fromisoformat(created).replace(tzinfo=timezone.utc)
                except ValueError:
                    pass

            product = Product(
                name=p["name"],
                slug=p["slug"],
                description=p.get("description", ""),
                category=p["category"],
                business_id=business_id,
                images=p.get("images") or [],
                price=float(p["price"]),
                sale_price=float(p["salePrice"]) if p.get("salePrice") is not None else None,
                rating=float(p.get("rating") or 0),
                review_count=int(p.get("reviewCount") or 0),
                stock=int(p.get("stock") or 0),
                sku=p["sku"],
                material=p.get("material", ""),
                dimensions=p.get("dimensions", ""),
                weight=p.get("weight", ""),
                warranty=p.get("warranty", ""),
                assembly=p.get("assembly", ""),
                care=p.get("care", ""),
                delivery_estimate=p.get("deliveryEstimate", ""),
                colors=p.get("colors") or [],
                sizes=p.get("sizes") or [],
                style=p.get("style", ""),
                featured=bool(p.get("featured")),
                new_arrival=bool(p.get("newArrival")),
                status=p.get("status", "active"),
            )
            if created_at:
                product.created_at = created_at
            db.add(product)

        await db.commit()
        print("Seed complete.")
        print("Demo accounts:")
        print("  Admin:    admin@furnilocal.co.za / admin123")
        print("  Seller:   seller@abcfurniture.co.za / seller123")
        print("  Customer: customer@example.com / customer123")
        print("  (Other sellers use password: seller123)")


if __name__ == "__main__":
    asyncio.run(seed())
