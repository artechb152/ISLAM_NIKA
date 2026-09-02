import { getPage, shot, safeEval, text } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
await page.mouse.click(640, 540); // complete rawi line
await page.waitForTimeout(1400);
await page.keyboard.press(' ');
await page.waitForTimeout(1200);
await shot(page, '209-road-view');
console.log('TXT:', JSON.stringify(await text(page, 800)));
await browser.close();
