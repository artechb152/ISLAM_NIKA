import { getPage, shot, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
await page.keyboard.press('Escape');
await page.waitForTimeout(1200);
await shot(page, '06-area1-escape2');
const txt = await safeEval(page, () => document.body.innerText.slice(0, 700));
console.log('TXT:', JSON.stringify(txt));
await browser.close();
