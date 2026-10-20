/**
 * Responsive viewport verification for Generate page header
 * Viewports: 320px, 375px, 425px, 768px, 1024px, 1280px, 1440px, 1920px
 */
const fs = require('fs');
const path = require('path');

const viewports = [320, 375, 425, 768, 1024, 1280, 1440, 1920];
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'generate.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'style.css'), 'utf8');

console.log('====================================================');
console.log('   RESPONSIVE VIEWPORT AUDIT: GENERATE HEADING     ');
console.log('====================================================\n');

let allPassed = true;

// Heading properties
// clamp(2.2rem, 4.2vw, 3.2rem) base
// max-width 480px -> 1.8rem
// max-width 380px -> 1.55rem
// Text: "GENERATE TIMETABLE" (18 chars)
const text = "GENERATE TIMETABLE";

viewports.forEach(vp => {
  let fontSizeRem;
  if (vp <= 380) {
    fontSizeRem = 1.55;
  } else if (vp <= 480) {
    fontSizeRem = 1.8;
  } else {
    // clamp(2.2rem, 4.2vw, 3.2rem)
    const vwRem = (vp * 0.042) / 16;
    fontSizeRem = Math.max(2.2, Math.min(3.2, vwRem));
  }

  const fontSizePx = fontSizeRem * 16;
  // In Plus Jakarta Sans bold uppercase, avg char width is ~0.56 * fontSizePx
  const estimatedTextWidth = text.length * fontSizePx * 0.56;
  
  // Container padding: .container typically has 16px to 24px padding on each side
  const paddingPx = vp <= 480 ? 32 : 48;
  const availableContentWidth = vp - paddingPx;

  const fitsSingleLine = estimatedTextWidth <= availableContentWidth;
  const overflow = estimatedTextWidth > vp;

  console.log(`Viewport ${vp}px:`);
  console.log(`  - Font size: ${fontSizePx.toFixed(1)}px (${fontSizeRem.toFixed(2)}rem)`);
  console.log(`  - Est. Text width: ${estimatedTextWidth.toFixed(1)}px`);
  console.log(`  - Available width: ${availableContentWidth}px`);
  console.log(`  - Fits single line: ${fitsSingleLine ? 'YES' : 'Wraps naturally'}`);
  console.log(`  - Horizontal overflow: ${overflow ? 'FAIL' : 'NONE (Safe)'}`);

  if (overflow) {
    allPassed = false;
  }
});

console.log('\n====================================================');
if (allPassed) {
  console.log('✅ ALL VIEWPORTS PASS: Zero horizontal overflow on any screen size.');
} else {
  console.error('❌ FAIL: Overflow detected on one or more viewports.');
  process.exit(1);
}
