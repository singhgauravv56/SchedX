# SchedX Typography Design System

> **Version:** 2.0  
> **Status:** Active & Implemented  
> **Last Updated:** September 2026  
> **Target Products:** SchedX Smart Timetable Generator Suite (`/`, `/generate`, `/features`, `/rooms`, `/teacher-availability`, `/teacher-info`)

---

## 1. Overview & Typography Philosophy

Prior to this redesign, SchedX relied on Windows system fallback fonts (`'Segoe UI', sans-serif`) with uniform weight declarations and default tracking across headings, cards, forms, and tables. This created visual monotony where distinct structural elements competed for attention rather than guiding the user's eye naturally.

The **SchedX 2.0 Typography System** establishes a modern, high-contrast, mathematically scaled typographic identity tailored for an intelligent education technology application. The system achieves:
- **Instant Visual Hierarchy**: Immediate differentiation between hero displays, section headers, card titles, interactive buttons, form labels, badges, and tabular data.
- **Enhanced Scannability**: Clean separation between metadata (time slots, room tags, counts) and primary titles.
- **Fluid Scalability**: Zero sudden layout jumps across screen widths (320px to 1920px+) using CSS `clamp()` fluid math.
- **WCAG AAA/AA Accessibility**: Strict color contrast ratios exceeding 4.5:1 for body and 3.0:1 for large text.
- **Preserved Brand Heritage**: Retains the iconic `Brevis Regular` brand identity for the primary SchedX wordmark while elevating all other UI surfaces.

---

## 2. Core Font Families

The typography system is built strictly on **two harmonious primary font families**, supplemented by the preserved custom brand wordmark and a monospace stack for tabular time figures.

| Role | Font Family | Weights Loaded | Primary Use Cases |
|---|---|---|---|
| **Display / Headings** | `Plus Jakarta Sans` | `500, 600, 700, 800` | Hero headlines, section titles, card headers, day badges, modal headers, primary buttons |
| **Body & UI Interface** | `Inter` | `400, 500, 600, 700` | Subtitles, body paragraphs, navigation links, form inputs, table content, tooltips, footer copy |
| **Brand Identity** | `'Brevis Regular', 'Brevis'` | `700` | Strictly reserved for the `.brand` SchedX logo mark |
| **Monospace / Tabular** | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas` | `500` | Time intervals (e.g., `09:00 - 10:00`), period codes, slot identifiers |

### Google Fonts Preconnect & Stylesheet Inclusion
Included in the `<head>` of all HTML documents (`index.html`, `generate.html`, `features.html`, `rooms.html`, `teacher-availability.html`, `teacher-info.html`):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
```

And loaded at line 1 of `public/style.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
```

---

## 3. CSS Variable System Tokens

The entire system is controlled via unified CSS custom properties declared at `:root`:

```css
:root {
  /* --- Typography Font Families --- */
  --font-display: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-brand: 'Brevis Regular', 'Brevis', 'Plus Jakarta Sans', sans-serif;
  --font-mono: ui-monospace, 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', monospace;

  /* --- Fluid Typographic Scale --- */
  --text-hero: clamp(2.35rem, 4.5vw + 0.5rem, 3.65rem);
  --text-h1:   clamp(1.85rem, 3.2vw + 0.4rem, 2.5rem);
  --text-h2:   clamp(1.4rem, 2.2vw + 0.3rem, 1.95rem);
  --text-h3:   clamp(1.125rem, 1.2vw + 0.3rem, 1.25rem);
  --text-h4:   1.05rem;
  --text-lead: clamp(1rem, 1.15vw, 1.125rem);
  --text-base: 0.9375rem;   /* 15px */
  --text-sm:   0.84375rem;  /* 13.5px */
  --text-xs:   0.75rem;     /* 12px */

  /* --- Line Heights --- */
  --leading-tight:   1.1;   /* Headings, Hero, Brand */
  --leading-snug:    1.25;  /* Section sub-headers, card titles */
  --leading-normal:  1.5;   /* UI elements, badges, buttons */
  --leading-relaxed: 1.65;  /* Long-form paragraphs, descriptions */

  /* --- Letter Spacing (Tracking) --- */
  --tracking-tighter: -0.035em; /* Hero display headings */
  --tracking-tight:   -0.02em;  /* H1 and H2 section titles */
  --tracking-snug:    -0.012em; /* Card titles, form labels */
  --tracking-normal:   0em;     /* Body paragraphs, navigation */
  --tracking-wide:     0.03em;  /* Buttons, interactive controls */
  --tracking-wider:    0.06em;  /* Table column headers */
  --tracking-widest:   0.1em;   /* Eyebrows, uppercase tags, pill badges */

  /* --- Font Weights --- */
  --weight-regular:   400;
  --weight-medium:    500;
  --weight-semibold:  600;
  --weight-bold:      700;
  --weight-extrabold:  800;

  /* --- Typographic Color Tokens --- */
  --text-dark:  #0f172a;  /* High-contrast headings and brand titles */
  --text-body:  #334155;  /* Balanced body readability */
  --text-muted: #526079;  /* Secondary descriptions and labels */
}
```

---

## 4. Complete Typographic Hierarchy Specification (15 Tiers)

