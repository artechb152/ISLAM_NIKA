import { getPage, safeEval } from './lib2.mjs';
const { browser, page } = await getPage();
const r = await safeEval(page, () => {
  const out = {};
  const l = window.__ch1Live;
  out.live = l ? Object.keys(l) : null;
  if (l && l.player) {
    out.playerKeys = Object.keys(l.player);
    try { out.pos = l.player.get ? l.player.get() : l.player.position; } catch(e){ out.posErr = String(e); }
  }
  const t = window.__ch1Task;
  out.task = t ? (typeof t === 'function' ? 'fn' : Object.keys(t)) : null;
  if (t && typeof t !== 'function') { try { out.taskVal = JSON.parse(JSON.stringify(t)); } catch(e){} }
  return out;
});
console.log(JSON.stringify(r, null, 1).slice(0, 2000));
await browser.close();
