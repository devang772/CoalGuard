# 🛡️ CoalGuard

## AI-Powered Smart Governance, Safety & Compliance Monitoring System for Coal Mines

> **SIH 2026 Project**
>
> CoalGuard is a centralized intelligent mining-governance platform that combines **Artificial Intelligence, Document Intelligence, OCR, RAG, Geospatial Intelligence, GIS, 3D Digital Twin, Real-Time Field Monitoring, Predictive Risk Analytics, and Automated Compliance Monitoring** to improve mine safety, statutory compliance, incident management, and decision-making.

---

# 1. 🚀 Project Vision

CoalGuard aims to create a single digital intelligence layer for coal-mine governance.

Instead of keeping inspection reports, compliance records, field observations, incidents, documents, and geographic information in disconnected systems, CoalGuard connects them into one platform.

### Core idea

```text
Field Data
    ↓
Centralized Platform
    ↓
AI + GIS + Compliance Intelligence
    ↓
Risk Detection
    ↓
Actionable Alerts
    ↓
Corrective Action
    ↓
Resolution & Audit Trail
```

The goal is not simply to create a dashboard. The goal is to demonstrate an **end-to-end intelligent mining governance workflow**.

---

# 2. 🎯 Problem We Are Solving

Mining governance can involve:

- Large amounts of inspection data
- Paper/PDF-based reports
- Statutory compliance requirements
- Repeated manual verification
- Delayed identification of risks
- Geo-tagged field observations
- Incident and corrective-action tracking
- Multiple mines and locations
- Scattered operational information

CoalGuard brings these activities into a centralized system and adds AI-assisted analysis.

---

# 3. 💡 What CoalGuard Does

CoalGuard provides:

### 🧠 AI Intelligence
- OCR-based document extraction
- Document classification
- AI document understanding
- RAG-based knowledge retrieval
- Compliance analysis
- Risk analysis
- AI-generated recommendations
- Anomaly/risk detection

### 🗺️ Geospatial Intelligence
- Mine locations
- Mine boundaries
- Inspection locations
- Incident locations
- Risk zones
- Geo-tagged evidence
- Risk heatmaps
- 2D GIS
- 3D mine/digital-twin visualization

### 📋 Governance & Compliance
- Statutory compliance tracking
- Inspection management
- Violation tracking
- Corrective actions
- Due dates
- Escalations
- Audit trails
- Report generation

### 📱 Field Operations
- Mobile inspection application
- GPS capture
- Camera/photo evidence
- Field remarks
- Inspection submission
- Offline-friendly workflow where possible

---

# 4. 👥 Main Users

## Admin
- Manage users
- Manage mines
- Monitor overall system
- View audit logs
- Configure system

## Mine Manager
- Monitor mine health
- View risks
- Monitor compliance
- Review inspections
- Track corrective actions

## Safety Officer
- Conduct/review safety inspections
- Track hazards
- Review incidents
- Manage safety-related corrective actions

## Compliance Officer
- Monitor statutory requirements
- Review AI findings
- Track violations
- Monitor due dates
- Generate compliance reports

## Field Inspector
- Use mobile application
- Select mine
- Capture GPS
- Capture photos
- Submit inspection
- Record field observations

---

# 5. 🧩 Major Modules

The complete project is divided into the following modules:

```text
CoalGuard
│
├── Landing Website
├── Dashboard
├── Mine Management
├── Inspection Management
├── Compliance Management
├── Risk Intelligence
├── GIS & 3D Digital Twin
├── AI Document Intelligence
├── Incident Management
├── Alerts & Escalations
├── Reports
├── Mobile Field Inspection
├── Authentication & User Management
└── Audit Logs
```

---

# 6. 🏗️ System Architecture

```text
                         COALGUARD
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
         WEB PLATFORM   MOBILE APP    AI SERVICES
          React/TS       React Native    Python
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                       NODE BACKEND
                      Express + REST API
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        PostgreSQL       PostGIS      File Storage
              │
              │
              ▼
       ┌───────────────────────────┐
       │      AI INTELLIGENCE      │
       │                           │
       │ OCR                       │
       │ Document AI               │
       │ RAG                       │
       │ LLM                       │
       │ Compliance Engine         │
       │ Risk Engine               │
       └───────────────────────────┘
```

---

# 7. 🔄 Core End-to-End Workflow

This is the main workflow the entire team should build toward.

