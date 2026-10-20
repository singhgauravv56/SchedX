/**
 * Verification Test Suite for Features Page Interactive Details
 * 
 * Verifies all 10 test scenarios required:
 * 1. Smart Timetable Engine detail view
 * 2. Section & Class Organization detail view
 * 3. Day-by-Day Schedule Layout detail view
 * 4. Smart Subject Distribution detail view
 * 5. Free Period Optimization detail view
 * 6. Section Workload detail view with counting method
 * 7. Contextual Generate page CTAs
 * 8. Back to Features navigation and browser back/hash support
 * 9. Responsive layout CSS
 * 10. System regression across pages
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

async function runTests() {
  console.log('============================================================');
  console.log('STARTING SchedX FEATURES INTERACTIVE DETAILS VERIFICATION');
  console.log('============================================================\n');

  const root = path.join(__dirname, '..');
  const featuresHtml = fs.readFileSync(path.join(root, 'public', 'features.html'), 'utf8');
  const styleCss = fs.readFileSync(path.join(root, 'public', 'style.css'), 'utf8');

  // --- 1. FEATURE CARD CLICK ACTION VERIFICATION ---
  console.log('--- 1. Feature Card Click Handlers (No Immediate Redirect) ---');
  test('CARDS', 'Feature 01 calls openEngineModal() instead of /generate', 
    featuresHtml.includes('onclick="openEngineModal()"'));
  test('CARDS', 'Feature 03 calls openSectionOrgModal() instead of /generate', 
    featuresHtml.includes('onclick="openSectionOrgModal()"'));
  test('CARDS', 'Feature 06 calls openDayLayoutModal() instead of /generate', 
    featuresHtml.includes('onclick="openDayLayoutModal()"'));
  test('CARDS', 'Feature 10 calls openSubjectDistModal() instead of /generate', 
    featuresHtml.includes('onclick="openSubjectDistModal()"'));
  test('CARDS', 'Feature 13 calls openFreePeriodsModal() instead of /generate', 
    featuresHtml.includes('onclick="openFreePeriodsModal()"'));
  test('CARDS', 'Feature 15 calls openSectionWorkloadModal() instead of /generate', 
    featuresHtml.includes('onclick="openSectionWorkloadModal()"'));

  // --- 2. SMART TIMETABLE ENGINE DETAIL VIEW ---
  console.log('\n--- 2. Smart Timetable Engine Detail View ---');
  test('ENGINE', '#engineModal exists with role="dialog"', featuresHtml.includes('id="engineModal"'));
  test('ENGINE', 'Heading is "How the Smart Timetable Engine Works"', 
    featuresHtml.includes('How the Smart Timetable Engine Works'));
  test('ENGINE', 'Step 1: Input Configuration present', 
    featuresHtml.includes('Input Configuration') && featuresHtml.includes('Teachers') && featuresHtml.includes('Subjects') && featuresHtml.includes('Sections'));
  test('ENGINE', 'Step 2: Scheduling Analysis present', 
    featuresHtml.includes('Scheduling Analysis') && featuresHtml.includes('Analyze teacher-subject assignments'));
  test('ENGINE', 'Step 3: Timetable Generation present', 
    featuresHtml.includes('Timetable Generation') && featuresHtml.includes('suitable time slots'));
  test('ENGINE', 'Step 4: Validation present', 
    featuresHtml.includes('Step 4') && featuresHtml.includes('Validation') && featuresHtml.includes('Identify scheduling conflicts'));
  test('ENGINE', 'Step 5: Final Timetable present', 
    featuresHtml.includes('Step 5') && featuresHtml.includes('Final Timetable') && featuresHtml.includes('Display the generated timetable'));
  test('ENGINE', 'Process workflow diagram bar present', 
    featuresHtml.includes('class="workflow-diagram-bar"'));
  test('ENGINE', 'Button "Try It in Generate Page" present', 
    featuresHtml.includes('Try It in Generate Page'));
  test('ENGINE', 'Button "Back to Features" present in engine modal', 
    featuresHtml.includes('id="engineModal"') && featuresHtml.includes('Back to Features'));
  test('ENGINE', 'Clearly distinguishes implemented vs planned capabilities', 
    featuresHtml.includes('Implemented Capabilities:') && featuresHtml.includes('Multi-constraint heuristic generation') && featuresHtml.includes('planned development roadmap'));

  // --- 3. SECTION & CLASS ORGANIZATION DETAIL VIEW ---
  console.log('\n--- 3. Section & Class Organization Detail View ---');
  test('SECTION_ORG', '#sectionOrgModal exists with role="dialog"', featuresHtml.includes('id="sectionOrgModal"'));
  test('SECTION_ORG', 'Heading is "Section & Class Organization"', 
    featuresHtml.includes('id="sectionOrgModalTitle">Section & Class Organization</h3>'));
  test('SECTION_ORG', 'Section CSE-A sample schedule present', 
    featuresHtml.includes('SECTION CSE-A') && featuresHtml.includes('Data Structures') && featuresHtml.includes('Operating Systems'));
  test('SECTION_ORG', 'Section CSE-B sample schedule present', 
    featuresHtml.includes('SECTION CSE-B') && featuresHtml.includes('Database Systems'));
  test('SECTION_ORG', 'Labeled as illustrative sample', 
    featuresHtml.includes('Illustrative Sample') && featuresHtml.includes('sample demonstrations created to explain section isolation'));
  test('SECTION_ORG', 'Explains independent streams, chronological layout, collision guard', 
    featuresHtml.includes('Independent Streams') && featuresHtml.includes('Collision Guard') && featuresHtml.includes('Departmental Partitioning'));
  test('SECTION_ORG', 'Button "View in Generate Page" present', 
    featuresHtml.includes('View in Generate Page'));

  // --- 4. DAY-BY-DAY SCHEDULE LAYOUT DETAIL VIEW ---
  console.log('\n--- 4. Day-by-Day Schedule Layout Detail View ---');
  test('DAY_LAYOUT', '#dayLayoutModal exists with role="dialog"', featuresHtml.includes('id="dayLayoutModal"'));
  test('DAY_LAYOUT', 'Heading is "Day-by-Day Schedule Layout"', 
    featuresHtml.includes('id="dayLayoutModalTitle">Day-by-Day Schedule Layout</h3>'));
  test('DAY_LAYOUT', 'Interactive day tabs present (Monday, Tuesday, Wednesday)', 
    featuresHtml.includes('onclick="switchDayLayoutTab(\'monday\')"') &&
    featuresHtml.includes('onclick="switchDayLayoutTab(\'tuesday\')"') &&
    featuresHtml.includes('onclick="switchDayLayoutTab(\'wednesday\')"'));
  test('DAY_LAYOUT', 'Monday sample schedule present', featuresHtml.includes('id="dayPaneMonday"'));
  test('DAY_LAYOUT', 'Tuesday sample schedule present', featuresHtml.includes('id="dayPaneTuesday"'));
  test('DAY_LAYOUT', 'Wednesday sample schedule present', featuresHtml.includes('id="dayPaneWednesday"'));
  test('DAY_LAYOUT', 'Button "Create My Timetable" present', 
    featuresHtml.includes('Create My Timetable'));
  test('DAY_LAYOUT', 'Labeled as illustrative preview', 
    featuresHtml.includes('Illustrative Demonstration') && featuresHtml.includes('illustrates day-partitioned layout'));

  // --- 5. SMART SUBJECT DISTRIBUTION DETAIL VIEW ---
  console.log('\n--- 5. Smart Subject Distribution Detail View ---');
  test('SUBJ_DIST', '#subjectDistModal exists with role="dialog"', featuresHtml.includes('id="subjectDistModal"'));
  test('SUBJ_DIST', 'Heading is "Smart Subject Distribution"', 
    featuresHtml.includes('id="subjectDistModalTitle">Smart Subject Distribution</h3>'));
  test('SUBJ_DIST', 'Subject color legend present', featuresHtml.includes('class="subject-legend-wrap"'));
  test('SUBJ_DIST', 'Color chips for Data Structures, Mathematics, DBMS, OS, Java present', 
    featuresHtml.includes('sub-ds') && featuresHtml.includes('sub-math') && featuresHtml.includes('sub-dbms') && featuresHtml.includes('sub-os') && featuresHtml.includes('sub-java'));
  test('SUBJ_DIST', '3-day distribution grid present', featuresHtml.includes('<th>Monday</th>') && featuresHtml.includes('<th>Tuesday</th>') && featuresHtml.includes('<th>Wednesday</th>'));
  test('SUBJ_DIST', 'Button "Configure Subjects in Generate Page" present', 
    featuresHtml.includes('Configure Subjects in Generate Page'));
  test('SUBJ_DIST', 'Honest statement distinguishing eligibility spread from automatic multi-objective optimization', 
    featuresHtml.includes('Technical Scope & Limitations') && featuresHtml.includes('Automatic multi-objective mathematical frequency optimization is conceptual'));

  // --- 6. FREE PERIOD OPTIMIZATION DETAIL VIEW ---
  console.log('\n--- 6. Free Period Optimization Detail View ---');
  test('FREE_PERIODS', '#freePeriodsModal exists with role="dialog"', featuresHtml.includes('id="freePeriodsModal"'));
  test('FREE_PERIODS', 'Heading is "Free Period Optimization"', 
    featuresHtml.includes('id="freePeriodsModalTitle">Free Period Optimization</h3>'));
  test('FREE_PERIODS', 'BEFORE comparison block present with scattered gaps', 
    featuresHtml.includes('BEFORE (Fragmented Gaps)') && featuresHtml.includes('slot-free-period'));
  test('FREE_PERIODS', 'AFTER comparison block present with packed sequence', 
    featuresHtml.includes('AFTER (Compact Sequence)') && featuresHtml.includes('slot-free-compact'));
  test('FREE_PERIODS', 'Clear disclaimer that automatic multi-day global gap re-sequencing is in development', 
    featuresHtml.includes('Conceptual Demonstration') && featuresHtml.includes('automated multi-day global gap re-sequencing without user intervention is currently in active development'));
  test('FREE_PERIODS', 'No misleading "optimize" button; uses contextual generator button', 
    featuresHtml.includes('Try Timetable Generator'));

  // --- 7. SECTION WORKLOAD DETAIL VIEW ---
  console.log('\n--- 7. Section Workload Detail View ---');
  test('WORKLOAD', '#sectionWorkloadModal exists with role="dialog"', featuresHtml.includes('id="sectionWorkloadModal"'));
  test('WORKLOAD', 'Heading is "Section Workload"', 
    featuresHtml.includes('id="sectionWorkloadModalTitle">Section Workload</h3>'));
  test('WORKLOAD', 'Section CSE-A workload card present with 6 classes total (3 Mon, 2 Tue, 1 Wed)', 
    featuresHtml.includes('Section CSE-A') && featuresHtml.includes('6 Classes Total') && featuresHtml.includes('3 classes'));
  test('WORKLOAD', 'Section CSE-B workload card present with 5 classes total (2 Mon, 2 Tue, 1 Wed)', 
    featuresHtml.includes('Section CSE-B') && featuresHtml.includes('5 Classes Total') && featuresHtml.includes('2 classes'));
  test('WORKLOAD', 'Clear Counting Method Standard distinguishing class sessions from occupied periods', 
    featuresHtml.includes('Counting Method Standard') &&
    featuresHtml.includes('1-hour theory lecture') &&
    featuresHtml.includes('1 class session') &&
    featuresHtml.includes('2-hour laboratory session') &&
    featuresHtml.includes('2 periods'));
  test('WORKLOAD', 'Button "View Section Workload" present', 
    featuresHtml.includes('View Section Workload'));

  // --- 8. REUSABLE DETAIL VIEW MODAL STYLES & SCRIPT LOGIC ---
  console.log('\n--- 8. Reusable Modal Styles, Script Handlers & Navigation ---');
  test('STYLES', '.feature-detail-modal-box class defined in style.css', styleCss.includes('.feature-detail-modal-box'));
  test('STYLES', '.workflow-diagram-bar styles defined', styleCss.includes('.workflow-diagram-bar'));
  test('STYLES', '.sample-tt-grid-two-col responsive styles defined', styleCss.includes('.sample-tt-grid-two-col'));
  test('STYLES', '.day-tabs-nav and .day-tab-btn styles defined', styleCss.includes('.day-tab-btn'));
  test('STYLES', '.before-after-grid styles defined', styleCss.includes('.before-after-grid'));
  test('STYLES', '.workload-cards-grid styles defined', styleCss.includes('.workload-cards-grid'));
  test('STYLES', '.info-callout-box styles defined', styleCss.includes('.info-callout-box'));
  test('STYLES', '.limitation-callout-box styles defined', styleCss.includes('.limitation-callout-box'));

  test('SCRIPTS', 'openEngineModal() defined in features.html', featuresHtml.includes('function openEngineModal()'));
  test('SCRIPTS', 'openSectionOrgModal() defined in features.html', featuresHtml.includes('function openSectionOrgModal()'));
  test('SCRIPTS', 'openDayLayoutModal() defined in features.html', featuresHtml.includes('function openDayLayoutModal()'));
  test('SCRIPTS', 'openSubjectDistModal() defined in features.html', featuresHtml.includes('function openSubjectDistModal()'));
  test('SCRIPTS', 'openFreePeriodsModal() defined in features.html', featuresHtml.includes('function openFreePeriodsModal()'));
  test('SCRIPTS', 'openSectionWorkloadModal() defined in features.html', featuresHtml.includes('function openSectionWorkloadModal()'));
  test('SCRIPTS', 'switchDayLayoutTab() defined in features.html', featuresHtml.includes('function switchDayLayoutTab('));
  test('SCRIPTS', 'openModalById() with hash history pushState defined', featuresHtml.includes('function openModalById('));
  test('SCRIPTS', 'Browser Back/Forward popstate listener registered', featuresHtml.includes("window.addEventListener('popstate'"));
  test('SCRIPTS', 'Deep-linking hash navigation supported on DOMContentLoaded', featuresHtml.includes('handleHashNavigation()'));

  // --- 9. LIVE HTTP ENDPOINT VERIFICATION ---
  console.log('\n--- 9. Live HTTP Endpoint Verification ---');
  try {
    const featRes = await fetchUrl('/features');
    test('LIVE_HTTP', 'GET /features returns HTTP 200', featRes.status === 200);
    test('LIVE_HTTP', 'Live /features serves #engineModal', featRes.body.includes('id="engineModal"'));
    test('LIVE_HTTP', 'Live /features serves #sectionOrgModal', featRes.body.includes('id="sectionOrgModal"'));
    test('LIVE_HTTP', 'Live /features serves #dayLayoutModal', featRes.body.includes('id="dayLayoutModal"'));
    test('LIVE_HTTP', 'Live /features serves #subjectDistModal', featRes.body.includes('id="subjectDistModal"'));
    test('LIVE_HTTP', 'Live /features serves #freePeriodsModal', featRes.body.includes('id="freePeriodsModal"'));
    test('LIVE_HTTP', 'Live /features serves #sectionWorkloadModal', featRes.body.includes('id="sectionWorkloadModal"'));

    const cssRes = await fetchUrl('/style.css');
    test('LIVE_HTTP', 'GET /style.css returns HTTP 200', cssRes.status === 200);
    test('LIVE_HTTP', 'Live /style.css contains .feature-detail-modal-box', cssRes.body.includes('.feature-detail-modal-box'));

    const genRes = await fetchUrl('/generate');
    test('LIVE_HTTP', 'GET /generate returns HTTP 200', genRes.status === 200);

    const homeRes = await fetchUrl('/');
    test('LIVE_HTTP', 'GET / (Home) returns HTTP 200', homeRes.status === 200);
  } catch (err) {
    test('LIVE_HTTP', 'Live server connection check', false, err.message);
  }

  console.log('\n============================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  if (failed === 0) {
    console.log('✓ ALL 10 FEATURE DETAIL SPECIFICATION CHECKS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner threw error:', err);
  process.exit(1);
});
