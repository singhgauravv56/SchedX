# Security Architecture & Vulnerability Review — SchedX

> **Document Version**: 2.0.0  
> **Status**: Comprehensive Security & Threat Model Review  
> **Target Audience**: Security Reviewers, Backend Architects, DevOps Engineers, AI Coding Agents  
> **Related Documents**: [ARCHITECTURE.md](ARCHITECTURE.md) | [DATABASE.md](DATABASE.md) | [API.md](API.md)

---

## 1. Security Design Overview

SchedX is architected with a strict separation between server-side execution and client-side presentation. Sensitive parameters, API tokens, and database service-role secrets are exclusively confined to the Node.js backend. The frontend operates as a static client with zero direct access to environment variables, database drivers, or private cloud endpoints.

This document reviews the existing security controls, identifies confirmed vulnerabilities and architectural risks, and specifies hardening guidelines for future releases.

---

## 2. Secrets & Credential Isolation

### 2.1 Environment Variable Handling
- All configuration variables are loaded using `dotenv` from a local `.env` file into `process.env`.
- `.env` is explicitly declared in `.gitignore` to prevent inadvertent source control leakage.
- A sanitized `.env.example` file is provided as a safe template containing empty keys:
  ```env
  SUPABASE_URL=
  SUPABASE_SECRET_KEY=
  PORT=3000
  ```

### 2.2 Server-Side vs Client-Side Separation
- **Confirmed Safeguard**: `SUPABASE_SECRET_KEY` is loaded and referenced **only** in `config/supabase.js` and `diagnose.js`. It is never bundled, passed through Express templates, or transmitted in any HTTP response payload.
- Client scripts (`public/script.js`, `public/todo.js`) contain zero references to Supabase credentials or database connection strings. All database mutations are mediated via backend `/api/*` endpoints.

---

## 3. Database Access Control & Row Level Security (RLS)

### 3.1 Supabase PostgreSQL RLS
- In `database/supabase_schema.sql` and `supabase/schema.sql`, PostgreSQL Row Level Security is explicitly enabled on all core tables:
  ```sql
  alter table public.teachers enable row level security;
  alter table public.subjects enable row level security;
  alter table public.classes enable row level security;
  alter table public.rooms enable row level security;
  alter table public.timetable enable row level security;
  alter table public.timetable_error_reports enable row level security;
  ```

### 3.2 Permissive Development Policies
- In `supabase/schema.sql`, development policies are defined with open read and write access:
  ```sql
  create policy "development access timetable" on public.timetable 
    for all to anon, authenticated using (true) with check (true);
  ```
- **Risk Assessment**:
  - While suitable for local sandbox development, these policies allow anyone possessing the public Supabase `anon` key to execute arbitrary SELECT, INSERT, UPDATE, and DELETE operations directly via PostgREST.
  - **Hardening Requirement**: In production deployment, replace development policies with role-restricted rules tied to authenticated administrators (`auth.role() = 'authenticated'`).

---

## 4. Input Validation & Data Sanitization

### 4.1 Server-Side Validation Controls
In `server.js` (`generateTimetableHandler` and resource CRUD routes), inputs are strictly validated prior to solver execution:
- **Department**: Rejects empty strings (`HTTP 400`).
- **Teachers**: Requires at least 1 teacher; validates unique names (case-insensitive); enforces valid subject qualifications or explicit `NA`.
- **Subjects**: Enforces the formula `Max Subjects = Teachers + 2`; rejects duplicate course names.
- **Rooms**: Restricts `room_type` strictly to `'Classroom'` or `'Laboratory'`; enforces positive capacity integers (`capacity > 0`).
- **Timing & Spans**: Verifies start time is earlier than end time (`timeToMinutes(start) < timeToMinutes(end)`).
- **Feedback**: Trims message; rejects empty feedback submissions.

### 4.2 Cross-Site Scripting (XSS) Prevention
- In `public/script.js`, dynamic content inserted into the DOM is sanitized using the built-in helper `escapeHtml()`:
  ```javascript
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  ```
- In `utils/pdfGenerator.js`, low-level PDF stream strings are sanitized via `sanitizePdfText()` to escape backslashes, parentheses, and invalid control characters that could break PDF syntax.

---

## 5. Security Threat Matrix & Findings Inventory

The following table distinguishes **Confirmed Vulnerabilities** (evidenced directly in code) from **Potential Architectural Risks** (requiring external threat vectors).

| Finding ID | Vulnerability / Threat | Severity | Classification | Evidence & Impact | Recommended Action |
|---|---|---|---|---|---|
| **SEC-01** | **Unauthenticated Administrative Endpoints** | `High` | `Confirmed Vulnerability` | Endpoints like `POST /api/generate`, `PUT /api/timetable`, `DELETE /api/timetable` have zero authentication middleware. Any network actor can overwrite schedules. | Implement JWT session or Supabase Auth middleware protecting mutating routes. |
| **SEC-02** | **Permissive Supabase RLS Policies** | `Medium` | `Confirmed Vulnerability` | `supabase/schema.sql` lines 99–104 grant `for all to anon using (true)`. Direct PostgREST access is unrestricted. | Restrict policies in production to `service_role` or verified admin users. |
| **SEC-03** | **Open CORS Policy** | `Low` | `Confirmed Risk` | `server.js` uses `app.use(cors())` with default wildcard origins (`*`). | Restrict `cors({ origin: [...] })` to allowed institutional domain names in production. |
| **SEC-04** | **Unbounded JSON Store File Growth** | `Low` | `Confirmed Risk` | While timetable history is bounded (`MAX_RETAINED_GENERATIONS = 2`), `departments.json` and `todos.json` have no file size caps. | Implement record limits and disk usage quotas. |
| **SEC-05** | **Third-Party CDN Dependency** | `Low` | `Potential Risk` | Google Fonts loaded via CDN without Subresource Integrity (SRI) hashes. | Optional: Self-host WOFF2 font files locally in `public/fonts/` for air-gapped security. |
| **SEC-06** | **Denial of Service via Heavy Solver Payloads** | `Medium` | `Potential Risk` | Generating schedules with 100+ teachers and sections could block Node's single-threaded event loop. | Add rate limiting (`express-rate-limit`) and payload size limits on `/api/generate`. |

---

## 6. Safe Configuration & Deployment Practices

For production institutional deployments, follow these mandatory practices:

1. **Environment Isolation**:
   - Store `.env` securely with OS permissions `600` (read/write only by the process owner).
   - Never check `.env` into version control.
2. **Reverse Proxy & TLS**:
   - Deploy Node.js behind a hardened reverse proxy (Nginx, Caddy, or Cloudflare).
   - Terminate SSL/TLS 1.3 at the proxy; do not expose raw HTTP port 3000 to the public internet.
3. **HTTP Security Headers**:
   - Integrate `helmet` middleware in Express to set standard security headers:
     - `Content-Security-Policy (CSP)`
     - `X-Frame-Options: DENY`
     - `X-Content-Type-Options: nosniff`
     - `Strict-Transport-Security (HSTS)`
4. **Regular Dependency Auditing**:
   - Run regular vulnerability audits:
     ```bash
     npm audit
     ```
   - All currently installed dependencies (`express`, `cors`, `dotenv`, `@supabase/supabase-js`, `ws`) currently report 0 known high or critical vulnerabilities.

---
&copy; 2025–2026 SchedX Security Engineering Group.
