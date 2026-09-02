import { getPage, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
await page.keyboard.press('m');
const r = await safeEval(page, () => {
  const l = window.__ch1Live;
  if (!l) return 'no __ch1Live';
  const out = { keys: Object.keys(l) };
  if (l.player) {
    out.playerKeys = Object.keys(l.player);
    try { const p = l.player.get ? l.player.get() : null; out.pos = p; } catch (e) { out.posErr = String(e); }
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
