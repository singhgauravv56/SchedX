const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const PORT = 9226;

async function test() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--remote-debugging-port=' + PORT, '--headless=new', '--disable-gpu',
    '--user-data-dir=' + path.join(__dirname, '..', 'scratch_chrome_test_cell')
  ]);
  await new Promise(r => setTimeout(r, 2000));
  const targets = await new Promise((resolve, reject) => http.get('http://localhost:' + PORT + '/json', res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
  }).on('error', reject));
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));
  let id = 1;
  const send = (m, p) => new Promise(r => {
    const cur = id++;
    const handler = msg => {
      const parsed = JSON.parse(msg);
      if (parsed.id === cur) { ws.off('message', handler); r(parsed.result?.result?.value !== undefined ? parsed.result.result.value : parsed.result); }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id: cur, method: m, params: p }));
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://localhost:3000/generate' });
  await new Promise(r => setTimeout(r, 2500));
  const modalBefore = await send('Runtime.evaluate', {
    expression: 'document.getElementById("editTimetableModal").style.display'
  });
  console.log('Modal display before click:', modalBefore.value);

  // Click the first editable cell
  const clickRes = await send('Runtime.evaluate', {
    expression: '(() => { const cell = document.querySelector(".editable-cell"); if (!cell) return "NO CELL"; cell.click(); return "CELL CLICKED: " + cell.innerText; })()'
  });
  console.log('Cell click dispatched:', clickRes.value);
  await new Promise(r => setTimeout(r, 1000));

  const modalAfter = await send('Runtime.evaluate', {
    expression: 'document.getElementById("editTimetableModal").style.display'
  });
  console.log('Modal display after click:', modalAfter.value);

  const activeInputs = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        id: document.getElementById('editEntryId')?.value,
        day: document.getElementById('editEntryDay')?.value,
        time: document.getElementById('editEntryTimeSlot')?.value,
        subject: document.getElementById('editEntrySubject')?.value,
        teacher: document.getElementById('editEntryTeacher')?.value,
        room: document.getElementById('editEntryRoom')?.value
      };
    })()`,
    returnByValue: true
  });
  console.log('Modal input values:', JSON.stringify(activeInputs.value, null, 2));

  chrome.kill();
  ws.close();
}
test().catch(console.error);
