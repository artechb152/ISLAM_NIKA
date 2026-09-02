import { getPage, shot, safeEval, text } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const task = () => safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);

async function dragProp(id, name) {
  let t = await task();
  if (!t) return 'notask';
  const idx = t.props.findIndex(p => p.id === id);
  if (idx < 0) return 'noprop';
  if (t.props[idx].placed) return 'already';
  const prop = t.props[idx];
  await page.mouse.move(prop.x, prop.y);
  await page.waitForTimeout(250);
  await page.mouse.down();
  await page.waitForTimeout(120);
  const t0 = Date.now();
  while (Date.now() - t0 < 6000) {
    const cur = await task();
    if (!cur) { await page.mouse.up().catch(()=>{}); return 'reload'; }
    const c = cur.props[idx];
    const d = Math.hypot(cur.target.x - c.x, cur.target.y - c.y);
    if (d < 8) break;
    const step = Math.min(40, d);
    await page.mouse.move(c.x + (cur.target.x-c.x)/d*step, c.y + (cur.target.y-c.y)/d*step);
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  await page.waitForTimeout(2200);
  await shot(page, name);
  const after = await task();
  console.log(name, JSON.stringify(after));
  return after && after.props[idx] && after.props[idx].placed ? 'placed' : 'notplaced';
}

await ensureGame(page);
let p = await pos2(page);
if (!p || !p.atTask) p = await goto(page, 0, -2.9, { maxIter: 22, tol: 1.5, log: false });
let t = await task();
if (!t) { await page.keyboard.press('e'); await page.waitForTimeout(1500); }
await page.getByText('אחר כך').click().catch(()=>{});
await page.waitForTimeout(800);
console.log('coin:', await dragProp('show-drachm', '183-coin-placed'));
console.log('afterCoinTXT:', JSON.stringify(await text(page, 1000)));
// dismiss reaction panel if open
await page.getByText('אחר כך').click().catch(()=>{});
await page.waitForTimeout(800);
console.log('seal:', await dragProp('show-seal', '184-seal-placed'));
console.log('FINAL:', JSON.stringify(await text(page, 1300)));
await shot(page, '185-scales-complete');
await browser.close();
