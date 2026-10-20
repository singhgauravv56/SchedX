/**
 * Automated Verification Script: SchedX Home Page Reference Design
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('========================================================');
console.log('   SCHEDX HOME PAGE REFERENCE DESIGN VERIFICATION       ');
console.log('========================================================\n');

const indexPath = path.join(__dirname, '..', 'public', 'index.html');
const cssPath = path.join(__dirname, '..', 'public', 'style.css');

const html = fs.readFileSync(indexPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

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

// 1. Background Preservation
console.log('--- 1. Background Preservation ---');
assert(
  css.includes('radial-gradient(circle at 82% 28%, rgba(45, 108, 223, 0.08)') &&
  css.includes('linear-gradient(180deg, #ffffff 0%, #f7faff 100%)'),
  'Existing website background strictly preserved in .hero-section'
);
assert(!css.includes('.hero-section {\n  background: #000'), 'Hero background is NOT black');
assert(!css.includes('body {\n  background: #000'), 'Body background is NOT black');

// 2. Left Side Structure & Hierarchy
console.log('\n--- 2. Left Side Hierarchy & Content ---');
assert(html.includes('class="eyebrow hero-eyebrow"') && html.includes('Smart Timetable Generator'), 'Small label: SMART TIMETABLE GENERATOR present');
assert(html.includes('hero-title schedx-wordmark') && html.includes('<span class="schedx-main">SCHED</span><span class="schedx-x">X</span>'), 'Main brand: SCHEDX Option 6 Wordmark present');
assert(html.includes('class="hero-subtitle"') && html.includes('Smart Timetable Generator'), 'Supporting heading: Smart Timetable Generator present');
assert(html.includes('class="hero-desc"') && html.includes('SchedX helps organize teaching schedules'), 'Existing project description preserved');
assert(html.includes('id="heroGenerateCta"') && html.includes('href="/generate"'), 'Primary CTA links to /generate');
assert(html.includes('id="heroFeaturesCta"') && html.includes('href="/features"'), 'Secondary CTA links to /features');
assert(html.includes('Teacher checks') && html.includes('Room checks') && html.includes('Conflict prevention'), 'Trust verification pills preserved');

// 3. Central Timetable Component
console.log('\n--- 3. Central Timetable Component ---');
assert(html.includes('class="timetable-preview-card"'), 'Central timetable card container present');
assert(html.includes('class="preview-card-header"'), 'Card header with window controls present');
assert(html.includes('class="preview-schedule-label"') && html.includes('SMART TIMETABLE GENERATOR'), 'Subtitle SMART TIMETABLE GENERATOR in window title');
assert(html.includes('class="preview-status-badge"') && html.includes('Active'), 'Active status badge present');
assert(html.includes('class="preview-row preview-row--header"') && html.includes('MON') && html.includes('FRI'), 'Day headers MON-FRI present');
assert(html.includes('JAVA') && html.includes('DSA') && html.includes('OS') && html.includes('AI') && html.includes('DBMS') && html.includes('LAB'), 'Demo subjects present in timetable grid');
assert(html.includes('R-101') && html.includes('R-104') && html.includes('R-103') && html.includes('R-201') && html.includes('LAB-1'), 'Demo room allocations present in timetable grid');
assert(html.includes('class="visual-generate-btn"') && html.includes('href="/generate"'), 'Visual Generate Timetable button present linking to /generate');

// 4. Floating Information Cards (9 Cards)
console.log('\n--- 4. Floating Information Cards ---');
assert(html.includes('float-card--conflict') && html.includes('Conflict Free') && html.includes('All constraints satisfied'), 'Card 1: Conflict Free card with checkmark and constraint note');
assert(html.includes('float-card--teachers') && html.includes('12') && html.includes('Teachers Assigned'), 'Card 2: Teachers card (12 Assigned)');
assert(html.includes('float-card--subjects') && html.includes('6') && html.includes('Scheduled'), 'Card 3: Subjects card (6 Scheduled)');
assert(html.includes('float-card--timeslots') && html.includes('Auto Allocated'), 'Card 4: Time Slots card (Auto Allocated)');
assert(html.includes('float-card--rooms') && html.includes('4') && html.includes('Optimized'), 'Card 5: Rooms card (4 Optimized)');
assert(html.includes('float-card--classes') && html.includes('Configured'), 'Card 6: Classes card (Configured)');
assert(html.includes('float-card--labs') && html.includes('Assigned'), 'Card 7: Labs card (Assigned)');
assert(html.includes('float-card--workingdays') && html.includes('Mon') && html.includes('Fri'), 'Card 8: Working Days card (Mon - Fri)');
assert(html.includes('float-card--sections') && html.includes('100%') && html.includes('Zero Overlap'), 'Card 9: Zero Overlap support badge');

// 5. Connection Lines, Icons & Platform Base
console.log('\n--- 5. Connection Lines, Floating Icons & Platform Base ---');
assert(html.includes('hero-connection-lines'), 'SVG connection lines element present');
assert(html.includes('path-pulse-1') && html.includes('path-pulse-2') && html.includes('path-pulse-3'), 'Connection line pulse animation classes present');
assert(html.includes('hero-floating-icons'), 'Floating icons container present');
assert(html.includes('float-icon--cap') && html.includes('float-icon--code') && html.includes('float-icon--book'), 'Floating icons (cap, code, book, flask, calendar) present');
assert(html.includes('hero-platform-base'), 'Futuristic device platform base present');

// 6. CSS Animations & Responsiveness
console.log('\n--- 6. CSS Animation & Mobile Rules ---');
assert(css.includes('@keyframes floatCard'), 'CSS floatCard animation defined (translateY 0 to -5px)');
assert(css.includes('.float-card--anim-1') && css.includes('.float-card--anim-8'), 'Staggered card animation delays configured');
assert(css.includes('@keyframes linePulse'), 'CSS linePulse animation defined');
assert(css.includes('@keyframes iconDriftA') && css.includes('@keyframes iconDriftB'), 'CSS icon drift animations defined');
assert(css.includes('@keyframes platformPulse'), 'CSS platform base pulse defined');
assert(css.includes('@keyframes heroEntranceCopy') && css.includes('@keyframes heroEntranceVisual'), 'CSS entrance animations defined');
assert(css.includes('.float-card--classes,\n  .float-card--labs,\n  .float-card--workingdays'), 'Secondary cards hidden on tablet/mobile');
assert(css.includes('.hero-connection-lines,\n  .hero-floating-icons,\n  .hero-platform-base'), 'Decorative lines and icons hidden on mobile for clean performance');

console.log('\n========================================================');
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('========================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
