# SchedX — Lab Time Auto Period Matching & Validation Fix Report

**Project**: SchedX – Smart Timetable Generator  
**Report Date**: October 2026  
**Status**: Completed & Verified  

---

## 1. Executive Summary

This report documents the investigation, root-cause diagnosis, full architectural correction, and test verification for the SchedX Lab Classes time validation and automatic period-allocation logic.

### Original Error Reported
```
"Selected time (04:30 AM – 05:30 AM) is outside configured periods for:
Monday (09:00 AM – 05:30 AM, 9 periods).
Please adjust lab hours or add periods to that day in Step 06."
```

### Key Enhancements Delivered
1. **Unified 24-Hour Time Engine**: Both frontend (`public/script.js`) and backend (`server.js`) now use numeric integer minutes from midnight internally, parsing and formatting `HH:MM:SS`, `HH:MM`, and `AM/PM` meridians consistently without string-based comparison errors.
2. **Automatic Lab-to-Period Allocation**: Selecting lab start and end times dynamically calculates and maps all occupied periods (e.g., `[P2] [P3]`) in both the UI and backend timetable generation engine, eliminating the need to re-configure timings in Step 06.
3. **Robust Interval Overlap `[start, end)`**: Intervals are compared via mathematical overlap condition `max(startA, startB) < min(endA, endB)`. Adjacent intervals (e.g. 10:00–11:00 and 11:00–12:00) strictly do not overlap.
4. **Coverage & Conflict Verification**: Verifies full period coverage, detects break intersections, identifies intra-period gaps, and surfaces explicit conflict messages (teacher, room, section, break) rather than generic failures.
5. **Zero Inverted Interval Display**: Explicit validation prevents end time from preceding start time (`${day}'s configured end time must be later than its start time`).

---

## 2. Root Cause Analysis

### 2.1 The Working-Day Display Anomaly (`09:00 AM – 05:30 AM`)
- **Origin**: In HTML time inputs (`<input type="time">`), selecting `05:30` without explicitly toggling `PM` yields `"05:30"`.
- **Parsing Bug**: The previous regular expression `/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i` parsed `"05:30"` as `hours = 5, minutes = 30` (330 minutes from midnight).
- **Inverted Ordering**: With working start time at `09:00` (540 minutes from midnight), the day's interval was calculated as `[540, 330)`. Because `330 < 540`, the end time was 3.5 hours earlier than the start time.
- **Silent Display**: The previous display formatter formatted `330` min as `05:30 AM`, printing `Monday (09:00 AM – 05:30 AM)`.
- **Resolution**:
  - Replaced ad-hoc regex with robust 12-hour AM/PM and 24-hour parsers.
  - Implemented strict boundary check: if `dayEndMin <= dayStartMin`, the system displays a clear validation error (`"Monday's configured end time must be later than its start time."`) instead of silently accepting or inverting the span.

### 2.2 The Lab Time Rejection (`04:30 AM – 05:30 AM`)
- **Origin**: When `04:30` and `05:30` were entered (intended for 4:30 PM – 5:30 PM), they evaluated to `270` and `330` minutes from midnight (AM).
- **Validation Failure**: The timetable periods were configured starting at `09:00` (540 min). Because `270 < 540`, the interval was rejected as outside the timetable window.
- **Resolution**:
  - The UI and backend now normalize time values to 24-hour `HH:MM:00` representations.
  - Time inputs accept both 24-hour values (`16:30` – `17:30`) and 12-hour AM/PM representations (`04:30 PM` – `05:30 PM`).

---

## 3. Files Modified

