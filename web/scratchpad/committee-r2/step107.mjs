import { getPage, safeEval, text, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (const [x,z] of [[0,-60],[0,-75],[0,-90],[0,-105]]) {
  let p = await goto(page, x, z, { run: true, maxIter: 14, tol: 3, log: false });
  let t = await T(300);
  const m = t.match(/(\d+) מ׳/);
  console.log('to', x, z, '->', p ? [p.x, p.z] : null, m ? m[1]+'m' : '-', JSON.stringify(t.slice(0,40)));
  if (t.includes('טוען')) { await page.waitForTimeout(9000); t = await T(300); }
  if (!t.includes('ית׳רב') && t.length > 60) { console.log('TRANSITIONED'); break; }
}
await page.waitForTimeout(1500);
console.log('FINAL:', JSON.stringify(await T(800)));
await shot(page, '244-north-far');
await browser.close();
