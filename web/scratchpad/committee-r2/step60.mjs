import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
let p = await pos2(page);
console.log('P0:', JSON.stringify(p));
// go back toward road center then north
p = await goto(page, -2, -30, { maxIter: 15, tol: 2, log: false });
console.log('P1:', JSON.stringify(p));
await shot(page, '190-back-on-road');
for (let i = 0; i < 8; i++) {
  p = await goto(page, p.x, -44, { maxIter: 4, tol: 1.5, log: false });
  const t = await text(page, 250); const ts = typeof t==='string'?t:'';
  console.log('probe x=', p.x, 'z=', p.z, JSON.stringify(ts.slice(0,60)));
  if (ts.includes('טוען') || ts.includes('המעבר הצר\n')) { console.log('TRANSITION!'); break; }
  if (!p || p.z > -35) continue;
  // slide east along wall
  p = await goto(page, p.x + 4, p.z, { maxIter: 3, tol: 1.5, log: false });
}
await page.waitForTimeout(2500);
console.log('TXT:', JSON.stringify(await text(page, 700)));
await shot(page, '191-north-probe');
await browser.close();
