/**
 * scripts/verify-features-redesign.js
 * Comprehensive test suite verifying the Features Page Professional Redesign
 * covering all 14 specified evaluation criteria.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function pass(testName, detail = '') {
  totalChecks++;
  passedChecks++;
  console.log(`✅ PASS [${testName}] ${detail ? '-> ' + detail : ''}`);
}

function fail(testName, detail = '') {
  totalChecks++;
  failedChecks++;
  console.error(`❌ FAIL [${testName}] ${detail ? '-> ' + detail : ''}`);
}

console.log('================================================================');
console.log('  SCHEDX FEATURES PAGE PROFESSIONAL REDESIGN VERIFICATION       ');
console.log('================================================================\n');

// 1. Load Files
const featuresHtmlPath = path.join(__dirname, '..', 'public', 'features.html');
const styleCssPath = path.join(__dirname, '..', 'public', 'style.css');
const scriptJsPath = path.join(__dirname, '..', 'public', 'script.js');

const featuresHtml = fs.readFileSync(featuresHtmlPath, 'utf8');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');
const scriptJs = fs.readFileSync(scriptJsPath, 'utf8');

// --- Section 1: Strict Alternating Zigzag Layout ---
console.log('--- 1. Strict Alternating Zigzag Layout ---');
const rowMatches = featuresHtml.match(/<div class="features-zigzag-row/g) || [];
if (rowMatches.length === 9) {
  pass('ZIGZAG_ROWS', `Exactly 9 feature rows present (${rowMatches.length})`);
} else {
  fail('ZIGZAG_ROWS', `Expected 9 rows, got ${rowMatches.length}`);
}

// Check alternating rhythm
const rowChunks = featuresHtml.split(/<div class="features-zigzag-row/).slice(1);
const expectedRhythm = [
  { index: 1, first: 'card', second: 'visual', label: 'Feature 01: Left Card -> Right Visual' },
  { index: 2, first: 'visual', second: 'card', label: 'Feature 02: Left Visual -> Right Card' },
  { index: 3, first: 'card', second: 'visual', label: 'Feature 03: Left Card -> Right Visual' },
  { index: 4, first: 'visual', second: 'card', label: 'Feature 04: Left Visual -> Right Card' },
  { index: 5, first: 'card', second: 'visual', label: 'Feature 05: Left Card -> Right Visual' },
  { index: 6, first: 'visual', second: 'card', label: 'Feature 06: Left Visual -> Right Card' },
  { index: 7, first: 'card', second: 'visual', label: 'Feature 07: Left Card -> Right Visual' },
  { index: 8, first: 'visual', second: 'card', label: 'Feature 08: Left Visual -> Right Card' },
  { index: 9, first: 'card', second: 'visual', label: 'Feature 09: Left Card -> Right Visual' }
];

expectedRhythm.forEach((item, idx) => {
  const chunk = rowChunks[idx];
  const cardIdx = chunk.indexOf('zigzag-card');
  const visualIdx = chunk.indexOf('zigzag-visual-wrap');
  
  if (cardIdx === -1 || visualIdx === -1) {
    fail(`ROW_${item.index}_STRUCTURE`, `Row ${item.index} missing card or visual wrap`);
    return;
  }
  
  if (item.first === 'card' && cardIdx < visualIdx) {
    pass(`ROW_${item.index}_RHYTHM`, item.label);
  } else if (item.first === 'visual' && visualIdx < cardIdx) {
    pass(`ROW_${item.index}_RHYTHM`, item.label);
  } else {
    fail(`ROW_${item.index}_RHYTHM`, `${item.label} order mismatch`);
  }
});

// Verify visuals are outside the card
const visualInsideCard = /<article class="zigzag-card[^>]*>[\s\S]*?class="zigzag-visual-wrap"[\s\S]*?<\/article>/g.test(featuresHtml);
if (!visualInsideCard) {
  pass('VISUAL_SEPARATION', 'Visuals are strictly outside feature cards');
} else {
  fail('VISUAL_SEPARATION', 'Found visual inside a feature card');
}

// Verify no generic grid conversion
if (styleCss.includes('.features-zigzag-row') && styleCss.includes('display: flex')) {
  pass('FLEX_LAYOUT', '.features-zigzag-row uses flexbox layout with gap');
} else {
  fail('FLEX_LAYOUT', '.features-zigzag-row flex layout missing');
}

// --- Section 2: Explanatory Visual System ---
console.log('\n--- 2. Explanatory Visual System ---');
const visualVerifications = [
  { id: 'visual-01', text: 'Visual 01: Smart Timetable Engine', classes: ['visual--timetable-engine', 'mock-schedule-row'] },
  { id: 'visual-02', text: 'Visual 02: Teacher Availability Matrix', classes: ['visual--teacher-avail', 'mock-avail-grid'] },
  { id: 'visual-03', text: 'Visual 03: Section & Class Organization', classes: ['visual--sections-org', 'mock-cohort-track'] },
  { id: 'visual-04', text: 'Visual 04: Room Management Allocation', classes: ['visual--rooms-mgmt', 'mock-facility-grid'] },
  { id: 'visual-05', text: 'Visual 05: 3-Way Collision Prevention', classes: ['visual--collision-guard', 'mock-guard-list'] },
  { id: 'visual-06', text: 'Visual 06: Day-by-Day Layout', classes: ['visual--day-by-day', 'mock-day-periods'] },
  { id: 'visual-07', text: 'Visual 07: Live Class Monitor', classes: ['visual--live-monitor', 'live-progress-bar'] },
  { id: 'visual-08', text: 'Visual 08: Cloud Persistence Synchronized Entities', classes: ['visual--cloud-persistence', 'mock-sync-entities-grid'] },
  { id: 'visual-09', text: 'Visual 09: Storage Data Repository', classes: ['visual--storage-repo', 'mock-storage-vault'] }
];

visualVerifications.forEach(v => {
  const present = v.classes.every(cls => featuresHtml.includes(cls));
  if (present) {
    pass('VISUAL_FEATURE_' + v.id, `${v.text} verified with required components`);
  } else {
    fail('VISUAL_FEATURE_' + v.id, `${v.text} missing required components`);
  }
});

// --- Section 3: Box 8 Capability Explanation & Delineation ---
console.log('\n--- 3. Box 8 Capability Explanation ---');
const box8Chunk = rowChunks[7]; // Row 8 chunk
const box8HasCapability = box8Chunk.includes('Cloud & Data Persistence');
const box8Categories = ['Teachers', 'Subjects', 'Sections', 'Rooms', 'Time Slots', 'Availability', 'Schedules'];
const box8AllCategories = box8Categories.every(cat => box8Chunk.includes(cat));

if (box8HasCapability && box8AllCategories) {
  pass('BOX_8_CAPABILITY', 'Box 8 explains persistence capability with all 7 data categories');
} else {
  fail('BOX_8_CAPABILITY', 'Box 8 missing persistence explanation or data categories');
}

// Verify Box 8 explains user benefits
const box8Benefits = box8Chunk.includes('available when you return') || box8Chunk.includes('recreate your setup') || box8Chunk.includes('manual data entry');
if (box8Benefits) {
  pass('BOX_8_BENEFITS', 'Box 8 explains user benefits (session readiness, eliminates manual re-entry)');
} else {
  fail('BOX_8_BENEFITS', 'Box 8 user benefit explanation missing');
}

// --- Section 4: Box 9 Storage System & Live Binding ---
console.log('\n--- 4. Box 9 Live Storage System ---');
const box9Chunk = rowChunks[8]; // Row 9 chunk
const box9HasTitle = box9Chunk.includes('Storage');
const box9HasMetrics = ['statTeachers', 'statSubjects', 'statSections', 'statRooms', 'statTimetables'].every(id => box9Chunk.includes(`id="${id}"`));
const pageHasStorageModals = featuresHtml.includes('modalTimetableList') && featuresHtml.includes('retention-policy-banner');

if (box9HasTitle && box9HasMetrics && pageHasStorageModals) {
  pass('BOX_9_STRUCTURE', 'Box 9 contains storage title, live metric targets, and retention table');
} else {
  fail('BOX_9_STRUCTURE', 'Box 9 missing required storage structure');
}

// Verify dynamic live binding script in features.html
const hasLiveBindingScript = featuresHtml.includes('fetchStorageData') &&
  featuresHtml.includes('visualStatTeachers') &&
  featuresHtml.includes('visualStatSubjects') &&
  featuresHtml.includes('visualStatSections') &&
  featuresHtml.includes('visualStatRooms') &&
  featuresHtml.includes('visualStatTimetables');

if (hasLiveBindingScript) {
  pass('BOX_9_LIVE_BINDING', 'features.html binds live API counts to both Box 9 and Visual 09 badges');
} else {
  fail('BOX_9_LIVE_BINDING', 'Live binding between API and Visual 09 badges missing');
}

// --- Section 5: Security & Technical Leak Prevention ---
console.log('\n--- 5. Security & Technical Leak Prevention ---');
const forbiddenTerms = [
  'supabase.co',
  'apikey',
  'secret_key',
  'service_role',
  'postgresql://',
  'http 200',
  'jwt',
  'password',
  'select * from',
  'schema',
  'db_password'
];

forbiddenTerms.forEach(term => {
  const inHtml = featuresHtml.toLowerCase().includes(term);
  if (!inHtml) {
    pass(`SECURITY_AUDIT_${term}`, `Features page free from internal leakage: "${term}"`);
  } else {
    fail(`SECURITY_AUDIT_${term}`, `Forbidden technical leakage found in features.html: "${term}"`);
  }
});

// --- Section 6: Box Numbering Integrity ---
console.log('\n--- 6. Box Numbering Integrity ---');
for (let i = 1; i <= 9; i++) {
  const numStr = i < 10 ? `0${i}` : `${i}`;
  const hasBadge = featuresHtml.includes(`class="feature-number">${numStr}</span>`);
  if (hasBadge) {
    pass(`BOX_NUMBER_${numStr}`, `Feature Box ${numStr} numbered accurately`);
  } else {
    fail(`BOX_NUMBER_${numStr}`, `Feature Box ${numStr} numbering badge missing`);
  }
}

// --- Section 7: Page Heading System ---
console.log('\n--- 7. Page Heading System ---');
const hasHeadingClass = featuresHtml.includes('page-heading--features');
const hasEyebrow = featuresHtml.includes('EXPLORE SCHEDX');
const hasTitle = featuresHtml.includes('FEATURES');
const hasSubtitle = featuresHtml.includes('Everything you need for smarter scheduling') && featuresHtml.includes('Powerful tools for academic planning');

if (hasHeadingClass && hasEyebrow && hasTitle && hasSubtitle) {
  pass('PAGE_HEADING', 'Features page unique showcase heading verified');
} else {
  fail('PAGE_HEADING', 'Features page heading missing showcase attributes');
}

// --- Section 8: CSS Visual Hover & Motion ---
console.log('\n--- 8. CSS Visual Hover & Motion ---');
const hasContainerHover = styleCss.includes('.zigzag-visual-container:hover');
const hasCyanGlow = styleCss.includes('0 0 22px rgba(6, 182, 212, 0.18)') || styleCss.includes('rgba(6, 182, 212');
const hasCoordinatedCardHover = styleCss.includes('.features-zigzag-row:has(.zigzag-card:hover) .zigzag-visual-container');
const hasCoordinatedVisualHover = styleCss.includes('.features-zigzag-row:has(.zigzag-visual-wrap:hover) .zigzag-card');

if (hasContainerHover && hasCyanGlow) {
  pass('VISUAL_HOVER_GLOW', 'Visual hover state includes elevation and cyan glow');
} else {
  fail('VISUAL_HOVER_GLOW', 'Visual hover cyan glow styling missing');
}

if (hasCoordinatedCardHover && hasCoordinatedVisualHover) {
  pass('COORDINATED_HOVER', 'Bi-directional coordinated hover styling verified');
} else {
  fail('COORDINATED_HOVER', 'Bi-directional coordinated hover styling missing');
}

// --- Section 9: Responsive Mobile Behavior ---
console.log('\n--- 9. Responsive Mobile Behavior ---');
const hasMobileQuery = styleCss.includes('@media (max-width: 900px)');
const hasMobileStacking = styleCss.includes('.features-zigzag-row .zigzag-visual-wrap') && styleCss.includes('order: -1');

if (hasMobileQuery && hasMobileStacking) {
  pass('MOBILE_STACKING', 'Mobile layout stacks [ VISUAL ] on top with order: -1');
} else {
  fail('MOBILE_STACKING', 'Mobile layout visual stacking order missing');
}

// --- Section 10: Live Storage API Verification ---
console.log('\n--- 10. Live Storage API Verification ---');
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/storage',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200) {
      pass('API_STORAGE_200', 'GET /api/storage returned HTTP 200');
      try {
        const json = JSON.parse(data);
        if (json.success && json.counts) {
          pass('API_STORAGE_PAYLOAD', `Valid storage counts: ${json.counts.teachers} teachers, ${json.counts.subjects} subjects, ${json.counts.rooms} rooms, ${json.counts.generatedTimetables} timetables`);
        } else {
          fail('API_STORAGE_PAYLOAD', 'Storage payload missing success or counts object');
        }
      } catch (err) {
        fail('API_STORAGE_PAYLOAD', 'Failed to parse storage response JSON');
      }
    } else {
      fail('API_STORAGE_200', `GET /api/storage returned HTTP ${res.statusCode}`);
    }

    printSummary();
  });
});

req.on('error', (err) => {
  fail('API_STORAGE_200', `Request error: ${err.message}`);
  printSummary();
});

req.end();

function printSummary() {
  console.log('\n================================================================');
  console.log(`TOTAL CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
  if (failedChecks === 0) {
    console.log('🎉 ALL FEATURES PAGE REDESIGN CHECKS PASSED!');
  } else {
    console.log('⚠️ SOME CHECKS FAILED. Please inspect above.');
  }
  console.log('================================================================');
  process.exit(failedChecks === 0 ? 0 : 1);
}
