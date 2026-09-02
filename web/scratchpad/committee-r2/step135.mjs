import { getPage, safeEval, text, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const T = async (n=600) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (const [x,z] of [[0,-28],[0,-34],[-4,-38],[4,-38],[0,-44]]) {
  const p = await goto(page, x, z, { maxIter: 10, tol: 2, log: false });
  let t = await T(400);
  const vids = await safeEval(page, () => document.querySelectorAll('video').length);
  const m = t.match(/(\d+) מ׳/);
  console.log('wp', x, z, '->', p ? [p.x,p.z] : null, m ? m[1]+'m' : '-', 'vids:', vids);
  if (vids > 0) { console.log('FILM!'); await shot(page, '286-film'); break; }
  if (t.includes('טוען')) { await page.waitForTimeout(9000); t = await T(400); }
  if (!t.includes('מכה') && t.length > 60) { console.log('REGION:', JSON.stringify(t.slice(0,90))); break; }
  if (t.includes('רגע —')) { console.log('HOLD:', JSON.stringify(t.slice(0,150))); break; }
}
console.log('FINAL:', JSON.stringify(await T(700)));
await shot(page, '287-north-mecca');
await browser.close();
