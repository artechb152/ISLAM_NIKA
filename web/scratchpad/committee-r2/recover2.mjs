import { getPage, shot, hold, safeEval, text } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
const { browser, page } = await getPage();
const t = await text(page, 200);
if (t && t.includes('המשיכו במסע')) {
  await page.getByText('המשיכו במסע').click();
  await page.waitForTimeout(14000);
}
console.log('POS:', JSON.stringify(await pos2(page)));
console.log('TXT:', JSON.stringify(await text(page, 500)));
await browser.close();
