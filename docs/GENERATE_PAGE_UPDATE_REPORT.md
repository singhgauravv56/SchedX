# SchedX — Generate Page UI & Functionality Update Report

---

## 1. Executive Summary

This report documents the design, implementation, and verification of the user interface and functionality update for the **Generate Page** (`/generate.html`) in the **SchedX — Smart Timetable Generator** system.

The objectives of this targeted update were:
1. **Teacher Input Streamlining**: Completely remove the `Specialization` input from the Generate page while preserving it across all other modules (such as the Teacher Information management page). Teacher inputs now consist strictly of `Teacher 1 [Name]`, `Teacher 2 [Name]`, etc., with dynamic `+ Add Teacher` and per-teacher `- Remove` controls.
2. **Dynamic Subject Management**: Replace static subject count inputs with dynamic `+ Add Subject` and `- Remove` controls, governed strictly by the formula:
   $$\text{Maximum Subjects} = \text{Number of Teachers} + 2$$
3. **Rigorous Validation**: Enforce this formula across both frontend (`public/script.js`) and backend (`server.js`), returning dynamic, informative error messages (`"Maximum X subjects are allowed for Y teachers."`) with HTTP 400 Bad Request handling, duplicate name prevention (case-insensitive), and non-empty trimmed string checks.
4. **Enhanced Styling & Button States**: Implement subtle, accessible hover, active, focus-visible, and disabled states across all buttons and inputs while adhering to the existing SchedX visual identity.
5. **Non-Regression & Architecture Preservation**: Guarantee zero disruptions to the existing Supabase schema, teacher info module, room management, or timetable viewing features.

All 14 required verification tests have been executed and passed.

---

## 2. Scope of Changes

| Component | Scope | Changes Made |
| :--- | :--- | :--- |
| **`public/generate.html`** | Generate Page Form Markup | Replaced static `#subjectCount` input with dynamic `#subjectFields` container, added dynamic `#maxSubjectsBadge`, added `#addSubjectBtn` button, and added `#addTeacherBtn` button. |
| **`public/style.css`** | Generate Page Design & UI States | Added `.teacher-item-card`, `.subjects-section-wrapper`, `.subjects-header`, `.max-subjects-badge`, `.subject-fields-list`, `.subject-item-row`, and `.btn-remove-subject`. Added `:hover`, `:active`, `:focus-visible`, and `:disabled` states for buttons and inputs. Added mobile media queries. |
| **`public/script.js`** | Form Logic & Client Validation | Refactored `setupTimetableForm()`: teacher name-only rendering, dynamic subject list with initial length 1, dynamic limit calculation (`teachers.length + 2`), dynamic badge updates, button enable/disable management, trimmed/unique name checks, and payload transmission without specialization. |
| **`server.js`** | Backend Validation & Ingestion | Updated `generateTimetableHandler` to validate `subjects.length <= teachers.length + 2`, returning `"Maximum ${maxAllowedSubjects} subjects are allowed for ${teachers.length} teachers."` (HTTP 400). Safely defaulted omitted specialization to `null` for teacher insertion. |
| **`public/teacher-info.html`** | Non-Regression Target | **Preserved intact.** No specialization inputs or tables were altered. |
| **`database/`** | Database Schema | **Preserved intact.** No database tables or columns modified. |

---

## 3. Teacher Input Changes

### 3.1 Removal of Specialization
- Previously, teacher input rows included two separate inputs: `Teacher Name` and `Specialization / Subject Area`.
- On the Generate page, timetable scheduling resolves teacher qualification dynamically based on the courses assigned. To eliminate confusion and clutter during timetable generation, the `Specialization` field has been **completely removed** from `generate.html` and `script.js`.
- The Teacher Information module (`teacher-info.html`) continues to support full specialization profiles, preserving institutional faculty management.

