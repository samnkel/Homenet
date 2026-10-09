from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class StartConversationIn(BaseModel):
    product_id: str = Field(..., alias="productId")
    content: str = Field(..., min_length=1, max_length=4000)

    model_config = ConfigDict(populate_by_name=True)


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class MessageOut(BaseModel):
    id: str
    conversation_id: str = Field(..., serialization_alias="conversationId")
    sender_id: str = Field(..., serialization_alias="senderId")
    sender_name: str = Field(..., serialization_alias="senderName")
    sender_role: Literal["customer", "seller", "admin"] = Field(
        ..., serialization_alias="senderRole"
    )
    content: str
    product_id: Optional[str] = Field(None, serialization_alias="productId")
    created_at: datetime = Field(..., serialization_alias="createdAt")
    read: bool

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ConversationOut(BaseModel):
    id: str
    product_id: Optional[str] = Field(None, serialization_alias="productId")
    product_name: str = Field("", serialization_alias="productName")
    other_participant_name: str = Field(..., serialization_alias="otherParticipantName")
    other_participant_role: str = Field(..., serialization_alias="otherParticipantRole")
    last_message: str = Field(..., serialization_alias="lastMessage")
    last_message_at: Optional[datetime] = Field(
        None, serialization_alias="lastMessageAt"
    )
    unread_count: int = Field(..., serialization_alias="unreadCount")

    model_config = ConfigDict(populate_by_name=True)


class NotificationOut(BaseModel):
    id: str
    title: str
    message: str
    type: Literal["order", "message", "system", "promotion"]
    read: bool
    link: Optional[str] = None
    created_at: datetime = Field(..., serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
