import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

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
        _warm_risk_model()
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
    """Same shape as every other error: {"detail": "one readable sentence", "message": same} + the full list."""
    errors = exc.errors()
    sentence = _readable(errors[0]) if errors else "Invalid request."
    return JSONResponse(status_code=422, content={
        "detail": sentence, "message": sentence,
        "errors": [{"field": ".".join(str(p) for p in e.get("loc", ())), "message": str(e.get("msg", ""))}
                   for e in errors]})


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    """Every error: {"detail": "...", "message": "..."} (both keys, same text, so any client can read it)."""
    text = exc.detail if isinstance(exc.detail, str) else "Request failed."
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail, "message": text},
                        headers=getattr(exc, "headers", None))


class ApiV1Alias:
    """Also accept every route under /api/v1 (the mobile app's default base URL), e.g. /api/v1/auth/login ->
    /auth/login, including the WebSocket. The documented paths stay without the prefix."""
    PREFIX = "/api/v1"

    def __init__(self, asgi_app):
        self.app = asgi_app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            path = scope.get("path", "")
            if path == self.PREFIX or path.startswith(self.PREFIX + "/"):
                scope = dict(scope)
                scope["path"] = path[len(self.PREFIX):] or "/"
                if scope.get("raw_path"):
                    scope["raw_path"] = scope["path"].encode()
        await self.app(scope, receive, send)


app.add_middleware(ApiV1Alias)


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


def _warm_risk_model() -> None:
    """Load the ML models (risk, speech) in the background so the first request doesn't wait."""
    import threading

    def run():
        try:
            from app.ai.risk_model import load_model
            with SessionLocal() as db:
                load_model(db)
        except Exception as exc:  # noqa: BLE001 - the map falls back to the labelled rule score
            log.warning("Risk model not ready: %s", exc)
        try:
            from app.ai.voice import warm_up
            warm_up()                                   # load the Whisper speech model once, not on the first report
        except ImportError:
            pass

    threading.Thread(target=run, name="risk-model-warmup", daemon=True).start()


def _include_ai_router() -> None:
    """The ML teammate's /ai/* endpoints live in app/routers/ai.py. They are picked up automatically when the file
    exists, so merging their code needs no change here. A broken AI module is logged and skipped; the rest of
    the API keeps working."""
    import importlib
    import importlib.util
    if importlib.util.find_spec("app.routers.ai") is None:
        log.info("AI router not installed yet (app/routers/ai.py); /ai/* endpoints are not available.")
        return
    try:
        ai = importlib.import_module("app.routers.ai")
        app.include_router(ai.router)
        log.info("AI router loaded: /ai/* endpoints available.")
    except Exception:  # noqa: BLE001
        log.exception("AI router failed to load; continuing without /ai/* endpoints.")


_include_ai_router()
