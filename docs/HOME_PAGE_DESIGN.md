# SchedX Home Page Design System Specification

## 1. Executive Design Philosophy & Visual Character

The SchedX Home Page (`/` -> `public/index.html`) is engineered as a **premier, modern EdTech/SaaS product landing page**. It synthesizes academic precision with contemporary software aesthetics: high-clarity typography, soft multi-tone blue accents, balanced whitespace, smooth rounded surfaces (14px–22px radii), ambient depth glow, and micro-interactions that feel responsive without unnecessary motion.

The design strictly separates the Home Page from the Features Page:
- **Features Page (`/features`)**: Vertical, alternating **zigzag showcase** detailing individual platform capabilities.
- **Home Page (`/`)**: Asymmetric **two-column operational dashboard** (Hero value proposition + live Timetable Mockup) followed by a **modular platform overview grid** (Primary CTA + Quick Actions + System Metrics) and a balanced **4-step workflow process**.

---

## 2. Hero Section Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│  SITE NAVBAR: [ SchedX Brand ]              [ Home (Active) ] [ Generate ] [ Features ] [ About ]│
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  [ • SMART TIMETABLE GENERATOR ]                 ┌────────────────────────────────────────────┐  │
│                                                  │ [• • •] SchedX • Smart Academic Timetable  │  │
│  SchedX                                          ├────────────────────────────────────────────┤  │
│                                                  │ Time  MON    TUE    WED    THU    FRI      │  │
│  SchedX helps organize teaching schedules        │ 09:00 [Math] [Phys] [Math] [CS]   [Chem]   │  │
│  with minimal effort by checking teacher         │ 10:00 [CS]   [Math] [Phys] [Chem] [CS]     │  │
│  availability, room usage, class conflicts,      │ 11:00 [Phys] [Chem] [CS]   [Math] [Phys]   │  │
│  and time clashes before creating a timetable.   └────────────────────────────────────────────┘  │
│                                                   [ ✓ Conflict Free ]       [ 👥 12 Teachers ]   │
│  [ Generate Timetable → ]  [ Explore Features ]  [ 📚 100% Zero Overlap ]  [ 🏫 8 Rooms ]        │
│                                                                                                  │
│  [ 👨‍🏫 Teacher checks ] [ 🏫 Room checks ] [ 🛡️ Conflict prevention ]                           │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

The Hero section utilizes an asymmetric two-column grid:
- **Desktop (> 980px)**: `grid-template-columns: 1.05fr 1fr;` with `gap: clamp(32px, 4vw, 56px);`
- **Tablet / Mobile (≤ 980px)**: Collapses cleanly into a single vertical column (`grid-template-columns: 1fr;`). Left copy centers with full-width buttons, and the right visual maintains its prominence while floating cards transition to a static 2x2 grid.

---

## 3. Typography Scale & Font Pairing

The Home Page implements the SchedX typography system adhering to WCAG AAA/AA contrast standards:

| Hierarchy Level | Font Family | Size | Weight | Line Height | Tracking | Color |
|-----------------|-------------|------|--------|-------------|----------|-------|
| **Eyebrow Pill** | `Plus Jakarta Sans` | `0.75rem` (12px) | 700 (Bold) | `1.2` | `+0.08em` | `var(--primary-dark)` (`#1d4ed8`) |
| **Hero Title** | `Plus Jakarta Sans` | `clamp(2.75rem, 5.2vw, 4.25rem)` | 800 (ExtraBold) | `1.05` | `-0.04em` | `var(--text-dark)` (`#0f172a`) |
| **Hero Lead Paragraph** | `Inter` | `clamp(1rem, 1.15vw, 1.125rem)` | 400 (Regular) | `1.65` | `normal` | `var(--text-muted)` (`#475569`) |
| **Primary CTA Button** | `Plus Jakarta Sans` | `0.9375rem` (15px) | 600 (SemiBold) | `1.3` | `+0.02em` | `#ffffff` |
| **Secondary CTA Button** | `Plus Jakarta Sans` | `0.9375rem` (15px) | 600 (SemiBold) | `1.3` | `+0.02em` | `var(--text-dark)` (`#0f172a`) |
| **Trust Pill Label** | `Inter` | `0.8125rem` (13px) | 600 (SemiBold) | `1.2` | `+0.01em` | `var(--text-dark)` (`#0f172a`) |
| **Mockup Window Title** | `Plus Jakarta Sans` | `0.75rem` (12px) | 700 (Bold) | `1.2` | `normal` | `#475569` |
| **Mockup Time Slot** | `JetBrains Mono` / Monospace | `0.6875rem` (11px) | 600 (SemiBold) | `1.0` | `normal` | `#64748b` |
| **Mockup Chip Subject** | `Plus Jakarta Sans` | `0.6875rem` (11px) | 700 (Bold) | `1.1` | `normal` | Curated variant tone |
| **Mockup Chip Meta** | `Inter` | `0.5625rem` (9px) | 500 (Medium) | `1.0` | `normal` | `#475569` |
| **Floating Card Metric** | `Plus Jakarta Sans` | `0.9375rem` (15px) | 800 (ExtraBold) | `1.1` | `-0.02em` | `var(--primary-dark)` |

