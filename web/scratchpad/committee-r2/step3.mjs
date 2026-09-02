import { getPage, shot, safeEval, text, pos } from './lib2.mjs';
const { browser, page } = await getPage();
await page.getByText('המשיכו במסע').click().catch(e => console.log('clickErr', String(e).slice(0,150)));
await page.waitForTimeout(15000);
console.log('POS:', JSON.stringify(await pos(page)));
console.log('TXT:', JSON.stringify(await text(page, 900)));
await shot(page, '95-camp-loaded');
await browser.close();
