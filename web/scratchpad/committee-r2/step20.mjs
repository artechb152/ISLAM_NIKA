import { getPage, shot, safeEval, text } from './lib2.mjs';
const { browser, page } = await getPage();
await page.getByText('הלאה').click().catch(e => console.log('err', String(e).slice(0,120)));
await page.waitForTimeout(2500);
await shot(page, '118-after-solve');
console.log('TXT:', JSON.stringify(await text(page, 900)));
// complete pending rawi line if shown
await page.mouse.click(640, 570);
await page.waitForTimeout(1800);
await shot(page, '119-after-solve2');
console.log('TXT2:', JSON.stringify(await text(page, 900)));
await browser.close();
