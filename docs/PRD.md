# Product Requirements Document (PRD) — SchedX

> **Project**: SchedX — Smart Timetable Generator  
> **Document Version**: 2.0.0  
> **Target Audience**: System Architects, Engineers, Product Managers, UI/UX Designers, AI Coding Agents  
> **Related Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md) | [DESIGN.md](DESIGN.md) | [DATABASE.md](DATABASE.md) | [API.md](API.md)

---

## 1. Project Overview

**SchedX** is a web-based, automated college and institutional timetable generator designed to produce conflict-free, balanced weekly academic schedules. The platform replaces tedious, error-prone manual spreadsheet scheduling with a multi-constraint automated solver backed by a dual-tier persistence model: **Supabase PostgreSQL** cloud storage and an automated local JSON fallback mechanism.

The frontend is implemented purely in semantic **HTML5, modern Vanilla CSS3, and ES6+ JavaScript**, delivering a high-performance, framework-free experience with custom design tokens, fluid typography, responsive layout containers, and intuitive scheduling workflows.

---

## 2. Problem Statement

Academic scheduling in colleges, polytechnics, and universities is an NP-hard combinatorial challenge involving multiple competing constraints:
1. **Faculty Conflicts**: Teachers are often mistakenly double-booked across different rooms or student cohorts in the same time period.
2. **Room & Facility Overlap**: Lecture auditoriums and specialized computer/science laboratories are scheduled beyond their physical seating capacity or booked simultaneously for multiple courses.
3. **Student Cohort Collisions**: Students in specific sections (e.g., CSE-A, IT-B) face overlapping lectures or impossible timetable gaps.
4. **Complex Period & Break Variations**: Academic days vary in period counts (e.g., 5 periods on Friday vs 7 on Monday), with fixed tea and lunch intervals that require precise mathematical recalculation of lecture times.
5. **Practical Lab Sessions**: Laboratory courses require 2 to 3 consecutive hours in designated facilities, shared across sections or split across specific working days.
6. **Data Loss & Setup Friction**: Traditional tools require heavy local database installations (MySQL/Postgres servers) or lose active work upon page reload.

SchedX eliminates these friction points by providing a zero-dependency, automated platform that executes triple-guard validation before creating a schedule.

---

## 3. Project Objectives

- **100% Conflict-Free Scheduling**: Guarantee zero simultaneous instructor, section, or classroom collisions across generated timetables.
- **Fast Execution**: Solve and generate institutional weekly schedules in under 2 seconds.
- **Resilient Dual-Tier Persistence**: Provide seamless cloud persistence via Supabase PostgreSQL, while guaranteeing uninterrupted operation through automated local JSON storage (`data/`) if cloud connectivity is unavailable or times out.
- **High Usability Workbench**: Deliver an intuitive 10-step wizard interface that allows academic administrators to configure departments, faculty, subjects, rooms, periods, breaks, and labs without training.
- **Manual Editability with Safety**: Allow administrators to manually adjust generated slots via inline row editing and cell editing modals, backed by real-time conflict validation.
- **Publication-Ready Export**: Generate instant, publication-quality vector PDF timetable documents conforming to ISO 32000 (PDF 1.4) standards directly from the server.

---

## 4. Target Users

| User Persona | Role | Primary Goals in SchedX |
|---|---|---|
| **Academic Timetable Coordinator** | Department Head / Dean of Academics | Define curriculum courses, assign faculty subject qualifications, configure institutional working hours, and run the automated generation solver. |
| **Faculty Member / Instructor** | Professor / Lecturer / Lab Assistant | Review personal timetable allocations, weekly teaching load, assigned lecture rooms, and manage personal availability diary. |
| **Department Administrator** | Academic Office Staff | Inspect daily schedules, download official department PDF timetables, and make emergency room or instructor reassignments. |
| **Student** | Enrolled Undergraduate / Graduate | View weekly class schedule, monitor ongoing lectures via the Live Class Monitor, and plan study tasks. |

---

## 5. Main User Journeys

