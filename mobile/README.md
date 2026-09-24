# CoalGuard Mobile — Field Inspector Application

The **CoalGuard Mobile Application** is a React Native + Expo + TypeScript field inspection app designed for mining engineers, safety auditors, and field technicians operating in open-pit coal mines and underground shaft sites.

It brings CoalGuard's web command center capabilities directly to the field with an **offline-first workflow**, **real-time GPS geo-tagging**, **evidence photo capturing**, **DGMS compliance scoring**, and **offline pending sync queue**.

---

## 🎨 Visual Identity & Web Alignment

The mobile app strictly follows the existing CoalGuard web application (`frontend/`) visual design system:
- **Brand Colors**: Deep Mine Dark Background (`#0b1210`), Emerald Primary Green (`#10b981`), Cyan Accent (`#2dd4bf`), Warning Amber (`#f59e0b`), Destructive Red (`#f43f5e`).
- **Typography**: Space Grotesk (Display Headings) & Manrope (Body).
- **Glassmorphism UI**: Translucent glass card containers (`rgba(19, 34, 30, 0.75)`), subtle glowing borders, status pill badges, and HUD indicators.

---

## 🚀 Key Features & Workflow

### 📱 1. Authentication & Onboarding
- **Mobile Hero Screen**: Matches the web landing page hero section with live terrain status, onboarded metrics (`24+` mines, `98%` compliance), and quick inspector login buttons.
- **Inspector Authentication**: Login with credentials or use 1-Tap Quick Inspector / Manager Demo mode.

### 📋 2. Complete 5-Step Field Inspection Flow
1. **Step 1: Mine Site Selection (`inspection/site.tsx`)**:
   - Choose active mine quarry (Jharia Block 4, Korba South Pit, Singrauli North Quarry, etc.) with live coordinates and DGMS zone metadata.
2. **Step 2: DGMS Safety Checklist (`inspection/checklist.tsx`)**:
   - Interactive DGMS regulation clauses (`DGMS Reg. 106`, `Reg. 132`, `Reg. 98`).
   - Mark items as `Compliant`, `Non-Compliant`, or `Not Applicable` with field observation notes.
3. **Step 3: Evidence Photo Capture (`inspection/camera.tsx`)**:
   - Expo Camera integration for capturing high-resolution hazard photographs.
   - Tag photos with hazard tags (`Slope Hazard`, `Tension Crack`, `Gas Leak`, `Equipment Fault`, `PPE Violation`).
   - Gallery picker fallback for attaching site images.
