# 🚀 SchedX — Quick Start & Instant Website Access

> [!IMPORTANT]
> ### 🔗 Open Website Directly (Clickable Links)
> As long as your SchedX server is running, click any of the links below to open the application immediately:
> - 🌐 **Main Application (Home)**: [http://localhost:3000](http://localhost:3000)
> - ⚡ **Timetable Generator**: [http://localhost:3/000/generate](http://localhost:3000/generate)
> - 🧩 **Features & Settings**: [http://localhost:3000/features](http://localhost:3000/features)
> - 🏫 **Rooms Management**: [http://localhost:3000/rooms.html](http://localhost:3000/rooms.html)
> - 👩‍🏫 **Teacher Availability**: [http://localhost:3000/teacher-availability.html](http://localhost:3000/teacher-availability.html)
> - ℹ️ **About SchedX**: [http://localhost:3000/about](http://localhost:3000/about)
> - 🩺 **Backend Health API**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## ❓ Why Did `localhost:3000` Not Work?

If clicking `http://localhost:3000` resulted in **"This site can’t be reached"** or **`ERR_CONNECTION_REFUSED`**, here is why:

1. **`localhost` is NOT a live internet website**:  
   `localhost` refers to your own computer (`127.0.0.1`). It is not an online web address hosted in the cloud. It only works when a local web server program (`node server.js`) is **actively running** on your computer.

2. **The local Node.js server was not started or was stopped**:  
   If you close the terminal window or haven't run `npm start`, no process is listening on port 3000. Your browser knocks on port 3000, finds nothing answering, and shows connection refused.

3. **Directly opening `index.html` as a file (`file:///...`) breaks styling & APIs**:  
   If you double-click `public/index.html` from Windows Explorer, your browser opens it as a local file (`file:///C:/Users/...`). Because modern web applications use root paths (`/style.css`, `/script.js`, and `/api/*`), the browser cannot locate the CSS or backend API without the HTTP web server running.

4. **Previous outdated folder path**:  
   The previous setup instructions referred to an older directory name (`SIH25091_Smart_Timetable_WORKING`). Your active project is located in `C:\Users\acer\Downloads\SchedX`.

---

## ⚡ Fastest Ways to Open the Website (Zero Friction)

### 🥇 Option 1: 1-Click Instant Launcher (Fastest — 2 Seconds!)
A pre-configured Windows launcher script has been created in your project root:
1. In your project folder, simply **double-click [`start-schedx.bat`](file:///c:/Users/acer/Downloads/SchedX/start-schedx.bat)**.
2. It automatically verifies if the server is running, starts it in the background if needed, and **immediately opens [http://localhost:3000](http://localhost:3000) in your default browser**.

---

### 🥈 Option 2: Run via Terminal / VS Code
Open PowerShell or Command Prompt and run:
```bash
# 1. Go to project directory
cd C:\Users\acer\Downloads\SchedX

# 2. Start the server
npm start
```
Once you see `✓ SchedX running at http://local
host:3000`, click:  
👉 **[http://localhost:3000](http://localhost:3000)**

*(Or open a second terminal tab and type `npm run open` to launch the browser automatically).*

---

## 🎯 What to Expect When You Open SchedX

✅ **Modern Glassmorphic UI**: Fast, responsive timetable generator interface.  
✅ **Zero Database Hassle**: Uses Supabase PostgreSQL with built-in resilient local file fallback storage (`data/timetable_store.json`).  
✅ **Multi-Subject Scheduling**: Teachers can be assigned multiple subjects or marked as `NA` for automatic workload assignment.  
✅ **Strict Conflict Prevention**: Prevents faculty double-booking, class room clashes, and room capacity violations.  
✅ **Persistent Schedules**: Timetables persist across page refreshes and browser restarts.  

---

## 📝 Sample Quick Test

To verify timetable generation in under 1 minute:

1. Open **[http://localhost:3000/generate](http://localhost:3000/generate)**
2. Enter the following sample inputs:
   - **Department**: `Computer Science & Engineering`
   - **Teacher**: `Dr. Rahul Kumar` (Subject: `DBMS`, Specialization: `Database Systems`)
   - **Course/Subject**: `DBMS`
   - **Class**: `BCA` | **Section**: `A` | **Students**: `40`
   - **Room Type**: `Classroom`
   - **Working Days**: `5`
   - **Working Hours**: `09:00` to `16:00`
3. Click **Generate Timetable**.
4. The system will build a conflict-free weekly schedule and display it in the interactive timetable matrix.

---

## 🔗 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | [`/api/health`](http://localhost:3000/api/health) | Check server and database health |
| `POST` | `/api/generate-timetable` | Generate conflict-free schedule |
| `GET` | `/api/timetable` | Fetch current active timetable |
| `DELETE` | `/api/timetable` | Clear generated timetable |
| `GET` | `/api/rooms` | Retrieve institutional room list |
| `GET` | `/api/departments` | Retrieve configured departments |

---

## 🐛 Troubleshooting Guide

| Problem | Cause | Quick Fix |
|---------|-------|-----------|
| **"This site can't be reached" (ERR_CONNECTION_REFUSED)** | Node.js server is not running on port 3000 | Double-click [`start-schedx.bat`](file:///c:/Users/acer/Downloads/SchedX/start-schedx.bat) or run `npm start` in `C:\Users\acer\Downloads\SchedX`. |
| **"Port 3000 in use" / EADDRINUSE** | Another process is holding port 3000 | In PowerShell, run: `Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force`, then run `npm start`. |
| **Broken CSS styling or blank screen** | Opened `index.html` via `file:///` instead of HTTP server | Access the app via [http://localhost:3000](http://localhost:3000) through the Express server. |
| **Database notice in /api/health** | Supabase network access is unavailable | SchedX automatically falls back to local JSON storage in `data/`, allowing offline timetable generation. |

---

## 📁 Key Project Files

| File | Purpose |
|------|---------|
| [`start-schedx.bat`](file:///c:/Users/acer/Downloads/SchedX/start-schedx.bat) | 1-Click batch launcher (boots server & opens browser) |
| [`server.js`](file:///c:/Users/acer/Downloads/SchedX/server.js) | Express backend server, routing & generation engine |
| [`public/index.html`](file:///c:/Users/acer/Downloads/SchedX/public/index.html) | Home page & navigation |
| [`public/generate.html`](file:///c:/Users/acer/Downloads/SchedX/public/generate.html) | Timetable generation studio |
| [`public/features.html`](file:///c:/Users/acer/Downloads/SchedX/public/features.html) | Feature showcase and institutional modules |
| [`public/script.js`](file:///c:/Users/acer/Downloads/SchedX/public/script.js) | Frontend interactive scheduling logic |
| [`public/style.css`](file:///c:/Users/acer/Downloads/SchedX/public/style.css) | Custom styling system |
| [`.env`](file:///c:/Users/acer/Downloads/SchedX/.env) | Port and Supabase configuration |

---

**Version**: 2.0.0 (SchedX)  
**Status**: Ready to use  
**Direct Link**: 👉 [http://localhost:3000](http://localhost:3000)
