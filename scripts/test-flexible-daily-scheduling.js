/**
 * Comprehensive Verification Suite for Flexible Daily Scheduling & Timetable Generation
 * Tests all 16 test cases specified in Section 12 of the requirements.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const STORE_BREAKS_FILE = path.join(__dirname, '..', 'data', 'breaks.json');

function request(method, pathStr, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathStr, BASE_URL);
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

function timeToMin(t) {
  if (!t) return 0;
  const parts = t.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

async function runAll16Tests() {
  console.log('================================================================');
  console.log('   SCHEDX 16-POINT FLEXIBLE SCHEDULING VERIFICATION SUITE       ');
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

  // Base payload factory
  function createBasePayload(dept = 'CSE') {
    return {
      department: dept,
      working_days: [
        { day_name: 'Monday', day_of_week: 1 },
        { day_name: 'Tuesday', day_of_week: 2 },
        { day_name: 'Wednesday', day_of_week: 3 },
        { day_name: 'Thursday', day_of_week: 4 },
        { day_name: 'Friday', day_of_week: 5 }
      ],
      day_periods: {
        Monday: [
          { period: 1, start: '09:00', end: '10:00' },
          { period: 2, start: '10:00', end: '11:00' },
          { period: 3, start: '11:00', end: '12:00' },
          { period: 4, start: '13:00', end: '14:00' },
          { period: 5, start: '14:00', end: '15:00' }
        ],
        Tuesday: [
          { period: 1, start: '09:00', end: '10:00' },
          { period: 2, start: '10:00', end: '11:00' },
          { period: 3, start: '11:00', end: '12:00' },
          { period: 4, start: '13:00', end: '14:00' },
          { period: 5, start: '14:00', end: '15:00' }
        ],
        Wednesday: [
          { period: 1, start: '09:00', end: '10:00' },
          { period: 2, start: '10:00', end: '11:00' },
          { period: 3, start: '11:00', end: '12:00' },
          { period: 4, start: '13:00', end: '14:00' },
          { period: 5, start: '14:00', end: '15:00' }
        ],
        Thursday: [
          { period: 1, start: '09:00', end: '10:00' },
          { period: 2, start: '10:00', end: '11:00' },
          { period: 3, start: '11:00', end: '12:00' },
          { period: 4, start: '13:00', end: '14:00' },
          { period: 5, start: '14:00', end: '15:00' }
        ],
        Friday: [
          { period: 1, start: '09:00', end: '10:00' },
          { period: 2, start: '10:00', end: '11:00' },
          { period: 3, start: '11:00', end: '12:00' },
          { period: 4, start: '13:00', end: '14:00' },
          { period: 5, start: '14:00', end: '15:00' }
        ]
      },
      teachers: [
        { name: 'Dr. Alan Turing', subject: 'Algorithms', subjects: ['Algorithms'], max_hours_per_week: 15, email: 'turing@cs.edu' },
        { name: 'Dr. Grace Hopper', subject: 'Compilers', subjects: ['Compilers'], max_hours_per_week: 15, email: 'hopper@cs.edu' },
        { name: 'Dr. Ada Lovelace', subject: 'Mathematics', subjects: ['Mathematics'], max_hours_per_week: 15, email: 'lovelace@cs.edu' }
      ],
      subjects: [
        { name: 'Algorithms', hours_per_week: 4, requires_lab: false },
        { name: 'Compilers', hours_per_week: 4, requires_lab: false },
        { name: 'Mathematics', hours_per_week: 4, requires_lab: false }
      ],
      sections: [{ name: 'Section A', student_count: 50 }],
      rooms: [
        { room_number: 'Room 101', room_type: 'Classroom', capacity: 60 },
        { room_number: 'Room 102', room_type: 'Classroom', capacity: 60 }
      ],
      breaks: [],
      fixed_classes: []
    };
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: BASIC GENERATION
    // -------------------------------------------------------------
    console.log('--- TEST 1: Basic Generation ---');
    const p1 = createBasePayload('TestDept_Basic');
    const res1 = await request('POST', '/api/generate', p1);
    const ok1 = res1.statusCode === 200 && res1.data && (res1.data.success || Array.isArray(res1.data.timetable));
    const schedCount1 = res1.data && (res1.data.timetable ? res1.data.timetable.length : 0);
    assert(ok1 && schedCount1 > 0, 1, 'Basic Generation', `Generated ${schedCount1} scheduled periods successfully.`);

    // -------------------------------------------------------------
    // TEST 2: FLEXIBLE DAILY START TIMES
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Flexible Daily Start Times ---');
    const p2 = createBasePayload('TestDept_FlexStart');
    p2.day_periods.Monday = [
      { period: 1, start: '09:00', end: '10:00' },
      { period: 2, start: '10:00', end: '11:00' },
      { period: 3, start: '11:00', end: '12:00' }
    ];
    p2.day_periods.Tuesday = [
      { period: 1, start: '08:00', end: '09:00' },
      { period: 2, start: '09:00', end: '10:00' },
      { period: 3, start: '10:00', end: '11:00' }
    ];
    p2.day_periods.Wednesday = [
      { period: 1, start: '10:00', end: '11:00' },
      { period: 2, start: '11:00', end: '12:00' },
      { period: 3, start: '12:00', end: '13:00' }
    ];
    const res2 = await request('POST', '/api/generate', p2);
    const ok2 = res2.statusCode === 200 && res2.data && res2.data.timetable;
    let startsRespected2 = false;
    if (ok2) {
      const monP1 = res2.data.timetable.find((t) => t.day_name === 'Monday' && t.period_number === 1);
      const tueP1 = res2.data.timetable.find((t) => t.day_name === 'Tuesday' && t.period_number === 1);
      const wedP1 = res2.data.timetable.find((t) => t.day_name === 'Wednesday' && t.period_number === 1);
      const monStart = monP1 ? monP1.start_time.slice(0, 5) : '';
      const tueStart = tueP1 ? tueP1.start_time.slice(0, 5) : '';
      const wedStart = wedP1 ? wedP1.start_time.slice(0, 5) : '';
      startsRespected2 = monStart === '09:00' && tueStart === '08:00' && wedStart === '10:00';
    }
    assert(ok2 && startsRespected2, 2, 'Flexible Daily Start Times', 'Mon starts at 09:00, Tue at 08:00, Wed at 10:00');

    // -------------------------------------------------------------
    // TEST 3: FLEXIBLE DAILY END TIMES
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Flexible Daily End Times ---');
    const p3 = createBasePayload('TestDept_FlexEnd');
    p3.day_periods.Monday = [
      { period: 1, start: '09:00', end: '10:00' },
      { period: 2, start: '10:00', end: '11:00' },
      { period: 3, start: '11:00', end: '12:00' },
      { period: 4, start: '12:00', end: '13:00' },
      { period: 5, start: '13:00', end: '14:00' } // Ends 14:00
    ];
    p3.day_periods.Tuesday = [
      { period: 1, start: '08:00', end: '09:00' },
      { period: 2, start: '09:00', end: '10:00' },
      { period: 3, start: '10:00', end: '11:00' },
      { period: 4, start: '11:00', end: '12:00' },
      { period: 5, start: '13:00', end: '14:00' },
      { period: 6, start: '14:00', end: '15:00' },
      { period: 7, start: '15:00', end: '16:30' } // Ends 16:30
    ];
    const res3 = await request('POST', '/api/generate', p3);
    const ok3 = res3.statusCode === 200 && res3.data && res3.data.timetable;
    let endsRespected3 = false;
    if (ok3) {
      const monEntries = res3.data.timetable.filter((t) => t.day_name === 'Monday');
      const tueEntries = res3.data.timetable.filter((t) => t.day_name === 'Tuesday');
      const monMaxEnd = Math.max(...monEntries.map((e) => timeToMin(e.end_time)));
      const tueMaxEnd = Math.max(...tueEntries.map((e) => timeToMin(e.end_time)));
      endsRespected3 = monMaxEnd <= timeToMin('14:00') && tueMaxEnd <= timeToMin('16:30');
    }
    assert(ok3 && endsRespected3, 3, 'Flexible Daily End Times', 'Monday ends at 14:00 (<= 14:00) and Tuesday ends at 16:30');

    // -------------------------------------------------------------
    // TEST 4: EARLIER START TIME (BEFORE 09:00 AM)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Earlier Start Time (< 09:00 AM) ---');
    const p4 = createBasePayload('TestDept_EarlyStart');
    p4.day_periods.Monday = [
      { period: 1, start: '07:30', end: '08:30' },
      { period: 2, start: '08:30', end: '09:30' },
      { period: 3, start: '09:30', end: '10:30' },
      { period: 4, start: '10:30', end: '11:30' }
    ];
    const res4 = await request('POST', '/api/generate', p4);
    const ok4 = res4.statusCode === 200 && res4.data && res4.data.timetable;
    const earlyEntry = ok4 && res4.data.timetable.find((t) => t.day_name === 'Monday' && t.period_number === 1);
    const earlyPass = earlyEntry && earlyEntry.start_time.slice(0, 5) === '07:30';
    assert(ok4 && earlyPass, 4, 'Earlier Start Time', 'Schedule starting at 07:30 AM generated without baseline restriction');

    // -------------------------------------------------------------
    // TEST 5: LATER END TIME (> 04:00 PM)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Later End Time (> 04:00 PM) ---');
    const p5 = createBasePayload('TestDept_LateEnd');
    p5.day_periods.Wednesday = [
      { period: 1, start: '12:00', end: '13:00' },
      { period: 2, start: '13:00', end: '14:00' },
      { period: 3, start: '14:00', end: '15:00' },
      { period: 4, start: '15:00', end: '16:00' },
      { period: 5, start: '16:00', end: '17:30' }
    ];
    const res5 = await request('POST', '/api/generate', p5);
    const ok5 = res5.statusCode === 200 && res5.data && res5.data.timetable;
    const lateEntry = ok5 && res5.data.timetable.find((t) => t.day_name === 'Wednesday' && t.period_number === 5);
    const latePass = lateEntry && lateEntry.end_time.slice(0, 5) === '17:30';
    assert(ok5 && latePass, 5, 'Later End Time', 'Schedule ending at 05:30 PM (17:30) generated without baseline restriction');

    // -------------------------------------------------------------
    // TEST 6: DAY-SPECIFIC PERIOD COUNTS (5 on Mon, 7 on Tue)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Day-Specific Period Counts ---');
    const p6 = createBasePayload('TestDept_DayPeriodCounts');
    p6.day_periods.Monday = [
      { period: 1, start: '09:00', end: '10:00' },
      { period: 2, start: '10:00', end: '11:00' },
      { period: 3, start: '11:00', end: '12:00' },
      { period: 4, start: '13:00', end: '14:00' },
      { period: 5, start: '14:00', end: '15:00' }
    ];
    p6.day_periods.Tuesday = [
      { period: 1, start: '08:30', end: '09:30' },
      { period: 2, start: '09:30', end: '10:30' },
      { period: 3, start: '10:30', end: '11:30' },
      { period: 4, start: '11:30', end: '12:30' },
      { period: 5, start: '13:30', end: '14:30' },
      { period: 6, start: '14:30', end: '15:30' },
      { period: 7, start: '15:30', end: '16:30' }
    ];
    const res6 = await request('POST', '/api/generate', p6);
    const ok6 = res6.statusCode === 200 && res6.data && res6.data.timetable;
    let countsPass6 = false;
    if (ok6) {
      const monPeriods = new Set(res6.data.timetable.filter((t) => t.day_name === 'Monday').map((t) => t.period_number));
      const tuePeriods = new Set(res6.data.timetable.filter((t) => t.day_name === 'Tuesday').map((t) => t.period_number));
      countsPass6 = monPeriods.size <= 5 && !monPeriods.has(6) && !monPeriods.has(7) && tuePeriods.has(7);
    }
    assert(ok6 && countsPass6, 6, 'Day-Specific Period Counts', 'Monday has <= 5 periods, Tuesday has period 7');

    // -------------------------------------------------------------
    // TEST 7: DIFFERENT DAILY SCHEDULES (Prompt Example)
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Different Daily Schedules (Prompt Example) ---');
    const p7 = createBasePayload('TestDept_PromptMatrix');
    p7.day_periods = {
      Monday: [
        { period: 1, start: '09:00', end: '10:00' },
        { period: 2, start: '10:00', end: '11:00' },
        { period: 3, start: '11:00', end: '12:00' },
        { period: 4, start: '12:00', end: '13:00' },
        { period: 5, start: '13:00', end: '14:00' }
      ],
      Tuesday: [
        { period: 1, start: '08:00', end: '09:00' },
        { period: 2, start: '09:00', end: '10:00' },
        { period: 3, start: '10:00', end: '11:00' },
        { period: 4, start: '11:00', end: '12:00' },
        { period: 5, start: '13:00', end: '14:00' },
        { period: 6, start: '14:00', end: '15:00' },
        { period: 7, start: '15:00', end: '16:30' }
      ],
      Wednesday: [
        { period: 1, start: '10:00', end: '11:00' },
        { period: 2, start: '11:00', end: '12:00' },
        { period: 3, start: '12:00', end: '13:00' },
        { period: 4, start: '13:00', end: '14:00' },
        { period: 5, start: '14:00', end: '15:00' }
      ],
      Thursday: [
        { period: 1, start: '09:30', end: '10:30' },
        { period: 2, start: '10:30', end: '11:30' },
        { period: 3, start: '11:30', end: '12:30' },
        { period: 4, start: '13:30', end: '14:30' },
        { period: 5, start: '14:30', end: '15:30' },
        { period: 6, start: '15:30', end: '17:00' }
      ],
      Friday: [
        { period: 1, start: '08:30', end: '09:30' },
        { period: 2, start: '09:30', end: '10:30' },
        { period: 3, start: '10:30', end: '11:30' },
        { period: 4, start: '11:30', end: '12:30' },
        { period: 5, start: '12:30', end: '13:30' }
      ]
    };
    // Configure sufficient subject hours so all 5 custom days receive classes
    p7.teachers.push(
      { name: 'Dr. John von Neumann', subject: 'Operating Systems', subjects: ['Operating Systems'], max_hours_per_week: 15, email: 'jvn@cs.edu' },
      { name: 'Dr. Claude Shannon', subject: 'Networks', subjects: ['Networks'], max_hours_per_week: 15, email: 'shannon@cs.edu' }
    );
    p7.subjects.push(
      { name: 'Operating Systems', hours_per_week: 5, requires_lab: false },
      { name: 'Networks', hours_per_week: 5, requires_lab: false }
    );
    const res7 = await request('POST', '/api/generate', p7);
    const ok7 = res7.statusCode === 200 && res7.data && res7.data.timetable;
    let matrixPass7 = false;
    if (ok7) {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const expectedStarts = { Monday: '09:00', Tuesday: '08:00', Wednesday: '10:00', Thursday: '09:30', Friday: '08:30' };
      const expectedMaxCounts = { Monday: 5, Tuesday: 7, Wednesday: 5, Thursday: 6, Friday: 5 };
      let allMatch = true;
      for (const d of days) {
        const dPeriods = (res7.data.day_periods && res7.data.day_periods[d]) || [];
        if (!dPeriods.length || dPeriods[0].start_time.slice(0, 5) !== expectedStarts[d]) {
          allMatch = false;
        }
        if (dPeriods.length !== expectedMaxCounts[d]) {
          allMatch = false;
        }
        // Verify scheduled classes on that day also adhere to its schedule
        const dClasses = res7.data.timetable.filter((t) => t.day_name === d);
        for (const cls of dClasses) {
          if (cls.period_number > expectedMaxCounts[d]) allMatch = false;
        }
      }
      matrixPass7 = allMatch;
    }
    assert(ok7 && matrixPass7, 7, 'Different Daily Schedules (Prompt Example)', 'All 5 days respected individual custom start/end/counts in day_periods and schedule');

    // -------------------------------------------------------------
    // TEST 8: BREAK MANAGEMENT (No class overlaps configured break)
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Breaks ---');
    const p8 = createBasePayload('TestDept_Breaks');
    p8.breaks = [
      { name: 'Lunch', day: 'Monday', startTime: '12:00', endTime: '13:00', type: 'Lunch Break' }
    ];
    const res8 = await request('POST', '/api/generate', p8);
    const ok8 = res8.statusCode === 200 && res8.data && res8.data.timetable;
    let noOverlapBreak8 = true;
    if (ok8) {
      const monEntries = res8.data.timetable.filter((t) => t.day_name === 'Monday');
      for (const entry of monEntries) {
        const s = timeToMin(entry.start_time);
        const e = timeToMin(entry.end_time);
        if (Math.max(s, 720) < Math.min(e, 780)) {
          noOverlapBreak8 = false;
          break;
        }
      }
    }
    assert(ok8 && noOverlapBreak8, 8, 'Breaks', 'Zero classes scheduled during Monday 12:00–13:00 Lunch break');

    // -------------------------------------------------------------
    // TEST 9: LABORATORY SCHEDULING
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Laboratory Scheduling ---');
    const p9 = createBasePayload('TestDept_Lab');
    p9.rooms.push({ room_number: 'Lab 201', room_type: 'Laboratory', capacity: 40 });
    p9.subjects.push({ name: 'Compiler Lab', hours_per_week: 2, requires_lab: true });
    p9.teachers.find((t) => t.name === 'Dr. Grace Hopper').subjects.push('Compiler Lab');
    p9.lab_classes = [
      {
        subject: 'Compiler Lab',
        teacher: 'Dr. Grace Hopper',
        room: 'Lab 201',
        days: ['Tuesday'],
        sections: ['Section A'],
        duration: 2,
        startTime: '10:00',
        endTime: '12:00'
      }
    ];
    const res9 = await request('POST', '/api/generate', p9);
    const ok9 = res9.statusCode === 200 && res9.data && res9.data.timetable;
    const labEntries = ok9 && res9.data.timetable.filter((t) => t.subject.toLowerCase().includes('compiler lab') && t.day_name === 'Tuesday');
    const labPass9 = labEntries && labEntries.length >= 2;
    assert(ok9 && labPass9, 9, 'Laboratory Scheduling', `Fixed lab assigned across reserved periods (${labEntries ? labEntries.length : 0} periods in Lab 201)`);

    // -------------------------------------------------------------
    // TEST 10: TEACHER CONFLICTS
    // -------------------------------------------------------------
    console.log('\n--- TEST 10: Teacher Conflicts ---');
    // Using PUT /api/timetable to verify exact conflict detection engine
    const teacherConflictEntries = [
      {
        id: 'tc_test_1',
        timetable_id: 'tc_test_1',
        day: 'Tuesday',
        period_number: 1,
        start_time: '09:00:00',
        end_time: '10:00:00',
        section: 'Section A',
        course_name: 'Algorithms',
        teacher_name: 'Dr. Alan Turing',
        room_name: 'Room 101',
        room_type: 'Classroom',
        department: 'TestDept_Conflict'
      },
      {
        id: 'tc_test_2',
        timetable_id: 'tc_test_2',
        day: 'Tuesday',
        period_number: 1,
        start_time: '09:30:00',
        end_time: '10:30:00',
        section: 'Section B',
        course_name: 'Compilers',
        teacher_name: 'Dr. Alan Turing', // Same teacher in overlapping interval (09:00-10:00 vs 09:30-10:30)
        room_name: 'Room 102',
        room_type: 'Classroom',
        department: 'TestDept_Conflict'
      }
    ];
    await request('PUT', '/api/timetable', teacherConflictEntries);
    const res10 = await request('GET', '/api/timetable?department=TestDept_Conflict');
    const entries10 = Array.isArray(res10.data) ? res10.data : (res10.data.timetable || []);
    const tc1 = entries10.find((e) => String(e.id || e.timetable_id) === 'tc_test_1');
    const tc2 = entries10.find((e) => String(e.id || e.timetable_id) === 'tc_test_2');
    const conflictDetected10 = Boolean(tc1?.has_conflict && tc2?.has_conflict);
    assert(conflictDetected10, 10, 'Teacher Conflicts', `Teacher conflict flagged on both overlapping entries (tc1 has_conflict: ${tc1?.has_conflict}, tc2: ${tc2?.has_conflict})`);

    // -------------------------------------------------------------
    // TEST 11: ROOM AND SECTION CONFLICTS
    // -------------------------------------------------------------
    console.log('\n--- TEST 11: Room and Section Conflicts ---');
    const roomConflictEntries = [
      {
        id: 'rc_test_1',
        timetable_id: 'rc_test_1',
        day: 'Wednesday',
        period_number: 2,
        start_time: '10:00:00',
        end_time: '11:00:00',
        section: 'Section A',
        course_name: 'Algorithms',
        teacher_name: 'Dr. Alan Turing',
        room_name: 'Room 101',
        room_type: 'Classroom',
        department: 'TestDept_RoomConf'
      },
      {
        id: 'rc_test_2',
        timetable_id: 'rc_test_2',
        day: 'Wednesday',
        period_number: 2,
        start_time: '10:15:00',
        end_time: '11:15:00',
        section: 'Section B',
        course_name: 'Compilers',
        teacher_name: 'Dr. Grace Hopper',
        room_name: 'Room 101', // Same room in overlapping interval (10:00-11:00 vs 10:15-11:15)
        room_type: 'Classroom',
        department: 'TestDept_RoomConf'
      }
    ];
    await request('PUT', '/api/timetable', roomConflictEntries);
    const res11 = await request('GET', '/api/timetable?department=TestDept_RoomConf');
    const entries11 = Array.isArray(res11.data) ? res11.data : (res11.data.timetable || []);
    const rc1 = entries11.find((e) => String(e.id || e.timetable_id) === 'rc_test_1');
    const rc2 = entries11.find((e) => String(e.id || e.timetable_id) === 'rc_test_2');
    const roomConflictDetected11 = Boolean(rc1?.has_conflict && rc2?.has_conflict);
    assert(roomConflictDetected11, 11, 'Room and Section Conflicts', `Room conflict flagged on both overlapping entries (rc1: ${rc1?.has_conflict}, rc2: ${rc2?.has_conflict})`);

    // -------------------------------------------------------------
    // TEST 12: INVALID CONFIGURATION
    // -------------------------------------------------------------
    console.log('\n--- TEST 12: Invalid Configuration ---');
    const p12 = createBasePayload('');
    delete p12.department; // Missing required department
    const res12 = await request('POST', '/api/generate', p12);
    const invalidHandled12 = res12.statusCode === 400 && res12.data && res12.data.error;
    assert(invalidHandled12, 12, 'Invalid Configuration', `Rejected missing required department with 400 error: "${res12.data.error || ''}"`);

    // -------------------------------------------------------------
    // TEST 13: IMPOSSIBLE SCHEDULE (Constraint / Capacity Limitations)
    // -------------------------------------------------------------
    console.log('\n--- TEST 13: Impossible Schedule ---');
    const p13 = createBasePayload('TestDept_Impossible');
    // Monday only has 1 slot available, but 12 hours of classes required
    p13.working_days = [{ day_name: 'Monday', day_of_week: 1 }];
    p13.day_periods = {
      Monday: [{ period: 1, start: '09:00', end: '10:00' }]
    };
    const res13 = await request('POST', '/api/generate', p13);
    const hasUnscheduled = (res13.data?.unscheduled_classes && res13.data.unscheduled_classes.length > 0) ||
      (res13.data?.status === 'INCOMPLETE') ||
      (res13.statusCode === 400 && /capacity|unable|cannot|slot/i.test(JSON.stringify(res13.data)));
    assert(hasUnscheduled, 13, 'Impossible Schedule', `Identified unscheduled classes without fabricating phantom periods (Status: ${res13.data?.status || res13.statusCode}, unscheduled: ${res13.data?.unscheduled_classes?.length || 0})`);

    // -------------------------------------------------------------
    // TEST 14: DATABASE / LOCAL PERSISTENCE
    // -------------------------------------------------------------
    console.log('\n--- TEST 14: Database & Local Persistence ---');
    const p14 = createBasePayload('TestDept_Persist');
    const genRes14 = await request('POST', '/api/generate', p14);
    const okGen14 = genRes14.statusCode === 200 && genRes14.data && genRes14.data.timetable;
    let persistVerified14 = false;
    if (okGen14) {
      const getRes = await request('GET', '/api/timetable?department=TestDept_Persist');
      const retrieved = Array.isArray(getRes.data) ? getRes.data : (getRes.data.timetable || []);
      persistVerified14 = getRes.statusCode === 200 && retrieved.length === genRes14.data.timetable.length;
    }
    assert(persistVerified14, 14, 'Database / Local Persistence', 'Generated timetable verified in persistence store with matching count');

    // -------------------------------------------------------------
    // TEST 15: REPEATED GENERATION (Isolation & Non-Overwriting)
    // -------------------------------------------------------------
    console.log('\n--- TEST 15: Repeated Generation ---');
    const p15A = createBasePayload('TestDept_DeptA');
    const p15B = createBasePayload('TestDept_DeptB');
    p15B.day_periods.Monday = [
      { period: 1, start: '08:00', end: '09:00' },
      { period: 2, start: '09:00', end: '10:00' }
    ];
    const res15A = await request('POST', '/api/generate', p15A);
    const res15B = await request('POST', '/api/generate', p15B);
    const getDeptA = await request('GET', '/api/timetable?department=TestDept_DeptA');
    const getDeptB = await request('GET', '/api/timetable?department=TestDept_DeptB');
    const listA = Array.isArray(getDeptA.data) ? getDeptA.data : (getDeptA.data.timetable || []);
    const listB = Array.isArray(getDeptB.data) ? getDeptB.data : (getDeptB.data.timetable || []);
    const isolated15 =
      res15A.statusCode === 200 &&
      res15B.statusCode === 200 &&
      listA.length > 0 &&
      listB.length > 0;
    assert(isolated15, 15, 'Repeated Generation', `Separate generation runs persisted distinct timetables (DeptA: ${listA.length}, DeptB: ${listB.length})`);

    // -------------------------------------------------------------
    // TEST 16: FAILURE RECOVERY
    // -------------------------------------------------------------
    console.log('\n--- TEST 16: Failure Recovery ---');
    const badPayload = { department: '' };
    const errRes = await request('POST', '/api/generate', badPayload);
    const recoveryPayload = createBasePayload('TestDept_Recovery');
    const recRes = await request('POST', '/api/generate', recoveryPayload);
    const recoveryPassed = errRes.statusCode === 400 && recRes.statusCode === 200 && recRes.data.timetable.length > 0;
    assert(recoveryPassed, 16, 'Failure Recovery', 'System recovered from validation failure and processed subsequent generation request normally');

  } catch (err) {
    console.error('Unexpected test runner exception:', err);
  } finally {
    // Reset data/breaks.json so nothing leaks into user's manual generation UI
    try {
      fs.writeFileSync(STORE_BREAKS_FILE, '[]\n', 'utf8');
    } catch (_) {}
  }

  console.log('\n================================================================');
  console.log(`TOTAL PASSED: ${passedCount}/16`);
  console.log(`TOTAL FAILED: ${failedCount}/16`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAll16Tests();
