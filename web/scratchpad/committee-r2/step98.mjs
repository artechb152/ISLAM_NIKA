import { getPage, safeEval, text, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const T = async (n=300) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (const [x,z] of [[-6,-36],[-10,-34],[-14,-31],[-3,-39],[4,-38],[8,-34]]) {
  let p = await goto(page, x, z, { run: true, maxIter: 12, tol: 2, log: false });
  let t = await T(300);
  const m = t.match(/(\d+) מ׳/);
  console.log('probe', x, z, '->', p ? [p.x,p.z] : null, m ? m[1]+'m' : '-');
  if (t.includes('טוען')) { await page.waitForTimeout(9000); t = await T(300); }
  if (!t.includes('הדרך והעמסה') && t.length > 50) { console.log('TRANSITIONED:', JSON.stringify(t.slice(0,100))); break; }
}
console.log('FINAL:', JSON.stringify(await T(500)));
await shot(page, '229-west-probe');
await browser.close();