| Tier | UI Element | Font Family | Size (Clamp / Rem) | Weight | Line Height | Letter Spacing | Text Transform | Color |
|---|---|---|---|---|---|---|---|---|
| **1** | Brand Logo (`.brand`) | `var(--font-brand)` | `clamp(1.85rem, 2.2vw, 2.35rem)` | 700 | 1.0 | `0.04em` | None | `var(--text-dark)` |
| **2** | Hero Title (`.hero-copy h1`) | `var(--font-display)` | `clamp(2.35rem, 4.5vw + 0.5rem, 3.65rem)` | 800 | 1.1 | `-0.035em` | None (`balance`) | `var(--text-dark)` |
| **3** | Page Headings (`h1`, `.page-heading`) | `var(--font-display)` | `clamp(1.85rem, 3.2vw + 0.4rem, 2.5rem)` | 700 | 1.1 | `-0.035em` | None | `var(--text-dark)` |
| **4** | Section Headings (`h2`, `.section-heading h2`) | `var(--font-display)` | `clamp(1.4rem, 2.2vw + 0.3rem, 1.95rem)` | 700 | 1.25 | `-0.02em` | None | `var(--text-dark)` |
| **5** | Card Headings (`h3`, `.feature-card h3`) | `var(--font-display)` | `clamp(1.125rem, 1.2vw + 0.3rem, 1.25rem)` | 600 | 1.25 | `-0.012em` | None | `var(--text-dark)` |
| **6** | Eyebrow Badges (`.eyebrow`, `.tag`) | `var(--font-display)` | `0.75rem` (12px) | 700 | 1.3 | `0.1em` | Uppercase | `var(--primary-dark)` |
| **7** | Subtitles / Leads (`.section-description`, `.hero-copy p`) | `var(--font-body)` | `clamp(1rem, 1.15vw, 1.125rem)` | 400 | 1.65 | `0em` | None | `var(--text-muted)` |
| **8** | Body Paragraphs (`p`, `.workflow-card p`) | `var(--font-body)` | `0.9375rem` (15px) | 400 | 1.65 | `0em` | None | `var(--text-body)` |
| **9** | Navigation Links (`.nav-link`) | `var(--font-body)` | `0.9375rem` (15px) | 500 / 600 | 1.5 | `0em` | None | `var(--text-muted)` / primary |
| **10** | Buttons (`.btn`, `button`) | `var(--font-display)` | `0.9375rem` (15px) | 600 | 1.25 | `0.03em` | None | White / Dark |
| **11** | Form Labels (`.form-group label`) | `var(--font-body)` | `0.875rem` (14px) | 600 | 1.4 | `-0.012em` | None | `var(--text-dark)` |
| **12** | Form Inputs (`input`, `select`) | `var(--font-body)` | `0.9375rem` (15px) | 400 | 1.5 | `0em` | None | `var(--text-dark)` |
| **13** | Timetable Day Titles (`.day-title`) | `var(--font-display)` | `1.15rem` (18.4px) | 700 | 1.25 | `0.03em` | Uppercase | `var(--primary-dark)` |
| **14** | Table Column Headers (`.timetable th`) | `var(--font-display)` | `0.75rem` (12px) | 700 | 1.4 | `0.06em` | Uppercase | `#475569` |
| **15** | Table Cell Content (`.timetable td`) | `var(--font-body)` | `0.875rem` (14px) | 400 | 1.5 | `0em` | Tabular Nums | `var(--text-dark)` |
| **+** | Table Time Slots (`td:first-child`) | `var(--font-mono)` | `0.8125rem` (13px) | 500 | 1.4 | `-0.01em` | Tabular Nums | `#334155` |
| **+** | Footer Brand & Headings (`.footer-brand h3`) | `var(--font-display)` | `1.25rem` (20px) | 700 | 1.25 | `-0.012em` | None | `#ffffff` |
| **+** | Footer Copy & Copyright (`.footer-bottom`) | `var(--font-body)` | `0.8125rem` (13px) | 400 | 1.6 | `0em` | None | `rgba(237, 243, 255, 0.65)` |

---

## 5. Micro-Typography & Readability Guidelines

### Line Length Constraint
To prevent cognitive eye strain on ultra-wide desktop displays (1440px–1920px), all narrative paragraphs are bounded to a maximum measure:
```css
p, .section-description, .hero-copy p {
  max-width: 65ch; /* 65 characters per line */
}
```

### Text Balance & Orphan Prevention
For headlines and titles, `text-wrap: balance` ensures multi-line titles wrap harmoniously without leaving single hanging words (orphans):
```css
.hero-copy h1, .section-heading h2 {
  text-wrap: balance;
}
```

### Font Smoothing & Feature Settings
Sub-pixel anti-aliasing and contextual alternates are enabled globally on the `body` tag:
```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
}
```

---

## 6. Contrast & Accessibility Audit Summary

All foreground-background color pairs were mathematically validated using the WCAG relative luminance formula:

| Foreground | Background | Purpose | Measured Ratio | WCAG AA Status |
|---|---|---|---|---|
| `#0f172a` (Text Dark) | `#f7f9fd` (Page Light) | Headings & Hero | **16.94:1** | ✅ AAA Pass (exceeds 7:1) |
| `#334155` (Text Body) | `#ffffff` (Card Surface) | Body text | **10.35:1** | ✅ AAA Pass (exceeds 7:1) |
| `#526079` (Text Muted)| `#ffffff` (Card Surface) | Descriptions & Hints | **6.35:1** | ✅ AA Pass (exceeds 4.5:1) |
| `#ffffff` (White) | `#2d6cdf` (Primary Blue)| Primary Buttons | **4.86:1** | ✅ AA Pass (exceeds 4.5:1) |
| `#1d4ed8` (Blue 700) | `#eaf1ff` (Soft Blue Pill)| Eyebrow Badges | **5.91:1** | ✅ AA Pass (exceeds 4.5:1) |
| `#edf3ff` (Footer Off-White)| `#0f172a` (Footer Dark)| Footer Links & Info | **16.04:1** | ✅ AAA Pass (exceeds 7:1) |
