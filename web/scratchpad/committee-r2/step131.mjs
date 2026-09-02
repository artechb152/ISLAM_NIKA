import { getPage, safeEval, text, shot } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
const T = async (n=600) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
console.log('STATE:', JSON.stringify(await T(600)));
const vids = await safeEval(page, () => [...document.querySelectorAll('video')].map(v => ({ src: (v.currentSrc||v.src||'').slice(-60), paused: v.paused })));
console.log('VIDEOS:', JSON.stringify(vids));
await browser.close();
