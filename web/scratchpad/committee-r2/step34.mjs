import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
await shot(page, '139-north-wall');
console.log('P:', JSON.stringify(await pos2(page)));
console.log('TXT:', JSON.stringify(await text(page, 700)));
// push W hard for 5s
await hold(page, ['w'], 5000);
console.log('P2:', JSON.stringify(await pos2(page)));
console.log('TXT2:', JSON.stringify(await text(page, 700)));
await shot(page, '140-north-push');
await browser.close();
