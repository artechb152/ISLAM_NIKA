import { getPage, shot, safeEval, text } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame, walkUntil } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
// unsolve
await safeEval(page, () => {
  const nb = JSON.parse(localStorage.getItem('ch1:notebook:v1'));
  nb.solved = nb.solved.filter(s => s !== 'task-plan-route');
  nb.seen = nb.seen.filter(s => s !== 'camp-departure');
  localStorage.setItem('ch1:notebook:v1', JSON.stringify(nb));
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(10000);
await ensureGame(page);
let p = await walkUntil(page, ['w'], 700, 8, q => !!q.atTask);
if (!p || !p.atTask) p = await walkUntil(page, ['s'], 700, 8, q => !!q.atTask);
console.log('AT:', JSON.stringify(p));
const task = () => safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
let t = await task();
if (!t) { await page.keyboard.press('e'); await page.waitForTimeout(1800);
  await page.getByText('אחר כך').click().catch(()=>{}); await page.waitForTimeout(1200); t = await task(); }
console.log('TASK:', JSON.stringify(t));
// marker positions from live
const marks = await safeEval(page, () => {
  const l = window.__ch1Live;
  if (!l || !l.markerEls) return null;
  const out = [];
  const els = l.markerEls instanceof Map ? [...l.markerEls.entries()] : Object.entries(l.markerEls);
  for (const [k, el] of els) {
    try { const r = el.getBoundingClientRect(); out.push({ k, x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2), t: (el.textContent||'').slice(0,40) }); } catch(e){}
  }
  return out;
});
console.log('MARKS:', JSON.stringify(marks));
await shot(page, '121-refusal-setup');
await browser.close();
