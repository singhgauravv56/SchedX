const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9225;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }

  init() {
    return new Promise((resolve, reject) => {
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', data => {
        const msg = JSON.parse(data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        } else if (msg.method && this.onEvent) {
          this.onEvent(msg.method, msg.params);
        }
      });
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function run() {
  console.log('===============================================================');
  console.log('   SCHEDX END-TO-END BROWSER TEST: GENERATE TIMETABLE FLOW     ');
  console.log('===============================================================\n');

  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, '..', 'scratch_chrome_e2e')
  ]);

  let versionInfo = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      versionInfo = await fetchJson(`http://localhost:${PORT}/json/version`);
      if (versionInfo) break;
    } catch (_) {}
  }

  if (!versionInfo) {
    console.error('Could not connect to Chrome debugging port.');
    chromeProcess.kill();
    process.exit(1);
  }

  const targets = await fetchJson(`http://localhost:${PORT}/json`);
  const pageTarget = targets.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension')) || targets[0];
  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);

  const uncaughtExceptions = [];
  cdp.onEvent = (method, params) => {
    if (method === 'Runtime.exceptionThrown') {
      const text = params.exceptionDetails.text + ' ' + (params.exceptionDetails.exception?.description || '');
      // Ignore non-app errors if any
      if (!text.includes('chrome-untrusted')) {
        uncaughtExceptions.push(text);
        console.error('   ❌ Browser Exception:', text);
      }
    }
  };

  await cdp.init();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      testsPassed++;
      console.log(`✓ PASS: ${name}`);
    } else {
      testsFailed++;
      console.error(`✗ FAIL: ${name} — ${details}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Navigate to /generate and verify initial clean state
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: Page Load & Component Initialization ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:3000/generate' });
  await sleep(2500);

  const initCheck = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('generateSubmitBtn');
      const form = document.getElementById('timetableForm');
      const dept = document.getElementById('departmentNameInput')?.value;
      const teachers = document.querySelectorAll('.teacher-item-card').length;
      const subjects = document.querySelectorAll('[data-subject-index]').length;
      const sections = document.querySelectorAll('[data-section-index]').length;
      const rooms = document.querySelectorAll('[data-room-num-index]').length;
      return {
        btnExists: !!btn,
        formExists: !!form,
        dept,
        teachers,
        subjects,
        sections,
        rooms
      };
    })()`,
    returnByValue: true
  });

  const ic = initCheck.result.value;
  assert(ic.btnExists, 'Generate Timetable button exists (#generateSubmitBtn)');
  assert(ic.formExists, 'Timetable form exists (#timetableForm)');
  assert(ic.dept === 'Computer Science & Engineering', 'Default department selected');
  assert(ic.teachers === 3, 'Initial teacher cards rendered (3 teachers)');
  assert(ic.subjects === 3, 'Initial subjects rendered (3 subjects)');
  assert(ic.sections === 1, 'Initial sections rendered (1 section)');
  assert(ic.rooms === 2, 'Initial rooms rendered (2 rooms)');

  async function clickGenerateAndWait(timeoutMs = 15000) {
    // Clear message first
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const msg = document.getElementById('message');
        if (msg) { msg.textContent = ''; msg.className = 'message hidden'; }
        const btn = document.getElementById('generateSubmitBtn');
        btn.click();
      })()`
    });

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await sleep(400);
      const check = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const msg = document.getElementById('message')?.textContent || '';
          const btn = document.getElementById('generateSubmitBtn');
          const isBusy = btn ? (btn.disabled || btn.classList.contains('is-loading')) : false;
          return { hasMessage: msg.trim().length > 0, isBusy };
        })()`,
        returnByValue: true
      });
      if (check.result.value.hasMessage && !check.result.value.isBusy) {
        break;
      }
    }
    await sleep(600);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Click Generate Timetable with Default Form
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Click Generate Timetable (Default Configuration) ---');
  const clickGen = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('generateSubmitBtn');
      btn.click();
      return true;
    })()`,
    returnByValue: true
  });
  assert(clickGen.result.value, 'Generate button clicked without error');

  await sleep(3500);

  const genResult = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const msg = document.getElementById('message')?.textContent || '';
      const isSuccess = document.getElementById('message')?.classList.contains('success');
      const timetableSection = document.getElementById('timetableSection');
      const isDisplayed = timetableSection ? window.getComputedStyle(timetableSection).display !== 'none' : false;
      const dayCards = document.querySelectorAll('.day-card').length;
      const dayCardDays = Array.from(document.querySelectorAll('.day-card')).map(c => c.dataset.day);
      const totalRows = document.querySelectorAll('table.timetable tbody tr').length;
      const scheduledRows = document.querySelectorAll('table.timetable tbody tr:not(.timetable-row--free):not(.timetable-row--break)').length;
      return {
        msg,
        isSuccess,
        isDisplayed,
        dayCards,
        dayCardDays,
        totalRows,
        scheduledRows
      };
    })()`,
    returnByValue: true
  });
  console.log('Test 2 details:', genResult.result.value);

  const gr = genResult.result.value;
  assert(gr.isSuccess, `Success message shown: "${gr.msg}"`);
  assert(gr.isDisplayed, 'Timetable output section (#timetableSection) made visible');
  assert(gr.dayCards === 5, `Day cards rendered for all 5 working days (got ${gr.dayCards})`);
  assert(gr.scheduledRows > 0, `Timetable entries scheduled and visible (got ${gr.scheduledRows} periods)`);

  // --------------------------------------------------------------------------
  // TEST 3: Minimal Valid Dataset (Section 15 of User Request)
  // CSE, 1 Teacher: Rahul (DBMS), 1 Subject: DBMS, 1 Section: CSE-A, 1 Room: 101, Monday Only
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Minimal Valid Dataset (CSE, 1T, 1S, 1Sec, 1Room, Monday) ---');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      // Set Department to CSE
      const deptInput = document.getElementById('departmentNameInput');
      if (deptInput) { deptInput.value = 'CSE'; deptInput.dispatchEvent(new Event('input')); }
      const deptSel = document.getElementById('departmentSelect');
      if (deptSel) { deptSel.value = ''; deptSel.dispatchEvent(new Event('change')); }

      // Set Teacher Count to 1
      const teacherCount = document.getElementById('teacherCount');
      if (teacherCount) {
        teacherCount.value = '1';
        teacherCount.dispatchEvent(new Event('input'));
      }

      // Configure teacher name
      const tInput = document.getElementById('teacher-name-0');
      if (tInput) { tInput.value = 'Rahul'; tInput.dispatchEvent(new Event('input')); }

      // Keep Subject 1 (DBMS), remove Subject 3 and Subject 2
      const btn2 = document.querySelector('[data-remove-subject="2"]');
      if (btn2) btn2.click();
      const btn1 = document.querySelector('[data-remove-subject="1"]');
      if (btn1) btn1.click();

      // Configure section
      const secInput = document.querySelector('[data-section-index="0"]');
      if (secInput) { secInput.value = 'CSE-A'; secInput.dispatchEvent(new Event('input')); }

      // Configure room
      const rNumInput = document.querySelector('[data-room-num-index="0"]');
      if (rNumInput) { rNumInput.value = '101'; rNumInput.dispatchEvent(new Event('input')); }

      // Select ONLY Monday
      const pills = document.querySelectorAll('#workingDayPills .day-toggle-pill');
      pills.forEach(pill => {
        const isMon = pill.dataset.day === 'Monday';
        if (pill.classList.contains('active') !== isMon) {
          pill.click();
        }
      });
    })()`,
    returnByValue: true
  });

  await sleep(600);

  // Click Generate for Minimal Dataset
  await clickGenerateAndWait();

  const minResult = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const msg = document.getElementById('message')?.textContent || '';
      const isSuccess = document.getElementById('message')?.classList.contains('success');
      const mondayCard = document.querySelector('.day-card[data-day="Monday"]');
      const scheduledRows = document.querySelectorAll('table.timetable tbody tr:not(.timetable-row--free):not(.timetable-row--break)').length;
      return {
        msg,
        isSuccess,
        mondayCardFound: !!mondayCard,
        scheduledRows
      };
    })()`,
    returnByValue: true
  });

  const mr = minResult.result.value;
  assert(mr.isSuccess && mr.msg.includes('CSE'), `Minimal dataset generated successfully: "${mr.msg}"`);
  assert(mr.mondayCardFound, 'Monday timetable card rendered');
  assert(mr.scheduledRows > 0, `Classes scheduled for minimal configuration (got ${mr.scheduledRows})`);

  // --------------------------------------------------------------------------
  // TEST 4: Realistic Dataset with Multiple Teachers, Sections, Rooms, Labs
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Realistic Multi-Teacher, Multi-Section, Lab Dataset ---');
  await cdp.send('Runtime.evaluate', {
    expression: `(async () => {
      // 1. Department
      const deptInput = document.getElementById('departmentNameInput');
      deptInput.value = 'Mechanical Engineering';
      deptInput.dispatchEvent(new Event('input'));
      const deptSel = document.getElementById('departmentSelect');
      if (deptSel) { deptSel.value = ''; deptSel.dispatchEvent(new Event('change')); }

      // 2. Add subjects first: Thermodynamics, Fluid Mechanics, CAD
      const s0 = document.querySelector('[data-subject-index="0"]');
      if (s0) { s0.value = 'Thermodynamics'; s0.dispatchEvent(new Event('input')); }
      const addSubBtn = document.getElementById('addSubjectBtn');
      if (addSubBtn) {
        addSubBtn.click();
        const s1 = document.querySelector('[data-subject-index="1"]');
        if (s1) { s1.value = 'Fluid Mechanics'; s1.dispatchEvent(new Event('input')); }
        addSubBtn.click();
        const s2 = document.querySelector('[data-subject-index="2"]');
        if (s2) { s2.value = 'CAD'; s2.dispatchEvent(new Event('input')); }
      }

      // 3. Teachers (3)
      const teacherCount = document.getElementById('teacherCount');
      teacherCount.value = '3';
      teacherCount.dispatchEvent(new Event('input'));

      document.getElementById('teacher-name-0').value = 'Prof. Sharma';
      document.getElementById('teacher-name-0').dispatchEvent(new Event('input'));
      const p0 = document.querySelector('[data-picker-teacher-idx="0"]');
      if (p0) { p0.value = 'Thermodynamics'; p0.dispatchEvent(new Event('change')); }

      document.getElementById('teacher-name-1').value = 'Dr. Gupta';
      document.getElementById('teacher-name-1').dispatchEvent(new Event('input'));
      const p1 = document.querySelector('[data-picker-teacher-idx="1"]');
      if (p1) { p1.value = 'Fluid Mechanics'; p1.dispatchEvent(new Event('change')); }

      document.getElementById('teacher-name-2').value = 'Prof. Verma';
      document.getElementById('teacher-name-2').dispatchEvent(new Event('input'));
      const p2 = document.querySelector('[data-picker-teacher-idx="2"]');
      if (p2) { p2.value = 'CAD'; p2.dispatchEvent(new Event('change')); }

      // 4. Sections (2)
      const sec0 = document.querySelector('[data-section-index="0"]');
      if (sec0) { sec0.value = 'ME-A'; sec0.dispatchEvent(new Event('input')); }
      const addSecBtn = document.getElementById('addSectionBtn');
      if (addSecBtn) {
        addSecBtn.click();
        const sec1 = document.querySelector('[data-section-index="1"]');
        if (sec1) { sec1.value = 'ME-B'; sec1.dispatchEvent(new Event('input')); }
      }

      // 5. Rooms (Room-201, Room-202)
      const r0 = document.querySelector('[data-room-num-index="0"]');
      if (r0) { r0.value = 'Room-201'; r0.dispatchEvent(new Event('input')); }
      const addRoomBtn = document.getElementById('addRoomBtn');
      if (addRoomBtn) {
        addRoomBtn.click();
        const r1 = document.querySelector('[data-room-num-index="1"]');
        if (r1) { r1.value = 'Room-202'; r1.dispatchEvent(new Event('input')); }
      }

      // 6. Working Days (Monday - Thursday, 4 days)
      const pills = document.querySelectorAll('#workingDayPills .day-toggle-pill');
      const activeDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
      pills.forEach(pill => {
        const shouldBeActive = activeDays.includes(pill.dataset.day);
        if (pill.classList.contains('active') !== shouldBeActive) {
          pill.click();
        }
      });
    })()`,
    returnByValue: true
  });

  await sleep(600);

  // Click Generate for Realistic Dataset
  await clickGenerateAndWait();

  const realResult = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const msg = document.getElementById('message')?.textContent || '';
      const isSuccess = document.getElementById('message')?.classList.contains('success');
      const scheduledRows = document.querySelectorAll('table.timetable tbody tr:not(.timetable-row--free):not(.timetable-row--break)').length;
      return {
        msg,
        isSuccess,
        scheduledRows
      };
    })()`,
    returnByValue: true
  });

  const rr = realResult.result.value;
  assert(rr.isSuccess && rr.msg.includes('Mechanical Engineering'), `Realistic dataset generated successfully: "${rr.msg}"`);
  assert(rr.scheduledRows > 0, `Timetable entries scheduled (got ${rr.scheduledRows})`);

  // --------------------------------------------------------------------------
  // TEST 5: Refresh & Persistence (Section 17 of User Request)
  // Refresh page, verify timetable is still loaded and displayed
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Browser Refresh & Persistence Verification ---');
  await cdp.send('Page.reload');
  await sleep(2500);

  const persistResult = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const timetableSection = document.getElementById('timetableSection');
      const isDisplayed = timetableSection ? window.getComputedStyle(timetableSection).display !== 'none' : false;
      const dayCards = document.querySelectorAll('.day-card').length;
      const scheduledRows = document.querySelectorAll('table.timetable tbody tr:not(.timetable-row--free):not(.timetable-row--break)').length;
      const savedBadges = document.querySelectorAll('.saved-tt-item').length;
      return {
        isDisplayed,
        dayCards,
        scheduledRows,
        savedBadges
      };
    })()`,
    returnByValue: true
  });

  const pr = persistResult.result.value;
  assert(pr.isDisplayed, 'Timetable section (#timetableSection) automatically visible on page reload');
  assert(pr.dayCards > 0, `Day cards persisted on refresh (got ${pr.dayCards})`);
  assert(pr.scheduledRows > 0, `Scheduled periods persisted on refresh (got ${pr.scheduledRows})`);

  // --------------------------------------------------------------------------
  // TEST 6: User Validation & Safe Error Display (Section 13 & 14)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Validation & Error Messaging ---');
  // Clear department name
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const deptInput = document.getElementById('departmentNameInput');
      const deptSel = document.getElementById('departmentSelect');
      if (deptInput) deptInput.value = '';
      if (deptSel) deptSel.value = '';
      document.getElementById('generateSubmitBtn').click();
    })()`
  });
  await sleep(1000);

  const valMsg = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const msg = document.getElementById('message');
      return {
        text: msg?.textContent || '',
        isError: msg?.classList.contains('error')
      };
    })()`,
    returnByValue: true
  });

  assert(valMsg.result.value.isError, `Empty department correctly shows error message: "${valMsg.result.value.text}"`);

  // --------------------------------------------------------------------------
  // TEST 7: Zero Uncaught Exceptions Check (Section 18)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Browser Console & Exception Audit ---');
  assert(uncaughtExceptions.length === 0, `Zero uncaught exceptions in browser console (got ${uncaughtExceptions.length})`);

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('===============================================================\n');

  cdp.close();
  chromeProcess.kill();
  process.exit(testsFailed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
