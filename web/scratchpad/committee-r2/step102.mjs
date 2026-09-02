import { getPage, safeEval, text, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=600) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (let round = 0; round < 4; round++) {
  // drain current dialog
  for (let i = 0; i < 25; i++) {
    const t = await T(1600);
    if (t.includes('להמשך') || t.includes('להשלמת')) {
      const m = t.match(/(הסוחר היהודי|רָאוִי)\n\n([^\n]+)/g);
      if (m) console.log('---', JSON.stringify(m[m.length-1].slice(0,140)));
      await page.keyboard.press(' '); await page.waitForTimeout(1000); continue;
    }
    if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(1000); continue; }
    break;
  }
  // check state
  const t2 = await T(600);
  if (t2.includes('דברו עם הסוחר') || t2.includes('שיחה עם הסוחר היהודי\nE')) { await page.keyboard.press('e'); await page.waitForTimeout(1500); continue; }
  const task = await safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
  console.log('round', round, 'task:', JSON.stringify(task));
  if (!task) {
    await page.keyboard.press('e'); await page.waitForTimeout(1800);
    const t3 = await T(1500);
    const task2 = await safeEval(page, () => window.__ch1Task ? JSON.parse(JSON.stringify(window.__ch1Task)) : null);
    if (task2 || t3.includes('מפת השכנוּת\n')) { console.log('TABLE OPEN:', JSON.stringify(t3.slice(-500))); await shot(page, '236-table-panel'); break; }
  } else { await shot(page, '236-table-panel'); break; }
}
await browser.close();
