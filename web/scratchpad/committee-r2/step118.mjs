import { getPage, safeEval, text, shot, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
const { browser, page } = await getPage();
console.log('TXT:', JSON.stringify(await text(page, 700)));
await shot(page, '262-stuck-diag');
// try backing out
await hold(page, ['s'], 1500);
console.log('P after S:', JSON.stringify(await pos2(page)));
await hold(page, ['a'], 1500);
console.log('P after A:', JSON.stringify(await pos2(page)));
await hold(page, ['d'], 2500);
console.log('P after D:', JSON.stringify(await pos2(page)));
await browser.close();
