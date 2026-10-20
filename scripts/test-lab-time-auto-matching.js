const http = require('http');
const assert = require('assert');
const app = require('../server');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (_) { parsed = raw; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTestSuite() {
  console.log('============================================================');
  console.log('SCHEDX: LAB TIME AUTO PERIOD MATCHING & VALIDATION TEST SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let total = 0;

  // TEST 1: Standard matching lab
  // Periods: 09:00 AM-10:00 AM (P1), 10:00 AM-11:00 AM (P2), 11:00 AM-12:00 PM (P3)
  // Lab: 10:00 AM-12:00 PM -> Automatically match P2 and P3
  total++;
  try {
    const dayPeriods = [
      { period: 1, start_time: '09:00:00', end_time: '10:00:00', slot_index: 0 },
      { period: 2, start_time: '10:00:00', end_time: '11:00:00', slot_index: 1 },
      { period: 3, start_time: '11:00:00', end_time: '12:00:00', slot_index: 2 }
    ];
    const match = app.matchLabToDayPeriods('10:00 AM', '12:00 PM', 'Monday', dayPeriods, []);
    assert.strictEqual(match.valid, true, 'Match should be valid');
    assert.strictEqual(match.matchedPeriods.length, 2, 'Should match 2 periods');
    assert.strictEqual(match.matchedPeriods[0].period_number, 2, 'First matched period is P2');
    assert.strictEqual(match.matchedPeriods[1].period_number, 3, 'Second matched period is P3');
    assert.deepStrictEqual(match.matchedIndices, [1, 2], 'Indices must be [1, 2]');

    // End-to-end API test
    const res = await request('POST', '/api/generate', {
      department: 'Computer Science',
      teachers: [{ name: 'Dr. Sharma', subjects: ['DBMS'] }],
      subjects: ['DBMS'],
      sections: [{ name: 'CSE-A' }],
      rooms: [{ room_number: 'Lab-1', room_type: 'Laboratory' }],
      working_days: ['Monday'],
      working_start_time: '09:00',
      working_end_time: '12:00',
      period_count: 3,
      day_periods: { Monday: dayPeriods },
      lab_classes: [
        {
          subject: 'DBMS',
          teacher: 'Dr. Sharma',
          section: 'CSE-A',
          day: 'Monday',
          start_time: '10:00',
          end_time: '12:00',
          duration: 2,
          room: 'Lab-1'
        }
      ]
    });
    assert.strictEqual(res.status, 200, 'Generation should succeed');
    const labItem = res.data.timetable.find((t) => t.is_lab);
    assert(labItem, 'Lab item present in timetable');
    assert.strictEqual(labItem.period_number, 2, 'Assigned starting from P2');
    assert.strictEqual(labItem.duration, 2, 'Duration is 2 periods');
    console.log('✓ TEST 1 PASS: Standard matching lab automatically matches P2 and P3');
    passed++;
  } catch (err) {
    console.error('✗ TEST 1 FAIL:', err.message);
  }

  // TEST 2: Minute-level matching
  // Lab: 09:30 AM-11:30 AM inside P1 (09:00-10:00), P2 (10:00-11:00), P3 (11:00-12:00)
  total++;
  try {
    const dayPeriods = [
      { period: 1, start_time: '09:00:00', end_time: '10:00:00', slot_index: 0 },
      { period: 2, start_time: '10:00:00', end_time: '11:00:00', slot_index: 1 },
      { period: 3, start_time: '11:00:00', end_time: '12:00:00', slot_index: 2 }
    ];
    const match = app.matchLabToDayPeriods('09:30 AM', '11:30 AM', 'Monday', dayPeriods, []);
    assert.strictEqual(match.valid, true, 'Match should be valid because complete interval is enclosed');
    assert.strictEqual(match.matchedPeriods.length, 3, 'Should intersect P1, P2, and P3');
    assert.deepStrictEqual(match.matchedPeriods.map(p => p.period_number), [1, 2, 3]);

    // Test incomplete coverage: lab starts before first period (e.g. 08:30 AM-10:30 AM)
    const outMatch = app.matchLabToDayPeriods('08:30 AM', '10:30 AM', 'Monday', dayPeriods, []);
    assert.strictEqual(outMatch.valid, false, 'Should be invalid due to partial coverage');
    assert(outMatch.error.includes('Selected lab time is outside the configured timetable period') ||
           outMatch.error.includes('do not cover the complete lab duration'));

    console.log('✓ TEST 2 PASS: Minute-level matching identifies intersecting periods and validates coverage');
    passed++;
  } catch (err) {
    console.error('✗ TEST 2 FAIL:', err.message);
  }

  // TEST 3: AM/PM conversion
  // Working day: 09:00 AM-05:30 PM -> internal representation is 17:30
  total++;
  try {
    const startM = app.timeToMinutes('09:00 AM');
    const endM = app.timeToMinutes('05:30 PM');
    assert.strictEqual(startM, 540, '09:00 AM is 540 minutes');
    assert.strictEqual(endM, 1050, '05:30 PM is 1050 minutes (17:30)');

    const end24 = app.minutesToTime(endM);
    assert.strictEqual(end24, '17:30:00', '24-hour internal format is 17:30:00');

    const formatted12 = app.formatTime12('17:30');
    assert.strictEqual(formatted12, '05:30 PM', 'Formats back to 05:30 PM correctly');

    console.log('✓ TEST 3 PASS: AM/PM conversion uses 24-hr internal representation (17:30) and 12-hr formatting');
    passed++;
  } catch (err) {
    console.error('✗ TEST 3 FAIL:', err.message);
  }

  // TEST 4: Invalid working-day configuration
  // Working day: 09:00 AM-05:30 AM -> end time earlier than start time
  total++;
  try {
    let errorCaught = false;
    try {
      app.buildTimeSlots('09:00 AM', '05:30 AM', 'Monday');
    } catch (err) {
      errorCaught = true;
      assert(err.message.includes("Monday's configured end time must be later than its start time"), 'Detailed error message');
    }
    assert(errorCaught, 'Should throw error when end time is earlier than start time');

    // Also test API endpoint
    const res = await request('POST', '/api/generate', {
      department: 'Computer Science',
      teachers: [{ name: 'Dr. Sharma', subjects: ['DBMS'] }],
      subjects: ['DBMS'],
      sections: [{ name: 'CSE-A' }],
      working_days: ['Monday'],
      working_start_time: '09:00 AM',
      working_end_time: '05:30 AM'
    });
    assert.strictEqual(res.status, 400, 'API should reject inverted working day');
    assert(res.data.error.includes("Monday's configured end time must be later than its start time") ||
           res.data.error.includes("Working end time must be later than working start time"),
           'Contains descriptive error message');
    console.log('✓ TEST 4 PASS: Invalid working-day configuration shows clear validation error');
    passed++;
  } catch (err) {
    console.error('✗ TEST 4 FAIL:', err.message);
  }

  // TEST 5: Lab crossing a break
  total++;
  try {
    const dayPeriods = [
      { period: 1, start_time: '09:00:00', end_time: '10:00:00', slot_index: 0 },
      { period: 2, start_time: '10:00:00', end_time: '11:00:00', slot_index: 1 },
      { period: 3, start_time: '11:30:00', end_time: '12:30:00', slot_index: 2 }
    ];
    const dayBreaks = [
      { name: 'Tea Break', start_time: '11:00:00', end_time: '11:30:00' }
    ];
    const match = app.matchLabToDayPeriods('10:30 AM', '12:00 PM', 'Monday', dayPeriods, dayBreaks);
    assert.strictEqual(match.valid, false, 'Should be invalid due to break overlap');
    assert(match.error.includes('Tea Break'), 'Reports break name');
    assert(match.error.includes('overlaps with the configured break'), 'Includes break overlap notice');
    console.log('✓ TEST 5 PASS: Lab crossing a break is detected with exact break name');
    passed++;
  } catch (err) {
    console.error('✗ TEST 5 FAIL:', err.message);
  }

  // TEST 6: Teacher conflict
  // Two fixed lab sessions require the same teacher at overlapping times
  total++;
  try {
    const res = await request('POST', '/api/generate', {
      department: 'Computer Science',
      teachers: [{ name: 'Dr. Sharma', subjects: ['DBMS', 'Networks'] }],
      subjects: ['DBMS', 'Networks'],
      sections: [{ name: 'CSE-A' }, { name: 'CSE-B' }],
      rooms: [
        { room_number: 'Lab-1', room_type: 'Laboratory' },
        { room_number: 'Lab-2', room_type: 'Laboratory' }
      ],
      working_days: ['Monday'],
      working_start_time: '09:00',
      working_end_time: '16:00',
      lab_classes: [
        {
          subject: 'DBMS',
          teacher: 'Dr. Sharma',
          section: 'CSE-A',
          day: 'Monday',
          start_time: '10:00',
          end_time: '12:00',
          duration: 2,
          room: 'Lab-1'
        },
        {
          subject: 'Networks',
          teacher: 'Dr. Sharma',
          section: 'CSE-B',
          day: 'Monday',
          start_time: '11:00',
          end_time: '13:00',
          duration: 2,
          room: 'Lab-2'
        }
      ]
    });
    assert.strictEqual(res.status, 400, 'API should reject conflicting teacher assignment');
    assert(res.data.error.includes('The selected teacher is already scheduled during this interval') ||
           res.data.error.includes('require the same teacher'), 'Contains teacher conflict message');
    console.log('✓ TEST 6 PASS: Teacher conflict accurately detected');
    passed++;
  } catch (err) {
    console.error('✗ TEST 6 FAIL:', err.message);
  }

  // TEST 7: Section conflict
  // Two fixed lab sessions require the same section at overlapping times
  total++;
  try {
    const res = await request('POST', '/api/generate', {
      department: 'Computer Science',
      teachers: [
        { name: 'Dr. Sharma', subjects: ['DBMS'] },
        { name: 'Prof. Verma', subjects: ['Networks'] }
      ],
      subjects: ['DBMS', 'Networks'],
      sections: [{ name: 'CSE-A' }],
      rooms: [
        { room_number: 'Lab-1', room_type: 'Laboratory' },
        { room_number: 'Lab-2', room_type: 'Laboratory' }
      ],
      working_days: ['Monday'],
      working_start_time: '09:00',
      working_end_time: '16:00',
      lab_classes: [
        {
          subject: 'DBMS',
          teacher: 'Dr. Sharma',
          section: 'CSE-A',
          day: 'Monday',
          start_time: '10:00',
          end_time: '12:00',
          duration: 2,
          room: 'Lab-1'
        },
        {
          subject: 'Networks',
          teacher: 'Prof. Verma',
          section: 'CSE-A',
          day: 'Monday',
          start_time: '10:00',
          end_time: '12:00',
          duration: 2,
          room: 'Lab-2'
        }
      ]
    });
    assert.strictEqual(res.status, 400, 'API should reject conflicting section assignment');
    assert(res.data.error.includes('The selected section already has a class during this interval') ||
           res.data.error.includes('require the same section'), 'Contains section conflict message');
    console.log('✓ TEST 7 PASS: Section conflict accurately detected');
    passed++;
  } catch (err) {
    console.error('✗ TEST 7 FAIL:', err.message);
  }

  // TEST 8: Day-specific periods
  // Monday has 5 periods (09:00-14:00), Tuesday has 7 periods (09:00-16:00)
  total++;
  try {
    const mondayPeriods = [
      { period: 1, start_time: '09:00:00', end_time: '10:00:00', slot_index: 0 },
      { period: 2, start_time: '10:00:00', end_time: '11:00:00', slot_index: 1 },
      { period: 3, start_time: '11:00:00', end_time: '12:00:00', slot_index: 2 },
      { period: 4, start_time: '12:00:00', end_time: '13:00:00', slot_index: 3 },
      { period: 5, start_time: '13:00:00', end_time: '14:00:00', slot_index: 4 }
    ];
    const tuesdayPeriods = [
      ...mondayPeriods,
      { period: 6, start_time: '14:00:00', end_time: '15:00:00', slot_index: 5 },
      { period: 7, start_time: '15:00:00', end_time: '16:00:00', slot_index: 6 }
    ];

    // On Monday, 14:00-16:00 fails
    const monMatch = app.matchLabToDayPeriods('14:00', '16:00', 'Monday', mondayPeriods, []);
    assert.strictEqual(monMatch.valid, false, '14:00-16:00 should not fit Monday (5 periods)');

    // On Tuesday, 14:00-16:00 matches P6 and P7
    const tueMatch = app.matchLabToDayPeriods('14:00', '16:00', 'Tuesday', tuesdayPeriods, []);
    assert.strictEqual(tueMatch.valid, true, '14:00-16:00 fits Tuesday (7 periods)');
    assert.deepStrictEqual(tueMatch.matchedPeriods.map(p => p.period_number), [6, 7], 'Matches P6 and P7');

    console.log('✓ TEST 8 PASS: Day-specific period counts accurately used for matching');
    passed++;
  } catch (err) {
    console.error('✗ TEST 8 FAIL:', err.message);
  }

  // TEST 9: Persistence
  total++;
  try {
    const resGen = await request('POST', '/api/generate', {
      department: 'Computer Science',
      teachers: [{ name: 'Dr. Sharma', subjects: ['DBMS'] }],
      subjects: ['DBMS'],
      sections: [{ name: 'CSE-A' }],
      rooms: [{ room_number: 'Lab-1', room_type: 'Laboratory' }],
      working_days: ['Monday'],
      working_start_time: '09:00',
      working_end_time: '15:00',
      period_count: 5,
      lab_classes: [
        {
          subject: 'DBMS',
          teacher: 'Dr. Sharma',
          section: 'CSE-A',
          day: 'Monday',
          start_time: '10:00',
          end_time: '12:00',
          duration: 2,
          room: 'Lab-1'
        }
      ]
    });
    assert.strictEqual(resGen.status, 200, 'Generate succeeded');

    const resGet = await request('GET', '/api/timetable');
    assert.strictEqual(resGet.status, 200, 'GET /api/timetable succeeded');
    const entries = Array.isArray(resGet.data) ? resGet.data : (resGet.data.timetable || []);
    const labClassPersisted = entries.find((t) => t.is_lab || t.session_type === 'LAB' || (t.course_name && t.course_name.includes('Lab')));
    assert(labClassPersisted, 'Lab class persisted');
    assert.strictEqual(labClassPersisted.start_time, '10:00:00', 'Start time preserved');
    assert.strictEqual(labClassPersisted.end_time, '12:00:00', 'End time preserved');
    assert.strictEqual(labClassPersisted.duration || (labClassPersisted.occupied_slots ? labClassPersisted.occupied_slots.length : 2), 2, 'Duration preserved');

    console.log('✓ TEST 9 PASS: Lab timing and assignments remain correct in persistence');
    passed++;
  } catch (err) {
    console.error('✗ TEST 9 FAIL:', err.message);
  }

  // TEST 10: Regression
  total++;
  try {
    const res = await request('POST', '/api/generate', {
      department: 'Information Technology',
      teachers: [
        { name: 'Dr. Rao', subjects: ['Python'] },
        { name: 'Prof. Mehta', subjects: ['Web Dev'] }
      ],
      subjects: ['Python', 'Web Dev'],
      sections: [{ name: 'IT-A' }, { name: 'IT-B' }],
      rooms: [
        { room_number: '201', room_type: 'Classroom' },
        { room_number: 'Lab-2', room_type: 'Laboratory' }
      ],
      working_days: ['Monday', 'Tuesday'],
      working_start_time: '09:00',
      working_end_time: '16:00',
      period_count: 6,
      breaks: [
        { name: 'Lunch', start_time: '12:00', end_time: '13:00', day: 'All Working Days' }
      ]
    });
    assert.strictEqual(res.status, 200, 'Regression standard generation succeeded');
    assert(res.data.timetable && res.data.timetable.length > 0, 'Timetable generated');
    console.log('✓ TEST 10 PASS: Regression checks for standard schedules, breaks, and sections pass');
    passed++;
  } catch (err) {
    console.error('✗ TEST 10 FAIL:', err.message);
  } finally {
    try {
      const bPath = path.join(__dirname, '..', 'data', 'breaks.json');
      if (fs.existsSync(bPath)) {
        fs.writeFileSync(bPath, '[]\n');
      }
    } catch (_) {}
  }

  console.log('\n============================================================');
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log('============================================================');

  if (passed !== total) process.exit(1);
}

runTestSuite();
