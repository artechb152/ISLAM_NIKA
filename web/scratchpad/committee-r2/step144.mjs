import { getPage, safeEval, text, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=1400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
// more R sessions until nothing
for (let session = 0; session < 5; session++) {
  await page.keyboard.press('r'); await page.waitForTimeout(1600);
  let lines = 0;
  for (let i = 0; i < 35; i++) {
    const t = await T(1800);
    if (t.includes('להמשך') || t.includes('להשלמת')) {
      const m = t.match(/(קריין|רָאוִי)\n\n([^\n]+)/g);
      if (m) console.log('s'+session, JSON.stringify(m[m.length-1].slice(0,140)));
      await page.keyboard.press(' '); await page.waitForTimeout(1050); lines++; continue;
    }
    if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(1050); lines++; continue; }
    const btns = await safeEval(page, () => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(s => s && !['מחברת המסע','H מקשים'].includes(s)));
    if ((btns||[]).length) { console.log('BTNS:', JSON.stringify(btns)); await shot(page, '304-finale-btns-'+session);
      const fin = btns.find(s => s.includes('סיום') || s.includes('לפרק') || s.includes('סיימ') || s.includes('חזרה'));
      if (fin) { await B(fin).click().catch(()=>{}); await page.waitForTimeout(2500); lines++; continue; }
    }
    break;
  }
  console.log('session', session, 'lines', lines);
  if (lines === 0) break;
}
console.log('STATE:', JSON.stringify(await T(1000)));
console.log('URL:', page.url());
await shot(page, '305-finale-end');
await browser.close();
