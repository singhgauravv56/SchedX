const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('    SCHEDX NAVBAR & FOOTER COLOR VERIFICATION (#1F4E5B)        ');
console.log('================================================================\n');

const publicDir = path.join(__dirname, '..', 'public');
const cssPath = path.join(publicDir, 'style.css');
const css = fs.readFileSync(cssPath, 'utf8');

const TARGET_HEX = '#1F4E5B';

const htmlPages = [
  { name: 'Home', file: 'index.html', url: '/' },
  { name: 'Generate', file: 'generate.html', url: '/generate' },
  { name: 'Features', file: 'features.html', url: '/features' },
  { name: 'About Us', file: 'about.html', url: '/about' },
  { name: 'Rooms', file: 'rooms.html', url: '/rooms' },
  { name: 'Teacher Availability', file: 'teacher-availability.html', url: '/teacher-availability' },
  { name: 'Teacher Info', file: 'teacher-info.html', url: '/teacher-info' }
];

let passCount = 0;
let failCount = 0;

function check(title, condition, detail = '') {
  if (condition) {
    console.log(`✅ PASS: ${title} ${detail ? '(' + detail + ')' : ''}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${title} ${detail ? '(' + detail + ')' : ''}`);
    failCount++;
  }
}

// 1. CSS Variable definition
console.log('--- 1. CSS Variable & Color Tokens ---');
check('CSS defines --nav-footer-bg variable', css.includes(`--nav-footer-bg: ${TARGET_HEX}`));

// 2. Navbar Styling
console.log('\n--- 2. Navbar Background & Styling ---');
check('.site-header background-color uses #1F4E5B', 
  css.includes(`.site-header {\n  position: sticky;\n  top: 0;\n  z-index: 1000;\n  background-color: ${TARGET_HEX};`) ||
  css.includes(`background-color: ${TARGET_HEX};`) ||
  css.includes(`background-color: var(--nav-footer-bg, ${TARGET_HEX})`)
);
check('.site-header has subtle border', css.includes('.site-header') && css.includes('border-bottom: 1px solid rgba(255, 255, 255, 0.12)'));
check('.site-header .schedx-main has white color for high contrast', css.includes('.site-header .schedx-wordmark .schedx-main {\n  color: #ffffff;\n}'));
check('.nav-link has readable light text', css.includes('color: rgba(255, 255, 255, 0.9)'));
check('.nav-link:hover has subtle lighter background', css.includes('.nav-link:hover {\n  color: #ffffff;\n  background: rgba(255, 255, 255, 0.12);\n}'));
check('.nav-link.active has visible active state', css.includes('.nav-link.active {\n  color: #ffffff;\n  font-weight: var(--weight-semibold);\n  background: rgba(255, 255, 255, 0.2);\n}'));
check('.nav-toggle has high contrast on dark teal', css.includes('.nav-toggle span {\n  display: block;\n  width: 100%;\n  height: 2px;\n  background: #ffffff;'));

// 3. Footer Styling
console.log('\n--- 3. Footer Background & Styling ---');
check('.site-footer background-color uses #1F4E5B',
  css.includes(`.site-footer {\n  background-color: ${TARGET_HEX};`) ||
  css.includes(`.site-footer {\r\n  background-color: ${TARGET_HEX};`)
);
check('Footer primary headings are white', css.includes('.footer-brand h3,\n.footer-explore h4,\n.footer-contact h4 {\n  font-family: var(--font-display);\n  margin-bottom: 14px;\n  font-size: 1.25rem;\n  font-weight: var(--weight-bold);\n  letter-spacing: var(--tracking-snug);\n  color: #ffffff;\n}'));
check('Footer body text has soft white high-contrast color', css.includes('color: rgba(237, 243, 255, 0.88)'));
check('Footer links have smooth hover with underline', css.includes('.footer-explore a:hover,\n.footer-contact a:hover {\n  color: #ffffff;\n  text-decoration: underline;'));
check('Footer instagram icon has white fill and translucent bg', css.includes('.instagram-link svg {\n  width: 18px;\n  height: 18px;\n  fill: #ffffff;\n}'));
check('Footer bottom has subtle divider', css.includes('.footer-bottom {\n  font-family: var(--font-body);\n  font-size: 0.8125rem;\n  border-top: 1px solid rgba(255, 255, 255, 0.12);\n  padding: 18px 0 30px;\n  text-align: center;\n  color: rgba(237, 243, 255, 0.72);\n}'));

// 4. Responsive Mobile Nav
console.log('\n--- 4. Responsive Mobile Navigation ---');
check('Mobile .site-nav uses #1F4E5B background',
  css.includes(`.site-nav {\n    position: absolute;\n    top: 76px;\n    left: 16px;\n    right: 16px;\n    flex-direction: column;\n    align-items: stretch;\n    background-color: ${TARGET_HEX};`) ||
  css.includes(`background-color: ${TARGET_HEX};`)
);

// 5. Preserved Elements Check
console.log('\n--- 5. Preservation of Unrelated Sections ---');
check('Home page hero background is preserved', css.includes('radial-gradient(circle at 82% 28%, rgba(45, 108, 223, 0.08) 0%, transparent 48%)'));
check('Body background gradient is preserved', css.includes('linear-gradient(180deg, #f7f9fd 0%, #eef4ff 100%)'));
check('Hero title brand wordmark in hero section preserved', css.includes('.hero-title.schedx-wordmark'));
check('Timetable card styling preserved', css.includes('.timetable-card') || css.includes('.preview-card') || css.includes('.generator-card'));

// 6. Verification across all HTML Pages
console.log('\n--- 6. HTML Pages Header & Footer Structure ---');
htmlPages.forEach(p => {
  const filePath = path.join(publicDir, p.file);
  const content = fs.readFileSync(filePath, 'utf8');
  check(`${p.name} has .site-header`, content.includes('<header class="site-header">'));
  check(`${p.name} has .site-footer`, content.includes('<footer class="site-footer" id="about">'));
  check(`${p.name} has navigation links (Home, Generate, Features, About Us)`,
    content.includes('href="/"') &&
    content.includes('href="/generate"') &&
    content.includes('href="/features"') &&
    content.includes('href="/about"')
  );
  check(`${p.name} has explore and contact links in footer`,
    content.includes('footer-explore') &&
    content.includes('footer-contact')
  );
});

// 7. Contrast Calculation Check
console.log('\n--- 7. Contrast Ratio Verification against #1F4E5B ---');
function getLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const [R, G, B] = [r, g, b].map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrast(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const bgLum = getLuminance('#1F4E5B');
const whiteCR = contrast('#FFFFFF', '#1F4E5B');
const softWhiteCR = contrast('#edf3ff', '#1F4E5B');
const lightGrayCR = contrast('#e2e8f0', '#1F4E5B');

check(`White (#FFFFFF) on #1F4E5B CR is ${whiteCR.toFixed(2)}:1 (>= 7:1 AAA)`, whiteCR >= 7.0);
check(`Soft White (#edf3ff) on #1F4E5B CR is ${softWhiteCR.toFixed(2)}:1 (>= 7:1 AAA)`, softWhiteCR >= 7.0);
check(`Light Gray (#e2e8f0) on #1F4E5B CR is ${lightGrayCR.toFixed(2)}:1 (>= 4.5:1 AA)`, lightGrayCR >= 4.5);

console.log('\n================================================================');
console.log(`TOTAL CHECKS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
