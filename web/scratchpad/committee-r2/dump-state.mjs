import { getPage } from './lib.mjs';
import fs from 'fs';
const { browser, page } = await getPage();
const state = await page.evaluate(() => JSON.stringify(localStorage));
fs.writeFileSync('C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/state.json', state);
console.log('saved', state.length, 'bytes');
await browser.close();
