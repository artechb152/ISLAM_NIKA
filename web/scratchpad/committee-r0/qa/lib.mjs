import { chromium } from 'playwright-core';
import fs from 'node:fs';

export const OUT = 'scratchpad/committee-r0/qa';
export const SHOTS = OUT + '/shots';

export async function launch() {
  return chromium.launch({ channel: 'chrome', headless: false });
}

export async function openRegion(browser, region, opts = {}) {
  const { width = 1902, height = 942, seen = [], found = [], solved = [] } = opts;
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 400)); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + String(e && e.message || e).slice(0, 400)));
  const nb = { seen, entries: [], region, found, solved };
  await page.addInitScript(({ region, nb }) => {
    try {
      if (localStorage.getItem('qa:seeded')) return; // seed once; reloads keep real progress
      localStorage.setItem('qa:seeded', '1');
      localStorage.setItem('ch1:intro:v1', '1');
      localStorage.setItem('ch1:arrived:' + region + ':v1', '1');
      localStorage.setItem('ch1:notebook:v1', JSON.stringify(nb));
      localStorage.setItem('ch1:muted', '1');
    } catch {}
  }, { region, nb });
  await page.goto('http://localhost:3000/chapter1?region=' + region, { waitUntil: 'domcontentloaded' });
  await startGame(page);
  return { page, context, errors };
}

export async function startGame(page) {
  // opening screen: התחילו במסע / המשיכו במסע
  const btn = page.locator('.ch1-opening-start');
  try { await btn.waitFor({ state: 'visible', timeout: 15000 }); await btn.click(); } catch {}
  await page.waitForFunction(() => !!window.__ch1Live, null, { timeout: 90000 });
  await page.waitForSelector('.ch1-arrive.is-gone', { state: 'attached', timeout: 90000 });
  await page.waitForTimeout(500);
}

export async function teleport(page, x, z, ms = 800) {
  await page.evaluate(([x, z]) => { window.__ch1Live.player.set(x, 0, z); }, [x, z]);
  await page.waitForTimeout(ms);
}

async function teleportUntil(page, x, z, check, tries = 14) {
  for (let i = 0; i < tries; i++) {
    await page.evaluate(([x, z]) => { window.__ch1Live.player.set(x, 0, z); }, [x, z]);
    await page.waitForTimeout(i === 0 ? 800 : 400);
    const v = await page.evaluate(check);
    if (v) return v;
  }
  return null;
}

export async function openStation(page, x, z) {
  const at = await teleportUntil(page, x, z, () => window.__ch1Live.atTask);
  await page.keyboard.press('e');
  try { await page.waitForSelector('.ch1-task', { state: 'visible', timeout: 4000 }); return { opened: true, atTask: !!at }; }
  catch { return { opened: false, atTask: !!at }; }
}

export async function pickFind(page, x, z) {
  const near = await teleportUntil(page, x, z, () => window.__ch1Live.nearFind);
  await page.keyboard.press('f');
  let opened = false;
  try { await page.waitForSelector('.ch1-find', { state: 'visible', timeout: 4000 }); opened = true; } catch {}
  if (opened) {
    await page.keyboard.press('Escape');
    await page.waitForSelector('.ch1-find', { state: 'detached', timeout: 4000 }).catch(() => {});
  }
  return { near, opened };
}

/** geometry of the open task panel vs viewport */
export async function measurePanel(page) {
  return page.evaluate(() => {
    const wrap = document.querySelector('.ch1-task');
    const card = document.querySelector('.ch1-task-card');
    if (!card) return null;
    const r = card.getBoundingClientRect();
    const vw = innerWidth, vh = innerHeight;
    const foot = document.querySelector('.ch1-task-foot');
    const fr = foot ? foot.getBoundingClientRect() : null;
    const closeBtn = foot ? foot.querySelector('button') : null;
    const cr = closeBtn ? closeBtn.getBoundingClientRect() : null;
    const scroller = [card, wrap].find((el) => el && el.scrollHeight > el.clientHeight + 2);
    return {
      vw, vh,
      card: { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
      fitsViewport: r.top >= 0 && r.bottom <= vh && r.left >= 0 && r.right <= vw,
      scrolls: !!scroller,
      scrollBy: scroller ? scroller.scrollHeight - scroller.clientHeight : 0,
      closeBtnText: closeBtn ? closeBtn.textContent.trim() : null,
      closeBtnVisible: cr ? cr.top >= 0 && cr.bottom <= vh : false,
      footRect: fr ? { top: +fr.top.toFixed(1), bottom: +fr.bottom.toFixed(1) } : null,
    };
  });
}

export async function noteText(page) {
  return page.evaluate(() => {
    const n = document.querySelector('.ch1-task-note');
    return n ? { text: n.textContent.trim(), right: n.className.includes('is-right') } : null;
  });
}

export async function shot(page, name) {
  await page.screenshot({ path: SHOTS + '/' + name + '.png' });
  return name + '.png';
}

export async function errorOverlay(page) {
  return page.evaluate(() => {
    const dlg = document.querySelector('[data-nextjs-dialog]');
    const portal = document.querySelector('nextjs-portal');
    let issues = null;
    if (portal && portal.shadowRoot) {
      const sr = portal.shadowRoot;
      for (const el of sr.querySelectorAll('[data-issues], [data-nextjs-toast], [data-next-badge], button, [role="button"]')) {
        const t = (el.textContent || '').trim();
        if (t && /issue|error/i.test(t) && t.length < 200) { issues = t.slice(0, 120); break; }
      }
    }
    return { dialog: !!dlg, issues };
  });
}

/** Tab until focused element's text matches; then Enter. mouse never used. */
export async function tabToAndEnter(page, match, maxTabs = 30) {
  for (let i = 0; i < maxTabs; i++) {
    const info = await page.evaluate(() => {
      const a = document.activeElement;
      return a ? { tag: a.tagName, cls: a.className || '', text: (a.textContent || '').trim().slice(0, 80) } : null;
    });
    if (info && info.text && info.text.includes(match)) {
      await page.keyboard.press('Enter');
      return { ok: true, tabs: i, focused: info };
    }
    await page.keyboard.press('Tab');
    await page.waitForTimeout(60);
  }
  return { ok: false, tabs: maxTabs };
}

export function save(name, data) {
  fs.writeFileSync(OUT + '/' + name, JSON.stringify(data, null, 2));
}
