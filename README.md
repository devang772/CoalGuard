# CoalGuard — AI-Powered Mine Intelligence & Governance Platform

> **AI-Driven Safety, Geospatial Intelligence, and DGMS Compliance Governance for Modern Coal Mines.**

CoalGuard combines **Artificial Intelligence**, **Computer Vision**, **Geospatial Intelligence (GIS)**, **3D Digital Twins**, and **IoT Sensor Telemetry** to transform mine safety, regulatory compliance, and operational risk management into a real-time, predictive intelligence loop.

---

## 📌 Problem Statement & Core Vision

Traditional open-pit and underground mining safety management suffers from fragmented manual reporting, delayed hazard detection, paper-heavy regulatory audits, and disconnected field teams. 

**CoalGuard** solves this by establishing a unified digital command center:
1. **Predictive Risk over Reactive Response**: AI engines process real-time sensor streams and terrain data to alert mine managers to slope instability, gas accumulation, or vehicle collisions *before* incidents happen.
2. **Automated DGMS Compliance**: Instant compliance scoring against Directorate General of Mines Safety (DGMS) regulations, ISO 45001, and environmental frameworks.
3. **End-to-End Field Visibility**: Connects field inspectors with safety officers through mobile evidence capture, real-time alert dispatching, and geospatial digital twins.

---

## ✨ Core Features & Platform Capabilities

### 🌐 1. Public Landing Site (`/`)
- **Auto-Hiding Shutter Navigation**: Glassmorphic header that slides off-screen smoothly on scroll down and reappears on scroll up.
- **Interactive Digital Twin Hero**: Real-time HUD showing mine coordinates (`23.7957° N / 86.4304° E`), floating risk pins, and compliance visibility metrics.
- **Live Animated Metrics**: Scroll-triggered counting statistics (`24+` Mines Onboarded, `10K+` Inspections, `98%` Compliance Visibility, `40%` Faster Issue Resolution).
- **Interactive AI Architecture Flow**: Step-by-step pipeline visualization from Document AI → OCR → RAG → Compliance Intelligence → Decision Support.
- **Geospatial 3D Twin Console**: Interactive map viewer with switchable `3D View`, `Thermal Layer`, `Slope Instability`, and `Gas Sensor` layers.
- **Field Inspector Mobile App Preview**: Simulated mobile interface showing instant geo-tagging and camera evidence upload.

### 📊 2. Mine Command Center Dashboard (`/dashboard`)
- **Main Command Overview**: Key KPI cards, interactive multi-mine search, live risk heatmap matrix, priority remediation queue, and real-time alert feed.
- **Mines Management (`MinesView`)**: Grid and Table views for tracking active mine sites, safety scores, risk indices, production capacity, active workers, and GPS locations.
- **Safety Inspections (`InspectionsView`)**: Digital inspection logs, AI hazard scoring, inspector assignment, status filters (`Pending`, `In Progress`, `Passed`, `Failed`).
- **DGMS Compliance (`ComplianceView`)**: Regulatory compliance matrices, DGMS score breakdown (ventilation, slope stability, machinery), violation tracker, fine risk forecasting.
- **AI Risk Intelligence (`RiskIntelligenceView`)**: Predictive risk probabilities for slope failure, gas leaks, haul road hazards, and equipment overheating.
- **GIS Command Map (`GISMapView`)**: Geospatial command map canvas with interactive map layers (Satellite, Thermal, Hotspots, Gas Sensor Nodes, Field Team locations).
- **Document Intelligence Hub (`DocumentsView`)**: AI OCR document parser for DGMS circulars, safety logs, and inspection reports with auto-keyword extraction.
- **Incident Response (`IncidentsView`)**: Real-time incident tracker, severity tags (`Critical`, `High`, `Medium`, `Low`), dispatch field response team workflow.
- **Reports & Audits (`ReportsView` & `AuditLogsView`)**: Automated DGMS quarterly report generation, PDF exports, and immutable audit logs.
- **Alert Notifications (`AlertsView`)**: Categorized real-time notifications with emergency audio-visual alert triggers.
- **User & Role Management (`UsersView`)**: Role-based access control for Mine Managers, Safety Officers, DGMS Auditors, and Field Inspectors.

