import { getPage, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const T = async (n=300) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
let p = await goto(page, 0.5, -20, { maxIter: 15, tol: 2, log: false });
console.log('P:', JSON.stringify(p));
for (let i = 0; i < 8; i++) {
  await hold(page, ['w'], 1200);
  const t = await T(300);
  p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (t.includes('טוען')) { await page.waitForTimeout(8000); }
  if (t.includes('תחנת הגבול') && !t.includes('הלאה אל')) { console.log('ARRIVED'); break; }
  console.log(i, JSON.stringify(p));
}
console.log('TXT:', JSON.stringify(await T(300)));
await browser.close();
