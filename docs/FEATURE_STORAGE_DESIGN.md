# Feature Storage Design

## Box 8
- **Purpose**: Explains the data persistence capabilities of SchedX in clear, user-friendly terms without overwhelming users with database jargon or actual raw records.
- **Data Types Described**:
  - Faculty & Teachers (names, departmental assignments, weekly working days)
  - Subjects & Course Catalog
  - Class Sections & Cohorts
  - Room & Laboratory Inventory (capacities and room types)
  - Time Slots & Institutional Working Hours
  - Teacher Availability Schedules
  - Conflict-Free Generated Timetables
- **User Benefit**:
  - **Session & Refresh Continuity**: Scheduling setup and generated schedules persist across browser refreshes and subsequent sessions.
  - **Eliminates Manual Repetition**: Users do not need to re-enter teachers, subjects, rooms, and sections each time they visit.
  - **Scheduling Safety**: Prevents accidental loss of complex institutional constraints.
  - **Schedule Longevity**: Timetables remain stored and accessible until explicitly updated or deleted by the user.
- **What it does NOT show**:
  - It does NOT display actual stored database rows or individual timetable entries.
  - It does NOT show a storage dashboard or live counter widgets.
  - It does NOT expose technical database schema, table names (`public.teachers`, `public.timetable`), SQL queries, or Supabase credentials.
  - It does NOT make false claims about browser-level offline capabilities (e.g. IndexedDB, Service Workers).

---

## Box 9
- **Purpose**: Serves as a live, interactive Storage Dashboard showing the user exactly what scheduling records and timetable versions SchedX currently has stored.
- **Actual Stored Data**:
  - Real-time counts of Teachers, Subjects, Sections, Rooms, and Retained Timetable Generations.
  - Timestamp of the latest timetable generation.
  - Live inspection breakdown via the interactive **"View Stored Data"** modal.
- **Storage Counts**:
  - Dynamically fetched from the backend API (`GET /api/storage`).
  - Never hard-coded; reflects live database states in Supabase PostgreSQL and server continuity stores.
- **Timetable History & Retention Rule**:
  - SchedX enforces a strict **latest 2 generations** retention policy.
  - When a 3rd or subsequent timetable is generated, earlier versions are automatically retired, keeping only the 2 most recent generations (the active schedule plus the immediate predecessor).
- **Delete & Update Behavior**:
  - **Explicit User Delete** (`DELETE /api/timetable`): Clears the active timetable while strictly protecting all institutional master records (teachers, subjects, rooms, sections).
  - **In-Place Update** (`PUT /api/timetable`): Modifies the existing timetable entries, refreshes the modification timestamp, and preserves the active status without creating orphan versions.

---

## Difference Between Box 8 and Box 9

| Attribute | Box 8 (Cloud Data Persistence & Continuity) | Box 9 (Storage Dashboard & Repository) |
| :--- | :--- | :--- |
| **Core Role** | **What SchedX can save + why it helps** (Capability Explanation) | **What SchedX has actually stored right now** (Live Storage Inspection) |
| **Data Nature** | Conceptual & Informational | Live Application Data & Metrics |
| **Shows Actual Records?** | No | Yes (Counts on card + Detailed breakdown in modal) |
| **Primary CTA** | "Explore Persistence Architecture" (Opens capability overview) | "View Stored Data" (Opens live repository inspector) |
| **Dynamic API Calls** | Static informational content | Dynamic fetch from `GET /api/storage` |
| **Timetable Context** | Explains that schedules can persist across sessions | Displays retained versions (up to 2) with generation timestamps and period counts |
| **Target Audience Goal** | Understand the value and safety of saving data | Audit and verify current institutional data footprint |
