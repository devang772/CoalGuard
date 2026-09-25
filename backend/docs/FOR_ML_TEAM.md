# Backend updates for the ML / AI teammate

This file is updated after **every backend module**. Newest module is at the bottom of the changelog.
Branch: `backend` · Folder: `backend/` · Your code goes in `backend/app/ai/` and `backend/app/routers/ai.py`.

---

## 1. Current state at a glance
| Module | Status | Relevant to you |
|---|---|---|
| 1. Foundation | ✅ | DB connection, `get_current_user`, `scope_mine_ids`, table names |
| 2. Sample data + mine-profile model | ✅ | **Your training data** + the obligation-engine contract |
| 3. Mine profile + obligations + tasks | ⏳ next | Calls your `recommend_obligations(profile)` |
| 4–9 | ⏳ | Dashboards will call your `predict_risk()`; CAPA closure will call `verify_hazard_gone()` if present |

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
| `inspections` | ~650 | ~2 per mine per week; `type` internal/statutory/dgms/spcb |
| `findings` | ~850 | `category`, `severity`, `description`, `created_at`, lat/lng |
| `capas` | ~850 | one per finding; `due_at`, `status`, `closed_at`, `escalation_level` |
| `evidence` | ~1,900 | `trust_score` 20–98, `flags` list |
| `observations` | ~550 | `type` unsafe_act/unsafe_condition/near_miss/incident/sos; ~20% `source='voice'`, `language='hi'`, Hindi `transcript` |
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
