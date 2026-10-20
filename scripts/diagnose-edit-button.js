const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9225;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

async function run() {
  console.log('--- Spawning Chrome for Edit Button Diagnostics ---');
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, '..', 'scratch_chrome_diag_edit')
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

  const consoleLogs = [];

  cdp.onEvent = (method, params) => {
    if (method === 'Runtime.consoleAPICalled') {
      const text = params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      consoleLogs.push(`[Console ${params.type}] ${text}`);
      console.log(`[Browser Console ${params.type}]`, text);
    } else if (method === 'Runtime.exceptionThrown') {
      const text = params.exceptionDetails.text + ' ' + (params.exceptionDetails.exception?.description || '');
      consoleLogs.push(`[Exception] ${text}`);
      console.error(`[Browser Exception]`, text);
    }
  };

  await cdp.init();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  console.log('--- Navigating to http://localhost:3000/generate ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:3000/generate' });
  await sleep(3000);

  console.log('--- Inspecting Edit Button and Timetable Section ---');
  const editBtnState = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('editTimetableBtn');
      const banner = document.getElementById('timetableEditModeBanner');
      const section = document.getElementById('timetableSection');
      const container = document.getElementById('daywiseTimetableContainer');
      const rows = document.querySelectorAll('.timetable-entry-row');
      const isMode = typeof isTimetableEditMode !== 'undefined' ? isTimetableEditMode : 'UNDEFINED';

      return {
        btnFound: !!btn,
        btnText: btn?.innerText,
        btnDisplay: btn ? window.getComputedStyle(btn).display : null,
        sectionDisplay: section ? window.getComputedStyle(section).display : null,
        bannerDisplay: banner ? window.getComputedStyle(banner).display : null,
        rowCount: rows.length,
        isTimetableEditMode: isMode
      };
    })()`,
    returnByValue: true
  });
  console.log('State Before Click:', JSON.stringify(editBtnState.result.value, null, 2));

  console.log('--- Clicking #editTimetableBtn ---');
  const clickRes = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('editTimetableBtn');
      if (!btn) return 'BUTTON NOT FOUND';
      btn.click();
      return 'CLICK DISPATCHED';
    })()`,
    returnByValue: true
  });
  console.log('Click result:', clickRes.result.value);

  await sleep(1000);

  const stateAfterClick = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('editTimetableBtn');
      const banner = document.getElementById('timetableEditModeBanner');
      const container = document.getElementById('daywiseTimetableContainer');
      const isMode = typeof isTimetableEditMode !== 'undefined' ? isTimetableEditMode : 'UNDEFINED';
      const containerHasClass = container?.classList.contains('is-edit-mode');

      return {
        btnText: btn?.innerText,
        btnClasses: btn?.className,
        bannerDisplay: banner ? window.getComputedStyle(banner).display : null,
        isTimetableEditMode: isMode,
        containerHasClass
      };
    })()`,
    returnByValue: true
  });
  console.log('State After Click:', JSON.stringify(stateAfterClick.result.value, null, 2));

  cdp.close();
  chromeProcess.kill();
}

run().catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
