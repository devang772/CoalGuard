import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (registers all tables on Base)
from app.config import settings
from app.db import Base, SessionLocal, engine
from app.routers import auth, gis, health, mines, org, tasks
from app.services.tasks import generate_tasks, mark_overdue

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if settings.auto_bootstrap:
            from seed.bootstrap import bootstrap
            bootstrap(db)
        created, overdue = generate_tasks(db), mark_overdue(db)
        db.commit()
        log.info("Startup: %d tasks created, %d marked overdue", created, overdue)
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
app.include_router(org.router)
app.include_router(mines.router)
app.include_router(tasks.router)
app.include_router(gis.router)
