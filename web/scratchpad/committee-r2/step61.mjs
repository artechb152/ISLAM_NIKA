import { getPage, shot, safeEval, text } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
const marks = await safeEval(page, () => {
  const l = window.__ch1Live; if (!l || !l.markerEls) return null;
  const els = l.markerEls instanceof Map ? [...l.markerEls.entries()] : Object.entries(l.markerEls);
  return els.map(([k, el]) => { const r = el.getBoundingClientRect(); return { k, x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2), t: (el.textContent||'').slice(0,50) }; });
});
console.log('MARKS:', JSON.stringify(marks, null, 1));
console.log('P:', JSON.stringify(await pos2(page)));
// try walking to the exact __gate marker if present by walking to (-4,-26)
let p = await goto(page, -4, -26, { maxIter: 12, tol: 1.5, log: false });
console.log('P2:', JSON.stringify(p));
console.log('TXT:', JSON.stringify(await text(page, 400)));
await shot(page, '192-at-gate-spot');
await browser.close();
