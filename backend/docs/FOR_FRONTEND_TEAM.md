# Backend updates for the Frontend team (web + mobile)

This file is updated after **every backend module**. Newest module is at the bottom of the changelog.
Branch: `backend` · Folder: `backend/` · Live API docs (when running): **http://localhost:8000/docs**

---

## 0. Start here: run the backend and connect your app

### Step 1. Get the backend (it is on `main`)
```bash
git checkout main
git pull
cd backend
```
You need **Python 3.11** and **Docker Desktop** (running). Git Bash / PowerShell on Windows, or any terminal on macOS/Linux.

### Step 2. Install and start (first time: ~3 minutes)
```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt     # macOS/Linux: .venv/bin/python -m pip ...
cp .env.example .env                                        # PowerShell: copy .env.example .env
docker compose up -d                                        # PostgreSQL on localhost:5434
.venv/Scripts/python -m seed.generate                       # 6 months of sample data (~15 s)
.venv/Scripts/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- `--host 0.0.0.0` lets a **phone on the same Wi-Fi** reach your laptop.
- Next time you only need `docker compose up -d` and the `uvicorn …` line.
- If you pulled a newer backend and the tables changed, rebuild and re-seed (the command is in `backend/README.md`).

### Step 3. Check it works
- Open **http://localhost:8000/health** → `{"status":"ok","database":"connected"}`.
- Open **http://localhost:8000/docs** → click **Authorize** → username `9000000001`, password `demo123` → try any endpoint.
  Every request and response shape is shown there, generated from the code.
- Demo logins (password `demo123`): see section 4 below.

### Step 4. Point your app at the backend
| App | Setting | Value |
|---|---|---|
| Web (Vite) | `VITE_API_URL` | `http://localhost:8000` |
| Web | `VITE_USE_MOCKS` | `false` (turn the mocks off) |
| Mobile (Expo) | `EXPO_PUBLIC_API_URL` | `http://<your laptop's Wi-Fi IP>:8000` (e.g. `http://192.168.1.20:8000`); find the IP with `ipconfig` (Windows) or `ifconfig` (macOS) |
| Mobile / Web | WebSocket | `ws://<same host>:8000/ws/notifications?token=<access_token>` |

- The mobile app's current default `…:8000/api/v1` **also works**: the backend accepts every route with or without `/api/v1`.
- The phone and the laptop must be on the **same Wi-Fi**. On Windows, allow Python through the firewall when it asks
  (or open port 8000).
- **CORS** is open (`CORS_ORIGINS=*`) for development. For a deployed site, put your frontend URL in `CORS_ORIGINS`
  in `backend/.env`.

### Step 5. Integration checklist (things that trip people up)
1. **Login:** `POST /auth/login` `{phone, password}` → store `access_token`; send `Authorization: Bearer <token>`.
   The token lasts 12 h. On any `401`, clear it and show the login screen.
2. **Errors:** every error has `detail` **and** `message` (same text), so show either. `422` also has an `errors` list.
3. **Times** end with `Z` / `+00:00` (UTC). Use `new Date(value)` and show them in IST. Don't add "Z" yourself.
4. **IDs are numbers** (the mocks used strings like `"mine-moonidih"`).
5. **Paginated lists** return `{items, total, page, page_size}`: `/tasks`, `/capa`, `/inspections`, `/observations`,
   `/grievances`, `/attendance`, `/notifications`, `/audit/recent`, `/reports`, `/users`, `/me/reports`. Read `.items`.
6. **Images:** use `API_URL + evidence.url` (a signed link, no header needed, valid 12 h).
7. **Photos first:** upload with `POST /evidence` (multipart), then send the returned `id` with the task / finding /
   closure / attendance.
8. **Offline queue:** send it to `POST /sync/bulk`. Payload keys are **snake_case** and match the normal endpoints
   (`task_id`, `capa_id`, `evidence_id`, `inspection_client_uuid`…); see the Module 7 section.
9. **Role-based menus:** use `user.role` from login; the backend also refuses what a role may not do (`403`, with a message).
10. **Scope Switcher (web):** send `?org_id=` on dashboard / list calls.
11. **Optional:** generate TypeScript types from the live API:
    `npx openapi-typescript http://localhost:8000/openapi.json -o src/api/schema.d.ts`.

### Step 6. Mobile: replace each mock function (`mobile/src/api/endpoints.ts`) with the real call
| Mock function | Real call(s) | Notes |
|---|---|---|
| `loginApi(phone, password)` | `POST /auth/login` | same response shape: `{access_token, user}`; `user.mine_id` is a number |
| `fetchMasterSyncApi()` | `GET /sync/master` | mines (with `boundary`, `center_lat/center_lng`), checklists, workers, obligations, tasks, `server_time` |
| `fetchTasksApi()` | `GET /tasks?due=today` (or `?status=pending`) | paginated → `.items`; each task has `obligation`, `evidence` |
| `completeTaskApi(taskId, evidenceId, remarks)` | `POST /evidence` (photo) → `POST /tasks/{id}/complete` `{evidence_id, remarks, client_uuid}` | offline: `/sync/bulk` kind `task_complete`, payload `{task_id, evidence_id, remarks}` |
| `fetchCapasApi()` | `GET /capa?owner=me&status=open,rejected` | paginated → `.items`; `finding.photo`, `hours_left`, `overdue` |
| `closeCapaApi(capaId, afterPhoto)` | `POST /evidence` (after-photo) → `POST /capa/{id}/request-closure` `{evidence_id, note}` | **the server decides**: `status` = `in_review` or `rejected`, reasons in `closure_checks`. Keep your distance meter only as a hint (use `GET /capa/{id}` → `before_photo.lat/lng`) |
| `processVoiceAiApi(audioUri, language)` | ML teammate's `POST /ai/voice` (multipart `audio`, `language`) | then save with `POST /observations` `{…, source: "voice", transcript, language}` |
| `markAttendanceApi(lat, lng, selfieUri, isMocked)` | `POST /evidence` (selfie) → `POST /attendance` `{mode: "self", lat, lng, accuracy, selfie_evidence_id, is_mocked, device_id, client_uuid}` | show `message`; `checks` lists each rule. The worker's login must be linked to a worker record (demo: `9000000009`) |
| `submitGrievanceApi(category, text, anonymous)` | `POST /grievances` `{category, text, anonymous}` | returns the `token` to save |
| `sendSosApi(lat, lng, note)` | `POST /sos` `{kind, note, lat, lng, accuracy}` | `kind` ∈ fire, roof_fall, gas, injury, flooding, other |

The web app has no API client yet: build it straight from sections 5 onward (every screen → endpoint table).

### Step 7. If something doesn't work
| Problem | Fix |
|---|---|
| Browser: "CORS error" | the backend isn't running, or `CORS_ORIGINS` doesn't include your URL |
| Phone: "Network request failed" | same Wi-Fi? laptop IP correct? firewall allows port 8000? server started with `--host 0.0.0.0`? |
| Every call → `401` | token missing or expired, so log in again |
| Images don't load | prefix the `url` with the API base URL; get a fresh `url` after 12 h |
| Times look 5½ h off | you're adding "Z" yourself or parsing without the zone; use the value as-is |
| `500` after `git pull` | the tables changed, so rebuild the local database and re-seed |
| Port 5434 busy | `DB_PORT=5435 docker compose up -d` and change the port in `DATABASE_URL` |

---

