# Design System & UI/UX Specifications — SchedX

> **Document Version**: 2.0.0  
> **Status**: `Confirmed` Baseline Design System  
> **Target Audience**: UI/UX Designers, Frontend Developers, QA Engineers, AI Coding Agents  
> **Related Architecture**: [PRD.md](PRD.md) | [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 1. Visual Style & Brand Identity

SchedX employs a modern, clean, and publication-ready academic design language. Rather than relying on generic utility frameworks like Tailwind or Bootstrap, the interface is powered by a proprietary design system authored in pure Vanilla CSS (`public/style.css`, 12,000+ lines).

The design philosophy balances **academic authority** (structured grids, precise typography, reliable data tables) with **contemporary digital elegance** (dark petroleum header accents, royal blue interactive focus states, glassmorphism badges, and subtle architectural background grids).

```
+--------------------------------------------------------------------------+
|  [schedx]                     Home   Generate   Features   About Us       |  <= #1F4E5B
+--------------------------------------------------------------------------+
|                                                                          |
|  * Smart Timetable Generator                                              |
|  schedx                                                                  |  <= Royal Blue Accent
|  Automated, conflict-free institutional scheduling engine...             |     #2d6cdf
|                                                                          |
|  [ Generate Timetable -> ]   [ Explore Features ]                        |
|                                                                          |
+--------------------------------------------------------------------------+
|                                                                          |
|  BENTO GRID & 10-STEP WORKBENCH CARDS                                    |  <= White Canvas
|  32px Subtle Architectural Grid Pattern                                  |     Grid: 1px rgba(15,23,42,0.04)
|                                                                          |
+--------------------------------------------------------------------------+
|  SchedX - Smarter Scheduling             (C) 2025 SchedX. All rights.    |  <= #1F4E5B
+--------------------------------------------------------------------------+
```

---

## 2. Design Tokens & Color Palette

All colors are strictly tokenized as CSS Custom Properties in `:root`.

### Core Color Palette

| Token Name | Hex / CSS Value | Semantic Role | Confirmed Usage |
|---|---|---|---|
| `--nav-footer-bg` | `#1F4E5B` | Primary Header & Footer background | Site header, site footer, brand containment bar |
| `--primary-color` | `#2d6cdf` | Brand Action Accent | Primary buttons, active navigation indicator, CTA badges |
| `--primary-dark` | `#1d4ed8` | Primary Interactive Hover | Button hover state, active pill hover |
| `--primary-soft` | `#eaf1ff` | Subtle Action Background | Active step badges, selected chip backgrounds |
| `--secondary-color` | `#0f172a` | Deep Slate / Structure | Hero subtitle, dark card borders, high-contrast headings |
| `--text-dark` | `#0f172a` | Primary High-Contrast Text | Page titles, table headers, step titles |
| `--text-body` | `#334155` | Body Reading Text | Paragraphs, descriptions, table cell text |
| `--text-muted` | `#526079` | Secondary / Micro Text | Field help text, timestamps, captions, metadata |
| `--bg-white` | `#ffffff` | Primary Surface Canvas | Card bodies, form containers, modal surfaces |
| `--bg-light` | `#f5f7fb` | Alternate Surface Canvas | Table alternate row backgrounds, disabled inputs |
| `--border-color` | `#dfe7f5` | Structural Divider Line | Card outlines, table cell borders, input borders |

### Feedback & Status Colors

| Token Name | Hex Value | Role | Component Example |
|---|---|---|---|
| `--success-color` | `#16a34a` | Valid / Clash-Free State | "VALID" timetable badge, save confirmations |
| `--error-color` | `#dc2626` | Conflict / Error Alert | "WARNING" conflict badge, input error borders |
| `--info-color` | `#0891b2` | Informational Notice | Current class badge, helper tooltips |
| Conflict Highlight | `#fef2f2` / `#ef4444` | Highlighting Clash Cells | Conflicting table rows, collision callouts |

### Background Canvas Treatment
The global `<body>` element uses a crisp white background with a subtle, non-intrusive geometric grid texture:
```css
background-color: #ffffff;
background-image:
  linear-gradient(to right, rgba(15, 23, 42, 0.04) 1px, transparent 1px),
  linear-gradient(to bottom, rgba(15, 23, 42, 0.04) 1px, transparent 1px);
background-size: 32px 32px;
background-position: 0 0;
```

---

## 3. Typography & Font Hierarchy

### Font Families
1. **Display & Headings** (`--font-display`): `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif`
2. **Body Text** (`--font-body`): `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
3. **Brand Wordmark** (`--font-wordmark`): `'Comfortaa', 'Fredoka', 'Plus Jakarta Sans', sans-serif`
4. **Monospace / Code** (`--font-mono`): `ui-monospace, 'SFMono-Regular', Menlo, Monaco, Consolas, monospace`

### Typographic Scale
SchedX utilizes fluid typographic scaling via CSS `clamp()` functions to guarantee optimal legibility from mobile screens to 4K displays:

| Style | CSS Definition | Desktop Size | Mobile Size | Weight |
|---|---|---|---|---|
| **Hero Title** | `clamp(2.35rem, 4.5vw + 0.5rem, 3.65rem)` | ~58px | ~38px | 800 (`--weight-extrabold`) |
| **Heading 1 (H1)**| `clamp(1.85rem, 3.2vw + 0.4rem, 2.5rem)` | ~40px | ~30px | 700 (`--weight-bold`) |
| **Heading 2 (H2)**| `clamp(1.4rem, 2.2vw + 0.3rem, 1.95rem)` | ~31px | ~22px | 700 (`--weight-bold`) |
| **Heading 3 (H3)**| `clamp(1.125rem, 1.2vw + 0.3rem, 1.25rem)`| ~20px | ~18px | 600 (`--weight-semibold`) |
| **Heading 4 (H4)**| `1.05rem` | ~17px | ~16px | 600 (`--weight-semibold`) |
| **Lead Paragraph**| `clamp(1rem, 1.15vw, 1.125rem)` | ~18px | ~16px | 400 (`--weight-regular`) |
| **Base Body** | `0.9375rem` (15px) | 15px | 15px | 400 (`--weight-regular`) |
| **Small / Metadata** | `0.84375rem` (13.5px) | 13.5px | 13.5px | 500 (`--weight-medium`) |
| **Micro / Badges**| `0.75rem` (12px) | 12px | 12px | 600 (`--weight-semibold`) |

---

## 4. Layout Architecture & Elevation

### Container Widths
- Standard Content Container: `max-width: 1240px; margin: 0 auto; padding: 0 24px;`
- Narrow Text Canvas (About Us): `max-width: 960px; margin: 0 auto;`
- Workbench Form Container: `max-width: 1140px; margin: 0 auto;`

### Shadows & Elevation
- Low Elevation (`--shadow-sm`): `0 1px 2px rgba(15, 23, 42, 0.04);` (Buttons, inputs)
- Medium Elevation (`--shadow-md`): `0 10px 25px rgba(15, 23, 42, 0.08);` (Step cards, feature cards)
- High Elevation (`--shadow-lg`): `0 20px 40px rgba(15, 23, 42, 0.12);` (Modals, dropdown popovers)

### Border Radii
- Standard Cards & Containers: `--border-radius: 18px;`
- Inner Form Groups & Tables: `border-radius: 12px;`
- Buttons & Pills: `border-radius: 8px;` / `border-radius: 999px;` (Pills)

---

## 5. UI Component Catalog

### 5.1 Site Header & Navigation
- **Background**: Solid Deep Teal `#1F4E5B` with sticky top positioning (`position: sticky; top: 0; z-index: 100`).
- **Brand Wordmark**: Lowercase `sched` with highlighted `x`.
- **Navigation Links**:
  - Inactive: `#ffffff` with 80% opacity (`rgba(255, 255, 255, 0.8)`).
  - Hover / Active: `#ffffff` with white underline pill indicator and bold font weight.
- **Mobile Toggle**: Hamburger icon with CSS-animated 3-bar transition.

### 5.2 Buttons
- **Primary Button** (`.btn-primary`):
  - Background: `#2d6cdf` (Hover: `#1d4ed8`)
  - Text: `#ffffff`, bold 600
  - Padding: `12px 24px`
  - Shadow: `0 4px 14px rgba(45, 108, 223, 0.35)`
- **Secondary Button** (`.btn-secondary`):
  - Background: `#ffffff`, Border: `1px solid #dfe7f5`
  - Text: `#0f172a`
  - Hover: Background `#f8fafc`, Border `#cbd5e1`
- **Action / Small Button** (`.btn-sm`):
  - Padding: `6px 14px`, Font size: `13px`
- **Icon / Close Buttons**:
  - Circular or square hover buttons with transparent backgrounds and high-contrast glyphs.

### 5.3 Form Step Cards (10-Step Wizard)
Each step in `public/generate.html` is encased in a distinct `.form-step-card`:
- **Card Header**:
  - Distinct circular step badge: `.step-badge` (e.g. `01`, `02`, `06`) with royal blue accent background.
  - Step Title: Uppercase H3 (`DEPARTMENT`, `TEACHERS & ASSIGNED SUBJECTS`, etc.).
  - Descriptive Subtitle: Explains the exact institutional constraint handled.
- **Card Body**:
  - Clean white surface with subtle inner padding (`24px`).
  - Form groups with explicit labels, required indicators (`<span class="required">*</span>`), and micro help text.

### 5.4 Day Pills & Preset Toggles
- **Preset Buttons**: `Mon–Fri (5d)`, `Mon–Sat (6d)`, `All (7d)`. Clicking updates active working days.
- **Day Toggle Pills**: Round pills (`Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`). Active state has royal blue fill with white text; inactive state has soft gray border with muted text.

### 5.5 Copy Configuration Panels
- Expandable sub-panels embedded in Steps 06 (Periods) and 07 (Breaks).
- Styled with dashed subtle borders, warm background tint (`#f8fafc`), source day dropdown, destination multi-day chips, and execution buttons.

### 5.6 Timetable Day Cards & Tables
- **Day Container**: Each active working day renders as an independent timetable card with a sticky day header.
- **Table Grid**:
  - Headers: Period Number, Time Span (e.g., `09:00 AM – 10:00 AM`), Section, Course Name, Teacher Name, Room Name, Session Type, Action.
  - Theory Row: Clean white background with blue subject tag.
  - Practical Lab Row: Highlighted cyan/blue border badge indicating multi-hour duration block.
  - Break Row: Distinct amber/gray striped background spanning across columns.
  - Conflict Row: Soft red background (`#fef2f2`) with red left indicator bar and warning icon.

### 5.7 Modals & Dialogs
- **Cell Edit Modal**: Centered modal overlay (`background: rgba(15, 23, 42, 0.6)`) with backdrop blur (`backdrop-filter: blur(4px)`).
- **Feedback Modal**: Clean slide-up dialog with Category radio pills and Formspark submit button.

---

## 6. Page-Specific Design Themes

### The Vintage Diary Theme (`public/teacher-availability.html`)
Unlike the modern clean style of other pages, the Teacher Availability page features an intentionally distinct **Vintage Desk Diary Theme**:
- **Background**: Ambient desk gradient (`#dfd0bb` to `#ece1ce`).
- **Diary Page Canvas**:
  - Aged paper tint: `--diary-paper-base: #F5EBD5;`
  - Lined notebook texture: `repeating-linear-gradient(to bottom, transparent 0px, transparent 27px, rgba(160, 135, 100, 0.16) 28px);`
  - Left spine binding: Leather stitching accent bar (18px wide).
  - Fonts: Headings use Google Font `'Caveat'` / `'Playfair Display'` to mimic handwriting and editorial diary aesthetics.

---

## 7. Responsive Breakpoint Matrix

| Viewport Width | Layout Behavior | Target Devices |
|---|---|---|
| **Desktop (≥ 1200px)** | Full 2-column or 3-column bento grids; workbench form inputs side-by-side; full timetable table rendered without scroll. | Workstations, Laptops |
| **Tablet (768px – 1199px)**| 2-column grids collapse to 1 or 2 columns; timetable tables enable horizontal scroll container; navbar converts to hamburger menu on narrow tablets. | iPad Pro, Galaxy Tab, Surface |
| **Mobile (≤ 767px)** | Single-column linear stack; full-width buttons; day pills wrap cleanly; timetable displays in card-like mobile rows. | Smartphones |

---

## 8. Micro-Animations & Transitions

- **Standard Easing**: `transition: all 0.25s ease;` on all interactive links, buttons, and form inputs.
- **Button Hover Elevation**: `transform: translateY(-2px); box-shadow: 0 6px 20px rgba(45, 108, 223, 0.4);`
- **Accordion / Guide Expander**: Smooth height reveal with rotation indicator (`▼` to `▲`).
- **Loading Spinner**: CSS `@keyframes spin` rotating ring inside the Generate button while solver executes.

---

## 9. Known UI Inconsistencies & Observations

| Finding ID | Component | Observation | Status |
|---|---|---|---|
| **UI-01** | Global Header Links | `rooms.html` and `teacher-info.html` are accessible via URL but are not present in the main top navbar (which only displays Home, Generate, Features, About Us). | `Confirmed` |
| **UI-02** | Diary Page Divergence | `teacher-availability.html` uses an amber vintage diary theme, whereas all other 6 pages follow the blue/white modern glassmorphism design. This is intentional for aesthetic character, but represents an aesthetic divergence. | `Confirmed` |
| **UI-03** | Footer Copyright Year | Site footer displays `© 2025 SchedX`, whereas package.json and project reports reference `2026`. | `Confirmed` |

---
&copy; 2025–2026 SchedX Design System.
