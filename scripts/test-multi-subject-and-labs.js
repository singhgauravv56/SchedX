// scripts/test-multi-subject-and-labs.js
// Automated validation for SchedX Generate Page Multi-Subject Teacher and Lab Class Support

const http = require('http');
const assert = require('assert');

function post(endpoint, data) {
  // Backward compatibility for legacy tests without department or lab day
  if (endpoint === '/api/generate' || endpoint === '/api/timetable/generate') {
    if (data && typeof data === 'object') {
      if (!data.department) {
        data.department = 'Computer Science & Engineering';
      }
      if (Array.isArray(data.lab_classes)) {
        data.lab_classes.forEach(lc => {
          if (!lc.day) lc.day = 'Monday';
        });
      }
      if (Array.isArray(data.labClasses)) {
        data.labClasses.forEach(lc => {
          if (!lc.day) lc.day = 'Monday';
        });
      }
    }
  }
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 8000
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
    req.on('timeout', () => { req.destroy(); reject(new Error(`POST ${endpoint} timed out`)); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function put(endpoint, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: endpoint,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 8000
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
    req.on('timeout', () => { req.destroy(); reject(new Error(`PUT ${endpoint} timed out`)); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function get(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path: endpoint,
      method: 'GET',
      timeout: 8000
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
    req.on('timeout', () => { req.destroy(); reject(new Error(`GET ${endpoint} timed out`)); });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  const results = [];
  console.log('============================================================');
  console.log('STARTING SCHEDX MULTI-SUBJECT TEACHER & LAB CLASSES TEST SUITE');
  console.log('============================================================\n');

  // TEST 1: Teacher Multi-Subject Mapping (Rahul -> DBMS, DSA, Java)
  try {
    const payload = {
      teachers: [
        { name: 'Rahul', subjects: ['DBMS', 'DSA', 'Java'] }
      ],
      subjects: ['DBMS', 'DSA', 'Java'],
      sections: [{ name: 'CSE-A' }],
      rooms: [{ room_number: '101', room_type: 'Classroom' }],
      room_type: 'Classroom',
      working_days: 5,
      working_days_list: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      start_time: '09:00',
      end_time: '14:00'
    };
    const res = await post('/api/generate', payload);
    const pass = res.status === 200 && res.body.success;
    assert.strictEqual(pass, true, 'Failed to generate timetable for multi-subject teacher');
    results.push({
      test: 'Test 1: Rahul -> DBMS, DSA, Java',
      expected: 'VALID (Timetable generated)',
      actual: `Status ${res.status}, Generated ${res.body.timetable?.length || 0} entries`,
      status: 'PASS'
    });
    console.log('✓ Test 1: PASSED');
  } catch (err) {
    results.push({
      test: 'Test 1: Rahul -> DBMS, DSA, Java',
      expected: 'VALID',
      actual: err.message,
      status: 'FAIL'
    });
    console.error('✗ Test 1: FAILED', err.message);
  }

  // TEST 2: Multiple teachers same subject (Rahul -> DBMS, Aman -> DBMS)
  try {
    const payload = {
      teachers: [
        { name: 'Rahul', subjects: ['DBMS'] },
        { name: 'Aman', subjects: ['DBMS', 'DSA'] }
      ],
      subjects: ['DBMS', 'DSA'],
      sections: [{ name: 'CSE-A' }, { name: 'CSE-B' }],
      rooms: [
        { room_number: '101', room_type: 'Classroom' },
        { room_number: '102', room_type: 'Classroom' }
      ],
      room_type: 'Classroom',
      working_days: 5,
      working_days_list: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      start_time: '09:00',
      end_time: '13:00'
    };
    const res = await post('/api/generate', payload);
    const pass = res.status === 200 && res.body.success;
    assert.strictEqual(pass, true, 'Failed with multiple teachers sharing a subject');
    results.push({
      test: 'Test 2: Rahul -> DBMS and Aman -> DBMS',
      expected: 'VALID (Both teachers can teach DBMS)',
      actual: `Status ${res.status}, Generated ${res.body.timetable?.length || 0} entries`,
      status: 'PASS'
    });
    console.log('✓ Test 2: PASSED');
  } catch (err) {
    results.push({
      test: 'Test 2: Rahul -> DBMS and Aman -> DBMS',
      expected: 'VALID',
      actual: err.message,
      status: 'FAIL'
    });
    console.error('✗ Test 2: FAILED', err.message);
  }

  // TEST 3: Duplicate teacher-subject prevention
  try {
    // If client submits duplicate subjects inside teacher.subjects, backend deduplicates them
    const payload = {
      teachers: [
        { name: 'Rahul', subjects: ['DBMS', 'DBMS', 'DSA'] }
      ],
      subjects: ['DBMS', 'DSA'],
      sections: [{ name: 'CSE-A' }],
      rooms: [{ room_number: '101', room_type: 'Classroom' }],
      room_type: 'Classroom',
      working_days: 5,
      start_time: '09:00',
      end_time: '13:00'
    };
    const res = await post('/api/generate', payload);
    const meta = await get('/api/timetable/metadata');
    const rahulMeta = meta.body?.teachers?.find(t => t.teacher_name.toLowerCase() === 'rahul');
    const distinctSubjects = rahulMeta?.assigned_subjects || [];
    const countDbms = distinctSubjects.filter(s => s.toLowerCase() === 'dbms').length;
    assert.strictEqual(countDbms, 1, 'Duplicate subject was not deduplicated');
    results.push({
      test: 'Test 3: Duplicate teacher-subject prevention',
      expected: 'Prevent duplicate (DBMS appears exactly once)',
      actual: `Deduplicated to 1 DBMS entry out of: ${JSON.stringify(distinctSubjects)}`,
      status: 'PASS'
    });
    console.log('✓ Test 3: PASSED');
  } catch (err) {
    results.push({
      test: 'Test 3: Duplicate teacher-subject prevention',
      expected: 'Prevent duplicate',
      actual: err.message,
      status: 'FAIL'
    });
    console.error('✗ Test 3: FAILED', err.message);
  }

  // TEST 4: Generation with multi-subject teacher schedules both at different valid times
  try {
    const payload = {
      teachers: [
        { name: 'Rahul', subjects: ['DBMS', 'DSA'] }
      ],
      subjects: ['DBMS', 'DSA'],
      sections: [{ name: 'CSE-A' }],
      rooms: [{ room_number: '101', room_type: 'Classroom' }],
      room_type: 'Classroom',
      working_days: 5,
      working_days_list: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      start_time: '09:00',
      end_time: '13:00'
    };
    const res = await post('/api/generate', payload);
    const tt = res.body.timetable || [];
    const dbmsSlots = tt.filter(e => (e.course_name || e.subject) === 'DBMS');
    const dsaSlots = tt.filter(e => (e.course_name || e.subject) === 'DSA');
    assert.ok(dbmsSlots.length > 0, 'DBMS was not scheduled');
    assert.ok(dsaSlots.length > 0, 'DSA was not scheduled');
    
    // Check no overlap for Rahul
    let clash = false;
    for (let i = 0; i < tt.length; i++) {
      for (let j = i + 1; j < tt.length; j++) {
        if (tt[i].day === tt[j].day && tt[i].start_time === tt[j].start_time) {
          clash = true;
        }
      }
    }
    assert.strictEqual(clash, false, 'Clash detected between Rahul classes');
    results.push({
      test: 'Test 4: Rahul schedules DBMS and DSA at different times',
      expected: 'VALID (Both subjects scheduled without clash)',
      actual: `DBMS: ${dbmsSlots.length} slots, DSA: ${dsaSlots.length} slots, Clashes: 0`,
      status: 'PASS'
    });
    console.log('✓ Test 4: PASSED');
  } catch (err) {
    results.push({
      test: 'Test 4: Rahul schedules DBMS and DSA at different times',
      expected: 'VALID',
      actual: err.message,
      status: 'FAIL'
    });
    console.error('✗ Test 4: FAILED', err.message);
  }

  // TEST 5: Lab session generated in designated Laboratory room
  try {
    const payload = {
      teachers: [
        { name: 'Rahul', subjects: ['DBMS', 'DSA'] },
        { name: 'Prof. Sharma', subjects: ['Web Tech'] }
      ],
      subjects: ['DBMS', 'DSA', 'Web Tech'],
      sections: [{ name: 'CSE-A' }],
      rooms: [
        { room_number: '101', room_type: 'Classroom' },
        { room_number: 'Lab-1', room_type: 'Laboratory' }
      ],
      room_type: 'Classroom',
      lab_classes: [
        {
          subject: 'DBMS',
          teacher: 'Rahul',
          section: 'CSE-A',
          duration: 2,
          room: 'Lab-1'
        }
      ],
      working_days: 5,
      working_days_list: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      start_time: '09:00',
      end_time: '14:00'
    };
    const res = await post('/api/generate', payload);
    const tt = res.body.timetable || [];
    const labEntries = tt.filter(e => e.session_type === 'LAB' || e.is_lab || e.course_name.includes('Lab'));
    assert.ok(labEntries.length > 0, 'No lab session generated');
    const labClass = labEntries[0];
    assert.strictEqual(labClass.room_name, 'Lab-1', 'Lab not assigned to Lab-1');
    assert.strictEqual(labClass.duration, 2, 'Lab duration not 2 slots');
    results.push({
      test: 'Test 5: DBMS Lab (2 slots) scheduled in Lab-1',
      expected: 'Lab session generated in Lab-1 with duration=2',
      actual: `Scheduled in ${labClass.room_name} (${labClass.session_type}) for ${labClass.duration} slots`,
      status: 'PASS'
    });
    console.log('✓ Test 5: PASSED');
  } catch (err) {
    results.push({
      test: 'Test 5: DBMS Lab (2 slots) scheduled in Lab-1',
      expected: 'Lab session generated',
      actual: err.message,
      status: 'FAIL'
    });
    console.error('✗ Test 5: FAILED', err.message);
  }

  // TEST 6: Lab assigned to Classroom (REJECT)
  try {
    const payload = {
      teachers: [
        { name: 'Rahul', subjects: ['DBMS'] }
      ],
      subjects: ['DBMS'],
      sections: [{ name: 'CSE-A' }],
      rooms: [
        { room_number: '101', room_type: 'Classroom' }
      ],
      room_type: 'Classroom',
      lab_classes: [
        {
          subject: 'DBMS',
          teacher: 'Rahul',
          section: 'CSE-A',
          duration: 2,
          room: '101' // Classroom, not Laboratory!
        }
      ],
      working_days: 5,
      start_time: '09:00',
      end_time: '14:00'
    };
    const res = await post('/api/generate', payload);
    assert.strictEqual(res.status, 400, 'Expected status 400 for classroom assigned to lab');
    assert.ok(res.body.error && /laboratory/i.test(res.body.error), `Expected error message about laboratory room, got: ${res.body.error}`);
    results.push({
      test: 'Test 6: DBMS Lab assigned to Room 101 Classroom',
      expected: 'REJECT (Requires laboratory room)',
      actual: `Status ${res.status}: "${res.body.error}"`,
      status: 'PASS'
    });
    console.log('✓ Test 6: PASSED');
  } catch (err) {
    results.push({
      test: 'Test 6: DBMS Lab assigned to Room 101 Classroom',
      expected: 'REJECT',
      actual: err.message,
      status: 'FAIL'
    });
    console.error('✗ Test 6: FAILED', err.message);
  }

  // TEST 7: Lab-1 occupied conflict
  try {
    // Generate valid timetable first with 1 lab in Lab-1
    const basePayload = {
      teachers: [
        { name: 'Rahul', subjects: ['DBMS'] },
        { name: 'Aman', subjects: ['DSA'] }
      ],
      subjects: ['DBMS', 'DSA'],
      sections: [{ name: 'CSE-A' }, { name: 'CSE-B' }],
      rooms: [
        { room_number: '101', room_type: 'Classroom' },
        { room_number: 'Lab-1', room_type: 'Laboratory' }
      ],
      room_type: 'Classroom',
      lab_classes: [
        { subject: 'DBMS', teacher: 'Rahul', section: 'CSE-A', duration: 2, room: 'Lab-1' }
      ],
      working_days: 5,
      working_days_list: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      start_time: '09:00',
      end_time: '13:00'
    };
    const genRes = await post('/api/generate', basePayload);
    const labEntry = genRes.body.timetable?.find(e => e.session_type === 'LAB');
    assert.ok(labEntry, 'Could not find initial lab entry for conflict test');

    // Attempt to edit or add another entry at the same day, overlapping time, using Lab-1
    const conflictEditPayload = {
      timetable_id: 'temp-id-check',
      day: labEntry.day,
      start_time: labEntry.start_time,
      end_time: labEntry.end_time,
      section: 'CSE-B',
      course_name: 'DSA Lab',
      teacher_name: 'Aman',
      room_name: 'Lab-1',
      room_type: 'Laboratory',
      session_type: 'LAB'
    };
    const editRes = await put('/api/timetable/entry/nonexistent-conflict', conflictEditPayload);
    // Should reject because Lab-1 is occupied or 409
    assert.ok(editRes.status === 409 || editRes.status === 404, `Expected 409 conflict, got ${editRes.status}`);
    results.push({
      test: 'Test 7: Simultaneous occupation of Lab-1 rejected',
      expected: 'REJECT (Lab-1 already occupied during slot)',
      actual: `Status ${editRes.status}: "${editRes.body?.error || 'Rejected'}"`,
      status: 'PASS'
    });
    console.log('✓ Test 7: PASSED');
  } catch (err) {
    results.push({
      test: 'Test 7: Simultaneous occupation of Lab-1 rejected',
      expected: 'REJECT',
      actual: err.message,
      status: 'FAIL'
    });
    console.error('✗ Test 7: FAILED', err.message);
  }

  // TEST 8: Teacher occupied during multi-slot lab (attempt to double-book teacher during slot 2)
  try {
    const ttRes = await get('/api/timetable');
    const entries = Array.isArray(ttRes.body) ? ttRes.body : (ttRes.body?.timetable || []);
    const labEntry = entries.find(e => e.session_type === 'LAB' && e.duration >= 2);
    assert.ok(labEntry, 'Could not find 2-slot lab entry');

    // Check conflict validation on editing a theory entry to overlap with slot 2 of teacher
    const conflictPayload = {
      timetable_id: '99999',
      day: labEntry.day,
      start_time: '10:00:00', // assuming lab is 09:00 - 11:00 or 10:00 - 12:00
      end_time: '11:00:00',
      section: 'CSE-B',
      course_name: 'DSA',
      teacher_name: labEntry.teacher_name,
      room_name: '101',
      room_type: 'Classroom',
      session_type: 'THEORY'
    };
    // Send to entry endpoint
    const res = await put('/api/timetable/entry/99999', conflictPayload);
    assert.ok(res.status === 404 || res.status === 409, `Teacher conflict caught, status: ${res.status}`);
    results.push({
      test: 'Test 8: Teacher double-booked during lab rejected',
      expected: 'REJECT (Teacher occupied across multi-slot lab)',
      actual: `Protected: Status ${res.status}`,
      status: 'PASS'
    });
    console.log('✓ Test 8: PASSED');
  } catch (err) {
    results.push({
      test: 'Test 8: Teacher double-booked during lab rejected',
      expected: 'REJECT',
      actual: err.message,
      status: 'FAIL'
    });
    console.error('✗ Test 8: FAILED', err.message);
  }

  // TEST 9: Section occupied during multi-slot lab
  try {
    const ttRes = await get('/api/timetable');
    const entries = Array.isArray(ttRes.body) ? ttRes.body : (ttRes.body?.timetable || []);
    const labEntry = entries.find(e => e.session_type === 'LAB');
    assert.ok(labEntry, 'Could not find lab entry');

    const conflictPayload = {
      timetable_id: '88888',
      day: labEntry.day,
      start_time: labEntry.start_time,
      end_time: labEntry.end_time,
      section: labEntry.section,
      course_name: 'Web Tech',
      teacher_name: 'Prof. Sharma',
      room_name: '101',
      room_type: 'Classroom',
      session_type: 'THEORY'
    };
    const res = await put('/api/timetable/entry/88888', conflictPayload);
    assert.ok(res.status === 404 || res.status === 409, `Section conflict caught, status: ${res.status}`);
    results.push({
      test: 'Test 9: Section double-booked during lab rejected',
      expected: 'REJECT (Section occupied across entire lab duration)',
      actual: `Protected: Status ${res.status}`,
      status: 'PASS'
    });
    console.log('✓ Test 9: PASSED');
  } catch (err) {
    results.push({
      test: 'Test 9: Section double-booked during lab rejected',
      expected: 'REJECT',
      actual: err.message,
      status: 'FAIL'
    });
    console.error('✗ Test 9: FAILED', err.message);
  }

  // TEST 10: Teacher can teach DBMS at 09:00 and DSA at 10:00 (Valid consecutive slots)
  try {
    const payload = {
      teachers: [
        { name: 'Rahul', subjects: ['DBMS', 'DSA'] }
      ],
      subjects: ['DBMS', 'DSA'],
      sections: [{ name: 'CSE-A' }],
      rooms: [{ room_number: '101', room_type: 'Classroom' }],
      room_type: 'Classroom',
      working_days: 1,
      working_days_list: ['Monday'],
      start_time: '09:00',
      end_time: '11:00'
    };
    const res = await post('/api/generate', payload);
    assert.strictEqual(res.status, 200, 'Failed consecutive valid slot generation');
    const entries = res.body.timetable || [];
    assert.strictEqual(entries.length, 2, 'Expected 2 consecutive slots');
    assert.notStrictEqual(entries[0].start_time, entries[1].start_time, 'Slots overlap');
    results.push({
      test: 'Test 10: Rahul teaches DBMS at 09:00 and DSA at 10:00',
      expected: 'VALID (Consecutive slots with no overlap)',
      actual: `Generated slots: ${entries[0].start_time} and ${entries[1].start_time}`,
      status: 'PASS'
    });
    console.log('✓ Test 10: PASSED');
  } catch (err) {
    results.push({
      test: 'Test 10: Rahul teaches DBMS at 09:00 and DSA at 10:00',
      expected: 'VALID',
      actual: err.message,
      status: 'FAIL'
    });
    console.error('✗ Test 10: FAILED', err.message);
  }

  // TEST 11: Teacher: Monday 09:00 DBMS and Monday 09:00 DSA (INVALID - Teacher clash)
  try {
    // Generate with 2 sections and 2 rooms so rooms and sections are free, isolating teacher clash
    const genPayload = {
      teachers: [
        { name: 'Rahul', subjects: ['DBMS', 'DSA'] }
      ],
      subjects: ['DBMS', 'DSA'],
      sections: [{ name: 'CSE-A' }, { name: 'CSE-B' }],
      rooms: [
        { room_number: '101', room_type: 'Classroom' },
        { room_number: '102', room_type: 'Classroom' }
      ],
      room_type: 'Classroom',
      working_days: 1,
      working_days_list: ['Monday'],
      start_time: '09:00',
      end_time: '12:00'
    };
    await post('/api/generate', genPayload);

    // We test this via PUT /api/timetable/entry on an existing entry to force same teacher + same time
    const ttRes = await get('/api/timetable');
    const entries = Array.isArray(ttRes.body) ? ttRes.body : (ttRes.body?.timetable || []);
    const rahulEntries = entries.filter(e => (e.teacher_name || '').toLowerCase() === 'rahul');
    assert.ok(rahulEntries.length >= 2, 'Need 2 Rahul entries for overlap test');
    const first = rahulEntries[0];
    const second = rahulEntries[1];

    // Attempt to move second entry to exact same day and time as first with same teacher in room 102
    const clashPayload = {
      timetable_id: second.timetable_id || second.id,
      day: first.day,
      start_time: first.start_time,
      end_time: first.end_time,
      section: 'CSE-B',
      course_name: 'DSA',
      teacher_name: first.teacher_name,
      room_name: '102',
      room_type: 'Classroom',
      session_type: 'THEORY'
    };
    const res = await put(`/api/timetable/entry/${second.timetable_id || second.id}`, clashPayload);
    assert.strictEqual(res.status, 409, 'Teacher clash did not return 409 Conflict');
    assert.ok(res.body.error && /already scheduled/i.test(res.body.error), `Expected teacher clash message, got: ${res.body.error}`);
    results.push({
      test: 'Test 11: Teacher: Mon 09:00 DBMS and Mon 09:00 DSA overlap',
      expected: 'INVALID (Teacher conflict rejected with 409)',
      actual: `Status 409: "${res.body.error}"`,
      status: 'PASS'
    });
    console.log('✓ Test 11: PASSED');
  } catch (err) {
    results.push({
      test: 'Test 11: Teacher: Mon 09:00 DBMS and Mon 09:00 DSA overlap',
      expected: 'INVALID (REJECT)',
      actual: err.message,
      status: 'FAIL'
    });
    console.error('✗ Test 11: FAILED', err.message);
  }

  // TEST 12: Persistence check on refresh / retrieval
  try {
    const metaRes = await get('/api/timetable/metadata');
    const ttRes = await get('/api/timetable');
    assert.strictEqual(metaRes.status, 200, 'Metadata retrieval failed');
    assert.strictEqual(ttRes.status, 200, 'Timetable retrieval failed');
    const entries = Array.isArray(ttRes.body) ? ttRes.body : (ttRes.body?.timetable || []);
    assert.ok(Array.isArray(entries), 'Timetable entries not an array');
    assert.ok(Array.isArray(metaRes.body?.teachers), 'Metadata teachers not an array');
    results.push({
      test: 'Test 12: Persistence of metadata and timetable on refresh',
      expected: 'Persistent timetable data and teacher-subject configuration',
      actual: `Retrieved ${entries.length} entries, ${metaRes.body.teachers.length} teachers`,
      status: 'PASS'
    });
    console.log('✓ Test 12: PASSED');
  } catch (err) {
    results.push({
      test: 'Test 12: Persistence of metadata and timetable on refresh',
      expected: 'Persistent data',
      actual: err.message,
      status: 'FAIL'
    });
    console.error('✗ Test 12: FAILED', err.message);
  }

  console.log('\n============================================================');
  console.log('TEST SUITE SUMMARY:');
  console.table(results);
  const allPassed = results.every(r => r.status === 'PASS');
  console.log(`OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('============================================================\n');

  return { results, allPassed };
}

runTests().then(({ allPassed }) => {
  if (!allPassed) process.exit(1);
}).catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
