# Backend updates for the Frontend team (web + mobile)

This file is updated after **every backend module**. Newest module is at the bottom of the changelog.
Branch: `backend` · Folder: `backend/` · Live API docs (when running): **http://localhost:8000/docs**

---

## 1. Current state at a glance
| Module | Status | What you can use |
|---|---|---|
| 1. Foundation (login, roles, scope) | ✅ | `POST /auth/login`, `GET /auth/me`, `GET /health` |
| 2. Sample data + mine-profile model | ✅ | 6 months of realistic data in the database (no new endpoints yet) |
| 3. Mine profile, applicable obligations, tasks, map | ⏳ next | |
| 4. Inspections, findings, CAPA, approvals | ⏳ | |
| 5. Satya Proof, before/after closure, audit | ⏳ | |
| 6. Contractors, workers, attendance, fraud | ⏳ | |
| 7. Field reports, SOS, grievances, notifications, sync | ⏳ | |
| 8. Reminders + escalation | ⏳ | |
| 9. Dashboards, leaderboard, reports | ⏳ | |

Until an endpoint exists, keep using your **mock data**, but shape it like the contracts in your frontend prompt
(and the changes listed below).

---

## 2. How to run the backend on your laptop
Needs Python 3.11 and Docker Desktop.
```bash
git fetch origin && git checkout backend
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt      # macOS/Linux: .venv/bin/python
cp .env.example .env
docker compose up -d                                        # PostgreSQL on localhost:5434
.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
.venv/Scripts/python -m seed.generate                       # fill 6 months of sample data (~15 s)
```
- Web: set `VITE_API_URL=http://localhost:8000`
- Mobile on a real phone: use your laptop's Wi-Fi IP, e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.20:8000`,
  and start the server with `--host 0.0.0.0`.
- CORS is open (`*`) for the hackathon, so any frontend origin works.

---

## 3. Rules that apply to every endpoint
- **Auth header:** `Authorization: Bearer <access_token>` on every request except `/auth/login` and `/health`.
- **Errors** always look like `{"detail": "human readable message"}`.
  - `401`: not logged in / token expired → send the user to login.
  - `403`: logged in but not allowed (wrong role, or mine outside their area) → show the message.
  - `422`: form data invalid (FastAPI shows which field in `detail`).
- **Times** are sent in **UTC** (ISO format, no timezone suffix, e.g. `2026-09-26T05:30:00`).
  Convert to IST for display (add 5 h 30 min).
- **Scope:** the backend already filters data to the user's area. Web "Scope Switcher" → send `?org_id=<id>`
  on list/dashboard calls; it can only **narrow** what the user sees, never widen it.
- **Token lifetime:** 12 hours.

---

## 4. Demo logins (password for all: `demo123`)
| Phone | Role (`role` value) | Org | Sees |
|---|---|---|---|
| 9000000001 | `cil_admin` | Coal India Limited | all 12 mines |
| 9000000002 | `subsidiary_admin` | BCCL | 4 BCCL mines |
| 9000000003 | `area_gm` | Jharia Area | Moonidih UG, Bastacolla OCP |
| 9000000004 | `mine_manager` | Moonidih UG | Moonidih UG |
| 9000000005 | `regulator` | BCCL (DGMS) | 4 BCCL mines, read-only |
| 9000000006 | `contractor_admin` | Moonidih UG | Moonidih UG (own contractor) |
| 9000000007 | `safety_officer` | Moonidih UG | Moonidih UG |
| 9000000008 | `supervisor` | Moonidih UG | Moonidih UG |
| 9000000009 | `worker` | Moonidih UG | Moonidih UG |

Other mines/areas/subsidiaries also have managers, safety officers, GMs, admins (phones `91000000xx`, same password).

---

## 5. Changelog

