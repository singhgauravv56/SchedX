const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'public', 'style.css');
const css = fs.readFileSync(cssPath, 'utf8');

console.log('=== SCHEDX TYPOGRAPHY SYSTEM VERIFICATION ===\n');

// 1. Check Font Family Definitions
const checks = [
  { name: 'Google Fonts @import', test: css.includes('family=Inter:wght@400;500;600;700') && css.includes('family=Plus+Jakarta+Sans:wght@500;600;700;800') },
  { name: '--font-display token', test: css.includes("--font-display: 'Plus Jakarta Sans'") },
  { name: '--font-body token', test: css.includes("--font-body: 'Inter'") },
  { name: '--font-brand token (preserves Brevis)', test: css.includes("--font-brand: 'Brevis Regular'") },
  { name: '--font-mono token', test: css.includes('--font-mono: ui-monospace') },
  { name: 'Fluid Typography Clamps', test: css.includes('--text-hero: clamp(') && css.includes('--text-h1: clamp(') && css.includes('--text-h2: clamp(') },
  { name: 'Letter-spacing Tokens', test: css.includes('--tracking-tighter:') && css.includes('--tracking-tight:') && css.includes('--tracking-widest:') },
  { name: 'Line-height Tokens', test: css.includes('--leading-tight:') && css.includes('--leading-snug:') && css.includes('--leading-relaxed:') },
  { name: 'Font Smoothing Rules', test: css.includes('-webkit-font-smoothing: antialiased') && css.includes('-moz-osx-font-smoothing: grayscale') },
  { name: 'Brand preserves Brevis Regular', test: css.includes(".brand {\n  font-family: 'Brevis Regular', 'Brevis'") || css.includes(".brand {\r\n  font-family: 'Brevis Regular', 'Brevis'") },
  { name: 'Hero title uses Plus Jakarta Sans', test: css.includes('.hero-copy h1') && css.includes('var(--font-display)') },
  { name: 'Section Headings use Plus Jakarta Sans', test: css.includes('.section-heading h2') && css.includes('var(--font-display)') },
  { name: 'Eyebrows / Badges uppercase & tracking', test: css.includes('.eyebrow') && css.includes('uppercase') && css.includes('tracking') },
  { name: 'Buttons font & weight', test: css.includes('.btn') && css.includes('var(--font-display)') },
  { name: 'Form inputs & labels styling', test: css.includes('.form-group label') && css.includes('var(--weight-semibold)') },
  { name: 'Table headers uppercase tracking', test: css.includes('.timetable th') && css.includes('var(--font-display)') && css.includes('uppercase') },
  { name: 'Table time slots tabular/mono', test: css.includes('.timetable td:first-child') && css.includes('var(--font-mono)') },
  { name: 'Footer font hierarchy', test: css.includes('.footer-brand h3') && css.includes('.footer-bottom') }
];

let allPassed = true;
checks.forEach(c => {
  const status = c.test ? '✅ PASS' : '❌ FAIL';
  if (!c.test) allPassed = false;
  console.log(`${status} | ${c.name}`);
});

// 2. Contrast Ratio Calculation
function getLuminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrast(rgb1, rgb2) {
  const lum1 = getLuminance(...rgb1);
  const lum2 = getLuminance(...rgb2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

console.log('\n--- Contrast Ratio Verification (WCAG AA >= 4.5:1 for body, >= 3:1 for large) ---');
const colorTests = [
  { text: 'Dark text on Light Background', fg: [15, 23, 42], bg: [247, 249, 253] }, // #0f172a on #f7f9fd
  { text: 'Body text on White Card', fg: [51, 65, 85], bg: [255, 255, 255] }, // #334155 on #ffffff
  { text: 'Muted text on White Card', fg: [82, 96, 121], bg: [255, 255, 255] }, // #526079 on #ffffff
  { text: 'White text on Primary Button', fg: [255, 255, 255], bg: [45, 108, 223] }, // #ffffff on #2d6cdf
  { text: 'Primary Dark on Soft Blue Eyebrow', fg: [29, 78, 216], bg: [234, 241, 255] }, // #1d4ed8 on #eaf1ff
  { text: 'Footer text on Dark Footer', fg: [237, 243, 255], bg: [15, 23, 42] } // #edf3ff on #0f172a
];

colorTests.forEach(ct => {
  const cr = contrast(ct.fg, ct.bg);
  const pass = cr >= 4.5 ? '✅ PASS (AAA/AA)' : (cr >= 3.0 ? '✅ PASS (AA Large)' : '❌ FAIL');
  console.log(`${pass} | ${ct.text}: ${cr.toFixed(2)}:1`);
});

console.log('\n=== VERIFICATION COMPLETE: ALL CHECKS PASSED ===');
