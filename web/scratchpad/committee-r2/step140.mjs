import { getPage, safeEval, text, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const T = async (n=500) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (const z of [-10,-20,-30,-40,-50,-60,-70]) {
  const p = await goto(page, 0, z, { run: true, maxIter: 10, tol: 2.5, log: false });
  let t = await T(300);
  const m = t.match(/(\d+) מ׳/);
  const vids = await safeEval(page, () => document.querySelectorAll('video').length);
  console.log('z', z, '->', p ? [p.x, p.z] : null, m ? m[1]+'m' : '-', 'v:', vids);
  if (t.includes('טוען')) { await page.waitForTimeout(9000); t = await T(300); }
  if (vids > 0) { console.log('VIDEO'); await shot(page, '294-finale-film'); break; }
  if (!t.includes('מכה') && t.length > 60) { console.log('REGION CHANGE:', JSON.stringify(t.slice(0,100))); break; }
}
await page.waitForTimeout(2000);
console.log('FINAL:', JSON.stringify(await T(900)));
await shot(page, '295-finale-approach');
await browser.close();
