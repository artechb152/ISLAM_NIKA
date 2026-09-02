import { getPage, safeEval, text, shot, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { rotate, markerX } from './seek.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=900) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (let i = 0; i < 25; i++) {
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.atTask) break;
  const m = await markerX(page, 'task');
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
  if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['w'], 800);
}
console.log('P:', JSON.stringify(await pos2(page)));
await page.keyboard.press('e'); await page.waitForTimeout(2000);
console.log('PANEL:', JSON.stringify((await T(1800)).slice(-800)));
const tk = await safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
console.log('TASK:', JSON.stringify(tk));
await shot(page, '260-altar-open');
await browser.close();
