import { getPage, safeEval, text, hold, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { rotate, markerX } from './seek.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=500) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
await B('המשך').click().catch(()=>{});
await page.waitForTimeout(1000);
await page.keyboard.press('r');
await page.waitForTimeout(1600);
for (let i = 0; i < 25; i++) {
  const t = await T(1500);
  if (t.includes('להמשך') || t.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(1000); continue; }
  if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(1000); continue; }
  // choices?
  const btns = await safeEval(page, () => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(s => s && !['מחברת המסע','H מקשים'].includes(s)));
  console.log(i, 'BTNS:', JSON.stringify(btns));
  const q = (btns||[]).find(s => s.endsWith('?'));
  if (q) { await shot(page, '224-road-rawi-choice'); await B(q).click().catch(()=>{}); await page.waitForTimeout(1500); continue; }
  break;
}
console.log('after talk:', JSON.stringify(await T(400)));
const nb = await safeEval(page, () => localStorage.getItem('ch1:notebook:v1'));
console.log('NB:', nb);
await browser.close();