---

## 4. Color Palette & Background Glow

- **Base Surface**: Clean, bright white `#ffffff` transitioning into `#f7faff`.
- **Ambient Glow (`.hero-visual-glow`)**:
  - Radial gradient centered behind the timetable preview:
    `radial-gradient(circle, rgba(45, 108, 223, 0.14) 0%, rgba(45, 108, 223, 0.03) 55%, transparent 70%)`
  - Completely non-blocking with `pointer-events: none;`.
- **Primary Blue Tints**:
  - Brand Primary: `var(--primary-color)` (`#2d6cdf`)
  - Primary Dark: `var(--primary-dark)` (`#1d4ed8`)
  - Primary Soft: `var(--primary-soft)` (`#ebf3ff`)
- **Lecture Chip Curated Tints**:
  - Blue (Math): Background `rgba(45, 108, 223, 0.1)`, Border `rgba(45, 108, 223, 0.22)`, Text `#1d4ed8`
  - Purple (Physics Lab): Background `rgba(124, 58, 237, 0.09)`, Border `rgba(124, 58, 237, 0.2)`, Text `#6d28d9`
  - Cyan (Computer Science): Background `rgba(8, 145, 178, 0.1)`, Border `rgba(8, 145, 178, 0.22)`, Text `#0e7490`
  - Amber (Chemistry): Background `rgba(217, 119, 6, 0.1)`, Border `rgba(217, 119, 6, 0.22)`, Text `#b45309`

---

## 5. CTA Button Architecture

### 5.1 Primary Button (`#heroGenerateCta`)
- **Destination**: `/generate` (Direct route to SchedX generator).
- **Background**: `linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)`.
- **Border Radius**: `14px`.
- **Padding**: `13px 24px`.
- **Shadow**: Resting `0 6px 18px rgba(45, 108, 223, 0.28)`.
- **Hover**: Elevates `translateY(-2px)` with shadow expanding to `0 10px 24px rgba(45, 108, 223, 0.35)`.
- **Arrow Interaction**: The right arrow icon (`→`) smoothly translates `+4px` on hover.

### 5.2 Secondary Button (`#heroFeaturesCta`)
- **Destination**: `/features` (Direct route to features showcase).
- **Background**: `#ffffff`.
- **Border**: `1px solid rgba(148, 163, 184, 0.3)`.
- **Border Radius**: `14px`.
- **Padding**: `13px 22px`.
- **Hover**: Shifts to subtle blue tint `rgba(45, 108, 223, 0.05)` and border `rgba(45, 108, 223, 0.35)` with `translateY(-2px)`.

---

## 6. Supporting Information Pills (`.hero-trust-pills`)

The three supporting pills represent verifiable, core operational logic performed by SchedX:

1. `[ 👨‍🏫 ] Teacher checks`: Validates faculty schedules, period bounds, and prevents teacher double-booking.
2. `[ 🏫 ] Room checks`: Validates classroom/laboratory availability, equipment type, and room collisions.
3. `[ 🛡️ ] Conflict prevention`: Multi-constraint collision solver ensuring zero simultaneous period clashes across faculty, sections, and physical rooms.

