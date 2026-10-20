const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9224;

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
  console.log('--- Spawning Chrome for Diagnostics ---');
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, '..', 'scratch_chrome_diag')
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
  const networkRequests = [];

  cdp.onEvent = (method, params) => {
    if (method === 'Runtime.consoleAPICalled') {
      const text = params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      consoleLogs.push(`[Console ${params.type}] ${text}`);
      console.log(`[Browser Console ${params.type}]`, text);
    } else if (method === 'Runtime.exceptionThrown') {
      const text = params.exceptionDetails.text + ' ' + (params.exceptionDetails.exception?.description || '');
      consoleLogs.push(`[Exception] ${text}`);
      console.error(`[Browser Exception]`, text);
    } else if (method === 'Network.requestWillBeSent') {
      networkRequests.push({ url: params.request.url, method: params.request.method });
      console.log(`[Network Request] ${params.request.method} ${params.request.url}`);
    } else if (method === 'Network.responseReceived') {
      console.log(`[Network Response] ${params.response.status} ${params.response.url}`);
    }
  };

  await cdp.init();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('DOM.enable');

  console.log('--- Navigating to http://localhost:3000/generate ---');
  await cdp.send('Page.navigate', { url: 'http://localhost:3000/generate' });
  await sleep(2500);

  console.log('--- Inspecting Initial Form State ---');
  const initialState = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('generateSubmitBtn');
      const form = document.getElementById('timetableForm');
      const dept = document.getElementById('departmentNameInput')?.value;
      const deptSelect = document.getElementById('departmentSelect')?.value;
      const teacherCount = document.getElementById('teacherCount')?.value;
      const teacherCards = document.querySelectorAll('.teacher-item-card').length;
      const subjects = document.querySelectorAll('[data-subject-index]').length;
      const sections = document.querySelectorAll('[data-section-index]').length;
      const rooms = document.querySelectorAll('[data-room-num-index]').length;
      const messageBox = document.getElementById('message')?.textContent;
      const messageClass = document.getElementById('message')?.className;
      return {
        btnFound: !!btn,
        btnDisabled: btn?.disabled,
        formFound: !!form,
        dept,
        deptSelect,
        teacherCount,
        teacherCards,
        subjects,
        sections,
        rooms,
        messageBox,
        messageClass
      };
    })()`,
    returnByValue: true
  });
  console.log('Initial Form State:', JSON.stringify(initialState.result.value, null, 2));

  console.log('--- Clicking GENERATE TIMETABLE Button ---');
  const clickResult = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('generateSubmitBtn');
      if (!btn) return 'BUTTON NOT FOUND';
      btn.click();
      return 'BUTTON CLICKED';
    })()`,
    returnByValue: true
  });
  console.log('Click result:', clickResult.result.value);

  // Wait 4 seconds for generation
  await sleep(4000);

  console.log('--- Inspecting Post-Click State ---');
  const postClickState = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const messageBox = document.getElementById('message')?.textContent;
      const messageClass = document.getElementById('message')?.className;
      const timetableSection = document.getElementById('timetableSection');
      const timetableSectionDisplay = timetableSection ? window.getComputedStyle(timetableSection).display : 'none';
      const dayCards = document.querySelectorAll('.day-card').length;
      const tableRows = document.querySelectorAll('table.timetable tbody tr').length;
      const scheduledRows = document.querySelectorAll('table.timetable tbody tr:not(.timetable-row--free):not(.timetable-row--break)').length;
      const breakRows = document.querySelectorAll('table.timetable tbody tr.timetable-row--break').length;
      const freeRows = document.querySelectorAll('table.timetable tbody tr.timetable-row--free').length;
      const toast = document.querySelector('.toast')?.textContent;
      return {
        messageBox,
        messageClass,
        timetableSectionDisplay,
        dayCards,
        totalTableRows: tableRows,
        scheduledRows,
        breakRows,
        freeRows,
        toast
      };
    })()`,
    returnByValue: true
  });
  console.log('Post-Click State:', JSON.stringify(postClickState.result.value, null, 2));

  cdp.close();
  chromeProcess.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
