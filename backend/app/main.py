import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import models  # noqa: F401  (registers all tables on Base)
from app.config import settings
from app.db import Base, SessionLocal, engine
from app.routers import (admin, approvals, attendance, audit, auth, capa, contractors, dashboard, evidence, gis,
                         grievances, health, inspections, me, mines, notifications, observations, org, reports, sync,
                         tasks, users)
from app.services import audit as audit_chain  # noqa: F401  (registers the automatic history hook)
from app.services import notify as live_push  # noqa: F401  (registers the push-after-commit hook)
from app.services import scheduler, storage
from app.services.tasks import generate_tasks, mark_overdue

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("app")


def _safety_warnings(db) -> None:
    """Loud warnings for settings that are fine for a demo but unsafe in a real deployment."""
    from sqlalchemy import select

    from app.models import User
    from app.security import verify_password
    if settings.jwt_secret in ("change-me-to-a-long-random-string", "") or len(settings.jwt_secret) < 32:
        log.warning("SECURITY: JWT_SECRET is the default or too short. Set a long random value in .env.")
    demo = db.scalar(select(User).where(User.phone == "9000000001"))
    if demo is not None and verify_password("demo123", demo.password_hash):
        log.warning("SECURITY: demo logins with password 'demo123' exist. For a real deployment set "
                    "AUTO_BOOTSTRAP=false, start with an empty database and create the first admin with "
                    "`python -m seed.create_admin`.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("File storage: %s", storage.check_configuration())    # fails fast if Cloudinary is misconfigured
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if settings.auto_bootstrap:
            from seed.bootstrap import bootstrap
            bootstrap(db)
        from seed.reference import ensure_reference_data
        added = ensure_reference_data(db)
        if any(added.values()):
            log.info("Reference data installed: %s", added)
        created, overdue = generate_tasks(db), mark_overdue(db)
        db.commit()
        log.info("Startup: %d tasks created, %d marked overdue", created, overdue)
        _safety_warnings(db)
    if settings.scheduler_enabled:
        scheduler.start()
    yield
    scheduler.stop()


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



def _readable(error: dict) -> str:
    field = ".".join(str(part) for part in error.get("loc", ()) if part not in ("body", "query", "path", "form"))
    message = str(error.get("msg", "Invalid value")).removeprefix("Value error, ")
    return f"{field}: {message}" if field else message


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    """Same shape as every other error: {"detail": "one readable sentence"} (+ the full list in "errors")."""
    errors = exc.errors()
    return JSONResponse(status_code=422, content={
        "detail": _readable(errors[0]) if errors else "Invalid request.",
        "errors": [{"field": ".".join(str(p) for p in e.get("loc", ())), "message": str(e.get("msg", ""))}
                   for e in errors]})


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
app.include_router(admin.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(users.router)
app.include_router(me.router)


def _include_ai_router() -> None:
    """The ML teammate's /ai/* endpoints live in app/routers/ai.py. They are picked up automatically when the file
    exists, so merging their code needs no change here. A broken AI module is logged and skipped; the rest of
    the API keeps working."""
    import importlib.util
    if importlib.util.find_spec("app.routers.ai") is None:
        log.info("AI router not installed yet (app/routers/ai.py); /ai/* endpoints are not available.")
        return
    try:
        from app.routers import ai
        app.include_router(ai.router)
        log.info("AI router loaded: /ai/* endpoints available.")
    except Exception:  # noqa: BLE001
        log.exception("AI router failed to load; continuing without /ai/* endpoints.")


_include_ai_router()
