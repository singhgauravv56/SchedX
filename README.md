# SchedX — Smart Timetable Generator

> **Automated, Conflict-Free Institutional Timetable Generation & Management Platform**  
> *Version 2.0.0 | Pure Vanilla Web Engine + Node.js Express + Supabase PostgreSQL & Resilient Dual-Tier JSON Storage*

---

## 📌 Overview

**SchedX** is an intelligent, automated academic timetable generator designed for colleges, universities, and polytechnic institutions. It transforms complex academic scheduling constraints into balanced, conflict-free weekly timetables within seconds.

SchedX eliminates the manual frustration and combinatorial complexity of scheduling by deploying a multi-constraint validation and allocation solver. It simultaneously evaluates faculty availability, lecture room and computer laboratory capacities, distinct student cohort streams, custom period intervals with minute-level precision, institutional breaks (lunch, tea, short breaks), and multi-day practical laboratory sessions.

---

## ✨ Confirmed Features

| Feature Category | Description | Status |
|---|---|---|
| **⚡ 10-Step Generator Workbench** | Structured step-by-step configuration wizard covering Departments, Teachers, Subjects, Sections, Rooms, Periods & Time Span, Break Management, Lab Classes, Schedule Settings, and Generation. | `Confirmed` |
| **🛡️ 3-Way Collision Prevention** | Rigorous multi-constraint detection ensuring: (1) no faculty double-booking, (2) no student section collisions, and (3) no room/laboratory overlapping. | `Confirmed` |
| **💾 Resilient 2-Tier Persistence** | High-availability architecture: primary cloud synchronization with **Supabase PostgreSQL** backed by automated fallback to local JSON file storage (`data/`) on connection timeout or network interruption. | `Confirmed` |
| **☕ Break Management & Auto Periods** | Day-specific tea/lunch break scheduling with automatic mathematical period slicing and recalculation around break boundaries. | `Confirmed` |
| **📋 Period & Break Copying Tools** | Built-in replication panels that duplicate complex period timing schemes and break configurations across active working days with one click. | `Confirmed` |
| **🔬 Multi-Day & Multi-Section Labs** | Practical laboratory session scheduling supporting flexible durations (2–3 periods), designated lab facilities, shared or separate section modes, and candidate day routing. | `Confirmed` |
| **✏️ Interactive Timetable Editor** | In-browser inline row editing and cell editing modal dialog with real-time assignment validation (`POST /api/timetable/validate-entry`) and live conflict warnings. | `Confirmed` |
| **📊 Faculty Workload Distribution** | Real-time workload calculation per instructor: total scheduled lectures, weekly quota utilization, daily average, active days, and designated off-days. | `Confirmed` |
| **📄 Built-in Vector PDF Generator** | Zero-dependency native Node.js PDF generator (`utils/pdfGenerator.js`) creating publication-quality ISO 32000 (PDF 1.4) landscape academic timetables. | `Confirmed` |
| **🕒 Live Class Tracker** | Real-time endpoint (`GET /api/current-class`) that calculates ongoing lectures and laboratories based on current clock time and weekday. | `Confirmed` |
| **📅 SchedX To-Do Calendar** | Interactive calendar task and institutional event planner integrated directly into the workbench and saved locally. | `Confirmed` |
| **📬 Formspark Feedback Integration** | Native feedback submission modal proxying user reviews safely to Formspark endpoint. | `Confirmed` |

---

## 🛠️ Technology Stack

### Frontend
- **Markup**: Pure HTML5 (Semantic elements, accessible ARIA attributes, modal dialogs)
- **Styling**: Vanilla CSS3 (Custom Design System, CSS Custom Properties, Glassmorphism, Fluid Typography via `clamp()`, Responsive CSS Grid & Flexbox)
- **Typography**: Google Fonts (`Plus Jakarta Sans`, `Inter`, `Comfortaa`, `Fredoka`, `Orbitron`)
- **Scripting**: Pure Vanilla JavaScript (ES6+, asynchronous `fetch` client, event-driven state management, zero external frontend dependencies)

### Backend
- **Runtime**: Node.js (v18+ recommended)
- **Framework**: Express.js 4.21.2 (REST API, static file delivery, middleware)
- **CORS**: cors 2.8.5
- **Configuration**: dotenv 16.4.7
- **WebSocket**: ws 8.21.3 (Supabase Realtime transport compatibility)
- **PDF Generation**: Native Node.js Buffer-based ISO 32000 PDF 1.4 vector generator (`utils/pdfGenerator.js`)

