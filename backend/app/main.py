import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import Settings
from .db import make_engine, make_sessionmaker
from .models import Base
from .routers import auth, entries, projects, users
from .seed import seed_demo_users


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    engine = make_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        Base.metadata.create_all(engine)
        if settings.seed_demo_users:
            with app.state.sessionmaker() as db:
                seed_demo_users(db)
        yield
        engine.dispose()

    app = FastAPI(title="DFMEA Tool API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.sessionmaker = make_sessionmaker(engine)

    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                       allow_methods=["*"], allow_headers=["*"])

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
