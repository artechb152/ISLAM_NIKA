import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind, rotate, markerX } from './seek.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
await page.getByText('המשיכו').click().catch(()=>{});
await page.waitForTimeout(1000);
// back off from obstacle
await hold(page, ['s'], 1500);
console.log('P:', JSON.stringify(await pos2(page)));
const p = await seekFind(page, 'sherd', 30);
console.log('AT:', JSON.stringify(p));
await shot(page, '135-sherd-near');
if (p && p.nearFind) {
  await page.keyboard.press('f');
  await page.waitForTimeout(2500);
  await shot(page, '136-sherd-card');
  console.log('TXT:', JSON.stringify(await text(page, 1000)));
}
await browser.close();