### Database & Storage
- **Cloud Database**: Supabase PostgreSQL (Hosted Postgres instance with relational schema, foreign key cascades, unique constraints, and Row Level Security)
- **Client**: `@supabase/supabase-js` 2.57.4
- **Local Fallback / Cache**: File-based JSON persistence engine in `data/` (`timetable_store.json`, `timetable_history.json`, `departments.json`, `breaks.json`, `rooms.json`, `teachers.json`, `todos.json`)
- **Version Control**: Retains last 2 generated timetable versions with complete metadata snapshots.

---

## 📁 Repository Directory Structure

```
SchedX/
├── config/
│   └── supabase.js                # Supabase client instantiation & fallback handling
├── data/                          # Local JSON persistence store & historical backups
│   ├── breaks.json                # Saved institutional breaks
│   ├── departments.json           # Department catalog
│   ├── rooms.json                 # Campus room & laboratory registry
│   ├── teacher_availability.json  # Teacher diary availability slots
│   ├── teachers.json              # Faculty records
│   ├── timetable_history.json     # Multi-version timetable history (max 2 retained)
│   ├── timetable_store.json       # Active generated timetable store
│   └── todos.json                 # Calendar To-Do entries
├── database/
│   ├── archive/                   # Historical database migration archives (MySQL)
│   └── supabase_schema.sql        # Canonical Supabase PostgreSQL schema & seed data
├── docs/                          # Comprehensive technical documentation suite
│   ├── PRD.md                     # Product Requirements Document
│   ├── DESIGN.md                  # UI/UX & Design System specifications
│   ├── ARCHITECTURE.md            # System Architecture & execution flows
│   ├── DATABASE.md                # PostgreSQL & JSON Storage specifications
│   ├── API.md                     # REST API reference & payload contracts
│   ├── IMPLEMENTATION_PLAN.md     # Phased development roadmap
│   ├── TESTING.md                 # Test plan, suites & verification matrices
│   ├── SECURITY.md                # Security review, secrets isolation & RLS
│   └── PROJECT_REVIEW.md          # Senior Architect codebase audit & findings
├── public/                        # Frontend application assets (served statically)
│   ├── index.html                 # SchedX Home & Landing Page
│   ├── generate.html              # 10-Step Generator Workbench & Live Timetable
│   ├── features.html              # Interactive Features Explorer & Storage Inspector
│   ├── about.html                 # Institutional background & Scheduling Triad
│   ├── rooms.html                 # Room & Laboratory Management UI
│   ├── teacher-availability.html  # Vintage Diary-themed Teacher Availability
│   ├── teacher-info.html          # Faculty Profile Management UI
│   ├── script.js                  # Frontend client engine (6,000+ LOC)
│   ├── style.css                  # Master custom design system stylesheet (12,000+ LOC)
│   └── todo.js                    # Interactive To-Do Calendar module
├── scripts/                       # Diagnostic, verification & automated test scripts
│   ├── run-all-tests.js           # Master regression & audit test runner
│   ├── test-generate-audit-suite.js # Section 10 generator audit suite
│   ├── test-department-room-lab.js # Department, room & laboratory validation
│   ├── test-breaks-and-workload.js # Break management & faculty workload suite
│   ├── test-weekly-timetable.js   # Day-wise schedule layout validation
│   └── ... (60+ specialized test & diagnostic utilities)
├── supabase/                      # Additional SQL migrations & schema variants
│   ├── rooms-migration.sql        # Rooms table migration with RLS
│   ├── schema.sql                 # UUID-based schema variant
│   └── teacher-info-migration.sql # Teacher profile migration
├── utils/
│   └── pdfGenerator.js            # Zero-dependency ISO 32000 PDF 1.4 generator
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore rules (.env, node_modules, cache)
├── AGENTS.md                      # Instructions & rules for AI coding agents
├── diagnose.js                    # Database diagnostic utility script
├── package.json                   # Project metadata, scripts & dependencies
├── README.md                      # This documentation file
├── server.js                      # Express server, timetable engine & API routes
└── start-schedx.bat               # Windows quick-launch batch script
```

---

## 🚦 Prerequisites

Before running SchedX, ensure the following are installed:
1. **Node.js**: v18.0.0 or higher (v20+ recommended). Check with:
   ```bash
   node -v
   ```
2. **npm**: v9.0.0 or higher. Check with:
   ```bash
   npm -v
   ```
3. *(Optional)* A free **Supabase** account if you wish to synchronize data with a cloud PostgreSQL database. (Note: SchedX runs fully out-of-the-box using local JSON storage even without Supabase credentials).

---

## ⚙️ Installation & Setup

### 1. Clone or Open the Workspace
```bash
cd SchedX
```

### 2. Install Project Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create your local `.env` file from `.env.example`:
```bash
copy .env.example .env
```
*(On Linux/macOS: `cp .env.example .env`)*

