# CoalGuard Frontend & Backend Integration Specification

Welcome to the **CoalGuard** frontend specification and backend alignment guide. This document details all features, user interface components, views, data requirements, and API endpoint contracts exposed across the CoalGuard platform.

Whether you are building the REST backend, designing database schemas, integrating IoT sensor streams, or connecting AI/ML pipelines, this document serves as the single source of truth for aligning the backend architecture with the frontend application.

---

## 🛠 Tech Stack

- **Framework**: React 19 + Vite + TanStack Start / TanStack Router (File-based routing)
- **Styling**: Custom CSS Design System (`styles.css`) + Tailwind CSS utilities + OKLCH Color Engine & Glassmorphism
- **Icons**: Lucide React (`lucide-react`)
- **State & Navigation**: TanStack Router (`@tanstack/react-router`) with typed routes
- **Fonts**: Space Grotesk (Display) & Manrope (Body) via Google Fonts

---

## 🚀 Application Structure & Routing

```
frontend/
├── public/
│   ├── favicon.svg             # CoalGuard brand shield icon
│   └── ...
├── src/
│   ├── assets/                 # High-resolution mine imagery & digital twin media
│   ├── components/
│   │   ├── dashboard-views/    # Modular view components for dashboard tabs
│   │   │   ├── AlertsView.tsx
│   │   │   ├── AuditLogsView.tsx
│   │   │   ├── ComplianceView.tsx
│   │   │   ├── DocumentsView.tsx
│   │   │   ├── GISMapView.tsx
│   │   │   ├── IncidentsView.tsx
│   │   │   ├── InspectionsView.tsx
│   │   │   ├── MinesView.tsx
│   │   │   ├── ReportsView.tsx
│   │   │   ├── RiskIntelligenceView.tsx
│   │   │   ├── SettingsView.tsx
│   │   │   └── UsersView.tsx
│   │   └── ui/                 # Reusable UI primitives (Buttons, Dropdowns, Cards)
│   ├── routes/
│   │   ├── __root.tsx          # Main Root Layout (Meta tags, document head, fonts)
│   │   ├── index.tsx           # Public Landing Page (`/`)
│   │   └── dashboard.tsx       # Main Command Center Dashboard (`/dashboard`)
│   └── styles.css              # Unified Design System & Animation Engine
└── README.md
```

---

## 🌐 Public Landing Page (`/`) — Feature Overview

The public landing page introduces CoalGuard's AI-driven mine governance platform to executives, safety directors, and regulatory authorities.

### Key Landing Features:
1. **Auto-Hiding Shutter Navigation**:
   - Floating glassmorphic header with logo, section anchors, and Quick Dashboard action button.
   - Smooth auto-hide shutter animation when scrolling down, auto-reappear when scrolling up.
2. **Interactive Hero & Digital Twin Visual**:
   - High-contrast hero section with live terrain coordinate sync HUD (`23.7957° N / 86.4304° E`).
   - Dynamic floating risk pins (High, Medium, Low) and compliance percentage gauge (`94.2%`).
3. **Live Animated Metrics**:
   - Real-time scroll-triggered count-up numbers:
     - `24+` Mines Onboarded
     - `10K+` Inspections Processed
     - `98%` Compliance Visibility
     - `40%` Faster Issue Resolution
     - `24/7` Intelligent Monitoring
4. **Capability Strip**:
   - AI Document Intelligence, Real-time Field Monitoring, 3D Digital Twin, Automated Compliance, and Predictive Risk Alerts.
5. **Operating Shift Comparison**:
   - Traditional reactive vs. CoalGuard predictive compliance workflow.
6. **AI Architecture & Intelligence Flow**:
   - Step-by-step pipeline visualization: Document AI → OCR → Knowledge Engine → RAG → Compliance Intelligence → Risk Engine → Decision Support.
7. **Geospatial & 3D Twin Interactive Console**:
   - Real-time switchable map views: `3D View`, `Thermal Layer`, `Slope Instability`, `Gas Sensors`.
   - Interactive side panel for toggling GIS data layers.
8. **Compliance Scorecard & Audit Trail Preview**:
   - Live DGMS compliance index preview with breakdown of open violations and resolution timelines.