### Journey 1: End-to-End Timetable Generation
```
[Select / Register Department]
       ↓
[Input Teachers & Subject Qualifications (or NA)]
       ↓
[Define Academic Subjects (Max = Teachers + 2)]
       ↓
[Define Student Sections & Class Cohorts]
       ↓
[Configure Lecture Rooms & Computer Laboratories]
       ↓
[Set Day-Specific Periods & Precise Minute Spans]
       ↓
[Configure Institutional Lunch / Tea Breaks]
       ↓
[Define Practical Laboratory Classes & Durations]
       ↓
[Set Active Working Days (Mon–Sun Pills)]
       ↓
[Click "GENERATE TIMETABLE"]
       ↓
[View Day-Wise Timetable + Conflict Summary + Faculty Workload]
       ↓
[Export Publication-Quality Landscape PDF]
```

### Journey 2: Interactive In-Place Timetable Editing
```
[Navigate to Generated Timetable Output]
       ↓
[Click "✎ Edit" Button] → [Edit Mode Badge Appears]
       ↓
[Option A: Click Inline "Edit" on Table Row]
       ↓
[Row converts to interactive dropdowns (Teacher, Subject, Room)]
       ↓
[Real-time collision validation runs on change]
       ↓
[Click "Save" or "Cancel"] → [Workload & Conflict badges update]
       ↓
[Option B: Click Specific Table Cell] → [Modal Dialog Opens]
       ↓
[Adjust Day, Period, Teacher, Room, Subject]
       ↓
[Validate Entry via API] → [Save Changes to Supabase & Local Store]
```

---

## 6. Existing Features & Status Inventory

| Feature | Description | Implementation Status |
|---|---|---|
| **10-Step Generator Workbench** | Structured configuration interface in `public/generate.html`. | `Confirmed` |
| **Department Catalog** | Save and load department configurations (`/api/departments`). | `Confirmed` |
| **Teacher-Subject Assignment** | Explicit qualification binding or `NA` (no preference). | `Confirmed` |
| **Subject Limit Formula** | Enforces `Max Subjects = Teachers + 2`. | `Confirmed` |
| **Day-Specific Period Allocation** | Different period counts per day with custom minute intervals. | `Confirmed` |
| **Period Copy Panel** | Replicate complete or timing-only configurations across days. | `Confirmed` |
| **Break Management & Recalculation** | Short breaks & lunch breaks with automatic period math slicing. | `Confirmed` |
| **Break Copy Panel** | Replicate configured breaks across selected working days. | `Confirmed` |
| **Multi-Day & Multi-Section Labs** | Practical classes with flexible durations, shared/separate modes. | `Confirmed` |
| **8-Period Quick Template** | One-click button to load 8-period standard day schedule. | `Confirmed` |
| **3-Way Collision Prevention** | Rigorous solver validation across faculty, section, and room. | `Confirmed` |
| **Interactive Timetable Editor** | Inline row edit buttons and cell edit modal dialog. | `Confirmed` |
| **Teacher Workload Distribution** | Real-time computation of faculty hours, off-days, and quotas. | `Confirmed` |
| **Native Vector PDF Export** | Built-in ISO 32000 PDF 1.4 generator (`utils/pdfGenerator.js`). | `Confirmed` |
| **Live Current Class Monitor** | Real-time active lecture detection (`/api/current-class`). | `Confirmed` |
| **Multi-Version Storage** | Retains last 2 generated timetables with metrics (`/api/storage`). | `Confirmed` |
| **SchedX To-Do Calendar** | Interactive calendar planner module (`public/todo.js`). | `Confirmed` |
| **Formspark Feedback Modal** | Feedback proxy endpoint (`/api/feedback`). | `Confirmed` |
| **Teacher Availability Diary** | Vintage diary-styled availability management page. | `Confirmed` |
| **Room Management UI** | Dedicated room CRUD interface (`public/rooms.html`). | `Confirmed` |
| **Teacher Profile UI** | Faculty profile CRUD interface (`public/teacher-info.html`). | `Confirmed` |
| **User Authentication / RBAC** | User login, registration, password reset, role permissions. | `Not Found` |
| **Email Timetable Dispatch** | Direct emailing of timetable PDFs to faculty and students. | `Planned` |

---

## 7. Functional Requirements

