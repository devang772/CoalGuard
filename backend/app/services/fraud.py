"""Ghost-worker and labour-compliance rules per contractor.

Plain, explainable rules (no black box). Each alert has a type, severity, a sentence and the workers involved.
The contractor score starts at 100 and loses points per alert (high 15, medium 7, low 3).
"""
from collections import defaultdict
from datetime import date, timedelta
from statistics import median

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Attendance, Contractor, Worker
from app.services.workforce import validity
from app.utils import IST_OFFSET, ist_day_start_utc, today_ist

WINDOW_DAYS = 30            # recent attendance window
SPIKE_WINDOW_DAYS = 60
SPIKE_MIN_EXTRA = 8         # a day is a spike if attendance > usual x 1.25 AND at least 8 more people
NO_GATE_MIN = 5             # this many self-marked records without gate entry -> alert
PENALTY = {"high": 15, "medium": 7, "low": 3}


def _alert(contractor_id: int, type_: str, severity: str, title: str, description: str,
           worker_ids: list[int] | None = None, count: int | None = None) -> dict:
    worker_ids = sorted(worker_ids or [])
    return {"id": f"{type_}-{contractor_id}", "contractor_id": contractor_id, "type": type_, "severity": severity,
            "title": title, "description": description, "worker_ids": worker_ids,
            "count": count if count is not None else len(worker_ids)}


