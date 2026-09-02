import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
// scan: move in a spiral-ish pattern, logging nearFind
const dirs = [['a',1200],['w',1200],['d',2400],['s',2400],['a',3600],['w',3600]];
for (const [k, ms] of dirs) {
  await hold(page, [k], ms);
  const p = await pos2(page);
  console.log(k, JSON.stringify(p));
  if (p && p.nearFind) { await shot(page, '129-near-' + p.nearFind); }
}
await browser.close();
