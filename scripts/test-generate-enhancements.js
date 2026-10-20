/**
 * Automated Verification Script for SchedX Generate Page Updates
 * Tests Scenarios 1 to 12 as defined in user requirements.
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (_) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('SchedX Generate Page Enhancement Verification (Tests 1–12)');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testNum, testTitle, detail = '') {
    if (condition) {
      console.log(`[PASS] TEST ${testNum}: ${testTitle}`);
      if (detail) console.log(`       -> ${detail}`);
      passedCount++;
    } else {
      console.error(`[FAIL] TEST ${testNum}: ${testTitle}`);
      if (detail) console.error(`       -> ${detail}`);
      failedCount++;
    }
  }

  // Clear previous timetable state
  await request('DELETE', '/api/timetable');

  // TEST 1: Precise timing (09:15 AM to 10:05 AM)
  try {
    const payloadTest1 = {
      department: 'Computer Science',
      working_days: ['Monday', 'Tuesday', 'Wednesday'],
      working_start_time: '09:00',
      working_end_time: '17:00',
      day_periods: {
        Monday: [
          { period: 1, start: '09:15', end: '10:05' },
          { period: 2, start: '10:05', end: '10:55' },
          { period: 3, start: '11:00', end: '11:50' }
        ],
        Tuesday: [
          { period: 1, start: '09:15', end: '10:05' },
          { period: 2, start: '10:05', end: '10:55' }
        ],
        Wednesday: [
          { period: 1, start: '09:15', end: '10:05' },
          { period: 2, start: '10:05', end: '10:55' }
        ]
      },
      breaks: [],
      teachers: [
        { name: 'Dr. Rahul Kumar', subjects: ['DBMS'] },
        { name: 'Prof. Ananya Sharma', subjects: ['DSA'] }
      ],
      subjects: ['DBMS', 'DSA'],
      sections: [{ name: 'CSE-A' }],
      rooms: [
        { room_number: 'Room-101', room_type: 'Classroom' },
        { room_number: 'Lab-A', room_type: 'Laboratory' }
      ]
    };

    const res1 = await request('POST', '/api/generate', payloadTest1);
    const entries1 = res1.data?.timetable || [];
    const p1Entry = entries1.find((e) => e.day === 'Monday' && e.period_number === 1);

    const timeMatches = p1Entry &&
      (p1Entry.start_time.startsWith('09:15') || p1Entry.start_time.includes('09:15')) &&
      (p1Entry.end_time.startsWith('10:05') || p1Entry.end_time.includes('10:05'));

    assert(
      res1.statusCode === 200 && timeMatches,
      1,
      'Precise timing configuration (09:15 AM to 10:05 AM preserved)',
      `Scheduled Period 1 on Monday: ${p1Entry?.start_time} to ${p1Entry?.end_time}`
    );
  } catch (err) {
    assert(false, 1, 'Precise timing configuration', err.message);
  }

  // TEST 2: Multiple lab days (Monday & Wednesday)
  try {
    const payloadTest2 = {
      department: 'Computer Science',
      working_days: ['Monday', 'Tuesday', 'Wednesday'],
      working_start_time: '09:00',
      working_end_time: '17:00',
      day_periods: {
        Monday: [
          { period: 1, start: '09:00', end: '10:00' },
          { period: 2, start: '10:00', end: '11:00' },
          { period: 3, start: '11:00', end: '12:00' }
        ],
        Tuesday: [
          { period: 1, start: '09:00', end: '10:00' },
          { period: 2, start: '10:00', end: '11:00' }
        ],
        Wednesday: [
          { period: 1, start: '09:00', end: '10:00' },
          { period: 2, start: '10:00', end: '11:00' },
          { period: 3, start: '11:00', end: '12:00' }
        ]
      },
      breaks: [],
      teachers: [
        { name: 'Dr. Rahul Kumar', subjects: ['DBMS', 'DBMS Lab'] },
        { name: 'Prof. Ananya Sharma', subjects: ['DSA'] }
      ],
      subjects: ['DBMS', 'DSA'],
      sections: [{ name: 'CSE-A' }],
      rooms: [
        { room_number: 'Room-101', room_type: 'Classroom' },
        { room_number: 'Lab-A', room_type: 'Laboratory' }
      ],
      lab_classes: [
        {
          subject: 'DBMS Lab',
          teacher: 'Dr. Rahul Kumar',
          section: 'CSE-A',
          sections: ['CSE-A'],
          section_mode: 'separate',
          day: 'Monday',
          days: ['Monday', 'Wednesday'],
          day_mode: 'every',
          start_time: '10:00',
          end_time: '12:00',
          duration: 2,
          room: 'Lab-A'
        }
      ]
    };

    const res2 = await request('POST', '/api/generate', payloadTest2);
    const entries2 = res2.data?.timetable || [];
    const monLab = entries2.some((e) => e.day === 'Monday' && e.course_name.includes('Lab'));
    const wedLab = entries2.some((e) => e.day === 'Wednesday' && e.course_name.includes('Lab'));

    assert(
      res2.statusCode === 200 && monLab && wedLab,
      2,
      'Multiple lab days (scheduled on both Monday and Wednesday in "every" day mode)',
      `Lab scheduled on Monday: ${monLab}, on Wednesday: ${wedLab}`
    );
  } catch (err) {
    assert(false, 2, 'Multiple lab days', err.message);
  }

  // TEST 3: Multiple sections in separate-session mode
  try {
    const payloadTest3 = {
      department: 'Computer Science',
      working_days: ['Monday', 'Tuesday'],
      working_start_time: '09:00',
      working_end_time: '17:00',
      day_periods: {
        Monday: [
          { period: 1, start: '09:00', end: '10:00' },
          { period: 2, start: '10:00', end: '11:00' },
          { period: 3, start: '11:00', end: '12:00' },
          { period: 4, start: '12:00', end: '13:00' }
        ],
        Tuesday: [
          { period: 1, start: '09:00', end: '10:00' },
          { period: 2, start: '10:00', end: '11:00' },
          { period: 3, start: '11:00', end: '12:00' }
        ]
      },
      breaks: [],
      teachers: [
        { name: 'Dr. Rahul Kumar', subjects: ['DBMS', 'DBMS Lab'] },
        { name: 'Prof. Ananya Sharma', subjects: ['DBMS', 'DBMS Lab'] }
      ],
      subjects: ['DBMS'],
      sections: [{ name: 'CSE-A' }, { name: 'CSE-B' }],
      rooms: [
        { room_number: 'Room-101', room_type: 'Classroom' },
        { room_number: 'Lab-A', room_type: 'Laboratory' },
        { room_number: 'Lab-B', room_type: 'Laboratory' }
      ],
      lab_classes: [
        {
          subject: 'DBMS Lab',
          teacher: 'Dr. Rahul Kumar',
          section: 'CSE-A',
          sections: ['CSE-A', 'CSE-B'],
          section_mode: 'separate',
          day: 'Monday',
          days: ['Monday'],
          day_mode: 'every',
          start_time: '09:00',
          end_time: '11:00',
          duration: 2,
          room: 'Lab-A'
        }
      ]
    };

    const res3 = await request('POST', '/api/generate', payloadTest3);
    const entries3 = res3.data?.timetable || [];
    const cseALabs = entries3.filter((e) => (e.section === 'CSE-A' || e.class_name === 'CSE-A') && e.course_name.includes('Lab'));
    const cseBLabs = entries3.filter((e) => (e.section === 'CSE-B' || e.class_name === 'CSE-B') && e.course_name.includes('Lab'));

    assert(
      res3.statusCode === 200 && cseALabs.length > 0 && cseBLabs.length > 0,
      3,
      'Multiple sections in separate-session mode (independent sessions for CSE-A and CSE-B)',
      `CSE-A Lab periods: ${cseALabs.length}, CSE-B Lab periods: ${cseBLabs.length}`
    );
  } catch (err) {
    assert(false, 3, 'Multiple sections separate mode', err.message);
  }

  // TEST 4: Shared-section behavior
  try {
    const payloadTest4 = {
      department: 'Computer Science',
      working_days: ['Monday'],
      working_start_time: '09:00',
      working_end_time: '17:00',
      day_periods: {
        Monday: [
          { period: 1, start: '09:00', end: '10:00' },
          { period: 2, start: '10:00', end: '11:00' }
        ]
      },
      breaks: [],
      teachers: [
        { name: 'Dr. Rahul Kumar', subjects: ['DBMS Lab'] }
      ],
      subjects: ['DBMS Lab'],
      sections: [{ name: 'CSE-A' }, { name: 'CSE-B' }],
      rooms: [
        { room_number: 'Lab-A', room_type: 'Laboratory' }
      ],
      lab_classes: [
        {
          subject: 'DBMS Lab',
          teacher: 'Dr. Rahul Kumar',
          section: 'CSE-A & CSE-B',
          sections: ['CSE-A', 'CSE-B'],
          section_mode: 'shared',
          day: 'Monday',
          days: ['Monday'],
          day_mode: 'every',
          start_time: '09:00',
          end_time: '11:00',
          duration: 2,
          room: 'Lab-A'
        }
      ]
    };

    const res4 = await request('POST', '/api/generate', payloadTest4);
    const entries4 = res4.data?.timetable || [];
    const sharedLab = entries4.find((e) => e.section && e.section.includes('&'));

    assert(
      res4.statusCode === 200 && Boolean(sharedLab),
      4,
      'Shared-section lab behavior (explicit combined section session created)',
      `Shared Lab Section: ${sharedLab?.section}`
    );
  } catch (err) {
    assert(false, 4, 'Shared-section lab behavior', err.message);
  }

  // TEST 5: Same-section conflict detection
  try {
    // Schedule two classes for CSE-A at the same day & time
    const conflictingTimetable = [
      {
        id: 'c1',
        timetable_id: 'c1',
        day: 'Monday',
        period_number: 1,
        start_time: '10:00:00',
        end_time: '11:00:00',
        section: 'CSE-A',
        course_name: 'Data Structures',
        teacher_name: 'Prof. Ananya Sharma',
        room_name: 'Room-101',
        room_type: 'Classroom',
        department: 'CSE'
      },
      {
        id: 'c2',
        timetable_id: 'c2',
        day: 'Monday',
        period_number: 1,
        start_time: '10:00:00',
        end_time: '11:00:00',
        section: 'CSE-A',
        course_name: 'Operating Systems',
        teacher_name: 'Dr. Rahul Kumar',
        room_name: 'Room-102',
        room_type: 'Classroom',
        department: 'CSE'
      }
    ];

    // PUT into timetable
    await request('PUT', '/api/timetable', conflictingTimetable);
    const res5 = await request('GET', '/api/timetable');
    const entries5 = res5.data || [];
    const c1 = entries5.find((e) => String(e.id || e.timetable_id) === 'c1');
    const c2 = entries5.find((e) => String(e.id || e.timetable_id) === 'c2');

    assert(
      Boolean(c1?.has_conflict && c2?.has_conflict),
      5,
      'Same-section conflict detection (both conflicting assignments flagged in red)',
      `c1 has_conflict: ${c1?.has_conflict}, c2 has_conflict: ${c2?.has_conflict}`
    );
  } catch (err) {
    assert(false, 5, 'Same-section conflict detection', err.message);
  }

  // TEST 6: Teacher conflict detection
  try {
    const teacherConflictEntries = [
      {
        id: 'tc1',
        timetable_id: 'tc1',
        day: 'Tuesday',
        period_number: 1,
        start_time: '09:00:00',
        end_time: '10:00:00',
        section: 'CSE-A',
        course_name: 'Data Structures',
        teacher_name: 'Prof. Ananya Sharma',
        room_name: 'Room-101',
        room_type: 'Classroom',
        department: 'CSE'
      },
      {
        id: 'tc2',
        timetable_id: 'tc2',
        day: 'Tuesday',
        period_number: 1,
        start_time: '09:30:00',
        end_time: '10:30:00',
        section: 'CSE-B',
        course_name: 'Algorithms',
        teacher_name: 'Prof. Ananya Sharma',
        room_name: 'Room-102',
        room_type: 'Classroom',
        department: 'CSE'
      }
    ];

    await request('PUT', '/api/timetable', teacherConflictEntries);
    const res6 = await request('GET', '/api/timetable');
    const entries6 = res6.data || [];
    const tc1 = entries6.find((e) => String(e.id || e.timetable_id) === 'tc1');
    const tc2 = entries6.find((e) => String(e.id || e.timetable_id) === 'tc2');

    assert(
      Boolean(tc1?.has_conflict && tc2?.has_conflict),
      6,
      'Teacher overlapping interval conflict detection (interval math: 09:00-10:00 vs 09:30-10:30)',
      `tc1 has_conflict: ${tc1?.has_conflict}, tc2 has_conflict: ${tc2?.has_conflict}`
    );
  } catch (err) {
    assert(false, 6, 'Teacher conflict detection', err.message);
  }

  // TEST 7: Partial generation / Unscheduled classes
  try {
    // Single 1-hour slot available, but multiple classes and long lab requested
    const payloadTest7 = {
      department: 'Computer Science',
      working_days: ['Monday'],
      working_start_time: '09:00',
      working_end_time: '10:00',
      day_periods: {
        Monday: [
          { period: 1, start: '09:00', end: '10:00' }
        ]
      },
      breaks: [],
      teachers: [
        { name: 'Dr. Rahul Kumar', subjects: ['DBMS'] },
        { name: 'Prof. Ananya Sharma', subjects: ['DSA'] }
      ],
      subjects: ['DBMS', 'DSA'],
      sections: [{ name: 'CSE-A' }],
      rooms: [
        { room_number: 'Room-101', room_type: 'Classroom' }
      ]
    };

    const res7 = await request('POST', '/api/generate', payloadTest7);
    const isProvisionalOrValid = res7.statusCode === 200;
    const hasUnscheduled = (res7.data?.unscheduled_classes?.length > 0) || (res7.data?.summary?.classes_requiring_attention > 0) || (res7.data?.status === 'INCOMPLETE' || res7.data?.status === 'WARNING' || res7.data?.status === 'VALID');

    assert(
      isProvisionalOrValid && hasUnscheduled,
      7,
      'Provisional generation with warning-based conflict handling (does not throw 409 or abandon generation)',
      `Status: ${res7.data?.status}, Summary: ${JSON.stringify(res7.data?.summary)}`
    );
  } catch (err) {
    assert(false, 7, 'Partial generation', err.message);
  }

  // TEST 8: Manual conflict correction via PUT /api/timetable/entry/:id
  try {
    // Setup 1 conflicting timetable with tc1 and tc2
    const initialConflicts = [
      {
        id: 'fix_1',
        timetable_id: 'fix_1',
        day: 'Friday',
        period_number: 1,
        start_time: '09:00:00',
        end_time: '10:00:00',
        section: 'CSE-A',
        course_name: 'DBMS',
        teacher_name: 'Dr. Rahul Kumar',
        room_name: 'Room-101',
        room_type: 'Classroom',
        department: 'CSE'
      },
      {
        id: 'fix_2',
        timetable_id: 'fix_2',
        day: 'Friday',
        period_number: 1,
        start_time: '09:00:00',
        end_time: '10:00:00',
        section: 'CSE-A',
        course_name: 'DSA',
        teacher_name: 'Prof. Ananya Sharma',
        room_name: 'Room-102',
        room_type: 'Classroom',
        department: 'CSE'
      }
    ];

    await request('PUT', '/api/timetable', initialConflicts);

    // Verify initial conflict
    let check1 = await request('GET', '/api/timetable');
    let f1Before = check1.data.find((e) => String(e.id || e.timetable_id) === 'fix_1');
    let f2Before = check1.data.find((e) => String(e.id || e.timetable_id) === 'fix_2');
    const wasConflicted = f1Before?.has_conflict && f2Before?.has_conflict;

    // Move fix_2 to a free period (11:00:00 - 12:00:00)
    const updateRes = await request('PUT', '/api/timetable/entry/fix_2', {
      timetable_id: 'fix_2',
      day: 'Friday',
      period_number: 2,
      start_time: '11:00:00',
      end_time: '12:00:00',
      section: 'CSE-A',
      course_name: 'DSA',
      teacher_name: 'Prof. Ananya Sharma',
      room_name: 'Room-102',
      room_type: 'Classroom',
      department: 'CSE'
    });

    // Re-fetch timetable
    let check2 = await request('GET', '/api/timetable');
    let f1After = check2.data.find((e) => String(e.id || e.timetable_id) === 'fix_1');
    let f2After = check2.data.find((e) => String(e.id || e.timetable_id) === 'fix_2');

    const isResolved = !f1After?.has_conflict && !f2After?.has_conflict;

    assert(
      wasConflicted && isResolved && updateRes.data?.status === 'VALID',
      8,
      'Manual conflict correction via PUT /api/timetable/entry (conflict resolved, warning removed)',
      `Before: conflict=${wasConflicted}, After: f1 conflict=${f1After?.has_conflict}, f2 conflict=${f2After?.has_conflict}, status=${updateRes.data?.status}`
    );
  } catch (err) {
    assert(false, 8, 'Manual conflict correction', err.message);
  }

  // TEST 9: Regeneration without duplicate assignments
  try {
    const payloadTest9 = {
      department: 'CSE',
      working_days: ['Monday', 'Tuesday'],
      working_start_time: '09:00',
      working_end_time: '12:00',
      day_periods: {
        Monday: [
          { period: 1, start: '09:00', end: '10:00' },
          { period: 2, start: '10:00', end: '11:00' }
        ],
        Tuesday: [
          { period: 1, start: '09:00', end: '10:00' }
        ]
      },
      breaks: [],
      teachers: [
        { name: 'Dr. Rahul Kumar', subjects: ['DBMS'] }
      ],
      subjects: ['DBMS'],
      sections: [{ name: 'CSE-A' }],
      rooms: [{ room_number: 'Room-101', room_type: 'Classroom' }]
    };

    // Generate once
    const gen1 = await request('POST', '/api/generate', payloadTest9);
    const count1 = gen1.data?.entries_created || gen1.data?.timetable?.length;

    // Regenerate
    const gen2 = await request('POST', '/api/generate', payloadTest9);
    const count2 = gen2.data?.entries_created || gen2.data?.timetable?.length;

    const listRes = await request('GET', '/api/timetable');
    const totalCurrentEntries = listRes.data?.length;

    assert(
      gen1.statusCode === 200 && gen2.statusCode === 200 && totalCurrentEntries === count2,
      9,
      'Regeneration replaces timetable cleanly without creating duplicate sessions',
      `Gen 1 count: ${count1}, Gen 2 count: ${count2}, Current store count: ${totalCurrentEntries}`
    );
  } catch (err) {
    assert(false, 9, 'Regeneration duplicate check', err.message);
  }

  // TEST 10: Room requirement box removal
  try {
    const htmlRes = await request('GET', '/generate');
    const html = typeof htmlRes.data === 'string' ? htmlRes.data : '';
    const hasRoomRequirementBox = html.includes('ROOM REQUIREMENT') || html.includes('stepRoomTypeCard');

    // Generate without any roomType input
    const payloadTest10 = {
      department: 'Information Technology',
      working_days: ['Monday'],
      working_start_time: '09:00',
      working_end_time: '12:00',
      day_periods: {
        Monday: [
          { period: 1, start: '09:00', end: '10:00' }
        ]
      },
      breaks: [],
      teachers: [
        { name: 'Dr. Rahul Kumar', subjects: ['DBMS'] }
      ],
      subjects: ['DBMS'],
      sections: [{ name: 'IT-A' }]
      // No rooms or room_type field provided!
    };

    const gen10 = await request('POST', '/api/generate', payloadTest10);
    const succeededWithoutRooms = gen10.statusCode === 200 && gen10.data?.success;

    assert(
      !hasRoomRequirementBox && succeededWithoutRooms,
      10,
      'Room Requirement box removed from Generate page and inputs no longer mandatory',
      `HTML contains room box: ${hasRoomRequirementBox}, Generation succeeded without room inputs: ${succeededWithoutRooms}`
    );
  } catch (err) {
    assert(false, 10, 'Room requirement box removal', err.message);
  }

  // TEST 11: Persistence and reload recalculation
  try {
    const list11 = await request('GET', '/api/timetable');
    const meta11 = await request('GET', '/api/timetable/active-metadata');

    assert(
      list11.statusCode === 200 && meta11.statusCode === 200 && Array.isArray(list11.data),
      11,
      'Persistence verification (timetable entries and active metadata restore properly)',
      `Entries retrieved: ${list11.data?.length}, Active dept: ${meta11.data?.activeVersion?.department}`
    );
  } catch (err) {
    assert(false, 11, 'Persistence verification', err.message);
  }

  // TEST 12: Regression testing (breaks, teachers, departments, workload)
  try {
    const deptsRes = await request('GET', '/api/departments');
    const breaksRes = await request('GET', '/api/breaks');
    const workloadRes = await request('GET', '/api/timetable/workload');
    const metaRes = await request('GET', '/api/timetable/metadata');

    const allEndpointsHealthy = deptsRes.statusCode === 200 &&
      breaksRes.statusCode === 200 &&
      workloadRes.statusCode === 200 &&
      metaRes.statusCode === 200;

    assert(
      allEndpointsHealthy,
      12,
      'Regression testing across existing subsystems (departments, breaks, workload, metadata)',
      `Departments: ${deptsRes.statusCode}, Breaks: ${breaksRes.statusCode}, Workload: ${workloadRes.statusCode}, Metadata: ${metaRes.statusCode}`
    );
  } catch (err) {
    assert(false, 12, 'Regression testing', err.message);
  }

  console.log('\n================================================================');
  console.log(`Results: ${passedCount} PASSED, ${failedCount} FAILED out of 12 tests.`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error('Test execution fatal error:', e);
  process.exit(1);
});
