import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (registers all tables on Base)
from app.config import settings
from app.db import Base, SessionLocal, engine
from app.routers import (approvals, attendance, audit, auth, capa, contractors, evidence, gis, grievances, health,
                         inspections, mines, notifications, observations, org, sync, tasks)
from app.services import audit as audit_chain  # noqa: F401  (registers the automatic history hook)
from app.services import notify as live_push  # noqa: F401  (registers the push-after-commit hook)
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
app.include_router(inspections.router)
app.include_router(capa.router)
app.include_router(approvals.router)
app.include_router(evidence.router)
app.include_router(audit.router)
app.include_router(contractors.router)
app.include_router(attendance.router)
app.include_router(observations.router)
app.include_router(grievances.router)
app.include_router(notifications.router)
app.include_router(sync.router)
