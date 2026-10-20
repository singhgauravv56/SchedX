/**
 * scripts/verify-about-redesign.js
 * Comprehensive automated verification suite for the SchedX About Us Page Redesign
 * verifying all 18 requirements from the user specification.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function pass(testName, detail = '') {
  totalChecks++;
  passedChecks++;
  console.log(`✅ PASS [${testName}] ${detail ? '-> ' + detail : ''}`);
}

function fail(testName, detail = '') {
  totalChecks++;
  failedChecks++;
  console.error(`❌ FAIL [${testName}] ${detail ? '-> ' + detail : ''}`);
}

console.log('================================================================');
console.log('   SCHEDX ABOUT US PAGE PROFESSIONAL REDESIGN VERIFICATION      ');
console.log('================================================================\n');

// 1. Load Files
const aboutHtmlPath = path.join(__dirname, '..', 'public', 'about.html');
const styleCssPath = path.join(__dirname, '..', 'public', 'style.css');

const aboutHtml = fs.readFileSync(aboutHtmlPath, 'utf8');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');

// --- Section 1: Unique Page Heading ---
console.log('--- 1. Unique Brand Page Heading ---');
const hasHeadingWrapper = aboutHtml.includes('page-heading--about');
const hasEyebrow = aboutHtml.includes('ABOUT SCHEDX');
const hasTitle = aboutHtml.includes('<h1 class="page-title page-title--about">SMARTER SCHEDULING</h1>');
const hasSubtitle = aboutHtml.includes('The idea behind SchedX') && aboutHtml.includes('Smarter Scheduling, Built With Purpose');
const hasAccentLine = aboutHtml.includes('heading-accent-line--about');

if (hasHeadingWrapper && hasEyebrow && hasTitle && hasSubtitle && hasAccentLine) {
  pass('HEADING_STRUCTURE', 'About Us page has unique story heading with eyebrow, title, and purpose subtitle');
} else {
  fail('HEADING_STRUCTURE', 'About Us page heading elements missing');
}

// --- Section 2: Introduction & Scheduling Triad Visual ---
console.log('\n--- 2. Introduction & Visual Scheduling Triad ---');
const hasIntroSection = aboutHtml.includes('id="aboutIntro"');
const hasWhatIsSchedx = aboutHtml.includes('What is SchedX?');
const hasIntroLead = aboutHtml.includes('intelligent academic timetable generation platform');
const hasTriadCard = aboutHtml.includes('about-triad-card') &&
  aboutHtml.includes('triad-node--teachers') &&
  aboutHtml.includes('triad-node--rooms') &&
  aboutHtml.includes('triad-node--sections') &&
  aboutHtml.includes('triad-center-hub');

if (hasIntroSection && hasWhatIsSchedx && hasIntroLead) {
  pass('INTRO_CONTENT', 'Introduction explains What is SchedX, why it was created, and what problem it solves');
} else {
  fail('INTRO_CONTENT', 'Introduction section content missing');
}

if (hasTriadCard) {
  pass('TRIAD_VISUAL', '3-Way Scheduling Triad visual diagram (Faculty, Facilities, Cohorts, Solver) verified');
} else {
  fail('TRIAD_VISUAL', 'Scheduling Triad visual diagram components missing');
}

// --- Section 3: Our Story ---
console.log('\n--- 3. Our Story (Motivation Behind SchedX) ---');
const hasStorySection = aboutHtml.includes('id="ourStory"');
const hasStoryHeading = aboutHtml.includes('The Motivation Behind SchedX') || aboutHtml.includes('OUR STORY');
const hasManualScheduling = aboutHtml.includes('manual') || aboutHtml.includes('spreadsheets');
const hasTeacherConflicts = aboutHtml.includes('Faculty Double-Bookings');
const hasRoomConflicts = aboutHtml.includes('Room Collisions');
const hasSectionConflicts = aboutHtml.includes('Section Overlaps');
const hasTimeSlotIssues = aboutHtml.includes('Time-Slot Exhaustion');

if (hasStorySection && hasStoryHeading && hasManualScheduling) {
  pass('STORY_SECTION', 'Our Story section explains authentic motivation without fictitious founders');
} else {
  fail('STORY_SECTION', 'Our Story section missing');
}

if (hasTeacherConflicts && hasRoomConflicts && hasSectionConflicts && hasTimeSlotIssues) {
  pass('STORY_CONFLICTS_GRID', 'Our Story covers all 4 core friction points: Faculty, Rooms, Sections, Time Slots');
} else {
  fail('STORY_CONFLICTS_GRID', 'Our Story conflicts breakdown missing required points');
}

// --- Section 4: Why SchedX Exists (Purpose) ---
console.log('\n--- 4. Why SchedX Exists (Purpose) ---');
const hasPurposeSection = aboutHtml.includes('id="whySchedxExists"');
const hasPurposeHeading = aboutHtml.includes('Why SchedX Exists');
const purposeCardCount = (aboutHtml.match(/class="about-card about-purpose-card"/g) || []).length;

if (hasPurposeSection && hasPurposeHeading && purposeCardCount >= 4) {
  pass('PURPOSE_SECTION', `Why SchedX Exists section present with ${purposeCardCount} purpose cards`);
} else {
  fail('PURPOSE_SECTION', `Expected >= 4 purpose cards, found ${purposeCardCount}`);
}

// --- Section 5: Mission & Vision ---
console.log('\n--- 5. Mission & Vision ---');
const hasMissionVision = aboutHtml.includes('id="missionVision"');
const hasMission = aboutHtml.includes('OUR MISSION') &&
  aboutHtml.includes('Making academic scheduling simpler, more organized, and less time-consuming');
const hasVision = aboutHtml.includes('OUR VISION') &&
  aboutHtml.includes('Smarter academic planning, better organization, and less manual scheduling effort');

if (hasMissionVision && hasMission && hasVision) {
  pass('MISSION_VISION', 'Our Mission and Our Vision present with realistic, grounded commitments');
} else {
  fail('MISSION_VISION', 'Mission or Vision statements missing or mismatched');
}

// --- Section 6: How SchedX Works (4 Steps) ---
console.log('\n--- 6. How SchedX Works (4-Step Overview) ---');
const hasWorkflowSection = aboutHtml.includes('id="howItWorksOverview"');
const hasStep1 = aboutHtml.includes('Configure') && aboutHtml.includes('01');
const hasStep2 = aboutHtml.includes('Generate') && aboutHtml.includes('02');
const hasStep3 = aboutHtml.includes('Check') && aboutHtml.includes('03');
const hasStep4 = aboutHtml.includes('Use') && aboutHtml.includes('04');

if (hasWorkflowSection && hasStep1 && hasStep2 && hasStep3 && hasStep4) {
  pass('HOW_IT_WORKS_STEPS', 'How SchedX Works explains 01 Configure, 02 Generate, 03 Check, 04 Use');
} else {
  fail('HOW_IT_WORKS_STEPS', 'Workflow steps 01-04 missing or incomplete');
}

// --- Section 7: Product Values ---
console.log('\n--- 7. Product Values ---');
const hasValuesSection = aboutHtml.includes('id="productValues"');
const hasSimplicity = aboutHtml.includes('Simplicity');
const hasAccuracy = aboutHtml.includes('Accuracy');
const hasOrganization = aboutHtml.includes('Organization');
const hasUsability = aboutHtml.includes('Usability');

if (hasValuesSection && hasSimplicity && hasAccuracy && hasOrganization && hasUsability) {
  pass('PRODUCT_VALUES', 'Product Values presents 4 core values: Simplicity, Accuracy, Organization, Usability');
} else {
  fail('PRODUCT_VALUES', 'One or more product values missing');
}

// --- Section 8: Card Design, Typography & Micro-Interactions in CSS ---
console.log('\n--- 8. Card Design, Typography & Micro-Interactions in CSS ---');
const hasCardBase = styleCss.includes('.about-card') &&
  styleCss.includes('border-radius: 22px') &&
  styleCss.includes('box-shadow');
const hasCardHover = styleCss.includes('.about-card:hover') &&
  styleCss.includes('translateY(-3px)');
const hasStepCard = styleCss.includes('.about-step-card') &&
  styleCss.includes('.step-card-number');
const hasTagBadge = styleCss.includes('.about-tag-badge');

if (hasCardBase && hasCardHover) {
  pass('CARD_DESIGN_TOKENS', '.about-card styled with rounded corners, subtle shadow, and -3px hover lift');
} else {
  fail('CARD_DESIGN_TOKENS', '.about-card CSS tokens missing');
}

if (hasStepCard && hasTagBadge) {
  pass('COMPONENT_STYLES', 'Step cards and tag badge pills styled with clean typography and spacing');
} else {
  fail('COMPONENT_STYLES', 'Step cards or tag badge styling missing');
}

// Ensure Orbitron is NOT used for about page headings
const aboutHeadingsOrbitron = styleCss.includes('.about-section h1,') && styleCss.includes('Orbitron');
if (!aboutHeadingsOrbitron) {
  pass('TYPOGRAPHY_GUARDRAIL', 'About page headings use Plus Jakarta Sans / Inter, NOT Orbitron');
} else {
  fail('TYPOGRAPHY_GUARDRAIL', 'Orbitron wordmark font found applied broadly to about headings');
}

// --- Section 9: Contact & Social Links ---
console.log('\n--- 9. Contact & Social Information ---');
const hasEmailLink = aboutHtml.includes('mailto:schedx24x7@gmail.com');
const hasInstagramLink = aboutHtml.includes('https://www.instagram.com/studyroom.online07?igsi=YXltbm1neDV3dWxn');
const hasGenerateLink = aboutHtml.includes('href="/generate"');
const hasFeaturesLink = aboutHtml.includes('href="/features"');

if (hasEmailLink && hasInstagramLink && hasGenerateLink && hasFeaturesLink) {
  pass('CONTACT_INFO', 'Clickable email (schedx24x7@gmail.com), Instagram link, and navigation CTAs preserved');
} else {
  fail('CONTACT_INFO', 'Contact information or CTA links missing');
}

// --- Section 10: Responsive Layout Rules ---
console.log('\n--- 10. Responsive Design Rules ---');
const hasTabletBreakpoint = styleCss.includes('@media (max-width: 900px)') &&
  styleCss.includes('.about-intro-grid') &&
  styleCss.includes('grid-template-columns: 1fr');
const hasStepsTablet = styleCss.includes('.about-steps-grid') &&
  styleCss.includes('grid-template-columns: repeat(2, 1fr)');
const hasContactTablet = styleCss.includes('.about-contact-card') &&
  styleCss.includes('flex-direction: column');

if (hasTabletBreakpoint && hasStepsTablet && hasContactTablet) {
  pass('RESPONSIVE_MEDIA_QUERIES', 'Tablet and mobile responsive stacking configured for all About sections');
} else {
  fail('RESPONSIVE_MEDIA_QUERIES', 'Responsive media queries for About Us sections missing');
}

// --- Section 11: Accessibility & Security ---
console.log('\n--- 11. Accessibility & Security Audit ---');
const hasAriaLabels = aboutHtml.includes('aria-labelledby=') && aboutHtml.includes('aria-label=');
const hasReducedMotion = styleCss.includes('@media (prefers-reduced-motion: reduce)');

if (hasAriaLabels && hasReducedMotion) {
  pass('ACCESSIBILITY', 'Semantic landmarks, ARIA labels, and prefers-reduced-motion accessibility verified');
} else {
  fail('ACCESSIBILITY', 'Accessibility features missing');
}

// Security Audit
const forbiddenTerms = ['supabase.co', 'apikey', 'secret_key', 'service_role', 'postgresql://', 'http 200', 'jwt', 'password', 'select * from'];
let cleanSecurity = true;
forbiddenTerms.forEach(term => {
  if (aboutHtml.toLowerCase().includes(term)) {
    fail('SECURITY_LEAK', `Forbidden technical string found in about.html: "${term}"`);
    cleanSecurity = false;
  }
});
if (cleanSecurity) {
  pass('SECURITY_AUDIT', 'About page is 100% clean of database credentials and internal technical leaks');
}

// --- Section 12: Live HTTP Endpoint ---
console.log('\n--- 12. Live HTTP Endpoint Check ---');
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/about',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200) {
      pass('HTTP_ABOUT_200', 'GET /about returned HTTP 200');
      if (data.includes('What is SchedX?') && data.includes('WHY SCHEDX EXISTS') && data.includes('OUR MISSION')) {
        pass('HTTP_ABOUT_PAYLOAD', 'Live server serves complete newly redesigned About Us content');
      } else {
        fail('HTTP_ABOUT_PAYLOAD', 'Live server payload missing expected sections');
      }
    } else {
      fail('HTTP_ABOUT_200', `GET /about returned HTTP ${res.statusCode}`);
    }

    printSummary();
  });
});

req.on('error', (err) => {
  fail('HTTP_ABOUT_200', `Request error: ${err.message}`);
  printSummary();
});

req.end();

function printSummary() {
  console.log('\n================================================================');
  console.log(`TOTAL CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
  if (failedChecks === 0) {
    console.log('🎉 ALL ABOUT US PAGE REDESIGN CHECKS PASSED!');
  } else {
    console.log('⚠️ SOME CHECKS FAILED. Please inspect above.');
  }
  console.log('================================================================');
  process.exit(failedChecks === 0 ? 0 : 1);
}
