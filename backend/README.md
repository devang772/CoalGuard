# Khanan Netra: Backend API

AI-based smart governance and compliance monitoring for coal mines (SIH PS 26024).
Built with **FastAPI + PostgreSQL**.

## Status
| Module | What | Status |
|---|---|---|
| 1 | Foundation: setup, all tables, login, roles, scope filter | ✅ Done |
| 2 | Fake data generator + mine profile / applicable-obligation tables | ✅ Done |
| 3 | Mine profile, applicable obligations, compliance tasks, map data | ✅ Done |
| 4 | Inspections, findings, CAPA, approvals | ✅ Done |
| 5 | Satya Proof, before/after closure, tamper-proof audit | ✅ Done |
| 6 | Contractors, workers, attendance, fraud rules | ✅ Done |
| 7 | Field reports, SOS, grievances, notifications, offline sync | ⏳ |
| 8 | Reminders and escalation ladder | ⏳ |
| 9 | Dashboards, leaderboard, reports, final tests | ⏳ |
| AI | `app/ai/` + `app/routers/ai.py`, built by the AI/ML teammate from the shared ML/AI module plan | ⏳ |

## Quick start (Windows, Git Bash or PowerShell)
Needs: **Python 3.11**, **Docker Desktop** (running).

```bash
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # macOS/Linux: .venv/bin/python
cp .env.example .env            # then edit JWT_SECRET

docker compose up -d            # starts PostgreSQL on localhost:5434
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```
Open **http://localhost:8000/docs**. The first start creates all tables plus the starter data automatically.

### Fill the database with 6 months of sample activity
```bash
.venv/Scripts/python -m seed.generate            # 180 days ending today (~15 s)
.venv/Scripts/python -m seed.generate --reset    # wipe activity data and generate again
.venv/Scripts/python -m seed.generate --days 90 --seed 7
```
The same `--seed` always gives the same data, so everyone on the team sees identical records.
Mines and users are kept on `--reset`. All generated data is **sample data**.

Roughly created (180 days): 35 catalogue obligations, 12 mine profiles, ~330 mine-obligation links,
~4,700 compliance tasks, ~625 inspections, ~900 findings + CAPAs, ~1,900 evidence records, ~830 approvals,
~330 field reports (some Hindi voice), 15 contractors, 612 workers, ~41,000 attendance rows,
daily production and PM10/noise readings, 25 grievances.

**Planted patterns** (for the AI features and the demo):
1. Kusunda OCP gets riskier every week over the last 8 weeks (overdue tasks/CAPAs, near-misses, incidents)
2. Monsoon (Jul–Sep): more incidents, roof and water problems
3. Bastacolla OCP: 6 days where dispatch is ~50% of production
4. Moonidih UG, "Maa Tara Mining Works": attendance spikes on 5 days by workers with no gate entry,
   17 workers on one shared phone (`DEV-SHARED-7F3A`), 2 sharing a bank account, 3 paid below minimum wage
5. Repeated "haul road spillage" findings (different wording) at Kusunda (6×) and Bastacolla (5×)
6. PM10 dust spikes (>180 µg/m³) on 6 days at Ashoka OCP
7. One rejected CAPA closure at Moonidih (reused photo, 411 m away) and one unacknowledged SOS

### If you pulled a newer version and the tables changed
There are no migrations yet (hackathon speed). Rebuild your **local** database, then re-seed:
```bash
.venv/Scripts/python -c "from app import models; from app.db import Base, engine; Base.metadata.drop_all(engine); Base.metadata.create_all(engine)"
.venv/Scripts/python -m seed.generate
```

If port 5434 is busy, set `DB_PORT=5435` in your shell before `docker compose up -d`, and change the port in `DATABASE_URL` in `.env`.

### Log in on the /docs page
Click **Authorize** → username = phone, password = `demo123` → then try `GET /auth/me`.

