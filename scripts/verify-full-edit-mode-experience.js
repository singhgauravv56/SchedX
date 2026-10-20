const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const PORT = 9228;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
  }

  init() {
    return new Promise((resolve, reject) => {
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', data => {
        const msg = JSON.parse(data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        } else if (msg.method) {
          if (this.onEvent) this.onEvent(msg.method, msg.params);
        }
      });
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function verify() {
  console.log('--- Spawning Chrome for Comprehensive Edit Mode Verification ---');
  const chromeProcess = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, '..', 'scratch_chrome_full_edit')
  ]);

  let versionInfo = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      versionInfo = await fetchJson(`http://localhost:${PORT}/json/version`);
      if (versionInfo) break;
    } catch (e) {}
  }

  if (!versionInfo) {
    console.error('Could not connect to Chrome debugging port.');
    chromeProcess.kill();
    process.exit(1);
  }

  const targets = await fetchJson(`http://localhost:${PORT}/json`);
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);

  cdp.onEvent = (method, params) => {
    if (method === 'Runtime.consoleAPICalled') {
      console.log('[Browser Console]', params.args.map(a => a.value || a.description).join(' '));
    } else if (method === 'Runtime.exceptionThrown') {
      console.error('[Browser Exception]', params.exceptionDetails.text, params.exceptionDetails.exception?.description);
    }
  };

  await cdp.init();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  console.log('--- Navigating to http://localhost:3000/generate ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:3000/generate' });
  await sleep(3000);

  // 1. Initial State
  const initial = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('editTimetableBtn');
      const badge = document.getElementById('editModeHeaderBadge');
      const banner = document.getElementById('timetableEditModeBanner');
      const container = document.getElementById('daywiseTimetableContainer');
      return {
        btnText: btn?.innerText,
        badgeDisplay: badge ? window.getComputedStyle(badge).display : null,
        bannerDisplay: banner ? window.getComputedStyle(banner).display : null,
        isEditModeClass: container?.classList.contains('is-edit-mode')
      };
    })()`,
    returnByValue: true
  });
  console.log('1. Initial State:', initial.result.value);

  // 2. Click "✎ Edit" Button
  console.log('--- Clicking "✎ Edit" button ---');
  await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('editTimetableBtn').click()`
  });
  await sleep(500);

  const afterEditClick = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('editTimetableBtn');
      const badge = document.getElementById('editModeHeaderBadge');
      const banner = document.getElementById('timetableEditModeBanner');
      const container = document.getElementById('daywiseTimetableContainer');
      return {
        btnText: btn?.innerText,
        badgeDisplay: badge ? window.getComputedStyle(badge).display : null,
        bannerDisplay: banner ? window.getComputedStyle(banner).display : null,
        isEditModeClass: container?.classList.contains('is-edit-mode'),
        isTimetableEditMode
      };
    })()`,
    returnByValue: true
  });
  console.log('2. State After Clicking Edit:', afterEditClick.result.value);

  // 3. Click "✏️ Edit First Class" inside the banner
  console.log('--- Clicking "✏️ Edit First Class" banner button ---');
  await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('openFirstEditBannerBtn').click()`
  });
  await sleep(600);

  const modalState = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const modal = document.getElementById('editTimetableModal');
      const teacher = document.getElementById('editEntryTeacher')?.value;
      const subject = document.getElementById('editEntrySubject')?.value;
      const day = document.getElementById('editEntryDay')?.value;
      return {
        modalDisplay: modal ? window.getComputedStyle(modal).display : null,
        teacher,
        subject,
        day
      };
    })()`,
    returnByValue: true
  });
  console.log('3. Modal State After "Edit First Class":', modalState.result.value);

  // 4. Close Modal
  console.log('--- Closing Modal ---');
  await cdp.send('Runtime.evaluate', {
    expression: `closeEditTimetableModal()`
  });
  await sleep(400);

  // 5. Click an individual cell in the table
  console.log('--- Clicking an individual cell in the timetable ---');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const teacherCell = document.querySelector('td.editable-cell[data-edit-field="teacher"]');
      if (teacherCell) teacherCell.click();
      return teacherCell?.innerText;
    })()`,
    returnByValue: true
  });
  await sleep(600);

  const modalAfterCell = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const modal = document.getElementById('editTimetableModal');
      return {
        modalDisplay: modal ? window.getComputedStyle(modal).display : null,
        activeTag: document.activeElement ? document.activeElement.tagName + '#' + document.activeElement.id : null
      };
    })()`,
    returnByValue: true
  });
  console.log('5. Modal State After Cell Click:', modalAfterCell.result.value);

  // 6. Close Modal
  await cdp.send('Runtime.evaluate', { expression: `closeEditTimetableModal()` });
  await sleep(300);

  // 7. Click "✓ Done Editing" button
  console.log('--- Clicking "✓ Done Editing" ---');
  await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('editTimetableBtn').click()`
  });
  await sleep(500);

  const finalState = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('editTimetableBtn');
      const badge = document.getElementById('editModeHeaderBadge');
      const banner = document.getElementById('timetableEditModeBanner');
      const container = document.getElementById('daywiseTimetableContainer');
      return {
        btnText: btn?.innerText,
        badgeDisplay: badge ? window.getComputedStyle(badge).display : null,
        bannerDisplay: banner ? window.getComputedStyle(banner).display : null,
        isEditModeClass: container?.classList.contains('is-edit-mode'),
        isTimetableEditMode
      };
    })()`,
    returnByValue: true
  });
  console.log('7. Final State (Exited Edit Mode):', finalState.result.value);

  cdp.close();
  chromeProcess.kill();

  const success =
    initial.result.value.btnText === '✎ Edit' &&
    initial.result.value.bannerDisplay === 'none' &&
    afterEditClick.result.value.btnText === '✓ Done Editing' &&
    afterEditClick.result.value.badgeDisplay !== 'none' &&
    afterEditClick.result.value.bannerDisplay === 'block' &&
    afterEditClick.result.value.isEditModeClass === true &&
    modalState.result.value.modalDisplay === 'flex' &&
    modalAfterCell.result.value.modalDisplay === 'flex' &&
    finalState.result.value.btnText === '✎ Edit' &&
    finalState.result.value.badgeDisplay === 'none' &&
    finalState.result.value.bannerDisplay === 'none' &&
    finalState.result.value.isEditModeClass === false;

  console.log('\n============================================================');
  console.log('BROWSER E2E VERIFICATION:', success ? 'ALL CHECKS PASSED ✓' : 'VERIFICATION FAILED ✗');
  console.log('============================================================');
  process.exit(success ? 0 : 1);
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
