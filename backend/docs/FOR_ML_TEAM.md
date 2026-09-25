# Backend updates for the ML / AI teammate

This file is updated after **every backend module**. Newest module is at the bottom of the changelog.
Branch: `backend` · Folder: `backend/` · Your code goes in `backend/app/ai/` and `backend/app/routers/ai.py`.

---

## 1. Current state at a glance
| Module | Status | Relevant to you |
|---|---|---|
| 1. Foundation | ✅ | DB connection, `get_current_user`, `scope_mine_ids`, table names |
| 2. Sample data + mine-profile model | ✅ | **Your training data** + the obligation-engine contract |
| 3. Mine profile + obligations + tasks | ✅ | **Calls your `recommend_obligations(profile)`** and **your `predict_risk(db, mine_ids)`** (both optional; safe fallbacks) |
| 4. Inspections, findings, CAPA | ✅ | findings/CAPAs now also created through the API; new CAPA columns; `approvals` table filled |
| 5. Satya Proof + audit | ✅ | **Calls your `verify_hazard_gone()`** during CAPA closure; real photo files + trust scores; audit history |
| 6. Contractors, attendance, fraud | ✅ | rule-based ghost-worker / labour alerts = your baseline; new attendance columns |
| 7. Field reports, SOS, grievances, sync | ✅ | voice reports stored with transcript + language; more near-miss/incident data; grievance texts |
| 8. Reminders + escalation | ⏳ next | — |
| 9. Dashboards + reports | ⏳ | dashboards reuse `predict_risk()` |

---

## 2. Get the data on your laptop
```bash
git fetch origin && git checkout backend
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
cp .env.example .env
docker compose up -d                     # PostgreSQL on localhost:5434
.venv/Scripts/python -m seed.generate    # 180 days of sample data (~15 s)
```
- Connection string: `postgresql+psycopg://netra:netra@localhost:5434/khanan_netra`
  (in code: `from app.db import engine, SessionLocal, get_db`).
- Quick pandas access: `pd.read_sql("select * from findings", engine)`.
- **Deterministic:** `--seed 42` (default) always gives the same data; try `--seed 7` to test that your
  model generalises. `--reset` regenerates. `--days 365` gives a longer history.
- If tables changed after a pull, rebuild your local DB (command in `backend/README.md`), then re-seed.

---

## 3. Helpers you must use (from Module 1)
```python
from app.db import get_db, SessionLocal, engine
from app.auth import get_current_user, require_roles, scope_mine_ids, ensure_mine_access
from app import models
from app.config import settings          # settings.min_daily_wage (450, sample), settings.pm10_limit (100)
```
- `scope_mine_ids(db, user, org_id=None) -> list[int]`: **filter every query** with it.
- `ensure_mine_access(db, user, mine_id)`: raises 403 if the mine is outside the user's area.
- Errors: raise `HTTPException(status_code, detail="message")`; AI outage → `503`.
- Times in the DB are **UTC without timezone**. India is UTC+5:30 (convert before "per day" grouping if
  you want Indian calendar days).

---

## 4. Changelog

### Module 1: Foundation ✅
- Tables created up front, names final. Org tree: `org_units.type` ∈ `cil | subsidiary | area | mine`;
  mines have `mine_type` (`UG`/`OC`), `boundary` (GeoJSON Polygon), `center_lat`, `center_lng`.
- 12 sample mines: Moonidih UG, Bastacolla OCP, Kusunda OCP, Dhansar UG (BCCL); Ashoka OCP, Piparwar OCP,
  Urimari OCP, Bhurkunda UG (CCL); Lingaraj OCP, Jagannath OCP, Lajkura OCP, Samaleswari OCP (MCL).
- Demo logins (password `demo123`): `9000000001` CIL admin (all mines) … `9000000004` Moonidih manager.
  Full list in `backend/README.md`.

---

### Module 2: Sample data + mine-profile compliance model ✅

#### ⚠️ Flow change: obligations come from the mine profile (no PDF upload by users)
The mine manager fills a **mine profile**. The backend calls **your function** to get the applicable
obligations, stores them per mine with the reason, and generates tasks. If your function is missing or
raises, the backend falls back to `app/services/applicability.py` (simple rule conditions).

