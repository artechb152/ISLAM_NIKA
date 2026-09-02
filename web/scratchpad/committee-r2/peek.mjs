import { getPage, shot, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
console.log('URL', page.url());
await page.waitForTimeout(3000);
await shot(page, process.argv[2] || 'peek');
const txt = await safeEval(page, () => document.body.innerText.slice(0, 2500));
console.log('TEXT:', JSON.stringify(txt));
await browser.close();
