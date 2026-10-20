/**
 * Verification script for SchedX Generate Page Professional Redesign
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS | ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL | ${message}`);
    failed++;
  }
}

console.log('========================================================');
console.log('   SCHEDX GENERATE PAGE REDESIGN VERIFICATION SUITE     ');
console.log('========================================================\n');

const generateHtmlPath = path.join(__dirname, '..', 'public', 'generate.html');
const scriptJsPath = path.join(__dirname, '..', 'public', 'script.js');
const styleCssPath = path.join(__dirname, '..', 'public', 'style.css');

const generateHtml = fs.readFileSync(generateHtmlPath, 'utf8');
const scriptJs = fs.readFileSync(scriptJsPath, 'utf8');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');

// 1. Unique Technical Page Heading
console.log('--- 1. Unique Technical Page Heading ---');
assert(generateHtml.includes('page-heading--generate'), 'Generate page has unique .page-heading--generate wrapper');
assert(generateHtml.includes('BUILD YOUR SCHEDULE'), 'Eyebrow contains "BUILD YOUR SCHEDULE"');
assert(generateHtml.includes('STUDIO MODE'), 'Studio indicator badge present');
assert(generateHtml.includes('<h1 class="page-title page-title--generate">GENERATE TIMETABLE</h1>'), 'Title is "GENERATE TIMETABLE"');
assert(generateHtml.includes('accent-tech-bracket'), 'Technical bracket accent line present');
assert(generateHtml.includes('Configure teachers, subjects, sections and rooms'), 'Descriptive subtitle present');

// 2. 6 Structured Form Step Cards
console.log('\n--- 2. Form Architecture (6 Step Cards) ---');
assert(generateHtml.includes('id="stepTeachersCard"'), 'Step 1: #stepTeachersCard present');
assert(generateHtml.includes('id="stepSubjectsCard"'), 'Step 2: #stepSubjectsCard present');
assert(generateHtml.includes('id="stepSectionsCard"'), 'Step 3: #stepSectionsCard present');
assert(generateHtml.includes('id="stepRoomsCard"'), 'Step 4: #stepRoomsCard present');
assert(generateHtml.includes('id="stepRequirementsCard"'), 'Step 5: #stepRequirementsCard present');
assert(generateHtml.includes('id="stepGenerateCard"'), 'Step 6: #stepGenerateCard present');

assert(generateHtml.includes('<div class="step-badge">01</div>'), 'Step badge 01 present');
assert(generateHtml.includes('<div class="step-badge">02</div>'), 'Step badge 02 present');
assert(generateHtml.includes('<div class="step-badge">03</div>'), 'Step badge 03 present');
assert(generateHtml.includes('<div class="step-badge">04</div>'), 'Step badge 04 present');
assert(generateHtml.includes('<div class="step-badge">05</div>'), 'Step badge 05 present');
assert(generateHtml.includes('<div class="step-badge step-badge--action">06</div>'), 'Step action badge 06 present');

// 3. Teachers Configuration
console.log('\n--- 3. Teachers Configuration ---');
assert(generateHtml.includes('id="teacherCount"'), '#teacherCount input exists');
assert(generateHtml.includes('id="addTeacherBtn"'), '#addTeacherBtn exists');
assert(generateHtml.includes('id="teacherFields"'), '#teacherFields container exists');
assert(!generateHtml.includes('specialization'), 'Strictly no specialization on Generate Page');
assert(scriptJs.includes('trimmedTeacherNames.map((name) => ({ name }))'), 'Payload strictly uses teacher name only');

// 4. Subjects Configuration & Maximum Subjects Rule
console.log('\n--- 4. Subjects Configuration & Limit Rule ---');
assert(generateHtml.includes('id="maxSubjectsAllowed"'), '#maxSubjectsAllowed element exists');
assert(generateHtml.includes('id="addSubjectBtn"'), '#addSubjectBtn exists');
assert(generateHtml.includes('id="subjectFields"'), '#subjectFields container exists');
assert(scriptJs.includes('tCount >= 1 ? tCount + 2 : 3'), 'Formula: Max Subjects = Teachers + 2 present in script');
assert(scriptJs.includes('trimmedSubjectNames.length > maxAllowedSubjects'), 'Form submission validates max subjects rule');

// 5. Classes / Sections Configuration
console.log('\n--- 5. Classes / Sections Configuration ---');
assert(generateHtml.includes('id="addSectionBtn"'), '#addSectionBtn exists');
assert(generateHtml.includes('id="sectionFields"'), '#sectionFields container exists');
assert(scriptJs.includes('lowerSectionNames.length'), 'Unique section names validation present');

// 6. Rooms Configuration
console.log('\n--- 6. Rooms Configuration ---');
assert(generateHtml.includes('id="addRoomBtn"'), '#addRoomBtn exists');
assert(generateHtml.includes('id="roomFields"'), '#roomFields container exists');
assert(scriptJs.includes('Classroom') && scriptJs.includes('Laboratory'), 'Room types Classroom and Laboratory supported');
assert(scriptJs.includes('lowerRoomNumbers.length'), 'Unique room numbers validation present');

// 7. Room Requirement & Schedule Bounds
console.log('\n--- 7. Room Requirement & Bounds Filter ---');
assert(generateHtml.includes('id="roomType"'), '#roomType select exists');
assert(generateHtml.includes('value="Classroom"') && generateHtml.includes('value="Laboratory"') && generateHtml.includes('value="Both"'), 'Options: Classroom, Laboratory, Both present');
assert(generateHtml.includes('id="workingDays"'), '#workingDays input exists');
assert(generateHtml.includes('id="startTime"'), '#startTime input exists');
assert(generateHtml.includes('id="endTime"'), '#endTime input exists');
assert(scriptJs.includes('startTime >= endTime'), 'Start and end time validation present');

// 8. Generate Button & Loading State
console.log('\n--- 8. Generate Action Button & Multi-State Feedback ---');
assert(generateHtml.includes('id="generateSubmitBtn"'), '#generateSubmitBtn exists');
assert(generateHtml.includes('btn-generate-primary'), '.btn-generate-primary class assigned');
assert(generateHtml.includes('btn-spinner'), '.btn-spinner element present');
assert(scriptJs.includes('Generating your timetable...'), 'Script sets loading text "Generating your timetable..."');
assert(scriptJs.includes("submitBtn.classList.add('is-loading')"), 'Script toggles is-loading class');
assert(scriptJs.includes("submitBtn.disabled = true"), 'Script disables button during generation');

// 9. Current Class Compact Card (Requirement 14)
console.log('\n--- 9. Current Class Card (Requirement 14) ---');
assert(generateHtml.includes('id="currentClassWrapper"'), '#currentClassWrapper container exists');
assert(scriptJs.includes('function renderCurrentClass(timetable)'), 'renderCurrentClass function defined in script.js');
assert(scriptJs.includes('CURRENT CLASS &bull; LIVE'), 'Live ongoing lecture badge present');
assert(scriptJs.includes('NEXT UPCOMING CLASS TODAY'), 'Next upcoming class status present');
assert(scriptJs.includes('metric-label') && scriptJs.includes('TEACHER') && scriptJs.includes('SECTION') && scriptJs.includes('ROOM'), 'Current class card displays Teacher, Section, Room, Time');

// 10. Secondary SchedX To Do Section
console.log('\n--- 10. Secondary SchedX To Do Section ---');
assert(generateHtml.includes('id="schedxTodoSection"'), '#schedxTodoSection exists');
assert(generateHtml.includes('id="todoCalendarGrid"'), '#todoCalendarGrid exists');
assert(generateHtml.includes('id="todoTasksContainer"'), '#todoTasksContainer exists');
assert(generateHtml.includes('id="todoTaskModal"'), '#todoTaskModal exists');
// Confirm it comes AFTER timetableSection
const timetableIdx = generateHtml.indexOf('id="timetableSection"');
const todoIdx = generateHtml.indexOf('id="schedxTodoSection"');
assert(todoIdx > timetableIdx, 'SchedX To Do section is placed as a secondary productivity module below Timetable Section');

// 11. CSS Design Tokens & Responsiveness
console.log('\n--- 11. CSS Design Tokens & Responsiveness ---');
assert(styleCss.includes('.form-step-card'), '.form-step-card defined in CSS');
assert(styleCss.includes('.step-badge'), '.step-badge defined in CSS');
assert(styleCss.includes('.btn-generate-primary'), '.btn-generate-primary defined in CSS');
assert(styleCss.includes('.btn-generate-primary.is-loading'), 'Loading spinner state defined in CSS');
assert(styleCss.includes('.current-class-card'), '.current-class-card defined in CSS');
assert(styleCss.includes('.live-pulse-dot') || styleCss.includes('.live-dot'), 'Live pulse animation defined in CSS');
assert(styleCss.includes('@media (max-width: 900px)'), 'Tablet breakpoint @media (max-width: 900px) defined');
assert(styleCss.includes('@media (max-width: 600px)'), 'Mobile breakpoint @media (max-width: 600px) defined');

// 12. Live Server HTTP Verification
console.log('\n--- 12. Live HTTP Endpoint Check ---');
http.get('http://localhost:3000/generate', (res) => {
  assert(res.statusCode === 200, `GET /generate returned HTTP 200 (received ${res.statusCode})`);
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    assert(data.includes('stepTeachersCard'), 'Live HTTP response serves #stepTeachersCard');
    assert(data.includes('stepGenerateCard'), 'Live HTTP response serves #stepGenerateCard');
    assert(data.includes('currentClassWrapper'), 'Live HTTP response serves #currentClassWrapper');
    assert(data.includes('schedxTodoSection'), 'Live HTTP response serves #schedxTodoSection');
    console.log('\n========================================================');
    console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('========================================================');
    process.exit(failed > 0 ? 1 : 0);
  });
}).on('error', (err) => {
  console.error('Failed to connect to dev server:', err.message);
  process.exit(1);
});
