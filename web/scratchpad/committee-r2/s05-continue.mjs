import { getPage, shot, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
try { await page.getByText('המשך', { exact: false }).first().click({ timeout: 4000 }); } catch(e){ console.log('no continue btn', String(e).slice(0,100)); await page.keyboard.press(' '); }
await page.waitForTimeout(3500);
await shot(page, '03-area1-gameplay');
const txt = await safeEval(page, () => document.body.innerText.slice(0, 1200));
console.log('TEXT:', JSON.stringify(txt));
await browser.close();