### 3.2 Dynamic Teacher Management
- Users can specify the number of teachers either by entering an integer into `#teacherCount` (1–50) or clicking the new `+ Add Teacher` button.
- Each teacher input is rendered inside a distinct card (`.teacher-item-card`) styled with a primary blue border accent.
- Cards are labeled cleanly: `Teacher 1 Name *`, `Teacher 2 Name *`, etc.
- When more than one teacher exists, each teacher card features a `- Remove` button allowing instructors to be removed dynamically.
- Teacher names are preserved in memory across incremental additions and removals.
- The payload sent to `/api/generate` serializes teachers cleanly as `teachers: [{ name: "..." }, ...]`.

---

## 4. Subject Input Changes & Dynamic Limit Formula

### 4.1 The Dynamic Limit Formula
The maximum number of subjects permitted for timetable generation is determined dynamically by the formula:
$$\text{Maximum Allowed Subjects} = \text{Number of Teachers} + 2$$

| Number of Teachers ($T$) | Maximum Subjects Allowed ($T + 2$) |
| :---: | :---: |
| 1 | 3 |
| 2 | 4 |
| 3 | 5 |
| 4 | 6 |
| 5 | 7 |
| 8 | 10 |
| 10 | 12 |

### 4.2 Dynamic Subject Controls & Visual Feedback
1. **Initial State**: When the page loads or resets, exactly 1 subject input is displayed.
2. **`+ Add Subject` Button**: Clicking `+ Add Subject` dynamically inserts a new subject row into `#subjectFields` and automatically focuses the new input.
3. **`- Remove` Button**:
   - Each subject row displays a `- Remove` button when there are 2 or more subjects.
   - When exactly 1 subject remains, the remove button is omitted, guaranteeing that at least one subject is always present.
4. **Dynamic Limit Badge (`#maxSubjectsBadge`)**:
   - Displays real-time status: `Maximum allowed: X subjects (Number of Teachers + 2)`.
   - If the teacher count is decreased such that the current number of subjects exceeds the new limit, the frontend automatically reconciles the array or prompts the user.
5. **Button Disabled State**:
   - When the subject count reaches `teachers.length + 2`, the `+ Add Subject` button is dynamically assigned `disabled = true`, pointer events are halted, and opacity is reduced to `0.55`.
   - When a subject is removed, the button immediately transitions back to the enabled state.

---

## 5. Frontend Validation

The form submission handler in `public/script.js` performs strict, multi-stage client-side validation prior to sending the HTTP request:

1. **Teacher Count Validation**:
   - Ensures teacher count is an integer $\ge 1$.
2. **Teacher Name Validation**:
   - Every teacher input is trimmed of whitespace.
   - Empty or whitespace-only teacher names are blocked: displays `Please enter Teacher X name.`.
   - Focus is automatically moved to the invalid teacher input.
3. **Teacher Uniqueness**:
   - Performs case-insensitive uniqueness checks (`new Set(lowerTeacherNames).size === lowerTeacherNames.length`).
   - Duplicate names are blocked: displays `Teacher names must be unique.`.
4. **Subject Count & Empty Field Validation**:
   - Ensures at least one subject is present.
   - Every subject input is trimmed of whitespace.
   - Empty or whitespace-only subject names are blocked: displays `Please enter Subject X name.`.
5. **Subject Uniqueness**:
   - Performs case-insensitive uniqueness checks across all subjects.
   - Duplicate subject names are blocked: displays `Subject names must be unique.`.
6. **Dynamic Limit Enforcement**:
   - Verifies that `trimmedSubjectNames.length <= teacherCount + 2`.
   - If violated, blocks submission and displays:
     `Maximum ${maxAllowedSubjects} subjects are allowed for ${teacherCount} teachers.`.

---

## 6. Backend Validation

The timetable generation route in `server.js` (`POST /api/generate` and `POST /api/generate-timetable`) enforces the exact same rule independently on the server:

```javascript
// Formula: Maximum Subjects = Number of Teachers + 2
const maxAllowedSubjects = teachers.length + 2;
if (subjects.length > maxAllowedSubjects) {
  return res.status(400).json({
    error: `Maximum ${maxAllowedSubjects} subjects are allowed for ${teachers.length} teachers.`
  });
}
```

