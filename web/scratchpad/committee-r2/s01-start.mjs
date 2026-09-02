import { getPage, shot, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
await page.goto('http://localhost:3000/chapter1', { waitUntil: 'domcontentloaded' });
await safeEval(page, () => localStorage.clear());
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
await shot(page, '00-title-screen');
// dump visible text of body to see menu
const txt = await safeEval(page, () => document.body.innerText.slice(0, 2000));
console.log('TEXT:', JSON.stringify(txt));
await browser.close();
