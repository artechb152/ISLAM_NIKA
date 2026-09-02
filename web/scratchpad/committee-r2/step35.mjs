import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
for (let i = 0; i < 14; i++) {
  await hold(page, ['Shift','w'], 1500);
  const p = await pos2(page);
  console.log(i, JSON.stringify(p));
  const t = await text(page, 300);
  if (t && (t.includes('הלאה') || t.includes('גבול') || t.includes('תחנת'))) { console.log('TRANSITION TEXT:', JSON.stringify(t)); break; }
  if (p && p.z < -22) break;
}
await shot(page, '141-north-again');
console.log('TXT:', JSON.stringify(await text(page, 500)));
await browser.close();
