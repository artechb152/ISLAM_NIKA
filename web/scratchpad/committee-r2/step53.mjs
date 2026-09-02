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
  if (idx < 0 || t.props[idx].placed) return 'skip';
  const prop = t.props[idx];
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
  await page.waitForTimeout(2300);
  await shot(page, name + '-after');
  const after = await task();
  console.log(name, 'after:', JSON.stringify(after));
  console.log(name, 'TXT:', JSON.stringify(await text(page, 1000)));
  return 'done';
}
await ensureGame(page);
let p = await pos2(page);
if (!p || !p.atTask) p = await goto(page, 0, -2.9, { maxIter: 20, tol: 1.5, log: false });
console.log('P:', JSON.stringify(p));
console.log('coin:', await dragProp('show-drachm', '178-coin'));
// advance any dialog line that follows
const t1 = await text(page, 400);
if (typeof t1 === 'string' && (t1.includes('להמשך') || t1.includes('המשך'))) { await page.keyboard.press(' '); await page.waitForTimeout(1200); }
console.log('seal:', await dragProp('show-seal', '179-seal'));
console.log('FINAL:', JSON.stringify(await text(page, 1100)));
await shot(page, '180-scales-done');
await browser.close();
