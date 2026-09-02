import { getPage, shot, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
const label = process.argv[2];
try { await page.getByText(label).first().click({ timeout: 4000 }); } catch(e){ console.log('click fail', String(e).slice(0,120)); }
await page.waitForTimeout(1500);
await shot(page, process.argv[3] || 'clicked');
console.log('TXT:', JSON.stringify(await safeEval(page, () => document.body.innerText.slice(0, 900))));
await browser.close();
