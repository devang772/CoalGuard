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

    auto_bootstrap: bool = True          # demo org tree (12 sample mines) + demo logins when the database is empty
    demo_password: str = "demo123"
    # Install the sample obligation catalogue (used when the ML engine is not available). Checklists and
    # escalation rules are always installed if missing.
    load_sample_catalogue: bool = True

    # Background jobs (reminders, escalation ladder, nightly tasks). Only ONE server process should run them.
    scheduler_enabled: bool = True
    # Demo mode: 60 means 1 real minute counts as 1 hour for reminders/escalations (1 = real time)
    demo_time_speed: float = 1.0
    # Demo mode: let a worker mark attendance many times a day (every mark is saved and shown).
    # Set to false for the real rule: one valid attendance per worker per day.
    attendance_allow_multiple: bool = True

    # How long to wait for the ML engine before using the fallback matcher
    ml_timeout_seconds: float = 20.0

    # File storage for photos and reports: "local" (the uploads folder) or "cloudinary"
    storage_backend: str = "local"
    # Either CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name> or the three values below
    cloudinary_url: str | None = None
    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None
    cloudinary_folder: str = "khanan-netra"      # all files go under this folder in Cloudinary
    cloudinary_link_minutes: int = 10            # how long a Cloudinary download link stays valid

    # Evidence uploads (Satya Proof)
    upload_dir: str = "uploads"               # relative to the backend folder, or an absolute path
    max_upload_mb: float = 10.0
    gps_accuracy_limit_m: float = 50.0        # worse than this = "location not precise"
    clock_skew_minutes: float = 10.0          # phone time vs real time / photo time
    stale_photo_days: float = 7.0             # photo taken this long before upload = stale
    similar_photo_distance: int = 5           # perceptual-hash bits; <= this = look-alike photo
    closure_max_distance_m: float = 30.0      # after-photo must be this close to the before-photo
    closure_min_trust: int = 60

    # Sample thresholds used by checks and alerts (replace with official values per state/notification)
    min_daily_wage: float = 450.0
    pm10_limit: float = 100.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
