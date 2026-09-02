import { getPage, shot, safeEval, text } from './lib2.mjs';
const { browser, page } = await getPage();
const task = () => safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
const eastPos = () => safeEval(page, () => {
  const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent||'').includes('מזרחה'));
  const vis = els.map(e => { const r = e.getBoundingClientRect(); return { x: r.x+r.width/2, y: r.y+r.height/2, w: r.width }; })
    .filter(o => o.w > 10 && o.x > 0 && o.x < 1280 && o.y > 0 && o.y < 720);
  return vis.length ? vis[0] : null;
});
console.log('EAST:', JSON.stringify(await eastPos()));
let t = await task();
if (!t) { console.log('no task'); await browser.close(); process.exit(0); }
const tok = t.props[0];
await page.mouse.move(tok.x, tok.y);
await page.waitForTimeout(250);
await page.mouse.down();
await page.waitForTimeout(120);
t = await task();
console.log('dragging:', t ? t.dragging : 'null');
const t0 = Date.now();
while (Date.now() - t0 < 5000) {
  const cur = await task();
  const dest = await eastPos();
  if (!cur || !dest) break;
  const c = cur.props[0];
  const d = Math.hypot(dest.x - c.x, dest.y - c.y);
  if (d < 10) break;
  const step = Math.min(45, d);
  await page.mouse.move(c.x + (dest.x-c.x)/d*step, c.y + (dest.y-c.y)/d*step);
  await page.waitForTimeout(35);
}
await shot(page, '122-east-drop-mid');
await page.mouse.up();
await page.waitForTimeout(2200);
await shot(page, '123-east-drop-after');
console.log('AFTER:', JSON.stringify(await task()));
console.log('TXT:', JSON.stringify(await text(page, 900)));
await browser.close();
