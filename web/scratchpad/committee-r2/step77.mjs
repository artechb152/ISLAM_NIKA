import { getPage, shot, safeEval, text } from './lib2.mjs';
const { browser, page } = await getPage();
const task = () => safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
let t = await task();
if (!t) { console.log('no task'); await browser.close(); process.exit(0); }
const idx = t.props.findIndex(p => p.id === 'spice');
await page.mouse.move(t.props[idx].x, t.props[idx].y);
await page.waitForTimeout(300);
await page.mouse.down();
await page.waitForTimeout(150);
const t0 = Date.now();
while (Date.now() - t0 < 6000) {
  const cur = await task();
  if (!cur) break;
  const c = cur.props[idx];
  const d = Math.hypot(cur.target.x - c.x, cur.target.y - c.y);
  if (d < 8) break;
  const step = Math.min(40, d);
  await page.mouse.move(c.x + (cur.target.x-c.x)/d*step, c.y + (cur.target.y-c.y)/d*step);
  await page.waitForTimeout(40);
}
await shot(page, '220-spice-mid');
await page.mouse.up();
await page.waitForTimeout(2300);
await shot(page, '221-spice-placed');
console.log('AFTER:', JSON.stringify(await task()));
console.log('TXT:', JSON.stringify(await text(page, 1400)));
await browser.close();
