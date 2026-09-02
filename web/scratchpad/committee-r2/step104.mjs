import { getPage, safeEval, text, shot } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=800) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
const pairs = [
  ['התמרים שהשכן קונה כל בוקר', 'המעגל המשותף — בין הבתים'],
  ['השירה שנשמעת משתי החצרות', 'המעגל המשותף — בין הבתים'],
  ['הריב שנשפט אצל כל אחד לפי מנהגו', 'בבית פנימה'],
  ['הדת עצמה', 'בבית פנימה'],
  ['הציפייה למשיח', 'המעגל המשותף — בין הבתים'],
];
for (const [item, side] of pairs) {
  await B(item).click().catch(e=>console.log('itemErr', item));
  await page.waitForTimeout(700);
  await B(side).click().catch(e=>console.log('sideErr', side));
  await page.waitForTimeout(1600);
  const t = await T(1800);
  const m = t.match(/\n\n(לא\.|נכון|כן|יפה|בדיוק)[^\n]*/);
  const cnt = t.match(/(\d) מתוך 5/);
  console.log(JSON.stringify(item.slice(0,20)), '->', cnt ? cnt[1]+'/5' : '?', m ? JSON.stringify(m[0].trim().slice(0,110)) : '');
}
await shot(page, '239-table-solved');
console.log('FINAL:', JSON.stringify((await T(2000)).slice(-600)));
await browser.close();
