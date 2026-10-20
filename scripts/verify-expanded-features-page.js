const fs = require('fs');
const path = require('path');
const http = require('http');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runFeaturesVerification() {
  console.log('========================================================');
  console.log('  SCHEDX FEATURES PAGE EXPANSION VERIFICATION SUITE     ');
  console.log('========================================================\n');

  const htmlPath = path.join(__dirname, '..', 'public', 'features.html');
  const cssPath = path.join(__dirname, '..', 'public', 'style.css');

  const html = fs.readFileSync(htmlPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  // 1. Verify All 17 Feature Boxes Exist
  console.log('\n--- 1. Feature Boxes (01 to 17) Verification ---');
  for (let i = 1; i <= 17; i++) {
    const numStr = i < 10 ? `0${i}` : `${i}`;
    assert(
      html.includes(`data-feature="${i}"`),
      `Feature Row ${numStr} exists with data-feature="${i}"`
    );
    assert(
      html.includes(`data-visual-for="${i}"`),
      `Feature Visual ${numStr} exists with data-visual-for="${i}"`
    );
  }

  // 2. Verify Alternating Zig-Zag Pattern
  console.log('\n--- 2. Alternating Zig-Zag Layout Verification ---');
  const expectedLayout = [
    { num: 1, type: 'left-card' },
    { num: 2, type: 'right-card' },
    { num: 3, type: 'left-card' },
    { num: 4, type: 'right-card' },
    { num: 5, type: 'left-card' },
    { num: 6, type: 'right-card' },
    { num: 7, type: 'left-card' },
    { num: 8, type: 'right-card' },
    { num: 9, type: 'left-card' },
    { num: 10, type: 'right-card' },
    { num: 11, type: 'left-card' },
    { num: 12, type: 'right-card' },
    { num: 13, type: 'left-card' },
    { num: 14, type: 'right-card' },
    { num: 15, type: 'left-card' },
    { num: 16, type: 'right-card' },
    { num: 17, type: 'left-card' }
  ];

  expectedLayout.forEach(({ num, type }) => {
    const rowRegex = new RegExp(`class="features-zigzag-row features-zigzag-row--${type}"[^>]*data-feature="${num}"`);
    assert(
      rowRegex.test(html),
      `Feature ${num < 10 ? '0' + num : num} has alternating layout class "features-zigzag-row--${type}"`
    );
  });

  // 3. Verify All New Feature Titles & Concepts (Boxes 10-17)
  console.log('\n--- 3. Required New Feature Titles & Concepts ---');
  const requiredTitles = [
    'Smart Subject Distribution',
    'Fixed & Locked Classes',
    'Teacher Workload',
    'Free Period Optimization',
    'Smart Room Assignment',
    'Section Workload',
    'Multiple Timetable Views',
    'Timetable Quality'
  ];

  requiredTitles.forEach(title => {
    assert(html.includes(`<h3>${title}</h3>`), `Card contains <h3>${title}</h3>`);
  });

  // 4. Verify Truthfulness and Accurate Implementation Constraints
  console.log('\n--- 4. Truthfulness & Non-Overpromising Verification ---');
  assert(
    html.includes('SchedX can intelligently distribute required subject sessions across available days while respecting scheduling constraints'),
    'Box 10 uses non-guarantee phrasing for smart subject distribution'
  );
  assert(
    html.includes('Composite quality score metric (Planned)') || html.includes('Composite 0–100 Score Metric: Planned capability'),
    'Box 17 marks composite score as planned capability'
  );
  assert(
    html.includes('Room &amp; laboratory view (Planned)') || html.includes('Room Matrix Perspective Planned'),
    'Box 16 marks room matrix view as planned perspective'
  );
  assert(
    !html.includes('automatically balances every teacher\'s workload perfectly'),
    'No exaggerated workload guarantees'
  );

  // 5. Verify Subtle Final CTA Card
  console.log('\n--- 5. Subtle Final CTA Section ---');
  assert(html.includes('class="features-final-cta-wrap"'), 'Final CTA wrapper is present');
  assert(html.includes('Ready to build a smarter timetable?'), 'Final CTA heading is present');
  assert(html.includes('href="/generate"'), 'Final CTA links to /generate');

  // 6. Verify Visual CSS Classes in style.css
  console.log('\n--- 6. Visual CSS Classes Verification ---');
  const requiredCssClasses = [
    '.visual--subject-dist',
    '.visual--locked-classes',
    '.visual--teacher-workload',
    '.visual--free-periods',
    '.visual--smart-room',
    '.visual--section-workload',
    '.visual--multiple-views',
    '.visual--timetable-quality',
    '.features-final-cta-wrap',
    '.features-final-cta-card'
  ];

  requiredCssClasses.forEach(cls => {
    assert(css.includes(cls), `CSS contains definition for ${cls}`);
  });

  // 7. Verify Responsive Media Query Stacking
  console.log('\n--- 7. Responsive CSS Verification ---');
  assert(
    css.includes('.features-zigzag-row--right-card .zigzag-visual-wrap') &&
    css.includes('.features-zigzag-row--left-card .zigzag-visual-wrap'),
    'CSS defines mobile order stacking for both left-card and right-card zig-zag rows'
  );

  // 8. Verify Modals for Feature Inspection
  console.log('\n--- 8. Interactive Modals & Handlers ---');
  const requiredModals = [
    'rulesModal',
    'currentClassModal',
    'storageModal',
    'storageViewerModal',
    'lockedClassesModal',
    'workloadModal',
    'viewsModal',
    'qualityModal'
  ];

  requiredModals.forEach(mId => {
    assert(html.includes(`id="${mId}"`), `Modal #${mId} exists in features.html`);
  });

  const requiredScriptHandlers = [
    'openRulesModal',
    'openCurrentClassModal',
    'openPersistenceModal',
    'openStorageViewerModal',
    'openLockedClassesModal',
    'openWorkloadModal',
    'openViewsModal',
    'openQualityModal'
  ];

  requiredScriptHandlers.forEach(fn => {
    assert(html.includes(`function ${fn}`), `Script contains handler function ${fn}()`);
  });

  // 9. HTTP Check for Live SchedX Server
  console.log('\n--- 9. Live HTTP Verification ---');
  await new Promise((resolve) => {
    http.get('http://localhost:3000/features', (res) => {
      assert(res.statusCode === 200, 'GET /features returns HTTP 200 OK');
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        assert(data.includes('Smart Subject Distribution'), 'Live /features response contains new Feature 10');
        assert(data.includes('Timetable Quality'), 'Live /features response contains new Feature 17');
        assert(data.includes('Ready to build a smarter timetable?'), 'Live /features response contains Final CTA');
        resolve();
      });
    }).on('error', (err) => {
      assert(false, `Live HTTP error: ${err.message}`);
      resolve();
    });
  });

  console.log('\n========================================================');
  console.log('  ALL FEATURES EXPANSION CHECKS COMPLETED                ');
  console.log('========================================================\n');
}

runFeaturesVerification();
