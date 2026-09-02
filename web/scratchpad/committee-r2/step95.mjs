import { getPage, safeEval, text, hold, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import fs from 'fs';
const { browser, page } = await getPage();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (let i = 0; i < 8; i++) {
  await hold(page, ['w'], 1200);
  let t = await T(300);
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  console.log(i, JSON.stringify(p), JSON.stringify(t.slice(0,60)));
  if (t.includes('טוען')) { await page.waitForTimeout(9000); t = await T(300); }
  if (t.includes('ית׳רב') && !t.includes('הלאה אל ית׳רב')) { console.log('AT YATHRIB'); break; }
}
await page.waitForTimeout(2000);
console.log('ARRIVED:', JSON.stringify(await T(1000)));
await shot(page, '226-yathrib-arrival');
const ls = await safeEval(page, () => { const o={}; for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i); o[k]=localStorage.getItem(k);} return o; });
if (ls && !ls.__err) fs.writeFileSync('C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/ls-at-yathrib.json', JSON.stringify(ls));
await browser.close();
