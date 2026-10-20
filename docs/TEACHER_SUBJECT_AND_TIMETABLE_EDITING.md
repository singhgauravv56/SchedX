# SchedX — Teacher-Subject Assignment & Editable Conflict-Free Timetable Guide

This document describes the architectural design, conflict-prevention algorithms, data contracts, and user interactions introduced for **Explicit Teacher → Subject Assignment** and **Manual Timetable Manipulation** in SchedX.

---

## 1. Teacher-Subject Relationship

SchedX replaces loose specialization tags with an explicit, strictly enforced **Teacher → Assigned Subject** mapping.

- **Explicit Mapping**: Each teacher entry configures the teacher's name and the specific subject(s) they are qualified and authorized to instruct.
- **Strict Domain Boundary**: A teacher assigned to *Mathematics* will **never** be scheduled for *DBMS*, *DSA*, or *Operating Systems*, unless explicitly reassigned by an administrator.
- **Relational Integrity**:
  - Teacher subjects are chosen directly from the configured subject list in the same form.
  - A teacher cannot have unlisted or unknown subjects.
  - Every configured course must have at least one assigned teacher before timetable generation is permitted.

---

## 2. Generate Page Behavior

On `http://localhost:3000/generate`:
- **Step 1 (Teachers & Assigned Subjects)**:
  - Each teacher row features a clean grid containing:
    1. **Teacher Name Input**: Plain text name (e.g. `Dr. Alan Turing`).
    2. **Assigned Subject Dropdown**: Populated dynamically from the subjects entered in Step 2.
- **Dynamic Synchronization**:
  - As users add, edit, or remove subjects in Step 2, the Assigned Subject dropdowns in Step 1 immediately update options without wiping existing selections.
- **Submission Validation**:
  - Before generation, the client checks:
    - Every teacher row has a non-empty name.
    - Teacher names are unique (case-insensitive).
    - Every teacher has an assigned subject chosen from the dropdown.
    - All subjects entered in Step 2 have at least one instructor assigned.
  - The backend duplicates this validation independently to reject arbitrary or malicious payloads.

---

## 3. Timetable Editing

Generated schedules are not static; users can manipulate them safely via an intuitive **Edit Modal**:
- **Entry Action Controls**:
  - Every scheduled class row in the day-wise timetable includes `[ ✎ Edit ]` and `[ 🗑 ]` buttons.
- **Edit Modal (`#editTimetableModal`)**:
  - Clicking `[ ✎ Edit ]` extracts the row's data and opens a focused modal.
  - Form fields include:
    - **Day**: Configured academic working days.
    - **Time Slot**: Chronological time periods (e.g., `09:00 – 10:00`).
    - **Section / Class**: Student cohorts (e.g., `CSE-A`, `CSE-B`).
    - **Subject / Course**: Configured curriculum subjects.
    - **Teacher**: **Dynamically filtered** to show only teachers assigned to teach the selected subject.
    - **Room**: Campus spaces with room type annotations (Classroom / Laboratory).
- **Live Conflict Feedback**:
  - Real-time client-side preview evaluates proposed changes on every dropdown change, warning users immediately of any teacher, room, or section clash before submission.

---

## 4. Conflict Rules

SchedX enforces 10 strict conflict prevention dimensions during both automated generation and manual editing:
1. **Teacher Conflict**: A teacher cannot teach two different classes at the same `Day + Time Slot`.
2. **Section Conflict**: A section cannot attend two different subjects at the same `Day + Time Slot`.
3. **Room Conflict**: A room cannot host two different classes at the same `Day + Time Slot`.
4. **Teacher-Subject Constraint**: A teacher cannot be assigned to teach a subject they are not assigned to.
5. **Room Type Compatibility**: Laboratory-required subjects cannot be scheduled in classroom-only spaces.
6. **Teacher Availability**: Faculty marked as unavailable on a specific `Day + Time Slot` cannot be assigned to that slot.
7. **Room Availability**: Rooms marked under maintenance or reserved are excluded.
8. **Working Day Bounds**: Sessions cannot be moved outside the active configured academic working days.
9. **Time Slot Bounds**: Sessions cannot be scheduled outside institutional operating hours.
10. **Atomic Position Safety**: Moves that leave the schedule in a conflict state are rejected; the previous valid state is preserved.

---

## 5. Day + Time Slot Handling

> [!IMPORTANT]
> The atomic scheduling coordinate in SchedX is strictly **`DAY + TIME_SLOT`**, NOT time alone.

