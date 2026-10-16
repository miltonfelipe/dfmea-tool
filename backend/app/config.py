import logging
import os
import secrets
from dataclasses import dataclass, field

log = logging.getLogger("dfmea")


def _bool(name: str, default: bool) -> bool:
    v = os.environ.get(name)
    return default if v is None else v.strip().lower() in ("1", "true", "yes", "on")


def _int(name: str, default: int) -> int:
    return int(os.environ.get(name, default))


def _secret_key() -> str:
    key = os.environ.get("DFMEA_SECRET_KEY")
    if key:
        if len(key.encode()) < 32:
            raise ValueError("DFMEA_SECRET_KEY must be at least 32 bytes (HS256)")
        return key
    log.warning("DFMEA_SECRET_KEY not set; using a random key (tokens will not survive a restart)")
    return secrets.token_urlsafe(32)


@dataclass
class Settings:
    database_url: str = field(default_factory=lambda: os.environ.get("DFMEA_DATABASE_URL", "sqlite:///./dfmea.db"))
    secret_key: str = field(default_factory=_secret_key)
    token_ttl_minutes: int = field(default_factory=lambda: _int("DFMEA_TOKEN_TTL_MINUTES", 720))
    # Creates the demo accounts (alex/sofia/bruno, well-known passwords) when the
    # user table is empty. Off by default; ./dev.sh turns it on for development.
    seed_demo_users: bool = field(default_factory=lambda: _bool("DFMEA_SEED_DEMO_USERS", False))
    # Failed sign-ins allowed per username+client within the window (the client
    # IP alone gets 4x this). Behind a reverse proxy, run uvicorn with
    # --proxy-headers so the real client IP is used.
    login_max_failures: int = field(default_factory=lambda: _int("DFMEA_LOGIN_MAX_FAILURES", 5))
    login_window_minutes: int = field(default_factory=lambda: _int("DFMEA_LOGIN_WINDOW_MINUTES", 15))
    # Largest request body accepted (imports are the biggest requests).
    max_body_bytes: int = field(default_factory=lambda: _int("DFMEA_MAX_BODY_BYTES", 10 * 1024 * 1024))
    cors_origins: list[str] = field(
        default_factory=lambda: os.environ.get("DFMEA_CORS_ORIGINS", "http://localhost:5173").split(",")
    )
    # Built front end to serve at "/", if the directory exists.
    static_dir: str = field(
        default_factory=lambda: os.environ.get(
            "DFMEA_STATIC_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
        )
    )