**Contract (please implement exactly this):**
```python
# backend/app/ai/obligation_engine.py
def recommend_obligations(profile: dict) -> list[dict]:
    ...
```
Input `profile` keys (from table `mine_profiles`):
`working_method` (`UG|OC|MIXED`), `depth_m` (float|None), `seam_gas_degree` (1|2|3|None),
`worker_count` (int), `contract_worker_count` (int), `production_capacity_mtpa` (float|None),
`uses_explosives`, `has_conveyor`, `has_hemm`, `has_washery`, `near_water_body`, `forest_land` (bool),
`ec_number` (str|None), `cto_valid_till` (date|None), `state` (str|None).

Output: list of dicts, one per applicable obligation:
```python
{
  "code": "SAF-ROOF-D",               # stable unique id (used to avoid duplicates) - REQUIRED
  "title": "Inspect roof and sides of all working places every shift",
  "law_ref": "CMR 2017 (roof and side support)",
  "category": "safety",               # safety | environment | labour | production
  "frequency": "daily",               # daily | weekly | monthly | quarterly | yearly
  "evidence_needed": "Shift inspection note with geo-tagged photos",
  "severity": "critical",             # low | medium | high | critical
  "source_text": "...exact text from the law/circular...",
  "reason": "Applies because the mine is underground with Degree II gas.",
  "confidence": 0.93                  # 0..1
}
```
- The backend upserts by `code` into `obligations` (with `source="ml_engine"`) and links to the mine in
  `mine_obligations`. Keep codes stable across calls, or duplicates/unlinks will happen.
- Should return within ~20 s; the backend will call it with a timeout.
- You can look at the sample catalogue in `seed/sample_data.py` (`OBLIGATIONS`, 35 entries with
  `applies_when` conditions) to see the expected style, and to compare your engine's output
  (e.g. an underground Degree-II mine must get gas-monitoring duties; a mine without explosives must not get
  explosives duties).
- The old plan's `/ai/parse-rules` **user upload endpoint is no longer needed** (you ingest laws on your side).

#### Table changes in this module
- **New `mine_profiles`**: one row per mine: fields listed above + `mine_id`, `updated_by`, `updated_at`.
- **New `mine_obligations`**: `mine_id, obligation_id, status (active|not_applicable), reason, confidence,
  source (ml_engine|rules_fallback), remark, decided_by, decided_at, created_at`.
- **`obligations`**: added `code` (unique), `source` (`ml_engine|catalogue|manual`), `applies_when` (JSON);
  **removed** `applies_to_mine_ids`.

#### Your training data (what `seed.generate` creates, 180 days)
| Table | Rows (seed 42) | Notes for features |
|---|---|---|
| `compliance_tasks` | ~4,700 | `status` pending/done/overdue, `due_date`, `done_at`, `escalation_level` 0–3. Daily tasks only for the last 30 days; weekly+ for the full window |
| `inspections` | ~625 | ~2 per mine per week; `type` internal/statutory/dgms/spcb |
| `findings` | ~900 | `category`, `severity`, `description`, `created_at`, lat/lng |
| `capas` | ~900 | one per finding; `due_at`, `status`, `closed_at`, `escalation_level` |
| `evidence` | ~1,900 | `trust_score` 20–98, `flags` list |
| `observations` | ~330 | `type` unsafe_act/unsafe_condition/near_miss/incident/sos; ~20% `source='voice'`, `language='hi'`, Hindi `transcript` |
| `workers` | 612 | `training_valid_till`, `medical_valid_till`, `device_id`, `bank_acc_hash`, `daily_wage` |
| `attendance` | ~41,000 | last 90 days, Sundays off; `valid`, `reason`, `gate_entry`, `device_id` |
| `production_logs` | 2,160 | daily `produced_t`, `dispatched_t` per mine |
| `env_readings` | 2,160 | daily `pm10`, `noise` per mine (12:00 IST) |
| `grievances` | 25 | `category`, `text`, `status`, `sentiment` |

**How the data is generated (important for modelling):** every mine has a hidden daily "danger level"
(base 0.10–0.28; +0.20 in Jul–Sep; Kusunda ramps up by +0.55 over the last 8 weeks). Danger drives
overdue tasks, unclosed CAPAs, finding count/severity and near-misses, and **incident probability is
computed from danger and the near-miss count of the last 14 days**. So incidents genuinely follow the
warning signs; your features should be able to learn this.

