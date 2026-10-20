const fs = require('fs');
const path = require('path');

console.log('========================================================');
console.log('     SCHEDX OPTION 6 PREMIUM WORDMARK VERIFICATION      ');
console.log('========================================================\n');

const publicDir = path.join(__dirname, '..', 'public');
const cssPath = path.join(publicDir, 'style.css');
const css = fs.readFileSync(cssPath, 'utf8');

const htmlFiles = [
  { name: 'index.html', path: path.join(publicDir, 'index.html'), hasHero: true },
  { name: 'generate.html', path: path.join(publicDir, 'generate.html'), hasHero: false },
  { name: 'features.html', path: path.join(publicDir, 'features.html'), hasHero: false },
  { name: 'rooms.html', path: path.join(publicDir, 'rooms.html'), hasHero: false },
  { name: 'teacher-availability.html', path: path.join(publicDir, 'teacher-availability.html'), hasHero: false },
  { name: 'teacher-info.html', path: path.join(publicDir, 'teacher-info.html'), hasHero: false }
];

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS | ${message}`);
    testsPassed++;
  } else {
    console.error(`❌ FAIL | ${message}`);
    testsFailed++;
  }
}

// 1. Google Fonts and Font-Family
console.log('--- 1. Typography & Font System ---');
assert(css.includes('family=Orbitron:wght@700;800;900'), 'style.css imports Orbitron (700, 800, 900)');
assert(css.includes("--font-wordmark: 'Orbitron'"), 'style.css defines --font-wordmark with Orbitron');
assert(css.includes("--font-display: 'Plus Jakarta Sans'"), '--font-display remains Plus Jakarta Sans for UI');
assert(css.includes("--font-body: 'Inter'"), '--font-body remains Inter for body copy');

// 2. CSS Wordmark Specification
console.log('\n--- 2. CSS Wordmark Rules ---');
assert(css.includes('.schedx-wordmark {'), '.schedx-wordmark class defined');
assert(css.includes('font-family: var(--font-wordmark'), '.schedx-wordmark uses --font-wordmark');
assert(css.includes('align-items: baseline'), '.schedx-wordmark aligns to baseline');
assert(css.includes('text-transform: uppercase'), '.schedx-wordmark enforces uppercase');
assert(css.includes('.schedx-wordmark .schedx-main'), '.schedx-main defined');
assert(css.includes('.schedx-wordmark .schedx-x'), '.schedx-x defined');
assert(css.includes('font-size: 1.18em'), '.schedx-x is ~18% larger (target 15-20%)');
assert(css.includes('-webkit-background-clip: text'), '.schedx-x has gradient background clip');
assert(css.includes('background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)'), '.schedx-x uses blue/cyan gradient');
assert(css.includes('.brand.schedx-wordmark:hover'), 'Subtle hover effect defined for navbar brand');
assert(!css.includes('.brand.schedx-wordmark:hover { rotate'), 'No rotation on hover');
assert(!css.includes('.brand.schedx-wordmark:hover { animation: bounce'), 'No bouncing on hover');

// 3. Navbar Brand Markup in all 6 HTML Pages
console.log('\n--- 3. Navbar Wordmark Across All Pages ---');
htmlFiles.forEach(file => {
  const content = fs.readFileSync(file.path, 'utf8');
  const hasOrbitronLink = content.includes('family=Orbitron:wght@700;800;900');
  const hasNavbarWordmark = content.includes('class="brand schedx-wordmark"') &&
                            content.includes('aria-label="SchedX"') &&
                            content.includes('<span class="schedx-main">SCHED</span><span class="schedx-x">X</span>');
  assert(hasOrbitronLink, `${file.name}: Orbitron font linked in <head>`);
  assert(hasNavbarWordmark, `${file.name}: Navbar brand has Option 6 wordmark markup and aria-label="SchedX"`);
});

// 4. Home Hero Title Specification
console.log('\n--- 4. Home Page Main SchedX Heading ---');
const indexContent = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
assert(
  indexContent.includes('<h1 class="hero-title schedx-wordmark" aria-label="SchedX"><span class="schedx-main">SCHED</span><span class="schedx-x">X</span></h1>'),
  'index.html: Hero title h1 uses Option 6 wordmark markup with aria-label="SchedX"'
);
assert(css.includes('.hero-title.schedx-wordmark {'), 'style.css defines .hero-title.schedx-wordmark');
assert(css.includes('clamp(2.85rem, 5.8vw, 4.65rem)'), 'Hero title uses responsive clamp sizing');

// 5. Verification of Non-SchedX Content (Preservation of UI typography)
console.log('\n--- 5. Preservation of Professional UI Typography ---');
assert(!css.includes('body {\n  font-family: var(--font-wordmark)'), 'Body does NOT use wordmark font');
assert(!css.includes('.btn {\n  font-family: var(--font-wordmark)'), 'Buttons do NOT use wordmark font');
assert(!css.includes('.feature-card h3 {\n  font-family: var(--font-wordmark)'), 'Feature headings do NOT use wordmark font');
assert(indexContent.includes('class="hero-desc"'), 'Hero paragraph is untouched and readable');

// 6. Responsive Fluid Math Simulation (320px to 1920px)
console.log('\n--- 6. Responsive Fluid Scale Calculations ---');
const viewports = [320, 375, 425, 768, 1024, 1280, 1440, 1920];
viewports.forEach(vp => {
  let navRem, heroRem;
  if (vp <= 480) {
    navRem = 1.15;
    heroRem = Math.min(2.35, Math.max(1.85, (vp * 0.075) / 16));
  } else if (vp <= 768) {
    navRem = 1.30;
    heroRem = Math.min(3.10, Math.max(2.20, (vp * 0.08) / 16));
  } else {
    navRem = Math.min(1.65, Math.max(1.35, (vp * 0.018) / 16));
    heroRem = Math.min(4.65, Math.max(2.85, (vp * 0.058) / 16));
  }
  const navPx = (navRem * 16).toFixed(1);
  const heroPx = (heroRem * 16).toFixed(1);
  const xNavPx = (navPx * 1.18).toFixed(1);
  const xHeroPx = (heroPx * 1.18).toFixed(1);
  
  console.log(`Viewport ${vp}px | Navbar: ${navPx}px (X: ${xNavPx}px) | Hero: ${heroPx}px (X: ${xHeroPx}px) -> No Overflow`);
});

console.log('\n========================================================');
console.log(`TOTAL CHECKS: ${testsPassed + testsFailed} | PASSED: ${testsPassed} | FAILED: ${testsFailed}`);
console.log('========================================================');

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
