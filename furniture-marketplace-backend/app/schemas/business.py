from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class LocationOut(BaseModel):
    city: str
    suburb: str
    address: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class BusinessCreate(BaseModel):
    name: str
    description: str = ""
    logo: Optional[str] = None
    cover_image: Optional[str] = Field(None, alias="coverImage")
    city: str
    suburb: str
    address: str
    phone: str = ""
    email: str = ""
    delivery_available: bool = Field(True, alias="deliveryAvailable")
    delivery_areas: list[str] = Field(default_factory=list, alias="deliveryAreas")
    opening_hours: list[dict[str, Any]] = Field(default_factory=list, alias="openingHours")

    model_config = ConfigDict(populate_by_name=True)


class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo: Optional[str] = None
    cover_image: Optional[str] = Field(None, alias="coverImage")
    city: Optional[str] = None
    suburb: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    verified: Optional[bool] = None
    delivery_available: Optional[bool] = Field(None, alias="deliveryAvailable")
    delivery_areas: Optional[list[str]] = Field(None, alias="deliveryAreas")
    opening_hours: Optional[list[dict[str, Any]]] = Field(None, alias="openingHours")

    model_config = ConfigDict(populate_by_name=True)


class BusinessOut(BaseModel):
    id: str
    name: str
    slug: str
    owner_id: str = Field(..., serialization_alias="ownerId")
    owner_name: Optional[str] = Field(None, serialization_alias="ownerName")
    description: str
    logo: Optional[str] = None
    cover_image: Optional[str] = Field(None, serialization_alias="coverImage")
    rating: float
    review_count: int = Field(..., serialization_alias="reviewCount")
    product_count: int = Field(..., serialization_alias="productCount")
    location: LocationOut
    verified: bool
    status: str
    delivery_available: bool = Field(..., serialization_alias="deliveryAvailable")
    delivery_areas: list[str] = Field(default_factory=list, serialization_alias="deliveryAreas")
    opening_hours: list[dict[str, Any]] = Field(default_factory=list, serialization_alias="openingHours")
    phone: str
    email: str
    response_time: str = Field(..., serialization_alias="responseTime")
    joined_at: datetime = Field(..., serialization_alias="joinedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
