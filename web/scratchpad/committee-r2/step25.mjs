import { getPage, shot, safeEval, text } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame, walkUntil } from './lib4.mjs';
const { browser, page } = await getPage();
const task = () => safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);

for (let round = 0; round < 4; round++) {
  await ensureGame(page);
  let t = await task();
  if (!t) {
    let p = await pos2(page);
    if (!p || !p.atTask) {
      p = await walkUntil(page, ['w'], 700, 8, q => !!q.atTask);
      if (!p || !p.atTask) p = await walkUntil(page, ['s'], 700, 8, q => !!q.atTask);
    }
    if (!p || !p.atTask) continue;
    t = await task();
    if (!t) {
      await page.keyboard.press('e'); await page.waitForTimeout(1600);
      await page.getByText('אחר כך').click().catch(()=>{}); await page.waitForTimeout(1000);
      t = await task();
    }
  } else if (!t.props[0].placed) {
    // panel may be open with refusal; close it
    await page.getByText('אחר כך').click().catch(()=>{});
    await page.waitForTimeout(800);
  }
  if (!t) continue;
  if (t.props[0].placed) break;
  const tok = (await task()).props[0];
  await page.mouse.move(tok.x, tok.y);
  await page.waitForTimeout(250);
  await page.mouse.down();
  await page.waitForTimeout(120);
  let ok = true;
  const t0 = Date.now();
  while (Date.now() - t0 < 5000) {
    const cur = await task();
    if (!cur) { ok = false; break; }
    const dest = cur.target;
    const c = cur.props[0];
    const d = Math.hypot(dest.x - c.x, dest.y - c.y);
    if (d < 8) break;
    const step = Math.min(45, d);
    await page.mouse.move(c.x + (dest.x-c.x)/d*step, c.y + (dest.y-c.y)/d*step);
    await page.waitForTimeout(35);
  }
  if (!ok) { await page.mouse.up().catch(()=>{}); continue; }
  await page.mouse.up();
  await page.waitForTimeout(2000);
  const after = await task();
  console.log('after:', JSON.stringify(after));
  if (after && after.props[0].placed) {
    await shot(page, '124-north-success');
    // click הלאה
    await page.getByText('הלאה').click().catch(e => console.log('halaErr'));
    await page.waitForTimeout(2500);
    await shot(page, '125-departure1');
    console.log('TXT:', JSON.stringify(await text(page, 900)));
    // complete rawi line
    await page.mouse.click(640, 570);
    await page.waitForTimeout(2000);
    await shot(page, '126-departure2');
    console.log('TXT2:', JSON.stringify(await text(page, 900)));
    break;
  }
}
await browser.close();
