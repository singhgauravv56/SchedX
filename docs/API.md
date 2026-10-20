# REST API Specification — SchedX

> **Document Version**: 2.0.0  
> **Status**: `Confirmed` Complete API Contract for Existing Codebase  
> **Base URL**: `http://localhost:3000`  
> **Target Audience**: Backend & Frontend Engineers, API Integrators, QA Automation Developers  
> **Related Documents**: [ARCHITECTURE.md](ARCHITECTURE.md) | [DATABASE.md](DATABASE.md) | [PRD.md](PRD.md)

---

## 1. API Architecture & Standards

All SchedX API endpoints follow RESTful conventions:
- **Endpoint Prefix**: All programmatic endpoints are scoped under `/api/*`.
- **Content Type**: `application/json; charset=utf-8` for standard requests and responses. Binary PDF downloads use `application/pdf`.
- **Authentication**: Currently unauthenticated (open local development mode).
- **Database Middleware**: All stateful endpoints pass through `checkDatabase`, which validates the runtime configuration and connectivity.
- **Related Files**: Defined primarily in [`server.js`](../server.js) with PDF rendering delegated to [`utils/pdfGenerator.js`](../utils/pdfGenerator.js).

---

## 2. API Endpoint Directory

### 2.1 System Health & Diagnostics

