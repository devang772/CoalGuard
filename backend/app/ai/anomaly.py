"""Anomaly detection on live database data, limited to the caller's mines.

- Production vs dispatch (production_logs): IsolationForest per mine on the daily gap between coal produced and
  coal dispatched, fitted on the last 180 days. Only days the model flags as outliers are returned.
- Attendance (attendance): workers present per contractor per day, compared with the median of the previous
  14 days (robust MAD z-score). Sudden jumps suggest ghost shifts / proxy attendance.
- Environment (env_readings): daily PM10 per mine against the previous 14 days, plus every day above the CPCB
  24-hour PM10 limit of 100 µg/m³.

Each call reads the tables again, so new records change the next answer.
"""
from __future__ import annotations

from datetime import timedelta

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Attendance, Contractor, EnvReading, OrgUnit, ProductionLog, Worker
from app.utils import today_ist, utcnow

FIT_DAYS = 180          # history used to learn what "normal" looks like
BASELINE_DAYS = 14      # rolling baseline for attendance / PM10
PM10_LIMIT = 100.0      # CPCB 24-hour PM10 standard, µg/m³


def _names(db: Session, mine_ids: list[int]) -> dict[int, str]:
    return dict(db.execute(select(OrgUnit.id, OrgUnit.name).where(OrgUnit.id.in_(mine_ids))).all())


def _robust_z(values: pd.Series) -> tuple[pd.Series, pd.Series]:
    """Distance of each day from the median of the previous BASELINE_DAYS days, in MAD units."""
    previous = values.shift(1).rolling(BASELINE_DAYS, min_periods=7)
    median = previous.median()
    mad = previous.apply(lambda x: np.median(np.abs(x - np.median(x))), raw=True)
    z = (values - median) / (1.4826 * mad.replace(0, np.nan))
    return z, median


def detect_production_anomalies(db: Session, mine_ids: list[int], days: int = 30) -> list[dict]:
    if not mine_ids:
        return []
    today = today_ist()
    rows = db.execute(select(ProductionLog.mine_id, ProductionLog.date, ProductionLog.produced_t,
                             ProductionLog.dispatched_t)
                      .where(ProductionLog.mine_id.in_(mine_ids),
                             ProductionLog.date > today - timedelta(days=FIT_DAYS))).all()
    df = pd.DataFrame(rows, columns=["mine_id", "date", "produced_t", "dispatched_t"])
    if df.empty:
        return []
    names = _names(db, mine_ids)
    df["date"] = pd.to_datetime(df["date"])
    df["gap"] = df["produced_t"] - df["dispatched_t"]
    df["gap_ratio"] = (df["gap"] / df["produced_t"].replace(0, np.nan)).fillna(0)
    since = pd.Timestamp(today - timedelta(days=days))
    results = []
    for mine_id, group in df.groupby("mine_id"):
        if len(group) < 30:
            continue
        X = group[["gap", "gap_ratio"]].to_numpy()
        model = IsolationForest(n_estimators=200, contamination=0.03, random_state=42).fit(X)
        flagged = model.predict(X) == -1
        raw = -model.score_samples(X)                       # higher = more unusual
        score = (raw - raw.min()) / (raw.max() - raw.min() or 1)
        expected = float(group["gap"].median())
        for (_, row), is_out, s in zip(group.iterrows(), flagged, score):
            # a gap far above normal is the risk (coal produced but not dispatched); ignore unusually small gaps
            if not is_out or row["date"] < since or row["gap"] <= expected:
                continue
            results.append({
                "id": f"production-{mine_id}-{row['date'].date()}",
                "type": "production_dispatch_gap",
                "mine_id": int(mine_id), "mine_name": names.get(mine_id, str(mine_id)),
                "date": str(row["date"].date()),
                "value": round(float(row["gap"]), 1), "expected": round(expected, 1),
                "score": round(float(s), 3),
                "description": (f"Produced {row['produced_t']:,.0f} t but dispatched {row['dispatched_t']:,.0f} t: "
                                f"gap {row['gap']:,.0f} t vs usual ~{expected:,.0f} t."),
            })
    return results


