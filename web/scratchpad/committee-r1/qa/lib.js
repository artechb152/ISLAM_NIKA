const { chromium } = require('playwright-core');

const REGIONS = {
  'yemen-heights': { enc: ['opening'], nb: [1] },
  'night-camp':    { enc: ['opening','rawi-intro'], nb: [1,2] },
  'border-post':   { enc: ['opening','rawi-intro','envoy-empires','envoy-sasanian'], nb: [1,2,3,4] },
  'narrow-pass':   { enc: ['opening','rawi-intro','envoy-empires','envoy-sasanian','chief-tribes'], nb: [1,2,3,4,6] },
  'loading-road':  { enc: ['opening','rawi-intro','rawi-seep'], nb: [1,2,8] },
  'yathrib':       { enc: ['opening','rawi-intro','jewish-arrival'], nb: [1,2,9] },
  'monastery':     { enc: ['opening','rawi-intro','monk-christianity','monk-influence'], nb: [1,2,14,15] },
  'mecca':         { enc: ['opening','rawi-intro','merchant-idols'], nb: [1,2,18] },
};

const STATIONS = {
  'yemen-heights': { x:-7.4, z:11.0, finds: [[-9.4,12.6]] },
  'night-camp':    { x:1.6,  z:-5.2, finds: [] },
  'border-post':   { x:0.4,  z:-3.4, finds: [[-2.97,-3.44],[1.66,0.9]] },
  'narrow-pass':   { x:-1.4, z:2.4,  finds: [[3.9,9.2],[-4.36,-10.64]] },
  'loading-road':  { x:3.92, z:-0.13,finds: [] },
  'yathrib':       { x:1.4,  z:6.2,  finds: [] },
  'monastery':     { x:-2.6, z:3.8,  finds: [[1.2,19.6],[5.2,-3.4],[-7.2,-4.6]] },
  'mecca':         { x:-1.8, z:-12.6,finds: [[-11.4,-12.8],[13.2,2.4],[-3.6,-9.8]] },
};

async function launch(width = 1902, height = 942) {
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await browser.newContext({ viewport: { width, height } });
  return { browser, ctx };
}

function attachLogs(page, sink) {
  page.on('console', (m) => { if (m.type() === 'error') sink.push('[console.error] ' + m.text()); });
  page.on('pageerror', (e) => sink.push('[pageerror] ' + String(e)));
}

async function seedInit(ctx, region, opts = {}) {
  const r = REGIONS[region];
  const seen = opts.seen ?? r.enc;
  const entries = opts.entries ?? r.nb;
  await ctx.addInitScript(({ region, seen, entries }) => {
    try {
      if (!localStorage.getItem('ch1:qa-seeded')) {
        localStorage.setItem('ch1:intro:v1', '1');
        localStorage.setItem('ch1:arrived:' + region + ':v1', '1');
        localStorage.setItem('ch1:notebook:v1', JSON.stringify({ seen, entries }));
        localStorage.setItem('ch1:qa-seeded', '1');
      }
    } catch (e) {}
  }, { region, seen, entries });
}

async function enter(page, region, { clickStart = true } = {}) {
  await page.goto('http://localhost:3000/chapter1?region=' + region, { waitUntil: 'domcontentloaded' });
  if (clickStart) {
    try {
      const btn = page.locator('button, a, [role=button]').filter({ hasText: /התחילו|המשיכו/ }).first();
      await btn.waitFor({ state: 'visible', timeout: 15000 });
      await btn.click();
    } catch (e) { /* maybe no gate screen */ }
  }
  await page.waitForFunction(() => !!window.__ch1Live, null, { timeout: 30000 });
  // arrival banner: wait until it's gone or has is-gone
  await page.waitForFunction(() => {
    const el = document.querySelector('.ch1-arrive');
    return !el || el.classList.contains('is-gone');
  }, null, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(400);
}

async function teleport(page, x, z, off = 0) {
  await page.evaluate(([x, z]) => window.__ch1Live.player.set(x, 0, z), [x + off, z + off]);
  await page.waitForTimeout(700);
}

async function pressAt(page, x, z, key) {
  await teleport(page, x, z);
  await page.keyboard.press(key);
  await page.waitForTimeout(700);
}

async function shot(page, name) {
  const p = 'C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r1/qa/shots/' + name + '.png';
  await page.screenshot({ path: p });
  return p;
}

async function dumpUI(page) {
  return page.evaluate(() => {
    const out = [];
    const walk = (el, depth) => {
      if (depth > 14) return;
      for (const c of el.children) {
        const cls = (c.className && typeof c.className === 'string') ? c.className : '';
        if (c.tagName === 'CANVAS') { out.push('  '.repeat(depth) + '<canvas>'); continue; }
        const txt = (c.children.length === 0) ? (c.textContent || '').trim().slice(0, 80) : '';
        out.push('  '.repeat(depth) + '<' + c.tagName.toLowerCase() + (cls ? ' .' + cls.split(' ').join('.') : '') +
          (c.id ? ' #' + c.id : '') + '>' + (txt ? ' "' + txt + '"' : ''));
        walk(c, depth + 1);
      }
    };
    walk(document.body, 0);
    return out.join('\n');
  });
}

async function errBadges(page) {
  return page.evaluate(() => {
    const r = [];
    if (document.querySelector('[data-nextjs-dialog]')) r.push('nextjs-dialog');
    const p = document.querySelector('nextjs-portal');
    if (p) r.push('nextjs-portal present');
    return r;
  });
}

module.exports = { launch, attachLogs, seedInit, enter, teleport, pressAt, shot, dumpUI, errBadges, REGIONS, STATIONS };

async function openStation(page, region) {
  const st = STATIONS[region];
  const offs = [[0.9,0.9],[-0.9,0.9],[0.9,-0.9],[-0.9,-0.9],[1.5,0],[0,1.5],[0,0]];
  for (const [dx, dz] of offs) {
    await page.evaluate(([x, z]) => window.__ch1Live.player.set(x, 0, z), [st.x + dx, st.z + dz]);
    await page.waitForTimeout(600);
    const near = await page.waitForFunction(() => !!document.querySelector('.poi-marker.is-task-marker.is-near'), null, { timeout: 4000 }).then(() => true).catch(() => false);
    if (!near) continue;
    await page.keyboard.press('e');
    await page.waitForTimeout(900);
    if (await page.evaluate(() => !!document.querySelector('.ch1-task'))) return true;
    // wrong overlay (dialogue?) — close and try next spot
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
  return page.evaluate(() => !!document.querySelector('.ch1-task'));
}

async function pickFind(page, x, z) {
  const offs = [[0.9,0.9],[-0.9,0.9],[0.9,-0.9],[-0.9,-0.9],[1.4,0],[0,1.4],[0,0]];
  for (const [dx, dz] of offs) {
    await page.evaluate(([px, pz]) => window.__ch1Live.player.set(px, 0, pz), [x + dx, z + dz]);
    await page.waitForTimeout(600);
    const near = await page.waitForFunction(() => !!document.querySelector('.poi-marker.is-find-marker.is-near'), null, { timeout: 4000 }).then(() => true).catch(() => false);
    if (!near) continue;
    await page.keyboard.press('f');
    await page.waitForTimeout(800);
    if (await page.evaluate(() => !!document.querySelector('.ch1-find'))) {
      const btn = page.locator('.ch1-find-foot button.is-primary');
      if (await btn.count()) await btn.click(); else await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      return true;
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
  return false;
}
module.exports.openStation = openStation;
module.exports.pickFind = pickFind;
