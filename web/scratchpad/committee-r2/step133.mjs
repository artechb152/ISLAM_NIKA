import { getPage, safeEval, text, shot } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=1500) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
await B('המשך').click().catch(()=>{});
await page.waitForTimeout(1000);
await page.keyboard.press('r'); await page.waitForTimeout(1600);
for (let i = 0; i < 30; i++) {
  const t = await T(1800);
  const vids = await safeEval(page, () => document.querySelectorAll('video').length);
  if (vids > 0) { console.log('VIDEO!', i); await shot(page, '282-film-start'); break; }
  if (t.includes('להמשך') || t.includes('להשלמת')) {
    const m = t.match(/(הסוחר|רָאוִי)\n\n([^\n]+)/g);
    if (m) console.log('---', JSON.stringify(m[m.length-1].slice(0,150)));
    await page.keyboard.press(' '); await page.waitForTimeout(1100); continue;
  }
  if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(1100); continue; }
  const btns = await safeEval(page, () => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(s => s && !['מחברת המסע','H מקשים'].includes(s)));
  const q = (btns||[]).find(s => s.endsWith('?'));
  if (q) { console.log('CHOICE:', JSON.stringify(q)); await B(q).click().catch(()=>{}); await page.waitForTimeout(1500); continue; }
  console.log('btns:', JSON.stringify((btns||[]).slice(0,8)));
  break;
}
console.log('STATE:', JSON.stringify(await T(700)));
await shot(page, '283-rawi-mecca2');
await browser.close();
