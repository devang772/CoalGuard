# Frontend wiring handoff: retain the UI, replace every mock

## Objective

Restore the original dashboard and sidebar visual design, then connect every view and action to the existing backend. The completed application must render only data supplied by the API. Do not add fixture data, optimistic fake success messages, or fallback records.

The current implementation proved that the main sidebar **read endpoints** can be reached, but it replaced most purpose-built screens with a generic `LiveDataView` table. That is a diagnostic bridge, not the target UX.

## Important current state

- Backend is available at `http://127.0.0.1:8000`; health returns a connected PostgreSQL database.
- Frontend runs at `http://127.0.0.1:5173`.
- Auth is `POST /auth/login` with `{ "phone", "password" }`; store `access_token` and send `Authorization: Bearer <token>`.
- All 16 sidebar read mappings below returned HTTP 200 against the running backend on 2026-09-26.
- `GET /ai/risk` returned real, database-derived ML inference results with `source: "ml_model"`.
- `GET /evidence/recent` was added because `GET /evidence` requires an `ids` query parameter. Use `/evidence/recent` for the document/evidence list.
- The running database is seeded demonstration data. It is real API/PostgreSQL data, but it is not production mine data.

The authoritative endpoint contracts, request examples, pagination, RBAC rules, and role matrix are in [backend/docs/FOR_FRONTEND_TEAM.md](backend/docs/FOR_FRONTEND_TEAM.md). Verify any body shape in the live Swagger UI (`http://127.0.0.1:8000/docs`) before wiring a mutation.

## First: restore the intended UI without discarding useful integration fixes

Do **not** run `git reset --hard` or blindly restore all changed files: backend ML/API work and SSR/auth safeguards are intentional. Restore the original component layouts from `HEAD`, then port the real API calls into those layouts one view at a time.

The following files had their original screen-specific UI replaced by generic tables and should be rebuilt from their `HEAD` designs while retaining real API state, loading, empty, forbidden, and error states:

- `frontend/src/routes/dashboard.tsx`
- `frontend/src/components/dashboard-views/{AlertsView,AttendanceView,AuditLogsView,ComplianceView,ContractorsView,DocumentsView,GISMapView,GrievancesView,IncidentsView,InspectionsView,LeaderboardView,MinesView,ReportsView,RiskIntelligenceView,RuleStudioView,SettingsView,UsersView}.tsx`
- `frontend/src/routes/index.tsx` only if the original marketing landing page is still intended.

Suggested safe workflow:

1. Inspect the current diff and capture the old file from `HEAD` (for example, `git show HEAD:frontend/src/components/dashboard-views/MinesView.tsx`).
2. Restore the visual component structure and interactions from that version.
3. Replace each mock selector, static array, fake timer, and success toast in that one screen with calls through `frontend/src/lib/api.ts`.
4. Verify the screen before starting the next one. Delete `LiveDataView.tsx` only after no view imports it.

Keep these changes unless a test demonstrates a regression:

- `frontend/src/lib/api.ts`: real API client and SSR-safe storage access.
- `frontend/src/store/useAppStore.ts`: SSR-safe persisted-auth loading.
- `frontend/src/routes/login.tsx` and the hydration gate in `dashboard.tsx`: prevents server-rendered `localStorage` crashes and hydration mismatch.
- `frontend/src/components/common/AskNetraFloating.tsx`: use the real `/ai/ask-netra` response; preserve the old visual treatment if needed.
- `backend/app/ai/*`, `backend/app/services/risk.py`, and `backend/app/routers/{ai,evidence}.py`: real ML and real evidence listing support.

Do not touch `mobile/package-lock.json` or the generated `frontend/src/routeTree.gen.ts` unless your own change regenerates them; they are unrelated/noisy changes.

## Shared frontend rules

1. Use backend IDs (numbers), not mock string IDs.
2. List endpoints generally return `{ items, total, page, page_size }`; render `items` and retain pagination controls.
3. Never substitute an empty/static dataset on a request failure. Show a retryable, visible error with the backend message.
4. Disable action controls while a request is pending. Only show success after the API response is successful; re-fetch/invalidate the affected query after mutations.
5. Honor backend `401`, `403`, and `422` responses. A `403` should hide or disable restricted controls with a clear permission explanation.
6. Put the current scope in query parameters where supported (`org_id`, `mine_id`, status filters). Scope must never be widened client-side.
7. Evidence upload is multipart: upload first to `POST /evidence`, then use its returned `id` in the inspection/task/CAPA/attendance/observation request.
8. Use API times as sent (UTC-aware) and format for IST. Do not manufacture timestamps.
9. Wire the notification WebSocket at `ws://<api-host>/ws/notifications?token=<token>` after the REST screens work; reconcile messages with the REST notification list.

## Sidebar implementation plan

