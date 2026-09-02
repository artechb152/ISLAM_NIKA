import { getPage, shot, safeEval, text } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame, walkUntil } from './lib4.mjs';
import { rotate, markerX } from './seek.mjs';
import { hold } from './lib2.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
for (let i = 0; i < 20; i++) {
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.atTask) break;
  const m = await markerX(page, 'task');
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
  if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['w'], 800);
}
await page.keyboard.press('e');
await page.waitForTimeout(1800);
await shot(page, '204-pass-options-unlocked');
console.log('PANEL:', JSON.stringify(await text(page, 1200)));
// wrong answer: בכוח
await page.getByText('בכוח — נשכור לוחמים').click().catch(e=>console.log('err1'));
await page.waitForTimeout(2200);
await shot(page, '205-pass-wrong');
console.log('WRONG:', JSON.stringify(await text(page, 1300)));
await browser.close();