```text
Field Inspector
      ↓
Mobile Application
      ↓
Select Mine
      ↓
Capture Photo + GPS + Remarks
      ↓
Submit Inspection
      ↓
Node Backend
      ↓
PostgreSQL + PostGIS
      ↓
AI Analysis
      │
      ├── OCR
      ├── Document Intelligence
      ├── RAG
      ├── Compliance Analysis
      └── Risk Analysis
      ↓
Risk / Compliance Result
      ↓
Database Updated
      ↓
GIS Updated
      ↓
Dashboard Updated
      ↓
Alert Generated
      ↓
Corrective Action Assigned
      ↓
Action Resolved
      ↓
Audit Trail
```

---

# 8. 🖥️ Web Platform

The web platform is the main command center for mine managers, safety officers, compliance officers and administrators.

## Main Pages

```text
Landing Page
Login
Dashboard
Mines
Mine Details
Inspections
Compliance
Risk Intelligence
GIS Map
Documents
Incidents
Reports
Alerts
Users
Audit Logs
Settings
```

---

# 9. 📊 Dashboard

The dashboard should be **simple, information-dense and actionable**.

The user should understand the mine situation within a few seconds.

## Main KPI cards

- Total Mines
- Compliance Rate
- Active Inspections
- High-Risk Issues
- Open Corrective Actions
- AI Alerts

## Main dashboard sections

### Mine Health Overview
Shows:

- Mine
- Location
- Compliance
- Open issues
- Risk level
- Last inspection
- Operational status

### Risk Intelligence

Shows:

- Risk distribution
- Risk trend
- Risk categories
- High-risk mines

### Critical Actions

Shows:

- Critical alerts
- High-risk findings
- Overdue inspections
- Overdue corrective actions

### Compliance Overview

Shows:

- Overall compliance
- Safety compliance
- Environmental compliance
- Equipment compliance
- Statutory compliance
- Overdue requirements

### GIS Mini Map

Shows:

- Mine boundaries
- Inspection points
- Incidents
- Risk zones

### AI Executive Insight

Example:

```text
3 mines require attention today.

Jharia Mine shows an increase in
ground-stability risk over the last 7 days.

12 corrective actions are overdue
across 4 mines.
```

---

# 10. 🗺️ GIS & 3D Digital Twin

GIS is a major part of CoalGuard.

## 2D GIS

Should show:

- Mine boundaries
- Mine locations
- Inspection markers
- Incident markers
- Risk zones
- Geo-tagged evidence
- Risk heatmap

### Risk colors

```text
GREEN  → Low
YELLOW → Medium
ORANGE → High
RED    → Critical
```

## 3D Digital Twin

The 3D interface can visualize:

- Mine terrain
- Bench levels
- Haul roads
- Equipment
- Terrain elevation
- Risk zones
- Inspection locations
- Digital boundaries

### Technology

```text
2D GIS  → MapLibre / Mapbox
3D GIS  → CesiumJS
Spatial → PostgreSQL + PostGIS
```

---

# 11. 🤖 AI Document Intelligence

CoalGuard should be able to accept mine-related documents such as:

- Inspection reports
- Safety audits
- Compliance documents
- Environmental reports
- Equipment reports
- Incident reports

## Processing pipeline

```text
PDF / Image
     ↓
OCR
     ↓
Text Extraction
     ↓
Cleaning
     ↓
Document Classification
     ↓
Chunking
     ↓
Embeddings
     ↓
Vector Database
     ↓
RAG
     ↓
LLM
     ↓
Compliance Analysis
     ↓
Risk Analysis
     ↓
Recommendation
```

---

# 12. 🧠 RAG / Knowledge Engine

The RAG system should allow CoalGuard to retrieve relevant information from the project's approved mining/safety/compliance knowledge base.

Example question:

> "What compliance requirement is relevant to this safety issue?"

Expected flow:

```text
Question
   ↓
Embedding
   ↓
Vector Search
   ↓
Relevant Documents
   ↓
LLM
   ↓
Grounded Answer
   ↓
Source References
```

The system should return sources/references where possible rather than presenting unsupported statements as facts.

---

# 13. ⚠️ AI Risk Engine

The AI risk engine receives inspection/document/incident information and returns a structured assessment.

Example:

```json
{
  "riskScore": 82,
  "severity": "HIGH",
  "category": "GROUND_STABILITY",
  "confidence": 0.88,
  "explanation": "Potential slope instability indicators detected.",
  "recommendation": "Immediate inspection and corrective action required."
}
```

