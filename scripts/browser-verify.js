const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;

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

  close() {
    this.ws.close();
  }
}

async function run() {
  console.log('================================================================');
  console.log('   CHROME DEVTOOLS PROTOCOL (CDP) LIVE BROWSER AUDIT            ');
  console.log('================================================================\n');

  // Spawn Chrome
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.join(__dirname, '..', 'scratch_chrome_profile')
  ]);

  // Wait for Chrome debugging endpoint
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

  console.log(`Connected to Chrome: ${versionInfo['Browser']}`);

  const targets = await fetchJson(`http://localhost:${PORT}/json`);
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await cdp.init();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  async function navigateAndAudit(url, pageName) {
    console.log(`\n--- Auditing ${pageName} (${url}) ---`);
    await cdp.send('Page.navigate', { url });
    await sleep(1200);

    const auditScript = `
      (function() {
        const header = document.querySelector('.site-header');
        const footer = document.querySelector('.site-footer');
        const schedxWordmark = document.querySelector('.site-header .schedx-wordmark');
        const schedxMain = document.querySelector('.site-header .schedx-wordmark .schedx-main');
        const schedxX = document.querySelector('.site-header .schedx-wordmark .schedx-x');
        const heroTitle = document.querySelector('.hero-title.schedx-wordmark');
        const finalCta = document.querySelector('#final-cta');
        const finalCtaCard = document.querySelector('.final-cta-card');
        const heroGenerateCta = document.querySelector('#heroGenerateCta');

        return {
          headerBg: header ? window.getComputedStyle(header).backgroundColor : null,
          footerBg: footer ? window.getComputedStyle(footer).backgroundColor : null,
          schedxWordmarkText: schedxWordmark ? schedxWordmark.textContent.replace(/\\s+/g, '') : null,
          schedxFontFamily: schedxWordmark ? window.getComputedStyle(schedxWordmark).fontFamily : null,
          schedxTextTransform: schedxWordmark ? window.getComputedStyle(schedxWordmark).textTransform : null,
          schedxMainColor: schedxMain ? window.getComputedStyle(schedxMain).color : null,
          schedxXColor: schedxX ? window.getComputedStyle(schedxX).color : null,
          heroTitleText: heroTitle ? heroTitle.textContent.replace(/\\s+/g, '') : null,
          heroTitleFontFamily: heroTitle ? window.getComputedStyle(heroTitle).fontFamily : null,
          heroGenerateCtaPresent: Boolean(heroGenerateCta),
          finalCtaPresent: Boolean(finalCta || finalCtaCard)
        };
      })()
    `;

    const res = await cdp.send('Runtime.evaluate', {
      expression: auditScript,
      returnByValue: true
    });

    const val = res.result.value;
    console.log(`  Navbar computed BG:       ${val.headerBg}`);
    console.log(`  Footer computed BG:       ${val.footerBg}`);
    console.log(`  Navbar wordmark text:     "${val.schedxWordmarkText}" (transform: ${val.schedxTextTransform})`);
    console.log(`  Navbar wordmark font:     ${val.schedxFontFamily}`);
    console.log(`  Navbar logo "sched" color: ${val.schedxMainColor}`);
    if (pageName === 'Home Page') {
      console.log(`  Hero wordmark text:       "${val.heroTitleText}"`);
      console.log(`  Hero wordmark font:       ${val.heroTitleFontFamily}`);
      console.log(`  Final CTA Section in DOM: ${val.finalCtaPresent ? 'PRESENT (FAIL)' : 'REMOVED (PASS)'}`);
      console.log(`  Hero Generate CTA in DOM: ${val.heroGenerateCtaPresent ? 'PRESENT (PASS)' : 'MISSING (FAIL)'}`);
    }

    const isHeaderTeal = val.headerBg === 'rgb(31, 78, 91)';
    const isFooterTeal = val.footerBg === 'rgb(31, 78, 91)';
    const isWordmarkSchedx = val.schedxWordmarkText === 'schedx';
    const isFinalCtaRemoved = pageName !== 'Home Page' || !val.finalCtaPresent;

    console.log(`  ${isHeaderTeal ? '✅' : '❌'} Header background is #1F4E5B`);
    console.log(`  ${isFooterTeal ? '✅' : '❌'} Footer background is #1F4E5B`);
    console.log(`  ${isWordmarkSchedx ? '✅' : '❌'} Navbar brand renders lowercase "schedx"`);
    if (pageName === 'Home Page') {
      console.log(`  ${isFinalCtaRemoved ? '✅' : '❌'} "Ready to simplify your scheduling?" CTA removed`);
      console.log(`  ${val.heroGenerateCtaPresent ? '✅' : '❌'} Hero Generate Timetable button preserved`);
    }

    return isHeaderTeal && isFooterTeal && isWordmarkSchedx && isFinalCtaRemoved;
  }

  // Audit main pages
  let allPagesPass = true;
  allPagesPass = (await navigateAndAudit('http://localhost:3000/', 'Home Page')) && allPagesPass;
  allPagesPass = (await navigateAndAudit('http://localhost:3000/generate', 'Generate Page')) && allPagesPass;
  allPagesPass = (await navigateAndAudit('http://localhost:3000/features', 'Features Page')) && allPagesPass;
  allPagesPass = (await navigateAndAudit('http://localhost:3000/about', 'About Us Page')) && allPagesPass;

  // Navigate back to Home page for responsive wordmark checks
  await cdp.send('Page.navigate', { url: 'http://localhost:3000/' });
  await sleep(1000);

  // Responsive Breakpoint Audit
  console.log('\n--- Responsive Breakpoints Audit (Wordmark + No Overflow) ---');
  const breakpoints = [320, 375, 425, 768, 1024, 1280, 1440, 1920];

  for (const width of breakpoints) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width <= 768
    });
    await sleep(200);

    const bpCheckScript = `
      (function() {
        const header = document.querySelector('.site-header');
        const navBrand = document.querySelector('.brand.schedx-wordmark');
        const heroTitle = document.querySelector('.hero-title.schedx-wordmark');
        const navToggle = document.querySelector('.nav-toggle');
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const hasOverflow = docWidth > winWidth;

        return {
          brandWidth: navBrand ? navBrand.offsetWidth : null,
          brandHeight: navBrand ? navBrand.offsetHeight : null,
          heroWidth: heroTitle ? heroTitle.offsetWidth : null,
          toggleDisplay: navToggle ? window.getComputedStyle(navToggle).display : null,
          hasOverflow,
          docWidth,
          winWidth
        };
      })()
    `;

    const res = await cdp.send('Runtime.evaluate', {
      expression: bpCheckScript,
      returnByValue: true
    });
    const val = res.result.value;

    const pass = !val.hasOverflow && val.brandWidth > 0 && val.heroWidth > 0;
    console.log(`  [Viewport ${width}px] Nav Logo: ${val.brandWidth}x${val.brandHeight}px | Hero Logo: ${val.heroWidth}px | Overflow: ${val.hasOverflow ? 'YES (FAIL)' : 'None (PASS)'} -> ${pass ? '✅ PASS' : '❌ FAIL'}`);
  }

  // Mobile menu interaction audit on 375px
  console.log('\n--- Mobile Menu Interaction Audit (375px) ---');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(200);

  const toggleScript = `
    (function() {
      const toggle = document.querySelector('.nav-toggle');
      const nav = document.querySelector('.site-nav');
      if (toggle) toggle.click();
      const isOpen = nav && nav.classList.contains('open');
      const navBg = nav ? window.getComputedStyle(nav).backgroundColor : null;
      return { isOpen, navBg };
    })()
  `;

  const toggleRes = await cdp.send('Runtime.evaluate', {
    expression: toggleScript,
    returnByValue: true
  });
  const tVal = toggleRes.result.value;
  console.log(`  Mobile Menu Open:     ${tVal.isOpen}`);
  console.log(`  Mobile Menu BG:       ${tVal.navBg}`);
  console.log(`  ${tVal.navBg === 'rgb(31, 78, 91)' ? '✅' : '❌'} Mobile dropdown menu matches #1F4E5B`);

  // Close CDP & Chrome
  cdp.close();
  chromeProcess.kill();

  // Clean scratch profile
  try {
    fs.rmSync(path.join(__dirname, '..', 'scratch_chrome_profile'), { recursive: true, force: true });
  } catch (e) {}

  console.log('\n================================================================');
  console.log('    BROWSER AUDIT COMPLETED SUCCESSFULLY                        ');
  console.log('================================================================\n');
}

run().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
