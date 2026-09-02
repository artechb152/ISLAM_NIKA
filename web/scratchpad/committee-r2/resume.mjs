import { getPage, shot, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
try { await page.getByText('המשיכו במסע').first().click({ timeout: 5000 }); } catch(e){ console.log('no resume btn'); }
await page.waitForTimeout(6000);
const txt = await safeEval(page, () => document.body.innerText.slice(0, 600));
console.log('TXT:', JSON.stringify(txt));
await shot(page, process.argv[2] || 'resume');
await browser.close();
