from datetime import datetime, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update

from app.api.deps import CurrentUser, DbSession, require_roles
from app.models.entities import (
    Business,
    Conversation,
    Message,
    Notification,
    Product,
    User,
)
from app.schemas.messaging import (
    ConversationOut,
    MessageCreate,
    MessageOut,
    NotificationOut,
    StartConversationIn,
)

router = APIRouter(tags=["messages"])


async def create_notification(
    db: DbSession,
    *,
    user_id: str,
    title: str,
    message: str,
    notification_type: str,
    link: str | None = None,
) -> None:
    db.add(
        Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            link=link,
        )
    )


def _message_link(conversation_id: str, role: str) -> str:
    path = "/seller/messages" if role == "seller" else "/messages"
    return f"{path}?{urlencode({'conversationId': conversation_id})}"


def _message_out(message: Message) -> MessageOut:
    return MessageOut.model_validate(message)


async def _get_conversation_for_user(
    db: DbSession, conversation_id: str, user_id: str
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.participants.contains([user_id]),
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post(
    "/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def start_conversation(
    body: StartConversationIn,
    db: DbSession,
    user: User = Depends(require_roles("customer")),
):
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="Message cannot be empty")
    product_result = await db.execute(
        select(Product, Business, User)
        .join(Business, Product.business_id == Business.id)
        .join(User, Business.owner_id == User.id)
        .where(Product.id == body.product_id, Product.status == "active")
    )
    product_row = product_result.one_or_none()
    if not product_row:
        raise HTTPException(status_code=404, detail="Product or seller not found")
    product, business, seller = product_row
    if seller.id == user.id or not seller.is_active:
        raise HTTPException(status_code=400, detail="This seller cannot receive messages")

    participant_ids = [user.id, seller.id]
    conversation_result = await db.execute(
        select(Conversation)
        .where(
            Conversation.product_id == product.id,
            Conversation.participants.contains(participant_ids),
        )
        .order_by(Conversation.created_at.desc())
        .limit(1)
    )
    conversation = conversation_result.scalar_one_or_none()
    if not conversation:
        conversation = Conversation(
            participants=participant_ids,
            product_id=product.id,
            last_message=content,
            last_message_at=datetime.now(timezone.utc),
        )
        db.add(conversation)
        await db.flush()
    else:
        conversation.last_message = content
        conversation.last_message_at = datetime.now(timezone.utc)
        conversation.unread_count += 1

    message = Message(
        conversation_id=conversation.id,
        sender_id=user.id,
        sender_name=f"{user.first_name} {user.last_name}",
        sender_role=user.role,
        content=content,
        product_id=product.id,
    )
    db.add(message)
    await create_notification(
        db,
        user_id=seller.id,
        title="New customer message",
        message=f"{user.first_name} asked about {product.name}.",
        notification_type="message",
        link=_message_link(conversation.id, seller.role),
    )
    await db.flush()
    await db.refresh(message)
    return _message_out(message)


@router.get("/messages/conversations", response_model=list[ConversationOut])
async def list_conversations(db: DbSession, user: CurrentUser):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.participants.contains([user.id]))
        .order_by(Conversation.last_message_at.desc().nullslast())
        .limit(100)
    )
    conversations = list(result.scalars().all())
    if not conversations:
        return []

    product_ids = {item.product_id for item in conversations if item.product_id}
    product_result = await db.execute(
        select(Product.id, Product.name).where(Product.id.in_(product_ids))
    ) if product_ids else None
    product_names = dict(product_result.all()) if product_result else {}

    other_ids = {
        participant_id
        for item in conversations
        for participant_id in item.participants
        if participant_id != user.id
    }
    users_result = await db.execute(select(User).where(User.id.in_(other_ids))) if other_ids else None
    other_users = {item.id: item for item in users_result.scalars().all()} if users_result else {}

    response = []
    for conversation in conversations:
        other_user = next(
            (
                other_users[participant_id]
                for participant_id in conversation.participants
                if participant_id != user.id and participant_id in other_users
            ),
            None,
        )
        if other_user is None:
            continue
        response.append(
            ConversationOut(
                id=conversation.id,
                product_id=conversation.product_id,
                product_name=product_names.get(conversation.product_id or "", ""),
                other_participant_name=(
                    f"{other_user.first_name} {other_user.last_name}"
                ),
                other_participant_role=other_user.role,
                last_message=conversation.last_message,
                last_message_at=conversation.last_message_at,
                unread_count=conversation.unread_count,
            )
        )
    return response


@router.get(
    "/messages/conversations/{conversation_id}",
    response_model=list[MessageOut],
)
async def list_messages(
    conversation_id: str,
    db: DbSession,
    user: CurrentUser,
):
    await _get_conversation_for_user(db, conversation_id, user.id)
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
        .limit(500)
    )
    messages = list(result.scalars().all())
    await db.execute(
        update(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.sender_id != user.id,
            Message.read.is_(False),
        )
        .values(read=True)
    )
    return [_message_out(item) for item in messages]


@router.post(
    "/messages/conversations/{conversation_id}",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def reply_to_conversation(
    conversation_id: str,
    body: MessageCreate,
    db: DbSession,
    user: CurrentUser,
):
    if user.role not in {"customer", "seller"}:
        raise HTTPException(status_code=403, detail="Only customers and sellers can message")
    conversation = await _get_conversation_for_user(db, conversation_id, user.id)
    recipient_ids = [
        item for item in conversation.participants if item != user.id
    ]
    if not recipient_ids:
        raise HTTPException(status_code=400, detail="Conversation has no recipient")
    recipients_result = await db.execute(
        select(User).where(User.id.in_(recipient_ids), User.is_active.is_(True))
    )
    recipients = list(recipients_result.scalars().all())
    if not recipients:
        raise HTTPException(status_code=400, detail="Conversation recipient is unavailable")

    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=422, detail="Message cannot be empty")
    now = datetime.now(timezone.utc)
    conversation.last_message = content
    conversation.last_message_at = now
    conversation.unread_count += 1
    message = Message(
        conversation_id=conversation.id,
        sender_id=user.id,
        sender_name=f"{user.first_name} {user.last_name}",
        sender_role=user.role,
        content=content,
        product_id=conversation.product_id,
    )
    db.add(message)
    for recipient in recipients:
        await create_notification(
            db,
            user_id=recipient.id,
            title="New message",
            message=f"{user.first_name} sent you a message.",
            notification_type="message",
            link=_message_link(conversation.id, recipient.role),
        )
    await db.flush()
    await db.refresh(message)
    return _message_out(message)


@router.get("/notifications", response_model=list[NotificationOut])
async def list_notifications(db: DbSession, user: CurrentUser):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(30)
    )
    return list(result.scalars().all())


@router.patch("/notifications/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_read(
    notification_id: str,
    db: DbSession,
    user: CurrentUser,
):
    result = await db.execute(
        update(Notification)
        .where(
            Notification.id == notification_id,
            Notification.user_id == user.id,
        )
        .values(read=True)
    )
    if not result.rowcount:
        raise HTTPException(status_code=404, detail="Notification not found")
