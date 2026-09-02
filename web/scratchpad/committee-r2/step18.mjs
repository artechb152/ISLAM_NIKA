import { getPage, shot, safeEval, text } from './lib2.mjs';
const { browser, page } = await getPage();

const task = () => safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
const labelPos = (s) => safeEval(page, (s) => {
  const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.includes(s));
  if (!els.length) return null;
  const r = els[0].getBoundingClientRect();
  return { x: r.x + r.width/2, y: r.y + r.height/2 };
}, s);

async function liveDrag(destFn, name, maxMs = 6000) {
  let t = await task();
  if (!t) { console.log(name, 'no task'); return; }
  const tok = t.props[0];
  await page.mouse.move(tok.x, tok.y);
  await page.waitForTimeout(300);
  await shot(page, name + '-hover');
  await page.mouse.down();
  await page.waitForTimeout(150);
  t = await task();
  console.log(name, 'dragging after down:', t ? t.dragging : '?');
  const t0 = Date.now();
  let took = false;
  while (Date.now() - t0 < maxMs) {
    const cur = await task();
    const dest = await destFn();
    if (!cur || !dest) break;
    const c = cur.props[0];
    const dx = dest.x - c.x, dy = dest.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 12) { took = true; break; }
    const step = Math.min(40, d);
    await page.mouse.move(c.x + dx/d*step, c.y + dy/d*step);
    await page.waitForTimeout(40);
  }
  await shot(page, name + '-mid');
  await page.mouse.up();
  await page.waitForTimeout(2000);
  await shot(page, name + '-after');
  const after = await task();
  console.log(name, 'reached:', took, 'after:', JSON.stringify(after));
  console.log(name, 'TXT:', JSON.stringify(await text(page, 800)));
}

// 1) wrong: drag to east label
await liveDrag(async () => await labelPos('מזרחה'), '114-east');
// 2) correct: drag to target
await liveDrag(async () => { const t = await task(); return t ? t.target : null; }, '115-north');
await browser.close();