def contractor_alerts(db: Session, contractor_ids: list[int], today: date | None = None) -> dict[int, list[dict]]:
    today = today or today_ist()
    alerts: dict[int, list[dict]] = {cid: [] for cid in contractor_ids}
    if not contractor_ids:
        return alerts
    contractors = {c.id: c for c in db.scalars(select(Contractor).where(Contractor.id.in_(contractor_ids)))}
    workers = list(db.scalars(select(Worker).where(Worker.contractor_id.in_(contractor_ids), Worker.is_active.is_(True))))
    by_contractor: dict[int, list[Worker]] = defaultdict(list)
    for w in workers:
        by_contractor[w.contractor_id].append(w)
    contractor_of = {w.id: w.contractor_id for w in workers}

    # attendance in the spike window (valid + invalid), grouped in Python by Indian calendar day
    since = ist_day_start_utc(today - timedelta(days=SPIKE_WINDOW_DAYS))
    recent_since = ist_day_start_utc(today - timedelta(days=WINDOW_DAYS))
    rows = db.execute(select(Attendance.worker_id, Attendance.time, Attendance.valid, Attendance.gate_entry,
                             Attendance.source, Attendance.device_id, Attendance.reason)
                      .where(Attendance.worker_id.in_(list(contractor_of)), Attendance.time >= since)).all()

    daily: dict[int, dict[date, int]] = defaultdict(lambda: defaultdict(int))
    no_gate: dict[int, set[int]] = defaultdict(set)
    no_gate_count: dict[int, int] = defaultdict(int)
    training_attempts: dict[int, set[int]] = defaultdict(set)
    self_devices: dict[int, dict[str, set[int]]] = defaultdict(lambda: defaultdict(set))
    for worker_id, moment, valid, gate, source, device, reason in rows:
        cid = contractor_of[worker_id]
        if valid:
            daily[cid][(moment + IST_OFFSET).date()] += 1
        if moment < recent_since:
            continue
        if valid and not gate:
            no_gate[cid].add(worker_id)
            no_gate_count[cid] += 1
        if not valid and reason and "training" in reason.lower():
            training_attempts[cid].add(worker_id)
        if source != "gate" and device:
            self_devices[cid][device].add(worker_id)

    for cid in contractor_ids:
        c, ws = contractors[cid], by_contractor.get(cid, [])
        out = alerts[cid]

        # 1. several workers on one phone
        devices: dict[str, set[int]] = defaultdict(set)
        for w in ws:
            if w.device_id:
                devices[w.device_id].add(w.id)
        for device, ids in self_devices[cid].items():
            devices[device] |= ids
        for device, ids in sorted(devices.items(), key=lambda kv: -len(kv[1])):
            if len(ids) >= 2:
                out.append(_alert(cid, "shared_device", "high", "Workers sharing one phone",
                                  f"{len(ids)} workers use the same phone ({device}). One person may be marking "
                                  f"attendance for others.", list(ids)))

        # 2. several workers on one bank account
        banks: dict[str, list[int]] = defaultdict(list)
        for w in ws:
            if w.bank_acc_hash:
                banks[w.bank_acc_hash].append(w.id)
        for ids in banks.values():
            if len(ids) >= 2:
                out.append(_alert(cid, "shared_bank", "high", "Workers sharing one bank account",
                                  f"Wages of {len(ids)} workers go to the same bank account.", ids))

        # 3. present in the app but never through the gate
        if no_gate_count[cid] >= NO_GATE_MIN:
            n = no_gate_count[cid]
            out.append(_alert(cid, "no_gate_entry", "high" if n >= 20 else "medium", "Attendance without gate entry",
                              f"{n} attendance records in the last {WINDOW_DAYS} days have no gate entry.",
                              list(no_gate[cid]), count=n))

        # 4. sudden jumps in daily attendance (possible ghost shift)
        counts = daily[cid]
        if len(counts) >= 10:
            usual = median(counts.values())
            spikes = sorted(d for d, n in counts.items() if n > usual * 1.25 and n - usual >= SPIKE_MIN_EXTRA)
            if spikes:
                worst = max(spikes, key=lambda d: counts[d])
                out.append(_alert(cid, "attendance_spike", "high", "Sudden attendance spikes",
                                  f"Attendance jumped on {len(spikes)} day(s), highest {counts[worst]} on "
                                  f"{worst:%d %b} (usual ~{round(usual)}). Possible ghost shift.", count=len(spikes)))

        # 5. safety training / medical expired
        expired_training = [w.id for w in ws if validity(w.training_valid_till, today) == "expired"]
        if expired_training or training_attempts[cid]:
            tried = training_attempts[cid]
            out.append(_alert(cid, "expired_training", "high" if tried else "medium", "Safety training expired",
                              f"{len(expired_training)} workers have expired safety training"
                              + (f"; {len(tried)} of them tried to enter the mine." if tried else "."),
                              sorted(set(expired_training) | tried)))
        expired_medical = [w.id for w in ws if validity(w.medical_valid_till, today) == "expired"]
        if expired_medical:
            out.append(_alert(cid, "expired_medical", "medium", "Medical fitness expired",
                              f"{len(expired_medical)} workers have an expired medical examination.", expired_medical))

        # 6. wages below the minimum
        low_paid = [w for w in ws if w.daily_wage is not None and w.daily_wage < settings.min_daily_wage]
        if low_paid:
            lowest = min(w.daily_wage for w in low_paid)
            out.append(_alert(cid, "below_min_wage", "high", "Paid below minimum wage",
                              f"{len(low_paid)} workers are paid below the minimum wage (lowest ₹{lowest:.0f}/day, "
                              f"minimum ₹{settings.min_daily_wage:.0f}/day).", [w.id for w in low_paid]))

        # 7. licence and insurance
        for field, label in (("licence_valid_till", "licence"), ("insurance_valid_till", "insurance")):
            till = getattr(c, field)
            state = validity(till, today)
            if state == "expired":
                out.append(_alert(cid, f"{label}_expired", "high", f"Contractor {label} expired",
                                  f"The contractor's {label} expired on {till:%d %b %Y}."))
            elif state == "expiring":
                out.append(_alert(cid, f"{label}_expiring", "medium", f"Contractor {label} expiring",
                                  f"The contractor's {label} expires on {till:%d %b %Y} "
                                  f"({(till - today).days} days left)."))
    return alerts


def contractor_score(alerts: list[dict]) -> float:
    return float(max(0, 100 - sum(PENALTY[a["severity"]] for a in alerts)))
