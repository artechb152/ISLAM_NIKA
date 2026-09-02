import { getPage, shot, safeEval, text } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame, walkUntil } from './lib4.mjs';
const { browser, page } = await getPage();

const task = () => safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
const labelPos = (s) => safeEval(page, (s) => {
  const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.includes(s));
  if (!els.length) return null;
  const r = els[0].getBoundingClientRect();
  return { x: r.x + r.width/2, y: r.y + r.height/2 };
}, s);

async function ready() {
  await ensureGame(page);
  let p = await pos2(page);
  if (!p || !p.atTask) {
    p = await walkUntil(page, ['w'], 700, 8, q => !!q.atTask);
    if (!p || !p.atTask) p = await walkUntil(page, ['s'], 700, 8, q => !!q.atTask);
  }
  let t = await task();
  if (!t) {
    await page.keyboard.press('e');
    await page.waitForTimeout(1800);
    t = await task();
    if (t) {
      await page.getByText('אחר כך').click().catch(()=>{});
      await page.waitForTimeout(1200);
      t = await task();
    }
  }
  return t;
}

async function liveDrag(destFn, name, maxMs = 5000) {
  let t = await task();
  if (!t || !t.props || t.props[0].placed) return 'skip';
  const tok = t.props[0];
  await page.mouse.move(tok.x, tok.y);
  await page.waitForTimeout(250);
  await page.mouse.down();
  await page.waitForTimeout(120);
  t = await task();
  if (!t) { await page.mouse.up().catch(()=>{}); return 'reload'; }
  console.log(name, 'dragging:', t.dragging);
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const cur = await task();
    const dest = await destFn();
    if (!cur || !dest) { await page.mouse.up().catch(()=>{}); return 'reload'; }
    const c = cur.props[0];
    const d = Math.hypot(dest.x - c.x, dest.y - c.y);
    if (d < 10) break;
    const step = Math.min(45, d);
    await page.mouse.move(c.x + (dest.x-c.x)/d*step, c.y + (dest.y-c.y)/d*step);
    await page.waitForTimeout(35);
  }
  await shot(page, name + '-mid');
  await page.mouse.up();
  await page.waitForTimeout(2200);
  await shot(page, name + '-after');
  const after = await task();
  console.log(name, 'after:', JSON.stringify(after));
  const tx = await text(page, 800);
  console.log(name, 'TXT:', JSON.stringify(tx));
  return after === null ? 'reload' : 'done';
}

for (let round = 0; round < 3; round++) {
  const t = await ready();
  console.log('round', round, 'task:', JSON.stringify(t));
  if (!t) continue;
  if (!t.props[0].placed) {
    const r1 = await liveDrag(async () => await labelPos('מזרחה'), '116-east-r'+round);
    if (r1 === 'reload') continue;
    const r2 = await liveDrag(async () => { const q = await task(); return q ? q.target : null; }, '117-north-r'+round);
    if (r2 === 'reload') continue;
  }
  break;
}
console.log('FINAL TXT:', JSON.stringify(await text(page, 900)));
await browser.close();