9. **Field Mobile App Simulation**:
   - Interactive mobile layout preview showing field inspector evidence upload, instant geo-tagging, and voice hazard reporting.
10. **Interactive Intelligence Demo Modal**:
    - Simulated live demo video popup showing real-time AI computer vision threat detection.

---

## 📊 Command Center Dashboard (`/dashboard`) — Feature Overview

The dashboard is a centralized command hub for mine managers, safety officers, and DGMS compliance auditors.

### 1. Main Overview View (`Gauge`)
- **Top KPIs**: Total Active Mines, Open Inspections, Compliance Visibility Index, Critical Safety Incidents.
- **Interactive Search & Quick Actions**: Search bar with real-time filter across mines, inspectors, and alert tags.
- **Live Risk Heatmap / Matrix**: Grid visualizing real-time risk severity across mine sectors.
- **Priority Remediation Queue**: List of immediate action items requiring manager sign-off.
- **Recent Alert Feed**: Filterable activity stream with live timestamping.

### 2. Mines View (`MinesView`)
- **View Modes**: Switchable Grid View & Table View.
- **Mine Metadata**: Mine Name, Code, Location (State/District), GPS Coordinates, Operational Status (Active, Warning, Critical, Maintenance), Safety Score, Risk Index, Active Workers, Production Capacity.
- **Filters**: Filter by status, region, risk tier, or search string.
- **Actions**: Add New Mine modal, View Detailed Analytics, Export Mine Roster.

### 3. Inspections View (`InspectionsView`)
- **Inspection Logs Table**: Track field safety inspections across all mine sites.
- **Status Tiers**: `Pending`, `In Progress`, `Passed`, `Failed`.
- **Fields**: Inspection ID, Mine Site, Assigned Inspector, Date, AI Hazard Score, Hazards Flagged, Inspection Report File link.
- **Actions**: Schedule New Inspection modal, View Inspector Findings, Assign Field Inspector.

### 4. Compliance View (`ComplianceView`)
- **Regulatory Framework Matrix**: DGMS (Directorate General of Mines Safety) standards, ISO 45001, Environmental Regulations.
- **DGMS Score Breakdown**: Ventilation index, Slope stability score, Gas safety compliance, Machinery maintenance status.
- **Violation Tracker**: Active compliance gaps, fine risk estimation, regulatory deadline countdowns.
- **Export**: Generate Official DGMS Compliance Report (PDF / CSV).

### 5. Risk Intelligence View (`RiskIntelligenceView`)
- **AI Predictive Risk Engine**: Real-time probabilities for critical mine hazards:
  - Slope Instability / Rockfall Hazard
  - Methane / Hazardous Gas Accumulation
  - Haul Road Collision & Vehicle Proximity
  - Heavy Machinery Overheating
- **Predictive Analytics Charts**: Hazard trend lines, weather risk correlation, historical incident forecasting.

### 6. GIS Map View (`GISMapView`)
- **Geospatial Command Center**: Fullscreen interactive mine map canvas.
- **Map Modes & Layers**:
  - Satellite View / Topographic Basemap
  - Thermal / Heatmap Layer
  - AI Risk Hotspot Polygons
  - Gas Sensor Node Markers
  - Field Team Live Position Trackers
- **Sensor Popups**: Clickable map pins showing real-time gas level (CH4, CO, O2), temperature, tilt angles.

### 7. Documents View (`DocumentsView`)
- **AI Document Intelligence Engine**: Central repository for safety manuals, DGMS circulars, shift logs, inspection reports.
- **Automated Processing**: AI OCR extraction status (`Queued`, `Processing`, `Completed`, `Failed`).
- **Metadata Tagging**: Automatic detection of severity keywords, cited regulations, and required action items.
- **Actions**: File drag-and-drop upload modal, keyword search, category filters.

### 8. Incidents View (`IncidentsView`)
- **Emergency Response Center**: Active safety incidents, accidents, near-misses.
- **Severity Levels**: `Critical` (Red), `High` (Orange), `Medium` (Yellow), `Low` (Green).
- **Incident Lifecycle**: `Reported` → `Investigating` → `Dispatching Field Team` → `Resolved`.
- **Actions**: Dispatch Response Team trigger, Attach Camera Evidence, Log Root Cause Analysis.

