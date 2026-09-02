import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind, rotate, markerX } from './seek.mjs';

const { browser, page } = await getPage();
await ensureGame(page);
// aim at task marker and walk
for (let i = 0; i < 25; i++) {
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.atTask) break;
  const m = await markerX(page, 'task');
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
  if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['w'], 700);
}
const p = await pos2(page);
console.log('AT:', JSON.stringify(p));
await shot(page, '153-at-scales');
await page.keyboard.press('e');
await page.waitForTimeout(2200);
console.log('TXT:', JSON.stringify(await text(page, 1100)));
await shot(page, '154-scales-empty');
await browser.close();