### FR-01: Department Management
- The system shall allow users to manually type a department name or select an existing saved department from a dropdown.
- When saving a department via "Save Department", it shall persist to the department catalog (`data/departments.json`) and become available in the selector.
- The timetable generation solver shall reject requests where the department name is missing (`HTTP 400`).

### FR-02: Faculty & Qualification Constraints
- The system shall require at least 1 faculty member for timetable generation.
- Teacher names must be unique (case-insensitive).
- Each teacher must be assigned one or more specific subjects, OR configured with `NA` (no preference).
- Teachers marked with `NA` cannot have specific subjects mixed into their profile.
- Every configured subject must have at least one qualified instructor assigned.

### FR-03: Subject & Capacity Rules
- Subject names must be non-empty and unique.
- The system must enforce the institutional rule: `Maximum Allowed Subjects = Number of Teachers + 2`. If violated, generation must halt with an explanatory error.

### FR-04: Section / Cohort Rules
- The system shall require at least one student class cohort (e.g., "CSE-A", "IT-B").
- Section names must be unique.
- The solver must ensure each section has an independent, non-overlapping weekly schedule.

### FR-05: Room & Laboratory Management
- Rooms must have a unique identifier/number, a specified type (`Classroom` or `Laboratory`), and a seating capacity (> 0).
- Practical laboratory classes must only be assigned to rooms with `room_type = 'Laboratory'`.
- If lab classes are requested but zero laboratory rooms exist, the generator shall return `HTTP 400: No suitable laboratory room is available.`

### FR-06: Period & Time Span Configuration
- Users can define custom operating hours (default: `09:00` to `16:00`).
- Each working day can have an independent period count (e.g., 5 to 8 periods).
- Start and end times must support precise minutes and display in 12-hour AM/PM format.
- The system must provide an 8-period daily classes template button that auto-configures 4 morning periods, a 40-minute lunch break (12:20–13:00), and 4 afternoon periods.
- The system shall provide a period copying tool supporting two modes:
  - **Mode A (Complete)**: Replicates period counts, start times, and durations.
  - **Mode B (Timing Only)**: Replicates timing intervals without changing existing destination period counts.

### FR-07: Break Management
- Users can configure short breaks, tea breaks, and lunch breaks for specific days or across "All Working Days".
- The system must automatically slice and recalculate teaching periods around break intervals so no lecture overlaps with a break.
- The system shall provide a break copying tool supporting replication of all or selected breaks.

### FR-08: Practical Laboratory Classes
- Each lab class must specify a course name, qualified instructor, one or more student sections, one or more candidate days, duration (default 2 periods), and an optional specific lab room.
- Scheduling modes:
  - **Day Mode**: `every` (schedules a lab session on every selected day) vs `suitable` (picks one candidate day).
  - **Section Mode**: `separate` (schedules distinct sessions for each section) vs `shared` (combines sections into one shared session).

### FR-09: Solver & Collision Prevention
- The generation solver must enforce:
  1. No teacher can instruct two classes simultaneously.
  2. No section can attend two classes simultaneously.
  3. No room can host two classes simultaneously.
  4. Teacher availability diary constraints must be respected.
  5. Teacher working days quotas must not be exceeded.

### FR-10: Timetable Editing & Saving
- The system shall provide an Edit mode for the generated timetable.
- Users can edit entries directly via inline row controls or cell modals.
- Prior to saving, candidate edits must be validated against all timetable entries via `POST /api/timetable/validate-entry`.
- Updated timetables must persist to both `data/timetable_store.json` and active history in `data/timetable_history.json`.

### FR-11: Workload & Metrics Calculation
- The system must calculate faculty workload metrics: total lectures, daily average, active days, off-days, and quota utilization.
- If an instructor exceeds their maximum recommended workload, the system must flag the record with a visual warning badge.

### FR-12: Publication-Quality PDF Generation
- The server must generate an ISO 32000 (PDF 1.4) compliant binary buffer using native Node.js buffers without invoking external tools (e.g., Puppeteer or wkhtmltopdf).
- The PDF must format timetable data into a clean, landscape A4 grid with institutional headers, department title, section badges, period timings, and generation timestamp.

---

