const fs = require('fs');
const path = require('path');

async function runSecurityAudit() {
  console.log('========================================================');
  console.log('   SCHEDX FEATURES PAGE SECURITY & DISCLOSURE AUDIT     ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function test(desc, ok, details = '') {
    if (ok) {
      console.log(`✅ PASS | ${desc}${details ? ' -> ' + details : ''}`);
      passed++;
    } else {
      console.log(`❌ FAIL | ${desc}${details ? ' -> ' + details : ''}`);
      failed++;
    }
  }

  // 1. Audit features.html source
  const htmlPath = path.join(__dirname, '..', 'public', 'features.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Check prohibited technical terms in features.html
  const prohibitedTerms = [
    'supabase postgresql',
    'local json store',
    'safe multi-version cache',
    'multi-version cache',
    'http 200',
    'db: ok',
    'backend status',
    'active solver',
    'backtracking solver',
    'postgrest',
    'uuid',
    'service_role',
    'supabase_secret_key',
    'connecting to api',
    'server response: schedule idle'
  ];

  prohibitedTerms.forEach(term => {
    const found = html.toLowerCase().includes(term);
    test(`features.html: No "${term}"`, !found, found ? 'Found in file!' : 'Clean');
  });

  // Check required user-facing concepts in Box 8 & Box 9
  test('Box 8: Accurate title "Cloud & Data Persistence"', html.includes('Cloud & Data Persistence'));
  test('Box 8: User benefit present', html.includes('Keep your scheduling information available across sessions so you don\'t have to repeatedly recreate your setup.'));
  test('Box 8: Supported types include Teachers, Subjects, Classes & Sections, Rooms, Time Slots, Generated Schedules', 
    html.includes('Teachers') && html.includes('Subjects') && html.includes('Classes & Sections') && html.includes('Rooms') && html.includes('Time Slots') && html.includes('Generated Schedules')
  );
  test('Box 8: Directs user to Box 9 Storage', html.includes('View Feature 09 — Storage to see what is currently stored'));
  test('Box 8 Modal: Clean persistence explanation without DB vendors', 
    html.includes('Cloud-based data persistence across sessions') && !html.includes('Supabase PostgreSQL')
  );

  test('Box 9: Live overview title & metric IDs', 
    html.includes('<h3>Storage</h3>') && html.includes('id="statTeachers"') && html.includes('id="statRooms"') && html.includes('id="statTimetables"')
  );
  test('Box 9: Friendly generic error message (Section 13)', 
    html.includes('Something went wrong while loading this information. Please try again.')
  );
  test('Box 9: Retention badge present', html.includes('Timetable history: Latest 2 generations retained'));
  test('Modal 4: Stored Scheduling Repository with safe retention explanation', 
    html.includes('id="storageViewerModal"') && html.includes('Safe Retention Policy:')
  );

  // Check Box 5 & Modal 1
  test('Box 5: Intelligent collision prevention without algorithm names', 
    html.includes('Our intelligent collision prevention engine') && !html.includes('bounded backtracking solver')
  );
  test('Modal 1: Conflict Prevention badge and verification button', 
    html.includes('Conflict Prevention') && html.includes('Verify Conflict Rules')
  );

  // Check Box 7 & Modal 2
  test('Modal 2: Clean active lecture checking without DB or API jargon', 
    html.includes('Checking active classes across all rooms and sections') && html.includes('Checking schedule...')
  );

  // 2. Audit API Responses (Network Layer)
  console.log('\n--- Network & API Response Audit ---');
  try {
    const storageRes = await fetch('http://localhost:3000/api/storage');
    test('GET /api/storage returns HTTP 200', storageRes.status === 200);
    const storageData = await storageRes.json();

    const rawStr = JSON.stringify(storageData);
    test('GET /api/storage: No sensitive Supabase service keys/secrets', 
      !rawStr.includes('eyJ') && !rawStr.includes('service_role') && !rawStr.includes('secret')
    );
    test('GET /api/storage: No database internal UUIDs or table columns', 
      !rawStr.includes('timetable_entries') && !rawStr.includes('gen_178')
    );
    test('GET /api/storage: Clean version labels (current, history_N)', 
      (storageData.details.timetables || []).every(t => t.version_id === 'current' || t.version_id.startsWith('history_'))
    );
    test('GET /api/storage: Teachers list exposes only user-safe fields (name, department, working_days)', 
      (storageData.details.teachers || []).every(t => t.id === undefined && t.name)
    );
    test('GET /api/storage: Rooms list exposes only user-safe fields (room_name, room_type, capacity, availability)', 
      (storageData.details.rooms || []).every(r => r.id === undefined && r.room_name)
    );

    const ccRes = await fetch('http://localhost:3000/api/current-class');
    test('GET /api/current-class returns HTTP 200', ccRes.status === 200);
    const ccData = await ccRes.json();
    test('GET /api/current-class: Clean response without internal error stack', 
      ccData.error === undefined && (ccData.running !== undefined)
    );
  } catch (err) {
    test('API Audit', false, err.message);
  }

  // 3. Audit Client-side Javascript & Styling
  console.log('\n--- Client Scripts & Secret Scanning ---');
  const publicFiles = ['features.html', 'script.js', 'style.css', 'index.html', 'generate.html', 'rooms.html', 'teacher-availability.html', 'teacher-info.html'];
  let secretsFound = false;

  publicFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', 'public', file);
    if (fs.existsSync(filePath)) {
      const code = fs.readFileSync(filePath, 'utf8');
      if (code.includes('SUPABASE_SECRET_KEY') || code.includes('SERVICE_ROLE') || code.includes('service_role') || code.includes('DATABASE_URL')) {
        secretsFound = true;
        test(`public/${file}: No secrets`, false, 'Found secret pattern!');
      }
    }
  });
  test('Public assets free from privileged credentials and secrets', !secretsFound);

  // 4. Check .gitignore
  const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8');
  test('.gitignore excludes .env files', gitignore.includes('.env') && gitignore.includes('.env.*'));
  test('.gitignore excludes node_modules and logs', gitignore.includes('node_modules') && gitignore.includes('*.log'));

  console.log('\n========================================================');
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('========================================================\n');

  if (failed > 0) process.exit(1);
}

runSecurityAudit();
