"""Mine risk features computed from the live database.

The same function builds the training history (one row per mine per past day) and the live row used for a
prediction (one row per mine "as of now"), so the model always sees features with the same meaning and scale.
Every feature only looks at data from before its `as_of` time.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models import (Attendance, Capa, ComplianceTask, Contractor, Evidence, Finding, Observation, OrgUnit,
                        Worker)

FEATURES = [
    "overdue_tasks_30d",
    "open_capas",
    "overdue_capas",
    "avg_capa_close_days_8w",
    "near_miss_4w",
    "unsafe_reports_4w",
    "incidents_12w",
    "critical_findings_4w",
    "expired_training_pct",
    "invalid_attendance_pct_4w",
    "low_trust_evidence_pct_4w",
    "is_monsoon",
]

FRIENDLY_NAMES = {
    "overdue_tasks_30d": "Overdue compliance tasks (last 30 days)",
    "open_capas": "Open CAPAs",
    "overdue_capas": "Overdue CAPAs",
    "avg_capa_close_days_8w": "Average days to close a CAPA (8 weeks)",
    "near_miss_4w": "Near-misses (4 weeks)",
    "unsafe_reports_4w": "Unsafe act / condition reports (4 weeks)",
    "incidents_12w": "Incidents (12 weeks)",
    "critical_findings_4w": "Critical / high findings (4 weeks)",
    "expired_training_pct": "Workers with expired training (%)",
    "invalid_attendance_pct_4w": "Refused attendance (%, 4 weeks)",
    "low_trust_evidence_pct_4w": "Low-trust photos (%, 4 weeks)",
    "is_monsoon": "Monsoon season",
}

LABEL_DAYS = 14         # the model predicts an incident in the next 14 days
LOW_TRUST = 60          # trust score below this counts as low-trust evidence (same threshold as CAPA closure)
MONSOON_MONTHS = (6, 7, 8, 9)
IST = timezone(timedelta(hours=5, minutes=30))
DAY = 86_400 * 10**9                     # one day in nanoseconds
NEVER = np.iinfo("int64").max           # "no date" (task not done, CAPA not closed, ...)


def _utc(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, utc=True)


def _frame(db: Session, query, columns: list[str]) -> pd.DataFrame:
    return pd.DataFrame(db.execute(query).all(), columns=columns)


class MineData:
    """Everything the features need, loaded once from the database for a set of mines."""

    def __init__(self, db: Session, mine_ids: list[int]):
        ids = list(mine_ids)
        self.mine_ids = ids
        self.names = dict(db.execute(select(OrgUnit.id, OrgUnit.name).where(OrgUnit.id.in_(ids))).all())
        self.tasks = _frame(db, select(ComplianceTask.mine_id, ComplianceTask.due_date, ComplianceTask.done_at)
                            .where(ComplianceTask.mine_id.in_(ids)), ["mine_id", "due_date", "done_at"])
        self.capas = _frame(db, select(Capa.mine_id, Capa.created_at, Capa.due_at, Capa.closed_at)
                            .where(Capa.mine_id.in_(ids)), ["mine_id", "created_at", "due_at", "closed_at"])
        self.obs = _frame(db, select(Observation.mine_id, Observation.type, Observation.created_at)
                          .where(Observation.mine_id.in_(ids)), ["mine_id", "type", "created_at"])
        self.findings = _frame(db, select(Finding.mine_id, Finding.severity, Finding.created_at)
                               .where(Finding.mine_id.in_(ids)), ["mine_id", "severity", "created_at"])
        self.evidence = _frame(db, select(Evidence.mine_id, Evidence.trust_score, Evidence.created_at)
                               .where(Evidence.mine_id.in_(ids), Evidence.trust_score.is_not(None)),
                               ["mine_id", "trust_score", "created_at"])
        self.workers = _frame(db, select(Contractor.mine_id, Worker.training_valid_till, Worker.created_at)
                              .join(Contractor, Worker.contractor_id == Contractor.id)
                              .where(Contractor.mine_id.in_(ids), Worker.is_active.is_(True)),
                              ["mine_id", "training_valid_till", "created_at"])
        day = func.date(Attendance.time)
        self.attendance = _frame(db, select(Attendance.mine_id, day, func.count(),
                                            func.sum(case((Attendance.valid.is_(False), 1), else_=0)))
                                 .where(Attendance.mine_id.in_(ids)).group_by(Attendance.mine_id, day),
                                 ["mine_id", "day", "total", "invalid"])
        for frame, cols in ((self.tasks, ["done_at"]), (self.capas, ["created_at", "due_at", "closed_at"]),
                            (self.obs, ["created_at"]), (self.findings, ["created_at"]),
                            (self.evidence, ["created_at"]), (self.workers, ["created_at"])):
            for col in cols:
                frame[col] = _utc(frame[col])
        self.tasks["due_date"] = pd.to_datetime(self.tasks["due_date"])
        self.workers["training_valid_till"] = pd.to_datetime(self.workers["training_valid_till"])
        self.attendance["day"] = pd.to_datetime(self.attendance["day"])
        self.attendance["invalid"] = self.attendance["invalid"].fillna(0).astype(float)
        self.attendance["total"] = self.attendance["total"].astype(float)
        # split once per mine into plain numpy arrays (nanoseconds; missing time = NEVER): features_at() is
        # called thousands of times while training, and numpy is ~20x faster than pandas for this
        self._arrays = {m: self._mine_arrays(m) for m in ids}

    @staticmethod
    def _ns(series: pd.Series) -> np.ndarray:
        values = pd.to_datetime(series, utc=True) if getattr(series.dtype, "tz", None) else pd.to_datetime(series)
        out = values.to_numpy(dtype="datetime64[ns]").astype("int64")
        out[values.isna().to_numpy()] = NEVER
        return out

    def _mine_arrays(self, m: int) -> dict[str, np.ndarray]:
        t = self.tasks[self.tasks.mine_id == m]
        c = self.capas[self.capas.mine_id == m]
        o = self.obs[self.obs.mine_id == m]
        f = self.findings[self.findings.mine_id == m]
        e = self.evidence[self.evidence.mine_id == m]
        w = self.workers[self.workers.mine_id == m]
        a = self.attendance[self.attendance.mine_id == m]
        return {
            "task_due": self._ns(t.due_date), "task_done": self._ns(t.done_at),
            "capa_created": self._ns(c.created_at), "capa_due": self._ns(c.due_at), "capa_closed": self._ns(c.closed_at),
            "obs_time": self._ns(o.created_at), "obs_type": o.type.to_numpy(dtype=object),
            "finding_time": self._ns(f.created_at),
            "finding_serious": f.severity.isin(["critical", "high"]).to_numpy(),
            "ev_time": self._ns(e.created_at), "ev_low": (e.trust_score < LOW_TRUST).to_numpy(),
            "worker_since": self._ns(w.created_at), "worker_training": self._ns(w.training_valid_till),
            "att_day": self._ns(a.day), "att_total": a.total.to_numpy(dtype=float),
            "att_invalid": a.invalid.to_numpy(dtype=float),
        }

    def first_activity(self) -> datetime | None:
        stamps = [s.min() for s in (self.capas["created_at"], self.obs["created_at"], self.findings["created_at"])
                  if len(s)]
        return min(stamps).to_pydatetime() if stamps else None

    # ------------------------------------------------------------------ features at one moment
    def features_at(self, mine_id: int, as_of: pd.Timestamp) -> dict:
        x = self._arrays[mine_id]
        now = as_of.value                                                   # UTC nanoseconds
        local_day = as_of.tz_convert(IST).tz_localize(None).normalize()
        today = local_day.value                                             # IST calendar day (naive ns)

        def window(times, days):
            return (times <= now) & (times > now - days * DAY)

        due_window = (x["task_due"] < today) & (x["task_due"] >= today - 30 * DAY)
        is_open = (x["capa_created"] <= now) & (x["capa_closed"] > now)
        closed_8w = (x["capa_closed"] <= now) & (x["capa_closed"] > now - 56 * DAY)
        close_days = (x["capa_closed"][closed_8w] - x["capa_created"][closed_8w]) / DAY
        o4, o12 = window(x["obs_time"], 28), window(x["obs_time"], 84)
        types4 = x["obs_type"][o4]
        e4 = window(x["ev_time"], 28)
        employed = x["worker_since"] <= now
        a4 = (x["att_day"] < today) & (x["att_day"] >= today - 28 * DAY)
        att_total = x["att_total"][a4].sum()
        return {
            "overdue_tasks_30d": int((due_window & (x["task_done"] > now)).sum()),
            "open_capas": int(is_open.sum()),
            "overdue_capas": int((is_open & (x["capa_due"] < now)).sum()),
            "avg_capa_close_days_8w": round(float(close_days.mean()), 2) if close_days.size else 0.0,
            "near_miss_4w": int((types4 == "near_miss").sum()),
            "unsafe_reports_4w": int(((types4 == "unsafe_act") | (types4 == "unsafe_condition")).sum()),
            "incidents_12w": int((x["obs_type"][o12] == "incident").sum()),
            "critical_findings_4w": int(x["finding_serious"][window(x["finding_time"], 28)].sum()),
            "expired_training_pct": round(100 * float((x["worker_training"][employed] < today).mean()), 2)
            if employed.any() else 0.0,
            "invalid_attendance_pct_4w": round(100 * float(x["att_invalid"][a4].sum()) / float(att_total), 2)
            if att_total else 0.0,
            "low_trust_evidence_pct_4w": round(100 * float(x["ev_low"][e4].mean()), 2) if e4.any() else 0.0,
            "is_monsoon": int(local_day.month in MONSOON_MONTHS),
        }

    def incident_within(self, mine_id: int, start: pd.Timestamp, days: int = LABEL_DAYS) -> int:
        """Label: at least one incident in (start, start + days]."""
        x = self._arrays[mine_id]
        hit = (x["obs_type"] == "incident") & (x["obs_time"] > start.value) & (x["obs_time"] <= start.value + days * DAY)
        return int(hit.any())


def live_features(db: Session, mine_ids: list[int], now: datetime) -> pd.DataFrame:
    data = MineData(db, mine_ids)
    as_of = pd.Timestamp(now).tz_convert("UTC") if pd.Timestamp(now).tzinfo else pd.Timestamp(now, tz="UTC")
    rows = [{"mine_id": m, "mine_name": data.names.get(m, str(m)), **data.features_at(m, as_of)}
            for m in mine_ids if m in data.names]
    return pd.DataFrame(rows, columns=["mine_id", "mine_name", *FEATURES])


def training_frame(db: Session, now: datetime, step_days: int = 1) -> pd.DataFrame:
    """One labelled row per mine per past day, for every day whose LABEL_DAYS outcome is already known."""
    mine_ids = list(db.scalars(select(OrgUnit.id).where(OrgUnit.type == "mine")))
    data = MineData(db, mine_ids)
    start = data.first_activity()
    if start is None:
        return pd.DataFrame(columns=["mine_id", "as_of", *FEATURES, "y"])
    now_ts = pd.Timestamp(now).tz_convert("UTC") if pd.Timestamp(now).tzinfo else pd.Timestamp(now, tz="UTC")
    # start after two weeks of history so the 4-week windows are not all empty
    first = pd.Timestamp(start).tz_convert("UTC") + pd.Timedelta(days=14)
    last = now_ts - pd.Timedelta(days=LABEL_DAYS)
    rows = []
    for as_of in pd.date_range(first, last, freq=f"{step_days}D"):
        for m in mine_ids:
            rows.append({"mine_id": m, "as_of": as_of, **data.features_at(m, as_of),
                         "y": data.incident_within(m, as_of)})
    frame = pd.DataFrame(rows, columns=["mine_id", "as_of", *FEATURES, "y"])
    return frame.astype({name: float for name in FEATURES})