## 1. Current state at a glance
| Module | Status | What you can use |
|---|---|---|
| 1. Foundation (login, roles, scope) | ✅ | `POST /auth/login`, `GET /auth/me`, `GET /health` |
| 2. Sample data + mine-profile model | ✅ | 6 months of realistic data in the database (no new endpoints yet) |
| 3. Mine profile, applicable obligations, tasks, map | ✅ | org tree, mines list/detail, mine profile, applicable obligations, tasks (list/summary/complete), calendar, compliance %, map boundaries + pins |
| 4. Inspections, findings, CAPA, approvals | ✅ | checklists, inspections (start/findings/submit/list/detail), CAPA board (list/summary/detail/assign/"I fixed it"), approve/reject with two-person rule |
| 5. Satya Proof, before/after closure, audit | ✅ | photo upload + trust score with reasons, signed image links, automatic before/after closure checks, audit history + "Verify Chain" |
| 6. Contractors, workers, attendance, fraud | ✅ | contractors (list, 360, add/edit, alerts, score), workers (list, add/edit/deactivate), attendance (self + gate mode, monitor, summary, my attendance) |
| 7. Field reports, SOS, grievances, notifications, sync | ✅ | field reports (app + voice, anonymous, auto-CAPA), SOS + acknowledge, grievances (anonymous + token tracking), notifications + live WebSocket, offline download pack + bulk sync |
| 8. Reminders + escalation | ✅ | escalation rules (admin), jobs status + "Run now", CAPA escalation timeline, reminder / escalation / digest notifications |
| 9. Dashboards, leaderboard, reports | ✅ | command & mine dashboards, leaderboard, PDF/Excel reports (generate, history, download, verify, approve), demo script |

Until an endpoint exists, keep using your **mock data**, but shape it like the contracts in your frontend prompt
(and the changes listed below).

---

## 2. How to run the backend on your laptop
See **section 0 (Start here)** at the top of this file.

---

## 3. Rules that apply to every endpoint
- **Auth header:** `Authorization: Bearer <access_token>` on every request except `/auth/login` and `/health`.
- **Errors** always look like `{"detail": "human readable message"}`.
  - `401`: not logged in / token expired → send the user to login.
  - `403`: logged in but not allowed (wrong role, or mine outside their area) → show the message.
  - `422`: invalid data. `detail` is one readable sentence (e.g. `"text: Field required"`), and `errors` lists
    every problem: `[{"field": "body.text", "message": "Field required"}]`.
- **Times** are sent in **UTC with the zone marked**: `2026-09-26T05:30:00Z` or `2026-09-26T05:30:00+00:00`.
  `new Date(value)` handles both correctly; show them in IST. Plain dates (`due_date`) are `YYYY-MM-DD`.
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
About 180 days ending today: ~5,000 compliance tasks (done / pending / overdue with escalation level 0–3),
~630 inspections, ~920 findings each with a CAPA (open / in_review / closed / rejected), ~1,900 photo
evidence records with trust scores and flags, ~370 field reports (near-miss, unsafe act/condition,
incident, SOS; ~20% Hindi voice with transcript), 15 contractors, 612 workers, ~41,000 attendance rows,
daily production/dispatch and PM10/noise per mine, 25 grievances (many anonymous), a few notifications.

**Values you'll see (use these for chips/colours):**
- Finding / observation `category`: `roof, haul_road, conveyor, electrical, fire, water, dust, ppe, machinery, explosives, other`
- Observation `type`: `unsafe_act, unsafe_condition, near_miss, incident, sos`; `source`: `app | voice`; `language`: `en | hi`
- `severity`: `low, medium, high, critical`
- Task `status`: `pending, done, overdue`; CAPA `status`: `open, in_review, closed, rejected`
- Grievance `status`: `new, in_progress, resolved, closed`; `category`: `wages, safety, harassment, facilities, leave`
- Evidence `flags`: `outside_boundary, no_location, reused_photo, time_mismatch, stale_photo, no_exif, gps_mismatch, low_gps_accuracy, mock_location` (meanings in the Module 5 section)
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
7. **Moonidih UG**: one **rejected** CAPA closure (reused photo, 411 m away) and one **unacknowledged SOS**.
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
  "id": 7, "name": "Kusunda OCP", "code": "MINE-KUSUNDA-OCP", "mine_type": "OC",
  "subsidiary": "BCCL", "area": "Kusunda Area", "center_lat": 23.78, "center_lng": 86.392,
  "manager_name": "Mine Manager, Kusunda OCP",
  "compliance_pct": 54.1,
  "overdue_tasks": 54, "open_capas": 16,
  "risk": {"risk_pct": 100.0, "level": "high", "source": "simple_score",
           "reasons": [{"factor": "Overdue CAPAs", "value": 9, "impact_pct": 36.0}]}
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
- `GET /tasks/summary?org_id=&mine_id=` → `{"due_today": 6, "due_this_week": 40, "overdue": 34, "done_today": 4, "pending": 43}`
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
Kusunda OCP is the only **high**-risk mine (100%, compliance ~54%). The others are low or medium (compliance 70–86%).
Pins for the last 30 days: ~290 (3 SOS, ~195 findings, ~6 incidents, ~85 observations).

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
  `{"by_status": {"open": 75, "in_review": 17, "closed": 824, "rejected": 1}, "overdue": 31,
  "open_by_severity": {"low": 27, "medium": 39, "high": 22, "critical": 5}, "open_ageing": {"lt7": 57, "d7_30": 25, "gt30": 11}}`
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
history section of CAPA detail is filled. Current totals (seed 42): 75 open, 17 in review, ~824 closed, 1 rejected,
31 overdue.

---

### Module 5: Satya Proof (photo trust) + before/after closure + tamper-proof history ✅

#### Screens you can now connect
| Screen | Endpoints |
|---|---|
| Mobile: every camera screen (task proof, finding photo, after-photo) | `POST /evidence` → use the returned `id` |
| Trust badge / "why?" bottom sheet | `trust_score`, `trust_level`, `checks` from the upload response or `GET /evidence/{id}` |
| Any `<img>` of a photo | the evidence `url` (signed, no header needed) |
| Several photos in a list (inspection findings, tasks) | `GET /evidence?ids=1,2,3` |
| CAPA detail: Before/After slider + closure checks | `GET /capa/{id}` → `before_photo`, `after_photo`, `closure_checks` |
| Mobile: Close CAPA (distance meter) | `before_photo.lat/lng` from `GET /capa/{id}` |
| Web: Audit & Integrity page | `GET /audit/verify`, `GET /audit/recent`, `GET /audit/{table}/{record_id}` |