def detect_attendance_anomalies(db: Session, mine_ids: list[int], days: int = 30) -> list[dict]:
    if not mine_ids:
        return []
    today = today_ist()
    day = func.date(Attendance.time)
    rows = db.execute(select(Contractor.id, Contractor.name, Contractor.mine_id, day,
                             func.count(func.distinct(Attendance.worker_id)))
                      .join(Worker, Attendance.worker_id == Worker.id)
                      .join(Contractor, Worker.contractor_id == Contractor.id)
                      .where(Attendance.mine_id.in_(mine_ids),
                             Attendance.time >= utcnow() - timedelta(days=days + BASELINE_DAYS + 7),
                             Attendance.time <= utcnow())
                      .group_by(Contractor.id, Contractor.name, Contractor.mine_id, day)).all()
    df = pd.DataFrame(rows, columns=["contractor_id", "contractor", "mine_id", "date", "present"])
    if df.empty:
        return []
    names = _names(db, mine_ids)
    df["date"] = pd.to_datetime(df["date"])
    since = pd.Timestamp(today - timedelta(days=days))
    results = []
    for (contractor_id, contractor, mine_id), group in df.groupby(["contractor_id", "contractor", "mine_id"]):
        # one row per calendar day, 0 on days with nobody present
        series = group.set_index("date")["present"].asfreq("D", fill_value=0)
        z, median = _robust_z(series.astype(float))
        for date, present in series.items():
            m, score = median.get(date), z.get(date)
            if date < since or pd.isna(m) or present <= m + 5:
                continue
            if not (pd.isna(score) and present > m + 15) and not (not pd.isna(score) and score > 3.5):
                continue
            results.append({
                "id": f"attendance-{contractor_id}-{date.date()}",
                "type": "attendance_spike",
                "mine_id": int(mine_id), "mine_name": names.get(mine_id, str(mine_id)),
                "contractor_id": int(contractor_id), "contractor": contractor,
                "date": str(date.date()), "value": int(present), "expected": round(float(m), 1),
                "score": round(min(float(score) / 10, 1.0), 3) if not pd.isna(score) else 1.0,
                "description": f"{contractor} marked {present} workers present vs usual ~{m:.0f}.",
            })
    return results


def detect_environment_anomalies(db: Session, mine_ids: list[int], days: int = 30) -> list[dict]:
    if not mine_ids:
        return []
    today = today_ist()
    day = func.date(EnvReading.time)
    rows = db.execute(select(EnvReading.mine_id, day, func.avg(EnvReading.pm10))
                      .where(EnvReading.mine_id.in_(mine_ids), EnvReading.pm10.is_not(None),
                             EnvReading.time >= utcnow() - timedelta(days=days + BASELINE_DAYS + 7),
                             EnvReading.time <= utcnow())
                      .group_by(EnvReading.mine_id, day)).all()
    df = pd.DataFrame(rows, columns=["mine_id", "date", "pm10"])
    if df.empty:
        return []
    names = _names(db, mine_ids)
    df["date"] = pd.to_datetime(df["date"])
    since = pd.Timestamp(today - timedelta(days=days))
    results = []
    for mine_id, group in df.groupby("mine_id"):
        series = group.set_index("date")["pm10"].astype(float).sort_index()
        z, median = _robust_z(series)
        for date, pm10 in series.items():
            m, score = median.get(date), z.get(date)
            spike = not pd.isna(score) and score > 3.5
            if date < since or not (pm10 > PM10_LIMIT or spike):
                continue
            why = f"above the {PM10_LIMIT:.0f} µg/m³ limit" if pm10 > PM10_LIMIT else "sudden rise"
            results.append({
                "id": f"env-{mine_id}-{date.date()}",
                "type": "env_spike",
                "mine_id": int(mine_id), "mine_name": names.get(mine_id, str(mine_id)),
                "date": str(date.date()), "value": round(pm10, 1),
                "expected": round(float(m), 1) if not pd.isna(m) else None,
                "score": round(min(max(float(score) / 10, pm10 / (2 * PM10_LIMIT)), 1.0), 3)
                if not pd.isna(score) else round(min(pm10 / (2 * PM10_LIMIT), 1.0), 3),
                "description": (f"PM10 {pm10:.1f} µg/m³ ({why})"
                                + (f"; recent normal ~{m:.1f}." if not pd.isna(m) else ".")),
            })
    return results


def detect_all_anomalies(db: Session, mine_ids: list[int], days: int = 30, limit: int = 100) -> list[dict]:
    results = (detect_production_anomalies(db, mine_ids, days) + detect_attendance_anomalies(db, mine_ids, days)
               + detect_environment_anomalies(db, mine_ids, days))
    results.sort(key=lambda item: (item["date"], item["score"]), reverse=True)
    return results[:limit]
