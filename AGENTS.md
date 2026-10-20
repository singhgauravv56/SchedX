# AGENTS.md — AI Coding Agent Operational Directives & Rules

> **CRITICAL DIRECTIVE FOR ALL AI CODING AGENTS & COLLABORATIVE DEVELOPERS**  
> *Project: SchedX — Smart Timetable Generator | Version 2.0.0*  
> *Target Architecture: Vanilla HTML5/CSS3/JS Frontend + Node.js Express Backend + Supabase PostgreSQL & Local JSON Dual-Tier Persistence*

---

## ⚠️ Mandatory Pre-Flight Protocol

Before reading code, proposing changes, or generating file diffs, every AI coding agent operating in this repository **MUST** commit to the following mandatory workflow:

1. **Read Documentation First**: Read this document (`AGENTS.md`) and the relevant specification documents in [`docs/`](docs/) (especially [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/PRD.md`](docs/PRD.md), [`docs/DESIGN.md`](docs/DESIGN.md), and [`docs/API.md`](docs/API.md)) before undertaking any task.
2. **Inspect Before Modifying**: Never assume how an endpoint, function, or stylesheet is structured. Inspect the active source files (`server.js`, `public/script.js`, `public/style.css`, etc.) using read-only tools to verify actual behavior.
3. **Preserve Current Functionality**: SchedX is an active, production-grade project. Do not break working features to introduce new ones.

---

## 📜 The 20 Golden Rules for AI Agents in SchedX

### Rule 1: Mandatory Documentation Review
Every coding agent must consult `AGENTS.md` and related documents in `docs/` before initiating work. Understand the existing data structures, routing conventions, and constraints.

### Rule 2: Active Codebase Inspection
Inspect existing code and verify real-world implementation details before proposing modifications. Do not rely on speculative assumptions, stale notes, or standard library defaults that conflict with project patterns.

### Rule 3: Architectural Conformity
Adhere strictly to the documented project architecture:
- Backend: Express.js server in `server.js` with dual-tier data persistence (Supabase PostgreSQL + local JSON store fallback in `data/`).
- Frontend: Pure Vanilla HTML5/CSS3/JavaScript (ES6+) without modern UI frameworks (no React, Vue, Angular, or Tailwind).
- PDF Generation: Zero-dependency ISO 32000 PDF 1.4 vector generator in `utils/pdfGenerator.js`.

### Rule 4: Strict UI/UX & Design Preservation
Preserve the existing UI, colors, typography, layout, and visual style. The custom design system uses:
- Primary Navbar / Footer: Deep Teal `#1F4E5B`
- Primary Brand Accent: Royal Blue `#2d6cdf` / `#1d4ed8`
- Canvas: Clean White `#ffffff` with subtle 32px grid lines `rgba(15, 23, 42, 0.04)`
- Typography: Google Fonts (`Plus Jakarta Sans`, `Inter`, `Comfortaa`, `Fredoka`)
- Page-specific themes (e.g., the Vintage Diary theme in `public/teacher-availability.html`) must **never** be replaced with generic flat designs.

### Rule 5: Scope Discipline & Minimal Intervention
Make only the changes explicitly required by the approved user prompt or task specification. Avoid collateral modifications to unrelated functions, pages, or files.

### Rule 6: Component & Utility Reuse
Always reuse existing utilities, endpoints, and frontend helpers instead of rewriting parallel logic.
- Time conversion: Use `timeToMinutes()`, `minutesToTime()`, `normalizeTime24()`, and `formatTime12()`.
- API calls: Use `apiRequest()` in `public/script.js`.
- Conflict checking: Leverage `detectTimetableConflicts()` and `validateTimetableAssignment()` in `server.js`.
- File storage: Leverage `loadTimetableLocally()`, `saveTimetableLocally()`, and `loadTimetableHistory()`.

### Rule 7: Zero Unnecessary Dependencies
Do not introduce third-party npm packages, CSS frameworks, or heavy client libraries unless explicitly commanded by the user. SchedX achieves high performance, portability, and zero-build simplicity precisely because it avoids bloated dependency trees.

### Rule 8: Preserve Working Code
Never delete, truncate, or overwrite functional modules. Preserve all existing comments, docstrings, edge-case handlers, and fallback mechanisms that are unrelated to your assigned task.

### Rule 9: Absolute Secrets Isolation
Never expose, print, log, copy, or write secrets (e.g., `SUPABASE_SECRET_KEY`, database passwords, service role tokens, API keys) into frontend code, documentation files, console outputs, or git commits.

### Rule 10: Zero Hardcoded Credentials
Never hardcode environment configurations or credentials into JavaScript, HTML, or configuration files. Always load sensitive parameters from `process.env` using `dotenv`.

### Rule 11: Respect Database Constraints & Relations
Respect both PostgreSQL database constraints and local schema rules:
- 3-Way Conflict Constraints: `uq_day_time_teacher`, `uq_day_time_section`, `uq_day_time_room`.
- Relational integrity: Teacher-Subject assignment rules, room capacities, and valid room types (`Classroom` vs `Laboratory`).

### Rule 12: Non-Destructive Database Operations
Avoid destructive SQL executions (`DROP TABLE`, `TRUNCATE`, unindexed cascade deletions). Any proposed migration must preserve existing records or provide safe fallback defaults.

### Rule 13: Mandatory Test Coverage
Whenever an algorithm, endpoint, or calculation rule is modified, execute or add relevant test scripts in `scripts/`. Verify that existing suites in `scripts/run-all-tests.js` do not regress.

### Rule 14: Rigorous Regression Auditing
Before finishing a task, verify that changes do not degrade related functionality. Check:
- Generator 10-step wizard flow
- Break calculation & 8-period templates
- Timetable display, filtering, inline row editing, and cell editing modal
- PDF download output
- Faculty workload recalculation

### Rule 15: Explicit Changed File Reporting
In every task report, provide a clear, bulleted inventory of every file created, modified, or deleted, explaining the technical rationale for each modification.

### Rule 16: Fact-Based Test Reporting
Only report tests that were **actually executed**. Explicitly report the exact command run, the exit code, and the output summary. Never state that a test passed when it was only visually reviewed or skipped.

### Rule 17: Transparent Assumptions & Unresolved Gaps
Clearly document any technical assumptions, limitations, or remaining unverified items. If an edge case cannot be verified without external infrastructure, declare it as `UNVERIFIED`.

### Rule 18: Never Fabricate Verification
Never claim a feature is "verified" or "tested" based solely on the existence of its code. If a test fails due to environment dependencies (e.g., an inactive server or missing live Supabase instance), report the exact error truthfully.

### Rule 19: Strict Version Control Safety
**NEVER** automatically execute destructive git commands such as:
- `git reset --hard`
- `git clean -fd`
- `git push --force`
**NEVER** commit or push changes to GitHub automatically unless the user explicitly requests a commit with a specific message. Do NOT trigger `scripts/auto-sync.js` without explicit user instruction.

### Rule 20: Halt & Escalate on Ambiguity or Conflict
If documentation conflicts with actual code, or if an implementation defect requires a breaking architectural change:
1. **Stop immediately.**
2. Report the conflict with file names and line numbers.
3. Present solution options to the user.
4. Await user confirmation before modifying application code or schemas.

---

## 🔍 Codebase Conventions & Landmarks

| Area | Landmark File | Key Implementation Conventions |
|---|---|---|
| **Backend & Routes** | `server.js` | Monolithic Express app. All routes use `/api/` prefix. Wrap Supabase calls in `withTimeout(promise, ms)` and fall back to `data/*.json`. |
| **Frontend State & UI** | `public/script.js` | Vanilla JS controller. State variables held at top of file. Renders day cards, period slots, inline editing buttons, and modals. |
| **Styling & Tokens** | `public/style.css` | All colors, shadows, typography, and spacing defined as CSS custom properties in `:root`. Never use ad-hoc inline hex codes. |
| **Database Schemas** | `database/supabase_schema.sql` & `supabase/schema.sql` | Relational PostgreSQL definitions. Foreign keys and unique 3-way conflict indices. |
| **Local Store Files** | `data/*.json` | Synchronous / asynchronous JSON disk access. Must preserve formatting with `JSON.stringify(data, null, 2)`. |
| **Vector PDF Engine** | `utils/pdfGenerator.js` | Direct PDF 1.4 binary buffer construction. Modifying this file requires strict adherence to ISO 32000 stream specifications. |

---

## 🚦 Status Classification Standard

When documenting or reporting codebase findings, always use the canonical classification tags:

- `CONFIRMED`: Directly evidenced by active code, configurations, or passing automated tests.
- `PARTIALLY IMPLEMENTED`: Code exists and performs part of the intended behavior, but has gaps, edge-case failures, or incomplete UI integration.
- `NOT FOUND`: No implementation exists in the current repository.
- `UNVERIFIED`: Insufficient evidence or testing to confirm real-world runtime behavior (e.g., requires live external credentials or browser interaction).
- `PLANNED`: Feature is designed or scheduled for future development phases.

---
&copy; 2025–2026 SchedX Engineering Team.
