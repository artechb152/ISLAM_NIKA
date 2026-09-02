import { getPage, safeEval, text, shot } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind } from './seek.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=1500) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
// drain everything including R sessions
for (let session = 0; session < 5; session++) {
  let lines = 0;
  for (let i = 0; i < 35; i++) {
    const t = await T(1800);
    if (t.includes('להמשך') || t.includes('להשלמת')) {
      const m = t.match(/(קריין|רָאוִי)\n\n([^\n]+)/g);
      if (m) console.log('---', JSON.stringify(m[m.length-1].slice(0,150)));
      await page.keyboard.press(' '); await page.waitForTimeout(1050); lines++; continue;
    }
    if (t.includes('המשך ←')) {
      await B('המשך').click().catch(()=>{});
      await page.waitForTimeout(1050); lines++; continue;
    }
    const btns = await safeEval(page, () => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(s => s && !['מחברת המסע','H מקשים'].includes(s)));
    const q = (btns||[]).find(s => s.endsWith('?') || s.includes('סיים') || s.includes('לפרק'));
    if (q) { console.log('CHOICE:', JSON.stringify(q)); await shot(page, '299-finale-choice-'+session); await B(q).click().catch(()=>{}); await page.waitForTimeout(1500); lines++; continue; }
    break;
  }
  console.log('session', session, 'lines', lines);
  if (lines === 0) break;
  await page.keyboard.press('r'); await page.waitForTimeout(1500);
}
console.log('STATE:', JSON.stringify(await T(900)));
await shot(page, '300-finale-state');
await browser.close();
