/**
 * SchedX — Storage System & Retention Policy Automated Test Suite
 * Tests Box 8, Box 9, GET /api/storage, PUT /api/timetable, DELETE /api/timetable,
 * and the 2-generation timetable retention engine.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

function request(method, pathName, body = null) {
  if ((pathName === '/api/generate' || pathName === '/api/timetable/generate') && body && typeof body === 'object') {
    if (!body.department) {
      body.department = 'Computer Science & Engineering';
    }
  }
  return new Promise((resolve, reject) => {
    const url = new URL(pathName, BASE_URL);
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
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {}
        resolve({ status: res.statusCode, data: json, raw: data });
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

function recordTest(name, passed, message) {
  results.push({ name, passed, message });
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${name} — ${message}`);
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   SCHEDX FEATURE BOX 8 & 9 STORAGE & RETENTION TESTS');
  console.log('======================================================\n');

  try {
    // 1. Storage API Endpoint Basic Check
    const resStorageInitial = await request('GET', '/api/storage');
    const hasRequiredFields = resStorageInitial.status === 200 &&
      resStorageInitial.data &&
      typeof resStorageInitial.data.counts === 'object' &&
      typeof resStorageInitial.data.counts.teachers === 'number' &&
      typeof resStorageInitial.data.counts.rooms === 'number' &&
      typeof resStorageInitial.data.counts.generatedTimetables === 'number' &&
      resStorageInitial.data.retentionPolicy === 'Latest 2 generations retained';

    recordTest(
      'Storage API Endpoint Contract',
      hasRequiredFields,
      `Status: ${resStorageInitial.status}, maxRetained: ${resStorageInitial.data?.maxRetained}`
    );

    // 2. Storage Security Check (Zero Secrets)
    const rawStorage = resStorageInitial.raw;
    const hasSecretKey = /sb_secret|service_role|supabase_secret/i.test(rawStorage);
    const hasDbPassword = /password|secret_key|private_key/i.test(rawStorage);
    recordTest(
      'Storage API Security (No Secrets Exposed)',
      !hasSecretKey && !hasDbPassword,
      'Response inspected: zero sensitive tokens, passwords, or Supabase service keys present.'
    );

    // Initial counts
    const initialTeachersCount = resStorageInitial.data.counts.teachers;
    const initialRoomsCount = resStorageInitial.data.counts.rooms;

    // Reset timetable store and history before testing retention sequence from 0 to 4
    const dataDir = path.join(__dirname, '..', 'data');
    fs.writeFileSync(path.join(dataDir, 'timetable_history.json'), '[]', 'utf8');
    fs.writeFileSync(path.join(dataDir, 'timetable_store.json'), '[]', 'utf8');
    await request('DELETE', '/api/timetable');

    // TEST 1: Generate timetable #1
    const gen1Payload = {
      teachers: [{ name: 'Faculty-Alpha' }],
      subjects: ['Math-101'],
      sections: [{ name: 'SEC-A' }],
      rooms: [{ room_number: '101', room_type: 'Classroom' }],
      room_type: 'Classroom',
      working_days_per_week: 5,
      working_start_time: '09:00',
      working_end_time: '12:00'
    };
    const resGen1 = await request('POST', '/api/generate', gen1Payload);
    const storageAfterGen1 = await request('GET', '/api/storage');
    recordTest(
      'TEST 1: Generate Timetable #1',
      resGen1.status === 200 && storageAfterGen1.data.counts.generatedTimetables === 1,
      `Retained versions count = ${storageAfterGen1.data.counts.generatedTimetables} (expected 1)`
    );

    // TEST 2: Generate timetable #2
    const gen2Payload = {
      teachers: [{ name: 'Faculty-Beta' }],
      subjects: ['Physics-201'],
      sections: [{ name: 'SEC-B' }],
      rooms: [{ room_number: 'Room-102', room_type: 'Classroom' }],
      room_type: 'Classroom',
      working_days_per_week: 5,
      working_start_time: '09:00',
      working_end_time: '12:00'
    };
    const resGen2 = await request('POST', '/api/generate', gen2Payload);
    const storageAfterGen2 = await request('GET', '/api/storage');
    recordTest(
      'TEST 2: Generate Timetable #2',
      resGen2.status === 200 && storageAfterGen2.data.counts.generatedTimetables === 2,
      `Retained versions count = ${storageAfterGen2.data.counts.generatedTimetables} (expected 2)`
    );

    // TEST 3: Generate timetable #3 (Should prune oldest, keeping latest 2)
    const gen3Payload = {
      teachers: [{ name: 'Faculty-Gamma' }],
      subjects: ['Chemistry-301'],
      sections: [{ name: 'SEC-C' }],
      rooms: [{ room_number: 'Room-103', room_type: 'Classroom' }],
      room_type: 'Classroom',
      working_days_per_week: 5,
      working_start_time: '09:00',
      working_end_time: '12:00'
    };
    const resGen3 = await request('POST', '/api/generate', gen3Payload);
    const storageAfterGen3 = await request('GET', '/api/storage');
    const versions3 = storageAfterGen3.data.details.timetables;
    const oldestPruned3 = !versions3.some(v => (v.sections || []).includes('SEC-A'));
    recordTest(
      'TEST 3: Generate Timetable #3 (Retention: Latest 2 kept, oldest pruned)',
      resGen3.status === 200 && storageAfterGen3.data.counts.generatedTimetables === 2 && oldestPruned3,
      `Retained count = ${storageAfterGen3.data.counts.generatedTimetables}, oldest generation (SEC-A) removed: ${oldestPruned3}`
    );

    // TEST 4: Generate timetable #4 (Should prune older, keeping latest 2)
    const gen4Payload = {
      teachers: [{ name: 'Faculty-Delta' }],
      subjects: ['Biology-401'],
      sections: [{ name: 'SEC-D' }],
      rooms: [{ room_number: 'Room-104', room_type: 'Classroom' }],
      room_type: 'Classroom',
      working_days_per_week: 5,
      working_start_time: '09:00',
      working_end_time: '12:00'
    };
    const resGen4 = await request('POST', '/api/generate', gen4Payload);
    const storageAfterGen4 = await request('GET', '/api/storage');
    const versions4 = storageAfterGen4.data.details.timetables;
    const latestTwoAreCandD = versions4.length === 2 &&
      versions4[0].sections.includes('SEC-D') &&
      versions4[1].sections.includes('SEC-C');
    recordTest(
      'TEST 4: Generate Timetable #4 (Retention: Strictly latest 2 kept)',
      resGen4.status === 200 && storageAfterGen4.data.counts.generatedTimetables === 2 && latestTwoAreCandD,
      `Retained count = ${storageAfterGen4.data.counts.generatedTimetables}, latest 2 are Gen 4 and Gen 3: ${latestTwoAreCandD}`
    );

    // TEST 5: Verify Teacher Records Intact
    const resTeachers = await request('GET', '/api/teachers');
    const teachersPreserved = resTeachers.status === 200 && Array.isArray(resTeachers.data) && resTeachers.data.length >= initialTeachersCount;
    recordTest(
      'TEST 5: Teacher Preservation Under Retention',
      teachersPreserved,
      `Teachers count in Supabase = ${resTeachers.data?.length || 0} (retained without loss)`
    );

    // TEST 6: Verify Subject/Course Catalog Intact
    const subjectsCount = storageAfterGen4.data.counts.subjects;
    recordTest(
      'TEST 6: Subject / Catalog Preservation',
      subjectsCount > 0,
      `Distinct subjects preserved = ${subjectsCount}`
    );

    // TEST 7: Verify Room Records Intact
    const resRooms = await request('GET', '/api/rooms');
    const roomsPreserved = resRooms.status === 200 && Array.isArray(resRooms.data) && resRooms.data.length >= initialRoomsCount;
    recordTest(
      'TEST 7: Room Preservation Under Retention',
      roomsPreserved,
      `Rooms in Supabase = ${resRooms.data?.length || 0} (initial was ${initialRoomsCount}, preserved without deletion)`
    );

    // TEST 8: Delete Active Timetable
    const resDelete = await request('DELETE', '/api/timetable');
    const resTimetableAfterDelete = await request('GET', '/api/timetable');
    const storageAfterDelete = await request('GET', '/api/storage');
    recordTest(
      'TEST 8: Timetable Deletion',
      resDelete.status === 200 && Array.isArray(resTimetableAfterDelete.data) && resTimetableAfterDelete.data.length === 0,
      `Active timetable cleared: ${resTimetableAfterDelete.data.length === 0}, rooms preserved: ${storageAfterDelete.data.counts.rooms}`
    );

    // TEST 9: Update Timetable (PUT /api/timetable)
    const updatePayload = {
      timetable: [
        {
          timetable_id: 'tt_updated_1',
          day: 'Monday',
          day_of_week: 1,
          start_time: '10:00:00',
          end_time: '11:00:00',
          class_name: 'SEC-UPDATED',
          section: 'SEC-UPDATED',
          course_name: 'Advanced Systems',
          teacher_name: 'Lead Instructor',
          room_name: 'Room-101',
          room_type: 'Classroom'
        }
      ]
    };
    const resUpdate = await request('PUT', '/api/timetable', updatePayload);
    const storageAfterUpdate = await request('GET', '/api/storage');
    recordTest(
      'TEST 9: Timetable Update & In-Place Modification',
      resUpdate.status === 200 && resUpdate.data.success && storageAfterUpdate.data.counts.activeEntriesCount === 1,
      `PUT status = ${resUpdate.status}, entries count = ${resUpdate.data?.entries_count}, active in storage: ${storageAfterUpdate.data.counts.activeEntriesCount}`
    );

    // TEST 10: Box 8 HTML Content Verification
    const featuresHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'features.html'), 'utf8');
    const hasBox8Number = featuresHtml.includes('<span class="feature-number">08</span>');
    const hasBox8Title = featuresHtml.includes('Cloud & Data Persistence') || featuresHtml.includes('Cloud Data Persistence & Continuity');
    const hasSupportedTypes = featuresHtml.includes('persistence-supported-types');
    const hasNoFakeOffline = !featuresHtml.includes('true offline mode') && !featuresHtml.includes('offline database');
    const box8Valid = hasBox8Number && hasBox8Title && hasSupportedTypes && hasNoFakeOffline;
    recordTest(
        'TEST 10: Box 8 Content & Persistence Presentation',
        box8Valid,
        `Box 8 present with accurate title, supported data badges, and no false offline claims`
    );

    // TEST 11: Box 9 HTML & Real Dashboard Structure
    const hasBox9Number = featuresHtml.includes('<span class="feature-number">09</span>');
    const hasBox9Title = featuresHtml.includes('<h3>Storage</h3>');
    const hasStatTeachers = featuresHtml.includes('id="statTeachers"');
    const hasStatRooms = featuresHtml.includes('id="statRooms"');
    const hasStatTimetables = featuresHtml.includes('id="statTimetables"');
    const hasStorageModal = featuresHtml.includes('id="storageViewerModal"');
    const hasRetentionNotice = featuresHtml.includes('Latest 2 generations retained');
    const box9Valid = hasBox9Number && hasBox9Title && hasStatTeachers && hasStatRooms && hasStatTimetables && hasStorageModal && hasRetentionNotice;
    recordTest(
        'TEST 11: Box 9 Storage Dashboard & Modal Viewer',
        box9Valid,
        `Box 9 present as 9th card with live stat IDs, retention banner, and storageViewerModal`
    );

    // TEST 12: Distinct Purposes Between Box 8 and Box 9
    const box8ExplainsCapability = featuresHtml.includes('Learn About Data Persistence') || featuresHtml.includes('Explore Persistence Architecture');
    const box9ShowsActualData = featuresHtml.includes('View Stored Data');
    recordTest(
        'TEST 12: Distinct Purpose Separation (Box 8 vs Box 9)',
        box8ExplainsCapability && box9ShowsActualData,
        `Box 8 has explanatory CTA; Box 9 has live action ("View Stored Data")`
    );

    // Restore realistic timetable state
    await request('POST', '/api/generate', {
      teachers: [{ name: 'Dr. Alan Turing' }, { name: 'Prof. Grace Hopper' }],
      subjects: ['Discrete Mathematics', 'Theory of Computation', 'Computer Systems'],
      sections: [{ name: 'CSE-1' }, { name: 'CSE-2' }],
      rooms: [{ room_number: '101', room_type: 'Classroom' }, { room_number: 'LAB-1', room_type: 'Laboratory' }],
      room_type: 'Classroom',
      working_days_per_week: 5,
      working_start_time: '09:00',
      working_end_time: '14:00'
    });

    console.log('\n======================================================');
    const passedCount = results.filter(r => r.passed).length;
    console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${results.length - passedCount}`);
    console.log('======================================================\n');

    if (passedCount === results.length) {
      console.log('🎉 ALL STORAGE & RETENTION TESTS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.error('⚠️ SOME TESTS FAILED.');
      process.exit(1);
    }

  } catch (err) {
    console.error('Runtime error during test execution:', err);
    process.exit(1);
  }
}

runTests();
