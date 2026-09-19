# SchedX Section, Room & Timetable Implementation Report

## 1. Executive Summary

This report documents the design, implementation, and automated verification of the upgraded SchedX Smart Timetable Generator. The enhancement introduces:
- **Classes / Sections Management**: Dynamic addition and removal of target class cohorts (e.g., CSE-A, CSE-B).
- **Rooms Management**: Dynamic addition and removal of physical classrooms and laboratories with room number and room type attributes.
- **Room Type Preference Filter**: Global constraint filtering ensuring classes are only scheduled in rooms matching the user's selected requirement (`Classroom`, `Laboratory`, or `Both`).
- **Multi-Resource Backtracking Constraint Engine**: A robust search algorithm across `Section x Subject x Teacher x Day x Slot x Room` that enforces zero collisions for teachers, sections, and rooms.
- **Day-Wise Timetable Display**: Responsive, day-by-day academic schedule grouped chronologically by working days (Monday through Sunday) and sorted by start time.
- **Dual Persistence Architecture**: Direct synchronization with Supabase PostgreSQL alongside resilient local persistent storage (`data/timetable_store.json`), ensuring seamless recovery across page refreshes.

---

## 2. Generate Page Changes

The Generate page (`public/generate.html`) was enhanced with two new interactive resource sections matching SchedX's visual design system:

### Classes / Sections
- **Heading**: `Classes / Sections`
- **Add Action**: `+ Add Section` button dynamically creates a new section card.
- **Input Fields**: Section/Class Name (`e.g., CSE-A`).
- **Remove Action**: `- Remove` button cleanly removes the section from state and the DOM.
- **Validation**: Enforces non-empty names, trimmed whitespace, and case-insensitive uniqueness (`Section names must be unique.`).

### Rooms
- **Heading**: `Rooms`
- **Add Action**: `+ Add Room` button dynamically creates a new room card.
- **Input Fields**:
  - Room Number / Name (`e.g., 101` or `Lab-1`).
  - Room Type dropdown (`Classroom` or `Laboratory`).
- **Remove Action**: `- Remove` button cleanly removes the room from state and the DOM.
- **Validation**: Enforces non-empty room numbers, trimmed whitespace, and uniqueness (`Room numbers must be unique.`).

### Global Room Type Selector
- Preserved as a high-level scheduling requirement filter:
  - **Classroom**: Only rooms of type `Classroom` are allocated.
  - **Laboratory**: Only rooms of type `Laboratory` are allocated.
  - **Both**: Both classrooms and laboratories are eligible for allocation.

---

## 3. Teacher Changes

- Teacher input remains **Teacher Name ONLY**.
- Specialization was **NOT** reintroduced on the Generate Page.
- Each teacher input card contains only the Teacher Name and a remove button when more than one teacher is present.
- Teacher names are validated for uniqueness and non-empty values.

---

## 4. Subject Rules

- Dynamic subject formula is strictly preserved:
  $$\text{Maximum Allowed Subjects} = \text{Number of Teachers} + 2$$
- Examples:
  - 2 Teachers $\rightarrow$ Maximum 4 Subjects
  - 3 Teachers $\rightarrow$ Maximum 5 Subjects
  - 4 Teachers $\rightarrow$ Maximum 6 Subjects
  - 5 Teachers $\rightarrow$ Maximum 7 Subjects
- Validated dynamically on both frontend (`+ Add Subject` button disabled upon reaching capacity) and backend (HTTP 400 with diagnostic message if breached).
- A teacher can teach multiple subjects across different non-overlapping periods.

---

## 5. Scheduling Algorithm

The generator uses a **Multi-Resource Backtracking Constraint Satisfaction Engine**:

1. **Working Matrix Construction**:
   - Divides working hours (`working_start_time` to `working_end_time`) into discrete 1-hour slots.
   - Replicates slots across configured working days ($D$ days).
2. **Item Distribution**:
   - For every section in `sections`:
     - Distributes the required subjects across working days so each section receives a balanced weekly load.
     - Creates search items: `(Section, Subject, Day)`.
3. **Multi-Dimensional Search**:
   - Explores assignment tuples:
     $$\text{Section} \times \text{Subject} \times \text{Teacher} \times \text{Day} \times \text{Slot} \times \text{Room}$$
   - Employs round-robin heuristics to balance teaching load and room utilization.
4. **Controlled Backtracking**:
   - When a branch reaches a dead end (no available teacher, room, or slot), the solver pops previous assignments and explores alternative candidates.
   - Bounded by a 40,000-step budget to prevent infinite loops while exploring vast combinatorial states.