**Pill Styling**:
- Background: `linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%)`.
- Border: `1px solid rgba(45, 108, 223, 0.16)`.
- Radius: `999px` (full pill).
- Shadow: `0 2px 6px rgba(15, 23, 42, 0.03)`.
- Hover: Border illuminates to `rgba(45, 108, 223, 0.35)` with a delicate `translateY(-1px)` lift.

---

## 7. Product Visualization & Mockup Card

### 7.1 Mockup Frame (`.timetable-preview-card`)
- Width: `100%`, max-width `530px`.
- Surface: `linear-gradient(160deg, #ffffff 0%, #f8faff 100%)`.
- Border: `1px solid rgba(148, 163, 184, 0.28)`.
- Radius: `22px`.
- Shadow: `0 24px 56px rgba(15, 23, 42, 0.09), 0 4px 14px rgba(45, 108, 223, 0.05)`.
- Window Header: Three micro dots (`#ff5f56`, `#ffbd2e`, `#27c93f`), window title `SchedX • Smart Academic Timetable`, and active status badge (`#059669` text with pulsing emerald dot).

### 7.2 Timetable Matrix Grid
- Structure: Header row + 3 period rows (`09:00`, `10:00`, `11:00`).
- Columns: 6 (`Time`, `MON`, `TUE`, `WED`, `THU`, `FRI`).
- Micro-Cards: Curated chip components displaying subject name and meta info (room number & section identifier).

---

## 8. Floating Information Cards (`.float-card`)

Four strategically placed status cards provide operational depth:

1. **Top-Right (`.float-card--conflict`)**:
   - Status: `Conflict Free — All constraints satisfied`
   - Icon: Emerald checkmark `✓` in circular enclosure.
   - Tint: Soft success green gradient (`#f0fdf4` to `#ffffff`).
2. **Bottom-Left (`.float-card--teachers`)**:
   - Metric: `12`
   - Label: `Teachers Assigned`
   - Icon: `👥` in primary blue enclosure.
3. **Bottom-Right (`.float-card--rooms`)**:
   - Metric: `8`
   - Label: `Rooms & Labs`
   - Icon: `🏫` in sky-blue enclosure.
4. **Top-Left (`.float-card--sections`)**:
   - Metric: `100%`
   - Label: `Zero Overlap`
   - Icon: `📚` in indigo enclosure.

**Hover Effect**: `transform: translateY(-3px); box-shadow: 0 16px 36px rgba(45, 108, 223, 0.16); border-color: rgba(45, 108, 223, 0.35);`.

---

## 9. Responsive Adaptations

- **Desktop (> 980px)**:
  - 2-column layout (`1.05fr 1fr`).
  - Floating cards position with absolute coordinates relative to the timetable mockup card without exceeding container boundaries.
- **Tablet & Mobile (≤ 980px)**:
  - Hero grid collapses into a single column (`1fr`) with `42px` vertical gap.
  - Left content aligns to center with centered buttons and pills.
  - Mockup card remains at `100%` width (max 540px) centered.
  - `.hero-float-cards-grid` switches from `display: contents` to `display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 20px;`.
  - Floating cards transition to `position: static; width: 100%;` forming a clean, symmetrical 2x2 grid below the mockup.
- **Small Mobile (≤ 540px)**:
  - Floating cards grid collapses into 1 column.
  - Inner timetable container supports smooth horizontal swipe with `-webkit-overflow-scrolling: touch;`.
  - Zero page-level horizontal overflow at all screen widths (320px–1920px).

---

## 10. Accessibility & Motion Guidelines

1. **Semantic Structure**: Semantic HTML5 elements (`<section class="hero-section">`, `<h1>`, `<p>`, `<a>`).
2. **Keyboard Navigation**: Buttons and links have distinct `:focus-visible` focus rings (`box-shadow: 0 0 0 3px rgba(45, 108, 223, 0.35)`).
3. **Reduced Motion**: Under `@media (prefers-reduced-motion: reduce)`, all transforms, hover lifts, and scale transitions are disabled.
4. **Touch Target Sizing**: All interactive buttons maintain minimum tap targets ≥ 44px on touchscreens.
