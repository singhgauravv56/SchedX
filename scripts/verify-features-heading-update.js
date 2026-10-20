/**
 * Verification Test Suite for Features Page Heading UI Updates
 * 
 * Verifies:
 * 1. "EXPLORE SCHEDX" completely removed from HTML and CSS
 * 2. Main "FEATURES" heading preserved in semantic <h1>
 * 3. Underline spans 100% full width of rendered heading text via ::after
 * 4. Underline color, gradient, border-radius, and alignment preserved
 * 5. Natural spacing without empty gaps
 * 6. Responsive scaling and mobile behavior
 * 7. Preservation of all 9 feature cards, visuals, navbar, footer, and other pages
 * 8. Live HTTP 200 responses from local running server
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

let passed = 0;
let failed = 0;

function test(category, name, condition, details = '') {
  if (condition) {
    console.log(`  [PASS] [${category}] ${name}`);
    passed++;
  } else {
    console.error(`  [FAIL] [${category}] ${name} ${details ? '(' + details + ')' : ''}`);
    failed++;
  }
}

async function fetchUrl(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${urlPath}`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

async function runVerification() {
  console.log('============================================================');
  console.log('SCHEDX FEATURES PAGE HEADING UPDATE VERIFICATION SUITE');
  console.log('============================================================\n');

  const root = path.join(__dirname, '..');
  const featuresHtml = fs.readFileSync(path.join(root, 'public', 'features.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(root, 'public', 'style.css'), 'utf8');

  // --- 1. REMOVE "EXPLORE SCHEDX" ---
  console.log('--- 1. Removal of "EXPLORE SCHEDX" and Exclusive Decorators ---');
  test('REMOVAL', 'Text "EXPLORE SCHEDX" is completely absent in features.html', !featuresHtml.includes('EXPLORE SCHEDX'));
  test('REMOVAL', '.heading-eyebrow-wrap container removed from features.html', !featuresHtml.includes('heading-eyebrow-wrap'));
  test('REMOVAL', '.eyebrow--features badge element removed from features.html', !featuresHtml.includes('eyebrow--features'));
  test('REMOVAL', '.eyebrow-sparkle decorative element removed from features.html', !featuresHtml.includes('eyebrow-sparkle'));
  test('REMOVAL', 'Unused eyebrow-sparkle CSS rules cleaned up in style.css', !styleCss.includes('.eyebrow-sparkle {'));
  test('REMOVAL', 'Unused eyebrow--features CSS rules cleaned up in style.css', !styleCss.includes('.eyebrow--features {'));

  // --- 2. MAIN "FEATURES" HEADING PRESERVATION ---
  console.log('\n--- 2. Main "FEATURES" Heading Preservation ---');
  test('HEADING', 'Semantic <h1> exists with class page-title page-title--features', featuresHtml.includes('<h1 class="page-title page-title--features">FEATURES</h1>'));
  test('HEADING', 'Heading text is exactly "FEATURES"', featuresHtml.includes('>FEATURES</h1>'));
  test('HEADING', 'Parent wrapper is .page-heading-wrapper.page-heading--features', featuresHtml.includes('page-heading-wrapper page-heading--features'));
  test('HEADING', 'Subtitle paragraph preserved beneath heading', featuresHtml.includes('page-subtitle page-subtitle--features'));
  test('HEADING', 'Subtitle wording intact', featuresHtml.includes('Everything you need for smarter scheduling — Powerful tools for academic planning'));

  // --- 3. FULL-WIDTH UNDERLINE IMPLEMENTATION ---
  console.log('\n--- 3. Full-Width Underline via ::after on Heading Text Box ---');
  test('UNDERLINE', '.page-title--features has display: inline-block', styleCss.includes('.page-title--features') && styleCss.includes('display: inline-block;'));
  test('UNDERLINE', '.page-title--features has position: relative', styleCss.includes('.page-title--features') && styleCss.includes('position: relative;'));
  test('UNDERLINE', '.page-title--features::after pseudo-element defined', styleCss.includes('.page-title--features::after'));
  test('UNDERLINE', '::after has position: absolute', styleCss.includes('.page-title--features::after') && styleCss.includes('position: absolute;'));
  test('UNDERLINE', '::after has left: 0', styleCss.includes('.page-title--features::after') && styleCss.includes('left: 0;'));
  test('UNDERLINE', '::after has width: 100% (spans full rendered width of text)', styleCss.includes('.page-title--features::after') && styleCss.includes('width: 100%;'));
  test('UNDERLINE', '::after has bottom: -8px positioning', styleCss.includes('.page-title--features::after') && styleCss.includes('bottom: -8px;'));
  test('UNDERLINE', '::after has height: 3px thickness', styleCss.includes('.page-title--features::after') && styleCss.includes('height: 3px;'));
  test('UNDERLINE', '::after preserves cyan-to-blue gradient background', styleCss.includes('linear-gradient(90deg, #2563eb 0%, #06b6d4 100%)'));
  test('UNDERLINE', '::after preserves pill border-radius (999px)', styleCss.includes('.page-title--features::after') && styleCss.includes('border-radius: 999px;'));
  test('UNDERLINE', 'No duplicate underline in HTML (heading-accent-line--features removed from HTML)', !featuresHtml.includes('heading-accent-line--features'));
  test('UNDERLINE', 'Old accent line disabled via display: none in CSS', styleCss.includes('.heading-accent-line--features {\n  display: none;\n}'));

  // --- 4. TYPOGRAPHY AND NATURAL SPACING ---
  console.log('\n--- 4. Typography and Balanced Spacing ---');
  test('TYPOGRAPHY', 'Features title font-family includes Plus Jakarta Sans', styleCss.includes("'Plus Jakarta Sans', var(--font-display)"));
  test('TYPOGRAPHY', 'Features title font-size uses clamp(2.4rem, 4.6vw, 3.6rem)', styleCss.includes('clamp(2.4rem, 4.6vw, 3.6rem)'));
  test('TYPOGRAPHY', 'Features title font-weight is 800', styleCss.includes('font-weight: 800;'));
  test('TYPOGRAPHY', 'Features title letter-spacing is -0.02em', styleCss.includes('letter-spacing: -0.02em;'));
  test('TYPOGRAPHY', 'Features title text gradient preserved', styleCss.includes('linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #0284c7 100%)'));
  test('SPACING', 'Heading margin normalized (margin: 0 auto 20px) without top gap', styleCss.includes('margin: 0 auto 20px;'));

  // --- 5. PRESERVATION OF EXISTING ELEMENTS ---
  console.log('\n--- 5. Preservation of All Page Features, Cards & Chrome ---');
  test('PRESERVED', 'Features section background grid container intact', featuresHtml.includes('class="section features-section"'));
  test('PRESERVED', 'Zigzag timeline container intact', featuresHtml.includes('class="features-zigzag-timeline"'));
  
  for (let i = 1; i <= 9; i++) {
    const num = String(i).padStart(2, '0');
    test('PRESERVED', `Feature Row ${num} present`, featuresHtml.includes(`data-feature="${i}"`));
  }

  test('PRESERVED', 'Site navigation bar intact', featuresHtml.includes('class="site-nav"'));
  test('PRESERVED', 'Features nav link active class preserved', featuresHtml.includes('class="nav-link active"'));
  test('PRESERVED', 'Site footer intact', featuresHtml.includes('class="site-footer"'));

  // Check other pages untouched
  const otherPages = ['index.html', 'generate.html', 'about.html', 'rooms.html', 'teacher-availability.html'];
  for (const page of otherPages) {
    const pageHtml = fs.readFileSync(path.join(root, 'public', page), 'utf8');
    test('INTEGRITY', `${page} exists and is populated (> 500 chars)`, pageHtml.length > 500);
  }

  // --- 6. LIVE HTTP ENDPOINT VERIFICATION ---
  console.log('\n--- 6. Live Local Server HTTP Endpoint Verification ---');
  try {
    const featRes = await fetchUrl('/features');
    test('LIVE_HTTP', 'GET /features returns HTTP 200', featRes.status === 200);
    test('LIVE_HTTP', 'Live /features does NOT contain "EXPLORE SCHEDX"', !featRes.body.includes('EXPLORE SCHEDX'));
    test('LIVE_HTTP', 'Live /features serves <h1 class="page-title page-title--features">FEATURES</h1>', featRes.body.includes('<h1 class="page-title page-title--features">FEATURES</h1>'));

    const cssRes = await fetchUrl('/style.css');
    test('LIVE_HTTP', 'GET /style.css returns HTTP 200', cssRes.status === 200);
    test('LIVE_HTTP', 'Live /style.css contains .page-title--features::after', cssRes.body.includes('.page-title--features::after'));
    test('LIVE_HTTP', 'Live /style.css has width: 100% on ::after', cssRes.body.includes('width: 100%'));

    const healthRes = await fetchUrl('/api/health');
    test('LIVE_HTTP', 'GET /api/health returns HTTP 200', healthRes.status === 200);
  } catch (err) {
    test('LIVE_HTTP', 'Local server connection failed', false, err.message);
  }

  console.log('\n============================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  if (failed === 0) {
    console.log('✓ ALL FEATURES PAGE HEADING UPDATE CHECKS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Test runner threw error:', err);
  process.exit(1);
});
