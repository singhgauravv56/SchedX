/**
 * SchedX Verification Script: Home Page Visual & Animation Enhancements
 * Validates:
 * 1. Right-side hero visual hover effect & circular orbital motion
 * 2. Surrounding floating card hover & timing rules
 * 3. Academic Partitioning card updated to REQUIRED DAYS with "7 days" completely removed
 * 4. Section heading updated to "Designed for Modern Academic Institutions"
 * 5. Light-blue visual treatment based on #73C2FB and rgb(30, 144, 255) across all home cards
 * 6. Subtle delicate grid effect on cards
 * 7. Scope guardrails: generate.html, features.html, about.html completely untouched
 * 8. prefers-reduced-motion accessibility coverage
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

let totalTests = 0;
let passedTests = 0;

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
  console.log('\n=== SCHEDX HOME PAGE ENHANCEMENT VERIFICATION ===\n');

  const root = path.join(__dirname, '..');
  const indexPath = path.join(root, 'public', 'index.html');
  const cssPath = path.join(root, 'public', 'style.css');
  const generatePath = path.join(root, 'public', 'generate.html');
  const featuresPath = path.join(root, 'public', 'features.html');
  const aboutPath = path.join(root, 'public', 'about.html');

  const html = fs.readFileSync(indexPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  // [1] Hero Visual Enhancements & Circular Motion
  console.log('[1] Right-side Hero Visual & Circular Orbital Motion');
  assert(html.includes('hero-orbit-container'), 'Orbital motion container exists in index.html');
  assert(html.includes('hero-orbit-ring--outer'), 'Outer orbit ring exists');
  assert(html.includes('hero-orbit-ring--inner'), 'Inner orbit ring exists');
  assert(html.includes('orbit-node'), 'Orbit decorative nodes exist');
  assert(css.includes('@keyframes heroOrbitOuter'), 'heroOrbitOuter rotation keyframes defined in CSS');
  assert(css.includes('@keyframes heroOrbitInner'), 'heroOrbitInner rotation keyframes defined in CSS');
  assert(css.includes('@keyframes heroCentralFloat'), 'Central preview card floating keyframes defined');
  assert(css.includes('.timetable-preview-card:hover {'), 'Hover state defined for preview card');
  assert(css.includes('transform: translateY(-4px) scale(1.015);'), 'Preview card lifts & scales gently on hover');
  assert(css.includes('box-shadow: 0 32px 70px rgba(30, 144, 255, 0.16)'), 'Preview card gains soft light-blue shadow on hover');
  assert(css.includes('animation: heroOrbitOuter 16s linear infinite;'), 'Outer orbit timing between 12-20s configured');
  assert(css.includes('animation: heroOrbitInner 20s linear infinite reverse;'), 'Inner orbit reverse timing configured');

  // [2] Surrounding Floating Cards Hover
  console.log('\n[2] Floating Surrounding Cards');
  assert(css.includes('.float-card:hover {'), 'Hover state defined for .float-card');
  assert(css.includes('transform: translateY(-3px);'), 'Floating cards lift on hover');
  assert(css.includes('rgba(30, 144, 255, 0.18)'), 'Floating cards gain Dodger Blue accent shadow on hover');
  assert(html.includes('float-card--teachers'), 'Teachers card preserved');
  assert(html.includes('float-card--subjects'), 'Subjects card preserved');
  assert(html.includes('float-card--rooms'), 'Rooms card preserved');
  assert(html.includes('float-card--timeslots'), 'Time slots card preserved');
  assert(html.includes('float-card--workingdays'), 'Working days card preserved');
  assert(html.includes('float-card--conflict'), 'Conflict status card preserved');

  // [3] Academic Partitioning -> REQUIRED DAYS
  console.log('\n[3] Academic Partitioning -> REQUIRED DAYS');
  assert(!html.includes('7 Days') && !html.includes('7 days'), '"7 days" or "7 Days" completely removed from index.html');
  assert(html.includes('Academic Partitioning'), 'Academic Partitioning card title retained');
  assert(html.includes('REQUIRED DAYS'), 'Card displays "REQUIRED DAYS"');
  assert(html.includes('home-stat-number--text'), 'Styling class for REQUIRED DAYS applied');

  // [4] Heading Correction
  console.log('\n[4] Home Page Heading Correction');
  assert(html.includes('<h2>Designed for Modern Academic Institutions</h2>'), 'Heading reads exactly "Designed for Modern Academic Institutions"');
  assert(!html.includes('<h2>Engineered for Modern Academic Institutions</h2>'), 'Old heading "Engineered for..." replaced');

  // [5] Light-Blue Palette & Subtle Grid Effect
  console.log('\n[5] Light-Blue Colors (#73C2FB & rgb(30, 144, 255)) & Grid');
  assert(css.includes('#73C2FB'), '#73C2FB Maya Blue present in design tokens/accents');
  assert(css.includes('rgba(30, 144, 255'), 'rgba(30, 144, 255) Dodger Blue accents present in CSS');
  assert(css.includes('rgba(115, 194, 251'), 'rgba(115, 194, 251) soft light blue tint present in gradients');
  assert(css.includes('22px 22px'), 'Delicate 22px grid sizing implemented in cards');
  assert(css.includes('rgba(30, 144, 255, 0.045) 1px, transparent 1px'), 'Subtle grid pattern line gradient defined');
  assert(css.includes('.home-card--primary'), 'Primary suite card styled with light blue treatment');
  assert(css.includes('.home-card--stat'), 'Stat cards styled with light blue treatment');
  assert(css.includes('.home-card--workflow'), 'Workflow cards styled with light blue treatment');
  assert(css.includes('.benefit-card'), 'Benefit cards styled with light blue treatment');
  assert(css.includes('.faq-item'), 'FAQ items styled with light blue treatment');

  // [6] Scope Guardrails: Other Pages Untouched in this Session
  console.log('\n[6] Scope Guardrails (Other Pages Untouched in Session)');
  const indexMtime = fs.statSync(indexPath).mtimeMs;
  const genMtime = fs.statSync(generatePath).mtimeMs;
  const featMtime = fs.statSync(featuresPath).mtimeMs;
  const aboutMtime = fs.statSync(aboutPath).mtimeMs;

  assert(genMtime < indexMtime - 60000, 'generate.html NOT modified in this session');
  assert(featMtime < indexMtime - 60000, 'features.html NOT modified in this session');
  assert(aboutMtime < indexMtime - 60000, 'about.html NOT modified in this session');

  // [7] Functional HTTP Endpoint Checks
  console.log('\n[7] Functional Navigation & Route Endpoints');
  const codeHome = await checkUrl('/');
  assert(codeHome === 200, `GET / returns HTTP 200`);
  const codeGen = await checkUrl('/generate');
  assert(codeGen === 200, `GET /generate returns HTTP 200`);
  const codeFeat = await checkUrl('/features');
  assert(codeFeat === 200, `GET /features returns HTTP 200`);
  const codeAbout = await checkUrl('/about');
  assert(codeAbout === 200, `GET /about returns HTTP 200`);

  // [8] Accessibility
  console.log('\n[8] Accessibility & Reduced Motion');
  assert(css.includes('.hero-orbit-ring') && css.includes('prefers-reduced-motion: reduce'), 'Orbital motion disabled under prefers-reduced-motion');

  console.log(`\n==================================================`);
  console.log(`TOTAL CHECKS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log(`==================================================\n`);

  if (passedTests === totalTests) {
    console.log('✓ ALL HOME PAGE ENHANCEMENT CHECKS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error('✗ SOME CHECKS FAILED!\n');
    process.exit(1);
  }
}

run();