### 9. Reports View (`ReportsView`)
- **Automated Report Generator**: Daily safety digest, DGMS quarterly compliance audit, environmental impact summary.
- **Scheduled Exports**: Configure automated email/webhook reports to management and regulatory bodies.

### 10. Alerts View (`AlertsView`)
- **Real-Time Alert Feed**: Categorized by severity (`Critical`, `Warning`, `Info`).
- **Actions**: Acknowledge alert, Assign responsibility, Broadcast Emergency Alarm.

### 11. Users View (`UsersView`)
- **Role-Based User Roster**: Mine Managers, Safety Officers, DGMS Auditors, Field Inspectors, System Administrators.
- **Actions**: Add User modal, Edit Role & Permissions, Deactivate User.

### 12. Audit Logs View (`AuditLogsView`)
- **Immutable System Log**: Comprehensive timeline of user actions, AI hazard alerts, inspector sign-offs, document uploads, and configuration changes.

### 13. Settings View (`SettingsView`)
- **System Preferences**: AI risk threshold sliders, WebSocket notification toggles, API webhooks, regional unit selections (Metric / Imperial), Dark mode theme options.

---

## 🔗 Backend Alignment & API Contracts Specification

To build a fully functional backend API that seamlessly integrates with this frontend, implement the following REST endpoints and WebSocket channels according to the schemas defined below.

### Base URL & Versioning
- **REST Base URL**: `http://localhost:8000/api/v1`
- **WebSocket URL**: `ws://localhost:8000/ws/v1`
- **Authentication**: HTTP Header `Authorization: Bearer <JWT_TOKEN>`

---

### 🔑 1. Authentication & User Profile (`/auth`)

#### `POST /api/v1/auth/login`
**Request Payload**:
```json
{
  "email": "manager@coalguard.gov.in",
  "password": "SecurePassword123!"
}
```
**Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "id": "usr-8821",
    "name": "Rajesh Sharma",
    "email": "manager@coalguard.gov.in",
    "role": "MINE_MANAGER",
    "assignedMineId": "mine-jharia-04",
    "avatarUrl": "https://api.coalguard.gov.in/avatars/usr-8821.jpg"
  }
}
```

---

### ⛏ 2. Mines Management (`/mines`)

#### `GET /api/v1/mines`
**Query Parameters**: `status` (optional), `region` (optional), `search` (optional), `page` (default `1`), `limit` (default `20`)

**Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "mine-jharia-04",
      "name": "Jharia Block 4 Open Pit",
      "code": "CG-JH-004",
      "location": "Dhanbad, Jharkhand",
      "coordinates": { "lat": 23.7957, "lng": 86.4304 },
      "status": "ACTIVE",
      "safetyScore": 94.2,
      "riskIndex": "LOW",
      "activeWorkers": 342,
      "dailyProductionTons": 12500,
      "dgmsZone": "Zone 1 - East",
      "lastInspectionDate": "2026-09-20T10:30:00Z"
    }
  ],
  "total": 24,
  "page": 1,
  "limit": 20
}
```

#### `POST /api/v1/mines`
**Request Payload**:
```json
{
  "name": "Singrauli North Pit",
  "code": "CG-MP-012",
  "location": "Singrauli, Madhya Pradesh",
  "coordinates": { "lat": 24.1982, "lng": 82.6698 },
  "dgmsZone": "Zone 3 - Central",
  "dailyProductionTons": 18000
}
```

---

### 📋 3. Safety Inspections (`/inspections`)

#### `GET /api/v1/inspections`
**Query Parameters**: `mineId` (optional), `status` (`PENDING`, `IN_PROGRESS`, `PASSED`, `FAILED`), `inspectorId` (optional)

**Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "insp-9041",
      "mineId": "mine-jharia-04",
      "mineName": "Jharia Block 4 Open Pit",
      "inspectorName": "Amit Kumar",
      "inspectorId": "usr-3310",
      "date": "2026-09-22T08:15:00Z",
      "status": "PASSED",
      "aiRiskScore": 14.5,
      "hazardsFlagged": 0,
      "findings": "Ventilation velocity and slope angles verified compliant with DGMS standards.",
      "reportUrl": "https://api.coalguard.gov.in/reports/insp-9041.pdf"
    }
  ],
  "total": 1042
}
```

---

### 🛡 4. Compliance & DGMS Analytics (`/compliance`)

#### `GET /api/v1/compliance/summary`
**Response (200 OK)**:
```json
{
  "overallComplianceRate": 98.2,
  "dgmsComplianceScore": 96.5,
  "environmentalScore": 99.1,
  "iso45001Score": 97.8,
  "activeViolationsCount": 2,
  "pendingRemediationsCount": 4,
  "nextScheduledAudit": "2026-10-15T09:00:00Z",
  "breakdown": [
    { "category": "Ventilation & Gas Control", "score": 98.0, "status": "COMPLIANT" },
    { "category": "Bench & Slope Stability", "score": 92.5, "status": "WARNING" },
    { "category": "Haul Road Safety", "score": 99.0, "status": "COMPLIANT" },
    { "category": "Machinery Maintenance", "score": 96.2, "status": "COMPLIANT" }
  ]
}
```

---

### 🧠 5. AI Risk Intelligence (`/risk`)

#### `GET /api/v1/risk/predictions`
**Query Parameters**: `mineId` (optional)

**Response (200 OK)**:
```json
{
  "mineId": "mine-jharia-04",
  "timestamp": "2026-09-23T02:30:00Z",
  "overallRiskTier": "MEDIUM",
  "hazards": [
    {
      "id": "hazard-801",
      "type": "SLOPE_INSTABILITY",
      "sector": "West Pit Bench 3",
      "probability": 0.74,
      "severity": "HIGH",
      "recommendedAction": "Restrict heavy truck movement near Bench 3 and deploy slope displacement sensors.",
      "coordinates": { "lat": 23.7961, "lng": 86.4312 }
    },
    {
      "id": "hazard-802",
      "type": "GAS_ACCUMULATION",
      "sector": "Underground Shaft B",
      "probability": 0.28,
      "severity": "MEDIUM",
      "recommendedAction": "Increase main exhaust fan speed by 15%.",
      "coordinates": { "lat": 23.7948, "lng": 86.4298 }
    }
  ]
}
```

---

### 🗺 6. GIS & Sensor Network (`/gis`)

#### `GET /api/v1/gis/sensors`
**Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "snsr-gas-01",
      "mineId": "mine-jharia-04",
      "type": "GAS_CH4",
      "name": "Methane Sensor Node 01",
      "value": 0.42,
      "unit": "% VOL",
      "status": "NORMAL",
      "thresholdWarning": 1.0,
      "thresholdCritical": 1.25,
      "coordinates": { "lat": 23.7955, "lng": 86.4308 },
      "lastUpdated": "2026-09-23T02:45:00Z"
    },
    {
      "id": "snsr-tilt-04",
      "mineId": "mine-jharia-04",
      "type": "SLOPE_TILT",
      "name": "Bench Tilt Sensor 04",
      "value": 3.8,
      "unit": "DEGREES",
      "status": "WARNING",
      "thresholdWarning": 3.5,
      "thresholdCritical": 5.0,
      "coordinates": { "lat": 23.7962, "lng": 86.4315 },
      "lastUpdated": "2026-09-23T02:44:50Z"
    }
  ]
}
```

---

### 📄 7. Document Intelligence (`/documents`)

#### `POST /api/v1/documents/upload`
**Content-Type**: `multipart/form-data`
**Payload**: `file` (Binary File), `category` (`DGMS_CIRCULAR`, `INSPECTION_LOG`, `SAFETY_AUDIT`, `SHIFT_LOG`), `mineId` (string)

**Response (201 Created)**:
```json
{
  "id": "doc-5521",
  "fileName": "DGMS_Safety_Circular_2026_04.pdf",
  "fileUrl": "https://api.coalguard.gov.in/docs/doc-5521.pdf",
  "ocrStatus": "PROCESSING",
  "uploadDate": "2026-09-23T02:47:00Z",
  "estimatedCompletionSeconds": 5
}
```

