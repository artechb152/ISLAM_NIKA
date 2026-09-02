import { getPage, safeEval, text, shot } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=700) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (let round = 0; round < 5; round++) {
  const t0 = await T(500);
  if (t0.includes('שיחה עם הנזיר') || t0.includes('דברו עם הנזיר')) { await page.keyboard.press('e'); await page.waitForTimeout(1500); }
  let progressed = false;
  for (let i = 0; i < 30; i++) {
    const t = await T(1700);
    if (t.includes('להמשך') || t.includes('להשלמת')) {
      const m = t.match(/(הנזיר|רָאוִי)\n\n([^\n]+)/g);
      if (m) console.log('---', JSON.stringify(m[m.length-1].slice(0,140)));
      await page.keyboard.press(' '); await page.waitForTimeout(1000); progressed = true; continue;
    }
    if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(1000); progressed = true; continue; }
    const btns = await safeEval(page, () => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(s => s && !['מחברת המסע','H מקשים'].includes(s)));
    const q = (btns||[]).find(s => s.endsWith('?'));
    if (q) { console.log('CHOICE:', JSON.stringify(q)); await B(q).click().catch(()=>{}); await page.waitForTimeout(1500); progressed = true; continue; }
    break;
  }
  if (!progressed) break;
}
const nb = await safeEval(page, () => localStorage.getItem('ch1:notebook:v1'));
console.log('NB seen:', JSON.parse(nb).seen.slice(-6).join(','), 'entries:', JSON.parse(nb).entries.length);
await shot(page, '253-monk-done');
await browser.close();
