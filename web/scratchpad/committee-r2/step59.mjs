import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
for (let i = 0; i < 16; i++) {
  await hold(page, ['Shift','w'], 1400);
  const p = await pos2(page);
  const t = await text(page, 250);
  const ts = typeof t === 'string' ? t : '';
  console.log(i, JSON.stringify(p), JSON.stringify(ts.slice(0, 70)));
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (ts.includes('טוען')) { await page.waitForTimeout(7000); break; }
  if (ts.includes('המעבר הצר') && !ts.includes('הלאה אל')) break;
}
await page.waitForTimeout(2500);
console.log('ARRIVED:', JSON.stringify(await text(page, 900)));
await shot(page, '189-pass-arrival');
await browser.close();
