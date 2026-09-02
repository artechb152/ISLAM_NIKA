import { getPage, safeEval, text, hold, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (const [x,z] of [[-5,-33],[-8,-36],[-4,-38],[2,-38],[6,-35]]) {
  let p = await goto(page, x, z, { maxIter: 8, tol: 2, log: false });
  let t = await T(300);
  console.log('probe', x, z, '->', JSON.stringify(p), JSON.stringify(t.slice(0,50)));
  if (t.includes('טוען')) { await page.waitForTimeout(9000); t = await T(300); }
  if (!t.includes('הדרך והעמסה')) { console.log('TRANSITIONED'); break; }
}
await page.waitForTimeout(1500);
console.log('FINAL:', JSON.stringify(await T(800)));
await shot(page, '227-yathrib-probe');
await browser.close();
