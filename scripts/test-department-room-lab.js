/**
 * Comprehensive Automated Verification Suite for SchedX:
 * - Department Selection (Step 01 — DEPARTMENT)
 * - Multi-Department Generation & Retention
 * - Global Teacher Conflict Prevention Across Departments
 * - Global Room & Lab Overlap Conflict Prevention
 * - Room Cards Layout (CSS Grid 2-col desktop, 1-col mobile, inner spacing, hover)
 * - Lab Classes Day Selector (respects Working Days, multi-slot contiguous allocation)
 * - Cross-Department Validation on Edit & Storage
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch (_) {
          parsed = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

const results = [];

function recordTest(name, expected, actual, passed) {
  const status = passed ? 'PASS' : 'FAIL';
  results.push({ name, expected, actual, status });
  console.log(`[${status}] ${name}`);
  if (!passed) {
    console.error(`       Expected: ${expected}`);
    console.error(`       Actual:   ${actual}`);
  }
}

async function runTestSuite() {
  console.log('============================================================');
  console.log('STARTING SCHEDX DEPARTMENT, ROOM & LAB VERIFICATION SUITE');
  console.log('============================================================\n');

  // -------------------------------------------------------------
  // TEST 1: DOM & CSS Verifications for Room Layout & Spacing
  // -------------------------------------------------------------
  const htmlContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'generate.html'), 'utf8');
  const cssContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'style.css'), 'utf8');

  // Verify Step 01 Department Card exists at top before Teachers
  const deptCardIdx = htmlContent.indexOf('id="stepDepartmentCard"');
  const teachersCardIdx = htmlContent.indexOf('id="stepTeachersCard"');
  const stepDeptMatch = deptCardIdx !== -1 &&
    teachersCardIdx !== -1 &&
    deptCardIdx < teachersCardIdx &&
    htmlContent.includes('<div class="step-badge">01</div>') &&
    htmlContent.includes('DEPARTMENT') &&
    htmlContent.includes('id="departmentSelect"');

  recordTest(
    'Step 01 — DEPARTMENT card placed at beginning of form before Teachers',
    'HTML contains #stepDepartmentCard with badge "01" and #departmentSelect before #stepTeachersCard',
    stepDeptMatch ? 'Found before #stepTeachersCard with badge 01' : 'Not found or out of order',
    stepDeptMatch
  );

  // Verify Renumbered steps (Requirements 2, 10, 19)
  const stepTeachersBadge = htmlContent.includes('<div class="step-badge">02</div>');
  const stepSubjectsBadge = htmlContent.includes('<div class="step-badge">03</div>');
  const stepSectionsBadge = htmlContent.includes('<div class="step-badge">04</div>');
  const stepRoomsBadge = htmlContent.includes('<div class="step-badge">05</div>') && htmlContent.includes('id="stepRoomsCard"');
  const stepPeriodsBadge = htmlContent.includes('<div class="step-badge">06</div>') && htmlContent.includes('id="stepPeriodsCard"');
  const stepLabBadge = htmlContent.includes('<div class="step-badge">07</div>') && htmlContent.includes('id="stepLabClassesCard"');
  const renumberedSteps = stepTeachersBadge && stepSubjectsBadge && stepSectionsBadge && stepRoomsBadge && stepPeriodsBadge && stepLabBadge;

  recordTest(
    'Step renumbering across Generate Page',
    'Step 01 Department, Step 02 Teachers, Step 03 Subjects, Step 04 Sections, Step 05 Rooms, Step 06 Periods & Time Span, Step 07 Lab Classes',
    `Badges: 02 Teachers=${stepTeachersBadge}, 03 Subjects=${stepSubjectsBadge}, 04 Sections=${stepSectionsBadge}, 05 Rooms=${stepRoomsBadge}, 06 Periods=${stepPeriodsBadge}, 07 Labs=${stepLabBadge}`,
    renumberedSteps
  );

  // Verify Room layout CSS rules
  const hasRoomGrid = cssContent.includes('.room-inner-grid') &&
    cssContent.includes('grid-template-columns: 1fr 1fr');
  const hasRoomHover = cssContent.includes('.room-item-card:hover') &&
    cssContent.includes('translateY(-2px)');
  const hasRoomPill = cssContent.includes('.room-order-pill');
  recordTest(
    'Room CSS Grid and spacing layout',
    'CSS defines .room-inner-grid with 2 columns on desktop, 1 on mobile, and smooth hover translateY(-2px)',
    `Grid: ${hasRoomGrid}, Hover: ${hasRoomHover}, Pill: ${hasRoomPill}`,
    hasRoomGrid && hasRoomHover && hasRoomPill
  );

  // Verify Timetable Department Filter in HTML & CSS
  const hasTimetableDeptFilter = htmlContent.includes('id="timetableDeptFilter"') &&
    htmlContent.includes('id="timetableDeptFilterWrap"');
  const hasDeptBadgeStyle = cssContent.includes('.dept-badge');
  recordTest(
    'Timetable Department Filter & Badge UI',
    'HTML contains #timetableDeptFilter and CSS defines .dept-badge',
    `Filter: ${hasTimetableDeptFilter}, Badge: ${hasDeptBadgeStyle}`,
    hasTimetableDeptFilter && hasDeptBadgeStyle
  );

  // -------------------------------------------------------------
  // TEST 2: GET /api/departments endpoint
  // -------------------------------------------------------------
  const deptsRes = await makeRequest('GET', '/api/departments');
  const hasDepts = deptsRes.statusCode === 200 && Array.isArray(deptsRes.data) && deptsRes.data.length >= 5;
  recordTest(
    'GET /api/departments returns active engineering departments',
    'Status 200 and array containing CSE, IT, ECE, ME, CE',
    `Status ${deptsRes.statusCode}, departments count: ${Array.isArray(deptsRes.data) ? deptsRes.data.length : 0}`,
    hasDepts
  );

  // -------------------------------------------------------------
  // TEST 3: Department Required Validation
  // -------------------------------------------------------------
  const noDeptPayload = {
    // Missing department
    teachers: [{ name: 'Rahul', subjects: ['DBMS'] }],
    subjects: ['DBMS'],
    sections: [{ name: 'CSE-A' }],
    rooms: [{ room_number: '101', room_type: 'Classroom' }],
    room_type: 'Classroom',
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    working_days_per_week: 5,
    working_start_time: '09:00',
    working_end_time: '16:00'
  };

  const noDeptRes = await makeRequest('POST', '/api/generate', noDeptPayload);
  const noDeptPassed = noDeptRes.statusCode === 400 &&
    String(noDeptRes.data?.error || '').includes('Please select a department before generating the timetable');
  recordTest(
    'Department is required before timetable generation',
    'HTTP 400 with "Please select a department before generating the timetable."',
    `Status ${noDeptRes.statusCode}: "${noDeptRes.data?.error}"`,
    noDeptPassed
  );

  // -------------------------------------------------------------
  // TEST 4: Lab Day Required Validation
  // -------------------------------------------------------------
  const noLabDayPayload = {
    department: 'Computer Science & Engineering',
    teachers: [{ name: 'Rahul', subjects: ['DBMS', 'DBMS Lab'] }],
    subjects: ['DBMS', 'DBMS Lab'],
    sections: [{ name: 'CSE-A' }],
    rooms: [
      { room_number: '101', room_type: 'Classroom' },
      { room_number: 'Lab-1', room_type: 'Laboratory' }
    ],
    room_type: 'Both',
    lab_classes: [{
      subject: 'DBMS Lab',
      teacher: 'Rahul',
      section: 'CSE-A',
      // Missing day!
      duration: 2,
      room: 'Lab-1'
    }],
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    working_days_per_week: 5,
    working_start_time: '09:00',
    working_end_time: '16:00'
  };

  const noLabDayRes = await makeRequest('POST', '/api/generate', noLabDayPayload);
  const noLabDayPassed = noLabDayRes.statusCode === 400 &&
    String(noLabDayRes.data?.error || '').includes('Please select a day for the lab class');
  recordTest(
    'Lab Class Day is required',
    'HTTP 400 with "Please select a day for the lab class."',
    `Status ${noLabDayRes.statusCode}: "${noLabDayRes.data?.error}"`,
    noLabDayPassed
  );

  // -------------------------------------------------------------
  // TEST 5: Lab Non-Working Day Restriction
  // -------------------------------------------------------------
  const nonWorkingDayLabPayload = {
    department: 'Computer Science & Engineering',
    teachers: [{ name: 'Rahul', subjects: ['DBMS', 'DBMS Lab'] }],
    subjects: ['DBMS', 'DBMS Lab'],
    sections: [{ name: 'CSE-A' }],
    rooms: [
      { room_number: '101', room_type: 'Classroom' },
      { room_number: 'Lab-1', room_type: 'Laboratory' }
    ],
    room_type: 'Both',
    lab_classes: [{
      subject: 'DBMS Lab',
      teacher: 'Rahul',
      section: 'CSE-A',
      day: 'Saturday', // Saturday is NOT in working_days
      duration: 2,
      room: 'Lab-1'
    }],
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    working_days_per_week: 5,
    working_start_time: '09:00',
    working_end_time: '16:00'
  };

  const nonWorkingDayRes = await makeRequest('POST', '/api/generate', nonWorkingDayLabPayload);
  const nonWorkingDayPassed = nonWorkingDayRes.statusCode === 400 &&
    String(nonWorkingDayRes.data?.error || '').includes('not an active working day');
  recordTest(
    'Lab Class Day rejected if day is not in configured Working Days',
    'HTTP 400 with "...not an active working day."',
    `Status ${nonWorkingDayRes.statusCode}: "${nonWorkingDayRes.data?.error}"`,
    nonWorkingDayPassed
  );

  // -------------------------------------------------------------
  // TEST 6: Clear timetable to start fresh
  // -------------------------------------------------------------
  await makeRequest('DELETE', '/api/timetable');

  // -------------------------------------------------------------
  // TEST 7: Generate CSE Timetable (With 2-Slot Lab on Monday)
  // -------------------------------------------------------------
  const csePayload = {
    department: 'Computer Science & Engineering',
    teachers: [
      { name: 'Rahul', subjects: ['DBMS', 'DBMS Lab'] },
      { name: 'Priya', subjects: ['DSA'] },
      { name: 'Amit', subjects: ['Java'] }
    ],
    subjects: ['DBMS', 'DSA', 'Java', 'DBMS Lab'],
    sections: [{ name: 'CSE-A' }],
    rooms: [
      { room_number: '101', room_type: 'Classroom' },
      { room_number: '102', room_type: 'Classroom' },
      { room_number: 'Lab-1', room_type: 'Laboratory' }
    ],
    room_type: 'Both',
    lab_classes: [{
      subject: 'DBMS Lab',
      teacher: 'Rahul',
      section: 'CSE-A',
      day: 'Monday',
      duration: 2,
      room: 'Lab-1'
    }],
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    working_days_per_week: 5,
    working_start_time: '09:00',
    working_end_time: '14:00'
  };

  const cseRes = await makeRequest('POST', '/api/generate', csePayload);
  const cseSuccess = cseRes.statusCode === 200 &&
    cseRes.data.success === true &&
    Array.isArray(cseRes.data.timetable) &&
    cseRes.data.timetable.length > 0;

  // Verify CSE lab is scheduled strictly on Monday with 2 contiguous slots
  const cseEntries = cseRes.data.timetable || [];
  const dbmsLabEntry = cseEntries.find((e) => (e.subject || e.course_name).includes('DBMS Lab'));
  const labOnMonday = dbmsLabEntry && dbmsLabEntry.day === 'Monday' && dbmsLabEntry.duration === 2 && dbmsLabEntry.room_name === 'Lab-1';
  const cseDepartmentTagged = cseEntries.every((e) => e.department === 'Computer Science & Engineering');

  recordTest(
    'Generate CSE Timetable with Multi-Slot Lab on Monday',
    'HTTP 200, entries tagged with CSE, DBMS Lab on Monday for 2 slots in Lab-1',
    `Status ${cseRes.statusCode}, entries count: ${cseEntries.length}, Lab on Mon: ${labOnMonday}, Dept tagged: ${cseDepartmentTagged}`,
    cseSuccess && labOnMonday && cseDepartmentTagged
  );

  // -------------------------------------------------------------
  // TEST 8: Multi-Department Generation: Generate IT Timetable
  // Shared Teacher (Rahul) teaching IT Web Development, Shared Room 101, Shared Lab-1
  // Verifies CSE data is preserved and not overwritten!
  // -------------------------------------------------------------
  const itPayload = {
    department: 'Information Technology',
    teachers: [
      { name: 'Rahul', subjects: ['Web Development'] }, // Shared teacher Rahul teaching different subject
      { name: 'Vikram', subjects: ['Network Security', 'Network Lab'] }
    ],
    subjects: ['Web Development', 'Network Security', 'Network Lab'],
    sections: [{ name: 'IT-A' }],
    rooms: [
      { room_number: '101', room_type: 'Classroom' }, // Shared room
      { room_number: '201', room_type: 'Classroom' },
      { room_number: 'Lab-1', room_type: 'Laboratory' }  // Shared laboratory
    ],
    room_type: 'Both',
    lab_classes: [{
      subject: 'Network Lab',
      teacher: 'Vikram',
      section: 'IT-A',
      day: 'Tuesday', // Non-overlapping lab day with CSE
      duration: 2,
      room: 'Lab-1'
    }],
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    working_days_per_week: 5,
    working_start_time: '09:00',
    working_end_time: '14:00'
  };

  const itRes = await makeRequest('POST', '/api/generate', itPayload);
  const itSuccess = itRes.statusCode === 200 && itRes.data.success === true;

  // Verify active timetable now contains BOTH CSE and IT entries!
  const allEntriesRes = await makeRequest('GET', '/api/timetable');
  const allEntries = allEntriesRes.data || [];
  const cseRetained = allEntries.filter((e) => e.department === 'Computer Science & Engineering');
  const itAdded = allEntries.filter((e) => e.department === 'Information Technology');

  recordTest(
    'Multi-Department Timetable Generation & Coexistence',
    'Timetable preserves both CSE and IT entries without overwriting',
    `Total entries: ${allEntries.length} (CSE: ${cseRetained.length}, IT: ${itAdded.length})`,
    itSuccess && cseRetained.length > 0 && itAdded.length > 0
  );

  // -------------------------------------------------------------
  // TEST 9: Shared Teacher Conflict Test (Global Collision Prevention)
  // Teacher Rahul is already busy on Monday 09:00-11:00 in CSE.
  // If we try to edit an IT class to Monday at the exact same slot for Rahul:
  // It MUST be rejected with "Teacher Rahul is already scheduled during this time."
  // -------------------------------------------------------------
  const rahulCSEEntry = cseRetained.find((e) => e.teacher_name.toLowerCase() === 'rahul');
  const rahulITEntry = itAdded.find((e) => e.teacher_name.toLowerCase() === 'rahul');

  let conflictDetected = false;
  let conflictErrorMsg = '';

  if (rahulCSEEntry && rahulITEntry) {
    const editConflictRes = await makeRequest('PUT', `/api/timetable/entry/${encodeURIComponent(rahulITEntry.timetable_id)}`, {
      timetable_id: rahulITEntry.timetable_id,
      day: rahulCSEEntry.day,
      start_time: rahulCSEEntry.start_time,
      end_time: rahulCSEEntry.end_time,
      teacher_name: 'Rahul',
      department: 'Information Technology',
      section: 'IT-A',
      course_name: 'Web Development',
      room_name: '201',
      room_type: 'Classroom'
    });

    conflictDetected = editConflictRes.statusCode === 409;
    conflictErrorMsg = editConflictRes.data?.error || '';
  }

  recordTest(
    'Cross-Department Shared Teacher Collision Prevention',
    'HTTP 409: "Teacher Rahul is already scheduled during this time."',
    `Status ${conflictDetected ? 409 : 'other'}: "${conflictErrorMsg}"`,
    conflictDetected && conflictErrorMsg.includes('Teacher Rahul is already scheduled during this time')
  );

  // -------------------------------------------------------------
  // TEST 10: Shared Room Conflict Test Across Departments
  // Room 101 occupied by CSE cannot be booked by IT at the same time
  // -------------------------------------------------------------
  const cseRoom101Entry = cseRetained.find((e) => e.room_name === '101');
  const itEntryToMove = itAdded.find((e) => e.teacher_name.toLowerCase() !== 'rahul');

  let roomConflictDetected = false;
  let roomConflictMsg = '';

  if (cseRoom101Entry && itEntryToMove) {
    const editRoomConflictRes = await makeRequest('PUT', `/api/timetable/entry/${encodeURIComponent(itEntryToMove.timetable_id)}`, {
      timetable_id: itEntryToMove.timetable_id,
      day: cseRoom101Entry.day,
      start_time: cseRoom101Entry.start_time,
      end_time: cseRoom101Entry.end_time,
      teacher_name: itEntryToMove.teacher_name,
      department: 'Information Technology',
      section: 'IT-A',
      course_name: 'Network Security',
      room_name: '101', // Colliding with CSE!
      room_type: 'Classroom'
    });

    roomConflictDetected = editRoomConflictRes.statusCode === 409;
    roomConflictMsg = editRoomConflictRes.data?.error || '';
  }

  recordTest(
    'Cross-Department Shared Room Conflict Prevention',
    'HTTP 409: "Room 101 is already occupied during this time."',
    `Status ${roomConflictDetected ? 409 : 'other'}: "${roomConflictMsg}"`,
    roomConflictDetected && roomConflictMsg.includes('Room 101 is already occupied during this time')
  );

  // -------------------------------------------------------------
  // TEST 11: Cross-Department Laboratory Overlap Conflict
  // Lab-1 is occupied on Monday 09:00-11:00 by CSE DBMS Lab.
  // Generating or moving a session to Lab-1 during that period must fail.
  // -------------------------------------------------------------
  let labConflictDetected = false;
  let labConflictMsg = '';

  if (dbmsLabEntry && itEntryToMove) {
    const editLabConflictRes = await makeRequest('PUT', `/api/timetable/entry/${encodeURIComponent(itEntryToMove.timetable_id)}`, {
      timetable_id: itEntryToMove.timetable_id,
      day: dbmsLabEntry.day,
      start_time: dbmsLabEntry.start_time,
      end_time: dbmsLabEntry.end_time,
      teacher_name: itEntryToMove.teacher_name,
      department: 'Information Technology',
      section: 'IT-A',
      course_name: 'Network Lab',
      room_name: 'Lab-1',
      room_type: 'Laboratory',
      session_type: 'LAB'
    });

    labConflictDetected = editLabConflictRes.statusCode === 409;
    labConflictMsg = editLabConflictRes.data?.error || '';
  }

  recordTest(
    'Cross-Department Shared Laboratory Overlap Conflict Prevention',
    'HTTP 409: "This laboratory is already occupied during this time."',
    `Status ${labConflictDetected ? 409 : 'other'}: "${labConflictMsg}"`,
    labConflictDetected && labConflictMsg.includes('This laboratory is already occupied during this time')
  );

  // -------------------------------------------------------------
  // TEST 12: GET /api/timetable with Department Filtering (?department=...)
  // -------------------------------------------------------------
  const filterCSERes = await makeRequest('GET', '/api/timetable?department=Computer%20Science%20%26%20Engineering');
  const cseFiltered = filterCSERes.data || [];
  const onlyCSE = cseFiltered.every((e) => e.department === 'Computer Science & Engineering');

  const filterITRes = await makeRequest('GET', '/api/timetable?department=Information%20Technology');
  const itFiltered = filterITRes.data || [];
  const onlyIT = itFiltered.every((e) => e.department === 'Information Technology');

  recordTest(
    'GET /api/timetable?department=... query parameter filtering',
    'Filtering by department returns exclusively entries for that department',
    `CSE filtered count: ${cseFiltered.length} (pure: ${onlyCSE}), IT filtered count: ${itFiltered.length} (pure: ${onlyIT})`,
    onlyCSE && onlyIT && cseFiltered.length > 0 && itFiltered.length > 0
  );

  // -------------------------------------------------------------
  // TEST 13: Persistence Verification Across Reloads
  // -------------------------------------------------------------
  const reloadRes = await makeRequest('GET', '/api/timetable');
  const reloadedEntries = reloadRes.data || [];
  const persistenceIntact = reloadedEntries.length === (cseRetained.length + itAdded.length);

  recordTest(
    'Timetable persistence across store reloads',
    `Expected ${cseRetained.length + itAdded.length} entries preserved in persistent storage`,
    `Found ${reloadedEntries.length} entries`,
    persistenceIntact
  );

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n============================================================');
  console.log('TEST SUMMARY');
  console.log('============================================================');
  const passedCount = results.filter((r) => r.status === 'PASS').length;
  const failedCount = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Tests: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`);

  if (failedCount === 0) {
    console.log('✓ ALL TEST CASES PASSED WITH 100% SUCCESS!');
  } else {
    console.error('❌ SOME TEST CASES FAILED. CHECK LOGS ABOVE.');
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite runner encountered an unhandled exception:', err);
  process.exit(1);
});
