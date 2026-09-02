import { getPage, shot, safeEval, text } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
let shotN = 155;
for (let i = 0; i < 20; i++) {
  const t = await text(page, 1400);
  if (!t || typeof t !== 'string') { await ensureGame(page); continue; }
  const dlg = t.lastIndexOf('שליח האימפריה\n');
  const seg = dlg >= 0 ? t.slice(dlg, dlg + 330) : '(no dlg)';
  console.log('---', i, JSON.stringify(seg));
  if (dlg < 0) break;
  // choices?
  const choiceBlock = t.split('\n').filter(s => s.endsWith('?') && !s.includes('שליח') || s.includes('מספיק') || s.startsWith('ומה '));
  if (t.includes('להמשך') || t.includes('להשלמת')) { await page.mouse.click(640, 500); await page.waitForTimeout(1500); continue; }
  if (t.includes('המשך')) { await page.getByText('המשך', {exact:false}).first().click().catch(()=>{}); await page.waitForTimeout(1500); continue; }
  // pick first question-like choice
  const q = choiceBlock.find(s => s.length > 5 && s.length < 60);
  if (q) {
    console.log('CHOICE:', JSON.stringify(q));
    await shot(page, String(shotN++) + '-envoy');
    await page.getByText(q).first().click().catch(()=>{});
    await page.waitForTimeout(1800);
    continue;
  }
  break;
}
console.log('FINAL:', JSON.stringify(await text(page, 800)));
await shot(page, '159-envoy-done');
await browser.close();
