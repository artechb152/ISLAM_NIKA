import { getPage, shot, safeEval, text } from './lib2.mjs';
const { browser, page } = await getPage();
// close keys panel
await page.keyboard.press('r');
await page.waitForTimeout(2500);
console.log('TXT:', JSON.stringify(await text(page, 1200)));
await shot(page, '96-rawi-dialog1');
await browser.close();
