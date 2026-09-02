import { getPage, shot } from './lib2.mjs';
const { browser, page } = await getPage();
await page.screenshot({ path: 'C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/107b-token-zoom.png', clip: { x: 650, y: 380, width: 220, height: 140 } });
await page.screenshot({ path: 'C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/107c-map-zoom.png', clip: { x: 410, y: 200, width: 470, height: 300 } });
console.log('done');
await browser.close();
