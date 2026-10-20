/**
 * SchedX — Formspark Feedback Integration Test Suite
 * Validates requirements:
 * 1. Feedback option appears in footer on all pages (Home, Generate, Features, About, etc.)
 * 2. Shared footer preservation (Explore, Contact Us, brand, etc.)
 * 3. Feedback box fields, options, validation, and layout
 * 4. Formspark Form ID (k2ffqAiIu) integration & payload structure
 * 5. Empty / whitespace message validation
 * 6. Live Formspark submission test & error handling
 * 7. Server proxy resilience & health
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

let testResults = [];
let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    testResults.push({ name: testName, status: 'PASS', details });
    console.log(`  [PASS] ${testName}`);
  } else {
    failedCount++;
    testResults.push({ name: testName, status: 'FAIL', details });
    console.error(`  [FAIL] ${testName}: ${details}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING SCHEDX FORMSPARK FEEDBACK INTEGRATION TESTS');
  console.log('================================================================\n');

  // Test 1: Verify Footer on All Required Pages
  console.log('1. Verifying Footer & Feedback Trigger on All Pages...');
  const pagesToTest = [
    { file: 'index.html', name: 'Home Page' },
    { file: 'generate.html', name: 'Generate Page' },
    { file: 'features.html', name: 'Features Page' },
    { file: 'about.html', name: 'About Us Page' },
    { file: 'rooms.html', name: 'Rooms Page' },
    { file: 'teacher-availability.html', name: 'Teacher Availability Page' },
    { file: 'teacher-info.html', name: 'Teacher Info Page' }
  ];

  for (const page of pagesToTest) {
    const filePath = path.join(PUBLIC_DIR, page.file);
    const content = fs.readFileSync(filePath, 'utf8');

    assert(
      content.includes('footer class="site-footer"'),
      `${page.name} (${page.file}) has footer element`
    );

    assert(
      content.includes('data-feedback-open') && content.includes('Feedback</button>'),
      `${page.name} (${page.file}) includes clickable Feedback trigger in footer`
    );

    assert(
      content.includes('footer-explore') && content.includes('footer-contact'),
      `${page.name} (${page.file}) preserves existing footer sections (Explore & Contact)`
    );

    assert(
      content.includes('schedx24x7@gmail.com') && content.includes('instagram-link'),
      `${page.name} (${page.file}) preserves email and Instagram contact links`
    );
  }

  // Test 2: Verify CSS Styling
  console.log('\n2. Verifying CSS Design System Tokens & Classes in style.css...');
  const cssContent = fs.readFileSync(path.join(PUBLIC_DIR, 'style.css'), 'utf8');

  assert(
    cssContent.includes('.footer-feedback-link'),
    'style.css contains .footer-feedback-link rule matching explore links'
  );
  assert(
    cssContent.includes('.feedback-modal-overlay'),
    'style.css contains .feedback-modal-overlay modal styles'
  );
  assert(
    cssContent.includes('.feedback-modal-card'),
    'style.css contains .feedback-modal-card styles'
  );
  assert(
    cssContent.includes('.feedback-status-success') && cssContent.includes('.feedback-status-error'),
    'style.css defines success and error status alert styles'
  );
  assert(
    cssContent.includes('@media (max-width: 480px)'),
    'style.css includes responsive mobile styles for feedback modal'
  );

  // Test 3: Verify script.js Implementation
  console.log('\n3. Verifying JavaScript Logic in script.js...');
  const jsContent = fs.readFileSync(path.join(PUBLIC_DIR, 'script.js'), 'utf8');

  assert(
    jsContent.includes("const FORMSPARK_FORM_ID = 'k2ffqAiIu'"),
    'script.js configures Formspark Form ID k2ffqAiIu'
  );
  assert(
    jsContent.includes('https://submit-form.com/k2ffqAiIu'),
    'script.js connects to Formspark endpoint'
  );
  assert(
    jsContent.includes('Share Your Feedback'),
    'script.js includes required heading "Share Your Feedback"'
  );
  assert(
    jsContent.includes('Help us improve SchedX. Tell us about your experience, suggestions, or any problems you encountered.'),
    'script.js includes exact required description'
  );
  assert(
    jsContent.includes('General Feedback') &&
    jsContent.includes('Feature Request') &&
    jsContent.includes('Bug Report') &&
    jsContent.includes('UI/UX Suggestion') &&
    jsContent.includes('Other'),
    'script.js defines all 5 required feedback category options'
  );
  assert(
    jsContent.includes('isFeedbackSubmitting'),
    'script.js prevents duplicate submissions with submission lock'
  );
  assert(
    jsContent.includes('Thank you! Your feedback has been submitted successfully.'),
    'script.js includes exact required success message'
  );
  assert(
    jsContent.includes('Your feedback could not be submitted. Please try again.'),
    'script.js includes exact required error message'
  );
  assert(
    jsContent.includes("event.key === 'Escape'"),
    'script.js supports closing modal with Escape key'
  );

  // Test 4: Live HTTP API Tests on Running Local Server
  console.log('\n4. Testing Local Backend Health & Feedback Proxy Endpoint...');
  const baseUrl = 'http://localhost:3000';

  // 4a. Health check
  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert(healthRes.status === 200, 'GET /api/health responds with 200 OK');
  } catch (err) {
    assert(false, 'GET /api/health reachable', err.message);
  }

  // 4b. Validation check: Reject empty message on /api/feedback
  try {
    const emptyRes = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' })
    });
    const emptyJson = await emptyRes.json();
    assert(
      emptyRes.status === 400 && emptyJson.success === false,
      'POST /api/feedback rejects empty / whitespace message with 400 Bad Request'
    );
  } catch (err) {
    assert(false, 'POST /api/feedback validation test', err.message);
  }

  // 4c. Valid feedback submission test directly to Formspark
  console.log('\n5. Testing Live Formspark Submission (Direct & Proxy)...');
  try {
    const testPayload = {
      name: 'SchedX Automated Test Runner',
      email: 'test-runner@schedx.local',
      category: 'General Feedback',
      message: 'Automated integration verification test for Formspark form k2ffqAiIu. SchedX timetable system.',
      source: 'SchedX Website'
    };

    const directRes = await fetch('https://submit-form.com/k2ffqAiIu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    assert(
      directRes.ok && (directRes.status === 200 || directRes.status === 201),
      `Direct Formspark submission to k2ffqAiIu succeeded with HTTP status ${directRes.status}`
    );
  } catch (err) {
    assert(false, 'Direct Formspark submission test', err.message);
  }

  // 4d. Server proxy test with valid payload
  try {
    const testProxyPayload = {
      name: 'SchedX Automated Test (Proxy)',
      email: 'proxy-test@schedx.local',
      category: 'UI/UX Suggestion',
      message: 'Automated test validating backend proxy resilience to Formspark k2ffqAiIu.',
      source: 'SchedX Website'
    };

    const proxyRes = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProxyPayload)
    });
    const proxyJson = await proxyRes.json();

    assert(
      proxyRes.status === 200 && proxyJson.success === true,
      'POST /api/feedback proxy successfully submits to Formspark and returns 200 with success confirmation'
    );
  } catch (err) {
    assert(false, 'POST /api/feedback proxy submission test', err.message);
  }

  // Summary
  console.log('\n================================================================');
  console.log(`🏁 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
