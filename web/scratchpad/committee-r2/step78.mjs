import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind } from './seek.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
await page.locator('button', { hasText: 'הלאה' }).last().click().catch(()=>{});
await page.waitForTimeout(1400);
await page.mouse.click(640, 540);
await page.waitForTimeout(1200);
await page.keyboard.press(' ');
await page.waitForTimeout(1000);
// road sherd
await hold(page, ['s'], 1500);
const p = await seekFind(page, 'road-sherd', 35);
console.log('AT:', JSON.stringify(p));
if (p && p.nearFind) {
  await page.keyboard.press('f');
  await page.waitForTimeout(2300);
  await shot(page, '222-roadsherd-card');
  const t = await text(page, 1100);
  const j = typeof t === 'string' ? t.lastIndexOf('נמצא') : -1;
  console.log('CARD:', JSON.stringify(j>=0 ? t.slice(j, j+300) : '?'));
  await page.getByText('המשיכו').click().catch(()=>{});
}
await browser.close();