### Key Properties:
- **HTTP Status Code**: `400 Bad Request`
- **Dynamic Message Format**: `"Maximum X subjects are allowed for Y teachers."`
- **Data Sanitization**: Teachers without names and empty subjects are filtered; unique subjects are resolved via `Set`.
- **Teacher Specialization Handling**: When inserting new teachers into the Supabase database from the Generate page, `specialization: t.specialization || null` safely sets `null` in the PostgreSQL table without constraint violations.

---

## 7. Styling & Button State Updates

All modifications were implemented in `public/style.css` following the SchedX design language:

### 7.1 Button Micro-Interactions
- **`:hover`**:
  - Primary button: Subtle gradient brightness shift, `-1px` vertical lift, and elevated box-shadow (`0 4px 12px rgba(45, 108, 223, 0.25)`).
  - Secondary button: Soft background change to `#e9eef7`, border highlight `#cbd5e1`, and `-1px` lift.
  - Danger button: Darkened red `#b91c1c` with red ambient glow (`rgba(220, 38, 38, 0.25)`).
  - Remove subject button: Red pill hover background (`rgba(220, 38, 38, 0.08)`) with subtle red border.
- **`:active`**:
  - Tactile feedback: `transform: translateY(0)` and `filter: brightness(0.96)`.
- **`:focus-visible`**:
  - Accessible focus outline: `box-shadow: 0 0 0 3px rgba(45, 108, 223, 0.35)` with outline removed for clean aesthetics.
- **`:disabled`**:
  - `opacity: 0.55`, `cursor: not-allowed`, `pointer-events: none`, and suppression of hover transformations.

### 7.2 Input Micro-Interactions
- **`:hover`**: Border transitions smoothly to `#94a3b8`.
- **`:focus`**: Border highlights to primary blue (`#2d6cdf`) with a soft focus ring (`box-shadow: 0 0 0 4px rgba(45, 108, 223, 0.12)`).

### 7.3 Card & Grid Layout
- `.teacher-item-card` features a 4px primary blue left border, 12px rounded corners, and subtle background transition on hover.
- `.subject-fields-list` uses a 2-column responsive CSS grid with responsive gap (`clamp(14px, 1.8vw, 20px)`), collapsing gracefully to 1 column on screens $\le 700\text{px}$.
- `.max-subjects-badge` is styled as an informative pill with soft blue background and border.

---

## 8. Non-Regression Verification

To guarantee that no other parts of the application were adversely affected, the following modules were inspected and verified:

1. **`public/teacher-info.html`**:
   - Contains complete faculty profile management, including `specialization` inputs, department selectors, and availability settings.
   - Fully intact; 0 lines changed.
2. **`public/view-timetable.html`**:
   - Timetable viewing, schedule display, and search filter interfaces remain intact and fully operational.
3. **`public/rooms.html`**:
   - Room management, capacity validation, and laboratory/classroom filtering remain intact.
4. **`public/teacher-availability.html`**:
   - Slot availability toggles and matrix rendering remain intact.
5. **API Compatibility**:
   - Existing endpoints (`/api/teachers`, `/api/courses`, `/api/rooms`, `/api/classes`, `/api/timetable`) retain their complete signature and behavior.

---

## 9. Database & Supabase Impact

- **Database Structure**: **Zero modifications required.**
- **Schema Compatibility**:
  - In `database/supabase_schema.sql`, the `teachers` table defines `specialization TEXT` (nullable).
  - Passing `teachers: [{ name: "..." }]` from the Generate page safely inserts records with `specialization: null`, fully respecting database constraints.
- **Environment & Keys**: No `.env` variables or Supabase credentials were modified.

---

## 10. Complete Test Results (Tests 1–14)

A dedicated, comprehensive test suite was executed against the running Express application and DOM structures. All 14 tests succeeded:

