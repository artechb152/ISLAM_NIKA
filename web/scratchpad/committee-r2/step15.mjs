import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame, walkUntil } from './lib4.mjs';
const { browser, page } = await getPage();

async function openMap() {
  for (let attempt = 0; attempt < 4; attempt++) {
    await ensureGame(page);
    const p0 = await pos2(page);
    if (p0 && p0.atTask) { /* already there */ }
    else {
      // walk north from spawn until atTask; if we're past it, walk south
      let p = await walkUntil(page, ['w'], 700, 6, q => !!q.atTask);
      if (!p || !p.atTask) p = await walkUntil(page, ['s'], 700, 6, q => !!q.atTask);
      if (!p || !p.atTask) continue;
    }
    await page.keyboard.press('e');
    await page.waitForTimeout(2000);
    const t = await safeEval(page, () => {
      const t = window.__ch1Task;
      return t ? JSON.parse(JSON.stringify(t)) : null;
    });
    if (t && t.props) return t;
  }
  return null;
}

async function drag(from, to, name) {
  await page.mouse.move(from.x, from.y);
  await page.waitForTimeout(400);
  await shot(page, name + '-hover');
  await page.mouse.down();
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps);
    await page.waitForTimeout(30);
  }
  await shot(page, name + '-mid');
  await page.mouse.up();
  await page.waitForTimeout(1800);
  await shot(page, name + '-after');
  console.log(name, 'TXT:', JSON.stringify(await text(page, 900)));
  const t = await safeEval(page, () => { const t = window.__ch1Task; return t ? JSON.parse(JSON.stringify(t)) : null; });
  console.log(name, 'TASK:', JSON.stringify(t));
  return t;
}

const t = await openMap();
console.log('TASK0:', JSON.stringify(t));
if (t) {
  const tok = t.props[0];
  await shot(page, '108-map-reopened');
  // wrong: drag east into the empty quarter (dotted east path area)
  const t2 = await drag({ x: tok.x, y: tok.y }, { x: tok.x + 90, y: tok.y - 40 }, '109-drag-east');
  // then correct: to target
  const tok2 = (t2 && t2.props) ? t2.props[0] : tok;
  await drag({ x: tok2.x, y: tok2.y }, { x: t.target.x, y: t.target.y }, '110-drag-north');
}
await browser.close();
