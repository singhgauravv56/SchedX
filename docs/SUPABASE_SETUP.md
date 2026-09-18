# Supabase Setup Guide for SchedX

This guide provides complete, step-by-step instructions for setting up **Supabase PostgreSQL** as the database backend for **SchedX — Smart Timetable Generator**.

---

## 1. Create a Supabase Project

1. Visit [https://supabase.com/](https://supabase.com/) and sign in (or create a free account).
2. On your dashboard, click **"New project"**.
3. Choose your organization, enter a project name (e.g., `SchedX`), select a strong database password, and select a region close to your users.
4. Click **"Create new project"** and wait approximately 1–2 minutes for the database to provision.

---

## 2. Locate Your API Credentials

In the Supabase Dashboard:

1. Click on the **Project Settings** (gear icon in the left sidebar).
2. Navigate to **"API"** under the Configuration section (or **"Data API"** / **"API Keys"**).
3. Under **Project URL**, copy the URL (it looks like `https://xxxxxxxxxxxxxxxx.supabase.co`).
4. Under **Project API keys**:
   - **Publishable Key (`anon` / `public`)**: This key is safe for client-side use if Row Level Security is configured.
   - **Secret Key (`service_role` / `secret`)**: This privileged key has full administrative access and bypasses RLS. Copy this key for your backend `.env` file.

> [!CAUTION]
> **CRITICAL SECURITY RULE**: Never expose the `service_role` / Secret Key in frontend JavaScript, HTML, public repositories, or client responses. It must **only** be stored in the server's `.env` file.

---

## 3. Run the Database Schema

1. In your Supabase Dashboard, click on **SQL Editor** (icon with terminal `>_` in the left sidebar).
2. Click **"+ New query"**.
3. Open the file `database/supabase_schema.sql` from the SchedX repository.
4. Copy its entire contents and paste it into the Supabase SQL Editor.
5. Click **"Run"** (or press `Ctrl+Enter`).
6. Verify that the output shows `Success. No rows returned` (or query success message).

This creates all required tables, constraints, foreign keys, indexes, and initial seed data:
- `teachers`
- `courses`
- `teacher_courses`
- `classes`
- `rooms` (with `Classroom` and `Laboratory` type validation)
- `time_slots` (with day and hour constraints)
- `teacher_availability` (with uniqueness constraints)
- `timetable` (with 3-way conflict prevention: teacher collision, class collision, room collision)

---

## 4. Configure Environment Variables in SchedX

1. In your project root, locate or create the `.env` file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your Supabase credentials:
   ```env
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SECRET_KEY=your-service-role-secret-key
   PORT=3000
   ```
3. Save the file. Ensure `.env` is listed in `.gitignore` so it is never committed to version control.

---

## 5. Verify the Connection

You can run the built-in diagnostic script to test your Supabase connection:
```bash
node diagnose.js
```
Expected output:
```
============================================================
  SCHEDX - SUPABASE POSTGRESQL DIAGNOSTIC
============================================================

📋 ENVIRONMENT VARIABLES:
   SUPABASE_URL: ✓ Configured
   SUPABASE_SECRET_KEY: ✓ Configured
   PORT: 3000

🔌 TESTING SUPABASE CONNECTION...
   ✅ Successfully connected to Supabase PostgreSQL cloud database!
============================================================
```

---

## 6. Start the Application

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 7. Troubleshooting

### Problem: `Database connection failed. Please check Supabase configuration.`
- **Cause**: The `SUPABASE_URL` or `SUPABASE_SECRET_KEY` in `.env` is incorrect or missing.
- **Solution**: Double-check the URL and service_role key copied from the Supabase dashboard.

### Problem: `Connected to Supabase, but schema tables are missing.`
- **Cause**: The database tables have not been created yet.
- **Solution**: Open the Supabase SQL Editor and execute `database/supabase_schema.sql`.

### Problem: `Port 3000 is already in use`
- **Cause**: Another service or previous server instance is running on port 3000.
- **Solution**: Change `PORT=3001` in your `.env` file and restart.