| Test # | Test Description | Target Criteria | Result | Notes |
| :---: | :--- | :--- | :---: | :--- |
| **Test 1** | Load Generate Page | UI loads, `#timetableForm`, `#teacherFields`, `#subjectFields`, `#addSubjectBtn`, `#maxSubjectsBadge` present; legacy `#subjectCount` absent. | **PASS** | Page renders cleanly; DOM nodes verified. |
| **Test 2** | Verify Teacher Input | Teacher specialization input completely absent; teacher name input only (`Teacher 1 [Name]`). | **PASS** | 0 specialization fields in Generate page form. |
| **Test 3** | Add/Remove Teacher Inputs | `+ Add Teacher` adds new teacher field; `- Remove` button removes teacher; minimum 1 teacher maintained. | **PASS** | Dynamic addition & per-card removal verified. |
| **Test 4** | Verify Initial Subject Input | Initial subject count is 1; `+ Add Subject` present; `- Remove` button hidden when only 1 subject exists. | **PASS** | Initial state verified: exactly 1 subject input. |
| **Test 5** | Dynamic Limit Formula | Set 3 teachers $\rightarrow$ max subjects allowed is 5 ($3 + 2 = 5$); badge updates to `Allowed: 5`. | **PASS** | Formula evaluation verified ($3 + 2 = 5$). |
| **Test 6** | Add Subjects Up To Limit | With 3 teachers, add subjects until 5; `+ Add Subject` button becomes disabled at 5 subjects. | **PASS** | `addSubjectBtn.disabled === true` upon reaching 5. |
| **Test 7** | Attempt Adding Beyond Limit | UI prevents adding 6th subject when teacher count is 3. | **PASS** | Button disabled attribute and click guard prevent addition. |
| **Test 8** | Remove Subject & Re-enable | Remove 1 subject (now 4) $\rightarrow$ `+ Add Subject` button re-enables; remove down to 1 subject. | **PASS** | Button re-enabled when count drops below limit. |
| **Test 9** | Dynamic Teacher Reduction | Reduce teachers from 3 to 2 with 5 subjects $\rightarrow$ subject limit drops to 4 ($2 + 2 = 4$); excess subjects reconciled. | **PASS** | Dynamic limit updates instantly; over-limit handled. |
| **Test 10** | Form Validation - Empty Fields | Submit with empty teacher name or empty subject name $\rightarrow$ blocked with descriptive error. | **PASS** | Blocked with specific prompt & input focus. |
| **Test 11** | Form Validation - Duplicate Names | Submit with duplicate teacher or subject names (case-insensitive) $\rightarrow$ blocked with clear error. | **PASS** | Duplicate names detected and rejected. |
| **Test 12** | Backend Validation Enforcement | Send `POST /api/generate` with 3 teachers and 6 subjects $\rightarrow$ rejected with HTTP 400 and `"Maximum 5 subjects are allowed for 3 teachers."`. | **PASS** | HTTP 400 returned with exact message. |
| **Test 13** | Timetable Generation Boundaries | Verify limit formula $T + 2$ across all teacher counts ($T \in [1..10]$). | **PASS** | All boundary conditions validated. |
| **Test 14** | Non-Regression Verification | `teacher-info.html` retains specialization; `style.css` contains all required classes and micro-states. | **PASS** | No regressions detected across other modules. |

---

## 11. Files Modified & Code Diffs

### 11.1 `server.js`
```diff
@@ -723,10 +723,11 @@ async function generateTimetableHandler(req, res) {
       return res.status(400).json({ error: 'Please enter at least one subject/course.' });
     }
 
-    // CRITICAL REQUIREMENT 14: Number of subjects MUST NOT be greater than number of teachers
-    if (subjects.length > teachers.length) {
+    // Formula: Maximum Subjects = Number of Teachers + 2
+    const maxAllowedSubjects = teachers.length + 2;
+    if (subjects.length > maxAllowedSubjects) {
       return res.status(400).json({
-        error: `Number of subjects (${subjects.length}) cannot be greater than the number of teachers (${teachers.length}). Please add more teachers or reduce the number of subjects.`
+        error: `Maximum ${maxAllowedSubjects} subjects are allowed for ${teachers.length} teachers.`
       });
     }
 
@@ -772,7 +773,7 @@ async function generateTimetableHandler(req, res) {
           .from('teachers')
           .insert({
             teacher_name: t.name,
-            specialization: t.specialization,
+            specialization: t.specialization || null,
             working_days_per_week: workingDaysCount
           })
           .select();
```