#### Planted patterns you should detect (seed 42)
| # | Pattern | Where to look | Expected result |
|---|---|---|---|
| 1 | Rising risk | Kusunda OCP, last 8 weeks | Highest risk %: 13 open overdue CAPAs (others ≤2), 73 overdue tasks, ~25 warnings + 4 incidents in 8 weeks |
| 2 | Monsoon | all mines, Jul–Sep | ~22 incidents in Jul–Sep vs ~2 in Apr–Jun; more `water`/`roof` categories |
| 3 | Dispatch gap | Bastacolla OCP, `production_logs` | 6 days with `dispatched_t/produced_t` ≈ 0.45–0.55 (normal 0.92–1.04) |
| 4 | Ghost shift | Moonidih UG, contractor "Maa Tara Mining Works" | attendance 47–49 on the spike days vs ~36 normally; extra workers have `gate_entry=false` |
| 4b | Shared identity | same contractor | 17 workers with `device_id='DEV-SHARED-7F3A'`; 2 share one `bank_acc_hash`; 3 with `daily_wage=310` (< 450) |
| 5 | Recurring violation | `findings` with `category='haul_road'` | "spillage" 6× at Kusunda, 5× at Bastacolla, each worded differently |
| 6 | Dust spikes | Ashoka OCP, `env_readings` | 6 days with PM10 180–260 (others < 100) |
| 7 | Training expiry | Kusunda contractors | ~30% of workers with expired training (other mines ~5%) |

Tip: dates are relative to the day you run the generator (the window always ends "today").

#### Values you'll need
- Finding/observation `category`: `roof, haul_road, conveyor, electrical, fire, water, dust, ppe, machinery, explosives, other`
- `severity`: `low, medium, high, critical`
- Escalation SLA (hours to fix): critical 24, high 72, medium 168, low 360 (table `escalation_rules`)

---

### Module 3: Mine profile → obligations → tasks, map ✅
Your two plug-in points are now **live**. The backend imports your modules if they exist and falls back
safely if they don't, so you can merge at any time.

> Make `backend/app/ai/` a package (add an empty `app/ai/__init__.py`) so `import app.ai.obligation_engine` works.

#### A. `app/ai/obligation_engine.py` → `recommend_obligations(profile: dict) -> list[dict]`
**When it's called:** every time a mine profile is saved (`PUT /mines/{id}/profile`) and on
`POST /mines/{id}/obligations/refresh`. The input and output are exactly as described in Module 2.

**What the backend does with your answer** (`app/services/obligation_sync.py`):
1. It runs your function in a background thread with a **timeout of 20 s** (`ML_TIMEOUT_SECONDS` in `.env`).
2. **It falls back to the built-in rule matcher** if: your module or function is missing, it raises an
   exception, it times out, or it returns something that is not a list. The API response then says
   `"source": "rules_fallback"` with a `note` explaining why.
3. **Invalid items are dropped (and logged):** each item needs a non-empty `code`, `title`, `category`,
   `frequency` and `severity`, and the enum values must be valid.
4. Valid items are **upserted into `obligations` by `code`** (`source="ml_engine"`, `created_by_ai=True`). Their title,
   law_ref, category, frequency, severity, evidence_needed and source_text are updated every call.
5. The mine's links in `mine_obligations` are updated:
   - An obligation in your list that isn't linked yet → **added** as `active`, with your `reason` and `confidence`.
   - An obligation linked before but **missing from your list** → **`inactive`**, and its future tasks are deleted.
     ⚠️ **So return the COMPLETE list of obligations for the mine every time, not just the new ones.**
   - An obligation a manager marked `not_applicable` stays that way, even if you recommend it again.
6. Tasks are created for the current period of every active obligation.

**How to test your engine end-to-end:** start the server, log in as `9000000001` in `/docs`, call
`PUT /mines/5/profile` (Dhansar UG) or `POST /mines/4/obligations/refresh` (Moonidih UG), and check that the
response shows `"source": "ml_engine"` plus the `added` / `removed` codes. The automated tests in
`tests/test_compliance.py` (`test_ml_engine_*`) show how a fake engine is injected, so you can reuse the pattern.

**Sanity checks your engine should pass** (the fallback already does):
- An underground mine gets roof, gas and ventilation duties; an open-cast mine gets haul-road and bench duties instead.
- Gas monitoring only when `seam_gas_degree >= 2`; explosives duties only when `uses_explosives`;
  conveyor duties only when `has_conveyor`; garland drains only when `near_water_body`.
