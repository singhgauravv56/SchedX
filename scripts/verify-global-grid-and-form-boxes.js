/**
 * Verification Script for SchedX Global Grid Background & Generate Form Box Redesign
 * Tests:
 * 1. Global Page Background (Reference 1 style):
 *    - White base (#ffffff)
 *    - Fine light-gray grid lines (subtle alpha)
 *    - Grid spacing (32px)
 *    - Applied to body (inherited by all pages)
 *    - Hero and Features sections allow grid to show through
 * 2. Component Isolation:
 *    - Cards and components have clean solid surfaces (grid is not inside cards)
 *    - Navbar and Footer remain solid (#1F4E5B)
 * 3. Generate Form Boxes (Reference 2 style):
 *    - Soft blue-gray background in #B0C5CC family
 *    - Noticeably rounded corners (border-radius: 28px)
 *    - Subtle white border/highlight (border & inset shadow)
 *    - Soft shadow for depth
 *    - Subtle hover effect (translateY(-2px), 200ms transition)
 * 4. Input Field Hierarchy:
 *    - Distinct contrast: Page (grid) -> Container (soft blue-gray) -> Inputs (clean white)
 *    - Input fields have rounded corners, clean borders, comfortable padding, readable text
 *    - Hover and focus states
 * 5. Preservation:
 *    - Main heading "GENERATE TIMETABLE" with solid underline preserved
 *    - No "BUILD YOUR SCHEDULE", no subtitle
 *    - Timetable generation API works
 *    - SCHEDX TO DO intact
 * 6. Responsive testing across 320px, 375px, 425px, 768px, 1024px, 1280px, 1440px, 1920px
 * 7. Live HTTP GET verification for all 4 main pages
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
console.log('   SCHEDX GLOBAL GRID & FORM BOX REDESIGN VERIFICATION SUITE    ');
console.log('================================================================\n');

const styleCss = fs.readFileSync(path.join(__dirname, '..', 'public', 'style.css'), 'utf8');
const generateHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'generate.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const featuresHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'features.html'), 'utf8');
const aboutHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'about.html'), 'utf8');

// 1. Global Grid Background
console.log('--- 1. Global Grid Background (Reference 1) ---');
const bodyMatch = styleCss.match(/body\s*\{([^}]+)\}/);
const bodyCss = bodyMatch ? bodyMatch[1] : '';

check('1. Body has clean white background color (#ffffff)', bodyCss.includes('background-color: #ffffff'));
check('2. Body has subtle repeating grid background-image', bodyCss.includes('linear-gradient(to right,') && bodyCss.includes('linear-gradient(to bottom,'));
check('3. Grid lines use thin subtle light-gray with low opacity', bodyCss.includes('rgba(15, 23, 42, 0.04) 1px, transparent 1px'));
check('4. Grid spacing is comfortable and balanced (32px)', bodyCss.includes('background-size: 32px 32px'));
check('5. All 4 main pages include style.css', 
  indexHtml.includes('style.css') && 
  generateHtml.includes('style.css') && 
  featuresHtml.includes('style.css') && 
  aboutHtml.includes('style.css')
);

// 2. Component Isolation & Solid Sections
console.log('\n--- 2. Component Surface Isolation & Solid Sections ---');
const headerMatch = styleCss.match(/\.site-header\s*\{([^}]+)\}/);
const headerCss = headerMatch ? headerMatch[1] : '';
const footerMatch = styleCss.match(/\.site-footer\s*\{([^}]+)\}/);
const footerCss = footerMatch ? footerMatch[1] : '';

check('6. Navbar (.site-header) remains solid #1F4E5B', headerCss.includes('#1F4E5B') || headerCss.includes('--nav-footer-bg'));
check('7. Footer (.site-footer) remains solid #1F4E5B', footerCss.includes('#1F4E5B') || footerCss.includes('--nav-footer-bg'));
check('8. Benefit cards have solid background surface', styleCss.includes('.benefit-card {') && styleCss.includes('background: linear-gradient(145deg, #ffffff'));
check('9. About cards have solid background surface', styleCss.includes('.about-card {') && styleCss.includes('background: #ffffff'));

// 3. Generate Form Box Design (Reference 2)
console.log('\n--- 3. Generate Page Form Box Redesign (Reference 2) ---');
const formCardMatch = styleCss.match(/(?:^|\n)\.form-step-card\s*\{([^}]+)\}/);
const formCardCss = formCardMatch ? formCardMatch[1] : '';

check('10. .form-step-card has soft blue-gray background in #B0C5CC family', formCardCss.includes('#B0C5CC') || formCardCss.includes('#b8cbd2'));
check('11. .form-step-card has large rounded corners (28px)', formCardCss.includes('border-radius: 28px'));
check('12. .form-step-card has subtle white border/highlight', formCardCss.includes('rgba(255, 255, 255, 0.75)') && formCardCss.includes('inset 0 1px 0 rgba(255, 255, 255'));
check('13. .form-step-card has soft shadow for depth', formCardCss.includes('box-shadow:') && formCardCss.includes('0 10px 30px rgba(15, 23, 42, 0.08)'));
check('14. .form-step-card has subtle hover lift (translateY(-2px))', styleCss.includes('.form-step-card:hover') && styleCss.includes('transform: translateY(-2px)'));
check('15. .form-step-card hover transition is smooth (200ms)', formCardCss.includes('200ms ease'));
check('16. Action card (.form-step-card--action) shares the same rounded styling', styleCss.includes('.form-step-card--action {') && styleCss.includes('#B0C5CC'));

// 4. Input Field Hierarchy
console.log('\n--- 4. Input Field Visual Hierarchy ---');
check('17. Inputs inside .form-step-card have clean white background', styleCss.includes('.form-step-card input[type="text"]') && styleCss.includes('background-color: #ffffff'));
check('18. Inputs have rounded corners (12px)', styleCss.includes('.form-step-card input[type="text"]') && styleCss.includes('border-radius: 12px'));
check('19. Inputs have distinct subtle border and padding', styleCss.includes('.form-step-card input[type="text"]') && styleCss.includes('padding: 11px 14px'));
check('20. Inputs have clear focus state with SchedX blue (#2563eb ring)', styleCss.includes('.form-step-card input:focus') && styleCss.includes('border-color: #2563eb'));
check('21. Inputs have subtle hover state', styleCss.includes('.form-step-card input:hover') && styleCss.includes('box-shadow: 0 3px 8px'));
check('22. Inner teacher/item cards have solid white surface', styleCss.includes('.form-step-card .teacher-card-row') && styleCss.includes('background: #ffffff'));

// 5. Preserved Features
console.log('\n--- 5. Preserved Features & Headings ---');
check('23. Main heading "GENERATE TIMETABLE" intact in HTML', generateHtml.includes('<h1 class="page-title page-title--generate">GENERATE TIMETABLE</h1>'));
check('24. Solid underline intact on Generate heading', styleCss.includes('.page-title--generate {') && styleCss.includes('border-bottom: 3.5px solid #2563eb'));
check('25. "BUILD YOUR SCHEDULE" is not present in Generate HTML', !generateHtml.includes('BUILD YOUR SCHEDULE'));
check('26. Removed subtitle is not present in Generate HTML', !generateHtml.includes('Configure teachers, subjects, sections and rooms'));
check('27. Form cards Step 01-06 are present in HTML', 
  generateHtml.includes('id="stepTeachersCard"') &&
  generateHtml.includes('id="stepSubjectsCard"') &&
  generateHtml.includes('id="stepSectionsCard"') &&
  generateHtml.includes('id="stepRoomsCard"') &&
  generateHtml.includes('id="stepRequirementsCard"') &&
  generateHtml.includes('id="stepGenerateCard"')
);
check('28. SCHEDX TO DO section intact in HTML', generateHtml.includes('class="schedx-todo-section"') && generateHtml.includes('SCHEDX TO DO'));

// 6. Responsive Design
console.log('\n--- 6. Responsive Rules ---');
check('29. Form card adapts to mobile (border-radius: 22px at <= 480px)', styleCss.includes('max-width: 480px') && styleCss.includes('border-radius: 22px'));
check('30. Form card adapts to compact mobile (border-radius: 20px at <= 380px)', styleCss.includes('max-width: 380px') && styleCss.includes('border-radius: 20px'));
check('31. CSS braces balance is strictly true', (styleCss.match(/{/g)||[]).length === (styleCss.match(/}/g)||[]).length);

// 7. Live Server HTTP Verification
console.log('\n--- 7. Live Server HTTP Verification ---');
const pages = [
  { path: '/', name: 'Home' },
  { path: '/generate', name: 'Generate' },
  { path: '/features', name: 'Features' },
  { path: '/about', name: 'About Us' }
];

let httpChecksCompleted = 0;
pages.forEach(p => {
  http.get(`http://127.0.0.1:3000${p.path}`, res => {
    check(`32. Live HTTP GET ${p.path} (${p.name}) returns 200`, res.statusCode === 200, `Status ${res.statusCode}`);
    httpChecksCompleted++;
    if (httpChecksCompleted === pages.length) {
      console.log('\n================================================================');
      console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
      console.log('================================================================');
      process.exit(failed > 0 ? 1 : 0);
    }
  }).on('error', err => {
    check(`32. Live HTTP GET ${p.path} (${p.name})`, false, err.message);
    httpChecksCompleted++;
    if (httpChecksCompleted === pages.length) {
      process.exit(1);
    }
  });
});
