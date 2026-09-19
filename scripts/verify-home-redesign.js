/**
 * SchedX Verification Script: Professional Home Page Redesign
 * Tests:
 * 1. Two-column Hero structure in public/index.html (Left: copy/CTAs/pills, Right: timetable mockup/floating cards)
 * 2. 3 Supporting feature pills representing real checks (Teacher, Room, Conflict)
 * 3. Timetable preview mockup with window header, days, time slots, and curated lecture chips
 * 4. 4 Curated floating status cards (Conflict Free, Teachers, Rooms & Labs, Zero Overlap)
 * 5. Functional HTTP routes (/generate, /features, /)
 * 6. CSS design tokens, 2-column grid, radial ambient glow, hover dynamics, responsive queries, and reduced motion
 * 7. Non-regression checks for Navbar, Footer, Platform Overview, and Workflow sections
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function checkUrl(urlPath) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${urlPath}`, (res) => {
      resolve(res.statusCode);
    });
    req.on('error', () => {
      resolve(null);
    });
  });
}

async function run() {
  console.log('\n=== SCHEDX PROFESSIONAL HOME PAGE REDESIGN VERIFICATION ===\n');

  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  const cssPath = path.join(__dirname, '..', 'public', 'style.css');

  const html = fs.readFileSync(indexPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  // [1] Left Column: Value Proposition & Actions
  console.log('[1] Hero Left Column: Copy, CTAs & Supporting Pills');
  assert(html.includes('hero-section section'), 'Hero section exists with proper semantic classes');
  assert(html.includes('hero-grid'), 'Hero grid container exists');
  assert(html.includes('hero-copy'), 'Hero copy container exists');
  assert(html.includes('hero-eyebrow') && html.includes('Smart Timetable Generator'), 'Eyebrow pill with title exists');
  assert(html.includes('eyebrow-dot'), 'Eyebrow accent indicator dot exists');
  assert(html.includes('hero-title') && html.includes('SchedX'), 'Main hero title SchedX exists');
  assert(html.includes('hero-desc'), 'Hero description paragraph exists');
  assert(html.includes('hero-actions'), 'Hero actions button container exists');
  assert(html.includes('id="heroGenerateCta"') && html.includes('href="/generate"'), 'Primary CTA links to /generate');
  assert(html.includes('id="heroFeaturesCta"') && html.includes('href="/features"'), 'Secondary CTA links to /features');
  assert(html.includes('hero-trust-pills'), 'Supporting trust pills container exists');
  assert(html.includes('Teacher checks'), 'Pill 1: Teacher checks exists');
  assert(html.includes('Room checks'), 'Pill 2: Room checks exists');
  assert(html.includes('Conflict prevention'), 'Pill 3: Conflict prevention exists');

  // [2] Right Column: Timetable Product Visualization
  console.log('\n[2] Hero Right Column: Timetable Product Visualization');
  assert(html.includes('hero-visual'), 'Hero visual container exists');
  assert(html.includes('hero-visual-glow'), 'Ambient background glow element exists');
  assert(html.includes('timetable-preview-card'), 'Timetable preview mockup card exists');
  assert(html.includes('preview-card-header'), 'Mockup window header exists');
  assert(html.includes('window-controls'), 'Mockup window controls exist');
  assert(html.includes('preview-status-badge') && html.includes('Active'), 'Active schedule status badge exists');
  assert(html.includes('preview-timetable'), 'Interactive timetable grid exists');
  assert(html.includes('MON') && html.includes('TUE') && html.includes('WED') && html.includes('THU') && html.includes('FRI'), 'Day headers MON-FRI present');
  assert(html.includes('09:00') && html.includes('10:00') && html.includes('11:00'), 'Time slots 09:00, 10:00, 11:00 present');
  assert(html.includes('Mathematics') && html.includes('Physics Lab') && html.includes('Computer Sci') && html.includes('Chemistry'), 'Curated subject chips present');

  // [3] Floating Status Cards
  console.log('\n[3] Floating Status Cards');
  assert(html.includes('hero-float-cards-grid'), 'Floating cards container exists');
  assert(html.includes('float-card--conflict') && html.includes('Conflict Free'), 'Floating card 1: Conflict Free indicator exists');
  assert(html.includes('float-card--teachers') && html.includes('12') && html.includes('Teachers Assigned'), 'Floating card 2: Teachers Assigned exists');
  assert(html.includes('float-card--rooms') && html.includes('8') && html.includes('Rooms &amp; Labs'), 'Floating card 3: Rooms & Labs exists');
  assert(html.includes('float-card--sections') && html.includes('100%') && html.includes('Zero Overlap'), 'Floating card 4: Zero Overlap exists');

  // [4] Functional Route Checks
  console.log('\n[4] Functional HTTP Endpoint Checks');
  const codeHome = await checkUrl('/');
  assert(codeHome === 200, `GET / returned HTTP ${codeHome}`);
  const codeGen = await checkUrl('/generate');
  assert(codeGen === 200, `GET /generate returned HTTP ${codeGen}`);
  const codeFeatures = await checkUrl('/features');
  assert(codeFeatures === 200, `GET /features returned HTTP ${codeFeatures}`);

  // [5] CSS Styling & Layout
  console.log('\n[5] CSS Layout, Tokens, Hover & Media Queries');
  assert(css.includes('grid-template-columns: 1.05fr 1fr;'), '2-column hero grid configured for desktop');
  assert(css.includes('.hero-visual-glow {'), 'Ambient glow styling defined in CSS');
  assert(css.includes('.timetable-preview-card {'), 'Timetable preview card rule defined');
  assert(css.includes('border-radius: 22px;'), 'Preview card border radius set to 22px');
  assert(css.includes('.float-card:hover {'), 'Hover micro-interaction defined for floating cards');
  assert(css.includes('transform: translateY(-3px);'), 'Floating cards lift -3px on hover');
  assert(css.includes('@media (max-width: 980px)'), 'Mobile/tablet media query handles single-column collapse');
  assert(css.includes('.hero-float-cards-grid {') && css.includes('grid-template-columns: repeat(2, 1fr);'), 'Floating cards adapt into clean 2x2 static grid on tablet/mobile');
  assert(css.includes('prefers-reduced-motion: reduce'), 'prefers-reduced-motion covers hero elements');

  // [6] Scope Guardrails & Non-Regression
  console.log('\n[6] Scope Guardrails & Non-Regression');
  assert(html.includes('class="site-header"'), 'Navbar header remains intact');
  assert(html.includes('class="site-footer"'), 'Footer remains intact');
  assert(html.includes('class="section home-overview-section"'), 'Platform overview section preserved');
  assert(html.includes('class="section workflow-section"'), 'Workflow section preserved');
  assert(!html.includes('feature-zigzag'), 'Zigzag layout was NOT used on Home Page');

  console.log(`\nResults: ${passedTests} / ${totalTests} assertions passed.\n`);

  if (passedTests === totalTests) {
    console.log('✓ ALL PROFESSIONAL HOME PAGE REDESIGN VERIFICATIONS PASSED!\n');
    process.exit(0);
  } else {
    console.error('✗ SOME VERIFICATIONS FAILED.\n');
    process.exit(1);
  }
}

run();
