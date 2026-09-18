# SchedX — Smart Timetable Generator

SchedX is an intelligent, automated college and institutional timetable generator built to create conflict-free class, teacher, and room schedules with zero manual scheduling overlap.

The application has been completely migrated to **Supabase PostgreSQL**, eliminating all local database server dependencies while providing seamless cloud persistence, strict relationship constraints, and instantaneous schedule retrieval across page reloads.

---

## 🛠️ Technology Stack

- **Frontend**: Pure HTML5, Vanilla CSS3 (Custom Design System, Glassmorphism, Responsive Grid), Vanilla JavaScript (ES6+)
- **Backend**: Node.js, Express.js REST API
- **Database**: Supabase (Cloud Hosted PostgreSQL Database)
- **Database Client**: `@supabase/supabase-js`

---

## ✨ Key Features

- **⚡ Smart Timetable Generation**: Automatically assigns time slots, rooms, and faculty to courses while strictly validating capacities and working hours.
- **🛡️ 3-Way Conflict Prevention**:
  - No teacher can teach two classes at the same time.
  - No class can be assigned to two rooms or subjects at the same time.
  - No room can be occupied by two classes at the same time.
- **🎯 Teacher-Course Matching**: Teachers are matched exclusively with subjects they are qualified to instruct.
- **👩‍🏫 Persistent Teacher Availability**: Specify teacher availability by day and time slot, persisted directly in Supabase.
- **🏫 Flexible Room Types**: Full support for `Classroom`, `Laboratory`, or `Both` room preferences, validating student counts against room capacity.
- **💾 Cloud Persistence**: Timetables persist in Supabase PostgreSQL; refreshing the browser reloads the active schedule via `GET /api/timetable`.
- **🕒 Current Class Tracking**: `GET /api/current-class` checks real-time active periods based on the current day and clock time.

---

## 🚀 Getting Started & Setup

### 1. Prerequisites
- **Node.js**: v18 or higher (v20+ recommended)
- **npm**: v9 or higher
- A free account at [Supabase](https://supabase.com/)

### 2. Clone / Open Project
Open the project directory in your terminal or preferred editor:
```bash
cd SchedX
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Set Up Supabase Database
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. In the left sidebar, click **SQL Editor** -> **New query**.
3. Open [`database/supabase_schema.sql`](database/supabase_schema.sql), copy all lines, paste into the editor, and click **Run**.
4. All 8 core tables, indexes, constraints, and default seed data will be created instantly.

### 5. Configure Environment Variables
Create your local `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Open `.env` and fill in your Supabase project credentials:
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=your-supabase-service-role-secret-key
PORT=3000
```
*(Find these in your Supabase project under Project Settings -> API / Data API)*

> [!CAUTION]
> Never commit `.env` or expose `SUPABASE_SECRET_KEY` in frontend code or public repositories. It is safely isolated to the Express backend.

### 6. Verify Database Connection
Run the diagnostic check:
```bash
node diagnose.js
```

### 7. Run the Application
```bash
npm start
```
Open your browser and visit:
```
http://localhost:3000
```

---

## 📁 Project Structure

```
SchedX/
├── config/
│   └── supabase.js                # Backend Supabase client module
├── database/
│   ├── supabase_schema.sql        # Supabase PostgreSQL schema & seed data
│   └── archive/                   # Legacy MySQL SQL archives (reference only)
├── docs/
│   └── SUPABASE_SETUP.md          # Comprehensive Supabase step-by-step setup guide
├── public/
│   ├── index.html                 # Home page
│   ├── generate.html              # Timetable generator interface
│   ├── features.html              # Features explorer & capability details
│   ├── teacher-availability.html  # Teacher availability management
│   ├── teacher-info.html          # Teacher profile management
│   ├── rooms.html                 # Room management
│   ├── script.js                  # Frontend API client and form controllers
│   └── style.css                  # Custom styling & responsive layouts
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore rules (.env, node_modules, logs)
├── diagnose.js                    # Database diagnostic utility
├── package.json                   # Project dependencies and npm scripts
├── README.md                      # Documentation
└── server.js                      # Express API server & timetable generation engine
```

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health and Supabase connection check |
| `GET` | `/api/teachers` | Retrieve all faculty records |
| `POST` | `/api/teachers` | Create a faculty record |
| `PUT` | `/api/teachers/:id` | Update a faculty record |
| `DELETE` | `/api/teachers/:id` | Remove a faculty record |
| `GET` | `/api/courses` | Retrieve all courses / subjects |
| `POST` | `/api/courses` | Create a new course |
| `GET` | `/api/classes` | Retrieve all student classes / cohorts |
| `POST` | `/api/classes` | Create a class cohort |
| `GET` | `/api/rooms` | Retrieve all rooms (Classroom/Laboratory) |
| `POST` | `/api/rooms` | Create a room with capacity |
| `GET` | `/api/teacher-availability` | Retrieve saved teacher availability slots |
| `POST` | `/api/teacher-availability` | Persist teacher availability slots |
| `POST` | `/api/generate` | Generate conflict-free timetable and save to Supabase |
| `GET` | `/api/timetable` | Retrieve persistent timetable from Supabase |
| `DELETE`| `/api/timetable` | Clear saved timetable |
| `GET` | `/api/current-class` | Get currently ongoing lecture/lab |

---

## 📬 Contact & Support

- **Email**: [schedx24x7@gmail.com](mailto:schedx24x7@gmail.com)
- **Instagram**: [studyroom.online07](https://www.instagram.com/studyroom.online07?igsi=YXltbm1neDV3dWxn)

---
&copy; 2025–2026 SchedX. All rights reserved.
