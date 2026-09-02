const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const DIR = 'C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r1';
const cmdFile = path.join(DIR, 'cmd.js');
const outFile = path.join(DIR, 'out.txt');
const doneFile = path.join(DIR, 'done.txt');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: { dir: path.join(DIR, 'video') }
  });
  // true first-time run: clear localStorage once per tab session (not on every gate reload)
  await context.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('__committee_cleared')) {
        localStorage.clear();
        sessionStorage.setItem('__committee_cleared', '1');
      }
    } catch (e) {}
  });
  const page = await context.newPage();
  const logs = [];
  page.on('console', m => { logs.push(m.type() + ': ' + m.text()); if (logs.length > 400) logs.shift(); });
  page.on('pageerror', e => { logs.push('PAGEERROR: ' + e.message); });
  globalThis.LOGS = logs;
  await page.goto('http://localhost:3000/chapter1', { waitUntil: 'domcontentloaded' });
  fs.writeFileSync(doneFile, 'READY ' + Date.now());
  while (true) {
    if (fs.existsSync(cmdFile)) {
      const code = fs.readFileSync(cmdFile, 'utf8');
      fs.unlinkSync(cmdFile);
      let out;
      try {
        const fn = new Function('page', 'context', 'browser', 'fs', 'path', 'DIR', 'LOGS',
          'return (async () => {\n' + code + '\n})()');
        const r = await fn(page, context, browser, fs, path, DIR, logs);
        out = 'OK ' + (r === undefined ? '' : JSON.stringify(r, null, 1));
      } catch (e) {
        out = 'ERR ' + (e && e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : String(e));
      }
      fs.writeFileSync(outFile, out);
      fs.writeFileSync(doneFile, 'DONE ' + Date.now());
    }
    await new Promise(r => setTimeout(r, 200));
  }
})().catch(e => { fs.writeFileSync(outFile, 'FATAL ' + e.stack); fs.writeFileSync(doneFile, 'FATAL'); });
