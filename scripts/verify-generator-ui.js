/**
 * SchedX Generator UI & Day-Wise Weekly Timetable Verification
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
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', (err) => {
      resolve({ statusCode: 500, error: err.message });
    });
  });
}

async function run() {
  console.log('\n=== SCHEDX GENERATOR DAY-WISE WEEKLY TIMETABLE VERIFICATION ===\n');

  const generateHtmlPath = path.join(__dirname, '..', 'public', 'generate.html');
  const scriptJsPath = path.join(__dirname, '..', 'public', 'script.js');
  const styleCssPath = path.join(__dirname, '..', 'public', 'style.css');

  const html = fs.readFileSync(generateHtmlPath, 'utf8');
  const js = fs.readFileSync(scriptJsPath, 'utf8');
  const css = fs.readFileSync(styleCssPath, 'utf8');

  // [1] Step 5: Working Days Interactive Selector in public/generate.html
  console.log('[1] HTML: Working Days Selector & Timetable Container');
  assert(html.includes('working-days-group'), 'Working Days group container exists in generate.html');
  assert(html.includes('Weekly Working Days'), 'Weekly Working Days label exists in generate.html');
  assert(html.includes('data-day="Monday"') && html.includes('data-day="Sunday"'), 'All 7 day pills (Monday to Sunday) exist in HTML');
  assert(html.includes('data-preset="5"') && html.includes('data-preset="6"') && html.includes('data-preset="7"'), 'Quick day presets (5d, 6d, 7d) exist in HTML');
  assert(html.includes('id="timetableDayTabs"'), 'Timetable day tabs container exists in HTML');
  assert(html.includes('id="daywiseTimetableContainer"'), 'daywiseTimetableContainer exists in HTML');

  // [2] JavaScript Logic in public/script.js
  console.log('\n[2] JS: Working Days State, Submit Payload, Loading & Rendering');
  assert(js.includes('selectedWorkingDays'), 'selectedWorkingDays state is defined');
  assert(js.includes('working_days: selectedWorkingDays') || js.includes('working_days:'), 'working_days included in generate timetable POST payload');
  assert(js.includes('Generating weekly timetable...'), 'Generate button displays "Generating weekly timetable..." during generation');
  assert(js.includes('No classes scheduled'), 'Empty day state "No classes scheduled" is handled');
  assert(js.includes('timetableDayTabs'), 'Day tabs UI is populated dynamically');
  assert(js.includes('DAY_NAMES_ORDER') || js.includes('Monday'), 'Deterministic day order is handled in frontend');
  assert(js.includes('btn-day-preset'), 'Preset click handling is wired in JS');

  // [3] CSS Styling in public/style.css
  console.log('\n[3] CSS: Design Tokens, Day Pills, Tabs, and Responsive Layout');
  assert(css.includes('.working-days-group'), 'CSS rule .working-days-group exists');
  assert(css.includes('.day-toggle-pill'), 'CSS rule .day-toggle-pill exists');
  assert(css.includes('.day-toggle-pill.active'), 'CSS rule .day-toggle-pill.active exists');
  assert(css.includes('.timetable-day-tabs'), 'CSS rule .timetable-day-tabs exists');
  assert(css.includes('.day-tab-btn'), 'CSS rule .day-tab-btn exists');
  assert(css.includes('.day-card'), 'CSS rule .day-card exists');

  // [4] Server HTTP Endpoints
  console.log('\n[4] HTTP Endpoints: Serving Assets & Routing');
  const resGenerate = await checkUrl('/generate');
  assert(resGenerate.statusCode === 200, 'GET /generate returns HTTP 200');
  assert(resGenerate.body.includes('Weekly Working Days'), 'GET /generate contains Working Days section');

  const resScript = await checkUrl('/script.js');
  assert(resScript.statusCode === 200, 'GET /script.js returns HTTP 200');
  assert(resScript.body.includes('selectedWorkingDays'), 'GET /script.js contains selectedWorkingDays logic');

  const resStyle = await checkUrl('/style.css');
  assert(resStyle.statusCode === 200, 'GET /style.css returns HTTP 200');
  assert(resStyle.body.includes('.day-toggle-pill'), 'GET /style.css contains .day-toggle-pill styles');

  const resTimetable = await checkUrl('/api/timetable');
  assert(resTimetable.statusCode === 200, 'GET /api/timetable returns HTTP 200');
  assert(resTimetable.headers['x-working-days'] !== undefined, 'GET /api/timetable sets X-Working-Days header');

  console.log(`\n============================================================`);
  console.log(`GENERATOR UI VERIFICATION: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log(`============================================================\n`);

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run();
