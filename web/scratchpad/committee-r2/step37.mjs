import { getPage, shot, safeEval, text } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
async function adv() { // advance line: click המשך or complete
  const t = await text(page, 1200);
  if (!t || typeof t !== 'string') { await ensureGame(page); return 'reload'; }
  if (t.includes('המשך')) { await page.getByText('המשך', {exact:false}).first().click().catch(()=>{}); await page.waitForTimeout(1600); return 'adv'; }
  if (t.includes('לחצו להשלמת השורה')) { await page.mouse.click(640, 540); await page.waitForTimeout(1400); return 'complete'; }
  return 'none';
}
await page.keyboard.press('r');
await page.waitForTimeout(2000);
for (let i = 0; i < 16; i++) {
  const t = await text(page, 1300);
  if (!t || typeof t !== 'string') { await ensureGame(page); await page.keyboard.press('r'); await page.waitForTimeout(1500); continue; }
  const dlgIdx = t.lastIndexOf('רָאוִי\n');
  console.log('---', i, JSON.stringify(t.slice(dlgIdx, dlgIdx + 260)));
  if (t.includes('מה זה ג׳אהליה?')) {
    await shot(page, '142-choices');
    await page.getByText('מה זה ג׳אהליה?').click().catch(()=>{});
    await page.waitForTimeout(2000);
    await shot(page, '143-jahiliya-answer');
    continue;
  }
  if (t.includes('אז איך יודעים')) {
    await page.getByText('אז איך יודעים').click().catch(()=>{});
    await page.waitForTimeout(2000);
    await shot(page, '144-howknow-answer');
    continue;
  }
  if (t.includes('מספיק לי')) { await page.getByText('מספיק לי').click().catch(()=>{}); await page.waitForTimeout(1800); continue; }
  const r = await adv();
  if (r === 'none') {
    // dialog closed?
    if (!t.slice(dlgIdx).includes('לחצו') && !t.includes('המשך')) break;
  }
}
console.log('FINAL:', JSON.stringify(await text(page, 800)));
await shot(page, '145-rawi-done2');
await browser.close();
