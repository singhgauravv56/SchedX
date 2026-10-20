const fs = require('fs');
const path = require('path');

async function verifyFeatureVisualsAndHeadings() {
  console.log('================================================================');
  console.log('  SCHEDX FEATURE VISUALS & UNIQUE PAGE HEADINGS VERIFICATION    ');
  console.log('================================================================\n');

  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;

  function test(category, desc, condition, details = '') {
    totalChecks++;
    if (condition) {
      console.log(`✅ PASS [${category}] | ${desc}${details ? ' -> ' + details : ''}`);
      passedChecks++;
    } else {
      console.log(`❌ FAIL [${category}] | ${desc}${details ? ' -> ' + details : ''}`);
      failedChecks++;
    }
  }

  const publicDir = path.join(__dirname, '..', 'public');
  const featuresHtml = fs.readFileSync(path.join(publicDir, 'features.html'), 'utf8');
  const generateHtml = fs.readFileSync(path.join(publicDir, 'generate.html'), 'utf8');
  const aboutHtml = fs.readFileSync(path.join(publicDir, 'about.html'), 'utf8');
  const roomsHtml = fs.readFileSync(path.join(publicDir, 'rooms.html'), 'utf8');
  const teachAvailHtml = fs.readFileSync(path.join(publicDir, 'teacher-availability.html'), 'utf8');
  const teachInfoHtml = fs.readFileSync(path.join(publicDir, 'teacher-info.html'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(publicDir, 'style.css'), 'utf8');
  const scriptJs = fs.readFileSync(path.join(publicDir, 'script.js'), 'utf8');

  // ============================================================================
  // 1. FEATURES PAGE VISUALS & ZIG-ZAG ARCHITECTURE
  // ============================================================================
  console.log('--- 1. Features Page Visuals & Alternating Rhythm ---');

  const rowMatches = featuresHtml.match(/class="[^"]*features-zigzag-row[^"]*"/g) || [];
  test('ZIGZAG', 'Exactly 9 feature rows configured', rowMatches.length === 9, `Found: ${rowMatches.length}`);

  const cardMatches = featuresHtml.match(/<article[^>]*class="[^"]*zigzag-card[^"]*"/g) || [];
  test('ZIGZAG', 'Exactly 9 feature cards present', cardMatches.length === 9, `Found: ${cardMatches.length}`);

  const visualMatches = featuresHtml.match(/class="[^"]*zigzag-visual-container[^"]*"/g) || [];
  test('ZIGZAG', 'Exactly 9 feature visuals present', visualMatches.length === 9, `Found: ${visualMatches.length}`);

  // Test alternating layout row by row
  const rowChunks = featuresHtml.split(/<!-- ROW \d+:/).slice(1);
  test('ZIGZAG', 'Split into exactly 9 row chunks', rowChunks.length === 9, `Found: ${rowChunks.length}`);

  rowChunks.forEach((chunk, index) => {
    const featNum = index + 1;
    const cardPos = chunk.indexOf('<article');
    const visualPos = chunk.indexOf('class="zigzag-visual-wrap');

    test('ZIGZAG', `Row ${featNum}: contains both card and visual`, cardPos !== -1 && visualPos !== -1);

    if (featNum % 2 === 1) {
      // ODD (1, 3, 5, 7, 9): Card on LEFT, Visual on RIGHT
      test('ZIGZAG', `Feature ${featNum.toString().padStart(2, '0')}: Left Card -> Right Visual`, 
        chunk.includes('features-zigzag-row--left-card') && (cardPos < visualPos),
        'Card precedes Visual'
      );
    } else {
      // EVEN (2, 4, 6, 8): Visual on LEFT, Card on RIGHT
      test('ZIGZAG', `Feature ${featNum.toString().padStart(2, '0')}: Left Visual -> Right Card`, 
        chunk.includes('features-zigzag-row--right-card') && (visualPos < cardPos),
        'Visual precedes Card'
      );
    }
  });

  // Verify visual is strictly outside the card
  const cards = featuresHtml.match(/<article[\s\S]*?<\/article>/g) || [];
  const anyVisualInsideCard = cards.some(c => c.includes('zigzag-visual-container') || c.includes('zigzag-visual-wrap'));
  test('ZIGZAG', 'Visuals are strictly OUTSIDE feature boxes', !anyVisualInsideCard, 'No visual inside card');

  // Check specific visual implementations
  test('VISUALS', 'Visual 01: Smart Timetable Engine contains mini schedule grid', 
    featuresHtml.includes('visual--timetable-engine') && featuresHtml.includes('mock-schedule-row')
  );
  test('VISUALS', 'Visual 02: Teacher Availability contains 5-day availability matrix', 
    featuresHtml.includes('visual--teacher-avail') && featuresHtml.includes('mock-avail-grid')
  );
  test('VISUALS', 'Visual 03: Section & Class Organization contains cohort tracks', 
    featuresHtml.includes('visual--sections-org') && featuresHtml.includes('mock-cohort-track')
  );
  test('VISUALS', 'Visual 04: Room Management contains facility allocation cards', 
    featuresHtml.includes('visual--rooms-mgmt') && featuresHtml.includes('mock-facility-grid')
  );
  test('VISUALS', 'Visual 05: 3-Way Collision Prevention contains triple guard monitor', 
    featuresHtml.includes('visual--collision-guard') && featuresHtml.includes('mock-guard-list')
  );
  test('VISUALS', 'Visual 06: Day-by-Day Layout contains chronological period view', 
    featuresHtml.includes('visual--day-by-day') && featuresHtml.includes('mock-day-periods')
  );
  test('VISUALS', 'Visual 07: Live Class Monitor contains radar monitor and progress', 
    featuresHtml.includes('visual--live-monitor') && featuresHtml.includes('live-progress-bar')
  );
  test('VISUALS', 'Visual 08: Cloud Persistence contains synchronized entities', 
    featuresHtml.includes('visual--cloud-persistence') && featuresHtml.includes('mock-sync-entities-grid')
  );
  test('VISUALS', 'Visual 09: Storage contains stored repository items', 
    featuresHtml.includes('visual--storage-repo') && featuresHtml.includes('mock-storage-vault')
  );

  // ============================================================================
  // 2. SECURITY & PRIVACY AUDIT (BOX 8 & BOX 9 VISUALS)
  // ============================================================================
  console.log('\n--- 2. Security & Information Disclosure Audit on Visuals ---');

  const visual8Content = featuresHtml.substring(featuresHtml.indexOf('visual--cloud-persistence'), featuresHtml.indexOf('visual--storage-repo'));
  const visual9Content = featuresHtml.substring(featuresHtml.indexOf('visual--storage-repo'));

  const sensitiveKeywords = [
    'supabase.co', 'apikey', 'secret_key', 'service_role', 'postgresql://',
    'http 200', 'jwt', 'password', 'select * from', 'schema', 'db_password'
  ];

  sensitiveKeywords.forEach(kw => {
    test('SECURITY', `Visual 08 & 09 free from "${kw}"`, 
      !visual8Content.toLowerCase().includes(kw) && !visual9Content.toLowerCase().includes(kw),
      'Clean'
    );
  });

  // ============================================================================
  // 3. UNIQUE PAGE HEADING SYSTEM
  // ============================================================================
  console.log('\n--- 3. Unique Page Heading System ---');

  // Features Page Heading
  test('HEADING', 'Features Page has unique .page-heading--features wrapper', featuresHtml.includes('page-heading--features'));
  test('HEADING', 'Features Page eyebrow contains "EXPLORE SCHEDX"', featuresHtml.includes('EXPLORE SCHEDX'));
  test('HEADING', 'Features Page title is "FEATURES"', featuresHtml.includes('<h1 class="page-title page-title--features">FEATURES</h1>'));
  test('HEADING', 'Features Page has accent diamond indicator', featuresHtml.includes('accent-diamond'));
  test('HEADING', 'Features Page subtitle is "Everything you need for smarter scheduling"', featuresHtml.includes('Everything you need for smarter scheduling'));

  // Generate Page Heading
  test('HEADING', 'Generate Page has unique .page-heading--generate wrapper', generateHtml.includes('page-heading--generate'));
  test('HEADING', 'Generate Page eyebrow contains "BUILD YOUR SCHEDULE"', generateHtml.includes('BUILD YOUR SCHEDULE'));
  test('HEADING', 'Generate Page title is "GENERATE TIMETABLE"', generateHtml.includes('<h1 class="page-title page-title--generate">GENERATE TIMETABLE</h1>'));
  test('HEADING', 'Generate Page has studio indicator badge', generateHtml.includes('STUDIO MODE'));
  test('HEADING', 'Generate Page has technical bracket accent line', generateHtml.includes('accent-tech-bracket'));

  // About Us Page Heading
  test('HEADING', 'About Us Page has unique .page-heading--about wrapper', aboutHtml.includes('page-heading--about'));
  test('HEADING', 'About Us Page eyebrow contains "ABOUT SCHEDX"', aboutHtml.includes('ABOUT SCHEDX'));
  test('HEADING', 'About Us Page title is "SMARTER SCHEDULING"', aboutHtml.includes('<h1 class="page-title page-title--about">SMARTER SCHEDULING</h1>'));
  test('HEADING', 'About Us Page subtitle is "The idea behind SchedX"', aboutHtml.includes('The idea behind SchedX'));

  // Additional Sub-pages Unique Headings
  test('HEADING', 'Rooms Page has unique .page-heading--rooms', roomsHtml.includes('page-heading--rooms'));
  test('HEADING', 'Teacher Availability Page has unique .page-heading--availability', teachAvailHtml.includes('page-heading--availability'));
  test('HEADING', 'Teacher Profiles Page has unique .page-heading--profiles', teachInfoHtml.includes('page-heading--profiles'));

  // Home Page Preservation
  test('GUARDRAIL', 'Home Page does NOT use sub-page heading classes', 
    !indexHtml.includes('page-heading--features') && 
    !indexHtml.includes('page-heading--generate') &&
    !indexHtml.includes('page-heading--about')
  );
  test('GUARDRAIL', 'Home Page retains Option 6 SCHEDX Wordmark', indexHtml.includes('hero-title schedx-wordmark'));

  // ============================================================================
  // 4. CSS ARCHITECTURE, CO-ORDINATED HOVERS & RESPONSIVENESS
  // ============================================================================
  console.log('\n--- 4. CSS Architecture, Hover & Responsive Rules ---');

  test('CSS', '.features-zigzag-row flex layout defined', css.includes('.features-zigzag-row {') && css.includes('display: flex;'));
  test('CSS', '.zigzag-visual-container styled with gradient and shadow', css.includes('.zigzag-visual-container {') && css.includes('border-radius: 22px;'));
  test('CSS', 'Visual hover effect defined with elevation & scale', css.includes('.zigzag-visual-container:hover') && css.includes('scale(1.025)'));
  test('CSS', 'Coordinated hover: card hover activates visual lift', css.includes('.features-zigzag-row:has(.zigzag-card:hover) .zigzag-visual-container'));
  test('CSS', 'Coordinated hover: visual hover activates card highlight', css.includes('.features-zigzag-row:has(.zigzag-visual-wrap:hover) .zigzag-card'));
  test('CSS', 'Keyframe visualSlideInLeft defined', css.includes('@keyframes visualSlideInLeft'));
  test('CSS', 'Keyframe visualSlideInRight defined', css.includes('@keyframes visualSlideInRight'));
  test('CSS', 'Mobile layout @media (max-width: 900px) stacks cards and visuals', 
    css.includes('@media (max-width: 900px)') && css.includes('.features-zigzag-row')
  );
  test('CSS', 'Accessibility: prefers-reduced-motion disables visual slide animations', 
    css.includes('@media (prefers-reduced-motion: reduce)') && css.includes('zigzag-visual-wrap')
  );

  // ============================================================================
  // 5. JAVASCRIPT SCROLL OBSERVER & HOVER CONTROLLER
  // ============================================================================
  console.log('\n--- 5. JavaScript Scroll Observer & Interactions ---');

  test('JS', 'initFeatureVisualInteractions function defined', scriptJs.includes('function initFeatureVisualInteractions()'));
  test('JS', 'IntersectionObserver used for progressive scroll entrance', scriptJs.includes('new IntersectionObserver('));
  test('JS', 'Coordinated mouseenter/mouseleave hover listeners bound', scriptJs.includes('is-card-hovered') && scriptJs.includes('is-visual-hovered'));
  test('JS', 'prefersReducedMotion checked in script.js', scriptJs.includes('prefersReducedMotion'));
  test('JS', 'initFeatureVisualInteractions called in DOMContentLoaded', scriptJs.includes('initFeatureVisualInteractions();'));

  // ============================================================================
  // 6. LIVE HTTP ENDPOINT VERIFICATION
  // ============================================================================
  console.log('\n--- 6. Live HTTP Endpoints ---');

  const endpoints = ['/', '/features', '/generate', '/about', '/rooms', '/teacher-availability', '/teacher-info'];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:3000${ep}`);
      test('NETWORK', `GET ${ep} returned HTTP 200`, res.status === 200, `Status: ${res.status}`);
    } catch (e) {
      test('NETWORK', `GET ${ep} connection`, false, e.message);
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================');
  console.log(`TOTAL CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
  console.log(failedChecks === 0 ? '🎉 ALL FEATURE VISUALS & HEADING VERIFICATIONS PASSED!' : '❌ SOME CHECKS FAILED');
  console.log('================================================================\n');

  if (failedChecks > 0) {
    process.exit(1);
  }
}

verifyFeatureVisualsAndHeadings().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
