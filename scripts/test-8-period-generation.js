/**
 * Verification test for 8-period daily classes timetable generation.
 */
const http = require('http');

function postJson(url, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const parsedUrl = new URL(url);
    const req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('Testing 8-period daily timetable generation...');

  // 8 periods per day: 09:00 - 16:20 with lunch break 12:20 - 13:00
  const periods8 = [
    { period: 1, start: '09:00', end: '09:50' },
    { period: 2, start: '09:50', end: '10:40' },
    { period: 3, start: '10:40', end: '11:30' },
    { period: 4, start: '11:30', end: '12:20' },
    { period: 5, start: '13:00', end: '13:50' },
    { period: 6, start: '13:50', end: '14:40' },
    { period: 7, start: '14:40', end: '15:30' },
    { period: 8, start: '15:30', end: '16:20' }
  ];

  const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const day_periods = {};
  workingDays.forEach(d => {
    day_periods[d] = periods8;
  });

  const breaks = workingDays.map(d => ({
    name: 'Lunch Break',
    day: d,
    startTime: '12:20',
    endTime: '13:00',
    type: 'Lunch Break'
  }));

  const payload = {
    department: 'Computer Science & Engineering',
    departmentId: 'Computer Science & Engineering',
    day_periods,
    breaks,
    teachers: [
      { name: 'Dr. Rahul Kumar', subjects: ['DBMS', 'Computer Networks'], is_na: false },
      { name: 'Prof. Ananya Sharma', subjects: ['Data Structures', 'Algorithms'], is_na: false },
      { name: 'Prof. Rajesh Verma', subjects: ['Operating Systems', 'Computer Networks'], is_na: false },
      { name: 'Dr. Alan Turing', subjects: ['Theory of Computation', 'Algorithms'], is_na: false }
    ],
    subjects: [
      { name: 'DBMS', theory_hours: 4, lab_hours: 2 },
      { name: 'Data Structures', theory_hours: 4, lab_hours: 2 },
      { name: 'Operating Systems', theory_hours: 4, lab_hours: 0 },
      { name: 'Computer Networks', theory_hours: 4, lab_hours: 0 },
      { name: 'Theory of Computation', theory_hours: 4, lab_hours: 0 },
      { name: 'Algorithms', theory_hours: 4, lab_hours: 0 }
    ],
    sections: [
      { name: 'CSE-A' },
      { name: 'CSE-B' }
    ],
    rooms: [
      { room_number: 'Room 201', room_type: 'Classroom' },
      { room_number: 'Room 202', room_type: 'Classroom' },
      { room_number: 'Lab-A', room_type: 'Laboratory' }
    ],
    room_type: 'Classroom',
    lab_classes: [
      {
        subject: 'DBMS',
        teacher: 'Dr. Rahul Kumar',
        sections: ['CSE-A'],
        section_mode: 'separate',
        days: ['Monday'],
        day_mode: 'every',
        startTime: '09:00',
        endTime: '10:40',
        duration: 2,
        room: 'Lab-A'
      },
      {
        subject: 'DBMS',
        teacher: 'Dr. Rahul Kumar',
        sections: ['CSE-B'],
        section_mode: 'separate',
        days: ['Tuesday'],
        day_mode: 'every',
        startTime: '09:00',
        endTime: '10:40',
        duration: 2,
        room: 'Lab-A'
      },
      {
        subject: 'Data Structures',
        teacher: 'Prof. Ananya Sharma',
        sections: ['CSE-A'],
        section_mode: 'separate',
        days: ['Wednesday'],
        day_mode: 'every',
        startTime: '09:00',
        endTime: '10:40',
        duration: 2,
        room: 'Lab-A'
      },
      {
        subject: 'Data Structures',
        teacher: 'Prof. Ananya Sharma',
        sections: ['CSE-B'],
        section_mode: 'separate',
        days: ['Thursday'],
        day_mode: 'every',
        startTime: '09:00',
        endTime: '10:40',
        duration: 2,
        room: 'Lab-A'
      }
    ],
    working_days: workingDays,
    working_days_per_week: 5,
    working_start_time: '09:00',
    working_end_time: '16:20'
  };

  const res = await postJson('http://localhost:3000/api/generate', payload);
  console.log('HTTP Status:', res.status);
  console.log('Result Status:', res.body.status);
  console.log('Entries Created:', res.body.entries_created);
  console.log('Conflicts Count:', res.body.conflicts ? res.body.conflicts.length : 0);
  if (res.body.conflicts && res.body.conflicts.length > 0) {
    console.log('Conflicts:', JSON.stringify(res.body.conflicts.slice(0, 5), null, 2));
  }

  if (res.body.status === 'VALID' && (!res.body.conflicts || res.body.conflicts.length === 0)) {
    console.log('SUCCESS: 8-period timetable generated cleanly with ZERO conflicts!');
  } else {
    console.error('FAILED: Timetable had conflicts or unexpected status.');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
