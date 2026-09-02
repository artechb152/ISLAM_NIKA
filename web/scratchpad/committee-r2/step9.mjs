import { getPage, shot, hold, text } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
const { browser, page } = await getPage();
console.log('P0:', JSON.stringify(await pos2(page)));
// walk forward a bit to see walk anim
await hold(page, ['w'], 1500);
await shot(page, '103-walk');
console.log('P1:', JSON.stringify(await pos2(page)));
// run
await hold(page, ['Shift','w'], 1500);
await shot(page, '104-run');
console.log('P2:', JSON.stringify(await pos2(page)));
console.log('TXT:', JSON.stringify(await text(page, 500)));
await browser.close();