Open `.env` in your editor and configure your variables:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SECRET_KEY=your-supabase-service-role-secret-key
PORT=3000
```

> [!CAUTION]
> **Security Notice**: Never commit `.env` or paste real Supabase secret keys into client-side code or public repositories. The key is only read server-side by `server.js` and `config/supabase.js`.

### 4. (Optional) Initialize Supabase Cloud Database
If using Supabase:
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard) and open your project.
2. Navigate to **SQL Editor** -> **New Query**.
3. Open [`database/supabase_schema.sql`](database/supabase_schema.sql), paste its contents into the editor, and click **Run**.
4. The 8 relational tables, indexes, conflict constraints, and default seed rooms will be provisioned.

### 5. Verify Database Connectivity
Run the diagnostic script:
```bash
node diagnose.js
```
- If configured correctly: `✅ Successfully connected to Supabase PostgreSQL cloud database!`
- If credentials are empty: SchedX alerts that cloud synchronization is inactive and will operate in local JSON storage mode.

---

## 🚀 Running the Application

### Development / Local Server
```bash
npm start
```
*Or:*
```bash
npm run dev
```

### Automatic Browser Launch (Windows)
```bash
npm run open
```
*Or double-click:*
```bat
start-schedx.bat
```

Open your browser and navigate to:
```
http://localhost:3000
```

### Available Pages
- **Home**: `http://localhost:3000/`
- **Generate Timetable**: `http://localhost:3000/generate`
- **Features Explorer**: `http://localhost:3000/features`
- **About Us**: `http://localhost:3000/about`
- **Room Availability**: `http://localhost:3000/rooms`
- **Teacher Availability**: `http://localhost:3000/teacher-availability`
- **Teacher Profiles**: `http://localhost:3000/teacher-info`

---

## 📜 Available Scripts in `package.json`

| Script Command | Action | Description |
|---|---|---|
| `npm start` | `node server.js` | Launches the SchedX Express API server on the configured port. |
| `npm run dev` | `node server.js` | Runs the server in local development mode. |
| `npm run build` | `node --check server.js` | Runs a native Node.js syntax and integrity check on `server.js`. |
| `npm run open` | `cmd /c start http://localhost:3000` | Opens default browser to the SchedX home page on Windows. |
| `npm run auto-sync` | `node scripts/auto-sync.js` | *Maintenance Daemon*: Background Git file synchronizer. |
| `npm run git:sync` | `node scripts/auto-sync.js` | Alias for `auto-sync`. |

---

## 🧪 Testing Instructions

SchedX includes a comprehensive suite of 60+ diagnostic and verification scripts in the `scripts/` directory.

### Running Non-Network Unit Tests
Unit tests that validate frontend markup, period math, and algorithm contracts can be executed directly:
```bash
node scripts/verify-generate-ui.js
node scripts/test-flexible-daily-scheduling.js
```

### Running Integration & Audit Test Suites
To run the full regression test suite, **start the server first** in one terminal:
```bash
node server.js
```
Then, in a second terminal, execute the master test runner:
```bash
node scripts/run-all-tests.js
```