- The profile of every sample mine is in `seed/sample_data.py` (`MINE_PROFILES`).

#### B. `app/ai/risk_model.py` → `predict_risk(db, mine_ids: list[int]) -> list[dict]`
**Used by:** `GET /mines`, `GET /mines/{id}` and `GET /gis/mines` (map colours). Dashboards (Module 9) will reuse it.
Return one dict per mine:
```python
{"mine_id": 6, "risk_pct": 78.0, "level": "high",   # level optional: low <40, medium 40-69, high >=70
 "reasons": [{"factor": "Overdue CAPAs", "value": 12, "impact_pct": 28.0}, ...]}   # top 3
```
- Mines you leave out, or any exception, fall back to the **simple score** below, so partial answers are fine.
- It is called on every mines/map request, so keep it fast (**< 300 ms for 12 mines**). Load the trained model once
  at import time and cache features if needed.

**The simple score you are replacing** (`app/services/risk.py`, so you can compare):
`risk_pct = min(100, 4×overdue CAPAs + 0.4×overdue tasks (30 d) + 2×near-miss/unsafe reports (14 d) + 8×incidents (30 d) + 10×monsoon)`.
With seed 42 it gives Kusunda OCP 100 (high); every other mine scores about 20–48. Your model should also put Kusunda on top.

#### New data details you may use
- `mine_obligations.status` now has three values: `active`, `not_applicable` (manager decision) and `inactive`
  (no longer applies to the profile).
- Compliance % (backend definition): tasks done on or before their due date ÷ tasks that were due, grouped by the
  Indian calendar day (`app/services/tasks.py → compliance_stats`). With seed 42, Kusunda is ~50% and the others 73–88%.
- `today` is always the Indian date (`app.utils.today_ist()`). Use `ist_date(ts)` to convert stored UTC timestamps.

---

### Module 4: Inspections → Findings → CAPA + Approvals ✅
No new plug-in point in this module, but the data you train on changed a little. **Rebuild your local DB and
re-seed** (the commands are in `backend/README.md`), because new columns were added.

#### Table changes
- **`inspections`**: new `checklist_answers` (JSON list `[{item_id, answer: ok|not_ok|na}]`, filled when an inspection
  is submitted from the app; `null` in seeded data) and `notes`.
- **`capas`**: new `closure_requested_by` (user id), `closure_requested_at`, `closure_note`.
  Status meaning (important for features):
  - `open`: work to do · `in_review`: fix submitted, waiting for a second person · `closed`: approved (`closed_at` set)
  - `rejected`: the fix was not accepted, so the **work is still pending**. Treat it like `open` for "open/overdue CAPA" features.
  - "Overdue CAPA" in the backend = status `open` or `rejected` **and** `due_at < now`.
- **`approvals`** (now filled): `entity='capa'`, `entity_id` = CAPA id, `approver_id`, `decision` (`approve|reject`),
  `remark`, `hash`, `created_at`. Seeded closed CAPAs have one approval by the area GM.
  Possible feature: time from `closure_requested_at` to approval = the "review delay" per mine.
- **`findings.checklist_item_id`** (e.g. `RS-2`) links a finding to the checklist item that failed (API-created
  findings only). Checklist item texts are in the `checklists.items` JSON.

#### How new findings and CAPAs arrive now
Findings created through the app automatically get a CAPA: owner = the mine manager, `due_at = created_at + SLA`
(critical 24 h, high 72 h, medium 168 h, low 360 h). So `due_at - created_at` always tells you the severity's SLA,
and these rows look exactly like the seeded ones, meaning your models don't need a separate path for them.

#### Data counts (seed 42, after the rebuild)
~625 inspections, ~900 findings + CAPAs (≈56 open, 13 in review, ≈830 closed, 1 rejected; 23 overdue),
~830 approvals, ~330 field reports. The Kusunda/monsoon/Bastacolla/ghost/spillage/PM10 patterns are unchanged,
and Kusunda is still the only high-risk mine with the simple score.

---

### Module 5: Satya Proof + before/after closure + audit chain ✅
**Rebuild your local DB and re-seed** again (new columns). `pip install -r requirements.txt` for the new
libraries: Pillow, imagehash, shapely.

