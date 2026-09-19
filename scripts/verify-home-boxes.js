/**
 * SchedX Verification Script: Home Page Boxes & Cards
 * Tests:
 * 1. Card count and hierarchy in public/index.html
 * 2. Real links and functional HTTP endpoints (/generate, /teacher-availability, /rooms)
 * 3. CSS definitions, rounded corners, hover transitions, and responsive queries in public/style.css
 * 4. Non-regression checks for Navbar, Hero, and Features Page
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
    req.on('error', (err) => {
      resolve(null);
    });
  });
}

async function run() {
  console.log('\n=== SCHEDX HOME PAGE BOX / CARD VERIFICATION ===\n');

  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  const cssPath = path.join(__dirname, '..', 'public', 'style.css');

  const html = fs.readFileSync(indexPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  // 1. Structure Tests in index.html
  console.log('[1] HTML Card & Grid Structure');
  assert(html.includes('home-overview-section'), 'Overview section exists in index.html');
  assert(html.includes('home-dashboard-grid'), 'Dashboard 3-column grid exists');
  assert(html.includes('home-card--primary'), 'Primary CTA card exists');
  assert(html.includes('home-card--action'), 'Action cards exist');
  assert(html.includes('home-stats-grid'), 'Statistics grid exists');
  assert(html.includes('home-card--stat'), 'Stat cards exist');
  assert(html.includes('home-card--workflow'), 'Workflow cards exist');

  // Count matches
  const primaryCount = (html.match(/home-card--primary/g) || []).length;
  assert(primaryCount === 1, `Expected 1 primary card, found ${primaryCount}`);

  const actionCount = (html.match(/home-card--action/g) || []).length;
  assert(actionCount === 2, `Expected 2 action cards, found ${actionCount}`);

  const statCount = (html.match(/home-card--stat/g) || []).length;
  assert(statCount === 4, `Expected 4 statistic cards, found ${statCount}`);

  const workflowCount = (html.match(/home-card--workflow/g) || []).length;
  assert(workflowCount === 4, `Expected 4 workflow cards, found ${workflowCount}`);

  // Total cards (filter by exact class name token 'home-card')
  const classAttrs = html.match(/class="([^"]+)"/g) || [];
  const homeCardElements = classAttrs.filter(attr => {
    const classes = attr.replace('class="', '').replace('"', '').split(/\s+/);
    return classes.includes('home-card');
  });
  assert(homeCardElements.length === 11, `Expected 11 total home cards, found ${homeCardElements.length}`);

  // 2. Functional Action Link Checks
  console.log('\n[2] Functional CTA & Endpoint Checks');
  assert(html.includes('href="/generate"'), 'Primary card links to /generate');
  assert(html.includes('href="/teacher-availability"'), 'Action card links to /teacher-availability');
  assert(html.includes('href="/rooms"'), 'Action card links to /rooms');

  const codeHome = await checkUrl('/');
  assert(codeHome === 200, `GET / returned HTTP ${codeHome}`);

  const codeGen = await checkUrl('/generate');
  assert(codeGen === 200, `GET /generate returned HTTP ${codeGen}`);

  const codeFaculty = await checkUrl('/teacher-availability');
  assert(codeFaculty === 200, `GET /teacher-availability returned HTTP ${codeFaculty}`);

  const codeRooms = await checkUrl('/rooms');
  assert(codeRooms === 200, `GET /rooms returned HTTP ${codeRooms}`);

  // 3. CSS Tokens, Radii, Hover States & Responsive Media Queries
  console.log('\n[3] CSS Design Token & Styling Checks');
  assert(css.includes('.home-card {'), '.home-card rule exists in CSS');
  assert(css.includes('border-radius: 22px;'), 'Card border-radius set to modern 22px');
  assert(css.includes('.home-card:hover {'), 'Hover state defined for .home-card');
  assert(css.includes('transform: translateY(-4px) scale(1.01);'), 'Interactive translateY(-4px) hover effect configured');
  assert(css.includes('.home-card:focus-visible'), 'Accessible focus-visible ring configured');
  assert(css.includes('.home-card--primary'), 'Primary card styling variant exists');
  assert(css.includes('.home-card--stat'), 'Stat card styling variant exists');
  assert(css.includes('.home-card--workflow'), 'Workflow card styling variant exists');
  assert(css.includes('grid-template-columns: repeat(4, minmax(0, 1fr));'), 'Workflow grid rebalanced to 4 columns');
  assert(css.includes('@media (max-width: 1100px)'), 'Tablet media query handles home cards and grids');
  assert(css.includes('@media (max-width: 700px)'), 'Mobile media query stacks cards cleanly');
  assert(css.includes('prefers-reduced-motion: reduce'), 'prefers-reduced-motion accessibility rules present');

  // 4. Scope Guardrails
  console.log('\n[4] Scope Guardrails & Non-Regression');
  assert(html.includes('class="hero-section section"'), 'Hero section remains intact');
  assert(html.includes('class="site-nav"'), 'Navbar remains intact');
  assert(html.includes('class="site-footer"'), 'Footer remains intact');
  assert(!html.includes('feature-zigzag'), 'Zigzag layout was NOT applied to Home Page');

  console.log(`\nResults: ${passedTests} / ${totalTests} assertions passed.\n`);

  if (passedTests === totalTests) {
    console.log('✓ ALL HOME BOX REDESIGN VERIFICATIONS PASSED SUCCESSFULLY.\n');
    process.exit(0);
  } else {
    console.error('✗ SOME VERIFICATIONS FAILED.\n');
    process.exit(1);
  }
}

run();
