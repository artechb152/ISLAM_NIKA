import { getPage, safeEval, text, shot } from './lib2.mjs';
const { browser, page } = await getPage();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
console.log('open?', (await T(300)).includes('לפי דמות'));
await page.keyboard.press('Escape');
await page.waitForTimeout(1200);
console.log('after ESC open?', (await T(300)).includes('לפי דמות'));
// close via X or J?
await page.keyboard.press('j');
await page.waitForTimeout(1200);
console.log('after J open?', (await T(300)).includes('לפי דמות'));
await page.keyboard.press('m');
await page.waitForTimeout(1500);
await shot(page, '308-map-m');
console.log('TXT:', JSON.stringify(await T(400)));
await browser.close();
