import { getPage, safeEval, text, shot, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { rotate, markerX } from './seek.mjs';
const { browser, page } = await getPage();
const T = async (n=900) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
// keep walking to atTask with more patience
for (let i = 0; i < 40; i++) {
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.atTask) { console.log('AT TASK', JSON.stringify(p)); break; }
  const m = await markerX(page, 'task');
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -220); continue; }
  if (m.y < 100) { /* elevated marker, just walk */ }
  if (m.x < 540 || m.x > 740) { await rotate(page, Math.max(-320, Math.min(320, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['w'], 650);
  if (i % 8 === 7) console.log(i, JSON.stringify(await pos2(page)));
}
const p = await pos2(page);
if (p && p.atTask) {
  await page.keyboard.press('e'); await page.waitForTimeout(2000);
  console.log('PANEL:', JSON.stringify((await T(2000)).slice(-900)));
  await shot(page, '261-altar-panel');
}
await browser.close();
