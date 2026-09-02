import { getPage, shot, safeEval, text } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
await page.mouse.click(640, 570); // dismiss the "רגע" line
await page.waitForTimeout(1200);
await page.keyboard.press('r');
await page.waitForTimeout(2000);
let clicks = 0;
for (let i = 0; i < 14; i++) {
  const t = await text(page, 1100);
  if (!t || typeof t !== 'string') { await ensureGame(page); continue; }
  const seg = t.slice(t.indexOf('רָאוִי'));
  console.log('---', i, JSON.stringify(seg.slice(0, 300)));
  if (t.includes('ג׳אהליה?')) {
    await shot(page, '142-choices');
    await page.getByText('מה זה ג׳אהליה?').click().catch(()=>{});
    await page.waitForTimeout(2200);
    await shot(page, '143-jahiliya-answer');
    continue;
  }
  if (t.includes('אז איך יודעים')) {
    await page.getByText('אז איך יודעים').click().catch(()=>{});
    await page.waitForTimeout(2200);
    await shot(page, '144-howknow-answer');
    continue;
  }
  if (t.includes('מספיק לי')) {
    await page.getByText('מספיק לי').click().catch(()=>{});
    await page.waitForTimeout(2000);
    continue;
  }
  if (t.includes('לחצו להשלמת השורה') || t.includes('המשך')) {
    await page.mouse.click(640, 600);
    await page.waitForTimeout(1800);
    clicks++;
    continue;
  }
  if (!t.includes('רָאוִי\n')) break;
}
console.log('FINAL:', JSON.stringify(await text(page, 700)));
await shot(page, '145-rawi-done');
await browser.close();
