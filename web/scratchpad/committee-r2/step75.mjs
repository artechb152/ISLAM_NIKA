import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { rotate, markerX } from './seek.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
for (let i = 0; i < 22; i++) {
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.atTask) break;
  const m = await markerX(page, 'task');
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
  if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['w'], 700);
}
console.log('P:', JSON.stringify(await pos2(page)));
const t0 = await safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
console.log('TASK(atTask):', JSON.stringify(t0));
await shot(page, '215-at-crate');
await page.keyboard.press('e');
await page.waitForTimeout(1800);
const t1 = await safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
console.log('TASK(open):', JSON.stringify(t1));
console.log('PANEL:', JSON.stringify(await text(page, 1300)));
await shot(page, '216-crate-panel');
await browser.close();
