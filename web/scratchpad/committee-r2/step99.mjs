import { getPage, safeEval, text, shot } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
await shot(page, '230-yathrib-view');
console.log('TXT:', JSON.stringify(await (async()=>{const t=await text(page,800);return t;})()));
const keys = await safeEval(page, () => {
  const l = window.__ch1Live; if (!l || !l.markerEls) return null;
  return l.markerEls instanceof Map ? [...l.markerEls.keys()] : Object.keys(l.markerEls);
});
console.log('KEYS:', JSON.stringify(keys));
await browser.close();
