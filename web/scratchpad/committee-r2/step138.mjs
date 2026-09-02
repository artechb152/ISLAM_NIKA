import { getPage, safeEval, text, shot } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=1200) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (let i = 0; i < 15; i++) {
  const t = await T(1400);
  if (t.includes('להמשך') || t.includes('להשלמת')) {
    const m = t.match(/(קריין|רָאוִי)\n\n([^\n]+)/g);
    if (m) console.log('---', JSON.stringify(m[m.length-1].slice(0,140)));
    await page.keyboard.press(' '); await page.waitForTimeout(1100); continue;
  }
  if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(1100); continue; }
  break;
}
console.log('STATE:', JSON.stringify(await T(700)));
await shot(page, '291-after-film');
await browser.close();
