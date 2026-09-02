import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
const T = async (n=300) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (let i = 0; i < 22; i++) {
  await hold(page, ['Shift','w'], 1300);
  const p = await pos2(page);
  const t = await T(200);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (t.includes('טוען')) { await page.waitForTimeout(8000); }
  if (t.includes('תחנת הגבול') && !t.includes('הלאה אל תחנת הגבול')) { console.log('AT STATION'); break; }
  if (i % 4 === 3) console.log(i, JSON.stringify(p));
}
console.log('TXT:', JSON.stringify(await T(400)));
await browser.close();
