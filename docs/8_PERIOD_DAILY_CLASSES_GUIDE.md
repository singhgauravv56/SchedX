# SchedX — 8-Period Daily Classes Guide & Configuration Reference

> **A Complete Blueprint for Generating 100% Clash-Free 8-Period Daily Timetables**  
> *Targeted for Academic Institutions, College Departments, and School Coordinators*

---

## 1. Executive Summary & Why Conflicts Occurred

In previous generations, users observed errors such as:
```text
⚠️ Timetable generated with warnings. Please review the highlighted conflicts. (313 conflict(s) detected)
```

### The Root Causes of the 313 Conflicts:
1. **The "4 Sections vs. 3 Teachers" Bottleneck (Pigeonhole Principle)**:
   - When 4 student sections (`CSE-A`, `CSE-B`, `CSE-C`, `CSE-D`) are configured to take classes simultaneously, but the department only has **3 teachers**, at least one class period will have no available teacher, or a teacher will be assigned to two classes at the exact same hour.
2. **Single-Teacher Subject Monopoly**:
   - `Dr. Rahul Kumar` was assigned as the sole teacher for `DBMS`. Because all 4 sections required `DBMS` (4 theory hours each = 16 hours/week) plus morning practical labs, mathematical overlap was inevitable.
3. **Room Capacity Collisions**:
   - 4 sections running lectures simultaneously need at least **4 distinct classrooms**. When only 1 or 2 rooms were configured, multiple sections were routed into `Room 101`.
4. **Break Time Misalignment**:
   - If periods are set to default 1-hour slots without accommodating lunch breaks (e.g. Period 5 scheduled 13:00–14:00 while Lunch Break is also 13:00–14:00), classes overlap with break time.

---

## 2. The 4 Golden Rules for Conflict-Free Generation

To guarantee a status of **`VALID`** with **`0 conflicts`**, adhere to these mathematical rules:

| Rule | Requirement | Rationale |
| :--- | :--- | :--- |
| **Rule 1: Faculty $\ge$ Sections** | $\text{Number of Teachers} \ge \text{Number of Sections}$ | At any given period, every simultaneous section must have its own dedicated teacher. |
| **Rule 2: Classrooms $\ge$ Sections** | $\text{Number of Theory Rooms} \ge \text{Number of Sections}$ | No two student cohorts can occupy the same room at the same time. |
| **Rule 3: The 4–Break–4 Pattern** | 4 morning periods $\rightarrow$ Lunch $\rightarrow$ 4 afternoon periods | Teaching slots must never overlap with lunch or short break windows. |
| **Rule 4: Multi-Teacher Coverage** | Assign $\ge 2$ faculty for high-demand core subjects | Prevents single-faculty scheduling bottlenecks across multiple sections. |

---

## 3. Standard 8-Period Daily Time Grid (Monday – Friday)

SchedX natively supports flexible minute-level timing in 12-hour AM/PM format. For an **8-period academic day**, the recommended structure uses **50-minute teaching intervals** with a **40-minute lunch break**:

| Period | 24-Hour Time | 12-Hour AM/PM Display | Duration | Ideal Academic Activity |
| :---: | :---: | :---: | :---: | :--- |
| **Period 1** | `09:00 – 09:50` | `09:00 AM – 09:50 AM` | 50 mins | Theory Lecture / Morning Lab Block (P1–P2) |
| **Period 2** | `09:50 – 10:40` | `09:50 AM – 10:40 AM` | 50 mins | Theory Lecture / Morning Lab Block (P1–P2) |
| **Period 3** | `10:40 – 11:30` | `10:40 AM – 11:30 AM` | 50 mins | Theory Lecture / Core Subject |
| **Period 4** | `11:30 – 12:20` | `11:30 AM – 12:20 PM` | 50 mins | Theory Lecture / Core Subject |
| **LUNCH** | `12:20 – 13:00` | `12:20 PM – 01:00 PM` | 40 mins | **Campus-wide Lunch Break (No Classes)** |
| **Period 5** | `13:00 – 13:50` | `01:00 PM – 01:50 PM` | 50 mins | Theory Lecture / Afternoon Lab Block (P5–P6) |
| **Period 6** | `13:50 – 14:40` | `01:50 PM – 02:40 PM` | 50 mins | Theory Lecture / Afternoon Lab Block (P5–P6) |
| **Period 7** | `14:40 – 15:30` | `02:40 PM – 03:30 PM` | 50 mins | Theory Lecture / Elective |
| **Period 8** | `15:30 – 16:20` | `03:30 PM – 04:20 PM` | 50 mins | Theory Lecture / Tutorial / Remedial |

---

## 4. Step-by-Step Configuration Guide (All 10 Steps)

### Step 01: Department
- **Department Name**: Enter your official department name (e.g., `Computer Science & Engineering`).
- *Tip*: Click **"Save Department"** to preserve settings in the department catalog.

