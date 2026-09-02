import { getPage, shot, safeEval, text } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame, walkUntil } from './lib4.mjs';
const { browser, page } = await getPage();
const task = () => safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
await ensureGame(page);
let p = await pos2(page);
if (!p || !p.atTask) p = await walkUntil(page, ['w'], 500, 6, q => !!q.atTask) ;
console.log('P:', JSON.stringify(p));
await page.keyboard.press('e');
await page.waitForTimeout(2000);
console.log('PANEL:', JSON.stringify(await text(page, 900)));
await shot(page, '176-scales-ready');
let t = await task();
console.log('TASK:', JSON.stringify(t));
// close panel to do physical drag
await page.getByText('אחר כך').click().catch(()=>{});
await page.waitForTimeout(1000);
t = await task();
console.log('TASK2:', JSON.stringify(t));
async function dragProp(idx, name) {
  let t = await task();
  if (!t) return 'notask';
  const prop = t.props[idx];
  if (!prop || prop.placed) return 'skip';
  await page.mouse.move(prop.x, prop.y);
  await page.waitForTimeout(300);
  await shot(page, name + '-hover');
  await page.mouse.down();
  await page.waitForTimeout(120);
  const t0 = Date.now();
  while (Date.now() - t0 < 6000) {
    const cur = await task();
    if (!cur) { await page.mouse.up().catch(()=>{}); return 'reload'; }
    const c = cur.props[idx];
    const d = Math.hypot(cur.target.x - c.x, cur.target.y - c.y);
    if (d < 10) break;
    const step = Math.min(45, d);
    await page.mouse.move(c.x + (cur.target.x-c.x)/d*step, c.y + (cur.target.y-c.y)/d*step);
    await page.waitForTimeout(35);
  }
  await shot(page, name + '-mid');
  await page.mouse.up();
  await page.waitForTimeout(2200);
  await shot(page, name + '-after');
  const after = await task();
  console.log(name, 'after:', JSON.stringify(after));
  console.log(name, 'TXT:', JSON.stringify(await text(page, 900)));
  return 'done';
}
console.log(await dragProp(0, '177-coin-drag'));
await browser.close();
