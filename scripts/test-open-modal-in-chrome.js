const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const PORT = 9227;

async function test() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--remote-debugging-port=' + PORT, '--headless=new', '--disable-gpu',
    '--user-data-dir=' + path.join(__dirname, '..', 'scratch_chrome_test_modal')
  ]);
  await new Promise(r => setTimeout(r, 2000));
  const targets = await new Promise((resolve, reject) => http.get('http://localhost:' + PORT + '/json', res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
  }).on('error', reject));
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  let id = 1;
  const send = (m, p = {}) => new Promise(r => {
    const cur = id++;
    const handler = msg => {
      const parsed = JSON.parse(msg);
      if (parsed.id === cur) { ws.off('message', handler); r(parsed.result); }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id: cur, method: m, params: p }));
  });
  await send('Page.enable');
  await send('Runtime.enable');

  ws.on('message', msg => {
    const parsed = JSON.parse(msg);
    if (parsed.method === 'Runtime.consoleAPICalled') {
      console.log('[Browser Console]', parsed.params.args.map(a => a.value || a.description).join(' '));
    } else if (parsed.method === 'Runtime.exceptionThrown') {
      console.error('[Browser Exception]', parsed.params.exceptionDetails.text, parsed.params.exceptionDetails.exception?.description);
    }
  });

  await send('Page.navigate', { url: 'http://localhost:3000/generate' });
  await new Promise(r => setTimeout(r, 2500));

  const res = await send('Runtime.evaluate', {
    expression: `(async () => {
      const timetable = await fetch('/api/timetable').then(r => r.json());
      const firstEntry = timetable[0];
      const entryId = firstEntry.timetable_id || firstEntry.id;
      console.log('Testing openEditTimetableModal with entryId:', entryId);
      await openEditTimetableModal(entryId, timetable, 'teacher');
      const modal = document.getElementById('editTimetableModal');
      const teacherInput = document.getElementById('editEntryTeacher');
      return {
        modalDisplay: modal ? window.getComputedStyle(modal).display : 'NO_MODAL',
        teacherValue: teacherInput ? teacherInput.value : 'NO_TEACHER',
        teacherOptionsCount: teacherInput ? teacherInput.options.length : 0,
        activeElementId: document.activeElement ? document.activeElement.id : 'NONE'
      };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Open modal evaluation result:', JSON.stringify(res, null, 2));

  chrome.kill();
  ws.close();
}
test().catch(console.error);