- **Different Days, Same Time**: `Monday 09:00 – 10:00` and `Tuesday 09:00 – 10:00` are completely independent positions. Rahul teaching on Monday at 09:00 does not block Rahul from teaching on Tuesday at 09:00.
- **Same Day, Same Time, Distinct Resources**:
  `Monday 09:00 – 10:00`:
  - `CSE-A | Mathematics | Rahul Sharma | Room 101`
  - `CSE-B | DBMS | Aman Verma | Room 102`
  This is 100% **valid and encouraged** because the sections, teachers, and rooms are completely distinct.

---

## 6. Teacher Validation

- **Backend Enforcement**: In `server.js`, `validateTimetableAssignment()` checks:
  ```javascript
  const teacherRec = teacherRecords.find(t => t.teacher_name.toLowerCase() === proposed.teacher_name.toLowerCase());
  if (!teacherRec) return { valid: false, error: "Teacher not registered" };
  if (!teacherRec.assigned_subjects.includes(proposed.course_name.toLowerCase())) {
    return { valid: false, error: `Teacher '${proposed.teacher_name}' is not assigned to teach '${proposed.course_name}'.` };
  }
  ```
- **Live Filtering**: Changing the subject in the Edit Modal instantly refreshes the Teacher selector to show only qualified faculty for that subject.

---

## 7. Section Validation

- Ensures each student cohort attends only one lecture per time period.
- Parallel sections (`CSE-A`, `CSE-B`, `CSE-C`) operate independently without artificial cross-section blocking.

---

## 8. Room Validation

- Checks physical space occupancy per `Day + Time Slot`.
- Checks room capacity against cohort enrollment.
- Checks room specialization (`Classroom`, `Laboratory`, or `Both`).

---

## 9. Availability Validation

- Integrates with Supabase `teacher_availability` and local availability metadata.
- Teachers can set specific days and hours where they are off-campus or in research blocks; moves to those slots are blocked with descriptive notifications.

---

## 10. Save & Update Behavior

1. User modifies values in Edit Modal.
2. User clicks `[ Save Changes ]`.
3. Client dispatches `PUT /api/timetable/entry/:id` with complete proposed state.
4. Server runs unified `validateTimetableAssignment()`.
5. If invalid: server returns `HTTP 409 Conflict` with a specific human-readable message. Modal remains open with error banner highlighted.
6. If valid: server updates in-memory active generation, saves to local JSON store, updates Supabase PostgreSQL table in-place, and responds `HTTP 200 OK`.
7. Client closes modal, displays toast `"Timetable updated successfully."`, and smoothly re-renders the table.

---

## 11. Supabase Persistence

- **Table**: `public.teachers`:
  - Added column `assigned_subject TEXT` for comma-delimited subject lists.
- **Table**: `public.timetable`:
  - Stores `day`, `day_of_week`, `start_time`, `end_time`, `section`, `course_name`, `teacher_name`, `room_name`, `room_type`.
  - Database-level unique constraints enforce zero conflicts:
    - `CONSTRAINT uq_day_time_teacher UNIQUE (day_of_week, start_time, teacher_name)`
    - `CONSTRAINT uq_day_time_section UNIQUE (day_of_week, start_time, section)`
    - `CONSTRAINT uq_day_time_room UNIQUE (day_of_week, start_time, room_name)`
- **In-Place Updates**: Individual entry edits update the exact row in Supabase (`UPDATE timetable WHERE timetable_id = ...`) without creating new generations.

---

## 12. Security

- **Credential Isolation**: Supabase Service Role keys and connection strings remain strictly server-side in `.env`.
- **Zero Raw Database Errors**: If a database error occurs, a sanitized user-friendly message is returned.
- **Untrusted Client Data**: All IDs, names, and day/time parameters sent in requests are sanitized, normalized, and validated on the backend.

---

## 13. Responsive Behavior

- **Mobile (< 640px)**:
  - Teacher card grid stacks vertically into compact input rows.
  - Edit Modal adjusts padding, uses 100% viewport width, and stacks action buttons (`Cancel` / `Save Changes`).
  - Table action buttons (`✎ Edit`, `🗑`) collapse gracefully within action cell.
- **Desktop (1024px – 1920px)**:
  - 2-column input grids for high-density entry.
  - Hover states on timetable rows highlight editable rows with brand accents (`box-shadow: inset 3px 0 0 var(--primary-color)`).
