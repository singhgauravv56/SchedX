const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('   SCHEDX ROUNDED WORDMARK & FINAL CTA REMOVAL VERIFICATION     ');
console.log('================================================================\n');

const publicDir = path.join(__dirname, '..', 'public');
const cssPath = path.join(publicDir, 'style.css');
const css = fs.readFileSync(cssPath, 'utf8');

const htmlPages = [
  { name: 'Home', file: 'index.html', hasHero: true },
  { name: 'Generate', file: 'generate.html', hasHero: false },
  { name: 'Features', file: 'features.html', hasHero: false },
  { name: 'About Us', file: 'about.html', hasHero: false },
  { name: 'Rooms', file: 'rooms.html', hasHero: false },
  { name: 'Teacher Availability', file: 'teacher-availability.html', hasHero: false },
  { name: 'Teacher Info', file: 'teacher-info.html', hasHero: false }
];

let passCount = 0;
let failCount = 0;

function check(title, condition, detail = '') {
  if (condition) {
    console.log(`✅ PASS | ${title} ${detail ? '(' + detail + ')' : ''}`);
    passCount++;
  } else {
    console.error(`❌ FAIL | ${title} ${detail ? '(' + detail + ')' : ''}`);
    failCount++;
  }
}

// 1. Typography & Font System
console.log('--- 1. Wordmark Typography & Font Definition ---');
check('style.css imports Comfortaa & Fredoka rounded geometric fonts',
  css.includes('family=Comfortaa:wght@700') && css.includes('family=Fredoka:wght@600;700')
);
check('--font-wordmark uses rounded geometric fonts',
  css.includes("--font-wordmark: 'Comfortaa', 'Fredoka'")
);
check('.schedx-wordmark enforces lowercase text-transform',
  css.includes('.schedx-wordmark {') && css.includes('text-transform: lowercase;')
);
check('.schedx-wordmark uses compact spacing',
  css.includes('.schedx-wordmark {') && css.includes('letter-spacing: -0.02em;')
);
check('.schedx-wordmark .schedx-x has distinct blue/cyan gradient accent',
  css.includes('.schedx-wordmark .schedx-x {') && css.includes('linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)')
);
check('.schedx-wordmark .schedx-x is subtly emphasized without being oversized (~1.05em)',
  css.includes('font-size: 1.05em;')
);
check('Reusable size variants .schedx-wordmark--nav and .schedx-wordmark--hero exist',
  css.includes('.schedx-wordmark--nav') && css.includes('.schedx-wordmark--hero')
);

// 2. Navbar Wordmark Across All HTML Pages
console.log('\n--- 2. Navbar Wordmark Across All Pages ---');
htmlPages.forEach(p => {
  const filePath = path.join(publicDir, p.file);
  const content = fs.readFileSync(filePath, 'utf8');

  check(`${p.name}: Contains lowercase <span class="schedx-main">sched</span><span class="schedx-x">x</span>`,
    content.includes('<span class="schedx-main">sched</span><span class="schedx-x">x</span>')
  );
  check(`${p.name}: Navbar brand link has aria-label="SchedX Home"`,
    content.includes('aria-label="SchedX Home"')
  );
  check(`${p.name}: Google Fonts link includes Comfortaa & Fredoka`,
    content.includes('family=Comfortaa:wght@700') && content.includes('family=Fredoka:wght@600;700')
  );
});

// 3. Home Page Hero Wordmark
console.log('\n--- 3. Home Page Hero Wordmark ---');
const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
check('Home hero title h1 uses .schedx-wordmark and .schedx-wordmark--hero',
  indexHtml.includes('<h1 class="hero-title schedx-wordmark schedx-wordmark--hero"')
);
check('Home hero title has lowercase content',
  indexHtml.includes('<h1 class="hero-title schedx-wordmark schedx-wordmark--hero" aria-label="SchedX"><span class="schedx-main">sched</span><span class="schedx-x">x</span></h1>')
);
check('Home hero preview card tag updated to lowercase schedx',
  indexHtml.includes('<span class="preview-brand-tag schedx-wordmark"><span class="schedx-main">sched</span><span class="schedx-x">x</span></span>')
);
check('Hero title responsive clamp defined in CSS',
  css.includes('.hero-title.schedx-wordmark') && css.includes('clamp(3.2rem')
);

// 4. Removal of Final CTA Section
console.log('\n--- 4. Removal of Final CTA Section ("Ready to simplify your scheduling?") ---');
check('index.html does NOT contain id="final-cta"',
  !indexHtml.includes('id="final-cta"')
);
check('index.html does NOT contain "final-cta-card"',
  !indexHtml.includes('final-cta-card')
);
check('index.html does NOT contain text "Ready to simplify your scheduling?"',
  !indexHtml.includes('Ready to simplify your scheduling?')
);
check('index.html does NOT contain id="finalCtaBtn"',
  !indexHtml.includes('id="finalCtaBtn"')
);
check('index.html does NOT contain id="finalFeaturesBtn"',
  !indexHtml.includes('id="finalFeaturesBtn"')
);
check('style.css does NOT contain .final-cta-section rules',
  !css.includes('.final-cta-section {')
);
check('style.css does NOT contain .final-cta-card rules',
  !css.includes('.final-cta-card {')
);

// 5. Preservation of Essential Home & Site Sections
console.log('\n--- 5. Preservation of Essential Home Sections & CTA Buttons ---');
check('Hero Generate Timetable CTA preserved (id="heroGenerateCta")',
  indexHtml.includes('id="heroGenerateCta"') && indexHtml.includes('Generate Timetable')
);
check('Hero Explore Features CTA preserved (id="heroFeaturesCta")',
  indexHtml.includes('id="heroFeaturesCta"') && indexHtml.includes('Explore Features')
);
check('Hero product visual preserved',
  indexHtml.includes('hero-visual') && indexHtml.includes('preview-timetable')
);
check('Intelligent Scheduling Suite section preserved',
  indexHtml.includes('section-heading') && indexHtml.includes('Intelligent Scheduling Suite')
);
check('Why SchedX section preserved',
  indexHtml.includes('id="why-schedx"')
);
check('FAQ section preserved',
  indexHtml.includes('id="faq"') && indexHtml.includes('faq-grid')
);
check('Footer preserved',
  indexHtml.includes('site-footer') && indexHtml.includes('footer-grid')
);

// 6. Responsive Wordmark Tests
console.log('\n--- 6. Responsive Wordmark Sizing ---');
check('Tablet media query (768px) styles wordmark',
  css.includes('@media (max-width: 768px)') && css.includes('.schedx-wordmark--hero')
);
check('Mobile media query (480px) styles wordmark',
  css.includes('@media (max-width: 480px)') && css.includes('.schedx-wordmark--hero')
);

console.log('\n================================================================');
console.log(`TOTAL CHECKS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
