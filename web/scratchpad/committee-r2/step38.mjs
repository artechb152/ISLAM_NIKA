import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
for (let i = 0; i < 20; i++) {
  await hold(page, ['Shift','w'], 1500);
  const p = await pos2(page);
  const t = await text(page, 400);
  console.log(i, JSON.stringify(p), JSON.stringify((typeof t==='string'?t:'').slice(0, 120)));
  if (typeof t === 'string' && (t.includes('הלאה אל') || t.includes('תחנת הגבול'))) {
    await shot(page, '146-transition-title');
  }
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.z < -30) break;
  if (i === 10) await shot(page, '147-mid-north');
}
await shot(page, '148-north-end');
console.log('FINAL TXT:', JSON.stringify(await text(page, 500)));
await browser.close();
