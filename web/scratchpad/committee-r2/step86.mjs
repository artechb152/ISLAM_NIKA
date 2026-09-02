import { getPage, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind, rotate, markerX } from './seek.mjs';
import fs from 'fs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
await B('המשך').click().catch(()=>{});
await page.waitForTimeout(1000);
// chief talk
for (let i = 0; i < 22; i++) {
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.nearWho === 'chief') break;
  const m = await markerX(page, 'chief');
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
  if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['w'], 800);
}
await page.keyboard.press('e'); await page.waitForTimeout(1500);
for (let i = 0; i < 12; i++) {
  const t = await T(600);
  if (t.includes('להמשך') || t.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(1000); continue; }
  if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(1000); continue; }
  break;
}
console.log('chief done');
// finds
for (const key of ['pass-inscription','pass-coin']) {
  const p = await seekFind(page, key.replace('pass-',''), 28);
  if (p && p.nearFind) { await page.keyboard.press('f'); await page.waitForTimeout(2000); await B('המשיכו').click().catch(()=>{}); await page.waitForTimeout(800); console.log('collected', key); }
  else console.log('MISS', key, JSON.stringify(p));
}
// task answer
for (let i = 0; i < 20; i++) {
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.atTask) break;
  const m = await markerX(page, 'task');
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
  if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['w'], 800);
}
await page.keyboard.press('e'); await page.waitForTimeout(1500);
await B('בחסותך — תמורת מכס, כמו כולם').click().catch(()=>{});
await page.waitForTimeout(2200);
await B('הלאה').click().catch(()=>{});
await page.waitForTimeout(1200);
const nb = await safeEval(page, () => localStorage.getItem('ch1:notebook:v1'));
console.log('NB:', nb);
const ls = await safeEval(page, () => { const o={}; for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i); o[k]=localStorage.getItem(k);} return o; });
if (ls && !ls.__err) fs.writeFileSync('C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/ls-pass-done.json', JSON.stringify(ls));
await browser.close();