4. **Step 4: Hazard Assessment & Real GPS Tagging (`inspection/observation.tsx`)**:
   - **Real GPS Location**: Acquires real-time Latitude, Longitude, Accuracy (m), and Elevation using `expo-location`.
   - **Severity Selector**: Select overall risk tier (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
   - Flag specific hazards and record inspector field notes.
5. **Step 5: Review & Submit (`inspection/review.tsx` & `success.tsx`)**:
   - Full audit summary verification before final transmission.

### 📶 3. Offline-First Synchronization Architecture
- **Offline Storage**: In pit areas without cellular connectivity, inspections are automatically saved locally via `@react-native-async-storage/async-storage` in a `PENDING_SYNC` state.
- **Pending Sync Queue (`pending-uploads.tsx`)**: View all offline drafts, monitor pending count badge, and perform one-tap batch synchronization when network reconnects.

---

## 🛠 Directory Structure

```
mobile/
├── app/                        # Expo Router File-Based Navigation
│   ├── _layout.tsx             # Root layout with Auth & Inspection Providers
│   ├── index.tsx               # Initial Splash Router
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── onboarding.tsx      # Mobile Hero Landing Page
│   │   ├── login.tsx           # Inspector Login
│   │   └── forgot-password.tsx # Password Reset
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Bottom Tab Navigator
│   │   ├── home.tsx            # Mobile Field Dashboard
│   │   ├── inspections.tsx     # Filterable Inspection Register
│   │   ├── pending-uploads.tsx # Offline Queue Sync Manager
│   │   ├── notifications.tsx   # Real-Time Hazard Alert Feed
│   │   └── profile.tsx         # Inspector Profile & System Config
│   ├── inspection/
│   │   ├── _layout.tsx
│   │   ├── site.tsx            # Step 1: Mine Selection
│   │   ├── checklist.tsx       # Step 2: Safety Checklist
│   │   ├── camera.tsx          # Step 3: Photo Capture
│   │   ├── observation.tsx     # Step 4: Hazard & GPS Tagging
│   │   ├── review.tsx          # Step 5: Final Review
│   │   └── success.tsx         # Step 6: Submission Success
│   ├── inspection-details/
│   │   └── [id].tsx            # Detailed Inspection View
│   └── settings.tsx            # System Settings & API URL Config
├── assets/                     # Mine hero imagery & brand graphics
├── components/                 # Reusable UI Components
│   ├── ui/
│   │   ├── AppButton.tsx       # Styled button primitives
│   │   ├── AppInput.tsx        # Styled glass text inputs
│   │   ├── AppCard.tsx         # Glassmorphism container card
│   │   ├── StatusBadge.tsx     # Severity/Status color pill badge
│   │   └── OfflineBanner.tsx   # Pending sync offline banner
│   ├── BrandHeader.tsx         # CoalGuard logo shield header
│   ├── InspectionCard.tsx      # Inspection item card
│   ├── PhotoCard.tsx           # Camera evidence tile with metadata
│   ├── ChecklistItemCard.tsx   # Interactive audit item card
│   ├── SeveritySelector.tsx    # Severity level grid selector
│   └── GPSLocationCard.tsx     # Live GPS satellite telemetry card
├── constants/
│   ├── theme.ts                # CoalGuard design system tokens
│   └── mockData.ts             # Realistic mine dataset & initial checklist
├── context/
│   ├── AuthContext.tsx         # Authentication state manager
│   └── InspectionContext.tsx   # Field inspection draft & sync manager
├── services/
│   ├── api.ts                  # Base HTTP API fetch client
│   ├── auth.ts                 # Login / Session handling
│   ├── inspection.ts           # Inspection submission & fetch API
│   ├── upload.ts               # Photo upload service
│   └── offlineStorage.ts       # AsyncStorage offline queue manager
├── types/
│   └── index.ts                # TypeScript interface definitions
├── app.json                    # Expo configuration (permissions, scheme)
├── package.json
└── README.md
```

---

## ⚙️ Environment Variables & API Configuration

The mobile app connects to the same backend API (`backend/`) as the web application.

Configure your local machine IP address in `EXPO_PUBLIC_API_URL`:

```env
# In mobile/.env or mobile/.env.local:
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000/api/v1
```

> **Note**: When running on physical mobile devices via Expo Go, replace `localhost` with your computer's local Wi-Fi IP address (e.g. `192.168.x.x`).

---

## 💻 How to Run Locally

### 1. Prerequisites
- **Node.js**: v18 or later
- **Expo Go App**: Installed on your physical Android or iOS device from Google Play Store or Apple App Store.

### 2. Installation
```bash
# Navigate to the mobile directory
cd mobile

# Install dependencies
npm install
```

### 3. Start Expo Development Server
```bash
npx expo start
```

- **Run on Android physical device / Expo Go**: Scan the QR code displayed in the terminal using the Expo Go app.
- **Run on Android Emulator**: Press `a` in the terminal.
- **Run on iOS Simulator**: Press `i` in the terminal.
- **Run on Web**: Press `w` in the terminal.

---

## 📱 Native Device Permissions Setup

The app requests the following native permissions configured in `app.json`:
- **Camera Permission (`NSCameraUsageDescription` / `CAMERA`)**: Required for capturing site evidence photos.
- **Location Permission (`NSLocationWhenInUseUsageDescription` / `ACCESS_FINE_LOCATION`)**: Required for GPS coordinate tagging of pit hazards.
- **Photo Library Permission (`NSPhotoLibraryUsageDescription`)**: Required for attaching existing site imagery.
