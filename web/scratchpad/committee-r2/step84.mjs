import { getPage, safeEval, text, hold, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind } from './seek.mjs';
import { goto } from './nav.mjs';
import fs from 'fs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (const key of ['drachm','seal']) {
  const p = await seekFind(page, key, 28);
  if (p && p.nearFind) { await page.keyboard.press('f'); await page.waitForTimeout(2000); await B('המשיכו').click().catch(()=>{}); await page.waitForTimeout(800); console.log('collected', key); }
  else console.log('MISS', key, JSON.stringify(p));
}
// scales
let p = await pos2(page);
if (!p || !p.atTask) p = await goto(page, 0, -2.9, { maxIter: 18, tol: 1.5, log: false });
await page.keyboard.press('e'); await page.waitForTimeout(1500);
await B('להניח את חותם החרס').click().catch(()=>{});
await page.waitForTimeout(2000);
await B('להניח את מטבע הכסף').click().catch(()=>{});
await page.waitForTimeout(2200);
console.log('after place:', JSON.stringify(await T(1300)));
await B('הלאה').click().catch(()=>{});
await page.waitForTimeout(1500);
const nb = await safeEval(page, () => localStorage.getItem('ch1:notebook:v1'));
console.log('NB:', nb);
const ls = await safeEval(page, () => { const o={}; for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i); o[k]=localStorage.getItem(k);} return o; });
if (ls && !ls.__err) fs.writeFileSync('C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/ls-station-done.json', JSON.stringify(ls));
await browser.close();