The risk engine should support categories such as:

- Safety
- Ground stability
- Equipment
- Fire
- Ventilation
- Environment
- Statutory compliance
- Other operational risks

---

# 14. 📱 Mobile Field Inspection

The mobile application is designed for field inspectors.

## Main flow

```text
Login
  ↓
Select Mine
  ↓
New Inspection
  ↓
Select Category
  ↓
Capture Photo
  ↓
Capture GPS
  ↓
Set Severity
  ↓
Add Remarks
  ↓
Submit
  ↓
Inspection History
```

The inspection should contain:

- Mine ID
- Inspector ID
- Category
- Severity
- Latitude
- Longitude
- Photo/evidence
- Remarks
- Timestamp
- Status

---

# 15. 🚨 Alerts

CoalGuard should generate alerts when important conditions occur.

Examples:

### Critical

```text
Potential slope instability detected
Jharia Mine
Risk Score: 82
```

### High

```text
Safety inspection overdue
Kusunda Mine
Overdue by 3 days
```

### Medium

```text
Compliance document expiring soon
Moonidih Mine
Due in 7 days
```

Actions:

- Review
- Assign
- Acknowledge
- Resolve

---

# 16. 📋 Compliance Management

Compliance module should track:

- Requirement
- Category
- Mine
- Current status
- Due date
- Evidence
- Responsible officer
- Corrective action
- Resolution status

Possible states:

```text
COMPLIANT
PARTIALLY_COMPLIANT
NON_COMPLIANT
OVERDUE
UNDER_REVIEW
```

---

# 17. 📝 Inspection Management

Inspection records should contain:

```text
Inspection ID
Mine
Inspector
Date
Category
Location
Findings
Risk
Evidence
Status
Corrective Action
```

Users should be able to:

- Search
- Filter
- Sort
- View details
- Assign actions
- Update status
- View inspection history

---

# 18. 🏭 Incident Management

Incident records should include:

- Incident ID
- Mine
- Location
- Date/time
- Category
- Severity
- Description
- Evidence
- Investigation status
- Assigned officer
- Corrective action
- Resolution

---

# 19. 📄 Reports

CoalGuard should support generation of:

- Compliance Report
- Inspection Report
- Risk Analysis Report
- Incident Report
- Environmental Report
- Mine Summary Report

Reports should be downloadable in appropriate formats where implemented.

---

# 20. 🔐 Authentication & Roles

Suggested roles:

```text
ADMIN
MINE_MANAGER
SAFETY_OFFICER
COMPLIANCE_OFFICER
INSPECTOR
```

Access should be role-based.

For example:

```text
ADMIN
→ Everything

MINE_MANAGER
→ Mine dashboard + risks + inspections + reports

SAFETY_OFFICER
→ Safety inspections + incidents + corrective actions

COMPLIANCE_OFFICER
→ Compliance + documents + reports

INSPECTOR
→ Mobile inspections + assigned tasks
```

---

# 21. 🧾 Audit Logs

Important actions should be recorded.

Examples:

```text
User uploaded document
User created inspection
AI generated finding
Officer acknowledged alert
Corrective action assigned
Corrective action resolved
Compliance status changed
Report generated
```

Audit log fields:

```text
User
Action
Entity
Entity ID
Timestamp
Metadata
```

---

# 22. 🧰 Technology Stack

## Frontend

```text
React
TypeScript
Vite
Tailwind CSS
Shadcn UI
React Router
Recharts / ECharts
MapLibre / Mapbox
CesiumJS
```

## Backend

```text
Node.js
Express
TypeScript
REST APIs
```

## Database

```text
PostgreSQL
PostGIS
```

## AI

```text
Python
FastAPI
PaddleOCR
LLM API
LangChain
RAG
pgvector / Vector Database
```

## Mobile

```text
React Native
Expo
```

## Storage

```text
Object Storage / Cloud Storage
```

## Authentication

```text
JWT / Clerk
```

## Development

```text
Git
GitHub
VS Code
Postman
Docker (optional)
```

---

# 23. 📁 Repository Structure

