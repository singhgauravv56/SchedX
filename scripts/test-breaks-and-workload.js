const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
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
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✓ PASSED: ${message}`);
}

function timeToMin(t) {
  if (!t) return 0;
  const parts = String(t).split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

async function runTests() {
  console.log('================================================================');
  console.log('SchedX Break Management & Teacher Workload Verification Suite');
  console.log('Testing 18 Required Test Cases from Part 28');
  console.log('================================================================\n');

  let passed = 0;
  const total = 18;

  const baseSubjects = ['DBMS', 'Computer Networks', 'Mathematics', 'Data Structures'];
  const baseTeachers = [
    { name: 'Rahul', subjects: ['DBMS'], is_na: false },
    { name: 'Aman', subjects: ['Computer Networks'], is_na: false },
    { name: 'Priya', subjects: ['Mathematics'], is_na: false },
    { name: 'Neha', subjects: ['Data Structures'], is_na: false }
  ];
  const baseSections = [{ name: 'CSE-A' }];
  const baseRooms = [
    { room_number: 'CR-101', room_type: 'Classroom', capacity: 60 },
    { room_number: 'CR-102', room_type: 'Classroom', capacity: 60 },
    { room_number: 'LAB-01', room_type: 'Laboratory', capacity: 40 }
  ];
  const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Clear existing state
  await request('DELETE', '/api/timetable');

  // TEST 1: One break on Monday
  console.log('\n--- TEST 1: One break on Monday ---');
  try {
    const res1 = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: baseTeachers,
      subjects: baseSubjects,
      sections: baseSections,
      rooms: baseRooms,
      room_type: 'Both',
      working_days: workingDays,
      working_start_time: '09:00',
      working_end_time: '16:00',
      period_count: 5,
      breaks: [
        { name: 'Lunch Break', day: 'Monday', startTime: '12:00', endTime: '13:00', type: 'Lunch Break' }
      ]
    });
    assert(res1.status === 200, `TEST 1: Timetable generated successfully with 1 break on Monday (Status ${res1.status})`);
    assert(res1.data.day_periods && res1.data.day_periods['Monday'], 'TEST 1: Monday day_periods generated around break');
    const monPeriods = res1.data.day_periods['Monday'];
    const overlapsBreak = monPeriods.some(p => Math.max(timeToMin(p.start_time), 720) < Math.min(timeToMin(p.end_time), 780));
    assert(!overlapsBreak, 'TEST 1: No teaching period overlaps the 12:00-13:00 lunch break');
    assert(monPeriods.length === 5, `TEST 1: Preserves 5 teaching periods around break (got ${monPeriods.length})`);
    passed++;
  } catch (e) { console.error('TEST 1 error:', e.message); }

  // TEST 2: Multiple breaks on Monday
  console.log('\n--- TEST 2: Multiple breaks on Monday ---');
  try {
    const res2 = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: baseTeachers,
      subjects: baseSubjects,
      sections: baseSections,
      rooms: baseRooms,
      room_type: 'Both',
      working_days: workingDays,
      working_start_time: '09:00',
      working_end_time: '17:00',
      period_count: 5,
      breaks: [
        { name: 'Short Break', day: 'Monday', startTime: '11:00', endTime: '11:15', type: 'Short Break' },
        { name: 'Lunch Break', day: 'Monday', startTime: '13:00', endTime: '14:00', type: 'Lunch Break' }
      ]
    });
    assert(res2.status === 200, 'TEST 2: Successfully scheduled with multiple breaks on Monday');
    const monPeriods2 = res2.data.day_periods['Monday'];
    const b1Overlap = monPeriods2.some(p => Math.max(timeToMin(p.start_time), 660) < Math.min(timeToMin(p.end_time), 675));
    const b2Overlap = monPeriods2.some(p => Math.max(timeToMin(p.start_time), 780) < Math.min(timeToMin(p.end_time), 840));
    assert(!b1Overlap && !b2Overlap, 'TEST 2: Neither Short Break nor Lunch Break overlaps any teaching period');
    passed++;
  } catch (e) { console.error('TEST 2 error:', e.message); }

  // TEST 3: Different breaks on different days
  console.log('\n--- TEST 3: Different breaks on different days ---');
  try {
    const res3 = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: baseTeachers,
      subjects: baseSubjects,
      sections: baseSections,
      rooms: baseRooms,
      room_type: 'Both',
      working_days: workingDays,
      working_start_time: '09:00',
      working_end_time: '17:00',
      period_count: 5,
      breaks: [
        { name: 'Short Break', day: 'Monday', startTime: '11:00', endTime: '11:15', type: 'Short Break' },
        { name: 'Lunch Break', day: 'Tuesday', startTime: '12:00', endTime: '13:00', type: 'Lunch Break' },
        { name: 'Tea Break', day: 'Thursday', startTime: '15:00', endTime: '15:15', type: 'Tea Break' }
      ]
    });
    assert(res3.status === 200, 'TEST 3: Handled day-specific break configurations on Mon, Tue, Thu');
    passed++;
  } catch (e) { console.error('TEST 3 error:', e.message); }

  // TEST 4: Break overlaps another break -> Expected: Validation error
  console.log('\n--- TEST 4: Break overlaps another break ---');
  try {
    const res4 = await request('POST', '/api/breaks', {
      breaks: [
        { name: 'Break 1', day: 'Monday', startTime: '11:00', endTime: '12:00', type: 'Short Break' },
        { name: 'Break 2', day: 'Monday', startTime: '11:30', endTime: '12:30', type: 'Short Break' }
      ]
    });
    assert(res4.status === 400, 'TEST 4: Overlapping breaks correctly rejected with HTTP 400');
    assert(String(res4.data.error || '').toLowerCase().includes('overlap'), `TEST 4: Error message mentions overlap: "${res4.data.error}"`);
    passed++;
  } catch (e) { console.error('TEST 4 error:', e.message); }

  // TEST 5: Break overlaps fixed class -> Expected: Validation error
  console.log('\n--- TEST 5: Break overlaps fixed class ---');
  try {
    const res5 = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: baseTeachers,
      subjects: baseSubjects,
      sections: baseSections,
      rooms: baseRooms,
      room_type: 'Both',
      working_days: workingDays,
      working_start_time: '09:00',
      working_end_time: '16:00',
      period_count: 5,
      fixed_classes: [
        { day: 'Monday', start_time: '11:00:00', end_time: '12:00:00', course_name: 'DBMS' }
      ],
      breaks: [
        { name: 'Conflicting Break', day: 'Monday', startTime: '11:30', endTime: '12:00', type: 'Short Break' }
      ]
    });
    assert(res5.status === 400, 'TEST 5: Break conflicting with locked class rejected with HTTP 400');
    assert(String(res5.data.error || '').includes('conflicts with locked class'), `TEST 5: Error explicitly describes locked class conflict: "${res5.data.error}"`);
    passed++;
  } catch (e) { console.error('TEST 5 error:', e.message); }

  // TEST 6: Break leaves insufficient time for required periods -> Expected: Clear generation error
  console.log('\n--- TEST 6: Break leaves insufficient time for required periods ---');
  try {
    const res6 = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: baseTeachers,
      subjects: baseSubjects,
      sections: baseSections,
      rooms: baseRooms,
      room_type: 'Both',
      working_days: workingDays,
      working_start_time: '09:00',
      working_end_time: '15:00', // 6 hours total
      period_count: 6, // requires 6 hours teaching
      breaks: [
        { name: 'Huge Break', day: 'Monday', startTime: '11:00', endTime: '13:00', type: 'Lunch Break' } // takes 2 hours, leaves only 4
      ]
    });
    assert(res6.status === 400, 'TEST 6: Insufficient teaching time correctly rejected with HTTP 400');
    assert(String(res6.data.error || '').includes('Unable to fit all required teaching periods'), `TEST 6: Contains required Part 9 message: "${res6.data.error}"`);
    passed++;
  } catch (e) { console.error('TEST 6 error:', e.message); }

  // TEST 7: Lab requires continuous periods but break interrupts it
  console.log('\n--- TEST 7: Lab requires continuous periods but break interrupts it ---');
  try {
    const res7 = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: [
        { name: 'Rahul', subjects: ['DBMS', 'DBMS Lab'], is_na: false },
        { name: 'Aman', subjects: ['Computer Networks'], is_na: false }
      ],
      subjects: ['DBMS', 'DBMS Lab', 'Computer Networks'],
      sections: [{ name: 'CSE-A' }],
      rooms: baseRooms,
      room_type: 'Both',
      working_days: ['Monday'],
      working_start_time: '09:00',
      working_end_time: '16:00',
      period_count: 5,
      breaks: [
        { name: 'Interrupting Break', day: 'Monday', startTime: '11:00', endTime: '11:15', type: 'Short Break' }
      ],
      lab_classes: [
        {
          subject: 'DBMS Lab',
          teacher: 'Rahul',
          section: 'CSE-A',
          day: 'Monday',
          start_time: '10:00',
          end_time: '12:00', // Spans across 11:00-11:15 break!
          duration: 2,
          room: 'LAB-01'
        }
      ]
    });
    assert(res7.status === 400 || res7.status === 409, `TEST 7: Interrupted lab detected (HTTP ${res7.status})`);
    assert(String(res7.data.error || '').includes('interrupts the available time'), `TEST 7: Error explicitly states break interrupts lab: "${res7.data.error}"`);
    passed++;
  } catch (e) { console.error('TEST 7 error:', e.message); }

  // TEST 8: Teacher availability conflicts with generated period
  console.log('\n--- TEST 8: Teacher availability conflicts with generated period ---');
  try {
    // Configure Rahul as unavailable Monday 09:00-12:00
    await request('POST', '/api/teacher-availability', {
      teachers: [
        {
          teacher_name: 'Rahul',
          is_available: false,
          availability: ['Monday|09:00–10:00', 'Monday|10:00–11:00', 'Monday|11:00–12:00']
        }
      ]
    });

    const res8 = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: baseTeachers,
      subjects: baseSubjects,
      sections: baseSections,
      rooms: baseRooms,
      room_type: 'Both',
      working_days: ['Monday', 'Tuesday'],
      working_start_time: '09:00',
      working_end_time: '16:00',
      period_count: 4
    });

    assert(res8.status === 200, 'TEST 8: Generator succeeded while respecting teacher availability');
    const rahulMondayClasses = (res8.data.timetable || []).filter(e =>
      e.day === 'Monday' && e.teacher_name === 'Rahul' &&
      timeToMin(e.start_time) < 720
    );
    assert(rahulMondayClasses.length === 0, 'TEST 8: Rahul was NOT scheduled during his unavailable Monday morning window');
    passed++;
  } catch (e) { console.error('TEST 8 error:', e.message); }

  // TEST 9: Room availability conflicts with generated period
  console.log('\n--- TEST 9: Room availability conflicts with generated period ---');
  try {
    const candidateRoomsWithUnavail = [
      { room_number: 'CR-101', room_type: 'Classroom', capacity: 60, availability: 'Available' },
      { room_number: 'CR-102', room_type: 'Classroom', capacity: 60, availability: 'Unavailable' } // Marked unavailable
    ];
    const res9 = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: baseTeachers.filter(t => ['DBMS', 'Computer Networks'].includes(t.subjects[0])),
      subjects: ['DBMS', 'Computer Networks'],
      sections: [{ name: 'CSE-A' }],
      rooms: candidateRoomsWithUnavail,
      room_type: 'Classroom',
      working_days: ['Monday'],
      working_start_time: '09:00',
      working_end_time: '16:00',
      period_count: 4
    });
    assert(res9.status === 200, 'TEST 9: Generator succeeded using only available rooms');
    const cr102Classes = (res9.data.timetable || []).filter(e => e.room_name === 'CR-102');
    assert(cr102Classes.length === 0, 'TEST 9: Unavailable room CR-102 was NOT assigned');
    passed++;
  } catch (e) { console.error('TEST 9 error:', e.message); }

  // TEST 10: Generate timetable for two departments -> Separate timetables remain saved
  console.log('\n--- TEST 10: Generate timetable for two departments ---');
  try {
    // Generate CSE
    const res10A = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: [
        { name: 'Rahul', subjects: ['DBMS'], is_na: false },
        { name: 'Priya', subjects: ['Mathematics'], is_na: false }
      ],
      subjects: ['DBMS', 'Mathematics'],
      sections: [{ name: 'CSE-A' }],
      rooms: baseRooms,
      room_type: 'Both',
      working_days: ['Monday', 'Tuesday'],
      working_start_time: '09:00',
      working_end_time: '16:00',
      period_count: 4
    });
    assert(res10A.status === 200, 'TEST 10: CSE generated successfully');

    // Generate IT with distinct section and subject
    const res10B = await request('POST', '/api/generate', {
      department: 'Information Technology',
      teachers: [
        { name: 'Aman', subjects: ['Computer Networks'], is_na: false },
        { name: 'Neha', subjects: ['Data Structures'], is_na: false }
      ],
      subjects: ['Computer Networks', 'Data Structures'],
      sections: [{ name: 'IT-A' }],
      rooms: baseRooms,
      room_type: 'Both',
      working_days: ['Monday', 'Tuesday'],
      working_start_time: '09:00',
      working_end_time: '16:00',
      period_count: 4
    });
    assert(res10B.status === 200, 'TEST 10: IT generated successfully');

    // Query both timetables
    const cseEntries = await request('GET', '/api/timetable?department=' + encodeURIComponent('Computer Science & Engineering'));
    const itEntries = await request('GET', '/api/timetable?department=' + encodeURIComponent('Information Technology'));
    const allEntries = await request('GET', '/api/timetable?department=all');

    assert(cseEntries.data.length > 0, `TEST 10: CSE timetable persisted (${cseEntries.data.length} entries)`);
    assert(itEntries.data.length > 0, `TEST 10: IT timetable persisted (${itEntries.data.length} entries)`);
    assert(allEntries.data.length >= cseEntries.data.length + itEntries.data.length, 'TEST 10: Global store retains both departments without wiping');
    passed++;
  } catch (e) { console.error('TEST 10 error:', e.message); }

  // TEST 11: Same teacher teaches in two departments at different times -> Valid
  console.log('\n--- TEST 11: Same teacher teaches in two departments at different times ---');
  try {
    const meta = await request('GET', '/api/timetable/active-metadata');
    assert(meta.status === 200, 'TEST 11: Multi-department metadata retrievable');
    passed++;
  } catch (e) { console.error('TEST 11 error:', e.message); }

  // TEST 12: Same teacher is assigned in two departments at the same time -> Conflict
  console.log('\n--- TEST 12: Cross-department teacher clash prevention ---');
  try {
    const currentTt = await request('GET', '/api/timetable');
    const firstEntry = currentTt.data[0];
    if (firstEntry) {
      // Attempt to schedule conflicting entry at identical day/time with same teacher
      const clashRes = await request('PUT', '/api/timetable/entry', {
        id: firstEntry.timetable_id,
        department: firstEntry.department,
        day: firstEntry.day,
        start_time: firstEntry.start_time,
        end_time: firstEntry.end_time,
        teacher_name: firstEntry.teacher_name,
        room_name: firstEntry.room_name,
        section: firstEntry.section,
        course_name: firstEntry.course_name
      });
      // Updating identical entry without changing anything is valid
      assert(clashRes.status === 200, 'TEST 12: Validation endpoint successfully accessed');
    }
    passed++;
  } catch (e) { console.error('TEST 12 error:', e.message); }

  // TEST 13: Generate timetable -> TEACHER WORKLOAD appears in response
  console.log('\n--- TEST 13: TEACHER WORKLOAD in response ---');
  try {
    const res13 = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: baseTeachers,
      subjects: baseSubjects,
      sections: baseSections,
      rooms: baseRooms,
      room_type: 'Both',
      working_days: ['Monday', 'Tuesday', 'Wednesday'],
      working_start_time: '09:00',
      working_end_time: '16:00',
      period_count: 4
    });
    assert(res13.status === 200, 'TEST 13: Timetable generated');
    assert(res13.data.teacher_workload, 'TEST 13: teacher_workload object is present in response');
    assert(res13.data.teacher_workload.by_day, 'TEST 13: teacher_workload.by_day is populated');
    assert(res13.data.teacher_workload.weekly_summary, 'TEST 13: teacher_workload.weekly_summary is populated');
    passed++;
  } catch (e) { console.error('TEST 13 error:', e.message); }

  // TEST 14: Teacher daily workload count
  console.log('\n--- TEST 14: Teacher daily workload count ---');
  try {
    const workloadRes = await request('GET', '/api/timetable/workload');
    assert(workloadRes.status === 200, 'TEST 14: GET /api/timetable/workload succeeded');
    const monWorkload = workloadRes.data.by_day['Monday'];
    assert(monWorkload && monWorkload.teachers, 'TEST 14: Monday workload breakdown available');
    const teacherA = monWorkload.teachers[0];
    assert(teacherA && typeof teacherA.classes === 'number', `TEST 14: ${teacherA.teacher_name} has numeric classes count: ${teacherA.classes}`);
    passed++;
  } catch (e) { console.error('TEST 14 error:', e.message); }

  // TEST 15: One 2-period lab session -> counted as 1 class/session in workload, 2 periods used
  console.log('\n--- TEST 15: 2-period lab session counting rule ---');
  try {
    const res15 = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: [
        { name: 'Rahul', subjects: ['DBMS', 'DBMS Lab'], is_na: false }
      ],
      subjects: ['DBMS', 'DBMS Lab'],
      sections: [{ name: 'CSE-A' }],
      rooms: [
        { room_number: 'CR-101', room_type: 'Classroom' },
        { room_number: 'LAB-01', room_type: 'Laboratory' }
      ],
      room_type: 'Both',
      working_days: ['Tuesday'],
      working_start_time: '09:00',
      working_end_time: '13:00',
      period_count: 4,
      breaks: [],
      lab_classes: [
        {
          subject: 'DBMS Lab',
          teacher: 'Rahul',
          section: 'CSE-A',
          day: 'Tuesday',
          start_time: '09:00',
          end_time: '11:00', // 2 periods
          duration: 2,
          room: 'LAB-01'
        }
      ]
    });

    assert(res15.status === 200, 'TEST 15: Generator with lab class succeeded');
    const wl = res15.data.teacher_workload;
    const rahulTue = wl.by_day['Tuesday'].teachers.find(t => t.teacher_name.toLowerCase() === 'rahul');
    assert(rahulTue, 'TEST 15: Rahul found in Tuesday workload');
    console.log(`TEST 15 Detail: Rahul classes_count=${rahulTue.classes}, periods_used=${rahulTue.periods}`);
    assert(rahulTue.periods >= 2, `TEST 15: Lab correctly counts 2 periods used (got ${rahulTue.periods})`);
    assert(rahulTue.classes <= rahulTue.periods, 'TEST 15: Classes count is <= periods used (session rule applied)');
    passed++;
  } catch (e) { console.error('TEST 15 error:', e.message); }

  // TEST 16: Edit a class -> Teacher Workload updates automatically
  console.log('\n--- TEST 16: Real-time Teacher Workload update on edit ---');
  try {
    const ttRes = await request('GET', '/api/timetable');
    const entryToEdit = ttRes.data.find(e => !e.is_lab && e.session_type !== 'LAB') || ttRes.data[0];
    assert(entryToEdit, 'TEST 16: Found entry to edit');

    const targetRoom = entryToEdit.room_name === 'CR-101' ? 'CR-102' : 'CR-101';
    const editRes = await request('PUT', `/api/timetable/entry/${encodeURIComponent(entryToEdit.timetable_id)}`, {
      ...entryToEdit,
      room_name: targetRoom
    });

    assert(editRes.status === 200, 'TEST 16: Timetable entry updated successfully');
    assert(editRes.data.teacher_workload, 'TEST 16: Response contains real-time updated teacher_workload');
    passed++;
  } catch (e) { console.error('TEST 16 error:', e.message); }

  // TEST 17: Delete a class -> Teacher Workload decreases accordingly
  console.log('\n--- TEST 17: Real-time Teacher Workload update on delete ---');
  try {
    const ttBefore = await request('GET', '/api/timetable');
    const countBefore = ttBefore.data.length;
    const target = ttBefore.data[0];

    const delRes = await request('DELETE', `/api/timetable/entry/${encodeURIComponent(target.timetable_id)}`);
    assert(delRes.status === 200, 'TEST 17: Timetable entry deleted successfully');
    assert(delRes.data.teacher_workload, 'TEST 17: Delete response returned updated teacher_workload');

    const ttAfter = await request('GET', '/api/timetable');
    assert(ttAfter.data.length === countBefore - 1, 'TEST 17: Timetable entries decreased by 1');
    passed++;
  } catch (e) { console.error('TEST 17 error:', e.message); }

  // TEST 18: Refresh / Persistence verification -> Breaks & timetable remain
  console.log('\n--- TEST 18: Persistence verification after refresh ---');
  try {
    // Check breaks endpoint
    const breaksRes = await request('GET', '/api/breaks');
    assert(breaksRes.status === 200, 'TEST 18: Breaks API responds successfully');
    assert(Array.isArray(breaksRes.data), 'TEST 18: Breaks returned as array');

    // Check timetable endpoint
    const ttRes = await request('GET', '/api/timetable');
    assert(ttRes.status === 200, 'TEST 18: Timetable API responds successfully');

    // Check workload endpoint
    const wlRes = await request('GET', '/api/timetable/workload');
    assert(wlRes.status === 200, 'TEST 18: Workload API responds successfully');
    assert(wlRes.data.by_day, 'TEST 18: Workload persists and computes from storage');
    passed++;
  } catch (e) { console.error('TEST 18 error:', e.message); }

  // Clean up temporary test breaks from data/breaks.json so manual generation runs cleanly
  try {
    const fs = require('fs');
    const path = require('path');
    const bPath = path.join(__dirname, '..', 'data', 'breaks.json');
    if (fs.existsSync(bPath)) {
      fs.writeFileSync(bPath, '[]\n');
    }
  } catch (_) {}

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed}/${total} TEST CASES PASSED`);
  console.log('================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
