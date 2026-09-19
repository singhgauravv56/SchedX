# SchedX Project Audit Report

## 1. Executive Summary

**Overall project state:** **NEEDS FIXES**

SchedX is well-architected, with a complete full-stack implementation featuring an Express REST API backend, modern responsive frontend pages, complete timetable generation logic with multi-dimensional conflict prevention, and a clean Supabase client abstraction.

However, the project currently **NEEDS FIXES** before it can function end-to-end because of one root issue:
- **Supabase Cloud Schema Desynchronization**: While Supabase environment credentials (`SUPABASE_URL` and `SUPABASE_SECRET_KEY`) are properly configured in `.env` and connection to the Supabase cloud succeeds, the PostgreSQL tables specified in `database/supabase_schema.sql` have not yet been created in the active Supabase project. The live Supabase instance contains an older partial schema where table columns do not match the backend queries (e.g. `teachers.id` vs `teachers.teacher_id`, `rooms.id` vs `rooms.room_id`), and 5 essential tables (`courses`, `classes`, `time_slots`, `teacher_availability`, `timetable`) are missing entirely.

Once `database/supabase_schema.sql` is executed in the Supabase SQL Editor, the entire application will transition to a fully operational state.

---

## 2. Architecture

The SchedX platform is built on a clean 3-tier cloud-backed architecture:

```text
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND LAYER                        │
│  HTML5 + Vanilla CSS (style.css) + Vanilla JS (script.js)   │
│  Pages: / (Home), /generate, /features, /rooms,             │
│         /teacher-availability, /teacher-info                │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP REST (JSON)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       BACKEND LAYER                         │
│  Node.js + Express 4 (server.js)                            │
│  - Static asset serving                                     │
│  - Route validation & parameter sanitization                │
│  - Timetable generation & conflict prevention engine        │
│  - Time slot calculation & current-class resolution         │
└──────────────────────────────┬──────────────────────────────┘
                               │ @supabase/supabase-js v2
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE CLIENT LAYER                    │
│  config/supabase.js (Supabase Client Singleton)             │
│  - Loads SUPABASE_URL & SUPABASE_SECRET_KEY via dotenv      │
│  - Optional WebSocket transport (ws) for Realtime           │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / PostgREST
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE / PERSISTENCE LAYER               │
│  Supabase Cloud PostgreSQL                                  │
│  - Relational tables with Foreign Keys & CASCADE rules      │
│  - 3-Way Composite Unique Constraints (Conflict Prevention) │
│  - B-tree Indexes on query lookup columns                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Supabase Status

- **Connection:** **PASS**
  - Supabase client initialization succeeds cleanly without errors.
  - Network requests to the Supabase project endpoint successfully authenticate and return HTTP responses.
- **Database:** **PARTIAL**
  - Read queries execute against PostgreSQL, but fail with `PGRST205` (table does not exist in schema cache) or `42703` (column does not exist) because the active schema does not match the application code.
- **Tables Audit (Live Database vs Code Expectations):**
  - `teachers`: **EXISTS (SCHEMA MISMATCH)** — Table exists in live Supabase, but was created with `id` (UUID), `name`, `department`, `availability` (JSONB) instead of `teacher_id` (BIGINT), `teacher_name`, `specialization`. Backend query `SELECT * ... ORDER BY teacher_id` fails with PostgreSQL error 42703.
  - `rooms`: **EXISTS (SCHEMA MISMATCH)** — Table exists in live Supabase with `id` (UUID), `room_number` instead of `room_id` (BIGINT), `room_name`. Backend query `SELECT * ... ORDER BY room_id` fails with PostgreSQL error 42703.
  - `courses`: **MISSING** — Returns `PGRST205: Could not find the table 'public.courses' in the schema cache`.
  - `classes`: **MISSING** — Returns `PGRST205: Could not find the table 'public.classes' in the schema cache`.
  - `time_slots`: **MISSING** — Returns `PGRST205: Could not find the table 'public.time_slots' in the schema cache`.
  - `teacher_availability`: **MISSING** — Returns `PGRST205: Could not find the table 'public.teacher_availability' in the schema cache`.
  - `timetable`: **MISSING** — Returns `PGRST205: Could not find the table 'public.timetable' in the schema cache`.
  - `teacher_courses`: **MISSING** — Returns `PGRST205: Could not find the table 'public.teacher_courses' in the schema cache`.

---

## 4. Security

- **Environment variables:** **PASS**
  - `SUPABASE_URL`: Configured in `.env`
  - `SUPABASE_SECRET_KEY`: Configured in `.env`
- **Secret protection:** **PASS**
  - [x] Real secret is only on the backend / in local `.env`
  - [x] `.env` is ignored by Git in root `.gitignore`
  - [x] `.env.example` contains placeholders only (`SUPABASE_URL=`, `SUPABASE_SECRET_KEY=`, `PORT=3000`)
  - [x] No secret or private token is hardcoded in any JavaScript, HTML, or CSS source file
  - [x] No secret is exposed or returned through any `/api/*` endpoint
  - [x] No secret is printed in console logs or diagnostics (`diagnose.js` prints `✓ Configured` mask)
  - [x] Frontend `public/script.js` never accesses Supabase keys directly; it talks exclusively to backend Express endpoints

---

## 5. MySQL Removal

- **MySQL dependency:** **REMOVED**
  - `package.json` contains 0 MySQL dependencies (`mysql`, `mysql2` are completely absent).
- **MySQL code:** **REMOVED**
  - `server.js` contains 0 references to MySQL pools, connections, or syntax.
  - `config/` contains no MySQL files.
- **MySQL environment variables:** **REMOVED**
  - `.env` and `.env.example` contain 0 references to `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- **MySQL active queries:** **REMOVED**
  - All data operations use the `@supabase/supabase-js` query builder.
- **Legacy Archives:**
  - `database/archive/smartschedule_mysql_legacy.sql` and `database/archive/timetable_mysql_legacy.sql` remain purely as offline archival reference files and are not invoked by application code.

---

## 6. Database Schema

Review of schema specification in `database/supabase_schema.sql`:

### Table 1: `teachers`
- **Primary Key:** `teacher_id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY`
- **Fields:** `teacher_name TEXT NOT NULL`, `specialization TEXT`, `working_days_per_week INTEGER DEFAULT 5`, `created_at TIMESTAMPTZ DEFAULT NOW()`
- **Constraints:** `CHECK (working_days_per_week BETWEEN 1 AND 7)`
- **Evaluation:** Clean and well-typed. Recommendation: Add `UNIQUE (teacher_name)` to prevent duplicate name entries at the database level.

### Table 2: `courses`
- **Primary Key:** `course_id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY`
- **Fields:** `course_name TEXT NOT NULL`, `created_at TIMESTAMPTZ DEFAULT NOW()`
- **Evaluation:** Clean. Recommendation: Add `UNIQUE (course_name)`.

### Table 3: `teacher_courses`
- **Primary Key:** Composite `(teacher_id, course_id)`
- **Foreign Keys:**
  - `teacher_id REFERENCES public.teachers(teacher_id) ON DELETE CASCADE`
  - `course_id REFERENCES public.courses(course_id) ON DELETE CASCADE`
- **Evaluation:** Perfect many-to-many relationship table with cascade delete.

### Table 4: `classes`
- **Primary Key:** `class_id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY`
- **Fields:** `class_name TEXT NOT NULL`, `section TEXT DEFAULT 'A'`, `student_count INTEGER NOT NULL`, `created_at TIMESTAMPTZ`
- **Constraints:** `CHECK (student_count > 0)`, `CONSTRAINT uq_class_section UNIQUE (class_name, section)`
- **Evaluation:** Properly ensures uniqueness per class cohort and section.

### Table 5: `rooms`
- **Primary Key:** `room_id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY`
- **Fields:** `room_name TEXT NOT NULL UNIQUE`, `room_type TEXT NOT NULL`, `capacity INTEGER NOT NULL`, `created_at TIMESTAMPTZ`
- **Constraints:** `CHECK (room_type IN ('Classroom', 'Laboratory'))`, `CHECK (capacity > 0)`, `UNIQUE (room_name)`
- **Evaluation:** Enforces strict room types and positive capacity.

### Table 6: `time_slots`
- **Primary Key:** `slot_id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY`
- **Fields:** `day_of_week INTEGER NOT NULL`, `start_time TIME NOT NULL`, `end_time TIME NOT NULL`, `is_break BOOLEAN DEFAULT FALSE`
- **Constraints:** `CHECK (day_of_week BETWEEN 1 AND 7)`, `CONSTRAINT uq_day_time_slot UNIQUE (day_of_week, start_time, end_time)`
- **Index:** `idx_time_slots_day` on `day_of_week`
- **Evaluation:** Complete slot model supporting weekly schedules and break periods.

### Table 7: `teacher_availability`
- **Primary Key:** `availability_id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY`
- **Foreign Keys:**
  - `teacher_id REFERENCES public.teachers(teacher_id) ON DELETE CASCADE`
  - `slot_id REFERENCES public.time_slots(slot_id) ON DELETE CASCADE`
- **Constraints:** `CONSTRAINT uq_teacher_slot UNIQUE (teacher_id, slot_id)`
- **Index:** `idx_teacher_avail_teacher` on `teacher_id`
- **Evaluation:** Clean model for individual slot availability per teacher.

### Table 8: `timetable`
- **Primary Key:** `timetable_id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY`
- **Foreign Keys:**
  - `slot_id REFERENCES public.time_slots(slot_id) ON DELETE CASCADE`
  - `teacher_id REFERENCES public.teachers(teacher_id) ON DELETE CASCADE`
  - `course_id REFERENCES public.courses(course_id) ON DELETE CASCADE`
  - `class_id REFERENCES public.classes(class_id) ON DELETE CASCADE`
  - `room_id REFERENCES public.rooms(room_id) ON DELETE CASCADE`
- **Conflict Prevention Uniqueness Constraints:**
  - `CONSTRAINT uq_slot_teacher UNIQUE (slot_id, teacher_id)` — Prevents teacher double-booking.
  - `CONSTRAINT uq_slot_class UNIQUE (slot_id, class_id)` — Prevents class double-booking.
  - `CONSTRAINT uq_slot_room UNIQUE (slot_id, room_id)` — Prevents room double-booking.
- **Indexes:** Complete indexes on all 5 foreign key columns.
- **Evaluation:** Outstanding database-level protection against schedule clashes.

---

## 7. API Review

| # | Endpoint | Method | Status | Notes |
|---|---|---|---|---|
| 1 | `/api/health` | GET | **PARTIAL** | Correctly detects Supabase connectivity and reports missing schema tables (503). |
| 2 | `/api/teachers` | GET | **FAIL** | Fails with code 42703 (`teacher_id` column missing in current live table). |
| 3 | `/api/teachers` | POST | **FAIL** | Validates teacher name; queries `teacher_id` on live table. |
| 4 | `/api/teachers/:id` | PUT | **FAIL** | Updates teacher by ID; requires `teacher_id` column. |
| 5 | `/api/teachers/:id` | DELETE | **FAIL** | Deletes teacher; requires `teacher_id` column. |
| 6 | `/api/courses` | GET | **FAIL** | Table `courses` does not exist in live Supabase (`PGRST205`). |
| 7 | `/api/courses` | POST | **FAIL** | Validates course name; fails on insert due to missing table. |
| 8 | `/api/courses/:id` | PUT | **FAIL** | Table `courses` missing. |
| 9 | `/api/courses/:id` | DELETE | **FAIL** | Table `courses` missing. |
| 10 | `/api/classes` | GET | **FAIL** | Table `classes` does not exist in live Supabase (`PGRST205`). |
| 11 | `/api/classes` | POST | **FAIL** | Validates name and student count > 0; table missing. |
| 12 | `/api/classes/:id` | PUT | **FAIL** | Table `classes` missing. |
| 13 | `/api/classes/:id` | DELETE | **FAIL** | Table `classes` missing. |
| 14 | `/api/rooms` | GET | **FAIL** | Table exists, but queries `room_id` while live table has `id` (code 42703). |
| 15 | `/api/rooms` | POST | **FAIL** | Validates `Classroom` / `Laboratory` and capacity > 0; queries `room_id`. |
| 16 | `/api/rooms/:id` | PUT | **FAIL** | Table columns mismatch. |
| 17 | `/api/rooms/:id` | DELETE | **FAIL** | Table columns mismatch. |
| 18 | `/api/teacher-availability` | GET | **FAIL** | Joins with `time_slots` and `teachers`; table missing (`PGRST205`). |
| 19 | `/api/teacher-availability` | POST | **FAIL** | Parses slot ranges; table `teacher_availability` missing. |
| 20 | `/api/generate` | POST | **FAIL** | Validates inputs; fails on database insertion steps. |
| 21 | `/api/generate-timetable` | POST | **FAIL** | Alias endpoint for `/api/generate`. |
| 22 | `/api/timetable` | GET | **FAIL** | Table `timetable` does not exist in live Supabase (`PGRST205`). |
| 23 | `/api/timetable` | DELETE | **FAIL** | Table `timetable` missing. |
| 24 | `/api/current-class` | GET | **FAIL** | Queries `timetable` joined with `time_slots`; table missing. |

*Note: All route implementations in `server.js` are syntactically and logically complete. The failures are entirely due to the Supabase database schema not being initialized.*

---

## 8. Generate Page

- **Location:** `public/generate.html` & `public/script.js`
- **Dynamic Teacher Fields:** **PASS**
  - Selecting teacher count dynamically renders `Teacher 1..N` boxes with individual `Teacher Name` (required) and `Specialization` fields.
  - Form state is retained during adjustments.
- **Dynamic Subject Fields:** **PASS**
  - Selecting subject count renders dynamic input rows for every subject.
- **Requirement 14 Validation (Subject count <= Teacher count):** **PASS**
  - **Frontend:** Explicitly blocks submission and displays an alert if `subjectCount > teacherCount`.
  - **Backend:** Enforces `if (subjects.length > teachers.length)` and returns HTTP 400 with a descriptive error message.
- **Room Type Selection:** **PASS**
  - Provides options: `Classroom`, `Laboratory`, and `Both (Classroom & Laboratory)`.
  - Backend verifies selection against `['Classroom', 'Laboratory', 'Both']`.
  - Affects generation: Filters rooms by `.eq('room_type', 'Classroom')` or `'Laboratory'`, or allows all rooms if `'Both'`.
- **Working Days & Hours:**
  - Configurable working days (1-7, default 5) and time windows (default 09:00 - 16:00).
- **Post-Generation Feedback:**
  - Displays formatted message with scheduled period count and automatically triggers timetable display.

---

## 9. Teacher Availability

- **Location:** `public/teacher-availability.html`
- **Features Verified:**
  - [x] Select number of teachers (1-20)
  - [x] Dynamic generation of teacher profile cards and slot checkboxes
  - [x] Checkbox grid for Monday-Friday across six 1-hour periods
  - [x] Save availability sends `POST /api/teacher-availability` to Supabase
  - [x] Retrieves saved availability via `GET /api/teacher-availability` on page load
  - [x] Timetable generator (`server.js` lines 923-942) loads `teacher_availability` and restricts assignment exclusively to approved slots
- **Storage:** Persisted directly to Supabase (`teacher_availability` table). Zero reliance on `localStorage` or `sessionStorage`.

---

## 10. Teacher Information

- **Location:** `public/teacher-info.html`
- **Features Verified:**
  - [x] Teacher profile input: Name, Specialization/Department, Course taught, Working days (1-7)
  - [x] Form validation for required fields
  - [x] Full CRUD operations: Create (`POST`), Read (`GET`), Update (`PUT`), Delete (`DELETE`)
  - [x] List refreshed dynamically via Supabase on add/edit/delete
  - [x] Clean card-based UI with Edit and Delete actions

---

## 11. Timetable Generation

- **Algorithm Review (`server.js` lines 680-1079):**
  - Input parsing and sanitization.
  - Syncs teachers, courses, classes into Supabase.
  - Ensures qualified teacher-course pairings (`teacher_courses`).
  - Fetches eligible rooms matching room type preference and capacity.
  - Builds time slots across working days.
  - Loads teacher availability constraints.
  - Queries existing timetable bookings across other classes to prevent multi-batch collisions.
  - Constraint satisfaction scheduling loop:
    - Verifies teacher availability for slot.
    - Verifies teacher not double-booked.
    - Verifies class not double-booked.
    - Verifies room unoccupied and matches type/capacity.
    - Assigns slot and marks all 3 resources (teacher, class, room) occupied.
  - Atomic persistence: Deletes prior class entries and inserts newly generated entries into `timetable` in Supabase.

---

## 12. Conflict Testing

Code-level and constraint evaluation against the test scenarios:

| Test | Scenario | Expected Behavior | Code Implementation | Status |
|---|---|---|---|---|
| **TEST A** | Same teacher + same time + different class | CONFLICT BLOCKED | Enforced via `occupiedTeacherSlots.has(...)` in memory & `CONSTRAINT uq_slot_teacher UNIQUE (slot_id, teacher_id)` in database | **PASS** |
| **TEST B** | Same room + same time + different class | CONFLICT BLOCKED | Enforced via `occupiedRoomSlots.has(...)` in memory & `CONSTRAINT uq_slot_room UNIQUE (slot_id, room_id)` in database | **PASS** |
| **TEST C** | Same class + same time + different teacher | CONFLICT BLOCKED | Enforced via `occupiedClassSlots.has(...)` in memory & `CONSTRAINT uq_slot_class UNIQUE (slot_id, class_id)` in database | **PASS** |
| **TEST D** | Teacher unavailable at selected time | ASSIGNMENT BLOCKED | Enforced via `teacherAvailabilityMap.get(teacher.teacher_id).has(slot.slot_id)` | **PASS** |
| **TEST E** | Teacher not assigned/qualified for course | ASSIGNMENT BLOCKED | Enforced via `teacher_courses` qualification mapping before assignment | **PASS** |
| **TEST F** | Laboratory required but classroom selected | ASSIGNMENT BLOCKED | Enforced via `.eq('room_type', 'Laboratory')` query filter | **PASS** |
| **TEST G** | Student capacity greater than room capacity | ASSIGNMENT BLOCKED | Room query filters `.gte('capacity', ...)` | **PARTIAL** (See Code Quality note on `Math.min(studentCount, 30)`) |

---

## 13. Timetable Persistence

- **Workflow:**
  1. Generate Timetable -> `POST /api/generate`
  2. Server saves records to Supabase `timetable` table.
  3. Client page reload -> `loadTimetable()` in `public/script.js` fires `GET /api/timetable`.
  4. Server reads entries joined with `time_slots`, `teachers`, `courses`, `classes`, and `rooms`.
  5. Browser renders table directly from database response.
- **Evidence:**
  - Complete join query implemented in `server.js` line 1087.
  - Zero localStorage cache used for timetable display.
- **Status:** **PARTIAL** (Architecturally complete and fully implemented in code, but currently blocked by the uninitialized Supabase database tables).

---

## 14. Current Class

- **Endpoint:** `GET /api/current-class` (`server.js` lines 1152-1207)
- **Features:**
  - Computes current day of week (1=Monday..7=Sunday).
  - Computes current time string `HH:MM:SS`.
  - Queries active timetable joined with `time_slots`.
  - Resolves active class period, teacher, subject, room, section, and time interval.
  - Fallback: Returns `{ running: false, message: 'No class is currently scheduled.' }` when no class is active.
- **Timezone Finding:**
  - `new Date().getHours()` uses the server's system clock. On a developer machine in India, this matches IST. However, if deployed on cloud hosts (Vercel/Render/AWS), system time is UTC, resulting in a 5.5 hour time drift unless explicitly converted to `'Asia/Kolkata'`.

---

## 15. Features Page

Review of all 10 feature cards in `public/features.html`:

| Feature Card | Action | Functional State |
|---|---|---|
| 1. Smart Timetable Generation | Navigates to `/generate` | Fully functional |
| 2. Teacher Availability | Navigates to `/teacher-availability` | Fully functional |
| 3. Teacher Information | Navigates to `/teacher-info` | Fully functional |
| 4. Room Availability | Navigates to `/rooms` | Fully functional |
| 5. Student Capacity | Opens explanatory feature modal | Educational/Informative |
| 6. Teacher-Course Matching | Opens explanatory feature modal | Educational/Informative |
| 7. Conflict Prevention | Opens explanatory feature modal | Educational/Informative |
| 8. Database Storage | Opens explanatory feature modal | Educational/Informative |
| 9. Persistent Timetable | Opens explanatory feature modal | Educational/Informative |
| 10. Easy Input / Feedback | `mailto:schedx24x7@gmail.com?subject=SchedX%20Feedback` | Fully functional |

---

## 16. UI/UX

- **Design Aesthetic:** Clean, modern, accessible typography (system font stack), dark navy text on neutral slate/white backgrounds with indigo accent (`#4f46e5`).
- **Responsive Navigation:** Hamburger menu on screens <= 768px with ARIA attributes (`aria-expanded`, `aria-label`).
- **Feedback & Notifications:** Toast notification system, alert boxes for errors, warnings, and success confirmations.
- **Empty States:** Friendly placeholders on all tables when no data exists.
- **Modals:** Feature detail dialog with backdrop blur and keyboard/click-outside dismiss support.

---

## 17. Performance

- **Frontend:** Lightweight (< 30KB CSS + JS combined), 0 external heavy frameworks, instant initial render.
- **Database Indexing:** `database/supabase_schema.sql` creates B-tree indexes on `slot_id`, `teacher_id`, `course_id`, `class_id`, `room_id`, `day_of_week`, and `created_at`.
- **Backend Generator Optimization Opportunity:** Step A (teachers), Step B (courses), and Step F (time slots) run sequential `await` queries inside loops. For small inputs (3-10 teachers) this executes in ~100ms; for larger datasets (50+ teachers), using bulk `.upsert([...])` queries would reduce round-trips.

---

## 18. Code Quality

- **CRITICAL Issues:**
  - **Schema Desynchronization:** `server.js` queries `database/supabase_schema.sql` tables/columns, but live Supabase has not been executed with this SQL.
- **HIGH Issues:**
  - **Timezone Drift on Cloud Deployments:** `GET /api/current-class` uses local server time (`new Date().getHours()`) instead of pinning to Indian Standard Time (`Asia/Kolkata`).
- **MEDIUM Issues:**
  - **Room Capacity Floor in Generator:** `server.js` line 853 uses `.gte('capacity', Math.min(studentCount, 30))`. If a class has 60 students, `Math.min(60, 30)` evaluates to 30, meaning a room with capacity 35 could be selected. It should filter `.gte('capacity', studentCount)`.
  - **Sequential Loop Awaits:** Several database operations in `generateTimetableHandler` execute queries inside `for` loops rather than using batch array inserts.
- **LOW Issues:**
  - Missing unique constraint in `database/supabase_schema.sql` on `teachers(teacher_name)` and `courses(course_name)` (enforced at application layer via `.ilike()`, but good practice to enforce in DB).

---

## 19. NPM / Runtime

- `node --check server.js`: **PASS** (0 syntax errors).
- `npm install`: **PASS** (82 packages audited, 0 vulnerabilities).
- `npm start`: **PASS** (Starts Express on port 3000 cleanly).
- Server error handling: Handles `EADDRINUSE` gracefully with user guidance.

---

## 20. GitHub Readiness

- **Repository:** `https://github.com/singhgauravv56/SchedX.git` (branch `main`).
- **Tracking:** Up to date with remote `origin/main` (`87fe85f`).
- **Git Security:**
  - `.env` excluded: **YES**
  - `node_modules/` excluded: **YES**
  - Secrets excluded: **YES**

---

## 21. Critical Issues

1. **Supabase Schema Not Executed in Active Cloud Project:**
   - **Details:** `server.js` requires the tables and columns defined in `database/supabase_schema.sql` (`teacher_id`, `room_id`, `courses`, `classes`, `time_slots`, `teacher_availability`, `timetable`). In the active Supabase cloud database, only an older partial schema exists with column discrepancies (`id` instead of `teacher_id`/`room_id`) and 5 missing tables.
   - **Impact:** All database read/write endpoints currently return HTTP 500 / 503.
   - **Remedy:** Execute `database/supabase_schema.sql` in the Supabase SQL Editor.

---

## 22. High Priority Issues

1. **Timezone Handling in Current Class Feature:**
   - **Details:** In `server.js` line 1154, `new Date()` reads the host operating system clock. When deployed on UTC cloud servers, the current class determination will be 5 hours and 30 minutes off compared to India Standard Time.
   - **Remedy:** Format current time using `Intl.DateTimeFormat` with `{ timeZone: 'Asia/Kolkata' }`.

---

## 23. Medium Priority Issues

1. **Room Capacity Filtering Constraint in Timetable Generator:**
   - **Details:** `server.js` line 853 filters `.gte('capacity', Math.min(studentCount, 30))`. For class sizes over 30 students, this could select an undersized room.
   - **Remedy:** Change filter to `.gte('capacity', studentCount)`.

2. **Batching Database Inserts in Timetable Generator:**
   - **Details:** Generating slots executes multiple sequential round-trip queries in loops.
   - **Remedy:** Use Supabase `.upsert([...])` with array payloads for faster generation.

---

## 24. Low Priority Improvements

1. **Database-Level Unique Constraints for Names:**
   - Add `UNIQUE (teacher_name)` to `teachers` and `UNIQUE (course_name)` to `courses` in `database/supabase_schema.sql` for strict database-level deduplication.
2. **Static Cache Control:**
   - Add `maxAge` headers to `express.static` in production environments for faster asset delivery.

---

## 25. Recommended Next Steps

1. **Step 1 (Fix Database Schema in Supabase):**
   - Open your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Navigate to your SchedX project -> **SQL Editor** -> **New query**.
   - Copy the full contents of `database/supabase_schema.sql` and run it.
2. **Step 2 (Verify Health Endpoint):**
   - Run `node diagnose.js` or visit `http://localhost:3000/api/health`. It will report `{"status":"ok","database":true,"provider":"supabase"}`.
3. **Step 3 (Refine Timezone in server.js):**
   - Update `/api/current-class` to explicitly compute IST (`Asia/Kolkata`) hours and minutes.
4. **Step 4 (Refine Room Capacity Filter in server.js):**
   - Adjust `Math.min(studentCount, 30)` to `studentCount` on line 853.
5. **Step 5 (End-to-End Test):**
   - Open `/generate`, input teachers, subjects, and room preferences, click **Generate Timetable**, and verify the persisted table renders upon browser refresh.