| Phone | Role | Sees |
|---|---|---|
| 9000000001 | CIL Admin | all 12 mines |
| 9000000002 | Subsidiary Admin (BCCL) | 4 BCCL mines |
| 9000000003 | Area GM (Jharia) | Moonidih UG, Bastacolla OCP |
| 9000000004 | Mine Manager | Moonidih UG |
| 9000000005 | Regulator (DGMS, BCCL region) | 4 BCCL mines, read-only |
| 9000000006 | Contractor Admin | Moonidih UG |
| 9000000007 | Safety Officer | Moonidih UG |
| 9000000008 | Supervisor | Moonidih UG |
| 9000000009 | Worker | Moonidih UG |

Every other mine/area/subsidiary also gets a manager, safety officer, GM or admin (phones `91000000xx`, same password), so escalations always have someone to notify.

## Team handoff notes
Updated after every module:
- [docs/FOR_FRONTEND_TEAM.md](docs/FOR_FRONTEND_TEAM.md): endpoints, response shapes, flow changes, demo stories
- [docs/FOR_ML_TEAM.md](docs/FOR_ML_TEAM.md): tables, training data, planted patterns, plug-in contracts

## Photo uploads
Photos are stored under `backend/uploads/YYYY/MM/` (set `UPLOAD_DIR` to change; the folder is git-ignored).
Each upload is checked automatically (Satya Proof) and gets a trust score; see `app/services/proof.py`.

## Run tests
```bash
.venv/Scripts/python -m pytest -q
```
The tests use a temporary SQLite database, so they don't need Docker.

## Project layout
```
app/
  main.py        # app entry: creates tables, runs starter data, plugs in routers
  config.py      # settings from .env
  db.py          # database connection + get_db
  models.py      # ALL tables (23)
  schemas.py     # request/response shapes
  constants.py   # roles, org types, severities, categories, frequencies
  security.py    # bcrypt password hashing, JWT tokens
  auth.py        # get_current_user, require_roles, scope_mine_ids, ensure_mine_access
  routers/       # one file per feature area (auth, health, ...)
  services/
    applicability.py   # fallback "which obligations apply to this mine profile" matcher
    obligation_sync.py # profile -> ML engine (or fallback) -> mine_obligations -> tasks
    tasks.py           # task maker, overdue marker, compliance %
    risk.py            # risk % per mine (ML model or simple score)
    mines.py           # mine summary numbers for lists and the map
    capa.py            # CAPA creation from a finding (owner, deadline), closure-check hook
    approvals.py       # tamper-evident approvals (hash chain per record)
    proof.py           # Satya Proof: photo trust checks + score
    evidence.py        # evidence locker: file storage, signed image links, placeholder
    geo.py             # distances, inside-the-mine-boundary check
    audit.py           # automatic hash-chained history of every change + verify
    workforce.py       # validity status, bank-account fingerprint, attendance rules
    fraud.py           # ghost-worker / labour-compliance alerts + contractor score
  deps.py        # shared router helpers (mine-in-scope check, filters, pagination)
seed/bootstrap.py  # org tree (CIL > 3 subsidiaries > 6 areas > 12 mines) + demo users + escalation rules
seed/generate.py   # 6 months of sample activity with planted patterns
seed/sample_data.py  # sample obligation catalogue, mine profiles, checklists, texts, names
tests/
```

## Compliance flow: mine profile → applicable obligations → tasks
Users do **not** upload rule PDFs. The mine manager fills a **mine profile** (`mine_profiles`: working
method, depth, gas degree, workers, explosives, conveyors, HEMM, water body, forest land, EC/CTO…).
The **ML engine** (already trained on the laws/circulars) returns the obligations that apply, each with
a reason; they are stored in `mine_obligations` and turned into `compliance_tasks`.

Plug-in point for the ML teammate (Module 3 calls it; falls back to `app/services/applicability.py` if missing):
```python
# app/ai/obligation_engine.py
def recommend_obligations(profile: dict) -> list[dict]:
    """profile: the mine_profiles fields as a dict.
    Return [{code, title, law_ref, category, frequency, evidence_needed, severity,
             source_text, reason, confidence}, ...]"""
```
`category` ∈ safety/environment/labour/production; `frequency` ∈ daily/weekly/monthly/quarterly/yearly;
`severity` ∈ low/medium/high/critical. `code` must be stable (it is used to avoid duplicates).

