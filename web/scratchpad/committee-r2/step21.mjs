import { getPage, shot, safeEval, text } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
const ls = await safeEval(page, () => { const o={}; for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i); o[k]=localStorage.getItem(k);} return o; });
console.log('LS:', JSON.stringify(ls));
console.log('TXT:', JSON.stringify(await text(page, 600)));
await shot(page, '120-recovered');
await browser.close();
