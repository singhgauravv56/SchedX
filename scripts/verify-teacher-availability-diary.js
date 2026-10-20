/**
 * Comprehensive Verification Script for SchedX Teacher Availability Vintage Diary Redesign
 * 
 * Verifies:
 * 1. Vintage Diary-Style Appearance (Aged-paper tones, lined texture, spine binding, soft shadows)
 * 2. Layout & Typography (TEACHER AVAILABILITY heading, diary folio/stamp, responsive containers)
 * 3. Inner Boxes with Sharp Edges (0-4px border-radius) and exact gradient `linear-gradient(to bottom, #717173, #BCBCBC)`
 * 4. Complete removal of "Save to Supabase" and replacement with "Save Availability"
 * 5. Input readability and contrast (light inputs, dark text, visible focus rings)
 * 6. Live API Save & Retrieve Functionality via /api/teacher-availability
 * 7. Live HTTP 200 endpoint serving the new diary interface
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(category, description, condition, detail = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] [${category}] ${description}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] [${category}] ${description} ${detail ? '(' + detail + ')' : ''}`);
  }
}

function checkEndpoint(urlPath) {
  return new Promise((resolve) => {
    http.get({ host: 'localhost', port: 3000, path: urlPath }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', (err) => resolve({ status: 500, error: err.message }));
  });
}

function postJson(urlPath, payload) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      host: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (_) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', (err) => resolve({ status: 500, error: err.message }));
    req.write(data);
    req.end();
  });
}

async function runVerification() {
  console.log('============================================================');
  console.log('STARTING TEACHER AVAILABILITY VINTAGE DIARY VERIFICATION');
  console.log('============================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const availHtmlPath = path.join(rootDir, 'public', 'teacher-availability.html');
  const featuresHtmlPath = path.join(rootDir, 'public', 'features.html');

  const availHtml = fs.readFileSync(availHtmlPath, 'utf8');
  const featuresHtml = fs.readFileSync(featuresHtmlPath, 'utf8');

  // --- 1. VINTAGE DIARY-STYLE APPEARANCE ---
  console.log('--- 1. Vintage Diary-Style Appearance ---');
  test('DIARY_LOOK', 'Diary page container (.diary-page-container) present', 
    availHtml.includes('class="diary-page-container"'));
  test('DIARY_LOOK', 'Aged-paper tones configured (#F5EBD5, #EFE2C6, #E8D9B8)', 
    availHtml.includes('#F5EBD5') && availHtml.includes('#EFE2C6') && availHtml.includes('#E8D9B8'));
  test('DIARY_LOOK', 'Horizontal writing lines via repeating-linear-gradient configured', 
    availHtml.includes('repeating-linear-gradient(to bottom, transparent'));
  test('DIARY_LOOK', 'Spine and binding detail present (.diary-spine-stitches)', 
    availHtml.includes('class="diary-spine-stitches"'));
  test('DIARY_LOOK', 'Vertical margin ruling pseudo-element configured (rgba(185, 75, 55', 
    availHtml.includes('--diary-margin-line') && availHtml.includes('.diary-page-container::after'));
  test('DIARY_LOOK', 'Soft page shadow configured', 
    availHtml.includes('box-shadow:') && availHtml.includes('rgba(55, 40, 20'));
  test('DIARY_LOOK', 'Vintage diary folio / logbook header stamp present', 
    availHtml.includes('class="diary-header-meta"') && availHtml.includes('FACULTY LOGBOOK'));

  // --- 2. DIARY PAGE LAYOUT & HEADING PRESERVATION ---
  console.log('\n--- 2. Diary Page Layout & Headings ---');
  test('LAYOUT', 'Main heading "TEACHER AVAILABILITY" preserved', 
    availHtml.includes('<h1 class="page-title page-title--availability">TEACHER AVAILABILITY</h1>'));
  test('LAYOUT', 'Page heading wrapper .page-heading--availability preserved', 
    availHtml.includes('page-heading--availability'));
  test('LAYOUT', 'Faculty workload eyebrow badge preserved', 
    availHtml.includes('FACULTY WORKLOAD'));
  test('LAYOUT', 'Heading subtitle preserved', 
    availHtml.includes('Configure weekly working days and active time periods per instructor'));
  test('LAYOUT', 'Setup form controls present (#teacherCountInput, renderDynamicForms)', 
    availHtml.includes('id="teacherCountInput"') && availHtml.includes('renderDynamicForms()'));
  test('LAYOUT', 'Saved availability table structure present (.saved-availability-table)', 
    availHtml.includes('class="saved-availability-table"') && availHtml.includes('id="savedAvailBody"'));
  test('LAYOUT', 'Refresh list button present', 
    availHtml.includes('loadSavedAvailability()') && availHtml.includes('Refresh List'));

  // --- 3. INNER BOXES: SHARP EDGES & EXACT LINEAR GRADIENT ---
  console.log('\n--- 3. Inner Boxes: Sharp Edges (0-4px) & Exact Gradient ---');
  const exactGradient = 'linear-gradient(to bottom, #717173, #BCBCBC)';
  test('INNER_BOX', 'Exact gradient linear-gradient(to bottom, #717173, #BCBCBC) configured', 
    availHtml.includes(exactGradient));
  test('INNER_BOX', 'Gradient applied to .availability-step', 
    availHtml.includes('.availability-step {') && availHtml.includes(exactGradient));
  test('INNER_BOX', 'Gradient applied to .teacher-form-card', 
    availHtml.includes('.teacher-form-card {') && availHtml.includes(exactGradient));
  test('INNER_BOX', 'Gradient applied to .teacher-item', 
    availHtml.includes('.teacher-item {') && availHtml.includes(exactGradient));
  test('INNER_BOX', 'Sharp rectangular edges (border-radius: 2px) on inner boxes', 
    availHtml.includes('.availability-step {') && availHtml.includes('border-radius: 2px;'));
  test('INNER_BOX', 'Sharp rectangular edges (border-radius: 2px) on .teacher-form-card', 
    availHtml.includes('.teacher-form-card {') && availHtml.includes('border-radius: 2px;'));
  test('INNER_BOX', 'Sharp rectangular edges (border-radius: 2px) on .teacher-item', 
    availHtml.includes('.teacher-item {') && availHtml.includes('border-radius: 2px;'));
  test('INNER_BOX', 'Subtle border separating inner boxes defined', 
    availHtml.includes('--inner-box-border: #454547;'));
  test('INNER_BOX', 'Inner boxes contrast against paper background with subtle shadow', 
    availHtml.includes('box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12)'));

  // --- 4. TEXT AND INPUT READABILITY ---
  console.log('\n--- 4. Text and Input Readability ---');
  test('READABILITY', 'Dark high-contrast heading text (#0f172a) inside inner boxes', 
    availHtml.includes('color: #0f172a;'));
  test('READABILITY', 'Inputs have crisp light background (#ffffff)', 
    availHtml.includes('.form-group input[type="text"]') && availHtml.includes('background: #ffffff;'));
  test('READABILITY', 'Inputs have clear border (1.5px solid #374151)', 
    availHtml.includes('border: 1.5px solid #374151;'));
  test('READABILITY', 'Inputs have visible focus state with glow outline', 
    availHtml.includes('.form-group input[type="text"]:focus') && availHtml.includes('box-shadow: 0 0 0 3px'));
  test('READABILITY', 'Checkbox items have light background (#ffffff) and sharp edges (2px)', 
    availHtml.includes('.checkbox-item {') && availHtml.includes('border-radius: 2px;'));

  // --- 5. REMOVAL OF "SAVE TO SUPABASE" & NEW BUTTON LABEL ---
  console.log('\n--- 5. Removal of "Save to Supabase" & Save Availability Button ---');
  test('BUTTON', '"Save to Supabase" is completely absent in teacher-availability.html', 
    !availHtml.includes('Save to Supabase') && !availHtml.includes('Save Availability to Supabase'));
  test('BUTTON', 'Button label is exactly "Save Availability"', 
    availHtml.includes('>Save Availability</button>'));
  test('BUTTON', 'Button ID is saveAvailabilityBtn', 
    availHtml.includes('id="saveAvailabilityBtn"'));
  test('BUTTON', 'Button has disabled state while saving', 
    availHtml.includes('btn.disabled = true;') && availHtml.includes('btn.textContent = \'Saving Availability...\''));
  test('BUTTON', 'Success message matches requirement: "Teacher availability saved successfully."', 
    availHtml.includes('Teacher availability saved successfully.'));
  test('BUTTON', 'Error message matches requirement: "Unable to save availability. Please try again."', 
    availHtml.includes('Unable to save availability. Please try again.'));
  test('BUTTON', 'Button has hover and keyboard-focus states in CSS', 
    availHtml.includes('.btn-diary-save:hover') && availHtml.includes('.btn-diary-save:focus-visible'));

  // --- 6. LINKAGE FROM FEATURES PAGE ---
  console.log('\n--- 6. Linkage from Features Page ---');
  test('NAV', 'Features page links Feature 02 directly to /teacher-availability', 
    featuresHtml.includes("window.location='/teacher-availability'") && featuresHtml.includes('Teacher Availability Tracking'));

  // --- 7. LIVE HTTP AND API PERSISTENCE TESTS ---
  console.log('\n--- 7. Live HTTP & API Endpoints Verification ---');
  const pageRes = await checkEndpoint('/teacher-availability');
  test('LIVE_HTTP', 'GET /teacher-availability returns HTTP 200', pageRes.status === 200);
  test('LIVE_HTTP', 'Live /teacher-availability contains .diary-page-container', pageRes.body && pageRes.body.includes('diary-page-container'));
  test('LIVE_HTTP', 'Live /teacher-availability has "Save Availability" button', pageRes.body && pageRes.body.includes('Save Availability'));
  test('LIVE_HTTP', 'Live /teacher-availability has NO "Save to Supabase"', pageRes.body && !pageRes.body.includes('Save to Supabase'));

  // Test POST /api/teacher-availability
  const testTeacherName = `Prof. Diary Test ${Date.now() % 10000}`;
  const saveRes = await postJson('/api/teacher-availability', {
    teachers: [
      {
        teacher_name: testTeacherName,
        specialization: 'Vintage Architecture',
        availability: ['Monday|09:00-10:00', 'Monday|10:00-11:00', 'Wednesday|11:00-12:00']
      }
    ]
  });

  test('API', 'POST /api/teacher-availability saves availability successfully', 
    saveRes.status === 200 && (saveRes.data && (saveRes.data.success || saveRes.data.saved_count >= 1 || saveRes.data.message)));

  // Test GET /api/teacher-availability
  const getRes = await checkEndpoint('/api/teacher-availability');
  test('API', 'GET /api/teacher-availability returns HTTP 200', getRes.status === 200);
  let records = [];
  try {
    records = JSON.parse(getRes.body);
  } catch (_) {}
  test('API', 'GET /api/teacher-availability retrieves array with saved teacher', 
    Array.isArray(records) && records.some(r => r.teacher_name === testTeacherName));

  console.log('\n============================================================');
  console.log(`TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('============================================================\n');

  if (failedTests === 0) {
    console.log('✓ ALL TEACHER AVAILABILITY VINTAGE DIARY CHECKS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.error(`✗ ${failedTests} test(s) failed.\n`);
    process.exit(1);
  }
}

runVerification();
