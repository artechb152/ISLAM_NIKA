import { getPage, safeEval, text, shot, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { rotate, markerX } from './seek.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=1400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (let i = 0; i < 30; i++) {
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.atTask) break;
  const m = await markerX(page, 'task');
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -240); continue; }
  if (m.x < 530 || m.x > 750) { await rotate(page, Math.max(-330, Math.min(330, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['w'], 700);
}
console.log('P:', JSON.stringify(await pos2(page)));
await shot(page, '275-temple-compound');
await page.keyboard.press('e'); await page.waitForTimeout(2000);
console.log('PANEL:', JSON.stringify((await T(2200)).slice(-900)));
await shot(page, '276-stones-open');
await browser.close();