| Sidebar screen | Read data already proven | Restore/wire these real workflows | Done when |
| --- | --- | --- | --- |
| Overview | `GET /dashboard/summary`, `/mines`, `/ai/risk` | Link KPI cards to filtered Mine/Task/CAPA detail views; global search uses `GET /search?q=` | Values, links, and empty/error states are real. |
| Mines | `GET /mines` | `GET /mines/{id}`, profile `GET/PUT /mines/{id}/profile`, calendar, compliance, mine obligations; admin org create/edit | Existing grid/table/filter/detail UX displays live values and authorized profile updates persist after reload. |
| Inspections | `GET /inspections`, `GET /checklists` | `POST /inspections`, `POST /inspections/{id}/findings`, `POST /inspections/{id}/submit`; upload finding evidence first | A permitted user can start, save findings with evidence, submit, and see the new inspection in the list. |
| Compliance / Rule Studio | `GET /obligations` | `GET /tasks`, `/tasks/summary`, task detail, `POST /tasks/{id}/complete`, `GET/PATCH /mines/{id}/obligations/{linkId}`, refresh, generate tasks | The existing compliance UI uses actual tasks/obligations and authorized actions survive refresh. |
| Risk Intelligence | `GET /ai/risk` | `GET /ai/anomalies`, `GET /ai/recurrence`; preserve charts/cards and bind them to the returned live values | No chart/data point is hard-coded; ML response failures are obvious. |
| GIS | `GET /gis/mines` | `GET /gis/pins`; plot the real GeoJSON boundaries, mine centres, and pins on the existing map UI | Map layers/popup details are backed by responses, not sample coordinates. |
| Documents | `GET /evidence/recent` | multipart `POST /evidence`, evidence detail/file views; connect uploaded evidence to its originating workflow | Upload progress/error is truthful and a newly uploaded file appears after refresh. |
| Incidents | `GET /observations?type=incident` | `POST /observations`, `POST /observations/{id}/acknowledge`, `POST /observations/{id}/convert`, `POST /sos`, `GET /sos/active` | Incident/SOS lifecycle controls call real APIs and show their returned status. |
| Attendance | `GET /attendance`, `/attendance/summary`, `/attendance/me` | `POST /attendance` after selfie evidence upload; use actual location/accuracy and server checks | No fake check-in success; server rejection/reasons display to the operator. |
| Contractors | `GET /contractors` | create/update contractor; contractor detail, alerts, workers; worker create/update/deactivate as allowed | The original roster/detail workflow reflects saved backend records. |
| Grievances | `GET /grievances` | submit `POST /grievances`, tracking lookup, authorized `PATCH /grievances/{id}` | Receipt token, anonymous state, and status changes are backend-issued. |
| Alerts | `GET /notifications`, unread count | mark one/read all; websocket updates | Read state persists after reload and live updates appear without mock timers. |
| Reports | `GET /reports`, `/me/reports` | `POST /reports`, report detail/file, `POST /reports/verify` | Generate/download/verify controls operate on actual report IDs and files. |
| Users | `GET /users` | user create/edit/deactivate/reset password; own profile/password endpoints | RBAC controls match server authorisation and changes persist. |
| Settings | `GET /config/escalation` | `PUT /config/escalation`, jobs status/run, own profile/preferences | Settings save only on API success and reload from the server. |
| Audit logs | `GET /audit/recent` | `GET /audit/verify`, audit record detail | Existing audit UX has real filters, chain verification, and error display. |
| Leaderboard | `GET /dashboard/leaderboard` | drill into correct mine/user data if the design exposes links | Rankings are computed by backend and scope-aware. |

## Additional backend workflow endpoints not represented cleanly in the current sidebar

- CAPA board: `GET /capa`, `/capa/summary`, `GET /capa/{id}`, `POST /capa/{id}/assign`, `POST /capa/{id}/request-closure`.
- Approvals: `GET/POST /approvals` for the two-person approval flow.
- Organisation: `GET /org/tree`, `GET/POST/PATCH /org/units...`.
- Audit: `GET /audit/recent`, `/audit/verify`, and audit record endpoints.
- Offline/mobile sync: `GET /sync/master`, `POST /sync/bulk` (keep this separate from web UI wiring).

Expose these through the pre-existing UX where it makes sense, or add a clearly designed surface consistent with the restored UI. Do not hide a missing feature behind a placeholder button.

## Definition of done / verification matrix

For every sidebar screen and every enabled action:

1. Start API, database, and frontend from a clean browser session.
2. Log in with at least one permitted role and one read-only/restricted role.
3. Confirm the exact request in DevTools or a test harness: URL, method, auth header, query/body, and non-mocked response.
4. Test loading, populated, empty, API error, 401, 403, and validation (422) presentation where applicable.
5. For mutations, submit a legitimate change/upload, reload the page, and confirm the persisted server response; then clean up only through an allowed API/UI workflow if desired.
6. Confirm no `mock`, `fixture`, demo timers, `Math.random`, or fallback array is used to populate production screen state. Seeded backend data is acceptable only as backend data.
7. Run `npm run build` in `frontend` and the relevant backend tests. Report every failure; do not claim whole-app success from a partial sweep.
8. Run an end-to-end browser pass over every sidebar link and record an evidence table of screen, action, API response status, and result.

## Known remaining risks to report, not mask

- The real ML inference pipeline executes, but model-quality validation against production data remains a separate ML validation task.
- Seeded evidence has placeholder file paths in some records; render a truthful unavailable-file state rather than an invented image.
- `backend/.env` uses development/demo configuration unless explicitly hardened. Replace the JWT secret and disable demo/bootstrap behaviour before deployment.
- The backend documentation has older examples in places; Swagger and router schemas are the final source for mutation payloads.

