import { getPage, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind, rotate, markerX } from './seek.mjs';
import fs from 'fs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
// exit via gate marker
for (let i = 0; i < 25; i++) {
  const p = await pos2(page);
  const t = await T(250);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (t.includes('טוען')) { await page.waitForTimeout(8000); }
  if (t.includes('הדרך והעמסה')) { console.log('AT ROAD'); break; }
  const m = await markerX(page, '__gate');
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
  if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['Shift','w'], 1000);
}
// arrival line
for (let i=0;i<5;i++){ const t = await T(400); if (t.includes('להמשך')||t.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(900); } else break; }
// crate task via buttons
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
await B('משי').click().catch(()=>{});
await page.waitForTimeout(1800);
await B('תבלינים').click().catch(()=>{});
await page.waitForTimeout(2200);
console.log('crate:', JSON.stringify((await T(1200)).slice(-350)));
await B('הלאה').click().catch(()=>{});
await page.waitForTimeout(1300);
for (let i=0;i<5;i++){ const t = await T(400); if (t.includes('להמשך')||t.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(900); } else break; }
// finds
for (const key of ['road-incense','road-sherd']) {
  const p = await seekFind(page, key, 28);
  if (p && p.nearFind) { await page.keyboard.press('f'); await page.waitForTimeout(2000); await B('המשיכו').click().catch(()=>{}); await page.waitForTimeout(800); console.log('collected', key); }
  else console.log('MISS', key, JSON.stringify(p));
}
const nb = await safeEval(page, () => localStorage.getItem('ch1:notebook:v1'));
console.log('NB:', nb);
const ls = await safeEval(page, () => { const o={}; for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i); o[k]=localStorage.getItem(k);} return o; });
if (ls && !ls.__err) fs.writeFileSync('C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/ls-road-done.json', JSON.stringify(ls));
await browser.close();
