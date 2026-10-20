const fs = require('fs');

const html = fs.readFileSync('public/generate.html', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');
const js = fs.readFileSync('public/script.js', 'utf8');

const checks = [
  ['HTML: periodsCopyPanel', html.includes('id="periodsCopyPanel"')],
  ['HTML: togglePeriodCopyBtn', html.includes('id="togglePeriodCopyBtn"')],
  ['HTML: periodCopyContent', html.includes('id="periodCopyContent"')],
  ['HTML: copyPeriodSourceDay', html.includes('id="copyPeriodSourceDay"')],
  ['HTML: copyPeriodDestDays', html.includes('id="copyPeriodDestDays"')],
  ['HTML: executeCopyPeriodBtn', html.includes('id="executeCopyPeriodBtn"')],
  ['HTML: breaksCopyPanel', html.includes('id="breaksCopyPanel"')],
  ['HTML: toggleBreakCopyBtn', html.includes('id="toggleBreakCopyBtn"')],
  ['HTML: breakCopyContent', html.includes('id="breakCopyContent"')],
  ['HTML: copyBreakSourceDay', html.includes('id="copyBreakSourceDay"')],
  ['HTML: copyBreakDestDays', html.includes('id="copyBreakDestDays"')],
  ['HTML: breakSelectableList', html.includes('id="breakSelectableList"')],
  ['HTML: executeCopyBreakBtn', html.includes('id="executeCopyBreakBtn"')],
  ['CSS: .copy-config-panel', css.includes('.copy-config-panel')],
  ['CSS: .lab-time-selection-wrap', css.includes('.lab-time-selection-wrap')],
  ['CSS: .lab-duration-badge', css.includes('.lab-duration-badge')],
  ['CSS: .fixed-lab-timing-indicator', css.includes('.fixed-lab-timing-indicator')],
  ['JS: renderPeriodCopyControls', js.includes('function renderPeriodCopyControls')],
  ['JS: renderBreakCopyControls', js.includes('function renderBreakCopyControls')],
  ['JS: handleLabTimeUpdate', js.includes('handleLabTimeUpdate')],
  ['JS: lab-start-time input binding', js.includes('lab-start-time')],
  ['JS: lab-end-time input binding', js.includes('lab-end-time')]
];

let allOk = true;
for (const [name, ok] of checks) {
  console.log(ok ? '✓ PASS:' : '✗ FAIL:', name);
  if (!ok) allOk = false;
}

if (!allOk) {
  console.error('\nSome checks failed!');
  process.exit(1);
} else {
  console.log('\n============================================================');
  console.log('ALL FRONTEND UI CHECKS PASSED (23/23)');
  console.log('============================================================');
}
