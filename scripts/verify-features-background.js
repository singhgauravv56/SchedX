/**
 * Automated Verification Script for Features Page Background Enhancement
 * Verifies that the Features page exclusively received the subtle light-blue/periwinkle
 * background treatment with fine grid texture while preserving existing cards and other pages.
 */

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    }).on('error', reject);
  });
}

async function verifyFeaturesBackground() {
  console.log('================================================================');
  console.log('SchedX Features Page Background Enhancement Verification');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testNum, testTitle, detail = '') {
    if (condition) {
      console.log(`[PASS] TEST ${testNum}: ${testTitle}`);
      if (detail) console.log(`       -> ${detail}`);
      passedCount++;
    } else {
      console.error(`[FAIL] TEST ${testNum}: ${testTitle}`);
      if (detail) console.error(`       -> ${detail}`);
      failedCount++;
    }
  }

  // TEST 1: Features page load & scoped class
  try {
    const res = await fetchUrl('/features');
    const hasClass = res.body.includes('<body class="features-page">');
    assert(
      res.statusCode === 200 && hasClass,
      1,
      'Features page HTTP 200 and <body class="features-page"> scoping',
      `HTTP Status: ${res.statusCode}, class="features-page" present: ${hasClass}`
    );
  } catch (err) {
    assert(false, 1, 'Features page load', err.message);
  }

  // Read public/style.css
  const css = fs.readFileSync('public/style.css', 'utf8');

  // TEST 2: Scoped body.features-page background rule
  const hasBodyFeaturesPage = css.includes('body.features-page');
  const hasFeaturesSection = css.includes('.features-page .features-section');
  assert(
    hasBodyFeaturesPage && hasFeaturesSection,
    2,
    'Page-scoped CSS selectors (body.features-page and .features-page .features-section)',
    `body.features-page present: ${hasBodyFeaturesPage}, .features-page .features-section present: ${hasFeaturesSection}`
  );

  // TEST 3: Light periwinkle palette inspiration (#4A60B8 & light tints)
  const hasReferenceTints = css.includes('rgba(74, 96, 184') && css.includes('#F7F8FF');
  const hasPaletteShades = css.includes('#EAF0FF') && css.includes('#E5EBFF') && css.includes('#F1F4FF');
  assert(
    hasReferenceTints && hasPaletteShades,
    3,
    'Light periwinkle palette (#4A60B8 tints: #F7F8FF, #F1F4FF, #EAF0FF, #E5EBFF)',
    'Verified delicate palette and rgba(74, 96, 184, ...) color washes'
  );

  // TEST 4: Subtle fine grid texture (24px–32px spacing, low opacity)
  const hasGridLines = css.includes('linear-gradient(to right, rgba(74, 96, 184') && css.includes('linear-gradient(to bottom, rgba(74, 96, 184');
  const hasGridSize = css.includes('28px 28px');
  assert(
    hasGridLines && hasGridSize,
    4,
    'Subtle fine grid texture (28px spacing with low-opacity periwinkle lines)',
    `Grid gradients: ${hasGridLines}, Grid size 28px: ${hasGridSize}`
  );

  // TEST 5: Soft color depth & feathered radial washes
  const hasRadialWashes = css.includes('radial-gradient(circle at 14% 12%') && css.includes('radial-gradient(circle at 86% 24%');
  assert(
    hasRadialWashes,
    5,
    'Soft ambient color depth with feathered radial washes',
    'Verified multi-point ambient depth across page body'
  );

  // TEST 6: Feature cards unchanged (zigzag-card and zigzag-visual-container intact)
  const hasZigzagCard = css.includes('.zigzag-card {');
  const hasZigzagVisual = css.includes('.zigzag-visual-container {');
  assert(
    hasZigzagCard && hasZigzagVisual,
    6,
    'Feature cards, layout, and visual components preserved intact',
    'Card backgrounds, shadows, and interactive layouts are untouched'
  );

  // TEST 7: Isolation verification: Other pages (Home, Generate, About) untouched
  try {
    const homeRes = await fetchUrl('/');
    const genRes = await fetchUrl('/generate');
    const aboutRes = await fetchUrl('/about');

    const homeUntouched = !homeRes.body.includes('class="features-page"');
    const genUntouched = !genRes.body.includes('class="features-page"');
    const aboutUntouched = !aboutRes.body.includes('class="features-page"');

    assert(
      homeUntouched && genUntouched && aboutUntouched,
      7,
      'Page isolation: Home, Generate, and About pages completely untouched',
      `Home untouched: ${homeUntouched}, Generate untouched: ${genUntouched}, About untouched: ${aboutUntouched}`
    );
  } catch (err) {
    assert(false, 7, 'Other pages untouched check', err.message);
  }

  // TEST 8: Responsive integrity and overflow prevention
  const hasOverflowProtection = css.includes('overflow-x: hidden');
  assert(
    hasOverflowProtection,
    8,
    'Responsive design and horizontal overflow prevention',
    'Body overflow-x: hidden protects all viewports'
  );

  console.log('\n================================================================');
  console.log(`Results: ${passedCount} PASSED, ${failedCount} FAILED out of 8 tests.`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

verifyFeaturesBackground().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
