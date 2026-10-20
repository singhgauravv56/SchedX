# Testing Strategy, Test Plan & Verification Matrix — SchedX

> **Document Version**: 2.0.0  
> **Status**: Comprehensive Test Audit & Execution Plan  
> **Target Audience**: QA Engineers, Automation Developers, System Architects, AI Coding Agents  
> **Related Documents**: [ARCHITECTURE.md](ARCHITECTURE.md) | [PRD.md](PRD.md) | [API.md](API.md)

---

## 1. Testing Framework & Methodology

SchedX does not rely on third-party test assertion frameworks (such as Jest, Mocha, or Vitest) to avoid dependency bloat. Instead, testing is executed through:
1. **Automated Node.js Test Harnesses**: Native Node.js test scripts in `scripts/` using Node's built-in `assert` and `http` modules.
2. **Master Test Runner**: `scripts/run-all-tests.js` orchestrates 13 major regression and audit test suites using `child_process.execSync`.
3. **Chrome DevTools Protocol (CDP) E2E Automation**: Specialized scripts (e.g. `scripts/test-e2e-generate-flow.js`) automate headless Chromium instances via WebSocket connections to validate DOM mutations, button clicks, and visual rendering.
4. **Syntax & Static Verification**: `npm run build` runs `node --check server.js` to ensure zero compilation or syntax errors.

---

## 2. Test Execution Prerequisites

> [!IMPORTANT]
> **Server Dependency Notice**: The majority of automated integration test suites make real HTTP requests to `http://localhost:3000`. Therefore, the SchedX Express server **MUST be running** in a separate terminal before executing integration test suites:
> ```bash
> # Terminal 1: Start the server
> npm start
>
> # Terminal 2: Run the test suites
> node scripts/run-all-tests.js
> ```

---

## 3. Comprehensive Feature Verification Matrix

Below is the verified status of all system capabilities across automated tests, manual inspections, and runtime checks.

### Legend:
- `Existing automated test`: Covered by a runnable script in `scripts/`.
- `Manually verified`: Code inspected, verified by static analysis or manual execution.
- `Not yet tested`: Implementation exists but automated test execution requires external live infrastructure.
- `Not applicable`: Feature not part of current architecture.

