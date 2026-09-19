# SchedX Features Page Design Specification — Zigzag Architecture

> **Document:** `docs/FEATURE_PAGE_DESIGN.md`  
> **Version:** 1.0  
> **Status:** Implemented & Active  
> **Target:** `public/features.html`, `public/style.css`  

---

## 1. Feature Page Structure & Editorial Flow

The SchedX Features Page (`/features`) has been architected as an intentional, story-driven educational software showcase rather than a cluttered catalog of generic boxes. The page structure consists of:

1. **Header & Navigation Bar (`.site-header`)**:
   - Preserved SchedX brand wordmark (`Brevis Regular`).
   - Sticky blur backdrop (`backdrop-filter: blur(10px)`).
   - Active state on `Features` navigation link (`aria-current="page"`).
2. **Hero Introduction (`.section-heading.center`)**:
   - Category Eyebrow: `Platform Capabilities` (`Plus Jakarta Sans`, 700 uppercase, tracking `0.1em`).
   - Primary Headline: `Built for Smarter Academic Scheduling` (`Plus Jakarta Sans`, 700 bold, fluid clamp).
   - Lead Subtitle: Explaining the multi-resource conflict-free architecture (`Inter`, 400 regular, `max-width: 65ch`).
3. **Alternating Zigzag Feature Section (`.features-zigzag-timeline`)**:
   - Central timeline connector path (subtle 2px gradient line).
   - 8 distinct, alternating left/right feature cards.
4. **Interactive Feature Modals**:
   - `#rulesModal`: 3-Way Collision Solver Rule Inspector with live interactive audit tester.
   - `#currentClassModal`: Real-time query to `/api/current-class` showing active ongoing lectures.
   - `#storageModal`: Dual-tier cloud (Supabase) + local fallback cache inspector.
5. **Footer (`.site-footer`)**:
   - Brand mission, deep navigation links, contact info, and copyright.

---

## 2. Zigzag Layout Architecture

The zigzag layout avoids traditional 3-column and 4-column card matrices in favor of an alternating horizontal visual journey down the page:

```
[ Center Timeline Connecting Line ]
               │
   ┌───────────┴───────────────────┐
   │ CARD 01: Smart Timetable      │ (Odd: Left Aligned)
   └───────────────────────────────┘
               │
               ┌───────────────────┴───────────┐
               │ CARD 02: Teacher Availability │ (Even: Right Aligned)
               └───────────────────────────────┘
               │
   ┌───────────┴───────────────────┐
   │ CARD 03: Section Management   │ (Odd: Left Aligned)
   └───────────────────────────────┘
               │
               ┌───────────────────┴───────────┐
               │ CARD 04: Room Management      │ (Even: Right Aligned)
               └───────────────────────────────┘
               │
   ┌───────────┴───────────────────┐
   │ CARD 05: Conflict Solver      │ (Odd: Left Aligned)
   └───────────────────────────────┘
               │
               ┌───────────────────┴───────────┐
               │ CARD 06: Day-Wise Timetable   │ (Even: Right Aligned)
               └───────────────────────────────┘
               │
   ┌───────────┴───────────────────┐
   │ CARD 07: Live Class Tracker   │ (Odd: Left Aligned)
   └───────────────────────────────┘
               │
               ┌───────────────────┴───────────┐
               │ CARD 08: Cloud Persistence    │ (Even: Right Aligned)
               └───────────────────────────────┘
               │
```

### CSS Alternating Logic
```css
.features-zigzag-list {
  display: flex;
  flex-direction: column;
  gap: clamp(44px, 5vw, 68px);
  position: relative;
  z-index: 2;
}

.zigzag-card:nth-child(odd) {
  align-self: flex-start;
  margin-right: auto;
  margin-left: 0;
}

.zigzag-card:nth-child(even) {
  align-self: flex-end;
  margin-left: auto;
  margin-right: 0;
}
```

---

## 3. Card Dimensions & Spatial Geometry

| Property | Desktop (> 1024px) | Tablet (769px – 1024px) | Mobile (≤ 768px) |
|---|---|---|---|
| **Width** | `53%` | `62% – 68%` | `100%` (Full width) |
| **Max Width** | `640px` | `600px` | `None` |
| **Internal Padding** | `clamp(26px, 3vw, 34px)` | `24px` | `22px 18px` |
| **Vertical Gap** | `clamp(44px, 5vw, 68px)` | `36px` | `24px` |
| **Corner Radius** | `24px` | `24px` | `20px` |
| **Central Connector Line** | Visible (`2px` gradient) | Visible | Hidden (`display: none`) |
| **Edge Indicator Dot** | `12px` circle (`::after`) | `12px` circle | Hidden (`display: none`) |

---

## 4. Background & Surface Depth

