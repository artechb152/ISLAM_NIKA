import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
const { browser, page } = await getPage();
console.log('TXT:', JSON.stringify(await text(page, 900)));
await shot(page, '213-stuck-check');
console.log('P:', JSON.stringify(await pos2(page)));
await browser.close();
