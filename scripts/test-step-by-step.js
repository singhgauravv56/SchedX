const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9228;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function fetchJson(url) {
  return new Promise((r, j) => {
    http.get(url, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
    }).on('error', j);
  });
}

class CDPClient {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.id = 1; this.cb = new Map(); }
  init() {
    return new Promise((r, j) => {
      this.ws.on('open', r); this.ws.on('error', j);
      this.ws.on('message', d => {
        const m = JSON.parse(d);
        if (m.id && this.cb.has(m.id)) {
          const c = this.cb.get(m.id); this.cb.delete(m.id);
          if (m.error) c.reject(new Error(m.error.message)); else c.resolve(m.result);
        } else if (m.method && this.onEvent) {
          this.onEvent(m.method, m.params);
        }
      });
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++; this.cb.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function run() {
  const cp = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--user-data-dir=' + path.join(__dirname, '..', 'scratch_chrome_t3')
  ]);

  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try { if (await fetchJson(`http://localhost:${PORT}/json/version`)) break; } catch (_) {}
  }

  const targets = await fetchJson(`http://localhost:${PORT}/json`);
  console.log('Targets:', targets.map(t => ({ type: t.type, url: t.url })));
  const pageTarget = targets.find(t => t.type === 'page' && !t.url.startsWith('chrome-extension')) || targets[0];
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
  await cdp.send('Page.navigate', { url: 'http://localhost:3000/generate' });
  await sleep(2500);

  // Run Test 2 first (Default generate)
  console.log('Running Gen 1 (Default)...');
  await cdp.send('Runtime.evaluate', { expression: `document.getElementById('generateSubmitBtn').click();` });
  await sleep(4000);
  const r1 = await cdp.send('Runtime.evaluate', { expression: `document.getElementById('message').textContent`, returnByValue: true });
  console.log('Gen 1 message:', r1.result.value);

  // Now apply Test 3 changes
  console.log('Applying Test 3 changes...');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const deptInput = document.getElementById('departmentNameInput');
      if (deptInput) { deptInput.value = 'CSE'; deptInput.dispatchEvent(new Event('input')); }
      const deptSel = document.getElementById('departmentSelect');
      if (deptSel) { deptSel.value = ''; }

      const teacherCount = document.getElementById('teacherCount');
      if (teacherCount) { teacherCount.value = '1'; teacherCount.dispatchEvent(new Event('input')); }

      const tInput = document.getElementById('teacher-name-0');
      if (tInput) { tInput.value = 'Rahul'; tInput.dispatchEvent(new Event('input')); }

      const btn2 = document.querySelector('[data-remove-subject="2"]'); if (btn2) btn2.click();
      const btn1 = document.querySelector('[data-remove-subject="1"]'); if (btn1) btn1.click();

      const secInput = document.querySelector('[data-section-index="0"]');
      if (secInput) { secInput.value = 'CSE-A'; secInput.dispatchEvent(new Event('input')); }

      const rNumInput = document.querySelector('[data-room-num-index="0"]');
      if (rNumInput) { rNumInput.value = '101'; rNumInput.dispatchEvent(new Event('input')); }

      const pills = document.querySelectorAll('#workingDayPills .day-toggle-pill');
      pills.forEach(pill => {
        const isMon = pill.dataset.day === 'Monday';
        if (pill.classList.contains('active') !== isMon) pill.click();
      });
    })()`
  });
  await sleep(1000);

  console.log('Form state before click:');
  const formCheck = await cdp.send('Runtime.evaluate', {
    expression: `(() => ({
      dept: document.getElementById('departmentNameInput')?.value,
      teachers: Array.from(document.querySelectorAll('[data-teacher-idx]')).map(i => i.value),
      subjects: Array.from(document.querySelectorAll('[data-subject-index]')).map(i => i.value),
      btnDisabled: document.getElementById('generateSubmitBtn').disabled
    }))()`,
    returnByValue: true
  });
  console.log('Form Check:', formCheck.result.value);

  console.log('Clicking Gen 2 (Minimal)...');
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const msg = document.getElementById('message');
      if (msg) { msg.textContent = ''; msg.className = 'message hidden'; }
      document.getElementById('generateSubmitBtn').click();
    })()`
  });

  await sleep(4000);
  const r2 = await cdp.send('Runtime.evaluate', {
    expression: `(() => ({
      msg: document.getElementById('message').textContent,
      msgClass: document.getElementById('message').className,
      btnDisabled: document.getElementById('generateSubmitBtn').disabled
    }))()`,
    returnByValue: true
  });
  console.log('Gen 2 message:', r2.result.value);

  cdp.ws.close();
  cp.kill();
  process.exit(0);
}
run();