#### C. Your third plug-in point is live: `app/ai/photo_check.py` → `verify_hazard_gone(...)`
```python
def verify_hazard_gone(before_path: str, after_path: str, finding_text: str) -> dict:
    """before_path / after_path: absolute paths of the two photo files on disk.
    finding_text: the finding description, e.g. "Loose roof at goaf edge".
    Return {"hazard_gone": bool, "confidence": 0..1, "explanation": "one short sentence for the user"}"""
```
- **Called when** someone submits a CAPA fix with an after-photo AND the finding has a before-photo AND both files
  exist on disk (sample-data photos have no files, so they're skipped).
- It runs in a background thread with the same **20 s timeout** (`ML_TIMEOUT_SECONDS`). If your module is missing,
  raises, times out, or returns something without `hazard_gone`, the AI check is **silently skipped**, so the
  closure never gets stuck.
- Your result becomes the closure check `{"name": "AI: hazard no longer visible", "passed": hazard_gone,
  "detail": explanation}`. **`hazard_gone: False` rejects the closure automatically**, so keep false positives
  low (when unsure, return True with a low confidence).
- The test `tests/test_proof.py::test_ai_hazard_check_is_used_when_available` shows a fake module being injected.
- `POST /ai/photo-check` (single-photo PPE/hazard check) from your plan is independent; you can build it any time.

#### What the backend already does itself (no ML needed; don't duplicate)
Every upload gets a **trust score 0–100** from rule checks (`app/services/proof.py`): inside the mine boundary
(shapely), GPS accuracy ≤ 50 m, mock-location flag, exact copy (SHA-256) or look-alike (perceptual hash, Hamming
distance ≤ 5) of any earlier photo, time checks (phone clock, EXIF time, > 7 days old), EXIF camera details,
EXIF GPS vs phone GPS. Before/after closure adds: after-photo within 30 m, not the before-photo again, taken after
the finding, trust ≥ 60.

#### Table changes / data you can use
- **`evidence`**: new `checks` (JSON list `[{name, passed, penalty, detail}]`), `content_type`, `size_bytes`.
  Useful columns: `trust_score`, `flags`, `phash` (16-hex perceptual hash), `sha256`, `exif` (make, model,
  datetime_original, gps_lat/gps_lng), `lat/lng/accuracy`, `device_time` (capture time, UTC), `server_time`.
  Uploaded files live under `backend/uploads/YYYY/MM/<random>.jpg`. Use
  `app.services.evidence.file_on_disk(evidence)`, which returns the `Path`, or `None` for sample records.
  Sample-data evidence rows (`file_path` starting with `seed/`) have random phashes and **no image files**.
- **`audit_logs`** (the tamper-proof history), filled automatically for changes made through the app:
  `table_name, record_id, action (create|update|delete|seed), user_id, mine_id, data (JSON snapshot), prev_hash,
  hash, created_at`. It's a good source of **behaviour features** (e.g. how often CAPA owners are changed, how fast
  fixes are submitted, re-submissions after rejection). The sample data is one `seed` entry.
- Findings / CAPAs created through the app now carry real photos, so they're good for testing your photo models
  end-to-end: `POST /evidence` → `POST /inspections/{id}/findings` with `photo_evidence_id`.

#### One rule for any code that changes data
If your code **writes** to the database (e.g. saving obligations), use the ORM (`db.add`, attribute changes,
`db.delete`) and not bulk `update()`/`delete()` statements. Only ORM changes are recorded in the audit chain;
bulk statements would later show up as "changed outside the app" (a false tamper alarm).

---

### Module 6: Contractors, workers, attendance, ghost-worker alerts ✅
**Rebuild your local DB and re-seed** (new attendance columns).

#### Rule-based alerts = your baseline (`app/services/fraud.py → contractor_alerts(db, contractor_ids)`)
Plain rules per contractor over active workers and recent attendance:
| type | rule |
|---|---|
| `shared_device` | ≥ 2 workers with the same `workers.device_id`, or self-marked attendance from one device by several workers (last 30 d) |
| `shared_bank` | ≥ 2 workers with the same `bank_acc_hash` |
| `no_gate_entry` | ≥ 5 valid records without gate entry in 30 d (high when ≥ 20) |
| `attendance_spike` | in the last 60 d, a day's valid count > median × 1.25 **and** ≥ median + 8 (needs ≥ 10 days of data) |
| `expired_training` | active workers with expired training (high if any of them tried to enter) |
| `expired_medical` | active workers with an expired medical examination |
| `below_min_wage` | `daily_wage < settings.min_daily_wage` (450, sample value) |
| `licence_expired/_expiring`, `insurance_expired/_expiring` | validity dates (expiring = within 30 days) |

