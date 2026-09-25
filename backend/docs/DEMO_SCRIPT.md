# Khanan Netra: 5-minute demo script (backend behaviour)

This script lists **what to show, in which order, and what the audience will see**. Every step was run against the
real backend with the sample data (seed 42). Screens are the frontend team's; the API calls behind each step are
listed so anyone can also run the demo from Swagger (`http://localhost:8000/docs`).

Numbers such as risk %, counts and dates depend on the day you generate the sample data. The **patterns**
(Kusunda worst, monsoon rise, Maa Tara ghost ring…) are always the same.

---

## 0. Before the judges arrive (10 minutes)
```bash
cd backend
docker compose up -d                                   # PostgreSQL
.venv/Scripts/python -m seed.generate --reset          # fresh 6 months of sample data (~15 s)
# demo speed: 1 real minute counts as 1 hour for deadlines (SOS re-alert after ~15 s)
DEMO_TIME_SPEED=60 .venv/Scripts/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Open two browser windows: **CIL Admin** (`9000000001`) on the web dashboard, and **Area GM Jharia** (`9000000003`)
with the live notification bell visible. Keep a phone logged in as **Worker** (`9000000009`) and one as
**Safety Officer** (`9000000007`). The password for all is `demo123`.

---

## 1. The big picture (40 s): "one screen for all of Coal India"
**CIL Admin → Command Dashboard** (`GET /dashboard/summary`)
- 8 KPI cards compared with the previous 30 days: compliance ~76%, overdue tasks, open CAPAs by age, incidents,
  near-misses, photo trust ~88, workers present today, refused attendance.
- **Top risky mine: Kusunda OCP (100%)**, reason "Overdue CAPAs".
- Incidents chart: **monsoon rise** (Apr–Jun ≈ 0–1 per month → Jul–Sep ≈ 5–6).
- **Leaderboard** (`GET /dashboard/leaderboard`): Kusunda OCP last (~33/100); by subsidiary BCCL is last (CCL ≈ MCL > BCCL).
> Say: "Every number is scoped. A mine manager sees one mine, a GM their area, DGMS their region."

## 2. Laws → tasks, automatically (40 s)
**Mine Manager Moonidih → Mine Profile** (`PUT /mines/4/profile`): switch **uses explosives** off → save → on → save.
- Response: `removed` then `added` = `SAF-EXPL-D`, `SAF-MAG-W`, with **tasks created** straight away.
- **Applicable Obligations** (`GET /mines/4/obligations`): every rule shows *why it applies*, e.g.
  "Applies because the working method is underground and the seam gas degree is 2."
> Say: "No PDFs, no registers. The mine describes itself, and the ML engine (or our rule engine) knows the law."

## 3. Satya Proof: evidence that can't be faked (60 s)
**Safety Officer phone → inspection → critical finding "Loose roof" with a photo** (`POST /evidence`, `/inspections`, `/findings`)
- The photo gets **trust 100 "verified"**; a **CAPA is created automatically** (owner: manager, deadline 24 h), and the
  GM's bell lights up ("Critical finding at Moonidih UG").
- Now try to close it with the **old photo from ~400 m away** (`POST /capa/{id}/request-closure`):
  **rejected automatically**: "411 m from the before-photo (limit 30 m)" and "The before-photo was uploaded again."
- Close it with a **real photo at the spot**: all checks pass → **in review** → the manager tries to approve their own
  fix: **"Two-person rule: you submitted this fix, so someone else must check it."** → the GM approves → closed.
> Say: "Paper compliance is impossible: location, time, reused photos and fake GPS are all checked."

## 4. Emergency: SOS in real time (40 s)
**Worker phone → SOS "Gas"** (`POST /sos`)
- **5 people alerted**; the GM's screen shows "🆘 SOS at Moonidih UG: Gas" **instantly** (0.04 s over WebSocket).
- Wait ~15 seconds without answering → press **Run now: escalation** (or wait for the 5-minute job):
  "SOS at Moonidih UG **still unanswered after 16 min**" reaches the GM and BCCL again.
- Manager acknowledges → the worker sees **"Help is on the way"**, and the response time is recorded.

## 5. Ghost workers and labour compliance (40 s)
**Contractors** (`GET /contractors`): **Maa Tara Mining Works, score 3/100**. Open it (`GET /contractors/{id}`):
- "**17 workers use the same phone** (DEV-SHARED-7F3A). One person may be marking attendance for others."
- "Wages of 2 workers go to the same bank account" · "298 attendance records without gate entry" ·
  "Attendance jumped … usual ~34, possible ghost shift" · "3 workers paid below the minimum wage (₹310/day)".
- Worker attendance from 2 km away → **refused**: "You are 2.2 km outside Moonidih UG."
> Say: "Proxy attendance and wage fraud are caught by simple, explainable rules."

## 6. The worker's voice (20 s)
- **Voice report in Hindi** (ML voice → `POST /observations` with `source: "voice"`): the original words are kept, and
  serious reports automatically become a CAPA.
- **Anonymous grievance** (`POST /grievances`, category harassment): token `GRV-XXXXXX`; the name is stored **nowhere,
  not even in the audit history**.

## 7. Reports and tamper-proof history (40 s)
- **Reports → Generate** Moonidih, this month (`POST /reports`): PDF + Excel in ~0.3 s, each with a **SHA-256 fingerprint**.
  The manager tries to approve it: **two-person rule** → the GM approves → "approved".
- **Verify report** (`POST /reports/verify`): the original file → "Unchanged". Any edited file → "changed".
- **Audit → Verify Chain** (`GET /audit/verify`): ✅ all entries verified. Now (backstage) change one CAPA's status
  directly in the database, press Verify again → ❌ "**Record was changed outside the app**", fields `status`, `closed_at`.
```bash
docker exec khanan_netra_db psql -U netra -d khanan_netra -c "UPDATE capas SET status='open' WHERE id=<id>"
```
> Say: "Every change is sealed in a hash chain, the same idea as blockchain, without the cost."

## 8. Close (20 s)
"Khanan Netra doesn't just digitise paperwork. It makes every rule traceable, every report provable, and every risk
visible before it becomes an accident."

---

## If something goes wrong
| Problem | Fix |
|---|---|
| Numbers look odd / you practised on the data | `python -m seed.generate --reset` (15 s) |
| Tables changed after a `git pull` | rebuild the local DB (command in the README), then re-seed |
| SOS re-alert not showing | the server must run with `DEMO_TIME_SPEED=60`; then press **Run now → escalation** |
| Photos on Cloudinary fail | set `STORAGE_BACKEND=local` and restart (older cloud photos still open if the keys are set) |
| Port 5434 busy | `DB_PORT=5435 docker compose up -d` and change `DATABASE_URL` |
