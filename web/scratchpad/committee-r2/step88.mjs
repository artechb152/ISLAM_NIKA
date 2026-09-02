import { getPage, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind, rotate, markerX } from './seek.mjs';
import fs from 'fs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
// clear any dialog
for (let i=0;i<6;i++){
  const t = await T(500);
  if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(1000); continue; }
  if (t.includes('להמשך')||t.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(900); continue; }
  break;
}
console.log('cleared:', JSON.stringify(await T(300)));
// crate task
for (let i = 0; i < 20; i++) {
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.atTask) break;
  const m = await markerX(page, 'task');
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
  if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['w'], 800);
}
console.log('P:', JSON.stringify(await pos2(page)));
await page.keyboard.press('e'); await page.waitForTimeout(1500);
await B('משי').click().catch(()=>{});
await page.waitForTimeout(1800);
await B('תבלינים').click().catch(()=>{});
await page.waitForTimeout(2200);
console.log('crate:', JSON.stringify((await T(1500)).slice(-300)));
await B('הלאה').click().catch(()=>{});
await page.waitForTimeout(1300);
for (let i=0;i<5;i++){ const t = await T(400); if (t.includes('להמשך')||t.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(900); } else if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(900); } else break; }
const nb = await safeEval(page, () => localStorage.getItem('ch1:notebook:v1'));
console.log('NB:', nb);
await browser.close();
