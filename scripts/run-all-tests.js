const { execSync } = require('child_process');

const suites = [
  ['Frontend UI Elements & Bindings', 'node scripts/verify-generate-ui.js'],
  ['Audit Test Suite (Tests 1–13)', 'node scripts/test-generate-audit-suite.js'],
  ['Generate Enhancements Verification', 'node scripts/test-generate-enhancements.js'],
  ['Department, Room & Lab Verification', 'node scripts/test-department-room-lab.js'],
  ['Break Management & Workload Verification', 'node scripts/test-breaks-and-workload.js'],
  ['Multi-Subject & Lab Classes Suite', 'node scripts/test-multi-subject-and-labs.js'],
  ['Weekly Day-Wise Timetable Suite', 'node scripts/test-weekly-timetable.js'],
  ['Storage Retention Verification', 'node scripts/test-storage-retention.js'],
  ['Advanced Feature Matrix', 'node scripts/test-advanced-feature-matrix.js'],
  ['Lab Period Boundary & Afternoon Scheduling Suite', 'node scripts/test-lab-period-fix.js'],
  ['Lab Time Auto Period Matching & Validation Suite', 'node scripts/test-lab-time-auto-matching.js'],
  ['16-Point Flexible Daily Scheduling Suite', 'node scripts/test-flexible-daily-scheduling.js'],
  ['E2E Browser Generate Timetable Flow', 'node scripts/test-e2e-generate-flow.js']
];

console.log('============================================================');
console.log('SCHEDX MASTER REGRESSION & AUDIT RUNNER');
console.log('============================================================\n');

let passed = 0;
for (const [name, cmd] of suites) {
  try {
    execSync(cmd, { stdio: 'ignore' });
    console.log('✓ PASS:', name);
    passed++;
  } catch (err) {
    console.error('✗ FAIL:', name);
  }
}

console.log('\n============================================================');
console.log(`TOTAL SUITES: ${suites.length} | PASSED: ${passed} | FAILED: ${suites.length - passed}`);
console.log('============================================================');

if (passed !== suites.length) process.exit(1);
