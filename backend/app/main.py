import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select

from .config import Settings
from .db import make_engine, make_sessionmaker
from .middleware import BodySizeLimit, SecurityHeaders
from .models import Base, User
from .ratelimit import FailureLimiter
from .routers import auth, entries, projects, users
from .seed import seed_demo_users

log = logging.getLogger("dfmea")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    engine = make_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        Base.metadata.create_all(engine)
        with app.state.sessionmaker() as db:
            if settings.seed_demo_users and seed_demo_users(db):
                log.warning("Created demo accounts with well-known passwords (alex/pm123, ...). "
                            "Do not use DFMEA_SEED_DEMO_USERS in production.")
            if not db.scalar(select(func.count()).select_from(User)):
                log.warning("No users yet. Create a Project Manager with: "
                            "python -m app.cli create-user --username <name> --role PM")
        yield
        engine.dispose()

    app = FastAPI(title="DFMEA Tool API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.sessionmaker = make_sessionmaker(engine)
    app.state.login_limiter = FailureLimiter(settings.login_max_failures, settings.login_window_minutes * 60)

    # Added last = runs first: reject oversized bodies before anything else.
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                       allow_methods=["*"], allow_headers=["*"])
    app.add_middleware(SecurityHeaders)
    app.add_middleware(BodySizeLimit, max_bytes=settings.max_body_bytes)

    @app.get("/api/health", tags=["meta"])
    def health():
        return {"status": "ok"}

    for r in (auth.router, users.router, projects.router, entries.router):
        app.include_router(r)

    # Production: serve the built React app (npm run build) from the same process.
    if os.path.isdir(settings.static_dir):
        app.mount("/", StaticFiles(directory=settings.static_dir, html=True), name="frontend")

    return app


app = create_app()
