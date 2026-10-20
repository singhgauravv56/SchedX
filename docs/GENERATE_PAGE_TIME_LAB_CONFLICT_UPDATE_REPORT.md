# SchedX — Generate Page Time Display, Multi-Day/Section Lab, and Warning-Based Conflict Update Report

**Project:** SchedX – Smart Timetable Generator  
**Feature:** Generate Page Overhaul (Time Display, Multi-Day Labs, Multi-Section Labs, Warning-Based Conflict Resolution, Manual Correction, and Room Requirement Box Removal)  
**Date:** October 12, 2026  
**Status:** Completed & Validated (All 12 Automated & Manual Verification Tests Passed)

---

## 1. Summary of Changes

A comprehensive architectural and user experience upgrade was applied to the SchedX **Generate Page** (`/generate`) and the backend timetable generation engine (`server.js`):

1. **Precise 12-Hour AM/PM Time Display & Arithmetic:**
   - Switched from hour-only representations to complete `HH:MM AM/PM` formats (e.g. `09:15 AM`, `10:05 AM`, `12:30 PM`).
   - Integrated live minute calculations and strict interval math (`Math.max(startA, startB) < Math.min(endA, endB)`).
   - Enforced boundary checks ensuring all configured periods, breaks, and labs fall strictly within working hours without unintentional overlaps.

2. **Multiple Days for Lab Classes:**
   - Replaced single-day dropdown with responsive multi-select day chips (`[Monday]`, `[Tuesday]`, `[Wednesday]`, etc.).
   - Added user-selectable scheduling behavior:
     - **Mode 1 (`every`):** Schedule a distinct lab session on *every* selected day.
     - **Mode 2 (`single`):** Schedule the lab session on *one suitable* selected day among the choices.

3. **Multiple Sections for Lab Classes:**
   - Replaced single-section dropdown with responsive multi-select section chips (`[CSE-A]`, `[CSE-B]`, etc.).
   - Added scheduling mode controls:
     - **Option 1 (`separate`):** Schedule independent, conflict-free lab sessions for each section.
     - **Option 2 (`shared`):** Schedule a combined cohort lab session attended jointly by all selected sections.

4. **Two-Stage Warning-Based Conflict Handling:**
   - Upgraded solver logic so constraint collisions no longer cause total generation failure (HTTP 409).
   - **Stage 1:** Backtracking places as many valid classes as possible; unplaceable classes are assigned provisionally with `has_conflict: true` or recorded as unscheduled.
   - **Stage 2:** Conflicting assignments and overlapping resource sessions are visually highlighted in warning red (`.timetable-row--conflict`), accompanied by a dedicated **Generation Summary Card**, **Scheduling Conflict Warning Panel** (with jump-to-row navigation), and **Unscheduled Classes Card**.

5. **Manual Conflict Correction & Live Revalidation:**
   - Users can click **✎ Edit** directly on any timetable row to modify subject, teacher, section, day, period, or room.
   - Submissions to `PUT /api/timetable/entry/:id` perform exhaustive multi-resource revalidation:
     - If the change resolves the conflict, the red warning is cleared and status transitions to `VALID`.
     - If the change introduces another conflict, warning highlights are recalculated immediately.

6. **Three-Tier Status Differentiation:**
   - **Outcome A (VALID):** *"Timetable generated successfully."*
   - **Outcome B (WARNING):** *"Timetable generated with warnings. Please review the highlighted conflicts."*
   - **Outcome C (INCOMPLETE):** *"Timetable generated partially. Some classes could not be scheduled."*

7. **Room Requirement Box Removal:**
   - Removed Step 09 "ROOM REQUIREMENT" card and select dropdown from the Generate page.
   - Renumbered Step 10 to 09 ("WORKING DAYS / SCHEDULE SETTINGS") and Step 11 to 10 ("GENERATE TIMETABLE").
   - Removed obsolete mandatory room validation; backend provides fallback rooms so timetable generation is never blocked if room inputs are absent. Preserved standalone `/rooms` management intact.

---

## 2. Files Modified

