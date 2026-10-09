from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., alias="firstName")
    last_name: str = Field(..., alias="lastName")
    phone: Optional[str] = None
    avatar: Optional[str] = None
    role: str = "customer"

    model_config = ConfigDict(populate_by_name=True)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    first_name: str = Field(..., serialization_alias="firstName")
    last_name: str = Field(..., serialization_alias="lastName")
    phone: Optional[str] = None
    avatar: Optional[str] = None
    role: str
    must_change_password: bool = Field(False, serialization_alias="mustChangePassword")
    created_at: datetime = Field(..., serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AddressIn(BaseModel):
    label: str = "Home"
    first_name: Optional[str] = Field(None, alias="firstName")
    last_name: Optional[str] = Field(None, alias="lastName")
    phone: Optional[str] = None
    street: str
    suburb: str
    city: str
    province: str
    postal_code: str = Field(..., alias="postalCode")
    is_default: bool = Field(False, alias="isDefault")

    model_config = ConfigDict(populate_by_name=True)


class AddressOut(AddressIn):
    id: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
