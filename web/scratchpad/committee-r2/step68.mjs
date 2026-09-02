import { getPage, shot, safeEval, text } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
// try also the sneak answer for completeness
await page.getByText('בלילה — נתגנב מסביב').click().catch(e=>console.log('err-sneak'));
await page.waitForTimeout(2200);
console.log('SNEAK:', JSON.stringify((await text(page, 1500)).slice(-400)));
await shot(page, '206-pass-sneak');
await page.getByText('בחסותך — תמורת מכס, כמו כולם').click().catch(e=>console.log('err-correct'));
await page.waitForTimeout(2500);
console.log('CORRECT:', JSON.stringify((await text(page, 1800)).slice(-500)));
await shot(page, '207-pass-correct');
await browser.close();
