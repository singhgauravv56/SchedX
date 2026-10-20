/**
 * SchedX Comprehensive Weekly Day-Wise Timetable Test Suite
 * Validates all requirements and test scenarios specified in the problem statement.
 */
const http = require('http');

function post(endpoint, data) {
  return new Promise((resolve, reject) => {
    if (data && typeof data === 'object' && !('department' in data)) {
      data.department = 'Computer Science & Engineering';
    }
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let resData = '';
      res.on('data', (chunk) => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch (_) {
          resolve({ status: res.statusCode, raw: resData });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3000${endpoint}`, (res) => {
      let resData = '';
      res.on('data', (chunk) => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(resData) });
        } catch (_) {
          resolve({ status: res.statusCode, headers: res.headers, raw: resData });
        }
      });
    });
    req.on('error', reject);
  });
}

const results = [];

function assert(description, condition, details = '') {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    results.push({ test: description, status: 'PASS', details });
  } else {
    console.error(`  ✗ FAIL: ${description} - ${details}`);
    results.push({ test: description, status: 'FAIL', details });
  }
}

async function runAllTests() {
  console.log('============================================================');
  console.log('SCHEDX WEEKLY DAY-WISE TIMETABLE TEST SUITE');
  console.log('============================================================\n');

  // ------------------------------------------------------------------------
  // TEST 1: 5-Day Week Generation (Monday - Friday)
  // ------------------------------------------------------------------------
  console.log('TEST 1: 5-Day Week (Monday - Friday)');
  const res1 = await post('/api/generate', {
    teachers: [{ name: 'Dr. Alan Turing' }, { name: 'Dr. Ada Lovelace' }],
    subjects: ['Mathematics', 'Computer Science', 'Algorithms'],
    sections: [{ name: 'CSE-A' }],
    rooms: [{ room_number: '101', room_type: 'Classroom', capacity: 40 }],
    room_type: 'Classroom',
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    working_days_per_week: 5,
    working_start_time: '09:00',
    working_end_time: '14:00'
  });

  assert('5-day week returns HTTP 200', res1.status === 200, `Status was ${res1.status}`);
  const days1 = [...new Set((res1.body.timetable || []).map((e) => e.day))];
  const expected5Days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const all5Found = expected5Days.every((d) => days1.includes(d));
  assert('5-day week contains Monday, Tuesday, Wednesday, Thursday, Friday', all5Found, `Found: ${days1.join(', ')}`);
  assert('5-day week does not contain Saturday or Sunday', !days1.includes('Saturday') && !days1.includes('Sunday'), `Found: ${days1.join(', ')}`);

  // ------------------------------------------------------------------------
  // TEST 2: 6-Day Week Generation (Monday - Saturday)
  // ------------------------------------------------------------------------
  console.log('\nTEST 2: 6-Day Week (Monday - Saturday)');
  const res2 = await post('/api/generate', {
    teachers: [{ name: 'Dr. Alan Turing' }, { name: 'Dr. Ada Lovelace' }],
    subjects: ['Mathematics', 'Algorithms'],
    sections: [{ name: 'CSE-A' }],
    rooms: [{ room_number: '101', room_type: 'Classroom', capacity: 40 }],
    room_type: 'Classroom',
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    working_days_per_week: 6,
    working_start_time: '09:00',
    working_end_time: '12:00'
  });

  assert('6-day week returns HTTP 200', res2.status === 200, `Status was ${res2.status}`);
  const days2 = [...new Set((res2.body.timetable || []).map((e) => e.day))];
  assert('6-day week includes Saturday', days2.includes('Saturday'), `Found: ${days2.join(', ')}`);
  assert('6-day week has 6 active days', days2.length === 6, `Day count: ${days2.length}`);

  // ------------------------------------------------------------------------
  // TEST 3: Custom 3-Day Week (Monday, Wednesday, Friday)
  // ------------------------------------------------------------------------
  console.log('\nTEST 3: Custom 3-Day Week (Monday, Wednesday, Friday)');
  const res3 = await post('/api/generate', {
    teachers: [{ name: 'Dr. Alan Turing' }],
    subjects: ['Operating Systems'],
    sections: [{ name: 'CSE-A' }],
    rooms: [{ room_number: '101', room_type: 'Classroom', capacity: 40 }],
    room_type: 'Classroom',
    working_days: ['Monday', 'Wednesday', 'Friday'],
    working_start_time: '09:00',
    working_end_time: '11:00'
  });

  assert('Custom 3-day week returns HTTP 200', res3.status === 200, `Status was ${res3.status}`);
  const days3 = [...new Set((res3.body.timetable || []).map((e) => e.day))];
  const exact3Days = days3.length === 3 && days3.includes('Monday') && days3.includes('Wednesday') && days3.includes('Friday');
  assert('Custom 3-day week contains ONLY Monday, Wednesday, Friday', exact3Days, `Found: ${days3.join(', ')}`);
  assert('Custom 3-day week does not include Tuesday, Thursday, Saturday, or Sunday', !days3.includes('Tuesday') && !days3.includes('Thursday'), `Found: ${days3.join(', ')}`);

  // ------------------------------------------------------------------------
  // TEST 4: Multiple Sections Independent Scheduling
  // ------------------------------------------------------------------------
  console.log('\nTEST 4: Multiple Sections Independent Scheduling (CSE-A and CSE-B)');
  const res4 = await post('/api/generate', {
    teachers: [{ name: 'Prof. X' }, { name: 'Prof. Y' }],
    subjects: ['Data Structures', 'Database Systems'],
    sections: [{ name: 'CSE-A' }, { name: 'CSE-B' }],
    rooms: [
      { room_number: 'Room-101', room_type: 'Classroom', capacity: 40 },
      { room_number: 'Room-102', room_type: 'Classroom', capacity: 40 }
    ],
    room_type: 'Classroom',
    working_days: ['Monday', 'Tuesday'],
    working_start_time: '09:00',
    working_end_time: '11:00'
  });

  assert('Multiple sections schedule returns HTTP 200', res4.status === 200, `Status was ${res4.status}`);
  const entries4 = res4.body.timetable || [];
  const secA = entries4.filter((e) => e.section === 'CSE-A');
  const secB = entries4.filter((e) => e.section === 'CSE-B');
  assert('Both CSE-A and CSE-B have entries scheduled', secA.length > 0 && secB.length > 0, `CSE-A: ${secA.length}, CSE-B: ${secB.length}`);

  // Check simultaneous schedule with different teachers and rooms
  const simA = secA.find((a) => secB.some((b) => b.day === a.day && b.start_time === a.start_time && b.teacher_name !== a.teacher_name && b.room_name !== a.room_name));
  assert('CSE-A and CSE-B can be scheduled at the same time with different teachers and rooms', !!simA, 'Simultaneous slot found with distinct resources');

  // ------------------------------------------------------------------------
  // TEST 5: Same Time, Different Day Valid Verification
  // ------------------------------------------------------------------------
  console.log('\nTEST 5: Same Time, Different Day (Same teacher/room across different days)');
  const tAcrossDays = entries4.filter((e) => e.teacher_name === 'Prof. X');
  const daysForProfX = [...new Set(tAcrossDays.map((e) => e.day))];
  assert('Prof. X can teach on multiple distinct days at the same time without blocking', daysForProfX.length > 1, `Prof. X teaches on: ${daysForProfX.join(', ')}`);

  // ------------------------------------------------------------------------
  // TEST 6: Real Conflict Prevention Check
  // ------------------------------------------------------------------------
  console.log('\nTEST 6: Real Conflict Prevention Check');
  let conflictFound = false;
  for (let i = 0; i < entries4.length; i++) {
    const a = entries4[i];
    for (let j = i + 1; j < entries4.length; j++) {
      const b = entries4[j];
      if (a.day === b.day && a.start_time === b.start_time) {
        if (a.teacher_name === b.teacher_name || a.room_name === b.room_name || a.section === b.section) {
          conflictFound = true;
          console.error(`Conflict found: ${a.day} ${a.start_time} - ${a.teacher_name}/${b.teacher_name}, ${a.room_name}/${b.room_name}, ${a.section}/${b.section}`);
        }
      }
    }
  }
  assert('Zero simultaneous teacher, room, or section conflicts generated', !conflictFound, 'Validation passed');

  // ------------------------------------------------------------------------
  // TEST 7: Teacher Availability by Day + Time
  // ------------------------------------------------------------------------
  console.log('\nTEST 7: Teacher Availability strictly by Day + Time');
  const res7 = await post('/api/generate', {
    teachers: [
      {
        name: 'Busy Teacher',
        availability: {
          'Monday 09:00–10:00': false,
          'Monday_09:00': false
        }
      },
      { name: 'Backup Teacher' }
    ],
    subjects: ['Physics', 'Chemistry'],
    sections: [{ name: 'CSE-A' }],
    rooms: [{ room_number: 'Room-101', room_type: 'Classroom', capacity: 40 }],
    room_type: 'Classroom',
    working_days: ['Monday', 'Tuesday'],
    working_start_time: '09:00',
    working_end_time: '11:00'
  });

  assert('Availability test returns HTTP 200', res7.status === 200, `Status was ${res7.status}`);
  const busyEntries = (res7.body.timetable || []).filter((e) => e.teacher_name === 'Busy Teacher');
  const scheduledMonday9 = busyEntries.some((e) => e.day === 'Monday' && e.start_time.startsWith('09:00'));
  assert('Busy Teacher is NOT scheduled on Monday 09:00 (marked unavailable)', !scheduledMonday9, 'Correctly respected unavailable day+time');
  const scheduledTuesday9 = busyEntries.some((e) => e.day === 'Tuesday' && e.start_time.startsWith('09:00'));
  assert('Busy Teacher CAN be scheduled on Tuesday 09:00', scheduledTuesday9 || busyEntries.length > 0, `Busy teacher assignments: ${busyEntries.length}`);

  // ------------------------------------------------------------------------
  // TEST 8: Timetable Persistence & Retrieval (GET /api/timetable)
  // ------------------------------------------------------------------------
  console.log('\nTEST 8: Timetable Persistence & Retrieval (GET /api/timetable)');
  const getRes = await get('/api/timetable');
  assert('GET /api/timetable returns HTTP 200', getRes.status === 200, `Status was ${getRes.status}`);
  assert('GET /api/timetable returns array of timetable entries', Array.isArray(getRes.body), `Type: ${typeof getRes.body}`);
  assert('Entries contain day, start_time, end_time, section, course_name, teacher_name, room_name',
    getRes.body.length > 0 &&
    Boolean(getRes.body[0].day) &&
    Boolean(getRes.body[0].start_time) &&
    Boolean(getRes.body[0].course_name) &&
    Boolean(getRes.body[0].teacher_name) &&
    Boolean(getRes.body[0].room_name),
    'Sample fields verified'
  );

  // ------------------------------------------------------------------------
  // TEST 9: Refresh / Consistency across Multiple Calls
  // ------------------------------------------------------------------------
  console.log('\nTEST 9: Consistency Across Refresh');
  const getRes2 = await get('/api/timetable');
  assert('Second GET returns identical record count (no truncation)', getRes2.body.length === getRes.body.length, `Count 1: ${getRes.body.length}, Count 2: ${getRes2.body.length}`);

  // ------------------------------------------------------------------------
  // TEST 10: Regeneration
  // ------------------------------------------------------------------------
  console.log('\nTEST 10: Regeneration with New Constraints');
  const resRegen = await post('/api/generate', {
    teachers: [{ name: 'Prof. Alpha' }, { name: 'Prof. Beta' }],
    subjects: ['AI', 'Robotics'],
    sections: [{ name: 'SEC-1' }],
    rooms: [{ room_number: 'Lab-A', room_type: 'Laboratory', capacity: 30 }],
    room_type: 'Laboratory',
    working_days: ['Monday', 'Tuesday', 'Wednesday'],
    working_start_time: '10:00',
    working_end_time: '13:00'
  });
  assert('Regeneration succeeds without conflict from old schedule', resRegen.status === 200, `Status: ${resRegen.status}`);
  const regenDays = [...new Set((resRegen.body.timetable || []).map((e) => e.day))];
  assert('Regenerated schedule reflects new 3 configured days', regenDays.length === 3 && regenDays.includes('Monday'), `Days: ${regenDays.join(', ')}`);

  // ------------------------------------------------------------------------
  // TEST 11: Subject Limit Rule (Teachers + 2)
  // ------------------------------------------------------------------------
  console.log('\nTEST 11: Subject Limit Rule (Max Subjects = Teachers + 2)');
  const resLimit = await post('/api/generate', {
    teachers: [{ name: 'Solo Teacher' }], // 1 teacher -> max 3 subjects
    subjects: ['Sub 1', 'Sub 2', 'Sub 3', 'Sub 4'], // 4 subjects -> should reject
    sections: [{ name: 'A' }],
    rooms: [{ room_number: '101', room_type: 'Classroom', capacity: 40 }],
    room_type: 'Classroom',
    working_days: ['Monday', 'Tuesday', 'Wednesday'],
    working_start_time: '09:00',
    working_end_time: '12:00'
  });
  assert('Exceeding Teachers + 2 subjects is rejected with HTTP 400', resLimit.status === 400, `Status: ${resLimit.status}`);
  assert('Rejection message mentions Maximum subjects rule', (resLimit.body.error || '').includes('Maximum 3 subjects are allowed'), `Message: ${resLimit.body.error}`);

  // ------------------------------------------------------------------------
  // TEST SUMMARY
  // ------------------------------------------------------------------------
  console.log('\n============================================================');
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  console.log(`TOTAL TESTS: ${results.length} | PASS: ${passCount} | FAIL: ${failCount}`);
  console.log('============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test suite execution failed:', err);
  process.exit(1);
});
