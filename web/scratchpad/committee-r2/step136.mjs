import { getPage, safeEval, text, shot } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=1600) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
await B('המשך').click().catch(()=>{});
await page.waitForTimeout(1000);
for (let session = 0; session < 6; session++) {
  await page.keyboard.press('r'); await page.waitForTimeout(1700);
  let lines = 0;
  for (let i = 0; i < 35; i++) {
    const t = await T(1800);
    const vids = await safeEval(page, () => document.querySelectorAll('video').length);
    if (vids > 0) { console.log('VIDEO!'); await shot(page, '288-film-start'); session = 99; break; }
    if (t.includes('להמשך') || t.includes('להשלמת')) {
      const m = t.match(/(הסוחר|רָאוִי)\n\n([^\n]+)/g);
      if (m) console.log('s'+session, JSON.stringify(m[m.length-1].slice(0,130)));
      await page.keyboard.press(' '); await page.waitForTimeout(1050); lines++; continue;
    }
    if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(1050); lines++; continue; }
    const btns = await safeEval(page, () => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(s => s && !['מחברת המסע','H מקשים'].includes(s)));
    const q = (btns||[]).find(s => s.endsWith('?'));
    if (q) { console.log('CHOICE:', JSON.stringify(q)); await B(q).click().catch(()=>{}); await page.waitForTimeout(1400); lines++; continue; }
    break;
  }
  console.log('session', session, 'lines:', lines);
  if (lines === 0) break;
}
console.log('STATE:', JSON.stringify(await T(700)));
const nb = await safeEval(page, () => JSON.parse(localStorage.getItem('ch1:notebook:v1')));
console.log('seen tail:', nb.seen.slice(-5).join(','));
await shot(page, '289-rawi-exhausted');
await browser.close();