---

## 🏗 Repository Architecture

```
CoalGuard/
├── frontend/                  # React 19 + Vite + TanStack Start UI Application
│   ├── src/
│   │   ├── components/        # UI Primitives & Dashboard View Components
│   │   ├── routes/            # File-based routes (index.tsx, dashboard.tsx)
│   │   └── styles.css         # Glassmorphic Design System & Animation Engine
│   ├── README.md              # Frontend & Backend API Integration Contracts
│   └── package.json
├── backend/                   # REST & WebSocket API Backend Service (Node.js / FastAPI)
├── ai-services/              # Computer Vision, OCR & Risk Prediction Services
├── database/                  # PostgreSQL / PostGIS Schemas & Migration Scripts
├── .gitignore
└── README.md                  # Master Project Overview (This File)
```

---

## 🗺 Team Roadmap & Work Distribution

| Component | Status | Responsibilities & Deliverables | Assigned Team |
| :--- | :---: | :--- | :--- |
| **Frontend Application** | **COMPLETED ✅** | Built complete UI, landing page, command dashboard, views, glassmorphic styling, animations, responsive design, mock state. | Frontend Engineers |
| **Backend Services** | **IN PROGRESS 🚀** | Implement REST API endpoints, JWT authentication, PostgreSQL/PostGIS schemas, and WebSocket telemetry server. *(See [`frontend/README.md`](frontend/README.md) for exact API schemas).* | Backend Engineers |
| **AI / ML Services** | **IN PROGRESS 🚀** | Build computer vision models for slope movement, Tesseract/Llama OCR parser for documents, and risk prediction scoring model. | AI/ML Engineers |
| **IoT & Sensor Data** | **IN PROGRESS 🚀** | MQTT / LoRaWAN ingestion pipelines for gas sensors (CH4, CO, O2), tilt meters, and weather stations. | IoT/Hardware Engineers |

---

## 🔌 API Integration Quick Reference

For complete backend API schema requirements, request/response JSON payloads, and WebSocket definitions, refer to **[`frontend/README.md`](frontend/README.md)**.

### Summary of Key API Endpoints to Implement:
- **Authentication**: `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- **Mines**: `GET /api/v1/mines`, `POST /api/v1/mines`
- **Inspections**: `GET /api/v1/inspections`, `POST /api/v1/inspections`
- **Compliance**: `GET /api/v1/compliance/summary`
- **Risk Intelligence**: `GET /api/v1/risk/predictions`
- **GIS Sensors**: `GET /api/v1/gis/sensors`
- **Document AI**: `POST /api/v1/documents/upload`, `GET /api/v1/documents/:id`
- **Incidents**: `GET /api/v1/incidents`, `PATCH /api/v1/incidents/:id/dispatch`
- **WebSocket Telemetry**: `ws://localhost:8000/ws/v1/telemetry`

---

## 💻 How to Run the Project Locally

### 1. Run Frontend
```bash
# Navigate to frontend directory
cd frontend

# Install node dependencies
npm install

# Start development server
npm run dev
```
The frontend will launch at `http://localhost:5173`.

### 2. Build for Production
```bash
cd frontend
npm run build
```

---

## 🚀 How to Initialize Git & Push to GitHub

If you haven't pushed this repository to GitHub yet, follow these commands in your terminal:

```bash
# 1. Initialize git repository in root CoalGuard folder
git init

# 2. Add all files to staging
git add .

# 3. Create initial commit
git commit -m "feat: initial commit of CoalGuard platform with complete frontend UI and documentation"

# 4. Set main branch name
git branch -M main

# 5. Add your GitHub remote URL (replace URL with your repository link)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/CoalGuard.git

# 6. Push to GitHub
git push -u origin main
```

---

## 🔒 Security & Data Compliance Standards
- **DGMS Standards Compliance**: Designed strictly following DGMS circular guidelines for safety management plans in open-pit and underground mines.
- **Data Protection**: TLS 1.3 encryption for all telemetry and inspection document uploads.
