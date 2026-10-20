# SchedX Feature Page Security Review

## 1. Objective
The objective of this security and information disclosure review is to audit the public-facing SchedX Features Page (`public/features.html`), its associated modals, client-side scripts, and backend endpoints. The goal is to eliminate unnecessary technical implementation details, database architecture specifics, internal identifiers, server health diagnostics, and raw error messages from public view while preserving all user-facing features, scheduling capabilities, and responsive UI functionality.

## 2. Public Information Rules
SchedX enforces a strict minimum necessary disclosure policy for all public-facing pages:

* **User Needs to Know (Allowed):**
  * Product capabilities and automated timetable generation benefits
  * Conflict prevention rules (teacher clashing, room overlaps, section double-booking)
  * Data categories supported by persistence (teachers, subjects, sections, rooms, time slots, schedules)
  * User-relevant counts and status (number of rooms, active sections, retained timetable generations)
  * Clear user actions and links to platform tools (`/generate`, `/rooms`, `/teacher-availability`)

* **Internal Implementation Detail (Prohibited):**
  * Database technology vendor names (e.g., Supabase, PostgreSQL)
  * Internal storage mechanics (e.g., local JSON store, multi-version cache, file paths)
  * Infrastructure status indicators (e.g., `HTTP 200`, `DB: ok`, `Backend Active`, `Server Connected`)
  * Algorithmic naming details (e.g., `bounded backtracking solver`)
  * Database schema specifics, table names (`timetable_entries`, `teacher_availability`), and internal column names
  * Primary keys, UUIDs, or timestamped generation identifiers (`gen_178...`)
  * Raw backend error objects, stack traces, and database connection strings
  * Privileged service keys, secret keys, or authentication tokens

## 3. Information Removed
During the audit, the following technical details were removed from client-accessible files:
1. **Database Vendor Disclosure:** Removed references to "Supabase PostgreSQL Cloud Database" in Modal 3.
2. **Internal Cache Architecture:** Removed mentions of "Local JSON Store & Safe Multi-Version Cache" from Box 8 / Modal 3.
3. **HTTP Health Diagnostics:** Removed "Backend Status: HTTP 200 (Active, DB: ok)" from Modal 3, and removed client-side health polling via `/api/health`.
4. **Algorithmic Solver Nomenclature:** Removed "bounded backtracking solver" and "Active Solver" badge from Box 5 and Modal 1, replacing them with user-focused "intelligent collision prevention engine" and "Conflict Prevention".
5. **Database Jargon in Real-Time Status:** Removed "Querying SchedX timetable scheduling database..." and "Connecting to API..." from Modal 2, replacing them with "Checking active classes across all rooms and sections for the current time..." and "Checking schedule...".
6. **Internal Generation Identifiers:** Sanitized `/api/storage` response so `version_id` returns clean symbolic labels (`current`, `history_1`, `history_2`) instead of random timestamp identifiers (`gen_178...`).
7. **Raw Exception Message Leaks:** Replaced server string concatenations (`+ error.message`) on 500 error responses with generic user-friendly messages.

## 4. Box-by-Box Review

| Box | Current Information | User Relevant? | Security Concern? | Action |
|---|---|---|---|---|
| **Box 01: Smart Timetable Engine** | Automatic optimal schedule generation across teachers, sections, and rooms. | Yes | Previous text mentioned "constraint solver". | Sanitized to "intelligent scheduling engine". Retained CTA link to `/generate`. |
| **Box 02: Teacher Availability** | Working day configuration and active period tracking. | Yes | No | Kept user-facing description and link to `/teacher-availability`. |
| **Box 03: Section Organization** | Multi-section cohort scheduling without overlaps. | Yes | No | Kept user-facing cohort descriptions and CTA link to `/generate#timetableForm`. |
| **Box 04: Room Management** | Classroom and laboratory capacities and filters. | Yes | Tag was "INFRASTRUCTURE". | Updated tag to "FACILITIES" to reflect campus facilities rather than server infrastructure. |
| **Box 05: Collision Prevention** | 3-way conflict auditing for teachers, classes, and rooms. | Yes | Referenced "bounded backtracking solver" and "Active Solver". | Replaced with "intelligent collision prevention engine" and "Conflict Prevention". Updated modal button to "Verify Conflict Rules". |
| **Box 06: Day-by-Day Layout** | Monday-Sunday chronological schedule view. | Yes | No | Kept user-facing calendar descriptions and CTA link to `/generate`. |
| **Box 07: Live Class Monitor** | Querying ongoing lectures and active classrooms. | Yes | Modal contained "database", "Connecting to API...", and "Server response: Schedule idle". | Rewritten to "Checking active schedule...", "Checking schedule...", and "Schedule idle (No ongoing lecture)". |
| **Box 08: Cloud & Data Persistence** | Multi-session data preservation across restarts. | Yes | Contained database vendor name, local cache engine, and HTTP 200 status. | Fully sanitized. Focuses on user benefits, supported data types, and references Box 09 Storage. |
| **Box 09: Storage Dashboard** | Live overview of stored records and retention history. | Yes | Server response previously exposed internal timestamp IDs (`gen_178...`). | Sanitized server response to return clean labels. Replaced raw error message with user-friendly retry message. |

