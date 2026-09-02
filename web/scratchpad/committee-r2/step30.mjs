import { getPage, shot, safeEval, text } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind } from './seek.mjs';
const { browser, page } = await getPage();
await page.getByText('המשיכו').click().catch(()=>{});
await page.waitForTimeout(1200);
await ensureGame(page);
const p = await seekFind(page, 'sherd');
console.log('AT:', JSON.stringify(p));
await shot(page, '133-sherd-near');
if (p && p.nearFind) {
  await page.keyboard.press('f');
  await page.waitForTimeout(2500);
  await shot(page, '134-sherd-card');
  console.log('TXT:', JSON.stringify(await text(page, 1000)));
  await page.getByText('המשיכו').click().catch(()=>{});
  await page.waitForTimeout(1000);
}
await browser.close();
