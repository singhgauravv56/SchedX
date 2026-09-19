/**
 * Automated Verification Suite for SchedX Section, Room & Day-wise Timetable
 */

const http = require('http');

function post(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (_) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function get(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'GET'
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (_) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function verifyNoConflicts(timetable) {
  const teacherSlots = new Set();
  const sectionSlots = new Set();
  const roomSlots = new Set();

  for (const entry of timetable) {
    const tKey = `${entry.day_of_week}_${entry.start_time}_${entry.teacher_id}`;
    if (teacherSlots.has(tKey)) {
      return { conflict: true, type: 'Teacher', entry };
    }
    teacherSlots.add(tKey);

    const sKey = `${entry.day_of_week}_${entry.start_time}_${(entry.section || '').toLowerCase()}`;
    if (sectionSlots.has(sKey)) {
      return { conflict: true, type: 'Section', entry };
    }
    sectionSlots.add(sKey);

    const rKey = `${entry.day_of_week}_${entry.start_time}_${(entry.room_name || '').toLowerCase()}`;
    if (roomSlots.has(rKey)) {
      return { conflict: true, type: 'Room', entry };
    }
    roomSlots.add(rKey);
  }

  return { conflict: false };
}

async function runTests() {
  console.log('========================================================');
  console.log('   SCHEDX TEST SCENARIO VERIFICATION SUITE');
  console.log('========================================================\n');

  const results = [];

  // TEST 1: Health check
  try {
    const hRes = await get('/api/health');
    const pass = hRes.status === 200 && hRes.body.status === 'ok';
    results.push({ test: 'Health Check', pass, details: `Status: ${hRes.status}` });
  } catch (err) {
    results.push({ test: 'Health Check', pass: false, details: err.message });
  }

  // TEST SCENARIO 1 — BASIC (2 Teachers, 2 Subjects, CSE-A, Room 101 Classroom)
  try {
    const payload = {
      teachers: [{ name: 'Dr. Turing' }, { name: 'Prof. Lovelace' }],
      subjects: ['Discrete Mathematics', 'Computer Architecture'],
      sections: [{ name: 'CSE-A' }],
      rooms: [{ room_number: '101', room_type: 'Classroom' }],
      room_type: 'Classroom',
      working_days_per_week: 5,
      working_start_time: '09:00',
      working_end_time: '16:00'
    };
    const res = await post('/api/generate', payload);
    const conflictCheck = verifyNoConflicts(res.body.timetable || []);
    const pass = res.status === 200 && res.body.success && res.body.timetable.length > 0 && !conflictCheck.conflict;
    results.push({
      test: 'Scenario 1: Basic Generation (2T, 2S, 1Sec, 1Room)',
      pass,
      details: `HTTP ${res.status}, scheduled ${res.body.entries_created || 0} periods, 0 conflicts`
    });
  } catch (err) {
    results.push({ test: 'Scenario 1: Basic Generation', pass: false, details: err.message });
  }

  // TEST SCENARIO 2 — MULTIPLE SECTIONS (3 Teachers, 5 Subjects, CSE-A & CSE-B, 3 Rooms)
  try {
    const payload = {
      teachers: [{ name: 'Dr. Turing' }, { name: 'Prof. Lovelace' }, { name: 'Dr. Knuth' }],
      subjects: ['Operating Systems', 'Algorithms', 'Data Structures', 'Database Systems', 'Computer Networks'],
      sections: [{ name: 'CSE-A' }, { name: 'CSE-B' }],
      rooms: [
        { room_number: '101', room_type: 'Classroom' },
        { room_number: '102', room_type: 'Classroom' },
        { room_number: '103', room_type: 'Classroom' }
      ],
      room_type: 'Classroom',
      working_days_per_week: 5,
      working_start_time: '09:00',
      working_end_time: '16:00'
    };
    const res = await post('/api/generate', payload);
    const conflictCheck = verifyNoConflicts(res.body.timetable || []);
    const pass = res.status === 200 && res.body.success && res.body.timetable.length > 0 && !conflictCheck.conflict;
    results.push({
      test: 'Scenario 2: Multiple Sections (3T, 5S, 2Sec, 3Rooms)',
      pass,
      details: `HTTP ${res.status}, scheduled ${res.body.entries_created || 0} periods across 2 sections, 0 conflicts`
    });
  } catch (err) {
    results.push({ test: 'Scenario 2: Multiple Sections', pass: false, details: err.message });
  }

  // TEST SCENARIO 3 — MAXIMUM SUBJECT RULE (3 Teachers => Max 5 Subjects)
  // Boundary: 5 subjects should pass; 6 subjects should fail with 400
  try {
    const payloadPass = {
      teachers: [{ name: 'Dr. Turing' }, { name: 'Prof. Lovelace' }, { name: 'Dr. Knuth' }],
      subjects: ['S1', 'S2', 'S3', 'S4', 'S5'],
      sections: [{ name: 'CSE-A' }],
      rooms: [{ room_number: '101', room_type: 'Classroom' }],
      room_type: 'Classroom',
      working_days_per_week: 5
    };
    const resPass = await post('/api/generate', payloadPass);

    const payloadFail = {
      teachers: [{ name: 'Dr. Turing' }, { name: 'Prof. Lovelace' }, { name: 'Dr. Knuth' }],
      subjects: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
      sections: [{ name: 'CSE-A' }],
      rooms: [{ room_number: '101', room_type: 'Classroom' }],
      room_type: 'Classroom',
      working_days_per_week: 5
    };
    const resFail = await post('/api/generate', payloadFail);

    const pass = resPass.status === 200 && resFail.status === 400 && resFail.body.error.includes('Maximum 5 subjects');
    results.push({
      test: 'Scenario 3: Maximum Subjects Rule (3 Teachers -> 5 allowed, 6 rejected)',
      pass,
      details: `5 subjects: HTTP ${resPass.status} OK; 6 subjects: HTTP ${resFail.status} "${resFail.body.error}"`
    });
  } catch (err) {
    results.push({ test: 'Scenario 3: Maximum Subjects Rule', pass: false, details: err.message });
  }

  // TEST SCENARIO 4 — ROOM CONFLICT PREVENTION
  // Verify that multiple sections sharing limited rooms are strictly allocated without room collision
  try {
    const payload = {
      teachers: [{ name: 'T1' }, { name: 'T2' }],
      subjects: ['Maths', 'Physics'],
      sections: [{ name: 'Sec-A' }, { name: 'Sec-B' }],
      rooms: [{ room_number: 'Single-Room-101', room_type: 'Classroom' }],
      room_type: 'Classroom',
      working_days_per_week: 2,
      working_start_time: '09:00',
      working_end_time: '14:00'
    };
    const res = await post('/api/generate', payload);
    const conflictCheck = verifyNoConflicts(res.body.timetable || []);
    const pass = res.status === 200 && !conflictCheck.conflict;
    results.push({
      test: 'Scenario 4: Room Conflict Prevention with Shared Single Room',
      pass,
      details: `Scheduled ${res.body.entries_created} periods sharing 1 room across 2 sections with 0 room conflicts`
    });
  } catch (err) {
    results.push({ test: 'Scenario 4: Room Conflict Prevention', pass: false, details: err.message });
  }

  // TEST SCENARIO 5 — TEACHER CONFLICT PREVENTION
  // Verify that 1 teacher shared across 2 sections is never double-booked in same time slot
  try {
    const payload = {
      teachers: [{ name: 'Solo Teacher' }],
      subjects: ['Core Course'],
      sections: [{ name: 'Sec-1' }, { name: 'Sec-2' }],
      rooms: [{ room_number: 'R1', room_type: 'Classroom' }, { room_number: 'R2', room_type: 'Classroom' }],
      room_type: 'Classroom',
      working_days_per_week: 3,
      working_start_time: '09:00',
      working_end_time: '12:00'
    };
    const res = await post('/api/generate', payload);
    const conflictCheck = verifyNoConflicts(res.body.timetable || []);
    const pass = res.status === 200 && !conflictCheck.conflict;
    results.push({
      test: 'Scenario 5: Teacher Conflict Prevention with Solo Teacher',
      pass,
      details: `Scheduled ${res.body.entries_created} periods with 0 teacher collisions`
    });
  } catch (err) {
    results.push({ test: 'Scenario 5: Teacher Conflict Prevention', pass: false, details: err.message });
  }

  // TEST SCENARIO 6 — SECTION CONFLICT PREVENTION
  // Verify that a section is never double booked for 2 subjects in same slot
  try {
    const payload = {
      teachers: [{ name: 'T1' }, { name: 'T2' }, { name: 'T3' }],
      subjects: ['S1', 'S2', 'S3'],
      sections: [{ name: 'Cohort-Alpha' }],
      rooms: [{ room_number: 'R1', room_type: 'Classroom' }, { room_number: 'R2', room_type: 'Classroom' }],
      room_type: 'Classroom',
      working_days_per_week: 5,
      working_start_time: '09:00',
      working_end_time: '15:00'
    };
    const res = await post('/api/generate', payload);
    const conflictCheck = verifyNoConflicts(res.body.timetable || []);
    const pass = res.status === 200 && !conflictCheck.conflict;
    results.push({
      test: 'Scenario 6: Section Conflict Prevention',
      pass,
      details: `Scheduled ${res.body.entries_created} periods with 0 section collisions`
    });
  } catch (err) {
    results.push({ test: 'Scenario 6: Section Conflict Prevention', pass: false, details: err.message });
  }

  // TEST SCENARIO 7 — ROOM TYPE FILTERING (Classroom vs Laboratory vs Both)
  try {
    const payloadLab = {
      teachers: [{ name: 'Lab Instructor' }],
      subjects: ['Chemistry Lab'],
      sections: [{ name: 'Chem-A' }],
      rooms: [
        { room_number: 'Theory-101', room_type: 'Classroom' },
        { room_number: 'Lab-Chemistry', room_type: 'Laboratory' }
      ],
      room_type: 'Laboratory',
      working_days_per_week: 2,
      working_start_time: '09:00',
      working_end_time: '12:00'
    };
    const resLab = await post('/api/generate', payloadLab);
    const allLab = (resLab.body.timetable || []).every(e => e.room_type === 'Laboratory');

    const payloadClass = {
      teachers: [{ name: 'Class Instructor' }],
      subjects: ['Theory Class'],
      sections: [{ name: 'Theory-A' }],
      rooms: [
        { room_number: 'Theory-101', room_type: 'Classroom' },
        { room_number: 'Lab-Chemistry', room_type: 'Laboratory' }
      ],
      room_type: 'Classroom',
      working_days_per_week: 2,
      working_start_time: '09:00',
      working_end_time: '12:00'
    };
    const resClass = await post('/api/generate', payloadClass);
    const allClass = (resClass.body.timetable || []).every(e => e.room_type === 'Classroom');

    const pass = resLab.status === 200 && allLab && resClass.status === 200 && allClass;
    results.push({
      test: 'Scenario 7: Room Type Filtering (Classroom & Laboratory Filter)',
      pass,
      details: `Lab filter used only Laboratory rooms (${allLab}); Classroom filter used only Classroom rooms (${allClass})`
    });
  } catch (err) {
    results.push({ test: 'Scenario 7: Room Type Filtering', pass: false, details: err.message });
  }

  // TEST SCENARIO 8 — DAY-WISE CHRONOLOGICAL OUTPUT
  try {
    const tRes = await get('/api/timetable');
    const entries = tRes.body || [];
    let isDayOrdered = true;
    let isTimeOrdered = true;

    for (let i = 0; i < entries.length - 1; i++) {
      const cur = entries[i];
      const nxt = entries[i + 1];
      if (cur.day_of_week > nxt.day_of_week) {
        isDayOrdered = false;
      } else if (cur.day_of_week === nxt.day_of_week) {
        if (String(cur.start_time).localeCompare(String(nxt.start_time)) > 0) {
          isTimeOrdered = false;
        }
      }
    }

    const pass = tRes.status === 200 && entries.length > 0 && isDayOrdered && isTimeOrdered;
    results.push({
      test: 'Scenario 8: Day-Wise & Chronological Sorting',
      pass,
      details: `Days sorted: ${isDayOrdered}, Times sorted chronologically within days: ${isTimeOrdered}`
    });
  } catch (err) {
    results.push({ test: 'Scenario 8: Day-Wise Sorting', pass: false, details: err.message });
  }

  // TEST SCENARIO 9 — PERSISTENCE ACROSS REFRESH
  try {
    const tRes1 = await get('/api/timetable');
    const tRes2 = await get('/api/timetable');
    const pass = tRes1.status === 200 && tRes2.status === 200 &&
                 tRes1.body.length === tRes2.body.length && tRes1.body.length > 0;
    results.push({
      test: 'Scenario 9: Timetable Persistence Across Multiple Requests/Refreshes',
      pass,
      details: `Loaded ${tRes1.body.length} persistent periods consistently on repeated fetches`
    });
  } catch (err) {
    results.push({ test: 'Scenario 9: Persistence', pass: false, details: err.message });
  }

  // TEST SCENARIO 10 — CURRENT CLASS WITH SECTION AND ROOM
  try {
    const ccRes = await get('/api/current-class');
    const pass = ccRes.status === 200 && (ccRes.body.running === false || (ccRes.body.running === true && ccRes.body.section && ccRes.body.room));
    results.push({
      test: 'Scenario 10: Current Class API with Section & Room',
      pass,
      details: `HTTP ${ccRes.status}, running: ${ccRes.body.running}${ccRes.body.running ? `, Section: ${ccRes.body.section}, Room: ${ccRes.body.room}` : ' (No class scheduled right now)'}`
    });
  } catch (err) {
    results.push({ test: 'Scenario 10: Current Class', pass: false, details: err.message });
  }

  // VALIDATION CORNER CASES:
  // Duplicate sections
  try {
    const dupSecRes = await post('/api/generate', {
      teachers: [{ name: 'T1' }],
      subjects: ['S1'],
      sections: [{ name: 'CSE-A' }, { name: 'cse-a' }],
      rooms: [{ room_number: '101', room_type: 'Classroom' }]
    });
    const pass = dupSecRes.status === 400 && dupSecRes.body.error.includes('Section names must be unique');
    results.push({
      test: 'Validation: Duplicate Section Names Rejected',
      pass,
      details: `HTTP ${dupSecRes.status}: "${dupSecRes.body.error}"`
    });
  } catch (err) {
    results.push({ test: 'Validation: Duplicate Sections', pass: false, details: err.message });
  }

  // Duplicate room numbers
  try {
    const dupRoomRes = await post('/api/generate', {
      teachers: [{ name: 'T1' }],
      subjects: ['S1'],
      sections: [{ name: 'CSE-A' }],
      rooms: [
        { room_number: '101', room_type: 'Classroom' },
        { room_number: ' 101 ', room_type: 'Laboratory' }
      ]
    });
    const pass = dupRoomRes.status === 400 && dupRoomRes.body.error.includes('Room numbers must be unique');
    results.push({
      test: 'Validation: Duplicate Room Numbers Rejected',
      pass,
      details: `HTTP ${dupRoomRes.status}: "${dupRoomRes.body.error}"`
    });
  } catch (err) {
    results.push({ test: 'Validation: Duplicate Rooms', pass: false, details: err.message });
  }

  console.log('\n========================================================');
  console.log('                 VERIFICATION RESULTS');
  console.log('========================================================');
  let allPass = true;
  for (const r of results) {
    const icon = r.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon} | ${r.test}`);
    console.log(`        Details: ${r.details}`);
    if (!r.pass) allPass = false;
  }
  console.log('========================================================');
  console.log(allPass ? '🎉 ALL TESTS PASSED SUCCESSFULLY!' : '⚠️ SOME TESTS FAILED.');
  console.log('========================================================\n');

  process.exit(allPass ? 0 : 1);
}

runTests();
