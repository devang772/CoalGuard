"""Compliance weather forecast: the chance of an incident at each mine in the next 14 days.

- Training data: the live database. One row per mine per past day (features as of that day, label = at least one
  incident in the following 14 days), built by app.ai.features.training_frame.
- Model: XGBoost classifier. It is re-trained automatically when it is older than RETRAIN_HOURS, when it was
  trained on a different database, or on demand (POST /ai/risk/retrain, nightly job).
- Prediction: features are calculated from the database at request time, so every new task, CAPA, report or
  attendance record changes the next answer.
- Reasons: per-mine SHAP contributions from XGBoost (how much each feature pushed this mine's risk up).
"""
from __future__ import annotations

import hashlib
import logging
import os
import threading
import time
from datetime import timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import roc_auc_score
from sqlalchemy.orm import Session

from app.ai.features import FEATURES, FRIENDLY_NAMES, LABEL_DAYS, live_features, training_frame
from app.config import settings
from app.utils import utcnow

log = logging.getLogger(__name__)

MODEL_DIR = Path(os.getenv("AI_MODEL_DIR") or Path(__file__).resolve().parent / "models")
MODEL_FILE = MODEL_DIR / "risk_db.joblib"
RETRAIN_HOURS = float(os.getenv("RISK_RETRAIN_HOURS", "6"))
MIN_ROWS, MIN_POSITIVES, MIN_NEGATIVES = 100, 5, 20

_lock = threading.Lock()
_cache: dict | None = None


class ModelUnavailable(Exception):
    """Not enough history in the database to train the model (e.g. a new deployment)."""


def risk_level(risk_pct: float) -> str:
    return "low" if risk_pct < 40 else "medium" if risk_pct < 70 else "high"


def _database_id() -> str:
    return hashlib.sha256(settings.database_url.encode()).hexdigest()[:16]


# ---------------------------------------------------------------- training
def train_model(db: Session) -> dict:
    """Train on the database history, evaluate on the most recent 20 % of days, then refit on everything."""
    started, now = time.perf_counter(), utcnow()
    frame = training_frame(db, now)
    positives = int(frame["y"].sum()) if len(frame) else 0
    negatives = len(frame) - positives
    if len(frame) < MIN_ROWS or positives < MIN_POSITIVES or negatives < MIN_NEGATIVES:
        raise ModelUnavailable(
            f"Not enough history to train the risk model: {len(frame)} mine-days, {positives} followed by an "
            f"incident (need {MIN_ROWS} mine-days and {MIN_POSITIVES} events).")

    days = np.sort(frame["as_of"].unique())
    cut = days[int(len(days) * 0.8)]
    train, test = frame[frame.as_of < cut], frame[frame.as_of >= cut]
    params = dict(n_estimators=200, max_depth=3, learning_rate=0.05, subsample=0.9, colsample_bytree=0.9,
                  min_child_weight=2, random_state=42, eval_metric="logloss")
    holdout_auc = None
    if train["y"].nunique() == 2 and test["y"].nunique() == 2:
        check = xgb.XGBClassifier(**params).fit(train[FEATURES], train["y"])
        holdout_auc = round(float(roc_auc_score(test["y"], check.predict_proba(test[FEATURES])[:, 1])), 3)

    model = xgb.XGBClassifier(**params).fit(frame[FEATURES], frame["y"])
    package = {
        "model": model,
        "features": FEATURES,
        "database": _database_id(),
        "trained_at": now.isoformat(),
        "training_rows": int(len(frame)),
        "positive_rows": positives,
        "history_from": pd.Timestamp(days[0]).isoformat(),
        "history_to": pd.Timestamp(days[-1]).isoformat(),
        "holdout_auc": holdout_auc,
        "label": f"at least one incident within {LABEL_DAYS} days",
        "train_seconds": round(time.perf_counter() - started, 2),
    }
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(package, MODEL_FILE)
    log.info("Risk model trained on %s mine-days (%s events), holdout AUC %s, %ss",
             package["training_rows"], positives, holdout_auc, package["train_seconds"])
    return package


