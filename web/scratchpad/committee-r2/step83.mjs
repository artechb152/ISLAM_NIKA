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
await page.keyboard.press(' '); await page.waitForTimeout(1000);
await page.keyboard.press(' '); await page.waitForTimeout(1000);
// dash to envoy
for (let i = 0; i < 10; i++) {
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.nearWho === 'envoy' || p.z < -1) break;
  await hold(page, ['Shift','w'], Math.min(2000, Math.max(400, (p.z + 2) * 170)));
}
console.log('P:', JSON.stringify(await pos2(page)));
// envoy talk: space through everything
await page.keyboard.press('e'); await page.waitForTimeout(1500);
for (let i = 0; i < 30; i++) {
  const t = await T(700);
  if (t.includes('להמשך') || t.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(1000); continue; }
  if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(1000); continue; }
  // conversation done or needs re-E
  const t2 = await T(700);
  if (t2.includes('דברו עם שליח האימפריה')) { await page.keyboard.press('e'); await page.waitForTimeout(1400); continue; }
  break;
}
console.log('after envoy:', JSON.stringify(await T(400)));
const ls = await safeEval(page, () => localStorage.getItem('ch1:notebook:v1'));
console.log('NB:', ls);
await browser.close();
