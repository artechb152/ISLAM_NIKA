import { getPage, safeEval, text, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
import { rotate, markerX } from './seek.mjs';
const { browser, page } = await getPage();
const T = async (n=300) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
let p = await goto(page, 0, -30, { run: true, maxIter: 20, tol: 2, log: false });
console.log('P:', JSON.stringify(p));
// find gate marker on screen
for (let i = 0; i < 14; i++) {
  const m = await markerX(page, '__gate');
  console.log('gate marker:', JSON.stringify(m));
  if (m && !(m.x === 0 && m.y === 0)) { break; }
  await rotate(page, -220);
}
const m = await markerX(page, '__gate');
if (m && !(m.x===0&&m.y===0)) {
  // center it and shoot
  await rotate(page, (m.x - 640) * 0.5);
  await shot(page, '247-gate-visible');
  console.log('final marker:', JSON.stringify(await markerX(page, '__gate')));
}
console.log('P2:', JSON.stringify(await pos2(page)));
await browser.close();