def _usable(package: dict) -> bool:
    """Trained on this database with the current feature list."""
    return package.get("features") == FEATURES and package.get("database") == _database_id()


def _is_fresh(package: dict) -> bool:
    trained = pd.Timestamp(package["trained_at"]).to_pydatetime()
    return _usable(package) and utcnow() - trained < timedelta(hours=RETRAIN_HOURS)


_retraining = threading.Event()


def _retrain_in_background() -> None:
    """Refresh a stale model without making the caller wait (training takes ~15 s on 6 months of data)."""
    if _retraining.is_set():
        return
    _retraining.set()

    def run():
        global _cache
        from app.db import SessionLocal
        try:
            with SessionLocal() as db:
                package = train_model(db)
            with _lock:
                _cache = package
        except Exception:  # noqa: BLE001 - keep serving the previous model
            log.exception("Background re-training of the risk model failed")
        finally:
            _retraining.clear()

    threading.Thread(target=run, name="risk-retrain", daemon=True).start()


def load_model(db: Session, force_retrain: bool = False) -> dict:
    """The current model. Trains synchronously only when no usable model exists (or when forced);
    a model older than RETRAIN_HOURS is still served while a fresh one is trained in the background."""
    global _cache
    with _lock:
        if not force_retrain:
            if _cache is None and MODEL_FILE.exists():
                try:
                    _cache = joblib.load(MODEL_FILE)
                except Exception:  # noqa: BLE001 - a corrupt/old file is simply rebuilt
                    log.warning("Could not read %s; re-training", MODEL_FILE)
            if _cache is not None and _usable(_cache):
                if not _is_fresh(_cache):
                    _retrain_in_background()
                return _cache
        _cache = train_model(db)
        return _cache


def model_info(package: dict) -> dict:
    return {key: package[key] for key in ("trained_at", "training_rows", "positive_rows", "history_from",
                                          "history_to", "holdout_auc", "label", "train_seconds")}


# ---------------------------------------------------------------- prediction
def predict_risk(db: Session, mine_ids) -> list[dict]:
    """Live prediction for the given mines. Raises ModelUnavailable if the model can't be trained yet."""
    ids = list(mine_ids)
    if not ids:
        return []
    package = load_model(db)
    model: xgb.XGBClassifier = package["model"]
    now = utcnow()
    frame = live_features(db, ids, now)
    if frame.empty:
        return []
    X = frame[FEATURES].astype(float)
    probabilities = model.predict_proba(X)[:, 1]
    # SHAP values: one contribution per feature (log-odds) + a bias column
    contributions = model.get_booster().predict(xgb.DMatrix(X), pred_contribs=True)[:, :-1]
    output = []
    for (_, row), probability, contrib in zip(frame.iterrows(), probabilities, contributions):
        risk_pct = round(float(probability) * 100, 1)
        # reasons = features that raised this mine's risk and are actually present (value > 0)
        pushing_up = sorted(((FEATURES[i], float(v)) for i, v in enumerate(contrib) if v > 0 and row[FEATURES[i]] > 0),
                            key=lambda item: item[1], reverse=True)[:3]
        total = sum(v for _, v in pushing_up) or 1.0
        output.append({
            "mine_id": int(row["mine_id"]),
            "mine_name": row["mine_name"],
            "risk_pct": risk_pct,
            "level": risk_level(risk_pct),
            "reasons": [{"factor": FRIENDLY_NAMES[name], "feature": name, "value": round(float(row[name]), 2),
                         "impact_pct": round(100 * v / total, 1)} for name, v in pushing_up],
            "features": {name: round(float(row[name]), 2) for name in FEATURES},
            "features_as_of": now.isoformat(),
            "horizon_days": LABEL_DAYS,
            "source": "ml_model",
        })
    return sorted(output, key=lambda item: item["risk_pct"], reverse=True)
