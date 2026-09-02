import { getPage, safeEval, text, shot } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=800) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
// wrong: religion into shared circle
await B('הדת עצמה').click().catch(e=>console.log('e1'));
await page.waitForTimeout(900);
await shot(page, '237-picked-religion');
await B('המעגל המשותף — בין הבתים').click().catch(e=>console.log('e2'));
await page.waitForTimeout(2000);
await shot(page, '238-religion-wrong');
console.log('WRONG:', JSON.stringify((await T(1800)).slice(-450)));
await browser.close();
