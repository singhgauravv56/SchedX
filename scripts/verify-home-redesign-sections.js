/**
 * Verification script for SchedX Professional Home Page Redesign (Why SchedX, FAQ, Final CTA, How It Works)
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
console.log('  SCHEDX HOME PAGE REDESIGN SECTIONS VERIFICATION       ');
console.log('========================================================\n');

const indexPath = path.join(__dirname, '..', 'public', 'index.html');
const stylePath = path.join(__dirname, '..', 'public', 'style.css');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const styleCss = fs.readFileSync(stylePath, 'utf8');

// 1. Background Preservation
console.log('--- 1. Ambient Light Background Preservation ---');
assert(!indexHtml.includes('background: #000'), 'Index HTML does not introduce black inline background');
assert(!styleCss.includes('.home-overview-section { background: #000'), 'Home overview does not use dark background');
assert(!styleCss.includes('.hero-section { background: #000'), 'Hero section does not use dark background');

// 2. How It Works Steps
console.log('\n--- 2. How It Works 4-Step Workflow ---');
assert(indexHtml.includes('id="how-it-works"'), '#how-it-works section exists');
assert(indexHtml.includes('01') && indexHtml.includes('Configure'), 'Step 01: Configure exists');
assert(indexHtml.includes('02') && indexHtml.includes('Generate'), 'Step 02: Generate exists');
assert(indexHtml.includes('03') && indexHtml.includes('Review'), 'Step 03: Review exists');
assert(indexHtml.includes('04') && indexHtml.includes('Done'), 'Step 04: Done exists');
assert(indexHtml.includes('home-card--workflow workflow-card'), 'Workflow step cards use proper semantic classes');

// 3. Why SchedX Benefits
console.log('\n--- 3. Why SchedX Benefit Cards ---');
assert(indexHtml.includes('id="why-schedx"'), '#why-schedx section exists');
assert(indexHtml.includes('why-schedx-grid'), '.why-schedx-grid layout exists');
assert(indexHtml.includes('Conflict Prevention'), 'Benefit: Conflict Prevention exists');
assert(indexHtml.includes('Room Management'), 'Benefit: Room Management exists');
assert(indexHtml.includes('Teacher Scheduling'), 'Benefit: Teacher Scheduling exists');
assert(indexHtml.includes('Easy Planning'), 'Benefit: Easy Planning exists');
const benefitMatches = (indexHtml.match(/class="benefit-card"/g) || []).length;
assert(benefitMatches === 4, `Exactly 4 benefit cards present (found ${benefitMatches})`);

// 4. FAQ Accordion
console.log('\n--- 4. FAQ Accordion Items ---');
assert(indexHtml.includes('id="faq"'), '#faq section exists');
assert(indexHtml.includes('faq-grid'), '.faq-grid container exists');
assert(indexHtml.includes('How does SchedX prevent conflicts?'), 'FAQ Q1: Conflict prevention present');
assert(indexHtml.includes('How are rooms assigned?'), 'FAQ Q2: Room assignment present');
assert(indexHtml.includes('Can I manage multiple sections?'), 'FAQ Q3: Multiple sections present');
assert(indexHtml.includes('Is timetable data saved?'), 'FAQ Q4: Timetable persistence present');
const faqItemMatches = (indexHtml.match(/class="faq-item"/g) || []).length;
assert(faqItemMatches === 4, `Exactly 4 FAQ items present (found ${faqItemMatches})`);

// 5. Final CTA Banner
console.log('\n--- 5. Final CTA Conversion Banner ---');
assert(indexHtml.includes('id="final-cta"'), '#final-cta section exists');
assert(indexHtml.includes('final-cta-card'), '.final-cta-card exists');
assert(indexHtml.includes('Ready to simplify your scheduling?'), 'Final CTA title present');
assert(indexHtml.includes('id="finalCtaBtn"') && indexHtml.includes('href="/generate"'), 'Final CTA links to /generate');
assert(indexHtml.includes('id="finalFeaturesBtn"') && indexHtml.includes('href="/features"'), 'Secondary CTA links to /features');

// 6. CSS Rules & Responsive Styling
console.log('\n--- 6. CSS Rules, Responsive & Accessibility ---');
assert(styleCss.includes('.why-schedx-section'), '.why-schedx-section defined in CSS');
assert(styleCss.includes('.benefit-card'), '.benefit-card defined in CSS');
assert(styleCss.includes('.benefit-card:hover'), '.benefit-card:hover defined in CSS');
assert(styleCss.includes('.faq-section'), '.faq-section defined in CSS');
assert(styleCss.includes('.faq-item'), '.faq-item defined in CSS');
assert(styleCss.includes('.faq-question'), '.faq-question defined in CSS');
assert(styleCss.includes('.faq-item[open] .faq-icon'), '.faq-item[open] .faq-icon rotation defined in CSS');
assert(styleCss.includes('.final-cta-card'), '.final-cta-card defined in CSS');
assert(styleCss.includes('.final-cta-glow'), '.final-cta-glow defined in CSS');
assert(styleCss.includes('@media (max-width: 1024px)') && styleCss.includes('.why-schedx-grid'), 'Tablet responsive breakpoint for benefits grid exists');
assert(styleCss.includes('@media (max-width: 640px)') && styleCss.includes('.final-cta-actions'), 'Mobile responsive breakpoint for final CTA exists');

// 7. Live Server Response
console.log('\n--- 7. Live HTTP Endpoint Check ---');
http.get('http://localhost:3000/', (res) => {
  assert(res.statusCode === 200, `GET / returned HTTP 200 (received ${res.statusCode})`);
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    assert(data.includes('why-schedx'), 'Live HTTP response serves #why-schedx');
    assert(data.includes('faq-item'), 'Live HTTP response serves #faq');
    assert(data.includes('final-cta'), 'Live HTTP response serves #final-cta');
    console.log('\n========================================================');
    console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('========================================================');
    process.exit(failed > 0 ? 1 : 0);
  });
}).on('error', (err) => {
  console.error('Failed to connect to dev server:', err.message);
  process.exit(1);
});