```text
CoalGuard/
│
├── README.md
│
├── docs/
│   ├── PROJECT_CONTEXT.md
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── API_CONTRACT.md
│   ├── DATABASE_SCHEMA.md
│   ├── AI_CONTRACT.md
│   ├── GIS_SPECIFICATION.md
│   └── DEMO_WORKFLOW.md
│
├── frontend/
│   └── React application
│
├── backend/
│   └── Node + Express application
│
├── ai-service/
│   └── Python + FastAPI AI service
│
├── mobile/
│   └── React Native application
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── schema.sql
│
├── infrastructure/
│   ├── docker/
│   ├── deployment/
│   └── monitoring/
│
├── tests/
│
└── mock-data/
    ├── mines.json
    ├── inspections.json
    ├── risks.json
    ├── compliance.json
    ├── incidents.json
    ├── alerts.json
    └── users.json
```

---

# 24. 👥 Team Responsibilities

## Person 1 — Frontend Lead

Folder:

```text
frontend/
```

Responsibilities:

- Landing page
- Dashboard
- UI components
- Charts
- Tables
- GIS interface
- 3D visualization interface
- AI insights UI
- Responsive design
- Frontend API integration

---

## Person 2 — Backend + Database

Folders:

```text
backend/
database/
```

Responsibilities:

- REST APIs
- PostgreSQL
- PostGIS
- Authentication
- Database schema
- Business logic
- File upload handling
- API validation
- Backend testing

---

## Person 3 — AI/ML Lead

Folder:

```text
ai-service/
```

Responsibilities:

- AI architecture
- LLM integration
- RAG
- Vector database
- Compliance engine
- Risk engine
- AI response format
- AI API endpoints

---

## Person 4 — AI/ML Support

Folder:

```text
ai-service/
data/
tests/
```

Responsibilities:

- OCR
- Text preprocessing
- Document classification
- Sample documents
- Prompt testing
- AI evaluation
- Test cases
- Support AI lead

---

## Person 5 — Mobile Developer

Folder:

```text
mobile/
```

Responsibilities:

- React Native app
- GPS
- Camera
- Inspection forms
- Photo upload
- Field inspection workflow
- Mobile API integration

---

## Person 6 — Integration / Testing / Deployment

Folders:

```text
infrastructure/
tests/
docs/
```

Responsibilities:

- Postman collection
- Integration testing
- End-to-end testing
- Deployment
- Environment setup
- Documentation
- Notifications
- Cross-module integration

---

# 25. 🔗 Module Communication

Each module communicates through documented contracts.

```text
Frontend
    ↓
REST API
    ↓
Backend
    ↓
PostgreSQL / PostGIS

Backend
    ↓
AI API
    ↓
AI Service

Mobile
    ↓
REST API
    ↓
Backend
```

Do not tightly couple modules by directly importing another team's source code.

---

# 26. 📡 API Contract Principle

The frontend and backend can be developed independently.

Example:

### Request

```http
GET /api/dashboard/overview
```

### Response

```json
{
  "totalMines": 24,
  "complianceRate": 82.4,
  "activeInspections": 18,
  "highRiskIssues": 5,
  "openCorrectiveActions": 37,
  "aiAlerts": 14
}
```

The frontend can use mock data before the backend is ready.

---

# 27. 🤖 AI Contract Principle

AI services should return predictable structured JSON.

Example:

```json
{
  "finding": "Safety berm deficiency",
  "severity": "HIGH",
  "confidence": 0.91,
  "riskScore": 82,
  "recommendation": "Immediate corrective action required"
}
```

Do not return unpredictable free-form responses when the result is consumed by the dashboard.

---

# 28. 🧪 Development Strategy

## Phase 1 — Foundation

Everyone sets up their module.

```text
Frontend → UI skeleton
Backend  → API skeleton
AI       → FastAPI + AI skeleton
Mobile   → App skeleton
Database → Schema + seed data
Testing  → Postman + integration setup
```

## Phase 2 — MVP

Implement:

```text
Authentication
Mine Management
Inspection
Dashboard
Database
Basic OCR
Basic AI Analysis
Mobile Inspection
GIS
Alerts
```

## Phase 3 — Intelligence

Add:

```text
RAG
Compliance Engine
Risk Engine
AI Insights
3D Digital Twin
Advanced GIS
Automated Reports
```

## Phase 4 — Integration

Complete:

```text
Mobile
   ↓
Backend
   ↓
AI
   ↓
Database
   ↓
GIS
   ↓
Dashboard
   ↓
Alerts
```

## Phase 5 — SIH Demo

Focus on one complete end-to-end scenario.

---

# 29. 🎬 Recommended SIH Demo Story

The final demo should tell one clear story.

### Step 1

Field inspector opens CoalGuard mobile app.

### Step 2

Selects:

```text
Jharia Mine
```

### Step 3

