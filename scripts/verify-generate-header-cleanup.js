/**
 * Verification Script for SchedX Generate Page Header Cleanup
 * Tests:
 * 1. Removal of "BUILD YOUR SCHEDULE"
 * 2. Removal of the subtitle / description line below "GENERATE TIMETABLE"
 * 3. Preservation of main heading "GENERATE TIMETABLE" (h1)
 * 4. Solid underline via CSS (border-bottom, solid, not dashed/dotted/animated)
 * 5. Underline width based on heading width (display: inline-block)
 * 6. Underline brand blue color (#2563eb)
 * 7. Spacing adjustments without large gaps
 * 8. Code cleanup: removal of unused CSS classes
 * 9. Form sections preserved (01 Teachers, 02 Subjects, 03 Sections, 04 Rooms, 05 Requirements, 06 Action)
 * 10. Generate Timetable action button and Clear Form button preserved
 * 11. SCHEDX TO DO calendar and tasks preserved
 * 12. Live HTTP GET /generate response verification
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

let passed = 0;
let failed = 0;
const results = [];

function check(testName, condition, details = '') {
  if (condition) {
    console.log(`✅ PASS | ${testName}${details ? ` (${details})` : ''}`);
    passed++;
    results.push({ test: testName, status: 'PASS', details });
  } else {
    console.error(`❌ FAIL | ${testName}${details ? ` (${details})` : ''}`);
    failed++;
    results.push({ test: testName, status: 'FAIL', details });
  }
}

console.log('================================================================');
console.log('    SCHEDX GENERATE PAGE HEADER CLEANUP VERIFICATION SUITE      ');
console.log('================================================================\n');

const generateHtmlPath = path.join(__dirname, '..', 'public', 'generate.html');
const styleCssPath = path.join(__dirname, '..', 'public', 'style.css');

const html = fs.readFileSync(generateHtmlPath, 'utf8');
const css = fs.readFileSync(styleCssPath, 'utf8');

// 1. Text Removals
console.log('--- 1. Removed Elements & Text ---');
check('1. "BUILD YOUR SCHEDULE" text completely removed from HTML', !html.includes('BUILD YOUR SCHEDULE'));
check('2. "STUDIO MODE" badge completely removed from Generate header', !html.includes('STUDIO MODE'));
check('3. Bracket accent line completely removed from Generate header', !html.includes('accent-tech-bracket') && !html.includes('accent-tech-bar'));
check('4. Explanatory subtitle completely removed from Generate header', !html.includes('Configure teachers, subjects, sections and rooms'));
check('5. No replacement subtitles present in header', 
  !html.includes('Build your schedule') && 
  !html.includes('Create your timetable') && 
  !html.includes('Configure your schedule') &&
  !html.includes('Smart timetable generation') &&
  !html.includes('Set up your academic schedule')
);

// 2. Main Heading Preservation
console.log('\n--- 2. Main Heading Preservation ---');
check('6. Main heading "GENERATE TIMETABLE" preserved', html.includes('GENERATE TIMETABLE'));
check('7. Main heading is semantic <h1> element', html.includes('<h1 class="page-title page-title--generate">GENERATE TIMETABLE</h1>'));
check('8. Unique wrapper .page-heading--generate preserved', html.includes('page-heading--generate'));

// 3. Underline CSS Styling
console.log('\n--- 3. Underline CSS Styling ---');
const generateTitleCssMatch = css.match(/\.page-title--generate\s*\{([^}]+)\}/);
const generateTitleCss = generateTitleCssMatch ? generateTitleCssMatch[1] : '';

check('9. CSS rule for .page-title--generate exists', !!generateTitleCssMatch);
check('10. Underline is solid via border-bottom', generateTitleCss.includes('border-bottom:') && generateTitleCss.includes('solid'));
check('11. Underline is not dashed or dotted', !generateTitleCss.includes('dashed') && !generateTitleCss.includes('dotted'));
check('12. Underline is not full-width (display: inline-block ensures heading width)', generateTitleCss.includes('display: inline-block'));
check('13. Underline uses SchedX brand blue (#2563eb)', generateTitleCss.includes('#2563eb'));
check('14. Underline padding/spacing is well-balanced', generateTitleCss.includes('padding-bottom:'));
check('15. Heading animation does not animate the border style', !css.includes('@keyframes') || !css.match(/@keyframes[^{]+{[^}]*border-bottom/));

// 4. Code Cleanup
console.log('\n--- 4. Code Cleanup of Unused Elements & Classes ---');
check('16. Unused .page-heading--generate .eyebrow--generate removed', !css.includes('.page-heading--generate .eyebrow--generate'));
check('17. Unused .studio-badge removed', !css.includes('.studio-badge'));
check('18. Unused .heading-accent-line--generate removed', !css.includes('.heading-accent-line--generate'));
check('19. Unused .accent-tech-bar removed', !css.includes('.accent-tech-bar'));
check('20. Unused .page-subtitle--generate removed from heading rules', !css.includes('.page-subtitle--generate {'));

// 5. Responsive Styling
console.log('\n--- 5. Responsive Styling ---');
check('21. Fluid font size clamp() configured on title', generateTitleCss.includes('clamp('));
check('22. Mobile breakpoint for <= 480px present', css.includes('.page-title--generate') && css.includes('max-width: 480px'));
check('23. Mobile breakpoint for <= 380px present for compact screens', css.includes('.page-title--generate') && css.includes('max-width: 380px'));

// 6. Form Sections & Elements Preserved
console.log('\n--- 6. Form Sections & Functionality Preserved ---');
check('24. Step 01 Teachers card preserved (#stepTeachersCard)', html.includes('id="stepTeachersCard"') && html.includes('Teachers & Assigned Subjects'));
check('25. Step 02 Subjects card preserved (#stepSubjectsCard)', html.includes('id="stepSubjectsCard"') && html.includes('Subjects'));
check('26. Step 03 Sections card preserved (#stepSectionsCard)', html.includes('id="stepSectionsCard"') && html.includes('Classes / Sections'));
check('27. Step 04 Rooms card preserved (#stepRoomsCard)', html.includes('id="stepRoomsCard"') && html.includes('Rooms'));
check('28. Step 05 Room Requirement card preserved (#stepRequirementsCard)', html.includes('id="stepRequirementsCard"') && html.includes('Room Requirement'));
check('29. Step 06 Generate Action card preserved (#stepGenerateCard)', html.includes('id="stepGenerateCard"'));
check('30. Generate Timetable action button preserved (#generateSubmitBtn)', html.includes('id="generateSubmitBtn"') && html.includes('GENERATE TIMETABLE'));
check('31. Clear Form button preserved (#generateResetBtn)', html.includes('id="generateResetBtn"') && html.includes('Clear Form'));
check('32. Working Days configuration preserved', html.includes('id="workingDayPills"') && html.includes('id="workingDays"'));
check('33. Working Time Range inputs preserved', html.includes('id="startTime"') && html.includes('id="endTime"'));
check('34. SCHEDX TO DO section preserved', html.includes('class="schedx-todo-section"') && html.includes('SCHEDX TO DO'));
check('35. TO DO calendar and tasks containers preserved', html.includes('id="todoCalendarGrid"') && html.includes('id="todoTasksList"'));

// 7. Live Server HTTP Verification
console.log('\n--- 7. Live HTTP Verification ---');
const req = http.get('http://127.0.0.1:3000/generate', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    check('36. HTTP GET /generate returns HTTP 200', res.statusCode === 200, `Status ${res.statusCode}`);
    check('37. Live response contains GENERATE TIMETABLE heading', body.includes('<h1 class="page-title page-title--generate">GENERATE TIMETABLE</h1>'));
    check('38. Live response does NOT contain BUILD YOUR SCHEDULE', !body.includes('BUILD YOUR SCHEDULE'));
    check('39. Live response does NOT contain old subtitle', !body.includes('Configure teachers, subjects, sections and rooms'));
    check('40. Live response includes Generate button', body.includes('id="generateSubmitBtn"'));

    console.log('\n================================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });
});

req.on('error', (err) => {
  check('36. HTTP GET /generate connection', false, err.message);
  console.log(`\nTOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  process.exit(1);
});
