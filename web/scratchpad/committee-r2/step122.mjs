import { getPage, safeEval, text, shot, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
outer:
for (const [x,z] of [[0,-29],[2,-29],[-2,-29],[4,-30],[-4,-30],[0,-27],[6,-31],[-6,-31],[8,-32],[-8,-32]]) {
  const p = await goto(page, x, z, { maxIter: 8, tol: 1, log: false });
  let t = await T(300);
  console.log('probe', x, z, '->', p ? [p.x, p.z] : null, JSON.stringify(t.slice(0, 40)));
  if (t.includes('טוען')) { await page.waitForTimeout(9000); t = await T(300); }
  if (!t.includes('המנזר') && t.length > 60) { console.log('TRANSITIONED'); break outer; }
}
console.log('FINAL:', JSON.stringify(await T(600)));
await shot(page, '267-mecca-hunt');
await browser.close();