## 8. Non-Functional Requirements

### NFR-01: Performance & Latency
- Timetable generation for standard institutional inputs (up to 10 teachers, 12 subjects, 4 sections, 6 days) must complete within 2.0 seconds.
- Static page delivery and REST API responses must respond under 100ms when running locally.

### NFR-02: Zero-Dependency Architecture
- Frontend must not require compilation, bundlers, Webpack, Vite, or node_modules. Pure HTML5, CSS3, and JavaScript files must run directly in any standard browser.

### NFR-03: Fault Tolerance & Availability
- The backend must never crash due to database timeouts or network failures. If Supabase is unreachable or exceeds a 250ms deadline, the server must automatically fall back to local disk storage (`data/*.json`).

### NFR-04: Responsive Design
- The application interface must adapt fluidly across devices:
  - Desktop / Workstation: ≥ 1200px (Multi-column grids, comprehensive timetable tables)
  - Tablet: 768px – 1199px (Two-column layout, horizontal scroll for tables)
  - Mobile: ≤ 767px (Single-column stacked layout, touch-friendly buttons)

### NFR-05: Accessibility (a11y)
- All interactive controls must feature semantic labels (`aria-label`, `aria-expanded`, `aria-controls`, `role="region"`).
- Color contrast ratios for text against backgrounds must exceed WCAG 2.1 AA standards (minimum 4.5:1 for normal text).

### NFR-06: Security & Data Integrity
- Secrets (`SUPABASE_SECRET_KEY`) must never be leaked to client browsers.
- User inputs must be sanitized before rendering to eliminate Cross-Site Scripting (XSS).

---

## 9. Page-by-Page Specifications

### Page 1: Home (`public/index.html`)
- **Route**: `GET /`
- **Purpose**: Showcase the platform, communicate value propositions, and direct users to key actions.
- **Key Sections**:
  1. Header with `schedx` wordmark and navigation links.
  2. Hero Section with value proposition copy, CTA buttons ("Generate Timetable", "Explore Features"), trust pills, and interactive SVG platform visual.
  3. Feature Highlights Bento Grid.
  4. 4-Step Workflow ("Configure", "Generate", "Review", "Done").
  5. "Why SchedX" benefit cards.
  6. Frequently Asked Questions (FAQ) collapsible details.
  7. Site Footer with Formspark Feedback modal trigger.

### Page 2: Generate Timetable Workbench (`public/generate.html`)
- **Route**: `GET /generate`
- **Purpose**: Primary administrative workspace for configuring parameters, generating timetables, editing entries, and exporting PDFs.
- **Key Sections**:
  1. Page title banner: `GENERATE TIMETABLE`.
  2. 8-Period Daily Classes Template & Setup Guide banner.
  3. 10-Step Configuration Form:
     - Step 01: Department
     - Step 02: Teachers & Assigned Subjects
     - Step 03: Subjects
     - Step 04: Classes / Sections
     - Step 05: Rooms
     - Step 06: Periods & Time Span (with Copy Period Panel)
     - Step 07: Break Management (with Copy Break Panel)
     - Step 08: Lab Classes
     - Step 09: Working Days / Schedule Settings
     - Step 10: Generate Timetable Action Card
  4. Generated Timetable Output Container (Day-by-Day tables, Department filter, Edit button, Download PDF button, Refresh button, Delete button).
  5. Faculty Workload Distribution Summary card.
  6. SchedX To-Do Calendar Planner module (`public/todo.js`).
  7. Inline row editing controls and Cell Edit Modal dialog.

### Page 3: Features Explorer (`public/features.html`)
- **Route**: `GET /features`
- **Purpose**: Deep dive into the 17 scheduling engine capabilities, interactive storage metrics inspector, and feature deep-dive modals.
- **Key Sections**:
  1. Hero banner: `FEATURES`.
  2. 17 Feature Exploration Cards with interactive hover states and expandable technical descriptions.
  3. Stored Scheduling Repository & Metrics Dashboard (inspecting teachers, rooms, active versions, and history snapshots).
  4. Saved Timetables List with direct PDF download buttons.