---

## 6. Conflict Prevention

The engine enforces six academic scheduling invariants:

| Conflict Type | Condition | System Action | Invariant Enforced |
| :--- | :--- | :---: | :--- |
| **Teacher Collision** | Same teacher + Same slot | **BLOCKED** | Instructor cannot teach two classes simultaneously. |
| **Teacher Re-use** | Same teacher + Different slot | **ALLOWED** | Instructor can teach multiple subjects or sections at different times. |
| **Section Collision** | Same section + Same slot | **BLOCKED** | Cohort cannot attend two subjects simultaneously. |
| **Section Distribution**| Same section + Different slot | **ALLOWED** | Cohort attends sequential subjects throughout the day. |
| **Room Collision** | Same room + Same slot | **BLOCKED** | Physical space cannot host two cohorts at the same time. |
| **Room Re-use** | Same room + Different slot | **ALLOWED** | Physical space hosts multiple cohorts sequentially. |
| **Room Compatibility** | Room type mismatch | **BLOCKED** | Room must satisfy global filter (`Classroom` vs `Laboratory`). |
| **Teacher Availability**| Explicitly unavailable | **BLOCKED** | Instructor availability calendar respected. |

### Final Validation Pass:
Before saving, an exhaustive $O(N^2)$ verification pass compares every scheduled period against all other periods. If any collision is detected, the timetable is rejected with an HTTP 409 error.

---

## 7. Database / Supabase Changes

- **Active Supabase PostgreSQL**:
  - Reused existing `teachers` and `rooms` tables in live Supabase.
  - Dynamically provisions configured rooms and teachers in Supabase using existing columns (`room_number`, `room_type`, `capacity`, `availability`, `name`).
  - Gracefully attempts insert into `classes` and `timetable` tables if present.
- **Local Persistence Mirror**:
  - Timetable data is stored in `data/timetable_store.json`, guaranteeing instantaneous recovery upon page reload regardless of cloud schema cache state.
- **Schema Reference**:
  - `supabase/schema.sql` contains the complete schema including unique constraints:
    - `unique (day, start_time, teacher_id)`
    - `unique (day, start_time, class_id)`
    - `unique (day, start_time, room_id)`

---

## 8. API Changes

| Endpoint | Method | Status | Changes |
| :--- | :---: | :---: | :--- |
| `/api/generate` | `POST` | `200` | Accepts `sections` and `rooms` arrays. Returns generated entries with section and room assignments. |
| `/api/generate` | `POST` | `400` | Validates non-empty unique teachers, subjects, sections, and rooms. |
| `/api/generate` | `POST` | `409` | Returns conflict details if constraints cannot be satisfied. |
| `/api/timetable` | `GET` | `200` | Returns persistent timetable sorted chronologically by day and start time. |
| `/api/timetable` | `DELETE`| `200` | Clears active timetable. |
| `/api/current-class` | `GET` | `200` | Identifies active class based on server time, returning `subject`, `teacher`, `section`, and `room`. |

---

## 9. Timetable Display

The timetable layout was redesigned into a **Day-Wise Card Structure**:
- **Day Cards**: Each configured working day is rendered as an independent card with an uppercase heading (`MONDAY`, `TUESDAY`, etc.) and a period count badge.
- **Day Ordering**: Chronological day ordering from Monday through Sunday according to working days.
- **Time Sorting**: Time slots within each day are sorted chronologically (`09:00 - 10:00`, `10:00 - 11:00`, etc.).
- **Columns**: `Time Slot`, `Section / Class`, `Subject / Course`, `Teacher`, `Room`, `Room Type`.
- **Empty Day Notice**: If no classes are scheduled for a working day, displays: `MONDAY: No classes scheduled.`
- **Mobile Responsive**: Tables are wrapped in `.day-table-container` with smooth touch horizontal scrolling.

---

## 10. Current Class

The `/api/current-class` endpoint resolves the currently running class period:
- Checks server day of the week and current time (`HH:MM:SS`).
- Returns:
  - `subject`: Current course name.
  - `teacher`: Current instructor name.
  - `section`: Cohort name (e.g. `CSE-A`).
  - `room`: Physical room name (e.g. `101`).
  - `room_type`: Room type (`Classroom` or `Laboratory`).
  - `start_time` & `end_time`: 5-character time strings (`09:00`, `10:00`).
- If no class is running: `{ running: false, message: "No class is currently scheduled." }`.