#### `GET /api/health`
- **Purpose**: Verify service health, runtime port, and Supabase database connectivity.
- **Related File**: `server.js` (line 1638)
- **Request Parameters**: None
- **Response Format**: `200 OK`
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-21T03:00:00.000Z",
    "supabase_connected": true,
    "storage_mode": "dual-tier"
  }
  ```
- **Error Response**: `503 Service Unavailable` if core components fail initialization.

---

### 2.2 Department Management

#### `GET /api/departments`
- **Purpose**: Retrieve all registered academic departments from catalog.
- **Related File**: `server.js` (line 1672)
- **Response Format**: `200 OK`
  ```json
  [
    {
      "id": "cse",
      "name": "Computer Science & Engineering",
      "code": "CSE"
    },
    {
      "id": "it",
      "name": "Information Technology",
      "code": "IT"
    }
  ]
  ```

#### `POST /api/departments`
- **Purpose**: Register or update a department in the catalog.
- **Related File**: `server.js` (line 1699)
- **Request Body**:
  ```json
  {
    "name": "Biomedical Engineering",
    "code": "BME"
  }
  ```
- **Validation**: `name` string is required and non-empty.
- **Response Format**: `200 OK`
  ```json
  {
    "success": true,
    "department": {
      "id": "dept_1792448000000_abcd",
      "name": "Biomedical Engineering",
      "code": "BME"
    }
  }
  ```

#### `GET /api/departments/saved-timetables`
- **Purpose**: Retrieve saved timetables grouped by department for multi-department management.
- **Related File**: `server.js` (line 1751)
- **Response Format**: `200 OK` JSON dictionary mapping department names to arrays of timetable entries.

---

### 2.3 Break Management

#### `GET /api/breaks`
- **Purpose**: Retrieve all configured schedule breaks.
- **Related File**: `server.js` (line 1808)
- **Response Format**: `200 OK`
  ```json
  [
    {
      "name": "Lunch Break",
      "day": "Monday",
      "start_time": "12:20:00",
      "end_time": "13:00:00",
      "type": "Lunch Break",
      "department": "Computer Science & Engineering"
    }
  ]
  ```

#### `POST /api/breaks`
- **Purpose**: Persist schedule breaks (supports single break object or array of breaks).
- **Related File**: `server.js` (line 1822)
- **Request Body**:
  ```json
  {
    "breaks": [
      {
        "name": "Tea Break",
        "day": "Monday",
        "start_time": "11:00:00",
        "end_time": "11:15:00",
        "type": "Short Break"
      }
    ]
  }
  ```
- **Response Format**: `200 OK` `{ "success": true, "count": 1 }`

---

### 2.4 Faculty (Teachers) Management

#### `GET /api/teachers`
- **Purpose**: Retrieve all registered faculty records.
- **Related File**: `server.js` (line 1892)
- **Response Format**: `200 OK` Array of teacher objects containing `id`, `name`, `specialization`, `assigned_subjects`, and `working_days_per_week`.

#### `POST /api/teachers`
- **Purpose**: Create a new faculty record.
- **Related File**: `server.js` (line 1912)
- **Request Body**:
  ```json
  {
    "name": "Dr. Sarah Connor",
    "specialization": "Artificial Intelligence",
    "assigned_subjects": ["Machine Learning", "Neural Networks"],
    "working_days_per_week": 5
  }
  ```
- **Validation**: `name` is required and must be unique.
- **Response Format**: `201 Created` with created record.

#### `PUT /api/teachers/:id`
- **Purpose**: Update an existing faculty record.
- **Related File**: `server.js` (line 1980)

#### `DELETE /api/teachers/:id`
- **Purpose**: Remove a faculty member.
- **Related File**: `server.js` (line 2025)

---

### 2.5 Courses & Subjects Management

#### `GET /api/courses`
- **Purpose**: Retrieve all registered academic courses/subjects.
- **Related File**: `server.js` (line 2048)

#### `POST /api/courses`
- **Purpose**: Create a course.
- **Related File**: `server.js` (line 2062)
- **Request Body**: `{ "course_name": "Operating Systems", "department": "CSE" }`

#### `PUT /api/courses/:id` & `DELETE /api/courses/:id`
- **Related File**: `server.js` (lines 2100, 2118)

---

### 2.6 Class & Cohort Management

#### `GET /api/classes`
- **Purpose**: Retrieve all student class cohorts.
- **Related File**: `server.js` (line 2135)

#### `POST /api/classes`
- **Purpose**: Create a class section cohort.
- **Related File**: `server.js` (line 2149)
- **Request Body**: `{ "class_name": "CSE", "section": "B", "student_count": 60 }`

#### `PUT /api/classes/:id` & `DELETE /api/classes/:id`
- **Related File**: `server.js` (lines 2189, 2213)

---

### 2.7 Room & Facility Management

#### `GET /api/rooms`
- **Purpose**: Retrieve all campus rooms and laboratories.
- **Related File**: `server.js` (line 2230)
- **Response Format**: `200 OK`
  ```json
  [
    {
      "id": "101",
      "room_number": "101",
      "room_type": "Classroom",
      "capacity": 60,
      "availability": "Available"
    },
    {
      "id": "Lab-1",
      "room_number": "Lab-1",
      "room_type": "Laboratory",
      "capacity": 40,
      "availability": "Available"
    }
  ]
  ```

#### `POST /api/rooms`
- **Purpose**: Register a new room or laboratory.
- **Related File**: `server.js` (line 2250)
- **Request Body**:
  ```json
  {
    "room_number": "Room-305",
    "room_type": "Classroom",
    "capacity": 55,
    "availability": "Available"
  }
  ```
- **Validation**: `room_type` must be `'Classroom'` or `'Laboratory'`. `capacity` must be > 0.

#### `PUT /api/rooms/:id` & `DELETE /api/rooms/:id`
- **Related File**: `server.js` (lines 2326, 2369)

---

### 2.8 Teacher Availability Diary

#### `GET /api/teacher-availability`
- **Purpose**: Retrieve teacher availability slot matrix.
- **Related File**: `server.js` (line 2390)

#### `POST /api/teacher-availability`
- **Purpose**: Persist teacher availability slots.
- **Related File**: `server.js` (line 2431)
- **Request Body**: `{ "teacher_id": "t_1", "availability": { "Monday": ["09:00", "10:00"] } }`

---

### 2.9 Timetable Generation Engine

#### `POST /api/generate` (Aliases: `/api/generate-timetable`, `/api/timetable/generate`)
- **Purpose**: **Primary scheduling engine**. Executes the multi-constraint generation solver.
- **Related File**: `server.js` (lines 2573–4251)
- **Request Body**:
  ```json
  {
    "department": "Computer Science & Engineering",
    "teachers": [
      {
        "name": "Dr. Rahul",
        "subjects": ["DBMS", "DSA"],
        "is_na": false
      },
      {
        "name": "Prof. Sharma",
        "subjects": ["Web Tech"],
        "is_na": false
      }
    ],
    "subjects": ["DBMS", "DSA", "Web Tech"],
    "sections": ["CSE-A", "CSE-B"],
    "rooms": [
      { "room_number": "101", "room_type": "Classroom", "capacity": 60 },
      { "room_number": "Lab-1", "room_type": "Laboratory", "capacity": 40 }
    ],
    "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "working_start_time": "09:00",
    "working_end_time": "16:20",
    "day_periods": {
      "Monday": 8, "Tuesday": 8, "Wednesday": 8, "Thursday": 8, "Friday": 8
    },
    "breaks": [
      {
        "name": "Lunch Break",
        "day": "All Working Days",
        "start_time": "12:20:00",
        "end_time": "13:00:00",
        "type": "Lunch Break"
      }
    ],
    "lab_classes": [
      {
        "subject": "DBMS Lab",
        "teacher": "Dr. Rahul",
        "sections": ["CSE-A"],
        "days": ["Tuesday"],
        "duration": 2,
        "room": "Lab-1"
      }
    ]
  }
  ```
- **Validation Rules**:
  - `department`: Non-empty string required (`HTTP 400`).
  - `teachers`: At least 1 teacher; unique names required (`HTTP 400`).
  - `subjects`: Unique names; cannot exceed `Teachers + 2` (`HTTP 400`).
  - `sections`: At least 1 section; unique names required (`HTTP 400`).
  - `lab_classes`: Requires at least one configured `Laboratory` room (`HTTP 400`).
- **Response Format**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Timetable generated successfully.",
    "entries": [ ... ],
    "total_slots": 80,
    "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "day_periods": { "Monday": 8, ... },
    "teacher_workload": [
      {
        "teacher": "Dr. Rahul",
        "total_lectures": 16,
        "daily_average": 3.2,
        "days_active": 5,
        "off_days": 0,
        "workload_percentage": 64,
        "is_overloaded": false
      }
    ],
    "conflicts": []
  }
  ```