| File | Type | Description |
|---|---|---|
| [public/generate.html](file:///c:/Users/acer/Downloads/SchedX/public/generate.html) | HTML | Removed Step 09 Room Requirement card; renumbered steps; added live 12-hour AM/PM previews; added Summary Card, Conflict Warning Panel, and Unscheduled Classes Card. |
| [public/style.css](file:///c:/Users/acer/Downloads/SchedX/public/style.css) | CSS | Added styles for `.period-row-item`, `.period-12hr-preview`, `.chip-pill`, `.chip-pill.active`, `.scheduling-mode-row`, `.timetable-summary-card`, `.summary-metrics-grid`, `.timetable-legend-row`, `.timetable-conflict-panel`, `.timetable-row--conflict`, `.conflict-row-badge`, `.entry-conflict-explanation`, `.unscheduled-classes-card`, and `.row-highlight-pulse`. |
| [public/script.js](file:///c:/Users/acer/Downloads/SchedX/public/script.js) | JS | Added `formatTime12`, minute interval validation, multi-day/section lab chips and radio modes, conflict row styling, `renderTimetableSummaryAndConflicts`, 3-tier status handling, and edit revalidation sync. |
| [server.js](file:///c:/Users/acer/Downloads/SchedX/server.js) | JS (Backend) | Upgraded `timeToMinutes` and `formatTime12`; implemented `detectTimetableConflicts`; expanded lab multi-day and multi-section atomic session generation; added best-effort provisional placement and unscheduled class logging; updated PUT `/api/timetable/entry` to re-run conflicts and return 3-tier status. |
| [scripts/test-generate-enhancements.js](file:///c:/Users/acer/Downloads/SchedX/scripts/test-generate-enhancements.js) | Test Script | Automated test suite validating Tests 1 through 12 against the live server. |

---

## 3. Time-Formatting Changes

- **12-Hour Conversion Helper:**
  ```javascript
  function formatTime12(timeValue) {
    if (!timeValue) return '';
    const totalMinutes = typeof timeValue === 'number' ? timeValue : timeToMinutes(timeValue);
    const hours24 = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const meridian = hours24 >= 12 ? 'PM' : 'AM';
    let hours12 = hours24 % 12;
    if (hours12 === 0) hours12 = 12;
    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${meridian}`;
  }
  ```
- **Live Previews in UI:**
  - Working Hours: `#startTime12Preview` and `#endTime12Preview` update in real-time as users change hours or minutes.
  - Periods: Each day period input displays an inline `.period-12hr-preview` pill showing `09:15 AM – 10:05 AM`.
- **Exact Interval Preservation:**
  - Period start and end times configured with precise minutes (e.g., `09:15` to `10:05`) are saved as `09:15:00` to `10:05:00` and formatted in the generated timetable as `09:15 AM – 10:05 AM`.
- **Validation:**
  - Strict interval validation prevents end times earlier than or equal to start times.
  - Periods are verified to fall within working hours and cannot overlap with each other on the same day.

---

## 4. Multiple-Day Lab Implementation

- **UI Multi-Select Chips:**
  - Dynamic working days chips rendered via `.chip-pill` with `data-lab-day-toggle`.
  - Accessible keyboard navigation and toggle states (`active`, `aria-pressed`).
- **Scheduling Modes:**
  - **Mode 1 (`every`):** Creates an independent lab session for each selected day in the array.
  - **Mode 2 (`single`):** Sets `candidateDays` to all selected days, allowing the solver to place the session on the single most optimal day.
- **Persistence:**
  - Lab days and mode are persisted in active generation metadata and reloaded upon department opening.

---

## 5. Multiple-Section Lab Implementation

- **UI Multi-Select Chips:**
  - Section chips rendered with `data-lab-sec-toggle`.
- **Scheduling Modes:**
  - **Option 1 (`separate`):** Breaks the lab definition into atomic single-section sessions (`sectionsList: [sec]`), ensuring each cohort gets its own dedicated session.
  - **Option 2 (`shared`):** Combines selected cohorts into a joint session (`section: "CSE-A & CSE-B"`, `sectionsList: ['CSE-A', 'CSE-B']`), checking simultaneous section and teacher availability.
- **Conflict Prevention:**
  - `setSlotsOccupied` locks every cohort in `sectionsList` across all duration periods to eliminate double-booking.

---

## 6. Conflict-Warning Implementation (Two-Stage Workflow)

- **Stage 1 (Provisional Generation):**
  - The backtracking algorithm attempts conflict-free placement.
  - If a resource collision occurs that cannot be avoided, rather than throwing HTTP 409, the session is provisionally placed with `has_conflict: true` or logged to `unscheduledClasses`.
- **Stage 2 (Visual Warnings & Summary):**
  - **Timetable Generation Summary Card:** Displays Total Required Classes, Successfully Scheduled Classes, Classes Requiring Attention, and Detected Conflicts alongside a clear color legend:
    - Red (`#fee2e2` / `#991b1b`): Scheduling conflict
    - Blue/Green (`#eff6ff` / `#ecfdf5`): Valid assignment
    - Gray (`#f8fafc`): Free period
    - Amber (`#fef3c7`): Break / Unscheduled
  - **Conflict Warning Panel:** Itemizes each conflict with day, time slot, affected sections/teachers, and a "🔍 View in Timetable" button that scrolls the offending row into view and triggers a highlight pulse animation (`.row-highlight-pulse`).
  - **Row & Cell Highlighting:** Rows flagged with conflicts receive `.timetable-row--conflict`, `<span class="conflict-row-badge">⚠️ CONFLICT</span>`, and an inline explanation banner.

---

## 7. Manual Timetable Editing Changes

- **Modal Controls:**
  - Users can edit Day, Time Slot (displayed as 12-hour AM/PM), Section, Subject, Teacher, and Room.
- **Endpoint `PUT /api/timetable/entry/:id`:**
  - Saves the edited assignment to persistent storage.
  - Executes `detectTimetableConflicts` across the entire schedule using true interval overlap math:
    `Math.max(startA, startB) < Math.min(endA, endB)`
  - Recalculates `has_conflict` flags on all entries.
  - If the edit resolves the conflict, the warning badge and red highlight are automatically removed.
  - If a new conflict is introduced, it is immediately highlighted with an updated warning.

---

## 8. Room Requirement Removal

- **UI Cleanup:**
  - Deleted the Step 09 "ROOM REQUIREMENT" container from `public/generate.html`.
  - Renumbered Step 10 ("WORKING DAYS / SCHEDULE SETTINGS") to 09.
  - Renumbered Step 11 ("GENERATE TIMETABLE") to 10.
- **Validation Cleanup:**
  - Removed mandatory checks requiring `document.getElementById('roomType').value`.
  - `roomTypePreference` defaults safely to `'Both'`.
- **Backend Defaults:**
  - `server.js` automatically provisions fallback classroom and laboratory spaces if none are specified in the request, guaranteeing timetable generation never crashes due to missing room inputs.
  - Existing `/rooms` page remains intact for dedicated campus management.

---

## 9. Database & Schema Considerations

- **Storage Compatibility:**
  - Both Supabase PostgreSQL cloud tables and local JSON fallback stores (`data/timetable.json`, `data/history.json`) seamlessly support the expanded schema fields:
    - `has_conflict` (boolean)
    - `conflict_details` (array of strings)
    - `session_type` (`LAB` | `THEORY`)
    - `duration` (integer)
    - `is_shared` (boolean)
    - `sections_list` (array of strings)
- **Zero Schema Breaking Changes:**
  - Backward compatibility with pre-existing saved timetables is 100% maintained.

---

## 10. Tests Performed & Results

The automated test script `scripts/test-generate-enhancements.js` executed all 12 required scenarios against the live SchedX server (`http://localhost:3000`):

| Test # | Test Name | Scenario Verified | Result |
|---|---|---|---|
| **TEST 1** | Precise Timing | Configured period 09:15 AM to 10:05 AM; confirmed exact times saved and formatted. | **PASS** |
| **TEST 2** | Multiple Lab Days | Configured Monday & Wednesday in `every` mode; confirmed sessions on both days. | **PASS** |
| **TEST 3** | Multiple Lab Sections | Configured CSE-A & CSE-B in `separate` mode; confirmed independent sessions. | **PASS** |
| **TEST 4** | Shared Section Behavior | Configured CSE-A & CSE-B in `shared` mode; confirmed combined session created. | **PASS** |
| **TEST 5** | Same-Section Conflict | Scheduled 2 classes for CSE-A at 10:00 AM; confirmed both flagged in red warning. | **PASS** |
| **TEST 6** | Teacher Overlap Conflict | Scheduled overlapping teacher classes (09:00–10:00 vs 09:30–10:30); confirmed warning. | **PASS** |
| **TEST 7** | Partial Generation | Configured overloaded demand; confirmed provisional generation + unscheduled log without 409. | **PASS** |
| **TEST 8** | Manual Conflict Correction | Moved conflicting class to free period via PUT; confirmed warning removed, status = VALID. | **PASS** |
| **TEST 9** | Clean Regeneration | Regenerated schedule twice; confirmed no duplicate entries created. | **PASS** |
| **TEST 10** | Room Box Removal | Verified Step 09 absence in HTML; verified generation succeeds without room input. | **PASS** |
| **TEST 11** | Persistence & Reload | Re-fetched timetable and active metadata; confirmed saved states and conflict flags restored. | **PASS** |
| **TEST 12** | Regression Testing | Verified health of `/api/departments`, `/api/breaks`, `/api/timetable/workload`, `/api/timetable/metadata`. | **PASS** |

**Summary Result:** **12 PASSED, 0 FAILED** (100% Pass Rate).

---

## 11. Known Limitations

- **Simultaneous Shared Lab Capacity:** Shared sessions attend the same room simultaneously; if a cohort exceeds standard laboratory room capacity (e.g. >40 students), a split lab configuration is recommended.
- **Very Short Period Intervals:** The generator supports down to 1-minute resolution, but realistic academic timetables typically use intervals between 30 and 120 minutes.

---

## 12. Resolved & Unresolved Issues

- **Resolved:**
  - Incomplete hour-only time display completely eliminated in favor of full 12-hour AM/PM formats.
  - Multi-day and multi-section lab class configuration fully functional with explicit mode choices.
  - Fatal 409 generator aborts replaced with two-stage provisional generation, warning cards, and unscheduled class reporting.
  - Manual conflict editing with instant revalidation fully operational.
  - Obsolete Room Requirement box cleanly removed without orphaned gaps or broken handlers.
- **Unresolved Issues:** None. All acceptance criteria and edge cases have been satisfied and verified.
