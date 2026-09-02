import { getPage, safeEval, text, hold, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { rotate, markerX } from './seek.mjs';
import fs from 'fs';
const { browser, page } = await getPage();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (let i = 0; i < 28; i++) {
  const p = await pos2(page);
  const t = await T(250);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (t.includes('טוען')) { await page.waitForTimeout(9000); }
  if (t.includes('ית׳רב') && !t.includes('הלאה אל')) { console.log('AT YATHRIB'); break; }
  const m = await markerX(page, '__gate');
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
  if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['Shift','w'], 1000);
  if (i % 5 === 4) console.log(i, JSON.stringify(await pos2(page)));
}
await page.waitForTimeout(2000);
console.log('ARRIVED:', JSON.stringify(await T(900)));
await shot(page, '223-yathrib-arrival');
const ls = await safeEval(page, () => { const o={}; for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i); o[k]=localStorage.getItem(k);} return o; });
if (ls && !ls.__err) fs.writeFileSync('C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/ls-at-yathrib.json', JSON.stringify(ls));
await browser.close();
