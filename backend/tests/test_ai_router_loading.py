"""The ML teammate's app/routers/ai.py is included automatically (and a broken one never breaks the app)."""
import sys
import types

from fastapi import APIRouter

import app.main as main


def _fresh_app(monkeypatch, module):
    monkeypatch.setitem(sys.modules, "app.routers.ai", module)
    monkeypatch.setattr("importlib.util.find_spec", lambda name, *a: object() if name == "app.routers.ai" else None)
    def paths():
        main.app.openapi_schema = None                          # rebuild the API spec
        return set(main.app.openapi()["paths"])

    before = paths()
    main._include_ai_router()
    return paths() - before


def test_ai_router_is_included_when_present(monkeypatch):
    module = types.ModuleType("app.routers.ai")
    module.router = APIRouter(prefix="/ai")

    @module.router.get("/ping")
    def ping():
        return {"ok": True}

    assert _fresh_app(monkeypatch, module) == {"/ai/ping"}


def test_broken_ai_router_is_skipped(monkeypatch):
    broken = types.ModuleType("app.routers.ai")                # no `router` attribute -> error, logged + skipped
    assert _fresh_app(monkeypatch, broken) == set()
