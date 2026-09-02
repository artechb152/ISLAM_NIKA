import { getPage, shot, safeEval } from './lib.mjs';
import fs from 'fs';
const { browser, page } = await getPage();
await page.goto('http://localhost:3000/chapter1', { waitUntil: 'domcontentloaded' });
const state = JSON.parse(fs.readFileSync('C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/state.json', 'utf8'));
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, state);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(8000);
// webgl sanity
const gl = await safeEval(page, () => { const c = document.createElement('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); return g ? g.getParameter(g.RENDERER) : 'NO WEBGL'; });
console.log('WEBGL:', JSON.stringify(gl));
await shot(page, '67-headless-restored');
console.log('TXT:', JSON.stringify(await safeEval(page, () => document.body.innerText.slice(0, 500))));
await browser.close();