| File | Changes Made |
| :--- | :--- |
| [`public/script.js`](file:///c:/Users/acer/Downloads/SchedX/public/script.js) | Updated `timeToMinutes`, `minutesToTime`, `normalizeTime24`, and `formatTime12`; implemented client-side `matchLabToDayPeriods`; updated `renderLabClassFields` with automatic matched periods card and status pills; wired dynamic re-calculation on input change in `handleLabTimeUpdate`; added inverted day interval validation. |
| [`server.js`](file:///c:/Users/acer/Downloads/SchedX/server.js) | Synchronized `timeToMinutes`, `normalizeTime24`, `formatTime12`, and `buildTimeSlots`; implemented backend `matchLabToDayPeriods`; integrated period matching and complete coverage validation in `POST /api/generate`; enriched resource collision checks (teacher, room, section) with specific interval messaging; guarded server startup with `require.main === module`. |
| [`public/style.css`](file:///c:/Users/acer/Downloads/SchedX/public/style.css) | Added styles for `.lab-auto-allocation-card`, `.lab-auto-allocation-header`, `.period-match-pill`, `.pill-num`, `.pill-time`, `.status-ok`, `.status-error`, and `.lab-time-summary-pill`. |
| [`scripts/test-lab-time-auto-matching.js`](file:///c:/Users/acer/Downloads/SchedX/scripts/test-lab-time-auto-matching.js) | Created automated test suite covering all 10 test requirements from Section 10 of the specification. |
| [`scripts/run-all-tests.js`](file:///c:/Users/acer/Downloads/SchedX/scripts/run-all-tests.js) | Added the new lab matching suite to the master test runner (11 suites total). |

---

## 4. Time Conversion & Representation Architecture

### 4.1 Internal Representation
- All internal calculations convert times to **numeric integer minutes from midnight** (`0` to `1439`).
- Standard database/payload storage format: `HH:MM:00` (24-hour clock).
- Display format: `HH:MM AM/PM` (12-hour clock).

### 4.2 Mathematical Formulas
$$\text{Minutes} = \text{hours}_{24} \times 60 + \text{minutes}$$

$$\text{hours}_{24} = \lfloor \text{Minutes} / 60 \rfloor \pmod{24}$$
$$\text{minutes} = \text{Minutes} \pmod{60}$$

---

## 5. Automatic Lab-to-Period Matching Logic

### 5.1 Interval Convention
SchedX strictly applies the half-open interval convention $[start, end)$:
Two intervals $[s_A, e_A)$ and $[s_B, e_B)$ overlap if and only if:
$$\max(s_A, s_B) < \min(e_A, e_B)$$

- A lab ending at `11:00 AM` and a period starting at `11:00 AM` do **not** overlap:
  $$\max(10:00, 11:00) = 11:00 \nless \min(11:00, 12:00) = 11:00$$

### 5.2 Matching Algorithm (`matchLabToDayPeriods`)
1. **Input Validation**: Verifies $s_{lab} < e_{lab}$; ensures day periods are present and valid.
2. **Day Boundary Sanity**: Confirms $e_{day} > s_{day}$; flags inverted day configurations.
3. **Break Conflict Check**: Checks if $\max(s_{lab}, s_{break}) < \min(e_{lab}, e_{break})$. If true, returns:
   `"The selected lab interval overlaps with the configured break '${bName}' (${bStart}–${bEnd}) on ${dayName}."`
4. **Period Intersection**: Finds all configured periods where $\max(s_{lab}, s_P) < \min(e_{lab}, e_P)$.
5. **Complete Coverage Check**: Verifies that the matched periods collectively enclose the lab:
   $$s_{P_1} \le s_{lab} \quad \text{and} \quad e_{P_k} \ge e_{lab}$$
6. **Contiguity / Gap Detection**: Verifies that for every consecutive pair of matched periods $i$ and $i+1$, $s_{P_{i+1}} \le e_{P_i}$.

### 5.3 UI Auto-Allocation Box
In Step 05 (Lab Classes), selecting Day, Start Time, and End Time instantly renders:
- Header: **Automatically Matched Periods** with a duration count badge.
- Interactive Pills: e.g. `[ P2 10:00 AM – 11:00 AM ]`, `[ P3 11:00 AM – 12:00 PM ]`.
- Status Message:
  - Success: `"2 periods matched successfully."`
  - Gap / Coverage Mismatch: `"The selected lab time is not fully covered by the configured periods."`
  - Break Overlap: `"The selected lab interval overlaps with the configured break 'Lunch' on Monday."`

---

## 6. Conflict Validation Changes

| Conflict Scenario | Error Message Format |
| :--- | :--- |
| **Invalid Working Day** | `"${day}'s configured end time must be later than its start time."` |
| **No Matching Periods** | `"No configured periods match the selected lab time (${labTime}) on ${day} (${dayRange}, ${count} periods). Selected lab time is outside the configured timetable period."` |
| **Partial Coverage** | `"The configured periods do not cover the complete lab duration (${labTime}) on ${day}. Configured coverage spans ${coveredRange}. Selected lab time is outside the configured timetable period."` |
| **Break Overlap** | `"The selected lab interval overlaps with the configured break '${bName}' (${bStart}–${bEnd}) on ${day} / break interrupts the available time. Selected lab time is outside the configured timetable period."` |
| **Teacher Collision** | `"The selected teacher is already scheduled during this interval. Two fixed lab sessions require the same teacher (${teacher}) at overlapping times on ${day}..."` |
| **Section Collision** | `"The selected section already has a class during this interval. Two fixed lab sessions require the same section (${section}) at overlapping times on ${day}..."` |
| **Room Collision** | `"The selected lab room is already reserved during this interval. Two fixed lab sessions require the same laboratory room (${room}) at overlapping times on ${day}..."` |

---

## 7. Test Results Matrix (Specification Section 10)

All 10 test scenarios were implemented in `scripts/test-lab-time-auto-matching.js` and verified against the running server:

| Test ID | Test Description | Input / Condition | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TEST 1** | Standard matching lab | Lab 10:00–12:00, Periods P1–P3 | Automatically match P2 and P3 | Matched P2, P3; assigned in timetable | **PASS** |
| **TEST 2** | Minute-level matching | Lab 09:30–11:30 | Identifies intersecting periods P1, P2, P3; rejects partial | Validated coverage across P1–P3; 08:30–10:30 rejected | **PASS** |
| **TEST 3** | AM/PM conversion | Working day 09:00 AM–05:30 PM | Internal value is 17:30 (1050 min) | Evaluates to 1050 min, formats as 05:30 PM | **PASS** |
| **TEST 4** | Invalid working day | 09:00 AM–05:30 AM | Rejection with clear error | Rejected with `${day}'s configured end time must be later than its start time` | **PASS** |
| **TEST 5** | Lab crossing a break | Lab 10:30–12:00, Break 11:00–11:30 | Detects break overlap | Returned 400 with break overlap details | **PASS** |
| **TEST 6** | Teacher conflict | Same teacher in overlapping labs | Detects teacher clash | Returned 400: `The selected teacher is already scheduled during this interval` | **PASS** |
| **TEST 7** | Section conflict | Same section in overlapping labs | Detects section clash | Returned 400: `The selected section already has a class during this interval` | **PASS** |
| **TEST 8** | Day-specific periods | Mon: 5 periods, Tue: 7 periods | Lab 14:00–16:00 matches on Tue only | Mon returns outside periods; Tue matches P6 and P7 | **PASS** |
| **TEST 9** | Persistence | Save timetable and reload | Selected lab times and slots intact | `start_time` and `end_time` preserved in persistence store | **PASS** |
| **TEST 10**| Regression | Standard generate flow | Unaffected features continue working | Full schedule, room, break, and department flows work cleanly | **PASS** |

### Master Regression Suite Results (`scripts/run-all-tests.js`)
```
============================================================
SCHEDX MASTER REGRESSION & AUDIT RUNNER
============================================================

✓ PASS: Frontend UI Elements & Bindings
✓ PASS: Audit Test Suite (Tests 1–13)
✓ PASS: Generate Enhancements Verification
✓ PASS: Department, Room & Lab Verification
✓ PASS: Break Management & Workload Verification
✓ PASS: Multi-Subject & Lab Classes Suite
✓ PASS: Weekly Day-Wise Timetable Suite
✓ PASS: Storage Retention Verification
✓ PASS: Advanced Feature Matrix
✓ PASS: Lab Period Boundary & Afternoon Scheduling Suite
✓ PASS: Lab Time Auto Period Matching & Validation Suite

============================================================
TOTAL SUITES: 11 | PASSED: 11 | FAILED: 0
============================================================
```

---

## 8. Remaining Limitations & Operating Notes

1. **Non-Standard Period Boundaries**:
   If a user enters a lab timing that starts halfway through one period and ends halfway through another (e.g. 09:45 AM to 11:15 AM), SchedX's period-grid scheduling model reserves all whole periods intersected (P1, P2, P3) while preserving the exact requested `start_time` and `end_time` in data records.
2. **Break Splitting**:
   Continuous lab sessions cannot span across configured breaks (e.g., lunch breaks). If a continuous lab is required, users must schedule it entirely before or after the break.
3. **Database Fallback Mode**:
   SchedX continues to support dual-mode database persistence: live cloud Supabase PostgreSQL when credentials are configured, with automatic seamless JSON fallback when running offline.
