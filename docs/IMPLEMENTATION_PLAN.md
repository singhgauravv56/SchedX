# Phased Implementation Plan & Technical Roadmap — SchedX

> **Document Version**: 2.0.0  
> **Status**: `Planning Specification` (Non-Destructive Roadmap; Do Not Auto-Implement)  
> **Target Audience**: Technical Leadership, Engineering Leads, AI Coding Agents  
> **Related Documents**: [ARCHITECTURE.md](ARCHITECTURE.md) | [PRD.md](PRD.md) | [TESTING.md](TESTING.md) | [SECURITY.md](SECURITY.md)

---

## 1. Plan Structure & Execution Rules

This document outlines a phased engineering roadmap for stabilizing, modularizing, and enhancing SchedX.

> [!IMPORTANT]
> **Strict Agent Guideline**: This is an architectural planning document. AI coding agents and automated tools must **NOT** implement the tasks below without explicit user request and prior approval.

---

## 2. Categorized Overview of Work

```
┌────────────────────────────────────────────────────────┐
│ Phase 1: Stabilization, Testing & Defect Remediation   │
│ (Test Runner Server Dependency, UI Links, Year Sync)   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ Phase 2: Architectural Modularization & Backend Split  │
│ (Deconstruct server.js into Controllers & Services)    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ Phase 3: Security Hardening & Authentication (RBAC)    │
│ (User Roles, JWT Sessions, Hardened Supabase RLS)      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ Phase 4: Advanced Institutional Features               │
│ (Multi-Department Auto-Sync, Email Dispatch, Backups)  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Phase 1: Stabilization & Defect Remediation

### Task 1.1: Automated Test Runner Standalone Server Handling
- **Category**: `Known Defect / Tooling Gap`
- **Objective**: Allow `node scripts/run-all-tests.js` to run reliably without requiring the developer to manually remember to start `server.js` in a separate background window.
- **Reason for Task**: Running `npm test` or `node scripts/run-all-tests.js` currently fails on 11 out of 13 suites if the HTTP server is not already bound to port 3000.
- **Relevant Existing Files**:
  - `scripts/run-all-tests.js`
  - `package.json`
- **Dependencies**: None. Native Node.js `child_process`.
- **Expected Changes**: Update `scripts/run-all-tests.js` to probe `http://localhost:3000/api/health`. If not running, spawn `node server.js` as a child process, wait for the readiness signal, execute the 13 suites, and cleanly terminate the child process upon exit.
- **Testing Requirements**: Run `node scripts/run-all-tests.js` when port 3000 is completely idle and verify all suites execute.
- **Completion Criteria**: Master test runner exits with code 0 without manual server intervention.
- **Risks**: Port collisions if port 3000 is occupied by an unrelated service.

### Task 1.2: Global Navigation Links Alignment
- **Category**: `Known Defect / UI Inconsistency`
- **Objective**: Provide navigation pathways to `rooms.html` and `teacher-info.html` from the top header or features menu.
- **Reason for Task**: Currently, `rooms.html` and `teacher-info.html` are orphaned pages accessible only via manual URL entry.
- **Relevant Existing Files**:
  - `public/index.html`
  - `public/generate.html`
  - `public/features.html`
  - `public/about.html`
- **Dependencies**: None.
- **Expected Changes**: Add sub-navigation or direct links in the Features page or generator header controls directing users to "Manage Rooms" and "Faculty Directory".
- **Testing Requirements**: Verify navigation links load correctly across all 7 pages.
- **Completion Criteria**: Zero orphaned HTML views.
- **Risks**: Modifying header layout may affect mobile navbar spacing if not checked with responsive breakpoints.

### Task 1.3: Footer Copyright & Version Synchronization
- **Category**: `Known Defect`
- **Objective**: Synchronize footer copyright strings across all HTML files to reflect `2025–2026 SchedX`.
- **Reason for Task**: Inconsistency between `package.json` (v2.0.0, 2026), reports (2026), and HTML footers ("© 2025 SchedX").
- **Relevant Existing Files**:
  - `public/index.html`
  - `public/generate.html`
  - `public/features.html`
  - `public/about.html`
  - `public/rooms.html`
  - `public/teacher-availability.html`
  - `public/teacher-info.html`
- **Dependencies**: None.
- **Expected Changes**: Update copyright text in the `.footer-bottom` section of each HTML view.
- **Completion Criteria**: Uniform copyright notice across all views.

---

## 4. Phase 2: Architectural Modularization

### Task 2.1: Controller & Service Extraction from `server.js`
- **Category**: `Recommended Improvement`
- **Objective**: Refactor monolithic `server.js` (5,630 lines) into clean modular files without changing any API contracts or algorithmic behavior.
- **Reason for Task**: Single-file maintainability is high-risk. Changes to UI routes or feedback proxy risk introducing unintended regressions into timetable generation logic.
- **Relevant Existing Files**:
  - `server.js`
  - New directories: `src/controllers/`, `src/services/`, `src/storage/`