Score = 100 − (15 per high, 7 per medium, 3 per low alert). With seed 42: **Maa Tara Mining Works 3** (7 alerts:
17 on one phone, 2 on one bank account, 290 no-gate records, spikes on 4 days up to 47 vs a usual ~34,
3 workers at ₹310), Damodar Transport Co. 63, Hazaribagh Contractors 70, best is Shree Ganesh Enterprises 93.

**Where ML can add value** (optional, your call):
- Your **attendance anomaly** detector (plan feature 4) can be compared with `attendance_spike`. It should at least
  find the same Maa Tara days, and maybe subtler ones the fixed thresholds miss.
- Ideas the rules don't cover: the same selfie face / look-alike selfie across workers (`attendance.selfie_evidence_id` →
  `evidence.phash`), workers always marked within seconds of each other on one device, an unusual time of day.
- If you add an ML alert, return it in the same alert shape (`id, contractor_id, type, severity, title, description,
  worker_ids, count`) and tell the backend team; it can be merged into `contractor_alerts`.

#### Table changes
- **`attendance`**: new `source` (`self` = worker's phone · `gate` = kiosk scan) and `marked_by` (user id).
  `gate_entry` is true for gate scans (or when a gate scan is added to an earlier self-mark).
  Invalid attempts are stored with `valid=false` and `reason` (all failed rules joined by "; "), e.g.
  "Safety training expired on 10 Aug 2026: contact your supervisor." · "You are 2.2 km outside Moonidih UG." ·
  "Contractor licence expired on … : work not allowed." · "Fake GPS (mock location) app detected.".
- **`workers.bank_acc_hash`**: new accounts are stored as HMAC-SHA256 with a server secret (seeded ones are plain
  SHA-256 of a fake value). Only compare hashes for equality; there's nothing to decode.
- Seeded attendance rows have `source='self'`. The ghost-shift extras have `gate_entry=false`, and so do ~30% of Maa Tara's regular records.

---

### Module 7: Field reports, SOS, grievances, notifications, offline sync ✅
**Rebuild your local DB and re-seed** (new columns).

#### How your `/ai/voice` output is used
The mobile app calls **your** `POST /ai/voice`, shows the result, lets the worker correct it, and then sends it to
the backend's `POST /observations` like this, so please keep your output shape as in your plan:
| your field | goes into `observations.` |
|---|---|
| `transcript` (original words) | `transcript` (kept exactly, e.g. Hindi) |
| `language` (`hi`/`bn`/`or`/`en`) | `language` |
| `structured.type` | `type` (`unsafe_act`/`unsafe_condition`/`near_miss`/`incident`) |
| `structured.category` | `category` (one of the 11 hazard categories) |
| `structured.severity` | `severity` |
| `structured.hazard` (English sentence) | `text` |
| `structured.location_text` | `location_text` |
Plus `source='voice'`. Voice reports don't need a photo. If you return `structured: null`, the app shows an
empty form with the transcript filled in (as in your plan).

#### What happens to reports (useful labels for your models)
- **Incidents** and **high/critical unsafe conditions** are converted automatically into a `findings` row
  (`inspection_id = NULL`, description prefixed `[incident] ` or `[unsafe condition] `) + a CAPA.
  `observations.finding_id` links the two. Officers can also convert any report manually.
- So `findings` now has two sources: inspections (`inspection_id` set) and field reports (`inspection_id IS NULL`).
  Keep that in mind for the recurring-violation clustering (the prefix is easy to strip).
- `observations.acknowledged_at - created_at` = the response time. For SOS this is a "response delay" feature per mine.
- **Anonymous** reports/grievances have `reporter_id` / `user_id` = NULL, and their audit entry has `user_id` = NULL.
  Never try to re-identify reporters.

#### Grievances (optional ML)
`grievances(category, text, language, status, created_at, responded_at, sentiment)`. The `sentiment` column is
**empty for new grievances**. If you want, add a tiny function `app/ai/grievance_nlp.py → classify(text, language)
-> {"sentiment": "negative|neutral|positive", "topic": "..."}` and tell the backend team; it can be called on
submit. Not required for the demo.

#### Table changes
- `observations.finding_id` (new), `grievances.responded_by / responded_at / language` (new),
  `notifications.kind` (new: `sos, incident, finding, capa, grievance, general`).
