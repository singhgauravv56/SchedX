const http = require('http');
const assert = require('assert');

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

async function runLabFixTests() {
  console.log('============================================================');
  console.log('Testing Lab Timetable Period Fixes');
  console.log('============================================================\n');

  let passed = 0;
  let total = 0;

  // Test 1: Afternoon lab (14:00-16:00) with default 7 weekday periods generates successfully
  total++;
  try {
    const res = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: [
        { name: 'Dr. Sharma', subjects: ['DBMS'] },
        { name: 'Prof. Verma', subjects: ['DSA'] }
      ],
      subjects: ['DBMS', 'DSA'],
      sections: [{ name: 'CSE-A' }],
      rooms: [
        { room_number: '101', room_type: 'Classroom' },
        { room_number: 'Lab-1', room_type: 'Laboratory' }
      ],
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      start_time: '09:00',
      end_time: '16:00',
      period_count: 7,
      lab_classes: [
        {
          subject: 'DBMS',
          teacher: 'Dr. Sharma',
          section: 'CSE-A',
          day: 'Monday',
          days: ['Monday'],
          day_mode: 'every',
          start_time: '14:00',
          end_time: '16:00',
          duration: 2,
          room: 'Lab-1'
        }
      ]
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.entries_created > 0);
    const labEntry = res.data.timetable.find((e) => e.is_lab || (e.subject === 'DBMS' && e.room === 'Lab-1'));
    assert(labEntry, 'Lab entry found in generated timetable');
    console.log(`✓ PASS 1: Afternoon lab (14:00–16:00) scheduled on Monday: ${labEntry.start_time}–${labEntry.end_time}`);
    passed++;
  } catch (err) {
    console.error('✗ FAIL 1:', err.message);
  }

  // Test 2: Lab outside periods (e.g. 14:00-16:00 on day with 5 periods 09:00-14:00) gives clear, actionable error
  total++;
  try {
    const res = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: [{ name: 'Dr. Sharma', subjects: ['DBMS'] }],
      subjects: ['DBMS'],
      sections: [{ name: 'CSE-A' }],
      rooms: [
        { room_number: '101', room_type: 'Classroom' },
        { room_number: 'Lab-1', room_type: 'Laboratory' }
      ],
      working_days: ['Monday'],
      start_time: '09:00',
      end_time: '14:00',
      period_count: 5,
      day_periods: {
        Monday: [
          { period: 1, start: '09:00', end: '10:00' },
          { period: 2, start: '10:00', end: '11:00' },
          { period: 3, start: '11:00', end: '12:00' },
          { period: 4, start: '12:00', end: '13:00' },
          { period: 5, start: '13:00', end: '14:00' }
        ]
      },
      lab_classes: [
        {
          subject: 'DBMS',
          teacher: 'Dr. Sharma',
          section: 'CSE-A',
          day: 'Monday',
          days: ['Monday'],
          day_mode: 'every',
          start_time: '14:00',
          end_time: '16:00',
          duration: 2,
          room: 'Lab-1'
        }
      ]
    });

    assert.strictEqual(res.status, 400);
    assert(res.data.error.includes('Selected lab time is outside the configured timetable period'), 'Includes contract string');
    assert(res.data.error.includes('Monday'), 'Mentions specific day name');
    assert(res.data.error.includes('09:00') && res.data.error.includes('14:00'), 'Mentions day period boundaries');
    console.log(`✓ PASS 2: Clear actionable error returned when lab exceeds periods: "${res.data.error}"`);
    passed++;
  } catch (err) {
    console.error('✗ FAIL 2:', err.message);
  }

  // Test 3: Single mode scheduling on suitable day when another candidate day has shorter periods
  total++;
  try {
    const res = await request('POST', '/api/generate', {
      department: 'Computer Science & Engineering',
      teachers: [
        { name: 'Dr. Sharma', subjects: ['DBMS'] },
        { name: 'Prof. Verma', subjects: ['DSA'] }
      ],
      subjects: ['DBMS', 'DSA'],
      sections: [{ name: 'CSE-A' }],
      rooms: [
        { room_number: '101', room_type: 'Classroom' },
        { room_number: 'Lab-1', room_type: 'Laboratory' }
      ],
      working_days: ['Monday', 'Tuesday'],
      start_time: '09:00',
      end_time: '16:00',
      day_periods: {
        Monday: [
          { period: 1, start: '09:00', end: '10:00' },
          { period: 2, start: '10:00', end: '11:00' },
          { period: 3, start: '11:00', end: '12:00' },
          { period: 4, start: '12:00', end: '13:00' },
          { period: 5, start: '13:00', end: '14:00' } // Ends at 14:00
        ],
        Tuesday: [
          { period: 1, start: '09:00', end: '10:00' },
          { period: 2, start: '10:00', end: '11:00' },
          { period: 3, start: '11:00', end: '12:00' },
          { period: 4, start: '12:00', end: '13:00' },
          { period: 5, start: '13:00', end: '14:00' },
          { period: 6, start: '14:00', end: '15:00' },
          { period: 7, start: '15:00', end: '16:00' } // Ends at 16:00
        ]
      },
      lab_classes: [
        {
          subject: 'DBMS',
          teacher: 'Dr. Sharma',
          section: 'CSE-A',
          day_mode: 'single', // Suitable day mode
          days: ['Monday', 'Tuesday'],
          start_time: '14:00',
          end_time: '16:00',
          duration: 2,
          room: 'Lab-1'
        }
      ]
    });

    assert.strictEqual(res.status, 200);
    const labEntry = res.data.timetable.find((e) => e.is_lab || (e.subject === 'DBMS' && e.room === 'Lab-1'));
    assert(labEntry, 'Lab entry found in single mode');
    assert.strictEqual(labEntry.day_name || labEntry.day, 'Tuesday', 'Lab correctly placed on Tuesday which can accommodate 14:00-16:00');
    console.log(`✓ PASS 3: Single mode correctly placed lab on Tuesday (${labEntry.start_time}–${labEntry.end_time})`);
    passed++;
  } catch (err) {
    console.error('✗ FAIL 3:', err.message);
  }

  // Test 4: Verify clean breaks endpoint
  total++;
  try {
    const res = await request('GET', '/api/breaks');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    console.log(`✓ PASS 4: Breaks endpoint responds with clean array (${res.data.length} breaks)`);
    passed++;
  } catch (err) {
    console.error('✗ FAIL 4:', err.message);
  }

  console.log('\n============================================================');
  console.log(`TEST SUMMARY: ${passed}/${total} PASSED`);
  console.log('============================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runLabFixTests();
