import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { rotate, markerX } from './seek.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
// go to envoy
for (let i = 0; i < 25; i++) {
  const p = await pos2(page);
  if (!p || p.__err) { await ensureGame(page); continue; }
  if (p.nearWho === 'envoy') break;
  const m = await markerX(page, 'envoy');
  if (!m || (m.x === 0 && m.y === 0)) { await rotate(page, -250); continue; }
  if (m.x < 520 || m.x > 760) { await rotate(page, Math.max(-350, Math.min(350, (m.x - 640) * 0.5))); continue; }
  await hold(page, ['w'], 700);
}
console.log('AT:', JSON.stringify(await pos2(page)));
await page.keyboard.press('e');
await page.waitForTimeout(2000);
// advance with Space
for (let i = 0; i < 25; i++) {
  const t = await text(page, 1400);
  if (!t || typeof t !== 'string') { await ensureGame(page); break; }
  const dlg = t.lastIndexOf('שליח האימפריה\n');
  if (dlg < 0) { console.log('dialog closed at', i); break; }
  console.log('---', i, JSON.stringify(t.slice(dlg, dlg + 250)));
  if (t.includes('להמשך') || t.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(1400); continue; }
  if (t.includes('המשך ←')) { await page.getByText('המשך', {exact:false}).first().click().catch(()=>{}); await page.waitForTimeout(1400); continue; }
  // choices — screenshot and pick first
  await shot(page, '155-envoy-choices-' + i);
  const lines = t.slice(dlg).split('\n').map(s=>s.trim()).filter(s => s.length > 4 && s.length < 60);
  const q = lines.find(s => s.endsWith('?') && !s.startsWith('שליח'));
  if (q) { console.log('CHOICE:', JSON.stringify(q)); await page.getByText(q).first().click().catch(()=>{}); await page.waitForTimeout(1600); continue; }
  const done = lines.find(s => s.includes('מספיק') || s.includes('נמשיך') || s.includes('שלום'));
  if (done) { console.log('DONE-CHOICE:', JSON.stringify(done)); await page.getByText(done).first().click().catch(()=>{}); await page.waitForTimeout(1600); continue; }
  break;
}
console.log('FINAL:', JSON.stringify(await text(page, 600)));
await shot(page, '156-envoy-end');
await browser.close();