- **Page Background**: Subtle radial glow with gentle tint:
  ```css
  background: radial-gradient(circle at 10% 15%, rgba(45, 108, 223, 0.05) 0%, transparent 45%),
              radial-gradient(circle at 90% 75%, rgba(29, 78, 216, 0.04) 0%, transparent 45%),
              linear-gradient(180deg, #f7f9fd 0%, #eef4ff 100%);
  ```
- **Card Surface**: High-end off-white gradient:
  ```css
  background: linear-gradient(145deg, #ffffff 0%, #f9fbff 100%);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03);
  ```
- **Hover Surface**: Elevated tint and subtle blue-hued shadow:
  ```css
  background: linear-gradient(145deg, #ffffff 0%, #f2f7ff 100%);
  border-color: rgba(45, 108, 223, 0.38);
  box-shadow: 0 20px 42px rgba(45, 108, 223, 0.14), 0 4px 12px rgba(15, 23, 42, 0.04);
  ```

---

## 5. Micro-Interactions & Hover Polish

Every card delivers immediate visual feedback without jarring or disorienting movement:
1. **Vertical Elevation**: Smooth `-6px` translate on the Y-axis:
   `transform: translateY(-6px);`
2. **Icon Reaction**: Subtle scale and 2-degree tilt:
   `transform: scale(1.1) rotate(2deg);`
3. **CTA Arrow Translation**: The arrow symbol shifts right by `6px`:
   `transform: translateX(6px);`
4. **Connector Pulse**: Edge indicator node expands border glow from `3px` to `5px`.
5. **Timing**: Standardized `250ms cubic-bezier(0.16, 1, 0.3, 1)` easing.

---

## 6. Typography & Icon Application

| Component | Typeface | Size | Weight | Tracking | Color |
|---|---|---|---|---|---|
| **Feature Number** | `Plus Jakarta Sans` | `0.8125rem` (13px) | 800 | `+0.06em` | `--primary-dark` (`#1d4ed8`) |
| **Category Tag** | `Plus Jakarta Sans` | `0.72rem` (11.5px) | 700 | `+0.08em` | `#64748b` (Slate 500) |
| **Feature Title** | `Plus Jakarta Sans` | `clamp(1.2rem, 1.4vw, 1.45rem)` | 700 | `-0.012em` | `--text-dark` (`#0f172a`) |
| **Body Description** | `Inter` | `0.9375rem` (15px) | 400 | `0em` | `--text-muted` (`#526079`) |
| **Action CTA** | `Plus Jakarta Sans` | `0.9375rem` (15px) | 700 | `+0.03em` | `--primary-color` (`#2d6cdf`) |

---

## 7. Action & Interaction Mapping

Every feature card is an active gateway into real SchedX capability:

| Card # | Feature Title | Destination / Handler | Interaction Type |
|---|---|---|---|
| **01** | Smart Timetable Engine | `window.location='/generate'` | Page Navigation |
| **02** | Teacher Availability Tracking | `window.location='/teacher-availability'` | Page Navigation |
| **03** | Section & Class Organization | `window.location='/generate#timetableForm'` | Page Navigation + Form Anchor |
| **04** | Room & Laboratory Management | `window.location='/rooms'` | Page Navigation |
| **05** | 3-Way Collision Prevention | `openRulesModal()` | Interactive Modal + Solver Audit Test |
| **06** | Day-by-Day Schedule Layout | `window.location='/generate'` | Page Navigation |
| **07** | Live Class Monitor | `openCurrentClassModal()` | Interactive Modal (Live `/api/current-class` fetch) |
| **08** | Cloud & Offline Persistence | `openStorageModal()` | Interactive Modal (Live `/api/health` fetch) |

---

## 8. Responsive Breakpoints

- **Desktop (> 1024px)**: Staggered left/right zigzag layout at `53%` width with central connecting timeline.
- **Tablet (769px – 1024px)**: Staggered layout preserved with expanded `62%` width to accommodate mid-sized screens without text compression.
- **Mobile (≤ 768px)**: Seamless vertical single-column stack. Connector line and lateral indicator dots are hidden. Cards expand to `100%` width with generous touch targets.
- **Ultra-narrow (≤ 360px)**: Card padding reduced to `18px 14px`, titles scale down via fluid `clamp()` preventing horizontal page overflow.

---

## 9. Accessibility Compliance (WCAG AA & AAA)

- **Keyboard Traversal**: Every card includes `tabindex="0"`, `role="listitem"`, and an explicit `onkeydown` handler for `Enter` and `Space` key presses.
- **Focus Indicators**: Focused cards display a dedicated `4px` focus ring: `box-shadow: 0 0 0 4px rgba(45, 108, 223, 0.25)`.
- **Motion Sensitivity**: Full `@media (prefers-reduced-motion: reduce)` support instantly disables all transforms, rotations, and icon zooms for users with vestibular sensitivities.
- **Color Contrast**: All text pairings meet or exceed WCAG AA standards (minimum 4.5:1 for body copy and 3.0:1 for large display headlines).
