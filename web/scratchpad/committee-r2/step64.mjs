import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { rotate, markerX } from './seek.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
const keys = await safeEval(page, () => {
  const l = window.__ch1Live; if (!l || !l.markerEls) return null;
  const els = l.markerEls instanceof Map ? [...l.markerEls.keys()] : Object.keys(l.markerEls);
  return els;
});
console.log('KEYS:', JSON.stringify(keys));
// walk to whoever marker (not find, not task, not gate)
const who = (keys || []).find(k => !k.startsWith('find') && !k.startsWith('__') && k !== 'task');
console.log('WHO:', who);
for (let i = 0; i < 25; i++) {
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.nearWho) { console.log('NEAR:', p.nearWho); break; }
  const m = await markerX(page, who);
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
  if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['w'], 800);
}
console.log('P:', JSON.stringify(await pos2(page)));
await shot(page, '196-near-chief');
await browser.close();
