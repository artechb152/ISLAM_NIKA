import { getPage, shot, safeEval, text } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const task = () => safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
await ensureGame(page);
await page.getByText('אחר כך').click().catch(()=>{});
await page.waitForTimeout(900);
let p = await pos2(page);
if (!p || !p.atTask) { p = await goto(page, 0, -2.9, { maxIter: 20, tol: 1.5, log: false }); }
let t = await task();
if (!t) { await page.keyboard.press('e'); await page.waitForTimeout(1500); await page.getByText('אחר כך').click().catch(()=>{}); await page.waitForTimeout(900); t = await task(); }
console.log('TASK:', JSON.stringify(t));
if (t) {
  const idx = t.props.findIndex(p => p.id === 'show-drachm');
  const prop = t.props[idx];
  await page.mouse.move(prop.x, prop.y);
  await page.waitForTimeout(300);
  await page.mouse.down();
  await page.waitForTimeout(150);
  const d0 = await task();
  console.log('dragging:', d0 ? d0.dragging : null);
  const t0 = Date.now();
  while (Date.now() - t0 < 7000) {
    const cur = await task();
    if (!cur) break;
    const c = cur.props[idx];
    const d = Math.hypot(cur.target.x - c.x, cur.target.y - c.y);
    if (d < 8) break;
    const step = Math.min(40, d);
    await page.mouse.move(c.x + (cur.target.x-c.x)/d*step, c.y + (cur.target.y-c.y)/d*step);
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await page.waitForTimeout(2500);
  await shot(page, '181-coin-placed');
  console.log('AFTER:', JSON.stringify(await task()));
  console.log('TXT:', JSON.stringify(await text(page, 1200)));
}
await browser.close();
