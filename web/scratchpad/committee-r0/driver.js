const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const base = 'C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r0';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: { dir: base + '/video' }
  });
  // Clear localStorage only on the very first load of this session (true first-time run),
  // but keep progress across the game's own gate reloads.
  await context.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('__committee_cleared')) {
        localStorage.clear();
        sessionStorage.setItem('__committee_cleared', '1');
      }
    } catch (e) {}
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const cmdDir = base + '/cmds';
  fs.mkdirSync(cmdDir, { recursive: true });
  let n = 0;
  for (;;) {
    const f = path.join(cmdDir, 'cmd-' + n + '.js');
    if (fs.existsSync(f)) {
      const code = fs.readFileSync(f, 'utf8');
      let result;
      try {
        const fn = new Function('page', 'context', 'browser', 'base', 'return (async()=>{' + code + '})()');
        result = { ok: true, value: await fn(page, context, browser, base) };
      } catch (e) {
        result = { ok: false, error: String((e && e.stack) || e) };
      }
      fs.writeFileSync(path.join(cmdDir, 'cmd-' + n + '.out.json'), JSON.stringify(result, null, 2));
      if (code.includes('__EXIT__')) break;
      n++;
    } else {
      await new Promise(r => setTimeout(r, 250));
    }
  }
  try { await context.close(); } catch (e) {}
  try { await browser.close(); } catch (e) {}
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
