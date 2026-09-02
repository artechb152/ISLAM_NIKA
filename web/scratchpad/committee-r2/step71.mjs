import { getPage, shot, safeEval, text } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind } from './seek.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
const keys = await safeEval(page, () => {
  const l = window.__ch1Live; if (!l || !l.markerEls) return null;
  return l.markerEls instanceof Map ? [...l.markerEls.keys()] : Object.keys(l.markerEls);
});
console.log('KEYS:', JSON.stringify(keys));
for (const [key, name] of [[keys.find(k=>k.includes('incense')||k.includes('frank'))||'find', '210-roadfrank'], [keys.find(k=>k.includes('sherd')||k.includes('pottery'))||'find2', '212-roadsherd']]) {
  const clean = key.replace('find:find-','');
  const p = await seekFind(page, clean, 30);
  console.log(clean, 'AT:', JSON.stringify(p));
  if (p && p.nearFind) {
    await shot(page, name + '-near');
    await page.keyboard.press('f');
    await page.waitForTimeout(2300);
    await shot(page, name + '-card');
    const t = await text(page, 1100);
    const j = typeof t === 'string' ? t.lastIndexOf('נמצא') : -1;
    console.log(clean, 'CARD:', JSON.stringify(j>=0 ? t.slice(j, j+300) : t));
    await page.getByText('המשיכו').click().catch(()=>{});
    await page.waitForTimeout(900);
  }
}
await browser.close();
