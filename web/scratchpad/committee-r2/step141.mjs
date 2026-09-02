import { getPage, safeEval, text, shot } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=1500) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
await shot(page, '296-finale-view');
let sn = 297;
for (let i = 0; i < 40; i++) {
  const t = await T(1800);
  if (t.includes('להמשך') || t.includes('להשלמת')) {
    const m = t.match(/(קריין|רָאוִי)\n\n([^\n]+)/g);
    if (m) console.log('---', JSON.stringify(m[m.length-1].slice(0,150)));
    await page.keyboard.press(' '); await page.waitForTimeout(1100); continue;
  }
  if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(1100); continue; }
  const btns = await safeEval(page, () => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(s => s && !['מחברת המסע','H מקשים'].includes(s)));
  const q = (btns||[]).find(s => s.endsWith('?'));
  if (q) { console.log('CHOICE:', JSON.stringify(q)); await shot(page, String(sn++)+'-finale-choice'); await B(q).click().catch(()=>{}); await page.waitForTimeout(1400); continue; }
  console.log('btns:', JSON.stringify((btns||[]).slice(0,8)));
  break;
}
console.log('STATE:', JSON.stringify(await T(900)));
await shot(page, '298-finale-mid');
await browser.close();
