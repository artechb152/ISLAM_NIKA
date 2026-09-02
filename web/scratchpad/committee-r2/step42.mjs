import { getPage, shot, safeEval, text } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
const marks = await safeEval(page, () => {
  const l = window.__ch1Live; if (!l || !l.markerEls) return null;
  const els = l.markerEls instanceof Map ? [...l.markerEls.entries()] : Object.entries(l.markerEls);
  return els.map(([k, el]) => { const r = el.getBoundingClientRect(); return { k, x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) }; });
});
console.log('MARKS:', JSON.stringify(marks, null, 1));
await browser.close();
