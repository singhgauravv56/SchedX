const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9223; // use a unique port to avoid conflicts
const USER_DATA_DIR = path.join(__dirname, '..', 'scratch_chrome_enhancements');

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

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result ? res.result.value : null;
  }
}

async function main() {
  console.log('=== REAL CHROME E2E VERIFICATION FOR HOME PAGE ENHANCEMENTS ===\n');

  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${USER_DATA_DIR}`,
    'about:blank'
  ], { stdio: 'ignore' });

  let client = null;
  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  try {
    console.log('[1] Connecting to Chrome via CDP...');
    let version = null;
    for (let i = 0; i < 20; i++) {
      try {
        version = await fetchJson(`http://127.0.0.1:${PORT}/json/version`);
        if (version) break;
      } catch (e) {
        await sleep(300);
      }
    }

    if (!version) throw new Error('Could not connect to Chrome debugging port.');
    console.log('Connected to:', version.Browser);

    const pages = await fetchJson(`http://127.0.0.1:${PORT}/json`);
    const targetPage = pages.find(p => p.type === 'page');
    client = new CDPClient(targetPage.webSocketDebuggerUrl);
    await client.init();
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    const consoleErrors = [];
    client.ws.on('message', data => {
      const msg = JSON.parse(data);
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
      }
    });

    console.log('\n[2] Navigating to http://localhost:3000/...');
    await client.send('Page.navigate', { url: 'http://localhost:3000/' });
    await sleep(2000);

    // Test 1: Page Title
    const title = await client.eval('document.title');
    assert(title && title.includes('SchedX'), `Page title is: "${title}"`);

    // Test 2: Circular Orbital Motion & Preview Card
    console.log('\n[3] Testing Hero Visual & Circular Orbital Motion...');
    const orbitExists = await client.eval(`Boolean(document.querySelector('.hero-orbit-container'))`);
    assert(orbitExists, 'Hero orbital motion container is present in DOM');

    const ringsCount = await client.eval(`document.querySelectorAll('.hero-orbit-ring').length`);
    assert(ringsCount === 2, `Outer & inner orbit rings present (count: ${ringsCount})`);

    const nodesCount = await client.eval(`document.querySelectorAll('.orbit-node').length`);
    assert(nodesCount === 5, `Decorative glowing orbit nodes present (count: ${nodesCount})`);

    const previewCardStyles = await client.eval(`
      (() => {
        const el = document.querySelector('.timetable-preview-card');
        const s = window.getComputedStyle(el);
        return {
          borderRadius: s.borderRadius,
          border: s.border,
          boxShadow: s.boxShadow,
          animation: s.animationName
        };
      })()
    `);
    assert(previewCardStyles.borderRadius === '22px', `Preview card border-radius is ${previewCardStyles.borderRadius}`);
    assert(previewCardStyles.animation.includes('heroCentralFloat'), `Preview card has floating animation: ${previewCardStyles.animation}`);

    // Test 3: Surrounding Floating Cards
    console.log('\n[4] Testing Surrounding Floating Cards...');
    const floatCardCount = await client.eval(`document.querySelectorAll('.float-card').length`);
    assert(floatCardCount >= 8, `Hero contains ${floatCardCount} floating cards`);

    const cardTitles = await client.eval(`
      Array.from(document.querySelectorAll('.float-card .float-card-title')).map(e => e.textContent.trim())
    `);
    assert(cardTitles.includes('Teachers'), 'Teachers card exists');
    assert(cardTitles.includes('Subjects'), 'Subjects card exists');
    assert(cardTitles.includes('Rooms'), 'Rooms card exists');
    assert(cardTitles.includes('Time Slots'), 'Time Slots card exists');
    assert(cardTitles.includes('Working Days'), 'Working Days card exists');
    assert(cardTitles.includes('Conflict Free'), 'Conflict Free card exists');

    // Test 4: Academic Partitioning Card
    console.log('\n[5] Testing Academic Partitioning Card...');
    const statCardsText = await client.eval(`
      Array.from(document.querySelectorAll('.home-card--stat')).map(c => ({
        label: c.querySelector('.home-stat-label')?.textContent.trim(),
        value: c.querySelector('.home-stat-number')?.textContent.trim(),
        desc: c.querySelector('.home-stat-desc')?.textContent.trim(),
        raw: c.textContent
      }))
    `);
    const partCard = statCardsText.find(c => c.label === 'Academic Partitioning');
    assert(Boolean(partCard), 'Academic Partitioning card found');
    assert(partCard && partCard.value === 'REQUIRED DAYS', `Card value is "${partCard?.value}" (expected: "REQUIRED DAYS")`);
    assert(partCard && !partCard.raw.toLowerCase().includes('7 days'), `Confirmed "7 days" does NOT appear anywhere in this card`);

    // Test 5: Heading Change
    console.log('\n[6] Testing Section Heading...');
    const whyHeading = await client.eval(`
      document.querySelector('.why-schedx-section h2')?.textContent.trim()
    `);
    assert(whyHeading === 'Designed for Modern Academic Institutions', `Heading reads: "${whyHeading}"`);

    // Test 6: Light-Blue Backgrounds & Delicate Grid
    console.log('\n[7] Testing Light-Blue Treatment & Grid on Cards...');
    const cardBgCheck = await client.eval(`
      (() => {
        const homeCard = document.querySelector('.home-card');
        const statCard = document.querySelector('.home-card--stat');
        const benefitCard = document.querySelector('.benefit-card');
        const faqItem = document.querySelector('.faq-item');

        const sHome = window.getComputedStyle(homeCard);
        const sStat = window.getComputedStyle(statCard);
        const sBen = window.getComputedStyle(benefitCard);
        const sFaq = window.getComputedStyle(faqItem);

        return {
          homeBgImage: sHome.backgroundImage,
          statBgImage: sStat.backgroundImage,
          benBgImage: sBen.backgroundImage,
          faqBgImage: sFaq.backgroundImage,
          homeBgSize: sHome.backgroundSize,
          statBgSize: sStat.backgroundSize,
          homeBorderRadius: sHome.borderRadius,
          benBorderRadius: sBen.borderRadius
        };
      })()
    `);
    assert(cardBgCheck.homeBgImage.includes('linear-gradient'), 'Base home card has delicate gradient & grid background');
    assert(cardBgCheck.statBgImage.includes('linear-gradient'), 'Stat card has delicate gradient & grid background');
    assert(cardBgCheck.benBgImage.includes('linear-gradient'), 'Benefit card has delicate gradient & grid background');
    assert(cardBgCheck.faqBgImage.includes('linear-gradient'), 'FAQ item has delicate gradient & grid background');
    assert(cardBgCheck.homeBgSize.includes('22px'), `Grid size is 22px (${cardBgCheck.homeBgSize})`);
    assert(cardBgCheck.homeBorderRadius === '22px', `Home card rounded corners preserved (${cardBgCheck.homeBorderRadius})`);
    assert(cardBgCheck.benBorderRadius === '20px', `Benefit card rounded corners preserved (${cardBgCheck.benBorderRadius})`);

    // Test 7: Responsive Breakpoints & No Horizontal Overflow
    console.log('\n[8] Testing Responsive Breakpoints & Overflow...');
    const viewports = [
      { width: 1440, height: 900, name: '1440px Desktop' },
      { width: 1024, height: 768, name: '1024px Laptop' },
      { width: 768, height: 1024, name: '768px Tablet' },
      { width: 375, height: 667, name: '375px Mobile' },
      { width: 320, height: 568, name: '320px Mobile' }
    ];

    for (const vp of viewports) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });
      await sleep(400);

      const overflow = await client.eval(`
        (() => {
          const doc = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
          const clientW = doc.clientWidth;
          return {
            scrollW,
            clientW,
            hasOverflow: scrollW > clientW
          };
        })()
      `);
      assert(!overflow.hasOverflow, `${vp.name}: No horizontal overflow (scrollWidth: ${overflow.scrollW}px, clientWidth: ${overflow.clientW}px)`);
    }

    // Test 8: Console Errors Check
    console.log('\n[9] Testing Browser Console Errors...');
    assert(consoleErrors.length === 0, `Zero JavaScript console errors detected (count: ${consoleErrors.length})`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(err => console.error('  Console error:', err));
    }

  } catch (err) {
    console.error('Fatal error during E2E verification:', err);
    failed++;
  } finally {
    if (client) {
      try { client.ws.close(); } catch (_) {}
    }
    chromeProc.kill();
    console.log(`\n==================================================`);
    console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log(`==================================================\n`);

    if (failed === 0) {
      console.log('✓ REAL CHROME E2E VERIFICATION PASSED COMPLETELY!\n');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

main();
