import { getPage, shot, safeEval, text } from './lib2.mjs';
const { browser, page } = await getPage();
let sn = 160;
for (let i = 0; i < 35; i++) {
  const t = await text(page, 1600);
  if (!t || typeof t !== 'string') break;
  if (!t.includes('להמשך') && !t.includes('להשלמת') && !t.includes('המשך ←')) {
    // maybe choices or closed
    const tail = t.slice(-450);
    console.log('*** state:', JSON.stringify(tail));
    await shot(page, String(sn++) + '-envoy-state');
    // find choice-looking lines near end
    const lines = tail.split('\n').map(s=>s.trim()).filter(s=>s.length>3 && s.length<70);
    const q = lines.find(s => s.endsWith('?') && !s.includes('עצור'));
    const done = lines.find(s => s.includes('מספיק') || s.includes('נמשיך') || s.includes('נלך') || s.includes('תודה'));
    if (q) { console.log('CHOICE:', JSON.stringify(q)); await page.getByText(q).first().click().catch(()=>{}); await page.waitForTimeout(1500); continue; }
    if (done) { console.log('DONE:', JSON.stringify(done)); await page.getByText(done).first().click().catch(()=>{}); await page.waitForTimeout(1500); continue; }
    console.log('closed/none at', i);
    break;
  }
  // log current speaker line
  const m = t.match(/(שליח האימפריה|רָאוִי)\n\n([^\n]+)/g);
  if (m) console.log('---', i, JSON.stringify(m[m.length-1].slice(0, 140)));
  if (t.includes('המשך ←')) { await page.getByText('המשך', {exact:false}).first().click().catch(()=>{}); await page.waitForTimeout(1100); }
  else { await page.keyboard.press(' '); await page.waitForTimeout(1100); }
}
console.log('FINAL:', JSON.stringify((await text(page, 700))));
await shot(page, '169-envoy-conv-end');
await browser.close();