Individual test suites can also be run independently:
```bash
node scripts/test-department-room-lab.js
node scripts/test-breaks-and-workload.js
node scripts/test-multi-subject-and-labs.js
node scripts/test-weekly-timetable.js
node scripts/test-storage-retention.js
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check & Supabase connectivity status |
| `GET` | `/api/departments` | Retrieve all registered departments |
| `POST`| `/api/departments` | Register or update a department in catalog |
| `GET` | `/api/departments/saved-timetables` | Retrieve saved timetables grouped by department |
| `GET` | `/api/breaks` | Retrieve saved schedule breaks |
| `POST`| `/api/breaks` | Persist institutional breaks (lunch, tea, short) |
| `GET` | `/api/teachers` | Retrieve all faculty records |
| `POST`| `/api/teachers` | Create a faculty record |
| `PUT` | `/api/teachers/:id` | Update a faculty record |
| `DELETE`| `/api/teachers/:id` | Remove a faculty record |
| `GET` | `/api/courses` | Retrieve all courses / subjects |
| `POST`| `/api/courses` | Create a new course |
| `PUT` | `/api/courses/:id` | Update a course |
| `DELETE`| `/api/courses/:id` | Remove a course |
| `GET` | `/api/classes` | Retrieve all student class cohorts |
| `POST`| `/api/classes` | Create a class cohort |
| `PUT` | `/api/classes/:id` | Update a class cohort |
| `DELETE`| `/api/classes/:id` | Remove a class cohort |
| `GET` | `/api/rooms` | Retrieve all campus rooms & laboratories |
| `POST`| `/api/rooms` | Register a new room with capacity and type |
| `PUT` | `/api/rooms/:id` | Update an existing room record |
| `DELETE`| `/api/rooms/:id` | Remove a room record |
| `GET` | `/api/teacher-availability` | Retrieve saved teacher availability matrix |
| `POST`| `/api/teacher-availability` | Persist teacher availability slots |
| `POST`| `/api/generate` | **Execute timetable generation solver** |
| `GET` | `/api/timetable` | Retrieve active generated timetable (supports `?department=`) |
| `PUT` | `/api/timetable` | In-place update of timetable entries from editor |
| `DELETE`| `/api/timetable` | Clear active generated timetable |
| `GET` | `/api/timetable/workload` | Calculate faculty workload metrics & quotas |
| `GET` | `/api/timetable/metadata` | Retrieve scheduling metadata for editor |
| `POST`| `/api/timetable/validate-entry` | Live validation of candidate cell/row assignment |
| `DELETE`| `/api/timetable/entry/:id` | Delete single entry with live workload recalculation |
| `GET` | `/api/storage` | Repository metrics & saved generation metadata |
| `GET` | `/api/storage/timetable/:id` | Retrieve specific historical generation version |
| `GET` | `/api/storage/timetable/:id/pdf` | Export PDF of specific historical generation |
| `GET` | `/api/timetable/pdf` | **Export PDF of active generated timetable** |
| `GET` | `/api/current-class` | Get real-time active lectures for current clock time |
| `GET` | `/api/todos` | Retrieve calendar to-do items |
| `POST`| `/api/todos` | Create a calendar to-do item |
| `PUT` | `/api/todos/:id` | Update or toggle a calendar to-do item |
| `DELETE`| `/api/todos/:id` | Remove a calendar to-do item |
| `POST`| `/api/feedback` | Proxy feedback submission to Formspark endpoint |

*(For full payload schemas and response structures, see [`docs/API.md`](docs/API.md)).*

---

## ⚠️ Known Limitations

1. **Authentication & Authorization**: There is currently no user login or role-based access control (RBAC). Any user with network access to the server can view and modify timetable configurations.
2. **Monolithic Architecture**: The Express server, timetable scheduling solver, conflict detection engine, and data layers reside in a single file (`server.js`, 5,600+ LOC).
3. **Database Timeout Strategy**: Cloud Supabase calls utilize aggressive timeouts (250ms–1000ms). When network latency is high, SchedX automatically falls back to local JSON storage, which may cause temporary desynchronization if Supabase is later re-queried without re-sync.
4. **Historical Version Ceiling**: Timetable history is capped at `MAX_RETAINED_GENERATIONS = 2` to preserve disk and memory space.

---

## 🔧 Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| `Port 3000 in use` | Another process is bound to port 3000. | Change `PORT=3001` in `.env` or terminate the existing Node process. |
| `DB timeout / falling back to local store` | Supabase is unreachable, credentials are missing, or ping latency exceeds 250ms. | Verify internet connectivity and run `node diagnose.js`. SchedX continues functioning normally via local JSON files. |
| `Missing department error on generation` | Step 01 Department name field is blank. | Select an existing department or enter a valid department title in Step 01. |
| `Teacher names must be unique` | Duplicate instructor name entered in Step 02. | Ensure each teacher has a distinct name or title (e.g., "Dr. Smith" vs "Prof. Smith"). |
| `Maximum allowed subjects exceeded` | Number of configured subjects > Teachers + 2. | Add more teachers in Step 02 or reduce subjects in Step 03 according to the scheduling formula. |
| `Tests failing with ECONNREFUSED` | `run-all-tests.js` executed without running server. | Start the application with `npm start` in another terminal before executing the test runner. |

---

## 📚 Technical Documentation Suite

For comprehensive technical deep dives, review the specialized documents in [`docs/`](docs/):

- 📋 [**Product Requirements Document (PRD)**](docs/PRD.md)
- 🎨 [**UI/UX & Design System Documentation**](docs/DESIGN.md)
- 🏛️ [**System Architecture & Data Flows**](docs/ARCHITECTURE.md)
- 🗄️ [**Database & Persistence Specifications**](docs/DATABASE.md)
- 📡 [**Complete REST API Reference**](docs/API.md)
- 🤖 [**AI Coding Agent Operational Rules**](AGENTS.md)
- 🗺️ [**Implementation & Future Roadmap**](docs/IMPLEMENTATION_PLAN.md)
- 🧪 [**Testing Plan & Verification Suite**](docs/TESTING.md)
- 🔒 [**Security & Vulnerability Review**](docs/SECURITY.md)
- 🔍 [**Senior Architect Project Review & Codebase Audit**](docs/PROJECT_REVIEW.md)

---

## 📬 Contact & Support

- **Email**: [schedx24x7@gmail.com](mailto:schedx24x7@gmail.com)
- **Instagram**: [@studyroom.online07](https://www.instagram.com/studyroom.online07?igsi=YXltbm1neDV3dWxn)

---
&copy; 2025–2026 SchedX. All rights reserved.
