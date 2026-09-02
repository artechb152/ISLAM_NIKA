import { getPage, safeEval, text, shot } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=1200) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
// wrong first
await B('שורשי האמונה הנוצרית עצמה').click().catch(()=>{});
await page.waitForTimeout(700);
await B('הלך איתם למכה').click().catch(()=>{});
await page.waitForTimeout(1700);
const tw = await T(2000);
const mw = tw.match(/\n\n(לא[^\n]*)/);
console.log('WRONG:', mw ? JSON.stringify(mw[1].slice(0,130)) : JSON.stringify(tw.slice(-200)));
await shot(page, '264-altar-wrong');
const pairs = [
  ['צניעות ופרישות','הלך איתם למכה'],
  ['דאגה לנזקקים וליתומים','הלך איתם למכה'],
  ['התבודדות וכתיבת שירה','הלך איתם למכה'],
  ['מנהגים פולחניים','הלך איתם למכה'],
  ['שורשי האמונה הנוצרית עצמה','נשאר כאן'],
];
for (const [item, side] of pairs) {
  await B(item).click().catch(()=>{});
  await page.waitForTimeout(600);
  await B(side).click().catch(()=>{});
  await page.waitForTimeout(1500);
  const t = await T(2000);
  const cnt = t.match(/(\d) מתוך 5/);
  console.log(JSON.stringify(item.slice(0,18)), '->', cnt ? cnt[1]+'/5' : 'done?');
}
await shot(page, '265-altar-solved');
console.log('FINAL:', JSON.stringify((await T(2400)).slice(-550)));
await browser.close();