#### 1. Upload a photo: `POST /evidence` (multipart/form-data)
| Field | Required | Notes |
|---|---|---|
| `file` | ✅ | JPEG, PNG or WebP, max 10 MB. **Take it in the app** (not from the gallery) so it has camera details |
| `mine_id` | ✅ | the mine the photo belongs to (must be in the user's area) |
| `lat`, `lng` | send both | GPS **at the moment of capture** |
| `accuracy` | recommended | GPS accuracy in metres (`coords.accuracy`) |
| `device_time` | recommended | when the photo was **taken**, ISO with timezone, e.g. `2026-09-26T10:15:00Z` |
| `device_id` | optional | phone id |
| `is_mocked` | recommended | `true` if Android reports a mock location (`location.mocked`) |
| `client_uuid` | optional | offline retry: sending the same value again returns the same record (`200`) |

Anyone logged in can upload for a mine in their area (workers too, e.g. attendance selfies).
Response `201`:
```json
{
  "id": 1883, "kind": "photo", "url": "/evidence/1883/file?sig=eyJ...",
  "mine_id": 4, "lat": 23.7406, "lng": 86.348, "accuracy": 8.0,
  "device_time": "2026-09-26T04:45:00", "server_time": "2026-09-26T04:45:02",
  "device_id": "TEST-PHONE", "is_mocked": false,
  "trust_score": 15, "trust_level": "suspicious",
  "flags": ["outside_boundary", "low_gps_accuracy", "mock_location"],
  "checks": [
    {"name": "Inside the mine boundary", "passed": false, "penalty": 35, "detail": "Taken 2.3 km outside Moonidih UG."},
    {"name": "GPS accuracy", "passed": false, "penalty": 10, "detail": "Location only precise to ±150 m (limit 50 m)."},
    {"name": "No fake GPS", "passed": false, "penalty": 40, "detail": "The phone reported a mock-location (fake GPS) app."},
    {"name": "Fresh photo (not reused)", "passed": true, "penalty": 0, "detail": "No match with any earlier photo."},
    {"name": "Time check", "passed": true, "penalty": 0, "detail": "Phone time and photo time look right."},
    {"name": "Camera details (EXIF)", "passed": true, "penalty": 0, "detail": "Real camera details found."}
  ],
  "exif": {"make": "Samsung", "model": "SM-A525F", "datetime_original": "2026:09:26 10:15:00"},
  "sha256": "…", "uploaded_by": 7, "uploaded_by_name": "Ramesh Kumar (Safety Officer)",
  "is_sample": false, "created_at": "2026-09-26T04:45:02"
}
```
Errors: `413` too big · `415` not JPEG/PNG/WebP · `422` not an image / bad `device_time` / only one of lat,lng ·
`403` mine outside the user's area.

**Offline order on mobile:** upload the photo first (`POST /evidence`), then send the finding/task/closure with the
returned `id`. Keep the photo's capture-time metadata; don't read GPS at sync time.

#### 2. Trust score: show it like this
- `trust_level`: `verified` (80–100, green ✓) · `review` (60–79, amber) · `suspicious` (< 60, red ⚠).
- Show every **failed** item of `checks` with its `detail` sentence. The sentences are already written for users.
- Penalties: fake GPS −40 · outside boundary −35 · no location −30 · exact reused photo −50 · look-alike photo −40 ·
  stale photo −20 · photo-GPS mismatch −20 · time mismatch −15 · low GPS accuracy −10 · no camera details −10.
- Flag meanings: `outside_boundary` taken outside the mine · `no_location` sent without GPS · `low_gps_accuracy`
  worse than ±50 m · `mock_location` fake-GPS app · `reused_photo` same as / looks like an earlier photo ·
  `time_mismatch` phone clock or photo time wrong · `stale_photo` taken > 7 days before upload ·
  `no_exif` no camera details (screenshot?) · `gps_mismatch` GPS inside the photo ≠ phone GPS.
- A photo taken offline and uploaded hours later is **fine** (as long as `device_time` is the capture time).

#### 3. Showing images
- Use `API_BASE + evidence.url` directly in `<img src>` / React Native `<Image source={{uri}}>`. It carries a
  signed token valid for **12 hours**, so no Authorization header is needed. Refresh by calling `GET /evidence/{id}` again.
- `GET /evidence/{id}/file` also accepts a normal `Authorization: Bearer` header.
- Sample-data records (`is_sample: true`) return a grey **"Sample photo #N"** PNG placeholder.
- `GET /evidence/{id}` → the object above. `GET /evidence?ids=12,15` → a list (records outside the area are skipped).

#### 4. CAPA closure now runs Satya Proof automatically
- `POST /capa/{id}/request-closure` with `{"evidence_id": <after-photo id>, "note": "..."}`.
  **High and critical** problems need an after-photo (`422` without it); for low/medium it's optional.
- The backend checks: **Same location** (within 30 m of the before-photo) · **Fresh photo (not reused)** ·
  **Taken after the problem was reported** · **Trust score** (≥ 60) · optionally **AI: hazard no longer visible**
  (appears when the ML teammate's model is plugged in).
  - Any failure → `status: "rejected"` at once; `closure_checks` lists every check with `passed` + `detail`,
    e.g. `{"name": "Same location", "passed": false, "detail": "411 m from the before-photo (limit 30 m)"}`.
  - All passed → `status: "in_review"`; a second person approves as before (two-person rule).
- `GET /capa/{id}` now also returns:
```json
"before_photo": {"id": 1881, "url": "/evidence/1881/file?sig=…", "lat": 23.7406, "lng": 86.348,
                 "device_time": "…", "trust_score": 100, "trust_level": "verified", "flags": []},
"after_photo":  {…same shape…, or null}
```
  Mobile distance meter: compare the live GPS with `before_photo.lat/lng` (or `finding.lat/lng` if no before-photo)
  and show green within 30 m. The server decides in the end.
- `closure_score` = trust score of the after-photo.

#### 5. Audit & Integrity page (roles: `mine_manager, area_gm, subsidiary_admin, cil_admin, regulator`)
- `GET /audit/verify` →
```json
{"ok": false, "chain_ok": true, "total_entries": 89, "head_hash": "7667448226f5…",
 "broken_at": null, "records_checked": 40,
 "records_changed_outside_app": [{"table_name": "capas", "record_id": 900,
    "problem": "Record was changed outside the app.", "fields": ["closed_at", "status"]}],
 "checked_at": "2026-09-26T04:50:00"}
```
  Big green shield when `ok` is true. When false: if `chain_ok` is false, show `broken_at`
  (`{id, table_name, record_id, action, created_at, problem}`); list `records_changed_outside_app` with the fields.
  `head_hash` = the fingerprint of the whole history ("chain seal"); show it shortened with a copy button.
- `GET /audit/recent?table=&action=&user_id=&mine_id=&from=&to=&page=&page_size=` → paginated
  `{id, table_name, record_id, action (create|update|delete|seed), user_id, user_name, mine_id, created_at, hash, prev_hash}`.
- `GET /audit/{table_name}/{record_id}` (e.g. `/audit/capas/900`) → timeline, oldest first:
  `[{id, action, user_id, user_name, created_at, changed_fields: ["status"], before: {"status": "open"}, data: {...full record...}, hash, prev_hash}]`.
  Use `changed_fields` + `before` + `data` for the JSON diff viewer.
  Table names: `capas, findings, inspections, compliance_tasks, mine_profiles, mine_obligations, obligations,
  approvals, evidence, observations, grievances, contractors, workers, attendance, …`.
- Only changes made **through the app** are recorded one by one. The sample data appears as one `seed` entry.

---

### Module 6: Contractors, workers, attendance, ghost-worker alerts ✅
Rebuild your local database and re-seed (new attendance columns).

#### Screens you can now connect
| Screen | Endpoints |
|---|---|
| Web: Contractors list (score, licence chips, alert badge) | `GET /contractors` |
| Web: Contractor 360 (alerts panel, stats, tabs) | `GET /contractors/{id}`, `GET /contractors/{id}/alerts` |
| Web: Add / edit contractor | `POST /contractors`, `PATCH /contractors/{id}` |
| Web: Workers tab (+ add / edit / deactivate) | `GET /contractors/{id}/workers`, `POST /contractors/{id}/workers`, `GET/PATCH /workers/{id}` |
| Web: Attendance Monitor (KPI chips + table) | `GET /attendance/summary`, `GET /attendance` |
| Mobile: Attendance (worker, selfie) | `POST /evidence` (selfie) → `POST /attendance` with `mode: "self"` |
| Mobile: Gate kiosk mode (supervisor / contractor admin) | `GET /contractors/{id}/workers` (search) → `POST /attendance` with `mode: "gate"` |
| Mobile: My Attendance history | `GET /attendance/me` |

#### Who can do what
| Action | Roles |
|---|---|
| See contractors / workers / attendance | `supervisor, safety_officer, mine_manager, area_gm, subsidiary_admin, cil_admin, regulator, contractor_admin` (a contractor admin sees **only their own company**; others see contractors of mines in their area). Workers get `403`. |
| Add / edit contractors | `mine_manager, subsidiary_admin, cil_admin` |
| Add / edit / deactivate workers | the same + `contractor_admin` (own company) |
| Attendance, self mode | a user whose login is linked to a worker record (demo: `9000000009` Birsa Hansda) |
| Attendance, gate mode | `supervisor, safety_officer, mine_manager` (mines in their area), `contractor_admin` (own workers) |

#### Contractors
- `GET /contractors?org_id=&mine_id=&q=&licence_status=valid|expiring|expired` → **lowest score first**:
```json
{"id": 2, "name": "Maa Tara Mining Works", "licence_no": "CLRA/MOON/2025/102",
 "licence_valid_till": "2027-11-20", "licence_status": "valid",
 "insurance_valid_till": "2027-06-26", "insurance_status": "valid",
 "pf_code": "JHRAN1002", "esi_code": "ESI2002", "mine_id": 4, "mine_name": "Moonidih UG", "admin_user_id": null,
 "workers_count": 52, "alerts_count": 7, "high_alerts": 6, "score": 3.0}
```
  `*_status` ∈ `valid | expiring (≤ 30 days) | expired | unknown`. Score 0–100: each alert costs high 15 / medium 7 / low 3.
- `GET /contractors/{id}` → the same + `stats` + `alerts`:
```json
"stats": {"workers_total": 52, "workers_active": 52,
          "training": {"valid": 49, "expired": 3}, "medical": {"valid": 50, "expired": 2},
          "below_min_wage": 3,
          "attendance_30d": {"valid": 940, "invalid": 38, "without_gate_entry": 298}}
```
  In `training` / `medical`, a missing status key means 0.
- `GET /contractors/{id}/alerts` → the alerts list (also inside the 360):
```json
{"id": "shared_device-2", "contractor_id": 2, "type": "shared_device", "severity": "high",
 "title": "Workers sharing one phone",
 "description": "17 workers use the same phone (DEV-SHARED-7F3A). One person may be marking attendance for others.",
 "worker_ids": [41, 42, 43], "count": 17}
```
  Alert `type`s: `shared_device, shared_bank, no_gate_entry, attendance_spike, expired_training, expired_medical,
  below_min_wage, licence_expired, licence_expiring, insurance_expired, insurance_expiring`.
  (This differs slightly from the old prompt: `expired_licence` became `licence_expired`, and there are new types.)
  (`worker_ids` is shortened here; the API lists all 17.) Show `title` + `description`; "View workers" can
  filter the Workers tab by `worker_ids`.
- `POST /contractors` body `{name, licence_no, licence_valid_till, insurance_valid_till, pf_code, esi_code, mine_id, admin_user_id}`
  → `201` + 360. `PATCH /contractors/{id}` with any of those fields (not `mine_id`).
  The OCR autofill (`/ai/ocr`, ML teammate) can pre-fill this form.

#### Workers
- `GET /contractors/{id}/workers?active=true&q=&flag=shared_device` →
```json
{"id": 41, "contractor_id": 2, "contractor_name": "Maa Tara Mining Works", "user_id": null,
 "name": "Budhan Rabidas", "phone": "7000000041", "device_id": "DEV-SHARED-7F3A",
 "bank_account_on_file": true,
 "training_valid_till": "2028-04-29", "training_status": "valid",
 "medical_valid_till": "2028-03-30", "medical_status": "valid",
 "daily_wage": 490.0, "below_min_wage": false, "is_active": true,
 "attendance_days_30d": 21, "flags": ["no_gate_entry", "shared_device"]}
```
  `flags` = the alert types this worker is part of (red chips in the table).
- **Privacy:** the bank account number is never returned (only `bank_account_on_file`). It's stored as a keyed
  fingerprint, so duplicates can be detected but the number can't be read back. Don't show or cache it after the form is sent.
- `POST /contractors/{id}/workers` body `{name, phone, device_id, bank_account, training_valid_till, medical_valid_till, daily_wage}`.
- `PATCH /workers/{id}` any of those + `is_active` (`false` = deactivate). `GET /workers/{id}` → one worker.

#### Attendance
- `POST /attendance` body:
```json
{"mode": "self", "worker_id": null, "lat": 23.7406, "lng": 86.348, "accuracy": 9,
 "selfie_evidence_id": 1901, "device_id": "PHONE-1", "is_mocked": false, "client_uuid": "..."}
```
  In gate mode send `"mode": "gate"` and the `worker_id`. Response `201` (or `200` for a retry / a gate entry added):
```json
{"id": 41210, "worker_id": 1, "worker_name": "Birsa Hansda", "contractor_id": 1,
 "contractor_name": "Shree Ganesh Enterprises", "mine_id": 4, "mine_name": "Moonidih UG",
 "time": "2026-09-26T01:06:00", "lat": 23.7406, "lng": 86.348,
 "valid": false, "reason": "You are 2.2 km outside Moonidih UG.", "gate_entry": false, "source": "self",
 "selfie_evidence_id": 1901,
 "checks": [{"name": "Worker is active", "passed": true, "detail": "Active."},
            {"name": "Contractor licence valid", "passed": true, "detail": "Valid."},
            {"name": "Safety training valid", "passed": true, "detail": "Valid."},
            {"name": "Medical fitness valid", "passed": true, "detail": "Valid."},
            {"name": "No fake GPS", "passed": true, "detail": "OK."},
            {"name": "Inside the mine boundary", "passed": false, "detail": "You are 2.2 km outside Moonidih UG."},
            {"name": "Selfie passed Satya Proof", "passed": true, "detail": "Trust score 100."}],
 "message": "Attendance NOT accepted: You are 2.2 km outside Moonidih UG."}
```
  - Show `message` big: green when `valid`, red when not, with the failed `checks` below.
  - **Invalid attempts are saved** (evidence of the attempt). The worker can try again once fixed.
  - Only **one valid record per day**: a second self-mark → `409` "Attendance already marked today at 6:36 AM."
    A **gate scan after a self-mark** returns `200` and sets `gate_entry: true` on that record.
  - `403` messages: login not linked to a worker · marking someone else · gate mode without the role · worker outside
    your area / not in your company. `422`: gate mode without `worker_id`.
- `GET /attendance?org_id=&mine_id=&contractor_id=&date=YYYY-MM-DD&valid=&gate_entry=&page=&page_size=` →
  paginated records for one day (default today), newest first.
- `GET /attendance/summary?org_id=&mine_id=&date=` →
  `{"date": "2026-09-26", "present": 99, "invalid": 5, "without_gate_entry": 9, "outside_boundary": 1, "expired_training": 4}`
- `GET /attendance/me?from=&to=` → the worker's own records (default last 30 days). `404` if the login isn't linked to a worker.
- Times are UTC; show them in IST. `time` = when it was marked.

#### Demo stories (seed 42)
Ranking: **Maa Tara Mining Works score 3** (shared phone ×17, shared bank, 298 records without gate entry,
attendance spikes up to 45 vs ~34, 3 workers at ₹310/day) · **Hazaribagh Contractors 70** (licence expired; its
workers' attendance is refused with "Contractor licence expired … work not allowed") · **Jharkhand Earthmovers 71**
(licence expiring) · Kusunda's contractors have the most expired safety trainings (~19% of workers vs ~6% elsewhere) ·
best: Bharat Coal Handlers and Jharsuguda Infra at 93.

---

### Module 7: Field reports, SOS, grievances, notifications (live), offline sync ✅
Rebuild your local database and re-seed (new columns).

#### Screens you can now connect
| Screen | Endpoints |
|---|---|
| Mobile: Quick Report (form) | `POST /evidence` (photo) → `POST /observations` |
| Mobile: Voice Report | ML teammate's `POST /ai/voice` → user confirms → `POST /observations` with `source: "voice"` |
| Mobile: SOS (long-press) | `POST /sos` |
| Web: Observations & Incidents page | `GET /observations`, `GET /observations/{id}`, `POST /observations/{id}/acknowledge`, `POST /observations/{id}/convert` |
| Web: SOS pinned banner / dashboard alert | `GET /sos/active` + live push |
| Mobile: Grievance new + track | `POST /grievances`, `GET /grievances/track/{token}` |
| Web: Grievances board | `GET /grievances`, `GET /grievances/{id}`, `PATCH /grievances/{id}` |
| Bell, Notifications page, toasts | `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, WebSocket `/ws/notifications` |
| Mobile offline engine | `GET /sync/master`, `POST /sync/bulk` |

#### Field reports
- `POST /observations` (anyone logged in, workers too, for a mine in their area):
```json
{"mine_id": null, "type": "unsafe_condition", "category": "roof", "text": "Big crack in roof near conveyor 3",
 "severity": "critical", "lat": 23.7406, "lng": 86.348, "location_text": "Seam 3, Level 2",
 "evidence_id": 1901, "source": "app", "language": "en", "transcript": null, "anonymous": false, "client_uuid": "..."}
```
  - `mine_id` can be left out for mine-level users (their own mine is used).
  - `type` ∈ `unsafe_act | unsafe_condition | near_miss | incident`; `category` = one of the 11 hazard categories.
  - **A photo (`evidence_id`) is required** for `unsafe_condition` and `incident` when `source` is `app` (`422` otherwise).
    Voice reports (`source: "voice"`) may come without a photo.
  - **Voice:** send the ML result: `text` = the English hazard sentence, `transcript` = the original words,
    `language` = `hi`/`bn`/`or`/`en`, plus `type`/`category`/`severity`/`location_text` as confirmed by the user.
  - `anonymous: true` → the reporter is not stored (not even in the audit history). Offer a "Hide my name" toggle.
    Note: workers can't see their own anonymous reports in "My Reports" later, so keep a local copy on the phone.
  - **Incidents and high/critical unsafe conditions automatically become a finding + CAPA**, and the manager and GM
    are notified. The response then has `capa_id` / `capa_status`.
- Response (`201`, `200` for a `client_uuid` retry):
```json
{"id": 331, "mine_id": 4, "mine_name": "Moonidih UG", "type": "unsafe_condition", "category": "roof",
 "text": "Big crack in roof near conveyor 3", "severity": "critical", "lat": 23.7406, "lng": 86.348,
 "location_text": null, "source": "app", "language": "en", "transcript": null, "anonymous": false,
 "reporter_id": 9, "reporter_name": "Birsa Hansda (Worker)",
 "evidence": {"id": 1901, "url": "/evidence/1901/file?sig=…", "trust_score": 100, "trust_level": "verified", "…": "…"},
 "finding_id": 901, "capa_id": 901, "capa_status": "open",
 "acknowledged_by": null, "acknowledged_by_name": null, "acknowledged_at": null, "response_minutes": null,
 "created_at": "2026-09-26T05:10:00"}
```
- `GET /observations?org_id=&mine_id=&type=near_miss,incident&severity=&source=voice&acknowledged=false&from=&to=&page=`
  → paginated, **unacknowledged SOS first**, then newest. Workers and contractor admins get only **their own** reports.
- `POST /observations/{id}/acknowledge` (supervisor, safety officer, manager, GM, admins) → sets `acknowledged_by/at`
  (the first one is kept). For SOS, `response_minutes` = minutes until the first acknowledgement.
- `POST /observations/{id}/convert` (safety officer and above) → creates a finding + CAPA (once; repeating returns the same CAPA).

#### SOS
- `POST /sos` body `{"kind": "roof_fall", "note": "Gallery 4", "lat": ..., "lng": ..., "accuracy": 8, "client_uuid": "..."}`
  (`kind` ∈ `fire, roof_fall, gas, injury, flooding, other`; `mine_id` optional for mine-level users).
  Response = an observation (`type: "sos"`, `severity: "critical"`, `text: "SOS: Roof fall: Gallery 4"`) + `notified`
  (the number of people alerted: mine manager, safety officers, area GM, subsidiary admin, CIL admin).
- `GET /sos/active` → unacknowledged SOS in the user's area, oldest first. Show a red sticky banner.
- When someone acknowledges, the reporter gets the notification **"Help is on the way"**.
- Offline: queue the SOS in `/sync/bulk` **and** offer the SMS fallback on the phone.

#### Grievances
- `POST /grievances` body `{"category": "wages", "text": "...", "anonymous": true, "language": "hi", "client_uuid": "..."}`
  (`category` ∈ `wages, safety, harassment, facilities, leave, other`; **anonymous by default**; harassment is always anonymous) →
  `{"id": 26, "token": "GRV-599467", "status": "new", "anonymous": true, "message": "Your grievance is registered. Save this token to check its status. Your name is not stored."}`.
  Show the **token big**, with copy/share, and save it on the phone.
- `GET /grievances/track/{token}` (any logged-in user) → `{token, category, status, response, responded_at, created_at, updated_at}`
  with no identity. `404` for an unknown token.
- Officers (`mine_manager, area_gm, subsidiary_admin, cil_admin`):
  `GET /grievances?status=new,in_progress&category=&mine_id=&page=` (new first) · `GET /grievances/{id}` ·
  `PATCH /grievances/{id}` body `{"status": "resolved", "response": "Water cooler installed."}` (at least one field).
  A reply on a `new` grievance moves it to `in_progress` automatically. Item:
  `{id, token, mine_id, mine_name, category, text, anonymous, reporter_name (null when anonymous), status, response,
  responded_by_name, responded_at, language, created_at, updated_at}`. Status ∈ `new, in_progress, resolved, closed`.

#### Notifications
- `GET /notifications?unread=true&level=critical&page=` → paginated + `"unread": 3` (for the bell). Item:
  `{"id", "title", "body", "level": "info|warning|critical", "kind", "link", "read", "created_at"}`.
  `kind` ∈ `sos, incident, finding, capa, grievance` (+ `general`; Module 8 adds reminders/escalations).
  `link` is a web path (e.g. `/capa/901`, `/observations/331`, `/grievances/26`); navigate there on tap.
- `GET /notifications/unread-count` → `{"unread": 3}` · `POST /notifications/{id}/read` · `POST /notifications/read-all` → `{"marked_read": n}`.
- **Who gets what now:** SOS → whole chain (critical) · incident / serious hazard / critical finding → mine manager + GM ·
  "I fixed it" → mine manager + GM (to approve) · auto-rejected fix → the submitter · approved/rejected → CAPA owner + submitter ·
  new grievance → mine manager · reply → the (named) reporter · SOS acknowledged → the SOS reporter.
- **Live WebSocket:** `ws://<host>/ws/notifications?token=<access_token>` (`wss://` in production).
  - First message: `{"type": "hello", "unread": 3}`; then for every new notification:
    `{"type": "notification", "notification": {id, title, body, level, kind, link, read, created_at}}`.
  - Send `"ping"` every ~30 s; the server answers `"pong"`. Reconnect with backoff when the connection closes.
    A bad or expired token → the server closes with code `4401` (log in again).
  - On a message: increase the bell count, show a toast (`critical` = red + sticky + sound), and refetch the related
    list (SOS banner, CAPA board …). The "Live" dot = WebSocket connected.
  - Measured on the demo: an SOS reached the GM's screen in **0.04 s**.

#### Offline sync (mobile)
- `GET /sync/master` (after login and whenever online) →
```json
{"server_time": "…", "today": "2026-09-26", "full": true, "user": { ...same as /auth/me... },
 "mines": [{"id", "name", "code", "mine_type", "boundary", "center_lat", "center_lng"}],
 "checklists": [...], "hazard_categories": [{"key": "roof", "label_en": "Roof / side", "label_hi": "छत / साइड"}],
 "observation_types": [...], "sos_kinds": [...], "grievance_categories": [...],
 "obligations": [{"mine_id", "id", "code", "title", "law_ref", "category", "frequency", "severity", "evidence_needed"}],
 "tasks": [{"id", "mine_id", "obligation_id", "code", "title", "due_date", "status", "escalation_level"}],
 "workers": [{"id", "name", "contractor_id", "contractor_name", "mine_id", "training_status", "medical_status"}]}
```
  `tasks` = not-done tasks due within the next 7 days (+ overdue), max 500. `workers` is filled only for gate roles
  (supervisor, safety officer, manager, contractor admin). Always a **full** pack (it's small: the safety officer's
  pack took 0.04 s). Use `server_time` to detect a wrong phone clock.
- `POST /sync/bulk` body `{"items": [{"client_uuid": "...", "kind": "...", "payload": {...}}]}` (max 200 items,
  processed **in order**; upload photos first with `POST /evidence`):

| kind | payload = same body as | extra fields |
|---|---|---|
| `observation` | `POST /observations` | |
| `sos` | `POST /sos` | |
| `grievance` | `POST /grievances` | |
| `attendance` | `POST /attendance` | |
| `inspection` | `POST /inspections` | |
| `finding` | `POST /inspections/{id}/findings` | `inspection_id` **or** `inspection_client_uuid` |
| `inspection_submit` | `POST /inspections/{id}/submit` | `inspection_id` **or** `inspection_client_uuid` |
| `task_complete` | `POST /tasks/{id}/complete` | `task_id` |
| `capa_close` | `POST /capa/{id}/request-closure` | `capa_id` |

  The item's `client_uuid` is used as the record's `client_uuid`, so don't put another one in the payload.
  Response:
```json
{"results": [{"client_uuid": "demo-1", "kind": "observation", "status": "created", "server_id": 332, "http_status": 200},
             {"client_uuid": "demo-3", "kind": "observation", "status": "error", "server_id": null, "http_status": 422,
              "error": "text: Field required"},
             {"client_uuid": "demo-1", "kind": "observation", "status": "duplicate", "server_id": 332, "http_status": 200}],
 "summary": {"created": 2, "duplicate": 1, "error": 1}, "server_time": "…"}
```
  - `created` / `duplicate` → remove the item from the phone's outbox and store `server_id`.
  - `error` → keep it and show `error`. `http_status` tells the type: 403 = no permission (don't retry),
    404 = a missing parent (e.g. the inspection wasn't sent yet), 409 = conflict (e.g. task already done by someone else),
    422 = bad data (fix the form), 500 = retry later.
  - One bad item never stops the others; re-sending the whole queue is safe (you'll get `duplicate`).

---

### Module 8: Automatic reminders + escalation ladder ✅
Rebuild your local database and re-seed (new columns). Nothing changes in how you call earlier endpoints.
The backend now **chases late work by itself**, and you mostly just see **new notifications**.

#### What the backend does on its own (Indian time)
| Job | When | Effect you'll see |
|---|---|---|
| nightly | 00:05 | new day/week/month tasks appear; unfinished ones turn `overdue` |
| reminders | every 15 min | CAPA owner gets `kind: "reminder"`, e.g. "Reminder: CAPA #812 is due in 20 h" |
| escalation | every 5 min | seniors get `kind: "escalation"`; `escalation_level` rises on CAPAs / tasks |
| digest | 08:00 | manager + safety officers get `kind: "digest"`: "Today at Moonidih UG: 6 task(s) due" |

**Escalation ladder** (each step notified **once**):
- **CAPA:** deadline passed → level 1 (Area GM); +1 SLA period (critical 24 h, high 72 h, medium 7 d, low 15 d) →
  level 2 (Subsidiary admin); +1 more → level 3 (CIL admin). The owner is told each time ("CAPA #812 escalated to Area GM").
- **Compliance tasks:** 1 day late → level 1, 3 days → level 2, 7 days → level 3. Sent as **one grouped message per mine**
  ("3 overdue compliance task(s) at Moonidih UG escalated to you"), link `/tasks?mine_id=4&due=overdue`.
- **Grievances** still `new` with no reply: 7 days → Area GM, 14 days → Subsidiary admin.
- **SOS** not acknowledged: 15 min → re-alert Area GM + Subsidiary admin, 30 min → CIL admin (`kind: "sos"`, critical).
- Fixing / submitting / acknowledging / replying stops the ladder for that item.

New notification `kind`s: `reminder`, `escalation`, `digest` (plus the Module 7 kinds). Suggested icons:
⏰ reminder, 🪜 escalation (warning = amber, critical = red), ☀️ digest.

#### CAPA detail: escalation timeline
`GET /capa/{id}` now also returns
`"escalation_history": [{"level": 1, "at": "2026-09-12T08:05:00"}, {"level": 2, "at": "…"}]`.
Show it as a timeline: Level 1 = Area GM, 2 = Subsidiary, 3 = CIL. Seeded CAPAs have a level but no history entries.

#### Admin → Escalation Rules screen
- `GET /config/escalation` (managers, GM, admins, regulator) →
```json
[{"severity": "critical", "sla_hours": 24, "reminder_hours": [6],
  "levels": ["mine_manager", "area_gm", "subsidiary_admin", "cil_admin"]},
 {"severity": "high", "sla_hours": 72, "reminder_hours": [24], "levels": [...]},
 {"severity": "medium", "sla_hours": 168, "reminder_hours": [72, 24], "levels": [...]},
 {"severity": "low", "sla_hours": 360, "reminder_hours": [72, 24], "levels": [...]}]
```
- `PUT /config/escalation` (**CIL admin only**, because the rules apply to every mine) body `{"rules": [ ...all 4 severities... ]}`.
  Rules: every reminder > 0 and < `sla_hours`; `levels` = 2–4 roles, starting with `mine_manager`, going upward in the
  order `mine_manager → area_gm → subsidiary_admin → cil_admin`. `422` with a readable message otherwise.
  New deadlines apply to CAPAs created afterwards.

#### Demo helpers (Admin → Jobs)
- `GET /jobs/status` →
```json
{"scheduler_running": true, "demo_time_speed": 60.0,
 "jobs": {"escalation": {"schedule": "every 5 minutes", "last_run": "…", "duration_ms": 50,
          "result": {"capa_steps": 0, "task_groups": 0, "grievance_steps": 0, "sos_realerts": 1},
          "error": null, "runs": 2, "next_run": "2026-09-26T02:08:13+05:30"}, "nightly": {...},
          "reminders": {...}, "digest": {...}}}
```
- `POST /jobs/run?job=escalation` (also `nightly`, `reminders`, `digest`), for subsidiary / CIL admins →
  `{"job": "escalation", "result": {...}}`. Put a **"Run now"** button next to each job.
- **Demo mode:** the backend is started with `DEMO_TIME_SPEED=60`, so 1 real minute counts as 1 hour for deadlines.
  In the demo an unanswered SOS re-alerted the GM **live** after ~16 real seconds, and a critical CAPA reaches the GM
  after ~24 real minutes (or press "Run now" after that).

---

### Update: photos can now be stored on Cloudinary ✅
**Nothing changes in your code.** Keep using the evidence `url` exactly as before (`/evidence/{id}/file?sig=…`).
- When the backend runs with `STORAGE_BACKEND=cloudinary`, that URL answers with a **307 redirect** to a private
  Cloudinary download link that expires after ~10 minutes. Browsers (`<img>`), React Native `<Image>`, `fetch` and
  axios all follow redirects automatically.
- Don't store or cache the Cloudinary link itself. Always use our `url` (valid 12 h) and refresh it with
  `GET /evidence/{id}` when it expires.
- New field on evidence objects: `"stored_in": "local" | "cloudinary" | "sample"` (for info or debugging only).
- If Cloudinary is unreachable, `POST /evidence` returns `503` with
  `"The photo storage service is not reachable right now. Please try again."`. Keep the photo in the offline
  outbox and retry.

---

### Module 9: Dashboards, leaderboard, PDF/Excel reports ✅ (backend complete)
Rebuild your local database and re-seed (report columns changed). **All backend endpoints now exist.**
The full list is in `backend/README.md`, and the 5-minute judges' flow is in [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

#### Screens you can now connect
| Screen | Endpoints |
|---|---|
| Web: Command Dashboard | `GET /dashboard/summary?org_id=` |
| Web: Mine Detail (charts tab) | `GET /dashboard/mine/{id}?days=60` |
| Web: Leaderboard (podium + table, mines / subsidiaries toggle) | `GET /dashboard/leaderboard?month=YYYY-MM&by=mine` or `by=subsidiary` |
| Web: Reports page | `POST /reports`, `GET /reports`, `GET /reports/{id}`, `GET /reports/{id}/file`, `POST /reports/verify`, approve via `POST /approvals` |
| Mobile (optional): report download | the report `url` |

Roles: dashboards = everyone except workers and contractor admins. Reports = safety officer and above, plus the regulator.
Report approval = `mine_manager, area_gm, subsidiary_admin, cil_admin` (**not** the person who generated it).

#### `GET /dashboard/summary` (real values, CIL admin, sample data)
```json
{"scope": {"mines": 12, "as_of": "2026-09-26"},
 "compliance_pct": 75.6, "compliance_pct_previous": 79.0, "compliance_delta": -3.4,
 "overdue_tasks": 316,
 "open_capas": {"total": 93, "lt7": 57, "d7_30": 25, "gt30": 11, "overdue": 31},
 "incidents_month": 6, "incidents_previous": 7, "near_miss_month": 30, "near_miss_previous": 30,
 "avg_trust_score": 87.7, "avg_trust_score_previous": 87.7,
 "active_workers_today": 469, "active_workers_same_day_last_week": 504, "invalid_attendance_today": 45,
 "active_sos": 1,
 "top_risky_mines": [{"mine_id": 7, "mine_name": "Kusunda OCP", "risk_pct": 100.0, "level": "high",
                      "reasons": [{"factor": "Overdue CAPAs", "value": 9, "impact_pct": 36.0}],
                      "source": "simple_score", "top_reason": "Overdue CAPAs"}],
 "compliance_trend": [{"month": "2026-04", "pct": 87.2}, {"month": "2026-05", "pct": 89.6}, {"month": "2026-06", "pct": 87.0},
                      {"month": "2026-07", "pct": 77.5}, {"month": "2026-08", "pct": 76.4}, {"month": "2026-09", "pct": 76.0}],
 "incidents_trend": [{"month": "2026-04", "incidents": 0, "near_miss": 20}, {"month": "2026-08", "incidents": 6, "near_miss": 29}],
 "capa_by_category": [{"category": "water", "open": 20, "closed": 84}],
 "recent_alerts": [{"id": 1, "title": "…", "body": "…", "level": "critical", "kind": "sos", "link": "…", "read": false, "created_at": "…"}]}
```
(Lists shortened here; all values are from a real run with the sample data.) KPI card delta = value − `*_previous` (the previous 30 days).
"Workers present" compares with the same weekday last week. `recent_alerts` = the viewer's latest warning/critical notifications.

#### `GET /dashboard/mine/{id}`
`{"mine": {…same as GET /mines/{id}… incl. risk}, "compliance_30d": {…with by_category…},
"production": [{"date", "produced_t", "dispatched_t", "dispatch_ratio", "suspicious"}], "suspicious_dispatch_days": 3,
"environment": [{"date", "pm10", "noise", "over_limit"}], "pm10_limit": 100.0, "pm10_days_over_limit": 0,
"open_capas": [{"id", "status", "severity", "category", "description", "due_at", "overdue", "escalation_level"}],
"recent_observations": [...field report objects...], "contractors": [...5 lowest-score contractors...]}`
- Production chart: two lines (produced, dispatched), with `suspicious` days (dispatch < 80% of production) as red dots.
  Bastacolla OCP shows 3 such days in the last 60 days (6 across the 180 days).
- PM10 chart: a line with a dashed limit at `pm10_limit`, and `over_limit` points in red (Ashoka OCP has the spikes).

#### `GET /dashboard/leaderboard?month=2026-09`
```json
{"month": "2026-09", "by": "mine", "rows": [
  {"rank": 1, "id": 12, "name": "Piparwar OCP", "subsidiary": "CCL", "area": "Piparwar Area",
   "safety_score": 86.6, "previous_score": 83.5, "trend": "up",
   "compliance_pct": 82.1, "capa_on_time_pct": 80.0, "incidents": 0, "overdue_capas": 0, "avg_trust_score": 87.6,
   "breakdown": {"compliance": 32.8, "capa_on_time": 20.0, "photo_trust": 8.8, "no_incidents": 25, "overdue_penalty": 0}},
  {"rank": 12, "name": "Kusunda OCP", "safety_score": 32.5, "previous_score": 67.5, "trend": "down"}]}
```
(Rows shortened; values from a real run.)
Score = 40% compliance + 25% CAPAs closed on time + 10% photo trust + (25 − 8 per incident) − 2 per overdue CAPA
(max 10). Show the `breakdown` in a tooltip. `by=subsidiary` → rows `{rank, id, name, code, mines, safety_score,
previous_score, trend, incidents, overdue_capas}` (sample: CCL 79.2 > MCL 78.0 > BCCL 59.0).
The month defaults to the current month; the previous month is used for `trend`.

#### Reports
- `POST /reports` body `{"month": "2026-09", "mine_id": 4, "org_id": null, "formats": ["pdf", "xlsx"]}`.
  Leave `mine_id` empty for **all mines** in `org_id` (default: the user's own area); e.g. a GM gets "Jharia Area". Response:
```json
{"reports": [{"id": 1, "kind": "monthly_compliance", "month": "2026-09", "format": "pdf", "scope_label": "Moonidih UG",
              "mine_id": 4, "org_id": 4, "size_bytes": 5815, "sha256": "27726c88496b…", "status": "generated",
              "generated_by": 4, "generated_by_name": "Vikram Mahato (Manager Moonidih)",
              "approved_by": null, "approved_by_name": null, "approved_at": null, "approvals_verified": true,
              "stored_in": "local", "url": "/reports/1/file?sig=…", "created_at": "…"}],
 "summary": {"compliance_pct": 72.4, "tasks_due": 174, "incidents": 0, "capas_opened": 17,
             "suspicious_dispatch_mines": 0, "pm10_days_over_limit": 0}}
```
  One entry per requested format. It takes ~0.3 s. The `summary` is a quick preview for the page.
- **PDF** (A4, 2 pages for one mine): compliance summary + by category · obligations (most missed first) · inspections &
  findings · CAPAs · field reports & incidents · attendance & contractors · PM10 · production vs dispatch. English only
  (PDF fonts: "Rs" instead of ₹).
  **Excel** sheets: Summary, Compliance by category, Obligations, Inspections & findings, Field reports, Incidents,
  Contractors, Environment, Production.
- `GET /reports?month=&mine_id=&status=generated|approved|rejected&page=` → history (newest first, only your area).
  `GET /reports/{id}` → one report.
- **Download:** `API_BASE + report.url` (signed, 12 h, no header needed). The file comes with
  `Content-Disposition: attachment` (local) or a 307 redirect (Cloudinary). A Bearer token also works.
- **Approve & sign:** `POST /approvals` `{"entity": "report", "entity_id": 1, "decision": "approve", "remark": "…"}`
  (or `"reject"`, remark required). The generator gets `403` ("Two-person rule: you generated this report, so someone else
  must approve it."). A second decision → `409`. After approval: `status: "approved"`, `approved_by_name`, `approved_at`.
  Show an "Approved by … on …" stamp in the UI; the file itself is never changed, so its fingerprint stays valid.
  The generator is notified (`kind: "report"`).
- **Verify:** `POST /reports/verify` (multipart `file`) →
  `{"match": true, "sha256": "…", "message": "Unchanged: this file matches the generated report.", "report": {"id", "month", "format", "scope_label", "status", "created_at"}}`
  or `{"match": false, "message": "No report with this fingerprint: the file was changed or was not generated by Khanan Netra."}`.

---

### Update: integration audit ✅ (read this even if you already built against the earlier docs)
The whole backend was checked against the frontend prompts and these docs. What changed:

#### 1. Times now carry their timezone
Every date-time is sent as `…Z` or `…+00:00` (UTC). Before, it had no suffix, so a browser in India would have
shown every time 5½ hours wrong. **If you appended "Z" yourself, remove that**; parse with `new Date(value)`.

#### 2. Validation errors are one sentence
`422` responses are now `{"detail": "field: message", "errors": [{"field", "message"}]}`; `detail` is always a string.

#### 3. Photos now come with the records (no extra calls)
- Tasks: `evidence` (next to `evidence_id`) → `{id, url, lat, lng, device_time, trust_score, trust_level, flags}` or `null`.
- Findings (inspection detail, CAPA list/detail, finding responses): `photo` (same shape).
- Attendance records: `selfie` (same shape).
- Workers and contractor admins can open **only photos they uploaded** with `GET /evidence/{id}` (`403` otherwise).
  Everything they may see still comes with a signed `url` inside the responses.

#### 4. New endpoints for the Admin, Profile, My Reports and search screens
| Screen | Endpoint |
|---|---|
| Admin → Users | `GET /users?org_id=&role=&q=&active=&page=` · `POST /users` · `GET/PATCH /users/{id}` · `POST /users/{id}/reset-password` |
| Admin → Org Structure | `POST /org/units` · `PATCH /org/units/{id}` (plus the existing `GET /org/tree`, `GET /org/units`) |
| Profile | `PATCH /auth/me` `{"name", "language": "en\|hi\|bn\|or"}` · `POST /auth/change-password` `{"current_password", "new_password"}` (min 8) |
| Mobile → My Reports | `GET /me/reports?kind=&from=&to=&page=` |
| Web → global search (Ctrl+K) | `GET /search?q=` |

- **Users.** Who can manage whom: CIL admin → everyone (incl. regulators); subsidiary admin → GMs and mine staff in
  their subsidiary; mine manager → safety officers, supervisors, workers and contractor admins of their mine.
  - `POST /users` body `{"name", "phone" (10–15 digits), "role", "org_unit_id", "language", "password"?, "worker_id"?}`.
    Without `password`, the response includes a one-time **`temporary_password`**: show it once and ask the user
    to change it (`POST /auth/change-password`).
  - `worker_id` links a worker's login to their worker record (needed for self-attendance).
  - A role must sit at the right level (e.g. `mine_manager` on a mine, `area_gm` on an area), otherwise `422`.
  - Duplicate phone → `409`. You can't deactivate yourself.
  - Item: `{id, name, phone, role, language, is_active, org_unit_id, org_name, org_type, worker_id, created_at}`.
- **Org units** (CIL admin; subsidiary admin inside their subsidiary): `POST /org/units`
  `{"name", "type": "subsidiary|area|mine", "parent_id", "code"?, "mine_type": "UG|OC" (mines), "boundary": GeoJSON Polygon (mines)}`.
  - The boundary is validated (a real polygon, `[lng, lat]` inside India) and its centre is computed.
  - A new mine shows up at once in lists, the map and dashboards; its manager then fills the Mine Profile.
  - `PATCH /org/units/{id}` renames a unit or corrects a mine's type or boundary.
- **My Reports:** items `{kind, id, title, status, created_at, mine_id, link, evidence_id, trust_score, trust_level, flags}`.
  - `kind` ∈ `report, finding, task, attendance, capa_fix, grievance`.
  - `status` is plain text (e.g. `"capa open"`, `"accepted"`, `"refused: You are 2.2 km outside Moonidih UG."`,
    `"rejected: 411 m from the before-photo (limit 30 m)"`). Anonymous items are not listed.
- **Search:** `{"q", "results": [{"type": "mine|capa|inspection|contractor|worker|grievance", "id", "title", "subtitle", "link"}]}`
  (max 5 per type, only the user's area; `#123` finds CAPA/inspection 123; `GRV-XXXXXX` finds a grievance for officers).

#### 5. Mine profile: every field now matters
All 15 fields change which rules apply (depth, capacity, washery, EC number, CTO date and state were added). Show
the "why it applies" sentence; it now also says e.g. "the mine is 380 m deep" or "the Consent to Operate expires on
02 Dec 2026". **The CTO renewal task is due 90 days before the CTO expiry date in the profile** (not on 31 March);
it moves when the date changes. Obligations may carry `due_rule` (e.g. `{"field": "cto_valid_till", "days_before": 90}`).

#### 6. Real deployment
A backend started with `AUTO_BOOTSTRAP=false` has no demo data; the first admin is created with
`python -m seed.create_admin`, and everything else is built through the screens above. The rule catalogue,
checklists and escalation rules are always installed. The numbers quoted in this file were re-measured from the
current sample data.
