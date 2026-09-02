import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
// spiral small pushes around (-4,-28): N, NW, W, NE
const moves = [['w',1200],['w',1200],['a',900],['w',1200],['d',900],['d',900],['w',1200],['a',900],['w',1500]];
for (const [k, ms] of moves) {
  await hold(page, [k], ms);
  const p = await pos2(page);
  const t = await text(page, 200); const ts = typeof t==='string'?t:'';
  console.log(k, JSON.stringify(p), JSON.stringify(ts.slice(0,50)));
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (ts.includes('טוען') || !ts.includes('תחנת הגבול')) { console.log('CHANGE!'); await page.waitForTimeout(6000); break; }
}
console.log('TXT:', JSON.stringify(await text(page, 700)));
await shot(page, '193-gate-push');
await browser.close();