## Key rules for everyone adding code
- **Always filter by scope:** `ids = scope_mine_ids(db, user, org_id)`; for a single mine use `ensure_mine_access(db, user, mine_id)`.
- **Restrict writes by role:** `Depends(require_roles(Role.MINE_MANAGER, ...))`.
- **Don't rename tables/columns** in `models.py` without telling the frontend and AI teammates.
- Times are stored in **UTC**; use `app.utils.utcnow()`.
- Mine names and boundaries in the starter data are **sample data**, not official records.

## API so far
| Method | Path | What |
|---|---|---|
| GET | `/health` | API + database check |
| POST | `/auth/login` | `{phone, password}` → `{access_token, user}` |
| GET | `/auth/me` | current user (with `mine_id`/`mine_name` if the user belongs to a mine) |
| GET | `/org/tree`, `/org/units?type=` | org tree / flat units below the user's own unit |
| GET | `/mines`, `/mines/{id}` | mine summaries: compliance %, overdue tasks, open CAPAs, risk |
| GET, PUT | `/mines/{id}/profile` | mine profile; saving re-computes applicable obligations + tasks |
| GET | `/mines/{id}/obligations` | applicable obligations with the reason |
| PATCH | `/mines/{id}/obligations/{link_id}` | mark not applicable (remark required) / active again |
| POST | `/mines/{id}/obligations/refresh` | ask the ML engine again with the saved profile |
| GET | `/obligations` | obligation catalogue |
| GET | `/mines/{id}/calendar?month=` | per-day done / pending / overdue counts |
| GET | `/mines/{id}/compliance` | compliance % (default last 30 days), by category |
| GET | `/tasks` | paginated compliance tasks with filters |
| GET | `/tasks/summary` | counts for quick tabs / mobile home |
| GET | `/tasks/{id}` | one task |
| POST | `/tasks/{id}/complete` | mark done (idempotent with `client_uuid`) |
| POST | `/tasks/generate` | create current-period tasks, mark overdue |
| GET | `/gis/mines` | GeoJSON mine boundaries with status properties |
| GET | `/gis/pins` | findings / observations / incidents / SOS pins |
| GET | `/checklists?mine_id=` | inspection checklists that fit the mine |
| POST | `/inspections` | start an inspection (regulators: DGMS/SPCB only) |
| GET | `/inspections`, `/inspections/{id}` | list (paginated) / detail with findings |
| POST | `/inspections/{id}/findings` | add a finding → CAPA created automatically |
| POST | `/inspections/{id}/submit` | submit and lock the inspection |
| GET | `/capa`, `/capa/summary`, `/capa/{id}` | CAPA board, Kanban counts, detail with approval history |
| POST | `/capa/{id}/assign` | hand the CAPA to another person at the mine |
| POST | `/capa/{id}/request-closure` | "I fixed it" → in review |
| POST, GET | `/approvals` | approve / reject a fix (two-person rule), history |
| POST | `/evidence` | upload a photo → trust score 0-100 with reasons |
| GET | `/evidence/{id}`, `/evidence?ids=` | evidence details with a signed image `url` |
| GET | `/evidence/{id}/file` | the image (signed link or Bearer token) |
| GET | `/audit/verify` | verify the history chain + detect edits made outside the app |
| GET | `/audit/recent`, `/audit/{table}/{id}` | recent changes / full history of one record |
| GET, POST | `/contractors` | contractors ranked by score (lowest first) / add one |
| GET, PATCH | `/contractors/{id}` | Contractor 360 (stats + alerts + score) / edit |
| GET | `/contractors/{id}/alerts` | ghost-worker + labour-compliance alerts |
| GET, POST | `/contractors/{id}/workers` | workers with validity + flags / add one |
| GET, PATCH | `/workers/{id}` | one worker / edit or deactivate |
| POST | `/attendance` | mark attendance (self with selfie, or gate kiosk) with reasons |
| GET | `/attendance`, `/attendance/summary`, `/attendance/me` | monitor / KPI counts / own history |

Full request/response details: [docs/FOR_FRONTEND_TEAM.md](docs/FOR_FRONTEND_TEAM.md).
