import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
await page.getByText('הלאה').first().click().catch(()=>{});
await page.waitForTimeout(2000);
await shot(page, '186-after-verdict');
console.log('TXT:', JSON.stringify(await text(page, 700)));
// head north through the gate
for (let i = 0; i < 18; i++) {
  await hold(page, ['Shift','w'], 1400);
  const p = await pos2(page);
  const t = await text(page, 300);
  console.log(i, JSON.stringify(p), JSON.stringify((typeof t==='string'?t:'').slice(0, 90)));
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (typeof t === 'string' && t.includes('טוען')) { console.log('LOADING...'); await page.waitForTimeout(6000); break; }
}
await page.waitForTimeout(3000);
console.log('ARRIVED:', JSON.stringify(await text(page, 800)));
await shot(page, '187-pass-arrival');
await browser.close();
