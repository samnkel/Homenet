from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import AddressIn


class OrderItemIn(BaseModel):
    product_id: UUID = Field(..., alias="productId")
    quantity: int = Field(..., ge=1)
    variant: Optional[str] = None
    selected_color: Optional[str] = Field(None, alias="selectedColor")
    selected_size: Optional[str] = Field(None, alias="selectedSize")

    model_config = ConfigDict(populate_by_name=True)


class OrderCreate(BaseModel):
    items: list[OrderItemIn] = Field(..., min_length=1)
    delivery_address: AddressIn = Field(..., alias="deliveryAddress")
    delivery_method: Literal["standard", "express"] = Field(
        "standard", alias="deliveryMethod"
    )

    model_config = ConfigDict(populate_by_name=True)


class PaystackCheckoutOut(BaseModel):
    payment_url: str = Field(..., serialization_alias="paymentUrl")
    reference: str
    total: float

    model_config = ConfigDict(populate_by_name=True)


class PaymentStatusOut(BaseModel):
    reference: str
    status: Literal["pending", "paid", "failed"]
    total: float
    order_numbers: list[str] = Field(..., serialization_alias="orderNumbers")
    delivery_address: dict[str, Any] = Field(..., serialization_alias="deliveryAddress")
    estimated_delivery: Optional[str] = Field(
        None, serialization_alias="estimatedDelivery"
    )

    model_config = ConfigDict(populate_by_name=True)


class OrderItemOut(BaseModel):
    id: str
    product_id: Optional[str] = Field(None, serialization_alias="productId")
    product_name: str = Field(..., serialization_alias="productName")
    product_image: Optional[str] = Field(None, serialization_alias="productImage")
    sku: str
    variant: Optional[str] = None
    quantity: int
    unit_price: float = Field(..., serialization_alias="unitPrice")
    total_price: float = Field(..., serialization_alias="totalPrice")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class OrderOut(BaseModel):
    id: str
    order_number: str = Field(..., serialization_alias="orderNumber")
    customer_id: Optional[str] = Field(None, serialization_alias="customerId")
    customer_name: str = Field(..., serialization_alias="customerName")
    customer_email: str = Field(..., serialization_alias="customerEmail")
    business_id: str = Field(..., serialization_alias="businessId")
    business_name: str = Field(..., serialization_alias="businessName")
    items: list[OrderItemOut]
    subtotal: float
    delivery_fee: float = Field(..., serialization_alias="deliveryFee")
    discount: float
    platform_fee: float = Field(..., serialization_alias="platformFee")
    total: float
    status: str
    payment_status: str = Field(..., serialization_alias="paymentStatus")
    payment_method: str = Field(..., serialization_alias="paymentMethod")
    delivery_address: dict[str, Any] = Field(..., serialization_alias="deliveryAddress")
    estimated_delivery: Optional[str] = Field(None, serialization_alias="estimatedDelivery")
    tracking_steps: list[dict[str, Any]] = Field(default_factory=list, serialization_alias="trackingSteps")
    created_at: datetime = Field(..., serialization_alias="createdAt")
    updated_at: datetime = Field(..., serialization_alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class OrderStatusUpdate(BaseModel):
    status: str
