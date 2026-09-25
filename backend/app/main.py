import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (registers all tables on Base)
from app.config import settings
from app.db import Base, SessionLocal, engine
from app.routers import auth, health

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if settings.auto_bootstrap:
        from seed.bootstrap import bootstrap
        with SessionLocal() as db:
            bootstrap(db)
    yield


app = FastAPI(
    title=settings.app_name,
    description="Khanan Netra (Eye of the Mine): AI-based smart governance and compliance "
                "monitoring for coal mines. Log in with the Authorize button "
                "(username = phone, e.g. 9000000001, password = demo123).",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials="*" not in settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
