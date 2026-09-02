import { getPage, safeEval, text, shot } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
outer:
for (const [x,z] of [[-6,-50],[-10,-54],[-14,-50],[6,-52],[10,-50],[-2,-56],[2,-56]]) {
  let p = await goto(page, x, z, { maxIter: 10, tol: 2, log: false });
  let t = await T(300);
  const m = t.match(/(\d+) מ׳/);
  console.log('probe', x, z, '->', p ? [p.x, p.z] : null, m ? m[1]+'m' : '-');
  if (t.includes('טוען')) { await page.waitForTimeout(9000); t = await T(300); }
  if (!t.includes('ית׳רב') && t.length > 60) { console.log('TRANSITIONED:', JSON.stringify(t.slice(0,90))); break outer; }
}
await page.waitForTimeout(1500);
console.log('FINAL:', JSON.stringify(await T(700)));
await shot(page, '245-gate-hunt2');
await browser.close();
