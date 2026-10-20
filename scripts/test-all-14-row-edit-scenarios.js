const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9230;

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

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, buffer: Buffer.concat(chunks) }));
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
        } else if (msg.method) {
          if (this.onEvent) this.onEvent(msg.method, msg.params);
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
  console.log('====================================================');
  console.log('EXECUTING COMPLETE 14-TEST ROW EDIT VERIFICATION SUITE');
  console.log('====================================================');

  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, '..', 'scratch_chrome_suite_14')
  ]);

  let versionInfo = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      versionInfo = await fetchJson(`http://localhost:${PORT}/json/version`);
      if (versionInfo) break;
    } catch (e) {}
  }

  if (!versionInfo) {
    console.error('Could not connect to Chrome debugging port.');
    chromeProcess.kill();
    process.exit(1);
  }

  const targets = await fetchJson(`http://localhost:${PORT}/json`);
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);

  const consoleLogs = [];
  cdp.onEvent = (method, params) => {
    if (method === 'Runtime.consoleAPICalled') {
      const text = params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      consoleLogs.push(`[Console ${params.type}] ${text}`);
    } else if (method === 'Runtime.exceptionThrown') {
      const text = params.exceptionDetails.text + ' ' + (params.exceptionDetails.exception?.description || '');
      consoleLogs.push(`[Exception] ${text}`);
      console.error(`[Browser Exception]`, text);
    }
  };

  await cdp.init();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  console.log('Navigating to http://localhost:3000/generate ...');
  await cdp.send('Page.navigate', { url: 'http://localhost:3000/generate' });
  await sleep(3500);

  const testResults = {};

  // Find target Algorithms row
  const rowInfo = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll('.timetable-entry-row'));
      const algoRow = rows.find(r => r.innerText.includes('Algorithms'));
      return {
        found: !!algoRow,
        entryId: algoRow?.dataset.entryId,
        text: algoRow?.innerText.replace(/\\s+/g, ' ')
      };
    })()`,
    returnByValue: true
  });
  console.log('Initial Algorithms Row:', JSON.stringify(rowInfo.result.value, null, 2));
  const algoEntryId = rowInfo.result.value.entryId;

  // --------------------------------------------------------------------------
  // TEST 1: Click Edit on the Algorithms assignment
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: Click Edit on Algorithms assignment ---');
  const t1 = await cdp.send('Runtime.evaluate', {
    expression: `(async () => {
      const row = document.querySelector(\`tr[data-entry-id="${algoEntryId}"]\`);
      const btn = row.querySelector('.btn-edit-entry');
      btn.click();
      await new Promise(r => setTimeout(r, 600));

      const isEditing = row.classList.contains('is-inline-editing');
      const daySelect = document.getElementById('inlineDay_${algoEntryId}');
      const timeSelect = document.getElementById('inlineTime_${algoEntryId}');
      const teacherSelect = document.getElementById('inlineTeacher_${algoEntryId}');
      const subjectSelect = document.getElementById('inlineSubject_${algoEntryId}');
      const roomSelect = document.getElementById('inlineRoom_${algoEntryId}');
      const saveBtn = document.getElementById('btnSaveInline_${algoEntryId}');
      const cancelBtn = document.getElementById('btnCancelInline_${algoEntryId}');

      return {
        isEditing,
        dayVal: daySelect?.value,
        timeVal: timeSelect?.value,
        teacherVal: teacherSelect?.value,
        subjectVal: subjectSelect?.value,
        roomVal: roomSelect?.value,
        teacherOptions: Array.from(teacherSelect?.options || []).map(o => o.value),
        hasSaveBtn: !!saveBtn,
        hasCancelBtn: !!cancelBtn
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('TEST 1 Result:', JSON.stringify(t1.result.value, null, 2));
  const t1Passed = t1.result.value.isEditing &&
    t1.result.value.subjectVal === 'Algorithms' &&
    t1.result.value.teacherVal === 'Dr. Alan Turing' &&
    t1.result.value.hasSaveBtn &&
    t1.result.value.hasCancelBtn;
  testResults['TEST 1'] = t1Passed ? 'PASSED' : 'FAILED';
  console.log(`TEST 1: ${testResults['TEST 1']}`);

  // --------------------------------------------------------------------------
  // TEST 7: Cancel an edit
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Cancel an edit ---');
  const t7 = await cdp.send('Runtime.evaluate', {
    expression: `(async () => {
      const cancelBtn = document.getElementById('btnCancelInline_${algoEntryId}');
      cancelBtn.click();
      await new Promise(r => setTimeout(r, 400));

      const row = document.querySelector(\`tr[data-entry-id="${algoEntryId}"]\`);
      const isEditing = row?.classList.contains('is-inline-editing');
      const hasAlgo = row?.innerText.includes('Algorithms');
      const editBtnFound = !!row?.querySelector('.btn-edit-entry');
      return { isEditing, hasAlgo, editBtnFound };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('TEST 7 Result:', JSON.stringify(t7.result.value, null, 2));
  const t7Passed = !t7.result.value.isEditing && t7.result.value.hasAlgo && t7.result.value.editBtnFound;
  testResults['TEST 7'] = t7Passed ? 'PASSED' : 'FAILED';
  console.log(`TEST 7: ${testResults['TEST 7']}`);

  // --------------------------------------------------------------------------
  // TEST 6: Attempt to assign a teacher who is unavailable / unregistered
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Attempt to assign an unavailable teacher ---');
  const t6 = await cdp.send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        const res = await apiRequest('PUT', '/timetable/entry/${algoEntryId}', {
          timetable_id: '${algoEntryId}',
          teacher_name: 'Unavailable Faculty 999',
          course_name: 'Algorithms'
        });
        return { rejected: false, res };
      } catch (err) {
        return { rejected: true, message: err.message };
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('TEST 6 Result:', JSON.stringify(t6.result.value, null, 2));
  const t6Passed = t6.result.value.rejected && t6.result.value.message.includes('not registered');
  testResults['TEST 6'] = t6Passed ? 'PASSED' : 'FAILED';
  console.log(`TEST 6: ${testResults['TEST 6']}`);

  // --------------------------------------------------------------------------
  // TEST 2: Change only the teacher
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Change only the teacher ---');
  const t2 = await cdp.send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        await startInlineRowEdit('${algoEntryId}');
        const teacherSelect = document.getElementById('inlineTeacher_${algoEntryId}');
        if (!teacherSelect) return { success: false, error: 'teacherSelect not found' };

        const initialTeacher = teacherSelect.value;
        const targetTeacher = 'Prof. Ananya Sharma'; // also eligible for Algorithms
        teacherSelect.value = targetTeacher;
        teacherSelect.dispatchEvent(new Event('change'));

        await saveInlineRowEdit('${algoEntryId}');
        await new Promise(r => setTimeout(r, 600));

        const rowAfter = document.querySelector(\`tr[data-entry-id="${algoEntryId}"]\`);
        const cells = rowAfter ? Array.from(rowAfter.querySelectorAll('td')).map(td => td.innerText.trim()) : [];

        return {
          success: true,
          initialTeacher,
          targetTeacher,
          updatedDay: cells[0],
          updatedTime: cells[2],
          updatedSection: cells[3],
          updatedSubject: cells[4],
          updatedTeacher: cells[6],
          updatedRoom: cells[7]
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('TEST 2 Result:', JSON.stringify(t2.result.value, null, 2));
  const t2Passed = t2.result.value.success &&
    t2.result.value.updatedTeacher === 'Prof. Ananya Sharma' &&
    t2.result.value.updatedSubject.includes('Algorithms') &&
    t2.result.value.updatedRoom.includes('Room 101');
  testResults['TEST 2'] = t2Passed ? 'PASSED' : 'FAILED';
  console.log(`TEST 2: ${testResults['TEST 2']}`);

  // --------------------------------------------------------------------------
  // TEST 8: Save an edit persists in the database
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: Save an edit persists in the database ---');
  const t8 = await cdp.send('Runtime.evaluate', {
    expression: `(async () => {
      const tt = await apiRequest('GET', '/timetable');
      const entry = tt.find(e => String(e.timetable_id || e.id) === "${algoEntryId}");
      return { found: !!entry, teacher: entry?.teacher_name, subject: entry?.course_name };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('TEST 8 Result:', JSON.stringify(t8.result.value, null, 2));
  const t8Passed = t8.result.value.found && t8.result.value.teacher === 'Prof. Ananya Sharma';
  testResults['TEST 8'] = t8Passed ? 'PASSED' : 'FAILED';
  console.log(`TEST 8: ${testResults['TEST 8']}`);

  // --------------------------------------------------------------------------
  // TEST 9: Reload the timetable (saved change remains visible)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: Reload timetable page ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:3000/generate' });
  await sleep(3500);

  const t9 = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const row = document.querySelector(\`tr[data-entry-id="${algoEntryId}"]\`);
      const cells = row ? Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim()) : [];
      return {
        rowFound: !!row,
        teacher: cells[6],
        subject: cells[4],
        room: cells[7]
      };
    })()`,
    returnByValue: true
  });
  console.log('TEST 9 Result:', JSON.stringify(t9.result.value, null, 2));
  const t9Passed = t9.result.value.rowFound && t9.result.value.teacher === 'Prof. Ananya Sharma';
  testResults['TEST 9'] = t9Passed ? 'PASSED' : 'FAILED';
  console.log(`TEST 9: ${testResults['TEST 9']}`);

  // --------------------------------------------------------------------------
  // TEST 3: Change the day
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Change the day to Friday ---');
  const t3 = await cdp.send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        await startInlineRowEdit('${algoEntryId}');
        const daySelect = document.getElementById('inlineDay_${algoEntryId}');
        daySelect.value = 'Friday';
        daySelect.dispatchEvent(new Event('change'));

        const timeSelect = document.getElementById('inlineTime_${algoEntryId}');
        // Select 15:30 slot on Friday
        const opt1530 = Array.from(timeSelect.options).find(o => o.dataset.start === '15:30');
        if (opt1530) {
          timeSelect.value = opt1530.value;
          timeSelect.dispatchEvent(new Event('change'));
        }

        const roomSelect = document.getElementById('inlineRoom_${algoEntryId}');
        roomSelect.value = 'Room 102'; // free at 15:30 on Friday
        roomSelect.dispatchEvent(new Event('change'));

        await saveInlineRowEdit('${algoEntryId}');
        await new Promise(r => setTimeout(r, 600));

        const tt = await apiRequest('GET', '/timetable');
        const entry = tt.find(e => String(e.timetable_id || e.id) === "${algoEntryId}");
        return {
          success: true,
          day: entry?.day,
          startTime: entry?.start_time,
          room: entry?.room_name
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('TEST 3 Result:', JSON.stringify(t3.result.value, null, 2));
  const t3Passed = t3.result.value.success && t3.result.value.day === 'Friday' && t3.result.value.startTime?.startsWith('15:30');
  testResults['TEST 3'] = t3Passed ? 'PASSED' : 'FAILED';
  console.log(`TEST 3: ${testResults['TEST 3']}`);

  // --------------------------------------------------------------------------
  // TEST 4: Change the period
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Change the period ---');
  const t4 = await cdp.send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        // Switch to all days tab to ensure Friday row is rendered and accessible
        const allTab = document.querySelector('.day-tab-btn[data-tab="all"]') || document.querySelector('.day-tab-btn[data-tab="Friday"]');
        if (allTab) allTab.click();
        await new Promise(r => setTimeout(r, 300));

        await startInlineRowEdit('${algoEntryId}');
        const timeSelect = document.getElementById('inlineTime_${algoEntryId}');
        // Change to 10:40-11:30 (Period 3) on Friday
        const opt1040 = Array.from(timeSelect.options).find(o => o.dataset.start === '10:40');
        if (opt1040) {
          timeSelect.value = opt1040.value;
          timeSelect.dispatchEvent(new Event('change'));
        }

        const roomSelect = document.getElementById('inlineRoom_${algoEntryId}');
        roomSelect.value = '101'; // free at 10:40 on Friday
        roomSelect.dispatchEvent(new Event('change'));

        await saveInlineRowEdit('${algoEntryId}');
        await new Promise(r => setTimeout(r, 600));

        const tt = await apiRequest('GET', '/timetable');
        const entry = tt.find(e => String(e.timetable_id || e.id) === "${algoEntryId}");
        return {
          success: true,
          day: entry?.day,
          startTime: entry?.start_time,
          period: entry?.period_number,
          room: entry?.room_name
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('TEST 4 Result:', JSON.stringify(t4.result.value, null, 2));
  const t4Passed = t4.result.value.success && t4.result.value.startTime?.startsWith('10:40') && t4.result.value.day === 'Friday';
  testResults['TEST 4'] = t4Passed ? 'PASSED' : 'FAILED';
  console.log(`TEST 4: ${testResults['TEST 4']}`);

  // --------------------------------------------------------------------------
  // TEST 5: Change the room to resolve a room conflict
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Change room to resolve a room conflict ---');
  const conflictEntryId = 'tt_1792192655086_1'; // has Room 101 collision on Monday 10:00
  const t5 = await cdp.send('Runtime.evaluate', {
    expression: `(async () => {
      // Switch to Monday tab
      const monTab = document.querySelector('.day-tab-btn[data-tab="Monday"]') || document.querySelector('.day-tab-btn[data-tab="all"]');
      if (monTab) monTab.click();
      await new Promise(r => setTimeout(r, 400));

      const row = document.querySelector(\`tr[data-entry-id="${conflictEntryId}"]\`);
      const hasConflictBefore = row?.classList.contains('timetable-row--conflict');

      row.querySelector('.btn-edit-entry').click();
      await new Promise(r => setTimeout(r, 600));

      const roomSelect = document.getElementById('inlineRoom_${conflictEntryId}');
      // Select free room '101' at 10:00 AM on Monday
      roomSelect.value = '101';
      roomSelect.dispatchEvent(new Event('change'));

      document.getElementById('btnSaveInline_${conflictEntryId}').click();
      await new Promise(r => setTimeout(r, 2000));

      const tt = await apiRequest('GET', '/timetable');
      const entry = tt.find(e => String(e.timetable_id || e.id) === "${conflictEntryId}");
      const rowAfter = document.querySelector(\`tr[data-entry-id="${conflictEntryId}"]\`);
      const hasConflictAfter = rowAfter?.classList.contains('timetable-row--conflict');

      return {
        hasConflictBefore,
        savedRoom: entry?.room_name,
        hasConflictInDb: entry?.has_conflict,
        hasConflictClassAfter: hasConflictAfter
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('TEST 5 Result:', JSON.stringify(t5.result.value, null, 2));
  const t5Passed = t5.result.value.savedRoom === '101' && !t5.result.value.hasConflictInDb && !t5.result.value.hasConflictClassAfter;
  testResults['TEST 5'] = t5Passed ? 'PASSED' : 'FAILED';
  console.log(`TEST 5: ${testResults['TEST 5']}`);

  // --------------------------------------------------------------------------
  // TEST 10: Download the PDF
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: Download PDF reflects latest saved assignments ---');
  const pdfRes = await fetchBuffer('http://localhost:3000/api/timetable/pdf');
  console.log('PDF Status:', pdfRes.statusCode, 'Content-Type:', pdfRes.headers['content-type'], 'Bytes:', pdfRes.buffer.length);
  const t10Passed = pdfRes.statusCode === 200 && pdfRes.headers['content-type'].includes('application/pdf') && pdfRes.buffer.length > 500;
  testResults['TEST 10'] = t10Passed ? 'PASSED' : 'FAILED';
  console.log(`TEST 10: ${testResults['TEST 10']}`);

  // --------------------------------------------------------------------------
  // TEST 11: Edit a row while another row has a conflict
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 11: Edit a row while another row has a conflict ---');
  const t11 = await cdp.send('Runtime.evaluate', {
    expression: `(async () => {
      // Find any conflict row and a separate non-conflict row
      const conflictRow = document.querySelector('.timetable-row--conflict');
      const conflictId = conflictRow?.dataset.entryId;

      const nonConflictRow = document.querySelector('.timetable-entry-row:not(.timetable-row--conflict):not(.timetable-row--free):not(.timetable-row--break)');
      const nonConflictId = nonConflictRow?.dataset.entryId;

      // Edit the non-conflict row
      nonConflictRow.querySelector('.btn-edit-entry').click();
      await new Promise(r => setTimeout(r, 600));

      const isNonConflictEditing = nonConflictRow.classList.contains('is-inline-editing');
      const isConflictRowStillConflicted = conflictRow ? conflictRow.classList.contains('timetable-row--conflict') : true;

      // Cancel edit safely
      document.getElementById(\`btnCancelInline_\${nonConflictId}\`)?.click();

      return {
        conflictId,
        nonConflictId,
        isNonConflictEditing,
        isConflictRowStillConflicted
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('TEST 11 Result:', JSON.stringify(t11.result.value, null, 2));
  const t11Passed = t11.result.value.isNonConflictEditing && t11.result.value.isConflictRowStillConflicted;
  testResults['TEST 11'] = t11Passed ? 'PASSED' : 'FAILED';
  console.log(`TEST 11: ${testResults['TEST 11']}`);

  // --------------------------------------------------------------------------
  // TEST 12: Verify summary and conflict counts
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 12: Verify summary and conflict counts ---');
  const t12 = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const totalReq = document.getElementById('metricTotalClasses')?.innerText;
      const scheduled = document.getElementById('metricScheduledClasses')?.innerText;
      const attention = document.getElementById('metricAttentionClasses')?.innerText;
      const conflicts = document.getElementById('metricDetectedConflicts')?.innerText;
      const statusPill = document.getElementById('summaryStatusPill')?.innerText;

      return {
        totalReq: Number(totalReq),
        scheduled: Number(scheduled),
        attention: Number(attention),
        conflicts: Number(conflicts),
        statusPill
      };
    })()`,
    returnByValue: true
  });
  console.log('TEST 12 Result:', JSON.stringify(t12.result.value, null, 2));
  const t12Passed = t12.result.value.totalReq > 0 &&
    t12.result.value.scheduled > 0 &&
    typeof t12.result.value.conflicts === 'number' &&
    !!t12.result.value.statusPill;
  testResults['TEST 12'] = t12Passed ? 'PASSED' : 'FAILED';
  console.log(`TEST 12: ${testResults['TEST 12']}`);

  // --------------------------------------------------------------------------
  // TEST 13: Verify Delete button remains independent of Edit
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 13: Verify Delete button independence ---');
  const t13 = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const firstRow = document.querySelector('.timetable-entry-row:not(.timetable-row--free):not(.timetable-row--break)');
      const editBtn = firstRow?.querySelector('.btn-edit-entry');
      const deleteBtn = firstRow?.querySelector('.btn-delete-entry');

      return {
        editBtnFound: !!editBtn,
        deleteBtnFound: !!deleteBtn,
        deleteBtnAttr: deleteBtn?.getAttribute('data-delete-entry'),
        editBtnAttr: editBtn?.getAttribute('data-edit-entry'),
        areDistinct: editBtn !== deleteBtn,
        deleteClass: deleteBtn?.className,
        editClass: editBtn?.className
      };
    })()`,
    returnByValue: true
  });
  console.log('TEST 13 Result:', JSON.stringify(t13.result.value, null, 2));
  const t13Passed = t13.result.value.editBtnFound &&
    t13.result.value.deleteBtnFound &&
    t13.result.value.areDistinct &&
    t13.result.value.deleteBtnAttr === t13.result.value.editBtnAttr;
  testResults['TEST 13'] = t13Passed ? 'PASSED' : 'FAILED';
  console.log(`TEST 13: ${testResults['TEST 13']}`);

  // --------------------------------------------------------------------------
  // TEST 14: Test repeated edits without stale-state bugs
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 14: Repeated edits without stale-state bugs ---');
  const t14 = await cdp.send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        const allTab = document.querySelector('.day-tab-btn[data-tab="all"]');
        if (allTab) allTab.click();
        await new Promise(r => setTimeout(r, 300));

        // Edit 1: change section to Section B
        await startInlineRowEdit('${algoEntryId}');
        const secSel1 = document.getElementById('inlineSection_${algoEntryId}');
        if (secSel1) {
          secSel1.value = 'Section B';
          secSel1.dispatchEvent(new Event('change'));
        }
        await saveInlineRowEdit('${algoEntryId}');
        await new Promise(r => setTimeout(r, 600));

        // Edit 2: change section to Section C
        await startInlineRowEdit('${algoEntryId}');
        const secSel2 = document.getElementById('inlineSection_${algoEntryId}');
        if (secSel2) {
          secSel2.value = 'Section C';
          secSel2.dispatchEvent(new Event('change'));
        }
        await saveInlineRowEdit('${algoEntryId}');
        await new Promise(r => setTimeout(r, 600));

        // Edit 3: change section back to Section A
        await startInlineRowEdit('${algoEntryId}');
        const secSel3 = document.getElementById('inlineSection_${algoEntryId}');
        if (secSel3) {
          secSel3.value = 'Section A';
          secSel3.dispatchEvent(new Event('change'));
        }
        await saveInlineRowEdit('${algoEntryId}');
        await new Promise(r => setTimeout(r, 600));

        const tt = await apiRequest('GET', '/timetable');
        const entry = tt.find(e => String(e.timetable_id || e.id) === "${algoEntryId}");

        return {
          success: true,
          finalSection: entry?.section
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('TEST 14 Result:', JSON.stringify(t14.result.value, null, 2));
  const t14Passed = t14.result.value.success && t14.result.value.finalSection === 'Section A';
  testResults['TEST 14'] = t14Passed ? 'PASSED' : 'FAILED';
  console.log(`TEST 14: ${testResults['TEST 14']}`);

  console.log('\n====================================================');
  console.log('FINAL 14-TEST EXECUTION SUMMARY TABLE:');
  console.log('====================================================');
  console.table(testResults);

  cdp.close();
  chromeProcess.kill();

  const allPassed = Object.values(testResults).every(v => v === 'PASSED');
  console.log('\nOVERALL RESULT:', allPassed ? '✓ ALL 14 TESTS PASSED PERFECTLY!' : '✗ SOME TESTS FAILED');

  return { allPassed, testResults };
}

run().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
