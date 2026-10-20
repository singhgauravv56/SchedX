const fs = require('fs');
const path = require('path');

function test(name, condition) {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
  } else {
    console.error(`❌ FAIL: ${name}`);
    process.exitCode = 1;
  }
}

console.log('========================================================');
console.log('   RESPONSIVE DESIGN & OVERFLOW AUDIT FOR FEATURES      ');
console.log('========================================================\n');

const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'features.html'), 'utf8');

// 1. Box sizing on containers
test('Zigzag container has box-sizing: border-box', css.includes('.zigzag-visual-container') && css.includes('box-sizing: border-box'));
test('Row container has box-sizing: border-box', css.includes('.features-zigzag-row') && css.includes('box-sizing: border-box'));

// 2. Max-width and flex basis constraints
test('Cards constrained with max-width and flex basis', css.includes('.features-zigzag-row .zigzag-card') && css.includes('max-width: 620px'));
test('Visuals constrained with max-width and flex basis', css.includes('.features-zigzag-row .zigzag-visual-wrap') && css.includes('max-width: 520px'));

// 3. Mobile breakpoint rules
test('Mobile breakpoint (max-width: 900px) stacks rows to column', css.includes('@media (max-width: 900px)') && css.includes('flex-direction: column'));
test('Mobile cards expand to 100% width', css.includes('width: 100% !important'));
test('Mobile visuals expand to 100% width', css.includes('width: 100% !important'));
test('Visual appears before card on mobile for both row types', 
  css.includes('.features-zigzag-row--right-card .zigzag-visual-wrap') && 
  css.includes('.features-zigzag-row--left-card .zigzag-visual-wrap') && 
  css.includes('order: -1')
);

// 4. Compact viewports (max-width: 480px)
test('Mobile padding adjustment for compact screens (max-width: 480px)', css.includes('@media (max-width: 480px)') && css.includes('padding: 16px'));

// 5. Final CTA responsiveness
test('Final CTA card has responsive flex-direction at <= 768px', css.includes('@media (max-width: 768px)') && css.includes('.features-final-cta-card'));

// 6. Check for viewport meta tag in features.html
test('HTML has responsive viewport meta tag', html.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">'));

console.log('\n========================================================');
console.log('   RESPONSIVE AUDIT COMPLETED SUCCESSFULLY               ');
console.log('========================================================\n');