---

### 2.10 Timetable Retrieval, Editing & Workload

#### `GET /api/timetable`
- **Purpose**: Retrieve active timetable entries.
- **Related File**: `server.js` (line 4256)
- **Query Parameters**:
  - `department` *(optional)*: Filter entries by department name (e.g. `?department=Computer Science & Engineering`).
- **Response Headers**:
  - `X-Working-Days`: JSON array of configured working days.
  - `X-Day-Periods`: JSON object of day-to-period counts.
- **Response Format**: `200 OK` Array of timetable slot objects.

#### `PUT /api/timetable`
- **Purpose**: Update active timetable entries in-place (from interactive editor).
- **Related File**: `server.js` (line 4492)
- **Request Body**: Array of updated timetable entry objects.
- **Response Format**: `200 OK` `{ "success": true, "entries_count": 80 }`

#### `DELETE /api/timetable`
- **Purpose**: Clear the active generated timetable.
- **Related File**: `server.js` (line 4454)
- **Response Format**: `200 OK` `{ "success": true, "message": "Timetable deleted successfully." }`

#### `GET /api/timetable/workload`
- **Purpose**: Calculate and retrieve faculty workload metrics based on active timetable.
- **Related File**: `server.js` (line 4422)
- **Response Format**: `200 OK` Array of workload objects.

#### `GET /api/timetable/metadata`
- **Purpose**: Retrieve scheduling metadata (teachers, subjects, sections, rooms) for editor dropdowns.
- **Related File**: `server.js` (line 4700)

#### `POST /api/timetable/validate-entry`
- **Purpose**: Live validation of a single candidate assignment during manual editing.
- **Related File**: `server.js` (line 4900)
- **Request Body**:
  ```json
  {
    "entry": {
      "timetable_id": "tt_1",
      "day": "Monday",
      "period_number": 2,
      "start_time": "10:00:00",
      "end_time": "11:00:00",
      "teacher_name": "Dr. Rahul",
      "room_name": "101",
      "section": "CSE-A",
      "course_name": "DBMS"
    },
    "excludeId": "tt_1"
  }
  ```
- **Response Format**: `200 OK` `{ "valid": true, "error": null }` or `{ "valid": false, "error": "Room 101 is already occupied at this time." }`