### Module 1: Foundation ✅
**Endpoints**
- `GET /health` → `{"status": "ok", "database": "connected"}`
- `POST /auth/login` body `{"phone": "9000000004", "password": "demo123"}` →
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": 4, "name": "Vikram Mahato (Manager Moonidih)", "phone": "9000000004",
    "role": "mine_manager", "language": "en",
    "org_unit_id": 4, "org_name": "Moonidih UG", "org_type": "mine",
    "mine_id": 4, "mine_name": "Moonidih UG"
  }
}
```
  `mine_id` / `mine_name` are `null` for users above mine level (GM, admins, regulator).
  `org_type` ∈ `cil | subsidiary | area | mine`.
- `GET /auth/me` → the same `user` object.

**Roles:** `worker, supervisor, safety_officer, mine_manager, area_gm, subsidiary_admin, cil_admin, regulator, contractor_admin`.

**Org tree (sample):** CIL → BCCL (Jharia Area: Moonidih UG, Bastacolla OCP · Kusunda Area: Kusunda OCP, Dhansar UG),
CCL (Piparwar Area: Ashoka OCP, Piparwar OCP · Barka-Sayal Area: Urimari OCP, Bhurkunda UG),
MCL (Talcher Area: Lingaraj OCP, Jagannath OCP · Ib Valley Area: Lajkura OCP, Samaleswari OCP).
Every mine has a **GeoJSON Polygon** boundary (for the map) and a centre lat/lng.

---

### Module 2: Sample data + mine-profile compliance model ✅
**No new endpoints** in this module; it prepares the data and the database design.

#### ⚠️ Change of flow: no rule-PDF upload
Users **no longer upload** laws or circulars. The ML engine already knows the laws.
**Replace the "Rule Studio (upload PDF)" screen** with two screens:

**A. Mine Profile (web + optionally mobile, mine manager edits, others view)**: a form with these fields:
| Field | Type | Values / example |
|---|---|---|
| `working_method` | select | `UG` (underground) · `OC` (open-cast) · `MIXED` |
| `depth_m` | number | 380 |
| `seam_gas_degree` | select (UG only) | 1 · 2 · 3 |
| `worker_count` | number | 1450 |
| `contract_worker_count` | number | 320 |
| `production_capacity_mtpa` | number | 0.6 |
| `uses_explosives` | toggle | true/false |
| `has_conveyor` | toggle | |
| `has_hemm` | toggle | heavy earth-moving machinery |
| `has_washery` | toggle | |
| `near_water_body` | toggle | |
| `forest_land` | toggle | |
| `ec_number` | text | Environmental Clearance number |
| `cto_valid_till` | date | Consent to Operate expiry |
| `state` | text | Jharkhand |

On save, the backend asks the ML engine which laws apply and creates the task calendar automatically.

**B. Applicable Obligations (web)**: a table of rules that apply to the selected mine:
title, law reference, category chip, frequency, severity, **"Why it applies"** (a sentence such as
*"Applies because the working method is underground and the seam gas degree is 2."*), source badge
(`ml_engine` / `rules_fallback`), confidence, and a **"Mark not applicable"** action (needs a remark).

The exact endpoints for A and B arrive in **Module 3**; planned shapes:
- `GET /mines/{id}/profile`, `PUT /mines/{id}/profile`
- `GET /mines/{id}/obligations` → `[{id, obligation: {code, title, law_ref, category, frequency, severity, evidence_needed}, status, reason, confidence, source}]`
- `PATCH /mines/{id}/obligations/{link_id}` `{status: "not_applicable" | "active", remark}`

**Removed from the old contract:** `applies_to_mine_ids` on obligations (replaced by the per-mine list above),
and the `/ai/parse-rules` upload flow for end users.

**New fields on an obligation:** `code` (stable id like `SAF-ROOF-D`), `source` (`ml_engine | catalogue | manual`).

#### What sample data now exists (after `python -m seed.generate`)
About 180 days ending today: ~4,700 compliance tasks (done / pending / overdue with escalation level 0–3),
~650 inspections, ~850 findings each with a CAPA (open / in_review / closed / rejected), ~1,900 photo
evidence records with trust scores and flags, ~550 field reports (near-miss, unsafe act/condition,
incident, SOS; ~20% Hindi voice with transcript), 15 contractors, 612 workers, ~41,000 attendance rows,
daily production/dispatch and PM10/noise per mine, 25 grievances (many anonymous), a few notifications.

**Values you'll see (use these for chips/colours):**
- Finding / observation `category`: `roof, haul_road, conveyor, electrical, fire, water, dust, ppe, machinery, explosives, other`
- Observation `type`: `unsafe_act, unsafe_condition, near_miss, incident, sos`; `source`: `app | voice`; `language`: `en | hi`
- `severity`: `low, medium, high, critical`
- Task `status`: `pending, done, overdue`; CAPA `status`: `open, in_review, closed, rejected`
- Grievance `status`: `new, in_progress, resolved, closed`; `category`: `wages, safety, harassment, facilities, leave`
- Evidence `flags`: `outside_boundary, reused_photo, time_mismatch, no_exif, low_gps_accuracy, mock_location`
- Photo `file_path` for seeded records is a placeholder (`seed/evidence_N.jpg`, no real image). Show a
  placeholder image until Module 5 serves real uploads.

#### Demo stories already in the data (build your demo around these)
1. **Kusunda OCP** is the riskiest mine (most overdue tasks/CAPAs, rising near-misses, recent incidents).
2. **Monsoon (Jul–Sep)** has far more incidents than Apr–Jun.
3. **Bastacolla OCP**: 6 days where only ~50% of produced coal was dispatched.
4. **Moonidih UG → contractor "Maa Tara Mining Works"**: 17 workers on one phone (`DEV-SHARED-7F3A`),
   attendance spikes on 5 days with no gate entry, 3 workers paid ₹310/day (below the sample minimum ₹450).
5. **Repeated "haul road spillage"** at Kusunda (6×) and Bastacolla (5×).
6. **Ashoka OCP**: PM10 dust above 180 µg/m³ on 6 days (limit 100).
7. **Moonidih UG**: one **rejected** CAPA closure (reused photo, 412 m away) and one **unacknowledged SOS**.
8. Contractor licences: **Jharkhand Earthmovers** expires in 15 days, **Hazaribagh Contractors** already expired.