### Step 02: Teachers & Assigned Subjects
- **Number of Teachers**: Set to at least the number of sections (e.g., **4 teachers** for 2 sections).
- Configure faculty with complementary subject capabilities:
  1. `Dr. Rahul Kumar` $\rightarrow$ Assigned: `DBMS`, `Computer Networks`
  2. `Prof. Ananya Sharma` $\rightarrow$ Assigned: `Data Structures`, `Algorithms`
  3. `Prof. Rajesh Verma` $\rightarrow$ Assigned: `Operating Systems`, `Computer Networks`
  4. `Dr. Alan Turing` $\rightarrow$ Assigned: `Theory of Computation`, `Algorithms`

### Step 03: Subjects
- Add the academic courses to be taught across the week:
  - `DBMS` (Theory: 4, Lab: 2)
  - `Data Structures` (Theory: 4, Lab: 2)
  - `Operating Systems` (Theory: 4)
  - `Computer Networks` (Theory: 4)
  - `Theory of Computation` (Theory: 4)
  - `Algorithms` (Theory: 4)

### Step 04: Classes / Sections
- Define the student cohorts:
  - Section 1: `CSE-A`
  - Section 2: `CSE-B`

### Step 05: Rooms
- Provide adequate classroom and lab capacity:
  - `Room 201` $\rightarrow$ Type: `Classroom`
  - `Room 202` $\rightarrow$ Type: `Classroom`
  - `Lab-A` $\rightarrow$ Type: `Laboratory`

### Step 06: Periods & Time Span
- Instead of manually setting all 40 slots, click the **"⚡ 8-Period Daily Template"** button in Step 06.
- This automatically configures Monday through Friday with:
  - 8 Periods per day
  - Times: `09:00–09:50`, `09:50–10:40`, `10:40–11:30`, `11:30–12:20`, `13:00–13:50`, `13:50–14:40`, `14:40–15:30`, `15:30–16:20`.

### Step 07: Break Management
- Configure the campus-wide Lunch Break:
  - **Break Name**: `Lunch Break`
  - **Day**: `All Working Days` (or configured per day)
  - **Start Time**: `12:20 PM` (`12:20`)
  - **End Time**: `01:00 PM` (`13:00`)
  - **Break Type**: `Lunch Break`

### Step 08: Lab Classes (Practicals)
- Stagger practical sessions across days so labs and teachers are never doubled:
  - **Session 1**: `DBMS Lab` $\rightarrow$ Teacher: `Dr. Rahul Kumar`, Section: `CSE-A`, Day: `Monday`, Time: `09:00 – 10:40` (Duration: 2), Room: `Lab-A`.
  - **Session 2**: `DBMS Lab` $\rightarrow$ Teacher: `Dr. Rahul Kumar`, Section: `CSE-B`, Day: `Tuesday`, Time: `09:00 – 10:40` (Duration: 2), Room: `Lab-A`.
  - **Session 3**: `Data Structures Lab` $\rightarrow$ Teacher: `Prof. Ananya Sharma`, Section: `CSE-A`, Day: `Wednesday`, Time: `09:00 – 10:40` (Duration: 2), Room: `Lab-A`.
  - **Session 4**: `Data Structures Lab` $\rightarrow$ Teacher: `Prof. Ananya Sharma`, Section: `CSE-B`, Day: `Thursday`, Time: `09:00 – 10:40` (Duration: 2), Room: `Lab-A`.

### Step 09: Schedule Settings & Working Days
- **Working Days**: Select `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday` (5 Working Days).
- **Working Hours**: SchedX automatically adapts the baseline time to `09:00 AM – 04:20 PM` based on your configured periods.

### Step 10: Generate Timetable
- Click **"⚡ Generate Timetable"**.
- Expected Result:
  ```text
  ✓ Timetable generated successfully. (64 periods scheduled for Computer Science & Engineering)
  Status: VALID | Conflicts: 0
  ```

---

## 5. Instant 1-Click Example in the UI

SchedX now includes an automated loader directly on the Generate page:

1. Navigate to **Generate** (`/generate`).
2. Look at the top banner: **"8-Period Daily Classes Template & Working Example"**.
3. Click **"⚡ Load 8-Period Example"**.
   - All 10 form steps instantly populate with this balanced, verified 8-period setup.
4. Scroll to the bottom and click **"Generate Timetable"**.
5. Your clash-free timetable appears immediately above the **SCHEDX TO DO** section!
6. Click **"Download PDF"** or view it in **Features $\rightarrow$ Storage**.

---

## 6. Mathematical Verification Checklist

Before clicking generate, verify this quick 5-point checklist:

- [x] **Faculty Check**: $\text{Teachers (4)} \ge \text{Sections (2)}$ $\rightarrow$ **PASS**
- [x] **Room Check**: $\text{Classrooms (2)} \ge \text{Sections (2)}$ $\rightarrow$ **PASS**
- [x] **Lab Availability**: 1 Lab Room with staggered days (Mon, Tue, Wed, Thu) $\rightarrow$ **PASS**
- [x] **Time Continuity**: No period overlaps with Lunch Break (`12:20–13:00`) $\rightarrow$ **PASS**
- [x] **Teacher Daily Load**: No teacher assigned $> 4$ classes per day $\rightarrow$ **PASS**
