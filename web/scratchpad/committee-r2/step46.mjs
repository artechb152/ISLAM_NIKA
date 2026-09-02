import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
// dash north to envoy (z ~ -2)
for (let i = 0; i < 10; i++) {
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.nearWho === 'envoy') break;
  if (p.z > -1) await hold(page, ['Shift','w'], Math.min(2000, Math.max(400, (p.z + 2) * 180)));
  else break;
}
const p = await pos2(page);
console.log('AT:', JSON.stringify(p));
if (p && p.nearWho === 'envoy') {
  await page.keyboard.press('e');
  await page.waitForTimeout(1500);
  for (let i = 0; i < 30; i++) {
    const t = await text(page, 1500);
    if (!t || typeof t !== 'string') break;
    const dlg = t.lastIndexOf('שליח האימפריה\n\n');
    if (dlg < 0) { console.log('closed at', i); break; }
    const seg = t.slice(dlg + 15, dlg + 300);
    console.log('---', i, JSON.stringify(seg.split('\n')[0]));
    if (t.includes('להמשך') || t.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(1100); continue; }
    if (t.includes('המשך ←')) { await page.getByText('המשך', {exact:false}).first().click().catch(()=>{}); await page.waitForTimeout(1100); continue; }
    // choices
    await shot(page, '157-envoy-choice-' + i);
    const after = t.slice(dlg).split('\n').map(s=>s.trim()).filter(Boolean);
    const q = after.find(s => (s.endsWith('?') || s.includes('מספיק') || s.includes('נלך')) && s !== after[1]);
    if (q) { console.log('CHOICE:', JSON.stringify(q)); await page.getByText(q).first().click().catch(()=>{}); await page.waitForTimeout(1400); continue; }
    break;
  }
  await shot(page, '158-envoy-final');
  console.log('FINAL:', JSON.stringify(await text(page, 700)));
}
await browser.close();
