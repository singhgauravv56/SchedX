const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9229;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
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
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--user-data-dir=' + path.join(__dirname, '..', 'scratch_chrome_test_cancel')
  ]);

  await sleep(1500);
  const targets = await fetchJson(`http://localhost:${PORT}/json`);
  const cdp = new CDPClient(targets[0].webSocketDebuggerUrl);
  await cdp.init();
  await cdp.send('Page.navigate', { url: 'http://localhost:3000/generate' });
  await sleep(3000);

  const res = await cdp.send('Runtime.evaluate', {
    expression: `(async () => {
      const row = document.querySelector('.timetable-entry-row:not(.timetable-row--free):not(.timetable-row--break)');
      const entryId = row.dataset.entryId;
      const initialHtml = row.innerHTML;
      const editBtnBefore = !!row.querySelector('.btn-edit-entry');

      await startInlineRowEdit(entryId);
      const isEditing = row.classList.contains('is-inline-editing');
      const savedOriginal = row.dataset.originalInnerHtml;
      const editBtnDuring = !!row.querySelector('.btn-edit-entry');

      cancelInlineRowEdit(entryId);
      const isEditingAfterCancel = row.classList.contains('is-inline-editing');
      const editBtnAfterCancel = !!row.querySelector('.btn-edit-entry');

      return {
        entryId,
        editBtnBefore,
        isEditing,
        editBtnDuring,
        savedOriginalLength: savedOriginal?.length,
        isEditingAfterCancel,
        editBtnAfterCancel
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Cancel Test Details:', JSON.stringify(res.result.value, null, 2));

  cdp.close();
  chromeProcess.kill();
}

run().catch(console.error);