### Page 4: About Us (`public/about.html`)
- **Route**: `GET /about`
- **Purpose**: Present institutional motivation, the Scheduling Triad concept, and product vision.
- **Key Sections**:
  1. Page banner: `SMARTER SCHEDULING`.
  2. What is SchedX & The Core Scheduling Triad diagram.
  3. The Motivation Behind SchedX.
  4. Mission and Vision cards.
  5. Product Values and Contact support links.

### Page 5: Room Availability (`public/rooms.html`)
- **Route**: `GET /rooms`
- **Purpose**: Dedicated infrastructure room and laboratory capacity registry.
- **Key Sections**:
  1. Banner: `ROOM AVAILABILITY`.
  2. Add Room Form (Room Number, Type: Classroom/Lab, Capacity).
  3. Room listing table with live status badges and action buttons.

### Page 6: Teacher Availability Diary (`public/teacher-availability.html`)
- **Route**: `GET /teacher-availability`
- **Purpose**: Vintage desk-diary styled interface for specifying individual faculty slot availability.
- **Key Sections**:
  1. Banner: `TEACHER AVAILABILITY`.
  2. Diary Page styled with warm aged paper texture (`#F5EBD5`), leather spine margin, and lined notebook layout.
  3. Teacher selection dropdown and day-by-day availability checkboxes.

### Page 7: Teacher Profiles (`public/teacher-info.html`)
- **Route**: `GET /teacher-info`
- **Purpose**: Faculty directory management.
- **Key Sections**:
  1. Banner: `TEACHER PROFILES`.
  2. Two-column layout: Teacher Profile entry form on the left, registered faculty list on the right.

---

## 10. Data Requirements

| Entity | Attributes | Persistence Target |
|---|---|---|
| **Department** | `id`, `name`, `code` | `data/departments.json` |
| **Teacher** | `id`/`teacher_id`, `name`/`teacher_name`, `assigned_subject`, `assigned_subjects`, `specialization`, `working_days_per_week` | `public.teachers` (Supabase) + `data/teachers.json` |
| **Course / Subject** | `course_id`/`id`, `course_name`/`name`, `department`, `room_type` | `public.courses` (Supabase) + Form state |
| **Class / Section** | `class_id`/`id`, `class_name`/`name`, `section`, `student_count` | `public.classes` (Supabase) + Form state |
| **Room** | `room_id`/`id`, `room_name`/`room_number`, `room_type`, `capacity`, `availability` | `public.rooms` (Supabase) + `data/rooms.json` |
| **Timetable Entry** | `timetable_id`, `department`, `day`, `day_of_week`, `period_number`, `start_time`, `end_time`, `class_name`, `section`, `course_name`, `teacher_name`, `room_name`, `room_type`, `session_type`, `duration`, `has_conflict` | `public.timetable` (Supabase) + `data/timetable_store.json` |
| **Timetable History** | `version_id`, `timestamp`, `is_active`, `department`, `status`, `summary`, `conflicts`, `entries`, `working_days`, `day_periods`, `teacher_workload` | `data/timetable_history.json` (Max 2 retained) |
| **To-Do Task** | `id`, `title`, `date`, `time`, `category`, `completed`, `created_at` | `data/todos.json` |
| **Break Record** | `name`, `day`, `start_time`, `end_time`, `type`, `department` | `data/breaks.json` |

---

## 11. User Roles & Permissions

> [!NOTE]
> **Current Architectural State**: The application currently operates in **Single-Tenant Open Administrative Mode**. All users accessing the application have full administrative privileges to generate schedules, edit slots, and modify configurations. Role-Based Access Control (RBAC) is planned for Phase 2.

| Planned Role | Planned Permissions | Current Implementation |
|---|---|---|
| **Super Admin** | Full system configuration, department provisioning, database sync | `Open Access` |
| **Department Head** | Department timetable generation, faculty assignment, editing | `Open Access` |
| **Faculty** | Read-only timetable view, personal availability diary edit | `Open Access` |
| **Student** | Read-only weekly schedule view, live class tracker | `Open Access` |

---

## 12. External Integrations

1. **Supabase Cloud Database**:
   - Purpose: Relational cloud storage for teachers, courses, rooms, classes, and generated timetables.
   - Integration Method: Official `@supabase/supabase-js` client initialized in `config/supabase.js`.
