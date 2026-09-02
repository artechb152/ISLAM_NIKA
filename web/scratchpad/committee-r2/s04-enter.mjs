import { getPage, shot, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
await page.keyboard.press(' ');
await page.waitForTimeout(3000);
await shot(page, '02-area1-first-view');
const txt = await safeEval(page, () => document.body.innerText.slice(0, 1200));
console.log('TEXT:', JSON.stringify(txt));
await browser.close();
