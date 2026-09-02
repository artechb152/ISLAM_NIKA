import { getPage, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const T = async (n=300) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
await page.locator('button', { hasText: 'הלאה' }).last().click().catch(()=>{});
await page.waitForTimeout(1200);
let p = await goto(page, -4, -26, { maxIter: 20, tol: 2, log: false });
console.log('P:', JSON.stringify(p));
for (let i = 0; i < 8; i++) {
  await hold(page, ['w'], 1100);
  const t = await T(250);
  p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (t.includes('טוען')) { await page.waitForTimeout(8000); }
  if (t.includes('המעבר הצר') && !t.includes('הלאה אל')) { console.log('AT PASS'); break; }
  console.log(i, JSON.stringify(p));
}
console.log('TXT:', JSON.stringify(await T(350)));
await browser.close();