| Test ID | Test Category & Scenario | Verification Method | Status in Current Codebase | Detailed Evidence / Script Path |
|---|---|---|---|---|
| **TST-01** | **Application Startup & Syntax** | Static execution check | `Existing automated test` | `node --check server.js` exits with code 0. `diagnose.js` verifies env vars. |
| **TST-02** | **Frontend Markup & Element Bindings** | HTML DOM parsing | `Existing automated test` | `node scripts/verify-generate-ui.js` passes. Verifies all 10 step cards and IDs. |
| **TST-03** | **Department Missing Validation** | HTTP POST validation | `Existing automated test` | `scripts/test-department-room-lab.js` verifies HTTP 400 on empty department. |
| **TST-04** | **Department Auto-Registration** | Disk store validation | `Existing automated test` | `scripts/test-department-room-lab.js` confirms new department saves to `departments.json`. |
| **TST-05** | **Teacher Unique Names Validation** | Solver input audit | `Existing automated test` | `scripts/test-generate-audit-suite.js` (Test 1) verifies HTTP 400 on duplicate teacher names. |
| **TST-06** | **Teacher Subject Qualification** | Subject matching check | `Existing automated test` | `scripts/test-teacher-subject-edit.js` confirms teacher only assigned qualified subjects. |
| **TST-07** | **Teacher NA (No Preference) Rule** | Constraint validation | `Existing automated test` | `scripts/test-generate-audit-suite.js` (Test 11) confirms NA cannot be mixed with subjects. |
| **TST-08** | **Subject Formula: Max = Teachers + 2** | Formula boundary check | `Existing automated test` | `scripts/test-generate-audit-suite.js` (Test 4) verifies error when subjects > teachers + 2. |
| **TST-09** | **Class / Section Independence** | Solver cohort isolation | `Existing automated test` | `scripts/test-weekly-timetable.js` verifies sections CSE-A and CSE-B receive distinct slots. |
| **TST-10** | **Room Type Validation (Classroom vs Lab)**| Type check enforcement | `Existing automated test` | `scripts/test-department-room-lab.js` confirms non-standard room types rejected. |
| **TST-11** | **Laboratory Requirement Enforcement** | Resource availability | `Existing automated test` | `scripts/test-department-room-lab.js` confirms lab classes fail if 0 lab rooms exist. |
| **TST-12** | **Day-Specific Period Allocation** | Math & period slicing | `Existing automated test` | `scripts/test-flexible-daily-scheduling.js` passes. 16-point flexible daily scheduling suite. |
| **TST-13** | **8-Period Daily Classes Template** | Preset auto-fill test | `Existing automated test` | `scripts/test-8-period-generation.js` verifies 4-break-4 period allocation. |
| **TST-14** | **Period Copy Panel Tool** | UI & replication logic | `Existing automated test` | `scripts/verify-generate-ui.js` verifies period copy Mode A & Mode B controls. |
| **TST-15** | **Break Management & Period Recalculation**| Period boundary slicing | `Existing automated test` | `scripts/test-breaks-and-workload.js` confirms teaching slots recalculate around breaks. |
| **TST-16** | **Break Copy Panel Tool** | Break replication check | `Existing automated test` | `scripts/verify-generate-ui.js` verifies break copy Mode A & Mode B controls. |
| **TST-17** | **Multi-Day & Multi-Section Labs** | Practical scheduling | `Existing automated test` | `scripts/test-multi-subject-and-labs.js` confirms shared vs separate lab sessions. |
| **TST-18** | **Lab Time Auto Period Matching** | Time-to-slot matching | `Existing automated test` | `scripts/test-lab-time-auto-matching.js` confirms start/end minute alignment. |
| **TST-19** | **Teacher Conflict Prevention** | Solver collision guard | `Existing automated test` | `scripts/test-generate-audit-suite.js` (Test 2) verifies 0 teacher overlaps. |
| **TST-20** | **Section Conflict Prevention** | Solver collision guard | `Existing automated test` | `scripts/test-generate-audit-suite.js` (Test 3) verifies 0 section overlaps. |
| **TST-21** | **Room Conflict Prevention** | Solver collision guard | `Existing automated test` | `scripts/test-generate-audit-suite.js` (Test 5) verifies 0 room overlaps. |
| **TST-22** | **Cross-Department Conflict Check** | Multi-dept filtering | `Existing automated test` | `server.js` lines 4308–4323; verified in `test-generate-enhancements.js`. |
| **TST-23** | **Interactive Edit Mode Toggle** | UI State toggle | `Existing automated test` | `scripts/diagnose-edit-button.js` confirms Edit button toggles `edit-mode-badge`. |
| **TST-24** | **Inline Row Edit (All 14 Scenarios)** | Row edit interaction | `Existing automated test` | `scripts/test-all-14-row-edit-scenarios.js` passes all 14 inline editing cases. |
| **TST-25** | **Cell Edit Modal & Live Validation** | Validation API test | `Existing automated test` | `scripts/test-interactive-editor-workflow.js` tests `POST /api/timetable/validate-entry`. |
| **TST-26** | **Single Entry Delete & Workload Recalc**| Entry deletion & recalc | `Existing automated test` | `server.js` lines 4922–4966; verified in `test-summary-and-editing-suite.js`. |
| **TST-27** | **Teacher Workload Quota Calculation** | Workload math check | `Existing automated test` | `scripts/test-breaks-and-workload.js` tests lecture totals, off-days, and load %. |
| **TST-28** | **Vector PDF Generation Output** | ISO 32000 binary check | `Existing automated test` | `scripts/test-storage-pdf-workflow.js` verifies valid `%PDF-1.4` binary stream. |
| **TST-29** | **Storage Version Retention (Max 2)** | History FIFO rotation | `Existing automated test` | `scripts/test-storage-retention.js` confirms history capped at 2 versions. |
| **TST-30** | **Live Current Class Tracking** | Clock-time active slot | `Manually verified` | `server.js` lines 5275–5325; returns ongoing lectures matching clock time. |
| **TST-31** | **Interactive Calendar To-Do Planner** | CRUD on todos.json | `Existing automated test` | `scripts/test-schedx-todo.js` tests GET, POST, PUT, DELETE `/api/todos`. |
| **TST-32** | **Formspark Feedback Proxy Submission** | External HTTP proxy | `Existing automated test` | `scripts/test-feedback-integration.js` tests `/api/feedback` validation. |
| **TST-33** | **Dual-Tier Database Fallback (Timeout)**| Fault-tolerance test | `Manually verified` | `server.js` `withTimeout()` falls back to `data/*.json` on connection drop. |
| **TST-34** | **Responsive Layout Across Viewports** | CSS Breakpoint audit | `Existing automated test` | `scripts/verify-responsive-grid-and-boxes.js` parses responsive media queries. |
| **TST-35** | **User Role-Based Access Control** | Authentication check | `Not applicable` | Authentication is currently NOT FOUND in codebase. |

