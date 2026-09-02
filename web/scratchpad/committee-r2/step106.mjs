import { getPage, safeEval, text, hold, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
// find gate direction: walk north via goto steps and watch for transition
let last = null;
for (let z = -10; z >= -60; z -= 8) {
  let p = await goto(page, 0, z, { run: true, maxIter: 10, tol: 2.5, log: false });
  let t = await T(300);
  const m = t.match(/(\d+) מ׳/);
  console.log('z', z, '->', p ? [p.x, p.z] : null, m ? m[1]+'m' : '-');
  if (t.includes('טוען')) { await page.waitForTimeout(9000); t = await T(300); }
  if (!t.includes('ית׳רב') && t.length > 60) { console.log('TRANSITIONED:', JSON.stringify(t.slice(0,90))); break; }
  if (p && last && Math.abs(p.z - last.z) < 1) {
    // wall: slide west then east
    for (const dx of [-6, -12, 6, 12]) {
      let q = await goto(page, dx, p.z - 5, { maxIter: 8, tol: 2, log: false });
      let t2 = await T(300);
      if (t2.includes('טוען')) { await page.waitForTimeout(9000); t2 = await T(300); }
      if (!t2.includes('ית׳רב') && t2.length > 60) { console.log('TRANSITIONED@side:', JSON.stringify(t2.slice(0,90))); z = -999; break; }
    }
  }
  last = p;
  if (z === -999) break;
}
await page.waitForTimeout(2000);
console.log('FINAL:', JSON.stringify(await T(800)));
await shot(page, '243-monastery-arrival');
await browser.close();
