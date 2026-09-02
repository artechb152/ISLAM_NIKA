import { getPage, safeEval, text, shot, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind } from './seek.mjs';
import fs from 'fs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=800) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
await B('הלאה').click().catch(()=>{});
await page.waitForTimeout(1400);
for (let i=0;i<5;i++){ const t = await T(400); if (t.includes('להמשך')||t.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(900); } else if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(900); } else break; }
for (const [key, name] of [['scroll-case','240-scrollcase'], ['yathrib-sherd','242-ysherd']]) {
  await hold(page, ['s'], 900);
  const p = await seekFind(page, key, 28);
  console.log(key, 'AT:', JSON.stringify(p));
  if (p && p.nearFind) {
    await page.keyboard.press('f'); await page.waitForTimeout(2100);
    await shot(page, name + '-card');
    const t = await T(1200); const j = t.lastIndexOf('נמצא');
    console.log('CARD:', JSON.stringify(j>=0 ? t.slice(j, j+320) : '?'));
    await B('המשיכו').click().catch(()=>{});
    await page.waitForTimeout(800);
  }
}
const nb = await safeEval(page, () => localStorage.getItem('ch1:notebook:v1'));
console.log('NB:', nb);
const ls = await safeEval(page, () => { const o={}; for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i); o[k]=localStorage.getItem(k);} return o; });
if (ls && !ls.__err) fs.writeFileSync('C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/ls-yathrib-done.json', JSON.stringify(ls));
await browser.close();
