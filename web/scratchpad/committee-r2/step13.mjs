import { getPage, shot, safeEval, text } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame, walkUntil } from './lib4.mjs';
const { browser, page } = await getPage();
console.log('ENSURE:', JSON.stringify(await ensureGame(page)));
const p = await walkUntil(page, ['w'], 700, 10, p => !!p.atTask);
console.log('AT:', JSON.stringify(p));
await page.keyboard.press('e');
await page.waitForTimeout(2500);
const t = await safeEval(page, () => {
  const t = window.__ch1Task;
  if (!t) return null;
  if (typeof t === 'function') { try { return t(); } catch(e){ return 'fnErr '+e; } }
  try { return JSON.parse(JSON.stringify(t)); } catch(e){ return Object.keys(t); }
});
console.log('TASK:', JSON.stringify(t));
console.log('TXT:', JSON.stringify(await text(page, 1200)));
await shot(page, '107-map-open');
await browser.close();
