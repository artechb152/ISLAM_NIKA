import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind } from './seek.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
await hold(page, ['s'], 1200);
const p = await seekFind(page, 'road-sherd', 35);
console.log('AT:', JSON.stringify(p));
if (p && p.nearFind) {
  await shot(page, '212-roadsherd-near');
  await page.keyboard.press('f');
  await page.waitForTimeout(2300);
  await shot(page, '212-roadsherd-card');
  const t = await text(page, 1100);
  const j = typeof t === 'string' ? t.lastIndexOf('נמצא') : -1;
  console.log('CARD:', JSON.stringify(j>=0 ? t.slice(j, j+300) : t));
  await page.getByText('המשיכו').click().catch(()=>{});
}
await browser.close();