---

## 4. Master Regression Runner (`scripts/run-all-tests.js`)

The master test runner consolidates the 13 foundational suites:

```javascript
const suites = [
  ['Frontend UI Elements & Bindings', 'node scripts/verify-generate-ui.js'],
  ['Audit Test Suite (Tests 1–13)', 'node scripts/test-generate-audit-suite.js'],
  ['Generate Enhancements Verification', 'node scripts/test-generate-enhancements.js'],
  ['Department, Room & Lab Verification', 'node scripts/test-department-room-lab.js'],
  ['Break Management & Workload Verification', 'node scripts/test-breaks-and-workload.js'],
  ['Multi-Subject & Lab Classes Suite', 'node scripts/test-multi-subject-and-labs.js'],
  ['Weekly Day-Wise Timetable Suite', 'node scripts/test-weekly-timetable.js'],
  ['Storage Retention Verification', 'node scripts/test-storage-retention.js'],
  ['Advanced Feature Matrix', 'node scripts/test-advanced-feature-matrix.js'],
  ['Lab Period Boundary & Afternoon Scheduling Suite', 'node scripts/test-lab-period-fix.js'],
  ['Lab Time Auto Period Matching & Validation Suite', 'node scripts/test-lab-time-auto-matching.js'],
  ['16-Point Flexible Daily Scheduling Suite', 'node scripts/test-flexible-daily-scheduling.js'],
  ['E2E Browser Generate Timetable Flow', 'node scripts/test-e2e-generate-flow.js']
];
```

### Execution Protocol
1. Launch SchedX server: `node server.js`
2. Run master runner: `node scripts/run-all-tests.js`
3. Verify output reports: `TOTAL SUITES: 13 | PASSED: 13 | FAILED: 0`.

---

## 5. Practical Manual Verification Checklist

For manual QA before releasing updates:

- [ ] **Startup**: Run `node server.js` and observe clean startup on port 3000.
- [ ] **Navigation**: Click through all top navbar links (Home, Generate, Features, About Us).
- [ ] **8-Period Template**: Navigate to `/generate`, click `⚡ Load 8-Period Example`, and verify all 10 steps auto-populate.
- [ ] **Generate**: Click `GENERATE TIMETABLE`, verify loading spinner animates, and verify timetable appears within 2 seconds.
- [ ] **Conflict Badge**: Inspect timetable header to confirm `VALID (0 Conflicts)` badge displays in green.
- [ ] **Workload Table**: Scroll to Faculty Workload section; verify total lecture counts match scheduled entries.
- [ ] **Interactive Edit**: Click `✎ Edit`; click `Edit` on any class row; select an alternate teacher; save; verify workload recomputes.
- [ ] **PDF Export**: Click `📥 Download PDF`; open downloaded file in Chrome/Adobe; verify landscape layout, clean borders, and text readability.
- [ ] **To-Do Planner**: Scroll to bottom of `/generate`; add a test task; toggle completion checkbox; verify persistence across reload.
- [ ] **Feedback Modal**: Click `Feedback` in footer; verify modal opens; type test text; submit; verify success toast.

---
&copy; 2025–2026 SchedX QA & Engineering Team.
