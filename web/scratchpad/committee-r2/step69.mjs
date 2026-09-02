import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
import { rotate, markerX } from './seek.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
await page.locator('button', { hasText: 'הלאה' }).last().click().catch(()=>{});
await page.waitForTimeout(1500);
console.log('TXT:', JSON.stringify(await text(page, 400)));
// aim at __gate marker and walk until transition
for (let i = 0; i < 30; i++) {
  const p = await pos2(page);
  const t = await text(page, 250); const ts = typeof t === 'string' ? t : '';
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (ts.includes('טוען')) { console.log('LOADING'); await page.waitForTimeout(7000); break; }
  if (!ts.includes('המעבר הצר') && ts.includes('מחברת')) { console.log('NEW REGION'); break; }
  const m = await markerX(page, '__gate');
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
  if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['Shift','w'], 900);
  if (i % 5 === 4) console.log(i, JSON.stringify(await pos2(page)));
}
await page.waitForTimeout(2500);
console.log('ARRIVED:', JSON.stringify(await text(page, 900)));
await shot(page, '208-caravan-road-arrival');
await browser.close();
