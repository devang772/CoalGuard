# Backend updates for the Frontend team (web + mobile)

This file is updated after **every backend module**. Newest module is at the bottom of the changelog.
Branch: `backend` · Folder: `backend/` · Live API docs (when running): **http://localhost:8000/docs**

---

## 1. Current state at a glance
| Module | Status | What you can use |
|---|---|---|
| 1. Foundation (login, roles, scope) | ✅ | `POST /auth/login`, `GET /auth/me`, `GET /health` |
| 2. Sample data + mine-profile model | ✅ | 6 months of realistic data in the database (no new endpoints yet) |
| 3. Mine profile, applicable obligations, tasks, map | ✅ | org tree, mines list/detail, mine profile, applicable obligations, tasks (list/summary/complete), calendar, compliance %, map boundaries + pins |
| 4. Inspections, findings, CAPA, approvals | ✅ | checklists, inspections (start/findings/submit/list/detail), CAPA board (list/summary/detail/assign/"I fixed it"), approve/reject with two-person rule |
| 5. Satya Proof, before/after closure, audit | ⏳ next | photo upload + trust score |
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
~625 inspections, ~900 findings each with a CAPA (open / in_review / closed / rejected), ~1,900 photo
evidence records with trust scores and flags, ~330 field reports (near-miss, unsafe act/condition,
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

---

### Module 3: Mine profile, applicable obligations, compliance tasks, map ✅
All endpoints are live in Swagger (`/docs`) and all of them respect the user's area automatically.

#### Screens you can now connect
| Screen | Endpoints |
|---|---|
| Web Scope Switcher (Subsidiary ▸ Area ▸ Mine) | `GET /org/tree` |
| Web Mines list / Mine Detail header | `GET /mines`, `GET /mines/{id}` |
| **Mine Profile** (form) | `GET /mines/{id}/profile`, `PUT /mines/{id}/profile` |
| **Applicable Obligations** | `GET /mines/{id}/obligations`, `PATCH /mines/{id}/obligations/{link_id}`, `POST /mines/{id}/obligations/refresh` |
| Web Compliance Tasks + task drawer | `GET /tasks`, `GET /tasks/{id}` |
| Quick tabs / mobile Home counters | `GET /tasks/summary` |
| Mobile "Do Task" → Mark complete | `POST /tasks/{id}/complete` |
| Mine Detail → Compliance Calendar tab | `GET /mines/{id}/calendar?month=YYYY-MM` |
| Compliance % cards | `GET /mines/{id}/compliance` |
| GIS Map | `GET /gis/mines`, `GET /gis/pins` |
| Admin "Generate tasks now" button | `POST /tasks/generate` |

#### Org & mines
- `GET /org/tree` → nested tree starting at the user's own unit (CIL admin gets everything):
  `{id, name, code, type, center_lat, center_lng, children: [...]}`
- `GET /org/units?type=mine` → flat list `[{id, name, code, type, parent_id, mine_type, center_lat, center_lng}]`
- `GET /mines?org_id=` → list of mine summaries:
```json
{
  "id": 6, "name": "Kusunda OCP", "code": "MINE-KUSUNDA-OCP", "mine_type": "OC",
  "subsidiary": "BCCL", "area": "Kusunda Area", "center_lat": 23.78, "center_lng": 86.392,
  "manager_name": "Mine Manager, Kusunda OCP",
  "compliance_pct": 50.2,
  "overdue_tasks": 73, "open_capas": 16,
  "risk": {"risk_pct": 100.0, "level": "high", "source": "simple_score",
           "reasons": [{"factor": "Overdue CAPAs", "value": 13, "impact_pct": 52.0}]}
}
```
  `compliance_pct` covers the last 30 days (`null` if nothing was due). `risk.source` is `simple_score` now and
  becomes `ml_model` automatically when the ML model is plugged in.
- `GET /mines/{id}` → the same, plus `boundary` (GeoJSON Polygon), `subsidiary_id`, `area_id`, `profile_filled` (bool).

#### Mine Profile
- `GET /mines/{id}/profile` → all profile fields (see the Module 2 table) + `mine_id, updated_by, updated_at`.
  `404` "Mine profile not filled yet" → show an empty form.
- `PUT /mines/{id}/profile` (roles: `mine_manager` for their own mine, `subsidiary_admin`, `cil_admin`). The body
  contains all profile fields. Rule: `seam_gas_degree` must be `null` when `working_method` is `OC` (otherwise `422`).
  Response:
```json
{
  "profile": {"mine_id": 4, "working_method": "UG", "...": "..."},
  "obligations": {
    "source": "rules_fallback",
    "added": ["SAF-EXPL-D", "SAF-MAG-W"],
    "removed": [],
    "kept_not_applicable": [],
    "unchanged": 26,
    "tasks_created": 4,
    "tasks_removed": 0,
    "note": "ML engine not installed yet; used the built-in rule matcher."
  }
}
```
  `source` is `ml_engine` or `rules_fallback`; `added` / `removed` are obligation codes; `kept_not_applicable`
  lists a manager's earlier "not applicable" decisions that were respected; `note` is `null` when the ML engine answered.
  **UI idea:** after saving, show a toast such as *"2 new obligations apply · 4 tasks created"* and list the codes.
  It's a good demo moment: turn "uses explosives" on and the explosives duties appear.
  The call can take up to ~20 s when the ML engine is slow, so show a spinner.

#### Applicable Obligations
- `GET /mines/{id}/obligations?status=active|not_applicable|inactive&category=` →
```json
[{
  "id": 41, "mine_id": 4, "status": "active",
  "reason": "Applies because the working method is underground and the seam gas degree is 2.",
  "confidence": 1.0, "source": "rules_fallback",
  "remark": null, "decided_by": null, "decided_at": null,
  "obligation": {"id": 5, "code": "SAF-GASMON-D", "title": "Check continuous methane monitors and alarm levels",
                 "law_ref": "CMR 2017 (gassy seams)", "category": "safety", "frequency": "daily",
                 "severity": "critical", "evidence_needed": "Monitor reading screenshot / photo",
                 "source": "catalogue", "source_text": "..."}
}]
```
  Status meaning: `active` = applies · `not_applicable` = a manager set it aside (show the remark) ·
  `inactive` = no longer applies to the current profile (a system decision).
- `PATCH /mines/{id}/obligations/{link_id}` (roles: `mine_manager`, `area_gm`, `subsidiary_admin`, `cil_admin`),
  body `{"status": "not_applicable", "remark": "why"}` (the remark is **required**, otherwise `422`) or `{"status": "active"}`.
  Setting an obligation aside removes its future tasks; re-activating it creates them again.
- `POST /mines/{id}/obligations/refresh` → same response as saving the profile (asks the ML engine again).
- `GET /obligations?category=&q=` → the full catalogue (a list of the `obligation` objects above).

#### Compliance tasks
- `GET /tasks` is **paginated** → `{"items": [...], "total": 4663, "page": 1, "page_size": 50}`.
  Query params: `org_id, mine_id, status (pending|done|overdue), due (today|week|overdue), category,
  from, to (YYYY-MM-DD, due-date range), escalation_level (0-3), q (search title/law), page, page_size (max 200)`.
  Order: overdue first, then pending, then done, each by due date. One item:
```json
{
  "id": 812, "mine_id": 4, "mine_name": "Moonidih UG", "due_date": "2026-09-24",
  "status": "overdue", "escalation_level": 1, "days_overdue": 2,
  "done_by": null, "done_by_name": null, "done_at": null, "remarks": null, "evidence_id": null,
  "obligation": {"id": 2, "code": "SAF-ROOF-D", "title": "Inspect roof and sides of all working places every shift",
                 "law_ref": "CMR 2017 (roof and side support)", "category": "safety", "frequency": "daily",
                 "severity": "critical", "evidence_needed": "Shift inspection note with geo-tagged photos"}
}
```
  `evidence_id` is only an id for now; photo details (URL, trust score) arrive in Module 5.
- `GET /tasks/summary?org_id=&mine_id=` → `{"due_today": 6, "due_this_week": 33, "overdue": 23, "done_today": 7, "pending": 36}`
- `GET /tasks/{id}` → one item.
- `POST /tasks/{id}/complete` (roles: `supervisor`, `safety_officer`, `mine_manager`), body
  `{"remarks": "Checked", "evidence_id": null, "client_uuid": "uuid-from-the-phone"}`.
  Returns `409` if the task is already done, **except** when the same `client_uuid` is sent again (an offline retry),
  which returns `200` with the task. Workers and regulators get `403`.
- `POST /tasks/generate` (roles: `mine_manager`, `subsidiary_admin`, `cil_admin`) → `{"created": 0, "marked_overdue": 0}`.
  It also runs automatically when the server starts.
- **Due-date rules:** daily = every day · weekly = Sunday · monthly = last day of the month ·
  quarterly = end of Mar/Jun/Sep/Dec · yearly = 31 March. Daily tasks exist for today and the next 2 days.

#### Calendar and compliance %
- `GET /mines/{id}/calendar?month=2026-09` → one entry per day: `[{"date": "2026-09-01", "done": 9, "pending": 0, "overdue": 1}]`
- `GET /mines/{id}/compliance?from=&to=` (default: last 30 days) →
  `{"from_date", "to_date", "due", "done_on_time", "done_late", "overdue", "compliance_pct", "by_category": [{"category", "due", "done_on_time", "compliance_pct"}]}`.
  Compliance % = tasks done on or before their due date ÷ tasks that were due (today's tasks aren't counted yet).

#### Map
- `GET /gis/mines?org_id=` → a GeoJSON `FeatureCollection`. Each feature's `geometry` is the mine polygon, and its
  `properties` are `{id, name, code, mine_type, subsidiary, area, center_lat, center_lng, compliance_pct,
  overdue_tasks, open_capas, risk_pct, risk_level}`. Colour by `risk_level` (low = green, medium = amber, high = red).
  In Leaflet, `L.geoJSON(data)` works directly.
- `GET /gis/pins?org_id=&mine_id=&types=finding,observation,incident,sos&severity=high,critical&from=&to=`
  (default: last 30 days, SOS first, max 2000) →
  `[{"id": "observation-12", "type": "sos", "subtype": "sos", "lat", "lng", "severity", "title", "mine_id",
  "mine_name", "created_at", "acknowledged": false}]`. `type` ∈ `finding | observation | incident | sos`;
  `subtype` = the finding category or observation type; `acknowledged` is only set for SOS pins.

#### Real numbers you'll see with the sample data (seed 42)
Kusunda OCP is the only **high**-risk mine (100%, compliance ~50%). The others are low or medium (compliance 73–88%).
Pins for the last 30 days: ~240 (3 SOS, ~180 findings, ~9 incidents, ~50 observations).

---

### Module 4: Inspections → Findings → CAPA + Approvals ✅

#### Screens you can now connect
| Screen | Endpoints |
|---|---|
| Mobile: Start Inspection (choose checklist) | `GET /checklists?mine_id=`, `POST /inspections` |
| Mobile: Checklist + Add Finding | `POST /inspections/{id}/findings` |
| Mobile: Review & Submit | `POST /inspections/{id}/submit` |
| Web: Inspections list + detail | `GET /inspections`, `GET /inspections/{id}` |
| Web: CAPA Board (Kanban + table) | `GET /capa`, `GET /capa/summary` |
| Web + mobile: CAPA detail | `GET /capa/{id}` |
| Web: reassign owner | `POST /capa/{id}/assign` |
| Mobile: "I fixed it" (My CAPAs → Close) | `POST /capa/{id}/request-closure` |
| Web: Approve / Reject buttons | `POST /approvals`, history via `GET /approvals?entity=capa&entity_id=` |

#### The flow (and who can do what)
```
Start inspection ──► add findings ──► submit (locked)
                         │
                         └─► each finding automatically creates a CAPA
                             owner = mine manager, deadline by severity
                             (critical 24 h · high 72 h · medium 7 days · low 15 days)

CAPA:  open ──"I fixed it"──► in_review ──approve──► closed
         ▲                        │
         └──── "I fixed it" ◄── rejected ◄──reject (remark required)
```
- **Who can inspect:** `supervisor, safety_officer, mine_manager, area_gm, subsidiary_admin, cil_admin, regulator`.
  Regulators can only use `type` = `dgms` or `spcb`, and only in their region. Workers and contractor admins can't.
- **Only the inspector** can add findings to or submit their own inspection. After submit → `409` on any change.
- **"I fixed it"** (`request-closure`): `supervisor, safety_officer, mine_manager` of that mine, or the CAPA owner.
  Allowed when the status is `open` or `rejected`.
- **Approve / reject:** `mine_manager, area_gm, subsidiary_admin, cil_admin`, only for CAPAs `in_review`.
  **Two-person rule:** whoever submitted the fix gets `403` if they try to approve or reject it themselves;
  the `detail` message says why. Show it nicely ("Someone else must check your fix").
- **Status `rejected`** means "the fix was not accepted; do it again". Show it in the **Rejected** column. The
  owner can press "I fixed it" again. (In Module 5, Satya Proof can also set `rejected` automatically when the
  after-photo fails the checks.)

#### Checklists
`GET /checklists?mine_id=4` → only checklists that fit the mine (UG / OC / both):
```json
[{"id": 3, "name": "Underground Roof Support Inspection", "mine_type": "UG",
  "items": [{"id": "RS-1", "text": "Roof bolts installed as per support plan", "category": "roof"}]}]
```
Tip: when the user taps **✗ Not OK** on an item, open Add Finding with `category = item.category` and
`checklist_item_id = item.id` pre-filled.

#### Inspections
- `POST /inspections` body `{"mine_id": 4, "type": "internal", "checklist_id": 3, "lat": 23.74, "lng": 86.35, "client_uuid": "..."}`
  → `201` with the inspection detail (see below). Sending the same `client_uuid` again → `200` with the same inspection (offline retry).
  `type` ∈ `internal | statutory | dgms | spcb`.
- `POST /inspections/{id}/findings` body:
```json
{"category": "roof", "description": "Crack in roof near conveyor 3", "severity": "critical",
 "law_ref": null, "lat": null, "lng": null, "photo_evidence_id": null,
 "checklist_item_id": "RS-2", "client_uuid": "..."}
```
  `lat/lng` default to the inspection's location. `photo_evidence_id` must be an existing evidence id of that mine
  (photo upload arrives in Module 5; until then send `null`). Response (`201`, or `200` for a `client_uuid` retry):
```json
{"id": 900, "inspection_id": 626, "mine_id": 4, "category": "roof", "description": "...", "severity": "critical",
 "law_ref": null, "lat": 23.7406, "lng": 86.348, "photo_evidence_id": null, "checklist_item_id": "RS-2",
 "created_at": "2026-09-25T19:37:16", "capa_id": 900, "capa_status": "open", "capa_due_at": "2026-09-26T19:37:16"}
```
  Categories: `roof, haul_road, conveyor, electrical, fire, water, dust, ppe, machinery, explosives, other`.
- `POST /inspections/{id}/submit` body `{"checklist_answers": [{"item_id": "RS-2", "answer": "not_ok"}], "notes": "..."}`
  (`answer` ∈ `ok | not_ok | na`).
- `GET /inspections?org_id=&mine_id=&type=&status=in_progress|submitted&inspector=me&from=&to=&page=&page_size=` → paginated.
  Item: `{id, mine_id, mine_name, inspector_id, inspector_name, type, status, checklist_id, lat, lng, started_at,
  submitted_at, findings_count, critical_count}`. Newest first.
- `GET /inspections/{id}` → the item + `checklist_answers`, `notes`, `findings: [finding objects as above]`.

#### CAPA board
- `GET /capa?org_id=&mine_id=&status=open,rejected&severity=high,critical&category=&owner=me&overdue=true&page=&page_size=`
  → paginated. Order: overdue first, then open ones by deadline, then closed. Item:
```json
{
  "id": 812, "mine_id": 4, "mine_name": "Moonidih UG", "status": "open",
  "owner": {"id": 4, "name": "Vikram Mahato (Manager Moonidih)", "role": "mine_manager"},
  "due_at": "2026-09-26T19:37:16", "overdue": false, "hours_left": 23.5, "escalation_level": 0,
  "finding": { ...finding object... },
  "closure_requested_by": null, "closure_requested_at": null, "closure_note": null,
  "after_evidence_id": null, "closure_checks": null, "closure_score": null,
  "closed_at": null, "created_at": "2026-09-25T19:37:16"
}
```
  `hours_left` is negative when overdue → show "Overdue by 2 days". `escalation_level` 1–3 = escalated to
  GM / subsidiary / CIL (the automatic escalation arrives in Module 8; seeded data already has levels).
  `closure_checks` is filled by Satya Proof in Module 5 (`[{name, passed, detail}]`).
- `GET /capa/summary` →
  `{"by_status": {"open": 56, "in_review": 13, "closed": 830, "rejected": 1}, "overdue": 23,
  "open_by_severity": {"low": 28, "medium": 19, "high": 21, "critical": 2}, "open_ageing": {"lt7": 36, "d7_30": 30, "gt30": 4}}`
  → Kanban column counts, "Open CAPA ageing" chart (`lt7` < 7 days, `d7_30` 7–30 days, `gt30` > 30 days).
- `GET /capa/{id}` → the item + `approvals: [{id, approver_id, approver_name, decision, remark, hash, created_at}]`
  + `approvals_verified` (true = nobody edited the approval history; show a green shield, red if false).
- `POST /capa/{id}/assign` body `{"owner_id": 7}` → new owner must be a supervisor / safety officer / manager
  **of that mine** (else `422`). Roles: `mine_manager, area_gm, subsidiary_admin, cil_admin`.
- `POST /capa/{id}/request-closure` body `{"evidence_id": null, "note": "Roof bolted"}` → returns the CAPA detail
  with `status: "in_review"`.

#### Approvals
- `POST /approvals` body `{"entity": "capa", "entity_id": 812, "decision": "approve" | "reject", "remark": "..."}`
  (`remark` required for reject) → `201`
  `{"id", "entity", "entity_id", "approver_id", "approver_name", "decision", "remark", "hash", "created_at"}`.
  Errors: `409` not in review · `403` two-person rule / role · `422` missing remark.
- `GET /approvals?entity=capa&entity_id=812` → history, oldest first.

#### Sample data
Closed CAPAs in the sample data carry an approval by the **Area GM** (remark "Verified, fix accepted."), so the
history section of CAPA detail is filled. Current totals (seed 42): 56 open, 13 in review, ~830 closed, 1 rejected,
23 overdue.
