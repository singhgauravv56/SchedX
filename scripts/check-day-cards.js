const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9226;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function fetchJson(url) {
  return new Promise((r, j) => {
    http.get(url, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
    }).on('error', j);
  });
}

class CDP {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.id = 1; this.cb = new Map(); }
  init() {
    return new Promise((r, j) => {
      this.ws.on('open', r); this.ws.on('error', j);
      this.ws.on('message', d => {
        const m = JSON.parse(d);
        if (m.id && this.cb.has(m.id)) {
          const c = this.cb.get(m.id); this.cb.delete(m.id);
          if (m.error) c.reject(new Error(m.error.message)); else c.resolve(m.result);
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

async function go() {
  const cp = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--user-data-dir=' + path.join(__dirname, '..', 'scratch_chrome_test')
  ]);
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try { if (await fetchJson(`http://localhost:${PORT}/json/version`)) break; } catch (_) {}
  }
  const targets = await fetchJson(`http://localhost:${PORT}/json`);
  const cdp = new CDP(targets[0].webSocketDebuggerUrl);
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
  await sleep(3000);

  const evalRes = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
      return {
        url: window.location.href,
        hasApiRequest: typeof apiRequest,
        scripts
      };
    })()`,
    returnByValue: true
  });
  console.log('Result on page load:', evalRes.result.value);
  cdp.ws.close();
  cp.kill();
  process.exit(0);
}
go();
