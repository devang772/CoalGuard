# Khanan Netra: Backend API

AI-based smart governance and compliance monitoring for coal mines (SIH PS 26024).
Built with **FastAPI + PostgreSQL**.

## Status
| Module | What | Status |
|---|---|---|
| 1 | Foundation: setup, all tables, login, roles, scope filter | ✅ Done |
| 2 | Fake data generator | ⏳ |
| 3 | Mines, map data, rules, compliance tasks | ⏳ |
| 4 | Inspections, findings, CAPA, approvals | ⏳ |
| 5 | Satya Proof, before/after closure, tamper-proof audit | ⏳ |
| 6 | Contractors, workers, attendance, fraud rules | ⏳ |
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
  models.py      # ALL tables (21)
  schemas.py     # request/response shapes
  constants.py   # roles, org types, severities, categories, frequencies
  security.py    # bcrypt password hashing, JWT tokens
  auth.py        # get_current_user, require_roles, scope_mine_ids, ensure_mine_access
  routers/       # one file per feature area (auth, health, ...)
seed/bootstrap.py  # org tree (CIL > 3 subsidiaries > 6 areas > 12 mines) + demo users + escalation rules
tests/
```

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
