const fs = require('fs');
const path = require('path');

async function verifyFeaturesPage() {
  console.log('=== SCHEDX FEATURES PAGE ZIGZAG VERIFICATION ===\n');

  let allPassed = true;

  // 1. Check HTML
  const htmlPath = path.join(__dirname, '..', 'public', 'features.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const cardCount = (html.match(/class=\"zigzag-card\"/g) || []).length;
  console.log(`[HTML] Zigzag Card Count: ${cardCount} (Expected: 8) -> ${cardCount === 8 ? '✅ PASS' : '❌ FAIL'}`);
  if (cardCount !== 8) allPassed = false;

  const htmlChecks = [
    { name: 'Zigzag Timeline Container', ok: html.includes('features-zigzag-timeline') },
    { name: 'Zigzag List Container', ok: html.includes('features-zigzag-list') },
    { name: 'Card 01 - Smart Timetable (/generate)', ok: html.includes('/generate') && html.includes('Smart Timetable Engine') },
    { name: 'Card 02 - Teacher Availability (/teacher-availability)', ok: html.includes('/teacher-availability') && html.includes('Teacher Availability') },
    { name: 'Card 03 - Section & Class (/generate#timetableForm)', ok: html.includes('/generate#timetableForm') && html.includes('Section &amp; Class') || html.includes('Section & Class') },
    { name: 'Card 04 - Room Management (/rooms)', ok: html.includes('/rooms') && html.includes('Room &amp; Laboratory') || html.includes('Room & Laboratory') },
    { name: 'Card 05 - Conflict Prevention (openRulesModal)', ok: html.includes('openRulesModal()') },
    { name: 'Card 06 - Day-by-Day Layout (/generate)', ok: html.includes('Day-by-Day Schedule Layout') },
    { name: 'Card 07 - Live Class Monitor (openCurrentClassModal)', ok: html.includes('openCurrentClassModal()') },
    { name: 'Card 08 - Persistence (openStorageModal)', ok: html.includes('openStorageModal()') },
    { name: 'Modal #rulesModal present', ok: html.includes('id=\"rulesModal\"') },
    { name: 'Modal #currentClassModal present', ok: html.includes('id=\"currentClassModal\"') },
    { name: 'Modal #storageModal present', ok: html.includes('id=\"storageModal\"') },
    { name: 'Keyboard accessibility (onkeydown & tabindex)', ok: html.includes('onkeydown') && html.includes('tabindex=\"0\"') }
  ];

  htmlChecks.forEach(c => {
    console.log(`[HTML] ${c.ok ? '✅ PASS' : '❌ FAIL'} | ${c.name}`);
    if (!c.ok) allPassed = false;
  });

  // 2. Check CSS
  const cssPath = path.join(__dirname, '..', 'public', 'style.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  const cssChecks = [
    { name: 'Zigzag card base rule', ok: css.includes('.zigzag-card {') },
    { name: 'Zigzag odd (LEFT alignment)', ok: css.includes('.zigzag-card:nth-child(odd)') && css.includes('align-self: flex-start') },
    { name: 'Zigzag even (RIGHT alignment)', ok: css.includes('.zigzag-card:nth-child(even)') && css.includes('align-self: flex-end') },
    { name: 'Central connector line (Desktop)', ok: css.includes('.features-zigzag-timeline::before') },
    { name: 'Rounded corners (24px)', ok: css.includes('border-radius: 24px') },
    { name: 'Card hover translateY effect', ok: css.includes('.zigzag-card:hover') && css.includes('translateY(-6px)') },
    { name: 'CTA arrow translate on hover', ok: css.includes('.zigzag-card:hover .cta-arrow') },
    { name: 'Focus-visible outline / ring', ok: css.includes('.zigzag-card:focus-visible') },
    { name: 'Mobile stack @media (max-width: 768px)', ok: css.includes('@media (max-width: 768px)') && css.includes('width: 100% !important') },
    { name: 'Reduced motion @media (prefers-reduced-motion)', ok: css.includes('@media (prefers-reduced-motion: reduce)') }
  ];

  console.log('\n--- CSS Architecture Checks ---');
  cssChecks.forEach(c => {
    console.log(`[CSS]  ${c.ok ? '✅ PASS' : '❌ FAIL'} | ${c.name}`);
    if (!c.ok) allPassed = false;
  });

  // 3. Check Live APIs
  console.log('\n--- Live API Verification ---');
  try {
    const res1 = await fetch('http://localhost:3000/api/current-class');
    const data1 = await res1.json();
    console.log(`[API]  ✅ PASS | /api/current-class -> HTTP ${res1.status}, running: ${data1.running}`);

    const res2 = await fetch('http://localhost:3000/api/health');
    const data2 = await res2.json();
    console.log(`[API]  ✅ PASS | /api/health -> HTTP ${res2.status}, status: ${data2.status}`);
  } catch (err) {
    console.log(`[API]  ❌ FAIL | Server check: ${err.message}`);
    allPassed = false;
  }

  console.log('\n========================================================');
  console.log(allPassed ? '🎉 ALL FEATURES PAGE VERIFICATION CHECKS PASSED!' : '❌ SOME CHECKS FAILED');
  console.log('========================================================\n');
}

verifyFeaturesPage();
