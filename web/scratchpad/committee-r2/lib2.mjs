import { chromium } from 'playwright-core';

export async function getPage() {
  const browser = await chromium.connectOverCDP('http://localhost:9778');
  const ctx = browser.contexts()[0];
  let page = ctx.pages().find(p => p.url().includes('localhost:3000')) || ctx.pages()[0];
  return { browser, ctx, page };
}

export async function shot(page, name) {
  const p = `C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/${name}.png`;
  await page.screenshot({ path: p });
  console.log('SHOT', name);
}

export async function hold(page, keys, ms) {
  for (const k of keys) await page.keyboard.down(k);
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    for (const k of keys) await page.keyboard.down(k);
    await page.waitForTimeout(35);
  }
  for (const k of keys) await page.keyboard.up(k);
}

export async function safeEval(page, fn, arg) {
  try { return await page.evaluate(fn, arg); } catch (e) { return { __err: String(e).slice(0, 200) }; }
}

export async function pos(page) {
  return await safeEval(page, () => {
    const l = window.__ch1Live;
    if (!l || !l.player) return null;
    const p = l.player.position || (l.player.get && l.player.get());
    if (p) return { x: +p.x.toFixed(1), z: +p.z.toFixed(1) };
    return null;
  });
}

export async function text(page, n=800) {
  return await safeEval(page, (n) => document.body.innerText.slice(0, n), n);
}
