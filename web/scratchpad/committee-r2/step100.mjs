import { getPage, safeEval, text, hold, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { rotate, markerX } from './seek.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=500) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
await page.keyboard.press(' '); await page.waitForTimeout(1000);
await page.keyboard.press(' '); await page.waitForTimeout(1000);
// walk to merchant
for (let i = 0; i < 25; i++) {
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.nearWho) { console.log('NEAR', p.nearWho); break; }
  const m = await markerX(page, 'jewish');
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
  if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['w'], 800);
}
await shot(page, '231-merchant-near');
await page.keyboard.press('e'); await page.waitForTimeout(1600);
let sn = 0;
for (let i = 0; i < 30; i++) {
  const t = await T(1600);
  if (t.includes('להמשך') || t.includes('להשלמת')) {
    const m = t.match(/(הסוחר היהודי|רָאוִי)\n\n([^\n]+)/g);
    if (m) console.log('---', JSON.stringify(m[m.length-1].slice(0,150)));
    await page.keyboard.press(' '); await page.waitForTimeout(1000); continue;
  }
  if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(1000); continue; }
  const btns = await safeEval(page, () => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(s => s && !['מחברת המסע','H מקשים'].includes(s)));
  const q = (btns||[]).find(s => s.endsWith('?'));
  if (q) { console.log('CHOICE:', JSON.stringify(q)); await shot(page, '232-merchant-choice' + (sn++)); await B(q).click().catch(()=>{}); await page.waitForTimeout(1500); continue; }
  const done = (btns||[]).find(s => s.includes('מספיק') || s.includes('נמשיך') || s.includes('תודה'));
  if (done) { console.log('DONE:', JSON.stringify(done)); await B(done).click().catch(()=>{}); await page.waitForTimeout(1500); continue; }
  console.log('end-btns:', JSON.stringify(btns));
  break;
}
await shot(page, '233-merchant-end');
const nb = await safeEval(page, () => localStorage.getItem('ch1:notebook:v1'));
console.log('NB:', nb);
await browser.close();
