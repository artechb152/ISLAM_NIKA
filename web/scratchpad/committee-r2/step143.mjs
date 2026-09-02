import { getPage, safeEval, text, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind } from './seek.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=1400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
const keys = await safeEval(page, () => {
  const l = window.__ch1Live; if (!l || !l.markerEls) return null;
  return l.markerEls instanceof Map ? [...l.markerEls.keys()] : Object.keys(l.markerEls);
});
console.log('KEYS:', JSON.stringify(keys));
const fk = (keys||[]).find(k=>k.startsWith('find:'));
if (fk) {
  const clean = fk.replace('find:find-','');
  const p = await seekFind(page, clean, 26);
  console.log('AT:', JSON.stringify(p));
  if (p && p.nearFind) {
    await page.keyboard.press('f'); await page.waitForTimeout(2100);
    const t = await T(1500); const j = t.lastIndexOf('נמצא');
    console.log('CARD:', JSON.stringify(j>=0 ? t.slice(j, j+320) : '?'));
    await shot(page, '301-overlook-stone');
    await B('המשיכו').click().catch(()=>{});
    await page.waitForTimeout(900);
  }
}
// R talk
await page.keyboard.press('r'); await page.waitForTimeout(1600);
for (let i = 0; i < 35; i++) {
  const t = await T(1800);
  if (t.includes('להמשך') || t.includes('להשלמת')) {
    const m = t.match(/(קריין|רָאוִי)\n\n([^\n]+)/g);
    if (m) console.log('---', JSON.stringify(m[m.length-1].slice(0,150)));
    await page.keyboard.press(' '); await page.waitForTimeout(1050); continue;
  }
  if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(1050); continue; }
  const btns = await safeEval(page, () => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(s => s && !['מחברת המסע','H מקשים'].includes(s)));
  if ((btns||[]).length) { console.log('BTNS:', JSON.stringify(btns)); await shot(page, '302-finale-btns'); }
  break;
}
console.log('STATE:', JSON.stringify(await T(900)));
await shot(page, '303-finale-late');
await browser.close();