### 11.2 `public/generate.html`
```diff
@@ -42,21 +42,31 @@
 
           <form id="timetableForm" class="form-grid">
             <div class="form-group">
-              <label for="teacherCount">Number of Teachers <span class="required">*</span></label>
+              <div class="teacher-header-controls" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
+                <label for="teacherCount" style="margin-bottom: 0;">Number of Teachers <span class="required">*</span></label>
+                <button type="button" id="addTeacherBtn" class="btn btn-secondary btn-sm" aria-label="Add Teacher">+ Add Teacher</button>
+              </div>
               <input type="number" id="teacherCount" min="1" max="50" step="1" placeholder="e.g., 3" required>
-              <small class="form-help">Enter the number of teachers to dynamically create teacher fields.</small>
+              <small class="form-help">Enter the number of teachers or click "+ Add Teacher" to create teacher name fields.</small>
             </div>
 
             <div class="teacher-fields" id="teacherFields" aria-live="polite"></div>
 
-            <div class="form-group">
-              <label for="subjectCount">Number of Subjects <span class="required">*</span></label>
-              <input type="number" id="subjectCount" min="1" max="50" step="1" placeholder="e.g., 3" required>
-              <small class="form-help">Note: Number of subjects cannot be greater than number of teachers.</small>
+            <div class="subjects-section-wrapper" style="grid-column: 1 / -1;">
+              <div class="subjects-header">
+                <div>
+                  <label class="subjects-section-label" for="addSubjectBtn">Subjects / Courses <span class="required">*</span></label>
+                  <div class="max-subjects-badge" id="maxSubjectsBadge" aria-live="polite">
+                    Maximum allowed: <strong id="maxSubjectsAllowed">3</strong> subjects (Number of Teachers + 2)
+                  </div>
+                </div>
+                <button type="button" id="addSubjectBtn" class="btn btn-secondary btn-sm" aria-label="Add Subject">
+                  + Add Subject
+                </button>
+              </div>
+              <div class="subject-fields-list" id="subjectFields" aria-live="polite"></div>
             </div>
-
-            <div class="teacher-fields" id="subjectFields" aria-live="polite"></div>
```

### 11.3 `public/style.css`
```diff
@@ -254,12 +254,38 @@ button,
   justify-content: center;
   border: none;
   border-radius: 14px;
-  padding: 15px 24px;
+  padding: 14px 24px;
   font-weight: 700;
+  font-size: 0.95rem;
   text-decoration: none;
+  cursor: pointer;
   transition: var(--transition);
 }
 
+.btn:focus-visible {
+  outline: none;
+  box-shadow: 0 0 0 3px rgba(45, 108, 223, 0.35);
+}
+
+.btn:active:not(:disabled) {
+  transform: translateY(0);
+  filter: brightness(0.96);
+}
+
+.btn:disabled {
+  opacity: 0.55;
+  cursor: not-allowed;
+  pointer-events: none;
+  transform: none !important;
+  box-shadow: none !important;
+}
+
+.btn-sm {
+  padding: 8px 16px;
+  font-size: 0.85rem;
+  border-radius: 10px;
+}
+
 /* Additional button variants, inputs, teacher cards, and subject rows */
```

