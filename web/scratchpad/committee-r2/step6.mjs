import { getPage, shot, safeEval, text } from './lib2.mjs';
const { browser, page } = await getPage();
await page.keyboard.press('r');
await page.waitForTimeout(1800);
await page.mouse.click(640, 570); // complete line -> choices
await page.waitForTimeout(1500);
await shot(page, '98-rawi-choices');
// pick "מה זה ג'אהליה?"
const c = page.getByText('ג׳אהליה', { exact: false }).first();
await c.click().catch(e => console.log('choiceErr', String(e).slice(0,150)));
await page.waitForTimeout(2200);
console.log('TXT:', JSON.stringify(await text(page, 1100)));
await shot(page, '99-rawi-jahiliya');
// mid-line Escape test
await page.keyboard.press('Escape');
await page.waitForTimeout(1000);
console.log('AFTER ESC1:', JSON.stringify(await text(page, 700)));
await shot(page, '100-esc1');
await page.keyboard.press('Escape');
await page.waitForTimeout(1000);
console.log('AFTER ESC2:', JSON.stringify(await text(page, 500)));
await shot(page, '101-esc2');
await browser.close();
