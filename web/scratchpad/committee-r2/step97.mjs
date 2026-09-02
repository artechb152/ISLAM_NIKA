import { getPage, safeEval, text, hold, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const T = async (n=300) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
let p = await goto(page, 0, -24, { run: true, maxIter: 25, tol: 2, log: false });
console.log('start:', JSON.stringify(p));
// slow walk north reading distance
for (let i = 0; i < 24; i++) {
  await hold(page, ['w'], 500);
  p = await pos2(page);
  let t = await T(250);
  if (!p || p.__err) { await ensureGame(page); p = await goto(page, 0, -24, { run: true, maxIter: 25, tol: 2, log: false }); continue; }
  const m = t.match(/(\d+) מ׳/);
  console.log(i, p.x, p.z, m ? m[1]+'m' : '-', t.includes('הדרך והעמסה') ? '' : 'NEW?');
  if (t.includes('טוען')) { await page.waitForTimeout(9000); console.log('LOADED:', JSON.stringify(await T(300))); break; }
  if (!t.includes('הדרך והעמסה') && t.length > 50) { console.log('TRANSITIONED:', JSON.stringify(t.slice(0,80))); break; }
  if (p.z < -35) { // wall — zigzag
    await hold(page, [i % 2 ? 'a' : 'd'], 700);
  }
}
console.log('FINAL:', JSON.stringify(await T(600)));
await shot(page, '228-gate-hunt');
await browser.close();