#### `DELETE /api/timetable/entry/:id`
- **Purpose**: Delete a single timetable entry and return real-time recomputed faculty workload.
- **Related File**: `server.js` (line 4922)
- **Response Format**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Timetable entry deleted successfully.",
    "deleted_entry": { ... },
    "teacher_workload": [ ... ]
  }
  ```

---

### 2.11 Storage Dashboard & Historical Versions

#### `GET /api/storage`
- **Purpose**: Retrieve storage dashboard metrics (teacher count, room count, generation history, retained versions).
- **Related File**: `server.js` (line 4971)

#### `GET /api/storage/timetable/:id`
- **Purpose**: Retrieve a specific historical timetable generation version by version ID.
- **Related File**: `server.js` (line 5156)

#### `GET /api/storage/timetable/:id/pdf`
- **Purpose**: Download landscape PDF of a specific historical timetable version.
- **Related File**: `server.js` (line 5200)
- **Response Format**: `200 OK` Binary stream (`Content-Type: application/pdf`).

---

### 2.12 PDF Generation

#### `GET /api/timetable/pdf`
- **Purpose**: **Download publication-quality landscape PDF of active timetable**.
- **Related File**: `server.js` (line 5235) & `utils/pdfGenerator.js`
- **Query Parameters**:
  - `department` *(optional)*: Filter PDF output to specific department.
  - `section` *(optional)*: Filter PDF output to specific section.
- **Response Headers**:
  - `Content-Type`: `application/pdf`
  - `Content-Disposition`: `attachment; filename="SchedX_Timetable_Computer_Science_Engineering.pdf"`
- **Response Format**: `200 OK` Raw binary PDF 1.4 buffer.

---

### 2.13 Live Current Class Monitor

#### `GET /api/current-class`
- **Purpose**: Calculate real-time active lectures based on current server clock time and weekday.
- **Related File**: `server.js` (line 5275)
- **Response Format**: `200 OK`
  ```json
  {
    "has_current_class": true,
    "day": "Monday",
    "current_time": "10:35 AM",
    "classes": [
      {
        "course_name": "DBMS",
        "teacher_name": "Dr. Rahul",
        "section": "CSE-A",
        "room_name": "101",
        "start_time": "10:00 AM",
        "end_time": "11:00 AM"
      }
    ]
  }
  ```

---

### 2.14 Interactive Calendar To-Do Planner

#### `GET /api/todos`
- **Purpose**: Retrieve all calendar to-do items from `data/todos.json`.
- **Related File**: `server.js` (line 5333)

#### `POST /api/todos`
- **Purpose**: Create a new calendar to-do item.
- **Related File**: `server.js` (line 5367)
- **Request Body**:
  ```json
  {
    "title": "Faculty Meeting on Midterms",
    "date": "2026-10-25",
    "time": "14:00",
    "category": "Academic"
  }
  ```

#### `PUT /api/todos/:id` & `DELETE /api/todos/:id`
- **Related File**: `server.js` (lines 5431, 5505)

---

### 2.15 Formspark Feedback Gateway Proxy

#### `POST /api/feedback`
- **Purpose**: Proxies user feedback to Formspark endpoint (`https://submit-form.com/k2ffqAiIu`) without exposing third-party URLs to the client.
- **Related File**: `server.js` (line 5538)
- **Request Body**:
  ```json
  {
    "name": "Prof. David",
    "email": "david@college.edu",
    "category": "Feature Request",
    "message": "Please add elective course clustering."
  }
  ```
- **Validation**: `message` must be a non-empty string (`HTTP 400`).
- **Response Format**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Thank you! Your feedback has been submitted successfully."
  }
  ```

---

## 3. External Integrations & Configuration Variables

SchedX communicates with external services using only official environment variables loaded via `dotenv`:

| Variable Name | Required | Role | Secret Protection Level |
|---|---|---|---|
| `PORT` | Optional (Default: `3000`) | Network port for Express server. | Public Configuration |
| `SUPABASE_URL` | Optional (Required for Cloud) | HTTPS endpoint URL of the Supabase project. | Public Project Identifier |
| `SUPABASE_SECRET_KEY` | Optional (Required for Cloud) | Service-role / backend access secret key. | **Strictly Secret** (Never exposed to client) |

---
&copy; 2025–2026 SchedX API Architecture Team.
