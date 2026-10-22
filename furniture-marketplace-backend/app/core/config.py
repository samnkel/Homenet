from functools import lru_cache
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Zuri Living & Co API"
    ENVIRONMENT: str = "development"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/furnilocal"

    JWT_SECRET: str = "dev-secret-change-me-in-production-32chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    CORS_ORIGINS: str = (
        "https://uzuri-living.vercel.app,"
        "https://homefairy-sand.vercel.app,"
        "https://homefairy-five.vercel.app,"
        "https://homefairy-omega.vercel.app,"
        "http://localhost:5173,"
        "http://localhost:3000,"
        "http://127.0.0.1:5173"
    )

    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    SMTP_HOST: str = ""
    SMTP_PORT: int = Field(default=587, ge=1, le=65535)
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_USE_TLS: bool = True
    FRONTEND_URL: str = "http://127.0.0.1:5173"

    @field_validator("FRONTEND_URL", mode="before")
    @classmethod
    def normalize_frontend_url(cls, value: object) -> str:
        frontend_url = str(value or "").strip().rstrip("/")
        if not frontend_url or frontend_url in {"http:", "https:"}:
            return "http://127.0.0.1:5173"
        return frontend_url

    PAYSTACK_SECRET_KEY: str = ""
    PAYSTACK_PAYMENT_EXPIRY_MINUTES: int = Field(default=30, ge=1)

    PLATFORM_FEE_RATE: float = 0.05

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @model_validator(mode="after")
    def validate_production_jwt_secret(self):
        if self.ENVIRONMENT.strip().lower() in {"prod", "production"} and (
            len(self.JWT_SECRET) < 32
            or self.JWT_SECRET == "dev-secret-change-me-in-production-32chars"
            or self.JWT_SECRET.startswith("replace-with-")
        ):
            raise ValueError(
                "Production requires a unique JWT_SECRET with at least 32 characters"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
