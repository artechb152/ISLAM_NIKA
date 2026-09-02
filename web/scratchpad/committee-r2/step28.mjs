import { getPage, shot, safeEval } from './lib2.mjs';
const { browser, page } = await getPage();
// rotate view by dragging mouse, screenshot 4 directions
for (let i = 0; i < 4; i++) {
  await page.mouse.move(640, 360);
  await page.mouse.down();
  for (let s = 0; s < 10; s++) { await page.mouse.move(640 - 40*(s+1), 360); await page.waitForTimeout(30); }
  await page.mouse.up();
  await page.waitForTimeout(600);
  const marks = await safeEval(page, () => {
    const l = window.__ch1Live; if (!l || !l.markerEls) return null;
    const els = l.markerEls instanceof Map ? [...l.markerEls.entries()] : Object.entries(l.markerEls);
    return els.map(([k, el]) => { const r = el.getBoundingClientRect(); return { k, x: Math.round(r.x), y: Math.round(r.y) }; });
  });
  console.log('look' + i, JSON.stringify(marks));
  await shot(page, '130-look' + i);
}
await browser.close();
