import { getPage, shot, hold, pos } from './lib.mjs';
const { browser, page } = await getPage();
await page.mouse.click(640, 400); // focus canvas
console.log('pos0', JSON.stringify(await pos(page)));
await hold(page, ['w'], 1500);
await shot(page, '07-area1-walk');
console.log('pos1', JSON.stringify(await pos(page)));
await hold(page, ['Shift','w'], 1500);
await shot(page, '08-area1-run');
console.log('pos2', JSON.stringify(await pos(page)));
await browser.close();