- **Dependencies**: None. Native CommonJS modules.
- **Expected Changes**:
  - Extract `generateTimetableHandler` into `src/services/timetableSolver.js`.
  - Extract `detectTimetableConflicts` & `validateTimetableAssignment` into `src/services/conflictEngine.js`.
  - Extract `calculateTeacherWorkload` into `src/services/workloadService.js`.
  - Extract local store helpers (`loadTimetableLocally`, etc.) into `src/storage/jsonStore.js`.
  - Keep `server.js` as an Express route manifest (< 250 LOC).
- **Testing Requirements**: Run all 13 regression suites in `scripts/run-all-tests.js` before and after extraction. Diff outputs to guarantee identical JSON responses.
- **Completion Criteria**: 100% test pass rate with modular structure.
- **Risks**: Cyclic dependencies or scoping errors if state variables are extracted incorrectly.

### Task 2.2: Local Store Write-Through Synchronization
- **Category**: `Recommended Improvement`
- **Objective**: Build an asynchronous background sync worker that reconciles changes made in the local JSON store back to Supabase when network connectivity recovers.
- **Reason for Task**: When Supabase queries timeout (> 250ms), changes are saved to `data/timetable_store.json`. Currently, there is no automatic write-through mechanism to push local changes to Supabase once connection restores.
- **Relevant Existing Files**:
  - `server.js`
  - `config/supabase.js`
- **Dependencies**: `@supabase/supabase-js`.
- **Expected Changes**: Implement a retry queue for unsynced generations.
- **Completion Criteria**: Local changes automatically sync to Supabase upon successful `GET /api/health` heartbeat.
- **Risks**: Concurrent write conflicts if multiple instances update simultaneously.

---

## 5. Phase 3: Security & Access Control

### Task 3.1: User Authentication & Role-Based Access Control (RBAC)
- **Category**: `Recommended Improvement / Security Hardening`
- **Objective**: Integrate Supabase Auth or session-based JWT authentication with three institutional roles: `Admin`, `Faculty`, `Student`.
- **Reason for Task**: Currently, all endpoints are open without authentication. Anyone on the local network can delete or overwrite timetables.
- **Relevant Existing Files**:
  - `server.js`
  - `config/supabase.js`
  - `public/index.html`, `public/generate.html`
- **Dependencies**: `@supabase/supabase-js` Auth module or `jsonwebtoken`.
- **Expected Changes**:
  - Add auth middleware protecting `POST /api/generate`, `PUT /api/timetable`, and `DELETE /api/timetable`.
  - Allow public unauthenticated access only to `GET /api/timetable`, `GET /api/current-class`, and static landing pages.
- **Completion Criteria**: Unauthorized requests receive `HTTP 401 Unauthorized`.
- **Risks**: Breaking existing unauthenticated automation test scripts in `scripts/`. Requires updating test headers.

### Task 3.2: Supabase Row Level Security (RLS) Hardening
- **Category**: `Security Hardening`
- **Objective**: Replace permissive development RLS policies (`using (true) with check (true)`) with role-scoped institutional security rules.
- **Reason for Task**: Permissive policies allow any client possessing the anon key to modify database tables directly via PostgREST.
- **Relevant Existing Files**:
  - `database/supabase_schema.sql`
  - `supabase/schema.sql`
- **Dependencies**: Supabase Auth roles (`auth.uid()`, `auth.role()`).
- **Expected Changes**: Update SQL policies to permit writes only to `service_role` or authenticated administrators.
- **Completion Criteria**: Direct PostgREST anonymous writes are rejected.

---

## 6. Phase 4: Advanced Institutional Features

### Task 4.1: Direct Timetable Email Dispatch
- **Category**: `Optional Future Feature`
- **Objective**: Enable timetable coordinators to email official PDF schedules directly to faculty and student cohort lists.
- **Reason for Task**: Reduces manual distribution overhead after a semester timetable is finalized.
- **Relevant Existing Files**:
  - `server.js`
  - `utils/pdfGenerator.js`
  - `public/generate.html`
- **Dependencies**: Nodemailer or external transactional email API (SendGrid, Resend).
- **Expected Changes**: Add `POST /api/timetable/email-dispatch` and an "✉️ Email Schedule" button to the generator UI.
- **Completion Criteria**: Successfully sends attached PDF to designated recipient address.
- **Risks**: SMTP configuration requirements and spam filter false positives.

### Task 4.2: Extended Generation History Retention
- **Category**: `Optional Future Feature`
- **Objective**: Expand the history retention limit beyond `MAX_RETAINED_GENERATIONS = 2` with an interactive version browser.
- **Reason for Task**: Coordinators often need to compare schedules between Autumn and Spring terms or rollback multiple iterations.
- **Relevant Existing Files**:
  - `server.js` (line 25: `MAX_RETAINED_GENERATIONS = 2`)
  - `public/features.html`
- **Dependencies**: None.
- **Expected Changes**: Make the retention limit configurable via `.env` (`HISTORY_RETENTION_LIMIT=10`) and provide a history management drawer in the UI.
- **Completion Criteria**: Retains up to 10 versions without performance degradation.

---
&copy; 2025–2026 SchedX Technical Planning Team.