#### `GET /api/v1/documents/:id`
**Response (200 OK)**:
```json
{
  "id": "doc-5521",
  "fileName": "DGMS_Safety_Circular_2026_04.pdf",
  "ocrStatus": "COMPLETED",
  "category": "DGMS_CIRCULAR",
  "extractedText": "Directive regarding mandatory installation of slope monitoring radar in all open pit coal mines with depth exceeding 100m...",
  "riskSeverity": "HIGH",
  "detectedKeywords": ["Slope Radar", "Open Pit", "Mandatory Compliance", "DGMS Section 22"],
  "actionItemsRequired": [
    "Verify slope radar installation at Jharia Block 4",
    "Submit compliance certificate to Regional Inspector before Oct 30"
  ]
}
```

---

### 🚨 8. Incidents & Emergency Response (`/incidents`)

#### `GET /api/v1/incidents`
**Response (200 OK)**:
```json
{
  "data": [
    {
      "id": "inc-1092",
      "mineId": "mine-jharia-04",
      "title": "Bench Slumping Detected on North Wall",
      "severity": "HIGH",
      "status": "INVESTIGATING",
      "reportedAt": "2026-09-23T01:15:00Z",
      "reportedBy": "AI Slope Computer Vision Engine",
      "fieldTeamDispatched": true,
      "assignedTeam": "Alpha Response Unit",
      "coordinates": { "lat": 23.7965, "lng": 86.4310 },
      "resolutionNotes": null
    }
  ]
}
```

#### `PATCH /api/v1/incidents/:id/dispatch`
**Request Payload**:
```json
{
  "fieldTeamId": "team-alpha-01",
  "dispatchNotes": "Deploy mobile laser scanner and clear haul trucks from North Wall."
}
```

---

### 🔔 9. Real-Time Telemetry & Alert Stream (WebSocket)

- **WebSocket Connection Endpoint**: `ws://localhost:8000/ws/v1/telemetry`
- **Authentication**: Query Param `?token=<JWT_TOKEN>` or initial socket frame.

#### Incoming WebSocket Frame (Server -> Frontend):
```json
{
  "event": "SENSOR_TELEMETRY",
  "timestamp": "2026-09-23T02:48:00.124Z",
  "data": {
    "sensorId": "snsr-gas-01",
    "mineId": "mine-jharia-04",
    "value": 1.12,
    "unit": "% VOL",
    "status": "WARNING",
    "alertTriggered": true,
    "alertMessage": "CH4 concentration exceeded warning threshold (1.0% VOL)"
  }
}
```

#### Incoming Emergency Alert Frame (Server -> Frontend):
```json
{
  "event": "CRITICAL_ALERT",
  "timestamp": "2026-09-23T02:48:05.000Z",
  "data": {
    "alertId": "alt-9901",
    "mineId": "mine-jharia-04",
    "mineName": "Jharia Block 4 Open Pit",
    "severity": "CRITICAL",
    "title": "CRITICAL GAS LEAK DETECTED",
    "description": "Shaft B Methane level exceeded 1.25% safety limit.",
    "audioAlarm": true
  }
}
```

---

## ⚙️ Environment Variables Setup

Create a `.env` or `.env.local` file in the `frontend` root directory:

```env
# API Base Endpoint (REST)
VITE_API_BASE_URL=http://localhost:8000/api/v1

# Real-Time WebSocket Endpoint
VITE_WS_URL=ws://localhost:8000/ws/v1

# Optional Mapbox / GIS Tile Server Key
VITE_GIS_TILE_SERVER_KEY=your_gis_tile_key_here
```

---

## 💻 Local Development Commands

To run the frontend locally during development:

```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev

# 3. Build production bundle (client + SSR)
npm run build

# 4. Preview production build locally
npm run preview
```

---

## 🔒 Security & Data Compliance Standards
- **DGMS Data Protection**: All telemetry and document streams must be encrypted via TLS 1.3 in transit.
- **Role-Based Access Control (RBAC)**: Ensure backend API enforces permissions based on `user.role`:
  - `ADMIN`: Full system CRUD & user management.
  - `MINE_MANAGER`: Full view & incident dispatch for assigned mines.
  - `SAFETY_INSPECTOR`: Inspection entry & field upload permissions.
  - `DGMS_AUDITOR`: Read-only compliance audit & report export access.
