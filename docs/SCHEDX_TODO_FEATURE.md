# SchedX To Do

## Purpose
**SCHEDX TO DO** is a date-based calendar productivity and task planner embedded directly into the SchedX Generate Page (`/generate`). It allows instructors, administrators, and students to schedule, manage, and track academic tasks, lecture preparations, assignments, lab setup checkpoints, and reminders for any calendar date. Rather than functioning as a generic checklist, it combines an interactive monthly calendar with a focused, day-specific task workspace.

## Calendar Behavior
- **Dynamic Monthly View:** Computes and renders any month across past, present, and future years with Monday-to-Sunday alignment.
- **Header Navigation:**
  - `‹` Previous month navigation
  - Dynamic Month and Year label (`September 2026`)
  - `›` Next month navigation
  - `Today` quick-jump button to instantly return to current month and select today's date
- **Date Cells:**
  - Rounded, interactive cells with subtle elevation hover effects (`transform: translateY(-1px)`).
  - **Today Indicator:** Highlighted with a distinct blue outline ring (`2px solid rgba(37, 99, 235, 0.55)`).
  - **Selected Date Indicator:** Solid SchedX primary blue background (`#2563eb`), white typography, and subtle drop shadow.
  - **Task Indicators:** Dates with pending tasks display a blue bullet (`•`); dates where all tasks are completed display a green checkmark (`✓`).
  - **Adjacent Month Days:** Displays previous and next month padding days with muted opacity (`0.35`), allowing quick cross-month date jumping.

## Task Creation
1. The user selects any date on the calendar.
2. Clicking **+ Add Task** opens the Add Task modal dialog.
3. The user inputs:
   - **Task Title** *(Required)*: Trimmed, validated, maximum 200 characters.
   - **Time** *(Optional)*: 24-hour time selector rendered in 12-hour AM/PM format (e.g., `10:30 AM`).
   - **Priority** *(Optional)*: `Low`, `Medium`, or `High` with color-coded pill badges.
   - **Description** *(Optional)*: Multiline textarea for notes, laboratory requirements, or student reminders (up to 1,000 characters).
4. Submitting sends a `POST /api/todos` request. Upon success, the modal closes, a toast notification confirms creation, and the calendar indicator updates immediately.

## Task Editing
- Each task card contains an edit button (`✏️`).
- Clicking Edit opens the modal dialog pre-filled with the task's title, description, time, and priority.
- Saving sends a `PUT /api/todos/:id` request, updating the task in-place without creating duplicates or altering other records.

## Task Deletion
- Each task card contains a delete button (`🗑️`).
- Clicking Delete prompts the user for explicit confirmation (`Delete task "[Title]"?`).
- Upon confirmation, a `DELETE /api/todos/:id` request removes the record.
- The task list and the calendar date indicator update dynamically; if no tasks remain for that day, the indicator is removed.

## Task Completion
- Each task card includes a custom checkbox button.
- Clicking the checkbox toggles completion status via `PUT /api/todos/:id` (`completed: true/false`).
- Completed tasks:
  - Display a green check icon.
  - Apply strikethrough styling and reduced opacity to the title.
  - Display a green `Completed` pill badge.
  - If all tasks for that date are completed, the calendar date cell displays a green `✓` indicator.
  - Completed tasks remain visible and can be toggled back to incomplete at any time.

## Persistence
- Tasks are persistently stored on the server in `data/todos.json` using synchronous atomic file writing.
- If a Supabase `todos` table is configured, the server asynchronously mirrors changes to Supabase while retaining local file resilience as a zero-downtime fallback.
- Tasks survive browser reloads, cache clears, and server restarts.

## Database/API
- **Storage Schema:**
  - `todo_id`: Unique identifier string (`todo_<timestamp>_<random>`).
  - `title`: String, 1–200 characters.
  - `description`: String, up to 1,000 characters.
  - `todo_date`: Standard date string in `YYYY-MM-DD` format (eliminates timezone shift bugs).
  - `todo_time`: String in `HH:MM` format (optional).
  - `priority`: Enum `Low` | `Medium` | `High`.
  - `completed`: Boolean (`true` or `false`).
  - `created_at`: ISO timestamp string.
  - `updated_at`: ISO timestamp string.
- **REST Endpoints:**
  - `GET /api/todos`: Returns `{ success: true, count: N, todos: [...] }`. Supports `?date=YYYY-MM-DD` and `?month=YYYY-MM` filters.
  - `POST /api/todos`: Creates task with strict input validation. Returns 201 Created.
  - `PUT /api/todos/:id`: Updates fields in-place. Returns 200 OK.
  - `DELETE /api/todos/:id`: Deletes task. Returns 200 OK.

## Responsive Behavior
- **Desktop (>= 900px):** Two-column split card. Left column features the monthly calendar (~55%); right column features the selected date task workspace (~45%).
- **Tablet / Mobile (<= 900px):** Single-column stacked card. The calendar sits on top; the selected date task list displays below.
- **Small Mobile (<= 480px):** Compact grid padding with minimum 42px touch-friendly date cells, preventing horizontal scrolling or text clipping.

## Accessibility
- Semantic HTML tags (`<section>`, `<article>`, `<button>`, `<h2-h4>`).
- Grid semantics: `role="grid"`, `role="gridcell"`, `aria-selected`, `aria-label` detailing full date and task counts.
- Dynamic regions: `aria-live="polite"` on month/year headers and task containers.
- Full keyboard support:
  - Date cells can be focused and activated with `Enter` or `Space`.
  - `Escape` key closes the task modal.
  - Visible focus rings with high contrast outline.

## Security
- All input is sanitized and validated on the backend.
- Title length strictly capped at 200 characters; description capped at 1,000 characters.
- No database credentials, API secret keys, or service-role tokens are exposed to the client.
- Error handlers return generic, safe messages rather than raw database or server error traces.