## 5. Box 8 Changes
* **Title:** Set to `Cloud & Data Persistence`.
* **Description:** Updated to focus on user benefit: *"Keep your scheduling information available across sessions so you don't have to repeatedly recreate your setup."*
* **Supported Data Types:** Clearly displays user-relevant items: Teachers, Subjects, Classes & Sections, Rooms, Time Slots, Generated Schedules.
* **Benefits:** Communicates that scheduling configurations remain available upon returning to SchedX and directs users to Feature 09 Storage for current stored data.
* **Modal 3 Cleanup:**
  * Replaced "Data Persistence Engine" with "Cloud & Data Persistence".
  * Replaced "Cloud Persistence: Supabase PostgreSQL Cloud Database" with "Persistence: Cloud-based data persistence across sessions".
  * Removed "Server Continuity: Local JSON Store & Safe Multi-Version Cache".
  * Removed "Backend Status: HTTP 200 (Active, DB: ok)".
  * Removed client-side `fetch('/api/health')` invocation.
  * Added direct navigation button: "View Stored Data" pointing to Modal 4.

## 6. Box 9 Changes
* **Title & Description:** Clean user-facing inventory of institutional records (Faculty, Subjects, Sections, Rooms) and retained timetable versions.
* **Retention Policy Presentation:** Explains the safe retention policy in clear language: strictly the latest 2 generated timetable versions are retained while all master records remain permanently stored.
* **Data Summary:** Live metrics display counts of teachers, subjects, sections, rooms, and timetable versions without exposing database keys, UUIDs, or table schemas.
* **Safe Version Cards:** Displays versions as "Current Active Schedule" and "Previous Generation" rather than internal UUIDs or generation IDs.
* **Error Handling:** Features a friendly fallback message: *"Something went wrong while loading this information. Please try again."* with a retry button.

## 7. Sensitive Information Checks
* **Prohibited Strings Search:** Executed automated scans for `SUPABASE_SECRET_KEY`, `service_role`, `DATABASE_URL`, API keys, passwords, and tokens across all client files. Zero secrets were found in client-accessible assets.
* **Server-side Credentials:** Database URLs and Supabase keys are strictly managed server-side via process environment variables and never bundled into frontend assets.

## 8. Frontend Exposure Check
* All frontend source files (`public/features.html`, `public/script.js`, `public/style.css`, `public/index.html`, `public/generate.html`, `public/rooms.html`, `public/teacher-availability.html`, `public/teacher-info.html`) were inspected.
* No privileged credentials, internal file system paths (e.g. `C:\Users\...` or `/var/www/...`), or private keys exist in any frontend document.
* No sensitive content is hidden merely using CSS `display:none` or `visibility:hidden`; sensitive data is excluded at the source.

## 9. API Response Check
* Audited `GET /api/storage`:
  * Returns strictly aggregated counts, last generated timestamp, retention policy string, and sanitized lists.
  * `teachers` list contains only `name`, `department`, and `working_days` (database `id` excluded).
  * `rooms` list contains only `room_name`, `room_type`, `capacity`, and `availability` (database `id` excluded).
  * `timetables` list contains only clean version labels (`current`, `history_1`), timestamps, period counts, and section tags.
  * Errors return generic HTTP 500 status without appending `error.message`.
* Audited `GET /api/current-class`:
  * Returns user-safe fields: `running`, `subject`, `teacher`, `class`, `section`, `room`, `start_time`, `end_time`.
  * Errors return clean generic messages without internal database stack traces.

## 10. Browser Console Check
* Cleaned client-side JavaScript in `public/features.html`.
* Removed `console.error('Error fetching storage metrics:', err)` to prevent dumping internal network or JavaScript error traces to the browser console.
* Verified that normal modal interactions, data fetches, and keyboard shortcuts run without emitting debug logs or sensitive credentials.

## 11. Network Response Check
* Evaluated all network transactions generated when visiting `/features`:
  * `GET /features`: Pure semantic HTML, clean CSS, and sanitized JavaScript.
  * `GET /api/storage`: Clean JSON payload with zero internal IDs or service keys.
  * `GET /api/current-class`: Clean status payload with zero system diagnostics.
  * No calls to administrative or diagnostic endpoints (such as `/api/health`) are made by the public features page.

## 12. Remaining Recommendations
1. **Environment File Guard:** Maintain strict `.gitignore` rules ensuring `.env` and `.env.*` remain untracked.
2. **Rate Limiting:** Implement rate limiting middleware (such as `express-rate-limit`) on public API endpoints (`/api/storage`, `/api/current-class`) to mitigate potential scraping.
3. **Security Headers:** Add `helmet` middleware on Express to enforce HTTP security headers (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`).
4. **Consistent Error Masking:** Ensure all other Express endpoints adopt the same pattern of masking raw `error.message` strings on HTTP 500 responses.