2. **Formspark Feedback Gateway**:
   - Purpose: Receiving user feedback reviews without a dedicated mail server.
   - Integration Method: Backend proxy route (`POST /api/feedback`) forwarding submissions to `https://submit-form.com/k2ffqAiIu`.
3. **Google Fonts CDN**:
   - Purpose: Loading typography assets (`Plus Jakarta Sans`, `Inter`, `Comfortaa`, `Fredoka`, `Orbitron`).
   - Integration Method: Preconnected `<link>` tags in HTML headers.

---

## 13. UI State Handling (Loading, Empty, Success, Error)

| UI Context | Loading State | Empty State | Success State | Error State |
|---|---|---|---|---|
| **Timetable Generator** | Button spinner spins; button text reads "GENERATING..."; form inputs disabled. | Prompt message: "No timetable generated yet. Configure parameters above and click Generate." | Smooth scroll to timetable container; success toast: "Timetable generated successfully!"; conflict warnings if applicable. | Inline error alert box with exact problem description (e.g., "Teacher names must be unique"). |
| **Timetable Display** | Animated skeleton pulse on table cards. | "No classes scheduled for this day." | Interactive table rendered with colored period badges, room tags, and edit buttons. | Red-bordered error container with error message and "↻ Retry" button. |
| **Room Management** | "Loading rooms from Supabase..." table row. | "No rooms found. Click + Add Room to create one." | Room row rendered with status badge and Edit/Delete controls. | Red banner with database failure notice. |
| **PDF Download** | Download button shows loading indicator. | N/A (Button disabled if no timetable exists). | Browser triggers native file save for `.pdf` file. | Toast alert: "Failed to generate timetable PDF." |

---

## 14. Current Limitations

1. **Lack of User Authentication**: Any user with network access to the port can create, edit, or delete institutional timetables.
2. **Monolithic Backend**: All API endpoints, generation logic, and persistence routines reside in `server.js` (5,630 lines).
3. **Aggressive Database Timeout**: Supabase queries use a 250ms–1000ms timeout. In high-latency network conditions, the server routinely drops to local JSON storage.
4. **History Retention Limit**: Only the last 2 timetable generations are retained in `data/timetable_history.json`. Earlier generations are discarded.

---

## 15. Scope Definition

### In-Scope (MVP & Current V2.0)
- Full 10-step parameter workbench in browser.
- Multi-constraint solver with 3-way collision prevention.
- Day-specific period counts with 12h AM/PM minute precision.
- Break management with automatic teaching period recalculation.
- Multi-day, multi-section lab scheduling.
- Inline row editing and cell editing modal.
- Faculty workload distribution tables.
- Zero-dependency vector PDF generator.
- Real-time current lecture tracker.
- Dual-tier Supabase + local JSON storage.
- Calendar To-Do planner module.
- Formspark user feedback proxy.

### Out-of-Scope (Deferred to Future Releases)
- User authentication, JWT sessions, and RBAC.
- Multi-campus physical distance traveling calculations.
- Automatic SMS / WhatsApp lecture notifications.
- Student elective course enrollment matching.
- Mobile native application wrapper (React Native / Flutter).

---

## 16. Acceptance Criteria

1. **Zero Collision Guarantee**: Generated timetable must contain 0 instances of a teacher, section, or room assigned to two distinct classes at the same day and overlapping time.
2. **Persistence Integrity**: Refreshing the browser after generating or editing a timetable must reload the identical timetable state.
3. **PDF Correctness**: Downloaded PDF must open cleanly in standard PDF viewers (Adobe Acrobat, Chrome, Preview) conforming to ISO 32000 PDF 1.4 without stream corruption.
4. **Validation Accuracy**: Attempting to generate a schedule with duplicate teacher names, exceeding subject limits, or with missing departments must immediately return descriptive `HTTP 400` errors.
5. **Editing Workload Recalculation**: Deleting or updating an entry in edit mode must immediately recalculate faculty workload numbers without requiring a full re-generation.

---
&copy; 2025–2026 SchedX Product Engineering.
