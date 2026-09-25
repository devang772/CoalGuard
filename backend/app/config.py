from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All settings come from environment variables or the .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Khanan Netra API"
    database_url: str = "postgresql+psycopg://netra:netra@localhost:5434/khanan_netra"

    jwt_secret: str = "change-me-to-a-long-random-string"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 720

    cors_origins: str = "*"

    auto_bootstrap: bool = True
    demo_password: str = "demo123"

    # How long to wait for the ML engine before using the fallback matcher
    ml_timeout_seconds: float = 20.0

    # Sample thresholds used by checks and alerts (replace with official values per state/notification)
    min_daily_wage: float = 450.0
    pm10_limit: float = 100.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
