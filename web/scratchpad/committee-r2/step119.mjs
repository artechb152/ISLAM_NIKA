import { getPage, safeEval, text, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const T = async (n=900) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (const [x,z] of [[0,6],[-6,0],[-6,-8],[0,-12],[6,-10],[2,-6],[-2,-2]]) {
  const p = await goto(page, x, z, { maxIter: 8, tol: 1.5, log: false });
  console.log('wp', x, z, '->', p ? [p.x, p.z, p.atTask] : null);
  if (p && p.atTask) { console.log('AT TASK'); break; }
}
const p = await pos2(page);
if (p && p.atTask) {
  await page.keyboard.press('e'); await page.waitForTimeout(2000);
  console.log('PANEL:', JSON.stringify((await T(2000)).slice(-900)));
  await shot(page, '263-altar-panel');
}
await browser.close();
