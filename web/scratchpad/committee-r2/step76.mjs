import { getPage, shot, safeEval, text } from './lib2.mjs';
const { browser, page } = await getPage();
const task = () => safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
await page.getByText('אחר כך').click().catch(()=>{});
await page.waitForTimeout(900);
let t = await task();
if (!t) { console.log('no task'); await browser.close(); process.exit(0); }
const idx = t.props.findIndex(p => p.id === 'spice');
// hover
await page.mouse.move(t.props[idx].x, t.props[idx].y);
await page.waitForTimeout(500);
await shot(page, '217-spice-hover');
// wrong drop: drag away from crate (down-right) and release
await page.mouse.down();
await page.waitForTimeout(150);
for (let s = 0; s < 10; s++) { const c = (await task()).props[idx]; await page.mouse.move(c.x + 18, c.y + 10); await page.waitForTimeout(40); }
await shot(page, '218-spice-wrongdrop-mid');
await page.mouse.up();
await page.waitForTimeout(1800);
await shot(page, '219-spice-wrongdrop-after');
t = await task();
console.log('after wrong drop:', JSON.stringify(t));
console.log('TXT:', JSON.stringify((await text(page, 600))));
await browser.close();