---

## 11. Files Modified

| Path | Summary of Changes |
| :--- | :--- |
| [`server.js`](file:///c:/Users/acer/Downloads/SchedX/server.js) | Updated `generateTimetableHandler` with section/room normalization, room type filter, multi-resource backtracking solver, final conflict validation pass, and updated current-class payload. |
| [`public/generate.html`](file:///c:/Users/acer/Downloads/SchedX/public/generate.html) | Added "Classes / Sections" and "Rooms" form sections, updated room type selector help text, and replaced single table with `#daywiseTimetableContainer`. |
| [`public/script.js`](file:///c:/Users/acer/Downloads/SchedX/public/script.js) | Added dynamic section and room managers, validation for duplicate names, updated API submission payload, and implemented day-wise timetable rendering. |
| [`public/style.css`](file:///c:/Users/acer/Downloads/SchedX/public/style.css) | Added styling for section cards, room cards, day cards, day count badges, and mobile-friendly table containers. |

---

## 12. Files Created

| Path | Description |
| :--- | :--- |
| [`scripts/test-scenarios.js`](file:///c:/Users/acer/Downloads/SchedX/scripts/test-scenarios.js) | Automated verification suite testing all 10 academic scheduling scenarios. |
| [`docs/SECTION_ROOM_TIMETABLE_REPORT.md`](file:///c:/Users/acer/Downloads/SchedX/docs/SECTION_ROOM_TIMETABLE_REPORT.md) | Comprehensive implementation and verification report. |

---

## 13. Files Deleted

No files deleted.

---

## 14. Testing Results

All tests were executed against the active Express server (`http://localhost:3000`):

| Test | Expected | Actual | Result |
| :--- | :--- | :--- | :---: |
| **Health Check** | HTTP 200, status: ok | HTTP 200, status: ok | **PASS** |
| **Scenario 1: Basic Generation** | 2 Teachers, 2 Subjects, 1 Section, 1 Room $\rightarrow$ Valid schedule | HTTP 200, 10 periods scheduled, 0 conflicts | **PASS** |
| **Scenario 2: Multiple Sections** | 3 Teachers, 5 Subjects, 2 Sections, 3 Rooms $\rightarrow$ Valid schedule | HTTP 200, 50 periods scheduled, 0 conflicts | **PASS** |
| **Scenario 3: Max Subjects Rule** | 3 Teachers: 5 subjects accepted, 6 subjects rejected | 5 subjects: HTTP 200; 6 subjects: HTTP 400 | **PASS** |
| **Scenario 4: Room Conflict Prevention** | Shared single room across 2 sections $\rightarrow$ No room double-booking | Scheduled 8 periods with 0 room conflicts | **PASS** |
| **Scenario 5: Teacher Conflict Prevention**| Solo teacher across 2 sections $\rightarrow$ No teacher double-booking | Scheduled 6 periods with 0 teacher collisions | **PASS** |
| **Scenario 6: Section Conflict Prevention**| Single section across multiple subjects $\rightarrow$ No overlap | Scheduled 15 periods with 0 section collisions | **PASS** |
| **Scenario 7: Room Type Filter** | Classroom filter uses only classrooms; Lab filter uses only labs | Lab filter: 100% Labs; Classroom filter: 100% Classrooms | **PASS** |
| **Scenario 8: Day-Wise Sorting** | Chronological day order and chronological start times | Days ordered: true, times ordered: true | **PASS** |
| **Scenario 9: Timetable Persistence** | Persistent across multiple fetches/refreshes | Consistent period count returned on repeated fetches | **PASS** |
| **Scenario 10: Current Class API** | Returns Subject, Teacher, Section, Room | HTTP 200 with complete class metadata | **PASS** |
| **Validation: Duplicate Sections** | HTTP 400 "Section names must be unique." | HTTP 400 "Section names must be unique." | **PASS** |
| **Validation: Duplicate Rooms** | HTTP 400 "Room numbers must be unique." | HTTP 400 "Room numbers must be unique." | **PASS** |

---

## 15. Security

- Supabase service secrets and API keys are **not** exposed on the client side or in frontend code.
- `.env` and sensitive credentials are excluded from Git tracking via `.gitignore`.
- No confidential database credentials or connection strings are included in this report.
- SQL injection prevention: All Supabase database calls use parameterized query builders.

---

## 16. Known Issues

No known issues. All 10 verification scenarios passed with zero errors and zero conflicts.

---

## 17. Final Status

**COMPLETED**
