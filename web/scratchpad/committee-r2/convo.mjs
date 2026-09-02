// generic conversation player: press E/R, then advance lines, take screenshots at choices
import { getPage, shot, safeEval, text } from './lib2.mjs';
const { browser, page } = await getPage();
const startKey = process.argv[2] || 'e';
const shotBase = process.argv[3] || 'conv';
await page.keyboard.press(startKey);
await page.waitForTimeout(1800);
let sn = 0;
const speakers = ['שליח האימפריה','רָאוִי','ראש השבט','הנזיר','אנשי מכה','שומר'];
for (let i = 0; i < 40; i++) {
  const t = await text(page, 1800);
  if (!t || typeof t !== 'string') { console.log('reload'); break; }
  // find last speaker block
  let dlg = -1;
  for (const s of speakers) { const j = t.lastIndexOf(s + '\n\n'); if (j > dlg) dlg = j; }
  if (dlg < 0) { console.log('no dialog at', i); break; }
  const seg = t.slice(dlg);
  console.log('---', i, JSON.stringify(seg.split('\n\n').slice(0,2).join(' | ').slice(0, 180)));
  if (seg.includes('להמשך') || seg.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(1100); continue; }
  if (seg.includes('המשך ←')) { await page.getByText('המשך', {exact:false}).last().click().catch(()=>{}); await page.waitForTimeout(1100); continue; }
  // choices: lines after the speaker text
  const lines = seg.split('\n').map(s=>s.trim()).filter(s => s.length > 3 && s.length < 70);
  const qs = lines.filter(s => s.endsWith('?') && !speakers.some(sp=>s.includes(sp)));
  const done = lines.find(s => s.includes('מספיק') || s.includes('נמשיך') || s.includes('תודה') || s.includes('נלך') || s.includes('שנעבור'));
  if (qs.length) {
    await shot(page, shotBase + '-choice' + (sn++));
    console.log('CHOICE:', JSON.stringify(qs[0]));
    await page.getByText(qs[0]).first().click().catch(()=>{});
    await page.waitForTimeout(1600);
    continue;
  }
  if (done) { console.log('DONE:', JSON.stringify(done)); await shot(page, shotBase + '-done-choice'); await page.getByText(done).first().click().catch(()=>{}); await page.waitForTimeout(1600); continue; }
  console.log('no action at', i);
  break;
}
console.log('FINAL:', JSON.stringify(await text(page, 900)));
await shot(page, shotBase + '-end');
await browser.close();
