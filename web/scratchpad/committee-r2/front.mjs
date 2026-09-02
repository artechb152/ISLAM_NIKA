import { getPage, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
await page.bringToFront();
await page.waitForTimeout(500);
const fps = await safeEval(page, () => new Promise(res => {
  let n = 0; const t0 = performance.now();
  const loop = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(loop); else res(n); };
  requestAnimationFrame(loop);
}));
console.log('FPS after bringToFront:', JSON.stringify(fps));
await browser.close();
