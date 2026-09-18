# Smart Timetable Generator

This project is a basic but functional college timetable generator built with HTML, CSS, JavaScript, Node.js, Express, MySQL, mysql2, and dotenv.

## Important MySQL note

VS Code MySQL Extension = not the same as MySQL Server.

The VS Code MySQL extension is only a tool that can connect to a MySQL server. It does not install or run MySQL Server itself.

If MySQL Server is missing, the app cannot connect to the database. You must install MySQL Server first.

## Project requirements

- Node.js 18+
- MySQL Server 8+
- npm
- VS Code MySQL extension only for database inspection if you want it

## Install MySQL Server

### Option A: MySQL Community Server (recommended)
1. Download MySQL Installer or Community Server from:
   https://dev.mysql.com/downloads/mysql/
2. Install MySQL Server and note the password for root if you set one.
3. Start the MySQL service.

### Option B: XAMPP (easy option)
1. Download XAMPP from:
   https://www.apachefriends.org/
2. Install it.
3. Start MySQL from the XAMPP Control Panel.

## Check whether MySQL Server is running

### Windows PowerShell
```powershell
Get-Service | Where-Object {$_.Name -match "MySQL"}
```

You should see a service whose status is Running.

### Command prompt
```cmd
net start MySQL80
```

If your MySQL version is not 8.0, replace the number with your installed version (for example MySQL57).

## Project setup

### 1. Open the project folder
```bash
cd C:\Users\acer\Downloads\SIH25091_Smart_Timetable_WORKING
```

### 2. Install Node dependencies
```bash
npm install
```

### 3. Create your environment file
Create a local `.env` file from the example file:

Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

Linux/macOS:
```bash
cp .env.example .env
```

Example `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=smart_timetable
PORT=3000
```

Important:
- Do not hard-code your password into the project files.
- Use your own MySQL root password if you created one.
- If your MySQL server uses no password, leave `DB_PASSWORD=` empty.

## Import the database schema

Use the SQL file in:

`database/timetable.sql`

Import it into MySQL with a command like:

```bash
mysql -u root -p smart_timetable < database/timetable.sql
```

Or use the VS Code MySQL extension to run the file manually after connecting to a live MySQL server.

## Run the app

```bash
npm start
```

Then open the website at:

```text
http://localhost:3000
```

## File locations

- Main backend: `server.js`
- Frontend page: `public/index.html`
- Frontend logic: `public/script.js`
- Frontend styling: `public/style.css`
- Database schema: `database/timetable.sql`
- Environment template: `.env.example`

## Backend and frontend flow

1. The browser loads the form from `public/index.html`.
2. JavaScript in `public/script.js` sends requests to the Express API.
3. `server.js` uses `mysql2` to connect to MySQL.
4. The database stores teachers, courses, classes, rooms, time slots, and timetable rows.
5. The backend validates the input and generates a conflict-free schedule.
6. The saved timetable is fetched again when the page refreshes.

## API routes

- `GET /api/health` – checks database connection
- `GET /api/teachers` – list teachers
- `POST /api/teachers` – add teacher
- `GET /api/courses` – list courses
- `POST /api/courses` – add course
- `GET /api/classes` – list classes
- `POST /api/classes` – add class
- `GET /api/rooms` – list rooms
- `POST /api/rooms` – add room
- `POST /api/generate` – generate timetable
- `POST /api/generate-timetable` – same as above
- `GET /api/timetable` – load saved timetable
- `DELETE /api/timetable` – clear timetable

## What the system checks before scheduling

- Teacher works on that day
- Teacher is available at that time
- Class is not busy at that time
- Room is free at that time
- Room type matches the required room type
- Room capacity is large enough
- Teacher teaches the selected course
- Teacher department matches the selected department
- No duplicate timetable entries

If no valid combination can be found, the app shows a human message instead of a raw SQL error.

## Helpful commands

Install dependencies:
```bash
npm install
```

Start the app:
```bash
npm start
```

Check running MySQL services:
```powershell
Get-Service | Where-Object {$_.Name -match "MySQL"}
```

## Important note before testing

The app will not run until MySQL Server is installed and the `.env` file is configured correctly.

The VS Code MySQL extension alone is not enough.

## Troubleshooting

### Error: Unable to connect to MySQL Server
Cause:
- MySQL Server is not installed
- MySQL Server is not running
- `.env` credentials are wrong

Fix:
1. Install MySQL Server
2. Start the service
3. Copy `.env.example` to `.env`
4. Set your real database username/password
5. Run `npm start`

### Error: Access denied for user 'root'
- Check DB_PASSWORD in `.env`
- If you set a password during MySQL installation, use it
- If you did not set a password, leave it empty

## Basic usage

1. Fill in teacher name.
2. Enter working days per week.
3. Enter course name.
4. Select department and room type.
5. Enter class and section.
6. Enter student count.
7. Click Generate Timetable.
8. View the timetable and refresh the page to verify it persists.

## Technology stack

- Frontend: HTML + CSS + JavaScript
- Backend: Node.js + Express
- Database: MySQL
- Database driver: mysql2
- Environment variables: dotenv

## Final note

This is the basic version of the project, built to be easy to understand and fully functional once MySQL Server is installed and configured.

### "MySQL is not reachable"
- Check MySQL is running
- Verify `.env` credentials
- Ensure database user has permissions

### "Database already exists errors"
These are normal on first run - the system skips existing tables.

### "Port 3000 is already in use"
Either:
- Close the application using port 3000
- Change PORT in `.env` file

## Features & Workflow

```
USER INPUT FORM
    ↓
VALIDATE INPUT
    ↓
CREATE/CHECK RESOURCES (Teachers, Courses, Classes, Departments)
    ↓
FIND SUITABLE ROOMS
    ↓
GENERATE TIME SLOTS
    ↓
CHECK ALL CONFLICTS
    ↓
GENERATE TIMETABLE
    ↓
SAVE TO MYSQL
    ↓
DISPLAY TIMETABLE
    ↓
PERSIST DATA
```

## License

Educational project for SIH25091

---

**For questions or issues, review the error message and ensure:**
1. MySQL is running
2. `.env` has correct credentials
3. All form fields are filled correctly
4. Room type and capacity requirements are met
