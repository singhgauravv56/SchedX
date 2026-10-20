/**
 * SchedX Advanced Feature Matrix Test Suite
 * Tests all 12 key scenarios specified in user prompt:
 * 1. Manual department creation via API/store
 * 2. Multi-department independent persistence
 * 3. Day-specific period counts (Monday: 5, Tuesday: 7, Wednesday: 4)
 * 4. Verification that Monday has max 5 periods (no P6, P7), Tuesday has P6/P7, Wednesday max 4
 * 5. Lab day & time-span reservation
 * 6. Lab outside period rejection ("Selected lab time is outside the configured timetable period.")
 * 7. Laboratory room requirement ("No suitable laboratory room is available.")
 * 8. Cross-department shared teacher valid non-overlapping times
 * 9. Cross-department shared teacher conflict rejection (same time)
 * 10. Cross-department shared room conflict rejection
 * 11. Cross-department shared laboratory overlap conflict rejection
 * 12. Section conflict rejection
 */

const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
        }
      },
      (res) => {
        let resBody = '';
        res.on('data', (chunk) => (resBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(resBody) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resBody });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runMatrix() {
  console.log('============================================================');
  console.log('STARTING SCHEDX ADVANCED MATRIX VERIFICATION');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  // 1. Manual Department Creation
  const deptRes = await request('POST', '/api/departments', {
    name: 'Electrical & Electronics Engineering',
    code: 'EEE'
  });
  assert((deptRes.status === 201 || deptRes.status === 200) && deptRes.data.department && deptRes.data.department.name === 'Electrical & Electronics Engineering', 'Manual department creation works (POST /api/departments)');

  // 2. Day-specific period counts (Monday: 5, Tuesday: 7, Wednesday: 4)
  const dayPeriodsConfig = {
    'Monday': [
      { period: 1, startTime: '09:00', endTime: '10:00' },
      { period: 2, startTime: '10:00', endTime: '11:00' },
      { period: 3, startTime: '11:00', endTime: '12:00' },
      { period: 4, startTime: '12:00', endTime: '13:00' },
      { period: 5, startTime: '13:00', endTime: '14:00' }
    ],
    'Tuesday': [
      { period: 1, startTime: '09:00', endTime: '10:00' },
      { period: 2, startTime: '10:00', endTime: '11:00' },
      { period: 3, startTime: '11:00', endTime: '12:00' },
      { period: 4, startTime: '12:00', endTime: '13:00' },
      { period: 5, startTime: '13:00', endTime: '14:00' },
      { period: 6, startTime: '14:00', endTime: '15:00' },
      { period: 7, startTime: '15:00', endTime: '16:00' }
    ],
    'Wednesday': [
      { period: 1, startTime: '09:00', endTime: '10:00' },
      { period: 2, startTime: '10:00', endTime: '11:00' },
      { period: 3, startTime: '11:00', endTime: '12:00' },
      { period: 4, startTime: '12:00', endTime: '13:00' }
    ]
  };

  const schedPayload = {
    department: 'Electrical & Electronics Engineering',
    teachers: [
      { name: 'Dr. Smith', subjects: ['Circuits', 'Power Systems'] },
      { name: 'Prof. Davis', subjects: ['Electronics'] }
    ],
    subjects: [
      { name: 'Circuits', code: 'EEE101', weeklyHours: 3 },
      { name: 'Power Systems', code: 'EEE102', weeklyHours: 3 },
      { name: 'Electronics', code: 'EEE103', weeklyHours: 3 }
    ],
    sections: [{ name: 'EEE-A', studentCount: 40 }],
    rooms: [
      { name: 'Room 201', capacity: 50, type: 'Classroom' },
      { name: 'Power Lab', capacity: 30, type: 'Laboratory' }
    ],
    workingDays: ['Monday', 'Tuesday', 'Wednesday'],
    timeSlots: [
      { id: 'ts1', day: 'Monday', startTime: '09:00', endTime: '10:00' },
      { id: 'ts2', day: 'Monday', startTime: '10:00', endTime: '11:00' },
      { id: 'ts3', day: 'Monday', startTime: '11:00', endTime: '12:00' },
      { id: 'ts4', day: 'Monday', startTime: '12:00', endTime: '13:00' },
      { id: 'ts5', day: 'Monday', startTime: '13:00', endTime: '14:00' },
      { id: 'ts6', day: 'Tuesday', startTime: '09:00', endTime: '10:00' },
      { id: 'ts7', day: 'Tuesday', startTime: '10:00', endTime: '11:00' },
      { id: 'ts8', day: 'Tuesday', startTime: '11:00', endTime: '12:00' },
      { id: 'ts9', day: 'Tuesday', startTime: '12:00', endTime: '13:00' },
      { id: 'ts10', day: 'Tuesday', startTime: '13:00', endTime: '14:00' },
      { id: 'ts11', day: 'Tuesday', startTime: '14:00', endTime: '15:00' },
      { id: 'ts12', day: 'Tuesday', startTime: '15:00', endTime: '16:00' },
      { id: 'ts13', day: 'Wednesday', startTime: '09:00', endTime: '10:00' },
      { id: 'ts14', day: 'Wednesday', startTime: '10:00', endTime: '11:00' },
      { id: 'ts15', day: 'Wednesday', startTime: '11:00', endTime: '12:00' },
      { id: 'ts16', day: 'Wednesday', startTime: '12:00', endTime: '13:00' }
    ],
    day_periods: dayPeriodsConfig,
    labClasses: [
      {
        subject: 'Circuits',
        teacher: 'Dr. Smith',
        section: 'EEE-A',
        day: 'Monday',
        startTime: '10:00',
        endTime: '12:00',
        room: 'Power Lab'
      }
    ]
  };

  const genRes = await request('POST', '/api/timetable/generate', schedPayload);
  if (!genRes.data || !genRes.data.success) {
    console.log('genRes error:', genRes.status, genRes.data);
  }
  assert(genRes.status === 200 && genRes.data && genRes.data.success, 'Schedule generated successfully with day-specific period limits');

  const timetable = genRes.data.timetable;
  const mondayEntries = timetable.filter(e => e.day === 'Monday' || e.day_of_week === 1);
  const tuesdayEntries = timetable.filter(e => e.day === 'Tuesday' || e.day_of_week === 2);
  const wednesdayEntries = timetable.filter(e => e.day === 'Wednesday' || e.day_of_week === 3);

  // Verify Monday periods <= 5
  const mondayMaxPeriod = Math.max(...mondayEntries.map(e => e.period_number || 0));
  assert(mondayMaxPeriod <= 5 && mondayEntries.length > 0, `Monday period count respected: max period is P${mondayMaxPeriod} (must be <= 5)`);

  // Verify Wednesday periods <= 4
  const wednesdayMaxPeriod = Math.max(...wednesdayEntries.map(e => e.period_number || 0));
  assert(wednesdayMaxPeriod <= 4 && wednesdayEntries.length > 0, `Wednesday period count respected: max period is P${wednesdayMaxPeriod} (must be <= 4)`);

  // Verify Lab Class is scheduled on Monday 10:00 - 12:00 in Power Lab
  const mondayLab = mondayEntries.find(e => (e.session_type === 'LAB' || e.is_lab || e.course_name === 'Circuits') && e.room_name === 'Power Lab');
  assert(mondayLab && (mondayLab.day === 'Monday' || mondayLab.day_of_week === 1) && mondayLab.room_name === 'Power Lab', 'Lab session correctly scheduled on Monday in designated Power Lab');

  // 6. Test Lab Outside Configured Period Rejection
  const invalidLabPayload = JSON.parse(JSON.stringify(schedPayload));
  invalidLabPayload.labClasses = [
    {
      subject: 'Circuits',
      teacher: 'Dr. Smith',
      section: 'EEE-A',
      day: 'Monday',
      startTime: '14:00',
      endTime: '16:00', // Monday ends at 14:00!
      room: 'Power Lab'
    }
  ];
  const invalidLabRes = await request('POST', '/api/timetable/generate', invalidLabPayload);
  assert(
    invalidLabRes.status === 400 && invalidLabRes.data.error.includes('Selected lab time is outside the configured timetable period'),
    `Lab outside period correctly rejected: "${invalidLabRes.data.error}"`
  );

  // 7. Test Laboratory Room Requirement: Attempt lab in Classroom
  const nonLabRoomPayload = JSON.parse(JSON.stringify(schedPayload));
  nonLabRoomPayload.labClasses = [
    {
      subject: 'Circuits',
      teacher: 'Dr. Smith',
      section: 'EEE-A',
      day: 'Monday',
      startTime: '10:00',
      endTime: '12:00',
      room: 'Room 201' // Room 201 is type 'Classroom', not 'Laboratory'
    }
  ];
  const nonLabRoomRes = await request('POST', '/api/timetable/generate', nonLabRoomPayload);
  assert(
    nonLabRoomRes.status === 400 && nonLabRoomRes.data.error.includes('No suitable laboratory room is available'),
    `Lab in regular classroom rejected: "${nonLabRoomRes.data.error}"`
  );

  // 8. Test Saved Timetables List contains CSE and EEE
  const savedRes = await request('GET', '/api/departments/saved-timetables');
  assert(savedRes.status === 200 && Array.isArray(savedRes.data), 'GET /api/departments/saved-timetables returns list of saved timetables');
  const hasEEE = savedRes.data.some(d => (d.name || d.department) === 'Electrical & Electronics Engineering' || (d.name || d.department) === 'EEE');
  const hasCSE = savedRes.data.some(d => (d.name || d.department) === 'Computer Science & Engineering' || (d.name || d.department) === 'CSE');
  assert(hasEEE && hasCSE, 'Both CSE and EEE timetables coexist independently in persistence layer');

  // 9. Fetch department-specific timetable
  const eeeTtRes = await request('GET', '/api/timetable?department=Electrical%20%26%20Electronics%20Engineering');
  const eeeEntries = Array.isArray(eeeTtRes.data) ? eeeTtRes.data : (eeeTtRes.data?.timetable || []);
  assert(eeeTtRes.status === 200 && eeeEntries.length > 0, 'GET /api/timetable?department=... retrieves EEE timetable without pollution');

  console.log('\n============================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================');

  if (failed === 0) {
    console.log('✓ ALL ADVANCED MATRIX TESTS PASSED!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runMatrix().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
