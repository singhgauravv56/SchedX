// scripts/test-teacher-subject-edit.js
// Comprehensive test suite for Teacher-Subject Assignment and Timetable Editing

const BASE_URL = 'http://localhost:3000';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    results.push({ test: testName, status: 'PASS', details });
    console.log(`✓ PASS: ${testName}`);
  } else {
    failed++;
    results.push({ test: testName, status: 'FAIL', details });
    console.error(`✗ FAIL: ${testName} - ${details}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('SCHEDX TEACHER-SUBJECT & EDITING TEST SUITE');
  console.log('====================================================\n');

  // Test 1: Health check
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    assert(res.ok && data.status === 'ok', 'Server Health Check');
  } catch (err) {
    assert(false, 'Server Health Check', err.message);
    process.exit(1);
  }

  // Test 2: Metadata Endpoint
  try {
    const res = await fetch(`${BASE_URL}/api/timetable/metadata`);
    const data = await res.json();
    assert(
      res.ok &&
      Array.isArray(data.workingDays) &&
      Array.isArray(data.timeSlots) &&
      Array.isArray(data.teachers) &&
      Array.isArray(data.rooms),
      'GET /api/timetable/metadata returns scheduling metadata',
      `workingDays: ${data.workingDays?.length}, timeSlots: ${data.timeSlots?.length}, teachers: ${data.teachers?.length}`
    );
  } catch (err) {
    assert(false, 'GET /api/timetable/metadata', err.message);
  }

  // Test 3: Validation: Reject generation if teacher has subject not in subjects list
  try {
    const invalidPayload = {
      teachers: [
        { name: 'Rahul Sharma', subject: 'Mathematics' },
        { name: 'Aman Verma', subject: 'Astronomy' } // Astronomy not in subjects
      ],
      subjects: ['Mathematics', 'DBMS'],
      sections: [{ name: 'CSE-A' }],
      working_days: ['Monday', 'Tuesday', 'Wednesday'],
      working_start_time: '09:00',
      working_end_time: '12:00'
    };
    const res = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload)
    });
    const data = await res.json();
    assert(
      (res.status === 400 || res.status === 409) && data.error && data.error.includes('Astronomy'),
      'Reject generation when teacher assigned unlisted subject',
      `HTTP ${res.status}: ${data.error}`
    );
  } catch (err) {
    assert(false, 'Reject generation when teacher assigned unlisted subject', err.message);
  }

  // Test 4: Validation: Reject generation if subject has no assigned teacher
  try {
    const unassignedPayload = {
      teachers: [
        { name: 'Rahul Sharma', subject: 'Mathematics' },
        { name: 'Aman Verma', subject: 'DBMS' }
      ],
      subjects: ['Mathematics', 'DBMS', 'DSA'], // DSA has no teacher
      sections: [{ name: 'CSE-A' }],
      working_days: ['Monday', 'Tuesday'],
      working_start_time: '09:00',
      working_end_time: '12:00'
    };
    const res = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unassignedPayload)
    });
    const data = await res.json();
    assert(
      (res.status === 400 || res.status === 409) && data.error && data.error.includes('DSA'),
      'Reject generation when configured subject has no assigned teacher',
      `HTTP ${res.status}: ${data.error}`
    );
  } catch (err) {
    assert(false, 'Reject generation when configured subject has no assigned teacher', err.message);
  }

  // Test 5: Successful generation with explicit Teacher -> Subject assignment
  let generatedSchedule = null;
  try {
    const validPayload = {
      teachers: [
        { name: 'Rahul Sharma', subject: 'Mathematics' },
        { name: 'Aman Verma', subject: 'DBMS' },
        { name: 'Priya Patel', subject: 'Operating Systems' },
        { name: 'Suresh Kumar', subject: 'Computer Networks' }
      ],
      subjects: ['Mathematics', 'DBMS', 'Operating Systems', 'Computer Networks'],
      sections: [{ name: 'CSE-A' }, { name: 'CSE-B' }],
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      working_start_time: '09:00',
      working_end_time: '13:00',
      rooms: [
        { room_number: '101', capacity: 60, room_type: 'Classroom' },
        { room_number: '102', capacity: 60, room_type: 'Classroom' },
        { room_number: '103', capacity: 60, room_type: 'Classroom' },
        { room_number: 'Lab-1', capacity: 40, room_type: 'Laboratory' }
      ],
      room_type: 'Both'
    };

    const res = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload)
    });
    const data = await res.json();
    const timetable = data.timetable || [];

    assert(
      res.ok && data.success && Array.isArray(timetable) && timetable.length > 0,
      'Generate timetable with explicit Teacher-Subject mapping',
      `Generated ${timetable.length} slots`
    );

    generatedSchedule = timetable;

    // Test 6: Verify CRITICAL RULE: Teachers ONLY teach their assigned subject!
    let teacherSubjectMismatch = false;
    let mismatchDetail = '';
    const mapping = {
      'rahul sharma': 'mathematics',
      'aman verma': 'dbms',
      'priya patel': 'operating systems',
      'suresh kumar': 'computer networks'
    };

    for (const entry of generatedSchedule) {
      const tName = (entry.teacher_name || '').toLowerCase();
      const expectedSubject = mapping[tName];
      const actualSubject = (entry.course_name || entry.subject || '').toLowerCase();
      if (expectedSubject && actualSubject !== expectedSubject) {
        teacherSubjectMismatch = true;
        mismatchDetail = `Teacher ${entry.teacher_name} assigned to ${actualSubject} (expected ${expectedSubject})`;
        break;
      }
    }

    assert(
      !teacherSubjectMismatch,
      'Scheduler strictly enforces: Teacher ONLY teaches assigned subject',
      mismatchDetail || 'All generated slots strictly match teacher-subject assignment'
    );

    // Test 7: Verify Multi-Section parallel scheduling at same Day + Time Slot
    // (CSE-A and CSE-B can both have classes at Monday 09:00 if teachers & rooms differ)
    const slotMap = new Map();
    let hasParallelSlot = false;
    let parallelConflict = false;

    for (const entry of generatedSchedule) {
      const key = `${entry.day}__${entry.start_time}`;
      if (!slotMap.has(key)) {
        slotMap.set(key, []);
      }
      const existing = slotMap.get(key);
      for (const other of existing) {
        if (other.teacher_name === entry.teacher_name) {
          parallelConflict = true;
          console.error(`Teacher conflict at ${key}: ${entry.teacher_name}`);
        }
        if (other.section === entry.section) {
          parallelConflict = true;
          console.error(`Section conflict at ${key}: ${entry.section}`);
        }
        if (other.room_name === entry.room_name) {
          parallelConflict = true;
          console.error(`Room conflict at ${key}: ${entry.room_name}`);
        }
      }
      existing.push(entry);
      if (existing.length > 1) {
        hasParallelSlot = true;
      }
    }

    assert(
      !parallelConflict,
      'No Teacher, Section, or Room conflicts at any Day + Time Slot',
      'All slots verified conflict-free across the entire institution'
    );

    assert(
      hasParallelSlot,
      'Multi-section institution allows distinct sections at the same Day + Time Slot',
      'Parallel sessions observed for distinct sections, teachers, and rooms'
    );

    // Test 8: Day + Time Slot is the atomic position (Same teacher on Monday 09:00 and Tuesday 09:00 is valid)
    const rahulEntries = generatedSchedule.filter(e => (e.teacher_name || '').toLowerCase().includes('rahul'));
    const rahulDays = new Set(rahulEntries.map(e => e.day));
    assert(
      rahulDays.size > 1,
      'Same teacher is scheduled across multiple different days without false blocking',
      `Rahul scheduled across ${rahulDays.size} days`
    );

  } catch (err) {
    assert(false, 'Generate timetable with explicit Teacher-Subject mapping', err.message);
  }

  // Test 9: PUT /api/timetable/entry/:id - Edit an entry safely
  if (generatedSchedule && generatedSchedule.length > 0) {
    const entryToEdit = generatedSchedule[0];
    const editId = entryToEdit.timetable_id || entryToEdit.id;

    // Subtest 9A: Attempt invalid edit - Teacher not assigned to subject
    try {
      const invalidEdit = {
        ...entryToEdit,
        teacher_name: 'Rahul Sharma',
        course_name: 'DBMS' // Rahul only teaches Mathematics!
      };

      const res = await fetch(`${BASE_URL}/api/timetable/entry/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidEdit)
      });
      const data = await res.json();

      assert(
        (res.status === 400 || res.status === 409) && data.error && data.error.includes('not assigned to teach'),
        'Edit Timetable rejects Teacher-Subject mismatch',
        `HTTP ${res.status}: ${data.error}`
      );
    } catch (err) {
      assert(false, 'Edit Timetable rejects Teacher-Subject mismatch', err.message);
    }

    // Subtest 9B: Attempt invalid edit - Teacher Conflict
    try {
      const otherEntry = generatedSchedule.find(
        e => (e.timetable_id || e.id) !== editId && e.day === entryToEdit.day && e.start_time === entryToEdit.start_time
      );
      if (otherEntry) {
        // Try setting entryToEdit's teacher to otherEntry's teacher (who is already busy at this day+time)
        const conflictEdit = {
          ...entryToEdit,
          teacher_name: otherEntry.teacher_name,
          course_name: otherEntry.course_name
        };

        const res = await fetch(`${BASE_URL}/api/timetable/entry/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(conflictEdit)
        });
        const data = await res.json();

        assert(
          (res.status === 400 || res.status === 409) && data.error && (data.error.includes('Teacher') || data.error.includes('already scheduled') || data.error.includes('conflict')),
          'Edit Timetable rejects Teacher conflict (same day + time)',
          `HTTP ${res.status}: ${data.error}`
        );
      } else {
        // Create an intentional clash by moving entryToEdit to clash with another entry
        const targetEntry = generatedSchedule[1];
        const conflictEdit = {
          ...entryToEdit,
          day: targetEntry.day,
          start_time: targetEntry.start_time,
          end_time: targetEntry.end_time,
          room_name: targetEntry.room_name // causes room conflict
        };

        const res = await fetch(`${BASE_URL}/api/timetable/entry/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(conflictEdit)
        });
        const data = await res.json();

        assert(
          (res.status === 400 || res.status === 409) && data.error && (data.error.includes('Room') || data.error.includes('already occupied')),
          'Edit Timetable rejects Room conflict (same day + time)',
          `HTTP ${res.status}: ${data.error}`
        );
      }
    } catch (err) {
      assert(false, 'Edit Timetable conflict check', err.message);
    }

    // Subtest 9C: Valid Edit - Change Room to available compatible room (Room 103)
    try {
      const targetRoom = '103';
      const validEdit = {
        ...entryToEdit,
        room_name: targetRoom,
        room: targetRoom
      };

      const res = await fetch(`${BASE_URL}/api/timetable/entry/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validEdit)
      });
      const data = await res.json();

      assert(
        res.ok && data.success && data.entry && (data.entry.room_name === targetRoom || data.entry.room === targetRoom),
        'Edit Timetable accepts valid conflict-free change',
        `Room updated to ${data.entry?.room_name || data.entry?.room}`
      );
    } catch (err) {
      assert(false, 'Edit Timetable accepts valid conflict-free change', err.message);
    }

    // Test 10: Refresh Persistence
    try {
      const res = await fetch(`${BASE_URL}/api/timetable`);
      const data = await res.json();
      const updatedEntries = Array.isArray(data) ? data : (data.schedule || data.timetable || []);
      const updatedEntry = updatedEntries.find(e => (e.timetable_id || e.id) === editId);
      const targetRoom = '103';

      assert(
        res.ok && updatedEntry && (updatedEntry.room_name === targetRoom || updatedEntry.room === targetRoom),
        'Timetable edits persist across page refresh / re-fetching',
        `Persisted room: ${updatedEntry?.room_name || updatedEntry?.room}`
      );
    } catch (err) {
      assert(false, 'Timetable edits persist across page refresh', err.message);
    }

    // Test 11: Controlled Entry Deletion (Requirement 33)
    try {
      const deleteRes = await fetch(`${BASE_URL}/api/timetable/entry/${editId}`, {
        method: 'DELETE'
      });
      const deleteData = await deleteRes.json();

      assert(
        deleteRes.ok && deleteData.success,
        'DELETE /api/timetable/entry/:id deletes entry safely',
        deleteData.message
      );

      // Verify it is gone
      const verifyRes = await fetch(`${BASE_URL}/api/timetable`);
      const verifyData = await verifyRes.json();
      const currentList = Array.isArray(verifyData) ? verifyData : (verifyData.schedule || verifyData.timetable || []);
      const stillExists = currentList.some(e => (e.timetable_id || e.id) === editId);

      assert(
        !stillExists,
        'Deleted entry is permanently removed from timetable storage',
        `Schedule count now ${currentList.length}`
      );
    } catch (err) {
      assert(false, 'DELETE /api/timetable/entry/:id', err.message);
    }
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

