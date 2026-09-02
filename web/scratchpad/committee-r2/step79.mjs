import { getPage, shot, safeEval, text } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame, walkUntil } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
console.log('TXT:', JSON.stringify(await text(page, 500)));
console.log('P:', JSON.stringify(await pos2(page)));
// if panel open, click button
const btns = await safeEval(page, () => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(Boolean));
console.log('BUTTONS:', JSON.stringify(btns));
await browser.close();
