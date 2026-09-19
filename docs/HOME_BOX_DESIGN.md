# SchedX Home Page Box & Card Design System

## 1. Overview & Architectural Purpose

The Home Page card system for SchedX provides a **modular product dashboard and operational overview** distinct from the vertical zigzag feature showcase found on `/features`. Rather than an alternating narrative timeline, the Home Page delivers high-density operational clarity, structured data hierarchy, and direct navigation paths into core scheduler subsystems.

The system is engineered according to modern EdTech SaaS aesthetics: soft dual-tone gradients, subtle low-contrast borders, refined curvature (22px radius), gentle elevation depth, and micro-interactions that feel responsive without visual excess.

---

## 2. Card Hierarchy & Box Types

The Home Page card architecture is structured into four distinct functional variants, unified under the base `.home-card` class:

| Box Variant | Class Modifier | Role & Visual Weight | Components & Interaction |
|-------------|----------------|----------------------|--------------------------|
| **Primary Action Card** | `.home-card--primary` | High emphasis; anchors the 3-column dashboard grid | Accent gradient top border (4px), category tag ("CORE ENGINE"), gear icon, feature chips, and prominent CTA button (`/generate`) |
| **Operational Action Cards** | `.home-card--action` | Medium-high emphasis; quick links to campus subsystems | Category metadata tags ("FACULTY SCHEDULES", "INFRASTRUCTURE"), thematic emoji icons, and text CTAs with right-arrow motion (`/teacher-availability`, `/rooms`) |
| **Statistic Metric Cards** | `.home-card--stat` | Compact, number-driven data tiles | Accent display numbers (e.g. `0`, `100%`, `7 Days`, `2-Tier`), uppercase tracking labels, and concise constraint descriptions |
| **Workflow Step Cards** | `.home-card--workflow` | Process sequential cards in 4-column balanced grid | Numerical step badges (`01`–`04`), heading, and step instructions |

---

## 3. Grid Architecture & Layout

### 3.1 Platform Overview Dashboard Grid
The upper operational area utilizes a two-tier grid:
1. **Top Row (`.home-dashboard-grid`)**:
   - Desktop: `grid-template-columns: 1.3fr 1fr 1fr;` with `gap: clamp(18px, 2vw, 26px);`
   - Gives the Primary Card 30% wider prominence than the two adjacent action cards.
   - Tablet (≤ 1100px): Rebalances to `grid-template-columns: 1fr;` with single-column clean vertical stack.
2. **Bottom Row (`.home-stats-grid`)**:
   - Desktop: `grid-template-columns: repeat(4, 1fr);` with `gap: clamp(14px, 1.6vw, 20px);`
   - Tablet (≤ 1100px): Transitions to `grid-template-columns: repeat(2, 1fr);`
   - Mobile (≤ 700px): Collapses to `grid-template-columns: 1fr;`

### 3.2 Workflow Process Grid (`.workflow-grid`)
- Desktop: `grid-template-columns: repeat(4, minmax(0, 1fr));` (rebalanced from legacy 3-column wrap).
- Tablet (≤ 1100px): `grid-template-columns: repeat(2, 1fr);`
- Mobile (≤ 700px): `grid-template-columns: 1fr;`

---

## 4. Visual Tokens & Styling Specifications

### 4.1 Backgrounds & Gradients
- **Base Surface**: `linear-gradient(145deg, #ffffff 0%, #f9fbff 100%)`
- **Primary Card Accent**: `linear-gradient(135deg, rgba(45, 108, 223, 0.07) 0%, rgba(29, 78, 216, 0.02) 100%), #ffffff`
- **Stat Cards**: `linear-gradient(145deg, #ffffff 0%, #f7faff 100%)`
- **Workflow Cards**: `linear-gradient(145deg, #ffffff 0%, #fafcff 100%)`
- **Icon Enclosures**: `linear-gradient(135deg, var(--primary-soft) 0%, #deecff 100%)`

### 4.2 Borders & Radii
- **Border Radius**: `border-radius: 22px;` (Stat & workflow internal badges: `12px`–`14px`).
- **Border Width & Color**: `1px solid rgba(148, 163, 184, 0.2)`
- **Hover Border Color**: `rgba(45, 108, 223, 0.35)`
- **Focus Border Color**: `var(--primary-color)` with 4px focus ring: `rgba(45, 108, 223, 0.25)`

### 4.3 Depth & Elevation
- **Resting Box Shadow**: `0 8px 24px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)`
- **Elevated Hover Shadow**: `0 18px 38px rgba(45, 108, 223, 0.12), 0 2px 6px rgba(15, 23, 42, 0.04)`

---

## 5. Typography Scale & Hierarchy

Every card adheres strictly to the SchedX dual-font typography design system:

```
[Card Eyebrow / Tag]      → Plus Jakarta Sans, 0.72rem, 700 weight, uppercase, tracking +0.08em
[Card Heading / Title]    → Plus Jakarta Sans, clamp(1.2rem, 1.35vw, 1.4rem), 700 weight, line-height 1.3
[Card Description]        → Inter, 0.9375rem (15px), 400 weight, line-height 1.6, text-muted
[Statistic Big Number]    → Plus Jakarta Sans, clamp(1.9rem, 2.6vw, 2.4rem), 800 weight, tracking -0.03em
[Statistic Small Label]   → Plus Jakarta Sans, 0.72rem, 700 weight, uppercase, tracking +0.08em
[CTA Link / Button Text]  → Plus Jakarta Sans, 0.9375rem, 700 weight, primary blue
```

---

## 6. Micro-Interactions & Hover Dynamics

```css
.home-card {
  transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 250ms ease,
              border-color 250ms ease,
              background 250ms ease;
}

.home-card:hover {
  transform: translateY(-4px) scale(1.01);
  border-color: rgba(45, 108, 223, 0.35);
  box-shadow: 0 18px 38px rgba(45, 108, 223, 0.12), 0 2px 6px rgba(15, 23, 42, 0.04);
}

.home-card:hover .home-card-icon {
  transform: scale(1.08);
}

.home-card:hover .home-card-cta .cta-arrow {
  transform: translateX(5px);
}
```

---

## 7. Accessibility & Motion Guidelines

1. **Semantic Structure**: Semantic HTML5 elements (`<article>`, `<section>`, `<a>`, `<button>`).
2. **Keyboard Focus**: Focus ring `box-shadow: 0 0 0 4px rgba(45, 108, 223, 0.25)` on `:focus-visible`.
3. **Reduced Motion**: Under `@media (prefers-reduced-motion: reduce)`, all transforms, hover translations, and scale transitions are disabled (`transform: none !important; transition: none !important;`).
4. **Touch-Friendly**: Action cards and CTAs maintain minimum tap targets ≥ 44px on mobile devices.
