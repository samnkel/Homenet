import hashlib
import logging
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, or_, select, update

from app.api.deps import CurrentUser, DbSession
from app.core.config import get_settings
from app.core.email import send_email
from app.core.security import create_access_token, hash_password, verify_password
from app.models.entities import (
    Address,
    Conversation,
    Message,
    Notification,
    Order,
    PasswordResetToken,
    Review,
    User,
    WishlistItem,
)
from app.schemas.auth import Token
from app.schemas.user import UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)
settings = get_settings()


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=32)
    new_password: str = Field(..., min_length=8, alias="newPassword")

    model_config = {"populate_by_name": True}


class ChangeTemporaryPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8, alias="newPassword")

    model_config = {"populate_by_name": True}


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, alias="currentPassword")
    new_password: str = Field(..., min_length=8, alias="newPassword")

    model_config = {"populate_by_name": True}


class DeleteAccountRequest(BaseModel):
    current_password: str = Field(..., min_length=1, alias="currentPassword")
    confirmation: str = Field(..., min_length=1)

    model_config = {"populate_by_name": True}


def _user_out(user: User) -> UserOut:
    return UserOut.model_validate(user)


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate, db: DbSession):
    existing = await db.execute(select(User).where(User.email == body.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email.lower(),
        hashed_password=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        role="customer",
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token(
        user.id,
        extra={"role": user.role, "token_version": user.token_version},
    )
    return Token(access_token=token, user=_user_out(user))


@router.post("/login", response_model=Token)
async def login(body: UserLogin, db: DbSession):
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    if (
        user.must_change_password
        and user.temporary_password_expires_at
        and user.temporary_password_expires_at <= datetime.now(timezone.utc)
    ):
        raise HTTPException(
            status_code=403,
            detail="Temporary password expired. Use Forgot password to receive a reset link.",
        )

    token = create_access_token(
        user.id,
        extra={
            "role": user.role,
            "must_change_password": user.must_change_password,
            "token_version": user.token_version,
        },
    )
    return Token(access_token=token, user=_user_out(user))


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser):
    return _user_out(user)


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: DbSession):
    result = await db.execute(
        select(User).where(User.email == body.email.lower())
    )
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return {"message": "If the account exists, a reset link has been sent."}

    now = datetime.now(timezone.utc)
    await db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        )
        .values(used_at=now)
    )
    token = secrets.token_urlsafe(32)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hashlib.sha256(token.encode("utf-8")).hexdigest(),
            expires_at=now + timedelta(minutes=20),
        )
    )
    await db.flush()

    reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={quote(token)}"
    try:
        await send_email(
            user.email,
            "Reset your Home-farry & Co password",
            (
                f"Hello {user.first_name},\n\n"
                f"Use this link to reset your password. It expires in 20 minutes "
                f"and can only be used once:\n\n{reset_url}\n\n"
                "If you did not request this, you can ignore this email."
            ),
        )
    except (OSError, RuntimeError, smtplib.SMTPException) as error:
        logger.exception("Unable to send password reset email")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password reset email could not be sent. Check the Gmail SMTP configuration.",
        ) from error

    return {"message": "If the account exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: DbSession):
    token_hash = hashlib.sha256(body.token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)
    result = await db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .values(used_at=now)
        .returning(PasswordResetToken.user_id)
    )
    user_id = result.scalar_one_or_none()
    if not user_id:
        raise HTTPException(status_code=400, detail="Reset link is invalid or expired")

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Reset link is invalid or expired")

    user.hashed_password = hash_password(body.new_password)
    user.must_change_password = False
    user.temporary_password_expires_at = None
    user.token_version += 1
    await db.flush()
    return {"message": "Password updated. You can now sign in."}


@router.post("/change-temporary-password")
async def change_temporary_password(
    body: ChangeTemporaryPasswordRequest,
    db: DbSession,
    user: CurrentUser,
):
    if not user.must_change_password:
        raise HTTPException(status_code=400, detail="No temporary password change is required")
    user.hashed_password = hash_password(body.new_password)
    user.must_change_password = False
    user.temporary_password_expires_at = None
    user.token_version += 1
    await db.flush()
    token = create_access_token(
        user.id,
        extra={
            "role": user.role,
            "must_change_password": False,
            "token_version": user.token_version,
        },
    )
    return Token(access_token=token, user=_user_out(user))


@router.post("/change-password", response_model=Token)
async def change_password(
    body: ChangePasswordRequest,
    db: DbSession,
    user: CurrentUser,
):
    if user.role != "customer":
        raise HTTPException(
            status_code=403,
            detail="Only customer accounts can change passwords in settings",
        )
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if verify_password(body.new_password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Choose a new password different from your current password",
        )

    user.hashed_password = hash_password(body.new_password)
    user.must_change_password = False
    user.temporary_password_expires_at = None
    user.token_version += 1
    await db.flush()
    token = create_access_token(
        user.id,
        extra={
            "role": user.role,
            "must_change_password": user.must_change_password,
            "token_version": user.token_version,
        },
    )
    return Token(access_token=token, user=_user_out(user))


@router.delete("/account")
async def delete_customer_account(
    body: DeleteAccountRequest,
    db: DbSession,
    user: CurrentUser,
):
    if user.role != "customer":
        raise HTTPException(
            status_code=403,
            detail="Only customer accounts can be deleted here",
        )
    if body.confirmation != "DELETE":
        raise HTTPException(
            status_code=400,
            detail='Type "DELETE" to confirm permanent account deletion',
        )
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    conversation_result = await db.execute(
        select(Conversation.id).where(
            Conversation.participants.contains([user.id])
        )
    )
    conversation_ids = list(conversation_result.scalars().all())
    message_conditions = [Message.sender_id == user.id]
    if conversation_ids:
        message_conditions.append(Message.conversation_id.in_(conversation_ids))
    await db.execute(delete(Message).where(or_(*message_conditions)))
    if conversation_ids:
        await db.execute(
            delete(Conversation).where(Conversation.id.in_(conversation_ids))
        )

    await db.execute(delete(Review).where(Review.customer_id == user.id))
    await db.execute(delete(Order).where(Order.customer_id == user.id))
    await db.execute(delete(Address).where(Address.user_id == user.id))
    await db.execute(delete(WishlistItem).where(WishlistItem.user_id == user.id))
    await db.execute(delete(Notification).where(Notification.user_id == user.id))
    await db.execute(
        delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
    )
    await db.delete(user)
    return {"message": "Customer account and associated data permanently deleted"}
