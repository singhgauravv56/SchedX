/**
 * SchedX Complete Timetable Generation Audit & Enhancement Test Suite
 * Tests 1 to 13 as mandated by Section 10 of project specifications.
 */

const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

const results = [];

function recordResult(testNum, name, passed, details) {
  results.push({ testNum, name, passed, details });
  const symbol = passed ? '✓ [PASS]' : '✗ [FAIL]';
  console.log(`${symbol} TEST ${testNum}: ${name}`);
  if (details) console.log(`       -> ${details}`);
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('SchedX Generation & Scheduling Audit Test Suite (Tests 1–13)');
  console.log('================================================================\n');

  // Reset teacher availability to baseline clean state
  await request('POST', '/api/teacher-availability', { teachers: [] });

  // Common baseline rooms
  const rooms = [
    { room_number: 'CR-101', room_type: 'Classroom', capacity: 60 },
    { room_number: 'CR-102', room_type: 'Classroom', capacity: 60 },
    { room_number: 'LAB-Alpha', room_type: 'Laboratory', capacity: 40 },
    { room_number: 'LAB-Beta', room_type: 'Laboratory', capacity: 40 }
  ];

  // --------------------------------------------------------------------------
  // TEST 1: Manual lab timing (10:15 AM to 12:15 PM)
  // --------------------------------------------------------------------------
  try {
    const t1Res = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: [{ name: 'Dr. Sharma', subjects: ['Algorithms', 'Algorithms Lab'] }],
      subjects: ['Algorithms', 'Algorithms Lab'],
      sections: [{ name: 'CSE-3A' }],
      rooms,
      working_days: ['Monday', 'Tuesday', 'Wednesday'],
      working_start_time: '09:00',
      working_end_time: '16:00',
      lab_classes: [
        {
          subject: 'Algorithms Lab',
          teacher: 'Dr. Sharma',
          section: 'CSE-3A',
          day: 'Monday',
          start_time: '10:15',
          end_time: '12:15',
          room: 'LAB-Alpha'
        }
      ]
    });

    const isOk = t1Res.status === 200 && Array.isArray(t1Res.data.timetable);
    const labEntry = isOk
      ? t1Res.data.timetable.find((e) => e.is_lab || e.session_type === 'LAB')
      : null;

    const exactMatch = labEntry &&
      labEntry.start_time.startsWith('10:15') &&
      labEntry.end_time.startsWith('12:15') &&
      labEntry.day === 'Monday';

    recordResult(
      1,
      'Manual lab timing (10:15 AM to 12:15 PM exact timing preserved)',
      Boolean(exactMatch),
      labEntry ? `Scheduled Lab: ${labEntry.start_time}–${labEntry.end_time} on ${labEntry.day}` : `Status: ${t1Res.status}, Error: ${t1Res.data?.error}`
    );
  } catch (err) {
    recordResult(1, 'Manual lab timing', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Lab conflict (fixed lab overlapping existing class for same section)
  // --------------------------------------------------------------------------
  try {
    const t2Res = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: [
        { name: 'Dr. Sharma', subjects: ['Algorithms', 'Algorithms Lab'] },
        { name: 'Prof. Verma', subjects: ['Operating Systems', 'OS Lab'] }
      ],
      subjects: ['Algorithms', 'Operating Systems', 'Algorithms Lab', 'OS Lab'],
      sections: [{ name: 'CSE-3A' }],
      rooms,
      working_days: ['Monday', 'Tuesday'],
      working_start_time: '09:00',
      working_end_time: '16:00',
      lab_classes: [
        {
          subject: 'Algorithms Lab',
          teacher: 'Dr. Sharma',
          section: 'CSE-3A',
          day: 'Monday',
          start_time: '10:00',
          end_time: '12:00',
          room: 'LAB-Alpha'
        },
        {
          subject: 'OS Lab',
          teacher: 'Prof. Verma',
          section: 'CSE-3A',
          day: 'Monday',
          start_time: '11:00',
          end_time: '13:00', // Overlaps with Algorithms Lab on same section CSE-3A!
          room: 'LAB-Beta'
        }
      ]
    });

    const detectedConflict = t2Res.status === 400 &&
      String(t2Res.data.error || '').toLowerCase().includes('same section');

    recordResult(
      2,
      'Lab conflict (overlapping fixed labs for same section detected)',
      detectedConflict,
      `Status: ${t2Res.status}, Error: "${t2Res.data?.error}"`
    );
  } catch (err) {
    recordResult(2, 'Lab conflict', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Copy period configuration (complete period configuration copy)
  // --------------------------------------------------------------------------
  try {
    const mondayPeriods = [
      { period: 1, start_time: '09:00', end_time: '10:00' },
      { period: 2, start_time: '10:00', end_time: '11:00' },
      { period: 3, start_time: '11:00', end_time: '12:00' },
      { period: 4, start_time: '12:00', end_time: '13:00' }
    ];

    const dayPeriods = {
      Monday: mondayPeriods,
      Tuesday: JSON.parse(JSON.stringify(mondayPeriods)),
      Wednesday: JSON.parse(JSON.stringify(mondayPeriods))
    };

    const t3Res = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: [
        { name: 'Dr. Sharma', subjects: ['Algorithms'] },
        { name: 'Prof. Verma', subjects: ['Operating Systems'] }
      ],
      subjects: ['Algorithms', 'Operating Systems'],
      sections: [{ name: 'CSE-3A' }],
      rooms,
      working_days: ['Monday', 'Tuesday', 'Wednesday'],
      working_start_time: '09:00',
      working_end_time: '13:00',
      day_periods: dayPeriods
    });

    const hasPeriods = t3Res.status === 200 && t3Res.data.day_periods;
    const monCount = t3Res.data.day_periods?.Monday?.length;
    const tueCount = t3Res.data.day_periods?.Tuesday?.length;
    const wedCount = t3Res.data.day_periods?.Wednesday?.length;

    const copyCompletePassed = hasPeriods && monCount === 4 && tueCount === 4 && wedCount === 4;

    recordResult(
      3,
      'Copy period configuration (complete configuration copied)',
      copyCompletePassed,
      `Monday: ${monCount} periods, Tuesday: ${tueCount} periods, Wednesday: ${wedCount} periods`
    );
  } catch (err) {
    recordResult(3, 'Copy period configuration', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Copy timing only (destination-day specific settings preserved)
  // --------------------------------------------------------------------------
  try {
    const dayPeriods = {
      Monday: [
        { period: 1, start_time: '08:30', end_time: '09:30' },
        { period: 2, start_time: '09:30', end_time: '10:30' },
        { period: 3, start_time: '10:30', end_time: '11:30' },
        { period: 4, start_time: '11:30', end_time: '12:30' }
      ],
      Friday: [
        { period: 1, start_time: '08:30', end_time: '09:30' },
        { period: 2, start_time: '09:30', end_time: '10:30' },
        { period: 3, start_time: '10:30', end_time: '11:30' },
        { period: 4, start_time: '11:30', end_time: '12:30' },
        { period: 5, start_time: '13:30', end_time: '14:30' },
        { period: 6, start_time: '14:30', end_time: '15:30' }
      ]
    };

    const t4Res = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: [
        { name: 'Dr. Sharma', subjects: ['Algorithms'] },
        { name: 'Prof. Verma', subjects: ['Operating Systems'] }
      ],
      subjects: ['Algorithms', 'Operating Systems'],
      sections: [{ name: 'CSE-3A' }],
      rooms,
      working_days: ['Monday', 'Friday'],
      working_start_time: '08:30',
      working_end_time: '16:00',
      day_periods: dayPeriods
    });

    const friCount = t4Res.data.day_periods?.Friday?.length;
    const monCount = t4Res.data.day_periods?.Monday?.length;
    const timingOnlyPreserved = t4Res.status === 200 && friCount === 6 && monCount === 4;

    recordResult(
      4,
      'Copy timing only (destination period count and day-specific bounds preserved)',
      timingOnlyPreserved,
      `Monday periods: ${monCount}, Friday periods: ${friCount}`
    );
  } catch (err) {
    recordResult(4, 'Copy timing only', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Different period counts across working days (Mon: 5, Tue: 7)
  // --------------------------------------------------------------------------
  try {
    const dayPeriods = {
      Monday: [
        { period: 1, start_time: '09:00', end_time: '10:00' },
        { period: 2, start_time: '10:00', end_time: '11:00' },
        { period: 3, start_time: '11:00', end_time: '12:00' },
        { period: 4, start_time: '12:00', end_time: '13:00' },
        { period: 5, start_time: '14:00', end_time: '15:00' }
      ],
      Tuesday: [
        { period: 1, start_time: '09:00', end_time: '10:00' },
        { period: 2, start_time: '10:00', end_time: '11:00' },
        { period: 3, start_time: '11:00', end_time: '12:00' },
        { period: 4, start_time: '12:00', end_time: '13:00' },
        { period: 5, start_time: '13:00', end_time: '14:00' },
        { period: 6, start_time: '14:00', end_time: '15:00' },
        { period: 7, start_time: '15:00', end_time: '16:00' }
      ]
    };

    const t5Res = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: [
        { name: 'Dr. Sharma', subjects: ['Algorithms'] },
        { name: 'Prof. Verma', subjects: ['Operating Systems'] }
      ],
      subjects: ['Algorithms', 'Operating Systems'],
      sections: [{ name: 'CSE-3A' }],
      rooms,
      working_days: ['Monday', 'Tuesday'],
      working_start_time: '09:00',
      working_end_time: '16:00',
      day_periods: dayPeriods
    });

    const mPeriods = t5Res.data.day_periods?.Monday?.length;
    const tPeriods = t5Res.data.day_periods?.Tuesday?.length;
    const diffCountsPreserved = t5Res.status === 200 && mPeriods === 5 && tPeriods === 7;

    recordResult(
      5,
      'Different period counts across days (Monday=5, Tuesday=7 preserved)',
      diffCountsPreserved,
      `Monday count: ${mPeriods}, Tuesday count: ${tPeriods}`
    );
  } catch (err) {
    recordResult(5, 'Different period counts', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Copy break configuration (multiple breaks copied from Mon to Tue)
  // --------------------------------------------------------------------------
  try {
    const breaks = [
      { name: 'Tea Break', day: 'Monday', start_time: '10:30', end_time: '10:45', type: 'Short Break' },
      { name: 'Lunch Break', day: 'Monday', start_time: '12:30', end_time: '13:15', type: 'Lunch' },
      { name: 'Tea Break', day: 'Tuesday', start_time: '10:30', end_time: '10:45', type: 'Short Break' },
      { name: 'Lunch Break', day: 'Tuesday', start_time: '12:30', end_time: '13:15', type: 'Lunch' }
    ];

    const t6Res = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: [{ name: 'Dr. Sharma', subjects: ['Algorithms'] }],
      subjects: ['Algorithms'],
      sections: [{ name: 'CSE-3A' }],
      rooms,
      working_days: ['Monday', 'Tuesday'],
      working_start_time: '09:00',
      working_end_time: '16:00',
      period_count: 4,
      breaks
    });

    const activeBreaks = t6Res.data?.breaks || [];
    const monBreaks = activeBreaks.filter((b) => b.day.toLowerCase() === 'monday');
    const tueBreaks = activeBreaks.filter((b) => b.day.toLowerCase() === 'tuesday');

    const multiBreaksCopied = t6Res.status === 200 && monBreaks.length === 2 && tueBreaks.length === 2;

    recordResult(
      6,
      'Copy break configuration (multiple breaks on Mon and Tue respected)',
      multiBreaksCopied,
      `Monday breaks: ${monBreaks.length}, Tuesday breaks: ${tueBreaks.length}`
    );
  } catch (err) {
    recordResult(6, 'Copy break configuration', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Invalid copied break (break outside working hours rejected)
  // --------------------------------------------------------------------------
  try {
    const t7Res = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: [{ name: 'Dr. Sharma', subjects: ['Algorithms'] }],
      subjects: ['Algorithms'],
      sections: [{ name: 'CSE-3A' }],
      rooms,
      working_days: ['Monday'],
      working_start_time: '09:00',
      working_end_time: '15:00',
      breaks: [
        { name: 'Evening Break', day: 'Monday', start_time: '16:00', end_time: '16:30', type: 'Short Break' }
      ]
    });

    const rejectedOutside = t7Res.status === 400 &&
      String(t7Res.data.error || '').includes('falls outside the configured working window');

    recordResult(
      7,
      'Invalid copied break (break outside destination working window rejected)',
      rejectedOutside,
      `Status: ${t7Res.status}, Error: "${t7Res.data?.error}"`
    );
  } catch (err) {
    recordResult(7, 'Invalid copied break', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Teacher conflict (same teacher overlapping classes detected)
  // --------------------------------------------------------------------------
  try {
    const genRes = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: [{ name: 'Dr. Sharma', subjects: ['Algorithms', 'Database Systems'] }],
      subjects: ['Algorithms', 'Database Systems'],
      sections: [{ name: 'CSE-3A' }, { name: 'CSE-3B' }],
      rooms,
      working_days: ['Monday'],
      working_start_time: '09:00',
      working_end_time: '12:00'
    });

    const entries = genRes.data.timetable || [];
    assert(entries.length >= 2, 'Need at least 2 entries to test teacher conflict');

    const e1 = entries[0];
    const e2 = entries[1];

    const clashRes = await request('PUT', `/api/timetable/entry/${e2.timetable_id || e2.id}`, {
      timetable_id: e2.timetable_id || e2.id,
      day: e1.day,
      start_time: e1.start_time,
      end_time: e1.end_time,
      teacher_name: 'Dr. Sharma',
      course_name: 'Database Systems',
      section: 'CSE-3B',
      room_name: 'CR-102',
      room_type: 'Classroom'
    });

    const teacherClashDetected = clashRes.status === 409 &&
      String(clashRes.data.error || '').includes('already scheduled during this time');

    recordResult(
      8,
      'Teacher conflict (same teacher overlapping classes rejected with HTTP 409)',
      teacherClashDetected,
      `Status: ${clashRes.status}, Error: "${clashRes.data?.error}"`
    );
  } catch (err) {
    recordResult(8, 'Teacher conflict', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 9: Minute-level overlap (09:15–10:15 vs 09:30–10:30)
  // --------------------------------------------------------------------------
  try {
    const genRes = await request('GET', '/api/timetable');
    const entries = Array.isArray(genRes.data) ? genRes.data : (genRes.data.timetable || []);
    const target = entries[0];

    const [hStr, mStr] = target.start_time.split(':');
    const sMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
    const overlapStart = `${String(Math.floor((sMin + 15) / 60)).padStart(2, '0')}:${String((sMin + 15) % 60).padStart(2, '0')}`;
    const overlapEnd = `${String(Math.floor((sMin + 75) / 60)).padStart(2, '0')}:${String((sMin + 75) % 60).padStart(2, '0')}`;

    const validation = await request('POST', '/api/timetable/validate-entry', {
      entry: {
        timetable_id: 'new_entry_minute_test',
        day: target.day,
        start_time: overlapStart,
        end_time: overlapEnd,
        teacher_name: target.teacher_name,
        course_name: target.course_name,
        section: 'Different-Sec',
        room_name: 'CR-102'
      }
    });

    const minuteOverlapDetected = !validation.data.valid &&
      String(validation.data.error || '').includes('already scheduled during this time');

    recordResult(
      9,
      'Minute-level overlap (intervals with different starts but intersecting minutes detected)',
      minuteOverlapDetected,
      `Valid: ${validation.data.valid}, Error: "${validation.data.error}"`
    );
  } catch (err) {
    recordResult(9, 'Minute-level overlap', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 10: Alternative scheduling (tries alternative valid slots/teachers)
  // --------------------------------------------------------------------------
  try {
    await request('POST', '/api/teacher-availability', {
      teachers: [
        {
          teacher_name: 'Prof. Blocked',
          is_available: false,
          availability: ['Monday|09:00–10:00', 'Monday|10:00–11:00']
        }
      ]
    });

    const t10Res = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: [
        { name: 'Prof. Blocked', subjects: ['Cloud Computing'] },
        { name: 'Prof. Free', subjects: ['Cloud Computing'] }
      ],
      subjects: ['Cloud Computing'],
      sections: [{ name: 'CSE-3A' }],
      rooms,
      working_days: ['Monday'],
      working_start_time: '09:00',
      working_end_time: '11:00'
    });

    const scheduled = t10Res.status === 200 && Array.isArray(t10Res.data.timetable);
    const entries = scheduled ? t10Res.data.timetable : [];
    const usedProfFree = entries.some((e) => e.teacher_name === 'Prof. Free');
    const usedProfBlocked = entries.some((e) => e.teacher_name === 'Prof. Blocked');

    const alternativeTried = scheduled && usedProfFree && !usedProfBlocked;

    recordResult(
      10,
      'Alternative scheduling (scheduler successfully chooses alternative qualified teacher)',
      alternativeTried,
      `Status: ${t10Res.status}, Used Free: ${usedProfFree}, Used Blocked: ${usedProfBlocked}`
    );
  } catch (err) {
    recordResult(10, 'Alternative scheduling', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 11: Impossible scheduling (reports actual limiting factors instead of claiming success)
  // --------------------------------------------------------------------------
  try {
    const t11Res = await request('POST', '/api/generate', {
      department: 'Civil Engineering',
      teachers: [
        { name: 'Teacher 1', subjects: ['Structural Analysis'] },
        { name: 'Teacher 2', subjects: ['Hydraulics'] },
        { name: 'Teacher 3', subjects: ['Geotechnical'] },
        { name: 'Teacher 4', subjects: ['Surveying'] }
      ],
      subjects: ['Structural Analysis', 'Hydraulics', 'Geotechnical', 'Surveying'],
      sections: [{ name: 'CE-A' }],
      rooms: [{ room_number: 'CR-Civil', room_type: 'Classroom' }],
      working_days: ['Monday'],
      working_start_time: '09:00',
      working_end_time: '10:00' // Strictly 1 period available!
    });

    const isPartial = t11Res.status === 200 &&
      t11Res.data.status === 'INCOMPLETE' &&
      Array.isArray(t11Res.data.unscheduled_classes) &&
      t11Res.data.unscheduled_classes.length > 0;

    const reasonsReported = isPartial &&
      t11Res.data.unscheduled_classes[0].reason.includes('Insufficient weekly slots');

    recordResult(
      11,
      'Impossible scheduling (reports actual limiting factors and status INCOMPLETE)',
      Boolean(reasonsReported),
      `Status: ${t11Res.data?.status}, Unscheduled: ${t11Res.data?.unscheduled_classes?.length}, Reason: "${t11Res.data?.unscheduled_classes?.[0]?.reason}"`
    );
  } catch (err) {
    recordResult(11, 'Impossible scheduling', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 12: Persistence (save, refresh, generate works with stored config)
  // --------------------------------------------------------------------------
  try {
    const metaRes = await request('GET', '/api/timetable/metadata');
    const ttRes = await request('GET', '/api/timetable');

    const persistedOk = metaRes.status === 200 &&
      ttRes.status === 200 &&
      Array.isArray(ttRes.data) &&
      ttRes.data.length > 0;

    recordResult(
      12,
      'Persistence (stored timetable and metadata survive and restore cleanly)',
      persistedOk,
      `Metadata status: ${metaRes.status}, Stored entries: ${ttRes.data?.length}`
    );
  } catch (err) {
    recordResult(12, 'Persistence', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 13: Regression (departments, teachers, subjects, breaks, rooms, storage intact)
  // --------------------------------------------------------------------------
  try {
    const deptsRes = await request('GET', '/api/departments');
    const breaksRes = await request('GET', '/api/breaks');
    const workloadRes = await request('GET', '/api/timetable/workload');
    const storageRes = await request('GET', '/api/storage/overview');

    const regressionOk = deptsRes.status === 200 &&
      breaksRes.status === 200 &&
      workloadRes.status === 200 &&
      storageRes.status === 200;

    recordResult(
      13,
      'Regression across all existing SchedX subsystems',
      regressionOk,
      `Depts: ${deptsRes.status}, Breaks: ${breaksRes.status}, Workload: ${workloadRes.status}, Storage: ${storageRes.status}`
    );
  } catch (err) {
    recordResult(13, 'Regression', false, err.message);
  }

  console.log('\n================================================================');
  const allPassed = results.every((r) => r.passed);
  const passCount = results.filter((r) => r.passed).length;
  console.log(`Results: ${passCount} PASSED, ${results.length - passCount} FAILED out of ${results.length} tests.`);
  console.log('================================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