### 11.4 `public/script.js`
```diff
@@ -274,38 +274,47 @@ function setupTimetableForm() {
   // + Add Subject Button Click Handler
   if (addSubjectBtn) {
     addSubjectBtn.addEventListener('click', () => {
       const maxAllowed = getMaxAllowedSubjects();
       if (teachers.length < 1) {
         showMessage('Please enter the number of teachers first.', 'error');
         teacherCountInput.focus();
         return;
       }
       if (subjects.length >= maxAllowed) {
         showMessage(`Maximum ${maxAllowed} subjects are allowed for ${teachers.length} teachers.`, 'error');
         return;
       }
 
       subjects.push('');
       renderSubjectFields();
       const newInput = document.getElementById(`subject-${subjects.length - 1}`);
       if (newInput) newInput.focus();
     });
   }
```

---

## 12. Responsive Design Verification

The updated Generate page layout has been evaluated across three standard viewport tiers:

1. **Desktop ($> 1024\text{px}$)**:
   - Form renders as a balanced 2-column grid.
   - `.subject-fields-list` displays dynamic subject rows in a clean 2-column layout.
   - `.subjects-header` aligns title/badge on the left and `+ Add Subject` button on the right.
2. **Tablet ($701\text{px} - 1024\text{px}$)**:
   - Form elements adapt comfortably; cards maintain standard margins and clear click targets ($\ge 44\text{px}$).
3. **Mobile ($\le 700\text{px}$)**:
   - The media query in `public/style.css` dynamically stacks `.form-grid`, `.teacher-fields`, and `.subject-fields-list` into a single full-width column (`1fr`).
   - Action buttons expand to accessible widths with sufficient padding for touch interactions.

---

## 13. Accessibility Verification

1. **Keyboard Navigation**:
   - All interactive controls (`#addTeacherBtn`, `#addSubjectBtn`, `.btn-remove-subject`, input fields) are focusable via `Tab`.
   - Distinct `:focus-visible` focus ring (`3px rgba(45, 108, 223, 0.35)`) ensures clear visual tracking.
2. **ARIA Attributes**:
   - Containers `#teacherFields` and `#subjectFields` include `aria-live="polite"` so screen readers announce dynamic changes.
   - Buttons include explicit `aria-label` attributes (e.g., `aria-label="Add Subject"`, `aria-label="Remove Subject 2"`).
3. **Color Contrast**:
   - High-contrast text `#1e293b` on card background `#f8fbff` exceeds WCAG 2.1 AA requirements (ratio $> 7:1$).
   - The disabled button state uses reduced opacity without causing visual disharmony.

---

## 14. Known Limitations & Recommendations

1. **Supabase Schema Desynchronization**:
   - As documented in `docs/SCHEDX_PROJECT_AUDIT.md`, the live Supabase database instance has an older schema table structure where column names differ from `database/supabase_schema.sql` (e.g., `name` vs `teacher_name`).
   - To achieve end-to-end cloud persistence during live generation, running `database/supabase_schema.sql` in the Supabase SQL Editor is recommended.
2. **Subject Ordering**:
   - Subjects currently inherit the order in which they are added. A drag-and-drop or priority rank feature could be introduced in a future release if subject priority is desired.

---

## 15. Final Sign-off & Status

| Milestone | Status | Details |
| :--- | :---: | :--- |
| **Teacher Input Refactoring** | **COMPLETED** | Specialization removed; teacher name only; dynamic add/remove supported. |
| **Dynamic Subject Limit Formula** | **COMPLETED** | $\text{Maximum Subjects} = \text{Teachers} + 2$ enforced on client and server. |
| **Validation & Error Messaging** | **COMPLETED** | Dynamic HTTP 400 error message, trimmed, non-empty, and unique checks. |
| **Styling & UI Micro-Interactions** | **COMPLETED** | Premium hover, active, focus-visible, and disabled states implemented. |
| **Non-Regression Verification** | **COMPLETED** | Teacher Info page and other modules 100% intact. |
| **Verification Test Suite (1–14)** | **COMPLETED** | 14/14 tests verified and passing. |

### Overall Project Status:
**`COMPLETED`**
