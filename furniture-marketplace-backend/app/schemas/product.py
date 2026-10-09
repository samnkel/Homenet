from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ProductVariantOut(BaseModel):
    id: str
    name: str
    color: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None
    price: float
    sale_price: Optional[float] = Field(None, serialization_alias="salePrice")
    stock: int
    sku: str
    images: list[str] = []

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ProductBase(BaseModel):
    name: str
    description: str = ""
    category: str
    images: list[str] = []
    price: float
    sale_price: Optional[float] = Field(None, alias="salePrice")
    stock: int = 0
    sku: str
    material: str = ""
    dimensions: str = ""
    weight: str = ""
    warranty: str = ""
    assembly: str = ""
    care: str = ""
    delivery_estimate: str = Field("", alias="deliveryEstimate")
    colors: list[str] = []
    sizes: list[str] = []
    style: str = ""
    featured: bool = False
    new_arrival: bool = Field(False, alias="newArrival")
    status: str = "active"

    model_config = ConfigDict(populate_by_name=True)


class ProductCreate(ProductBase):
    business_id: Optional[str] = Field(None, alias="businessId")


class ProductBulkCreate(BaseModel):
    products: list[ProductCreate] = Field(..., min_length=1, max_length=100)

    model_config = ConfigDict(populate_by_name=True)


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    images: Optional[list[str]] = None
    price: Optional[float] = None
    sale_price: Optional[float] = Field(None, alias="salePrice")
    stock: Optional[int] = None
    material: Optional[str] = None
    dimensions: Optional[str] = None
    weight: Optional[str] = None
    warranty: Optional[str] = None
    assembly: Optional[str] = None
    care: Optional[str] = None
    delivery_estimate: Optional[str] = Field(None, alias="deliveryEstimate")
    colors: Optional[list[str]] = None
    sizes: Optional[list[str]] = None
    style: Optional[str] = None
    featured: Optional[bool] = None
    new_arrival: Optional[bool] = Field(None, alias="newArrival")
    status: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class ProductOut(BaseModel):
    id: str
    name: str
    slug: str
    description: str
    category: str
    business_id: str = Field(..., serialization_alias="businessId")
    business_name: str = Field(..., serialization_alias="businessName")
    images: list[str] = []
    price: float
    sale_price: Optional[float] = Field(None, serialization_alias="salePrice")
    rating: float
    review_count: int = Field(..., serialization_alias="reviewCount")
    stock: int
    sku: str
    material: str
    dimensions: str
    weight: str
    warranty: str
    assembly: str
    care: str
    delivery_estimate: str = Field(..., serialization_alias="deliveryEstimate")
    colors: list[str] = []
    sizes: list[str] = []
    style: str
    featured: bool = False
    new_arrival: bool = Field(False, serialization_alias="newArrival")
    status: str
    variants: list[ProductVariantOut] = []
    created_at: datetime = Field(..., serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ProductListResponse(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    page_size: int = Field(..., serialization_alias="pageSize")

    model_config = ConfigDict(populate_by_name=True)


class CategoryOut(BaseModel):
    id: str
    name: str
    slug: str
    image: Optional[str] = None
    product_count: int = Field(..., serialization_alias="productCount")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
