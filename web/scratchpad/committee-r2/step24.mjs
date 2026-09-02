import { getPage, shot, safeEval, text } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame, walkUntil } from './lib4.mjs';
const { browser, page } = await getPage();
const task = () => safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
const eastPos = () => safeEval(page, () => {
  const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.textContent||'').includes('מזרחה'));
  const vis = els.map(e => { const r = e.getBoundingClientRect(); return { x: r.x+r.width/2, y: r.y+r.height/2, w: r.width }; })
    .filter(o => o.w > 10 && o.x > -100 && o.x < 1380 && o.y > 0 && o.y < 720);
  return vis.length ? vis[0] : null;
});

for (let round = 0; round < 4; round++) {
  await ensureGame(page);
  let p = await pos2(page);
  if (!p || !p.atTask) {
    p = await walkUntil(page, ['w'], 700, 8, q => !!q.atTask);
    if (!p || !p.atTask) p = await walkUntil(page, ['s'], 700, 8, q => !!q.atTask);
  }
  if (!p || !p.atTask) { console.log('round', round, 'cannot reach task'); continue; }
  let t = await task();
  if (!t) {
    await page.keyboard.press('e'); await page.waitForTimeout(1600);
    await page.getByText('אחר כך').click().catch(()=>{}); await page.waitForTimeout(1000);
    t = await task();
  }
  if (!t || t.props[0].placed) { console.log('round', round, 'task state:', JSON.stringify(t)); continue; }
  const tok = t.props[0];
  await page.mouse.move(tok.x, tok.y);
  await page.waitForTimeout(250);
  await page.mouse.down();
  await page.waitForTimeout(120);
  t = await task();
  if (!t) { await page.mouse.up().catch(()=>{}); continue; }
  console.log('round', round, 'dragging:', t.dragging);
  let ok = true;
  const t0 = Date.now();
  while (Date.now() - t0 < 5000) {
    const cur = await task();
    const dest = await eastPos();
    if (!cur) { ok = false; break; }
    if (!dest) { // fall back: 150px right & slightly up from current
      const c = cur.props[0];
      await page.mouse.move(c.x + 40, c.y - 10);
      await page.waitForTimeout(35);
      continue;
    }
    const c = cur.props[0];
    const d = Math.hypot(dest.x - c.x, dest.y - c.y);
    if (d < 12) break;
    const step = Math.min(45, d);
    await page.mouse.move(c.x + (dest.x-c.x)/d*step, c.y + (dest.y-c.y)/d*step);
    await page.waitForTimeout(35);
  }
  if (!ok) { await page.mouse.up().catch(()=>{}); continue; }
  await shot(page, '122-east-drop-mid');
  await page.mouse.up();
  await page.waitForTimeout(2200);
  await shot(page, '123-east-drop-after');
  const after = await task();
  console.log('AFTER:', JSON.stringify(after));
  console.log('TXT:', JSON.stringify(await text(page, 1000)));
  if (after !== null) break;
}
await browser.close();
