const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9227;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function fetchJson(url) {
  return new Promise((r, j) => {
    http.get(url, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
    }).on('error', j);
  });
}

class CDPClient {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.id = 1; this.callbacks = new Map(); }
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
        } else if (msg.method && this.onEvent) {
          this.onEvent(msg.method, msg.params);
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
  close() { this.ws.close(); }
}

async function run() {
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, '..', 'scratch_chrome_test3')
  ]);

  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try { if (await fetchJson(`http://localhost:${PORT}/json/version`)) break; } catch (_) {}
  }

  const targets = await fetchJson(`http://localhost:${PORT}/json`);
  const pageTarget = targets.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension')) || targets[0];
  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);

  cdp.onEvent = (method, params) => {
    if (method === 'Runtime.consoleAPICalled') {
      console.log('[Browser Console]', params.args.map(a => a.value || a.description).join(' '));
    } else if (method === 'Runtime.exceptionThrown') {
      console.error('[Browser Exception]', params.exceptionDetails.text, params.exceptionDetails.exception?.description);
    } else if (method === 'Network.requestWillBeSent') {
      if (params.request.url.includes('/api/')) console.log('[Network Sent]', params.request.method, params.request.url, params.request.postData || '');
    } else if (method === 'Network.responseReceived') {
      if (params.response.url.includes('/api/')) console.log('[Network Recv]', params.response.status, params.response.url);
    }
  };

  await cdp.init();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');

  await cdp.send('Page.navigate', { url: 'http://localhost:3000/generate' });
  await sleep(2500);

  console.log('--- Applying Minimal Form Changes ---');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      // 1. Department
      const deptInput = document.getElementById('departmentNameInput');
      if (deptInput) { deptInput.value = 'CSE'; deptInput.dispatchEvent(new Event('input')); }
      const deptSel = document.getElementById('departmentSelect');
      if (deptSel) { deptSel.value = ''; deptSel.dispatchEvent(new Event('change')); }

      // 2. Teacher count
      const teacherCount = document.getElementById('teacherCount');
      if (teacherCount) {
        teacherCount.value = '1';
        teacherCount.dispatchEvent(new Event('input'));
      }

      // Configure teacher name
      const tInput = document.getElementById('teacher-name-0');
      if (tInput) { tInput.value = 'Rahul'; tInput.dispatchEvent(new Event('input')); }

      // Configure subject
      // Keep Subject 1 (DBMS), remove Subject 3 and Subject 2
      const btn2 = document.querySelector('[data-remove-subject="2"]');
      if (btn2) btn2.click();
      const btn1 = document.querySelector('[data-remove-subject="1"]');
      if (btn1) btn1.click();

      // Section
      const secInput = document.querySelector('[data-section-index="0"]');
      if (secInput) { secInput.value = 'CSE-A'; secInput.dispatchEvent(new Event('input')); }

      // Room
      const rInput = document.querySelector('[data-room-num-index="0"]');
      if (rInput) { rInput.value = '101'; rInput.dispatchEvent(new Event('input')); }
      document.querySelectorAll('[data-remove-room]').forEach(b => b.click());

      // Working day: Only Monday
      const pills = document.querySelectorAll('#workingDayPills .day-toggle-pill');
      pills.forEach(p => {
        const isMon = p.dataset.day === 'Monday';
        if (p.classList.contains('active') !== isMon) {
          p.click();
        }
      });
    })()`
  });

  await sleep(1000);

  console.log('--- Clicking Generate Button ---');
  await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('generateSubmitBtn').click();`
  });

  await sleep(4000);

  const statusRes = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const msg = document.getElementById('message')?.textContent;
      const msgClass = document.getElementById('message')?.className;
      const dayCards = Array.from(document.querySelectorAll('.day-card')).map(c => c.dataset.day);
      return { msg, msgClass, dayCards };
    })()`,
    returnByValue: true
  });
  console.log('Status after click:', statusRes.result.value);

  cdp.close();
  chromeProcess.kill();
  process.exit(0);
}
run();