Captures an image of a hypothetical safety issue.

### Step 4

GPS coordinates are automatically attached.

### Step 5

Inspector submits the inspection.

### Step 6

Backend stores the inspection.

### Step 7

AI analyzes the evidence.

Example:

```text
Potential safety issue detected.

Category:
Ground Stability

Risk:
HIGH

Risk Score:
82

Confidence:
88%
```

### Step 8

AI checks relevant knowledge-base information.

### Step 9

Compliance finding is generated.

### Step 10

GIS map displays the inspection location.

### Step 11

Dashboard updates:

```text
High Risk Issues: +1
```

### Step 12

Alert appears:

```text
🔴 HIGH RISK

Jharia Mine

Potential ground stability issue detected.
```

### Step 13

Officer assigns corrective action.

### Step 14

Action is resolved.

### Step 15

Audit trail records the complete process.

This is the **main story everyone should build toward**.

---

# 30. 🌱 Future Scope

Potential future extensions:

- Computer vision from drone imagery
- IoT sensor integration
- Real-time equipment telemetry
- Predictive maintenance
- Satellite imagery analysis
- Advanced digital twins
- Automated regulatory updates
- Multilingual field assistant
- Voice-based inspection
- Offline-first mobile application
- Advanced anomaly detection

These are future possibilities and do not need to be implemented in the initial MVP.

---

# 31. 🔐 Security Rules

Never commit:

```text
.env
API keys
Passwords
Database credentials
Private tokens
Cloud credentials
```

Use:

```text
.env.example
```

Example:

```env
DATABASE_URL=
LLM_API_KEY=
MAP_API_KEY=
STORAGE_API_KEY=
JWT_SECRET=
```

---

# 32. 🌿 Git Workflow

Never directly push to `main`.

Create a feature branch:

```bash
git checkout -b feature/dashboard
```

Work and commit:

```bash
git add .
git commit -m "feat: add risk intelligence dashboard"
```

Push:

```bash
git push origin feature/dashboard
```

Then create a Pull Request.

---

# 33. 📝 Commit Convention

Use meaningful commits.

```text
feat: add inspection API
feat: add GIS risk layer
feat: add AI document analysis

fix: resolve inspection validation
fix: correct dashboard risk calculation

docs: update API contract

refactor: improve risk service

test: add compliance API tests
```

---

# 34. 🚨 Team Rules

1. Read the documentation before starting.
2. Work only in your assigned module.
3. Do not silently change API contracts.
4. Do not commit secrets.
5. Use mock data while another module is unfinished.
6. Test before creating a Pull Request.
7. Keep README/documentation updated.
8. Communicate breaking changes before merging.
9. Prefer simple MVP implementations over unnecessary complexity.
10. Every feature should contribute to the final end-to-end demo.

---

# 35. 🏆 Definition of Done

A feature is considered complete when:

- Code is implemented
- It works locally
- It follows the project contract
- It has been tested
- Errors are handled
- README/documentation is updated
- No secrets are committed
- Pull Request is created
- Integration with other modules is verified where applicable

---

# 36. ⭐ Final Product Vision

CoalGuard should ultimately feel like:

> **An intelligent command center for coal-mine safety, compliance and governance.**

Combining:

```text
AI
+
OCR
+
RAG
+
Computer Vision
+
Geospatial Intelligence
+
GIS
+
3D Digital Twin
+
Real-Time Monitoring
+
Predictive Risk Analytics
+
Automated Compliance
+
Mobile Field Intelligence
```

into one connected platform.

---

## 🚀 Start Here

If you are a new team member:

### Step 1
Read this README completely.

### Step 2
Read:

```text
docs/PROJECT_CONTEXT.md
```

### Step 3
Read the contract relevant to your module:

```text
Frontend  → API_CONTRACT.md
Backend   → API_CONTRACT.md + DATABASE_SCHEMA.md
AI        → AI_CONTRACT.md
Mobile    → API_CONTRACT.md
GIS       → GIS_SPECIFICATION.md
Integration → All contracts
```

### Step 4
Go to your assigned folder.

### Step 5
Use mock data/contracts if another module is not ready.

### Step 6
Build and test your module independently.

### Step 7
Create a Pull Request when your feature is ready.

---

# 🛡️ CoalGuard

### **AI-Powered Intelligence for Safer, Smarter & More Compliant Mines.**

**Build the modules independently. Integrate through contracts. Demonstrate one complete intelligent workflow.**
