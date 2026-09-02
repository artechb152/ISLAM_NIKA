import { getPage, safeEval, text, hold, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind } from './seek.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
await hold(page, ['s'], 1000);
const p = await seekFind(page, 'road-sherd', 30);
console.log('AT:', JSON.stringify(p));
if (p && p.nearFind) {
  await page.keyboard.press('f'); await page.waitForTimeout(2100);
  await shot(page, '222-roadsherd-card');
  const t = await T(1100); const j = t.lastIndexOf('נמצא');
  console.log('CARD:', JSON.stringify(j>=0 ? t.slice(j, j+300) : '?'));
  await B('המשיכו').click().catch(()=>{});
  await page.waitForTimeout(800);
}
await browser.close();
