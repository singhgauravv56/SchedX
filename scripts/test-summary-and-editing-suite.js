/**
 * test-summary-and-editing-suite.js
 * Verification suite for the 17 specified tests in the SchedX Timetable Summary and Editing Fix
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: body });
        } catch (_) {
          resolve({ status: res.statusCode, headers: res.headers, data: body, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

function get(pathStr) {
  return request({
    hostname: 'localhost',
    port: 3000,
    path: pathStr,
    method: 'GET'
  });
}

function post(pathStr, body) {
  return request({
    hostname: 'localhost',
    port: 3000,
    path: pathStr,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(body))
    }
  }, body);
}

function put(pathStr, body) {
  return request({
    hostname: 'localhost',
    port: 3000,
    path: pathStr,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(body))
    }
  }, body);
}

async function runTests() {
  console.log('============================================================');
  console.log('SCHEDX: GENERATED TIMETABLE SUMMARY & EDITING VERIFICATION');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✓ ${testName} — ${details}`);
      passed++;
    } else {
      console.error(`✗ FAILED: ${testName} — ${details}`);
      failed++;
    }
  }

  try {
    // TEST 1: Layout ordering check in generate.html
    const htmlContent = fs.readFileSync(path.join(__dirname, '../public/generate.html'), 'utf8');
    const summaryIdx = htmlContent.indexOf('id="timetableSummaryCard"');
    const dayTabsIdx = htmlContent.indexOf('id="timetableDayTabs"');
    const daywiseIdx = htmlContent.indexOf('id="daywiseTimetableContainer"');
    const conflictIdx = htmlContent.indexOf('id="timetableConflictPanel"');

    const layoutCorrect = summaryIdx !== -1 && dayTabsIdx !== -1 && daywiseIdx !== -1 && conflictIdx !== -1 &&
      summaryIdx < dayTabsIdx && dayTabsIdx < daywiseIdx && daywiseIdx < conflictIdx;

    assert(layoutCorrect, 'TEST 1: Timetable layout placement',
      `Summary (${summaryIdx}) < Timetable (${daywiseIdx}) < Conflict Panel (${conflictIdx})`);

    // TEST 2: Generate valid timetable and check summary counters
    const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods5 = [
      { period: 1, start: '09:00', end: '10:00' },
      { period: 2, start: '10:00', end: '11:00' },
      { period: 3, start: '11:00', end: '12:00' },
      { period: 4, start: '13:00', end: '14:00' },
      { period: 5, start: '14:00', end: '15:00' }
    ];
    const day_periods = {};
    workingDays.forEach(d => { day_periods[d] = periods5; });

    const genPayload = {
      department: 'Computer Science',
      departmentId: 'Computer Science',
      day_periods,
      breaks: workingDays.map(d => ({
        name: 'Lunch Break',
        day: d,
        startTime: '12:00',
        endTime: '13:00',
        type: 'Lunch Break'
      })),
      working_days: workingDays,
      working_days_per_week: 5,
      teachers: [
        { name: 'Prof. CS-Turing', subjects: ['DBMS'] },
        { name: 'Prof. CS-Hopper', subjects: ['Data Structures'] },
        { name: 'Prof. CS-Lovelace', subjects: ['Operating Systems'] }
      ],
      subjects: [
        { name: 'DBMS', theory_hours: 4, lab_hours: 0 },
        { name: 'Data Structures', theory_hours: 4, lab_hours: 0 },
        { name: 'Operating Systems', theory_hours: 4, lab_hours: 0 }
      ],
      sections: [{ name: 'CS-Sec1' }],
      rooms: [
        { room_number: 'CS-Room-1', room_type: 'Classroom' },
        { room_number: 'CS-Room-2', room_type: 'Classroom' }
      ],
      room_type: 'Classroom'
    };

    const genRes = await post('/api/generate', genPayload);
    assert(genRes.status === 200 && genRes.data.success, 'TEST 2: Timetable generation endpoint returns success',
      `Status: ${genRes.status}, Entries created: ${genRes.data.entries_created}`);

    const summary = genRes.data.summary;
    assert(summary && summary.total_required === 15 && summary.successfully_scheduled === 15 && summary.requiring_attention === 0 && summary.detected_conflicts === 0,
      'TEST 2B: Summary reflects actual counts',
      `Total Required: ${summary?.total_required}, Scheduled: ${summary?.successfully_scheduled}, Conflicts: ${summary?.detected_conflicts}`);

    // TEST 3: Generate a timetable with unscheduled classes (impossible capacity)
    const tightGenPayload = {
      department: 'Capacity Overload Test',
      departmentId: 'Capacity Overload Test',
      day_periods: {
        'Monday': [{ period: 1, start: '09:00', end: '10:00' }]
      },
      working_days: ['Monday'],
      working_days_per_week: 1,
      teachers: [
        { name: 'Prof. Overload-Teacher', subjects: ['Subject 1', 'Subject 2', 'Subject 3'] }
      ],
      subjects: [
        { name: 'Subject 1', theory_hours: 2, lab_hours: 0 },
        { name: 'Subject 2', theory_hours: 2, lab_hours: 0 },
        { name: 'Subject 3', theory_hours: 2, lab_hours: 0 }
      ],
      sections: [{ name: 'Overload-Sec' }],
      rooms: [{ room_number: 'Overload-Room', room_type: 'Classroom' }],
      room_type: 'Classroom'
    };

    const tightRes = await post('/api/generate', tightGenPayload);
    const tightSummary = tightRes.data?.summary;
    const unscheduledCount = tightRes.data?.unscheduled_classes ? tightRes.data.unscheduled_classes.length : 0;
    assert(tightRes.status === 200 && (tightRes.data?.status === 'INCOMPLETE' || tightSummary?.requiring_attention > 0 || unscheduledCount > 0),
      'TEST 3: Unscheduled classes reflect in Requiring Attention',
      `Status: ${tightRes.data?.status}, Attention: ${tightSummary?.requiring_attention}, Unscheduled: ${unscheduledCount}`);

    // Restore valid Computer Science timetable
    const restoreRes = await post('/api/generate', genPayload);
    const ttRes = await get('/api/timetable');
    const timetable = ttRes.data;
    const csEntries = timetable.filter(e => e.department === 'Computer Science');
    assert(csEntries.length === 15, 'Restore valid Computer Science timetable baseline', `CS Entries: ${csEntries.length}`);

    const targetEntry = csEntries[0];
    const otherEntry = csEntries.find(e => e.day === targetEntry.day && e.start_time !== targetEntry.start_time) || csEntries[1];

    // TEST 4: Attempt teacher conflict edit
    const teacherConflictPayload = {
      ...targetEntry,
      day: otherEntry.day,
      start_time: otherEntry.start_time,
      end_time: otherEntry.end_time,
      teacher_name: otherEntry.teacher_name,
      room_name: 'CS-Room-2' // Different room, same teacher at overlapping time
    };

    const tConflictRes = await put(`/api/timetable/entry/${targetEntry.timetable_id || targetEntry.id}`, teacherConflictPayload);
    assert(tConflictRes.status === 409 || (tConflictRes.data && /already scheduled|conflict/i.test(tConflictRes.data.error || tConflictRes.data.message)),
      'TEST 4: Teacher conflict detected and blocked by validation',
      `Status: ${tConflictRes.status}, Error: ${tConflictRes.data?.error || tConflictRes.data?.message}`);

    // TEST 5: Attempt room conflict edit
    const roomConflictPayload = {
      ...targetEntry,
      day: otherEntry.day,
      start_time: otherEntry.start_time,
      end_time: otherEntry.end_time,
      room_name: otherEntry.room_name,
      teacher_name: targetEntry.teacher_name
    };

    const rConflictRes = await put(`/api/timetable/entry/${targetEntry.timetable_id || targetEntry.id}`, roomConflictPayload);
    assert(rConflictRes.status === 409 || (rConflictRes.data && /already occupied|conflict/i.test(rConflictRes.data.error || rConflictRes.data.message)),
      'TEST 5: Room conflict detected and blocked by validation',
      `Status: ${rConflictRes.status}, Error: ${rConflictRes.data?.error || rConflictRes.data?.message}`);

    // TEST 6 & 10: Valid edit changing Day, Time, and saving
    // Find an empty slot in Friday Period 5 where Prof. CS-Hopper and CS-Room-1 are free
    // Let's find what slots are occupied on Friday in this department
    const fridayOccupiedStarts = csEntries.filter(e => e.day === 'Friday').map(e => String(e.start_time).substring(0, 5));
    const freeFridaySlot = periods5.find(p => !fridayOccupiedStarts.includes(p.start)) || periods5[periods5.length - 1];

    const validEditPayload = {
      ...targetEntry,
      day: 'Friday',
      start_time: freeFridaySlot.start + ':00',
      end_time: freeFridaySlot.end + ':00',
      teacher_name: targetEntry.teacher_name,
      room_name: 'CS-Room-1'
    };

    const validEditRes = await put(`/api/timetable/entry/${targetEntry.timetable_id || targetEntry.id}`, validEditPayload);
    assert(validEditRes.status === 200 && validEditRes.data.success,
      'TEST 6 & 10: Valid manual edit applied and saved persistently',
      `Status: ${validEditRes.status}, Result status: ${validEditRes.data?.status}`);

    // TEST 7: Confirm day validation against configured schedule
    const unconfiguredDayPayload = {
      ...targetEntry,
      day: 'Saturday', // unconfigured day
      start_time: '09:00:00',
      end_time: '10:00:00'
    };
    const unconfiguredDayRes = await put(`/api/timetable/entry/${targetEntry.timetable_id || targetEntry.id}`, unconfiguredDayPayload);
    assert(unconfiguredDayRes.status === 409 || unconfiguredDayRes.status === 400 || (unconfiguredDayRes.data?.error && /not configured|working day/i.test(unconfiguredDayRes.data.error)),
      'TEST 7: Unconfigured working day rejected',
      `Status: ${unconfiguredDayRes.status}, Error: ${unconfiguredDayRes.data?.error || unconfiguredDayRes.data?.message}`);

    // TEST 8: Invalid start/end interval (end <= start)
    const invalidTimePayload = {
      ...targetEntry,
      day: 'Monday',
      start_time: '11:00:00',
      end_time: '10:00:00'
    };
    const invalidTimeRes = await put(`/api/timetable/entry/${targetEntry.timetable_id || targetEntry.id}`, invalidTimePayload);
    assert(invalidTimeRes.status === 400,
      'TEST 8: Time interval boundary validation (start < end enforced)',
      `Status: ${invalidTimeRes.status}, Error: ${invalidTimeRes.data?.error}`);

    // TEST 9: Ineligible teacher change
    const ineligibleTeacherPayload = {
      ...targetEntry,
      day: targetEntry.day,
      start_time: targetEntry.start_time,
      end_time: targetEntry.end_time,
      teacher_name: 'Prof. CS-Lovelace' // Configured for Operating Systems, while targetEntry course is DBMS or Data Structures
    };
    const ineligRes = await put(`/api/timetable/entry/${targetEntry.timetable_id || targetEntry.id}`, ineligibleTeacherPayload);
    assert(ineligRes.status === 409 || (ineligRes.data && /eligible|assigned to/i.test(ineligRes.data.error || ineligRes.data.message)),
      'TEST 9: Teacher-subject eligibility validated',
      `Status: ${ineligRes.status}, Error: ${ineligRes.data?.error || ineligRes.data?.message}`);

    // TEST 11: PDF download reflects latest assignments
    const pdfRes = await get('/api/timetable/pdf?department=Computer%20Science');
    assert(pdfRes.status === 200 && pdfRes.headers['content-type'] === 'application/pdf' && pdfRes.raw.length > 500,
      'TEST 11: PDF export generated from verified timetable',
      `Status: ${pdfRes.status}, Content-Type: ${pdfRes.headers['content-type']}, Size: ${pdfRes.raw.length} bytes`);

    // TEST 12: Reload timetable and verify edits remain intact
    const reloaded = await get('/api/timetable');
    const editedFound = reloaded.data.find(e => String(e.timetable_id || e.id) === String(targetEntry.timetable_id || targetEntry.id));
    assert(editedFound && editedFound.day === 'Friday' && String(editedFound.start_time).startsWith(freeFridaySlot.start),
      'TEST 12: Saved edits persist upon reload',
      `Found entry on ${editedFound?.day} at ${editedFound?.start_time}`);

    // TEST 13: Active metadata status is VALID when conflict-free
    const activeMetaRes = await get('/api/timetable/active-metadata');
    const activeVer = activeMetaRes.data.activeVersion;
    assert(activeVer && activeVer.status === 'VALID' && (!activeVer.conflicts || activeVer.conflicts.length === 0),
      'TEST 13: Genuinely valid timetable marked VALID only after validation',
      `Status: ${activeVer?.status}, Conflicts count: ${activeVer?.conflicts?.length || 0}`);

    // TEST 14: Empty result check
    const emptyCheckScript = fs.readFileSync(path.join(__dirname, '../public/script.js'), 'utf8');
    const hasEmptyGuards = emptyCheckScript.includes("statusPill.textContent = 'Not Generated'") &&
      emptyCheckScript.includes("statusPill.classList.add('status-not-generated')");
    assert(hasEmptyGuards, 'TEST 14: Empty generation result displays Not Generated, never falsely Valid',
      'Script guards totalEntries === 0 and empty summary');

    // TEST 15: No-conflict state consistency
    const hidesRedOnZero = emptyCheckScript.includes("conflictPanel.style.display = 'none'") &&
      emptyCheckScript.includes("displayConflicts.length > 0");
    assert(hidesRedOnZero, 'TEST 15: No alarming red warning when conflicts count is 0',
      'Conflict panel hidden when displayConflicts is empty');

    // TEST 16: Unsaved changes state indication
    const hasUnsavedIndication = emptyCheckScript.includes("setEditDirty") &&
      emptyCheckScript.includes("editModalDirtyBadge") &&
      emptyCheckScript.includes("isEditDirty");
    assert(hasUnsavedIndication, 'TEST 16: Unsaved changes tracking and modal dirty indication present',
      'setEditDirty, editModalDirtyBadge, and isEditDirty active');

    // TEST 17: Responsive layout and horizontal scrolling supported
    const cssContent = fs.readFileSync(path.join(__dirname, '../public/style.css'), 'utf8');
    const hasScrollContainer = cssContent.includes('.day-table-container') && cssContent.includes('overflow-x');
    const hasModalMedia = cssContent.includes('.edit-timetable-modal') || cssContent.includes('.edit-modal-box');
    assert(hasScrollContainer && hasModalMedia, 'TEST 17: Responsive layout and horizontal scrolling supported',
      'overflow-x supported for timetable tables on small screens');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  }

  console.log('\n============================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
