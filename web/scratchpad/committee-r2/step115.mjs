import { getPage, safeEval, text, shot, hold } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind } from './seek.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=900) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
const keys = await safeEval(page, () => {
  const l = window.__ch1Live; if (!l || !l.markerEls) return null;
  return (l.markerEls instanceof Map ? [...l.markerEls.keys()] : Object.keys(l.markerEls)).filter(k => k.startsWith('find:'));
});
console.log('FINDS:', JSON.stringify(keys));
let sn = 255;
for (const k of keys || []) {
  const clean = k.replace('find:find-','');
  const p = await seekFind(page, clean, 25);
  if (p && p.nearFind) {
    await page.keyboard.press('f'); await page.waitForTimeout(2000);
    const t = await T(1300); const j = t.lastIndexOf('נמצא');
    console.log(clean, ':', JSON.stringify(j>=0 ? t.slice(j, j+280) : '?'));
    await shot(page, String(sn++) + '-' + clean);
    await B('המשיכו').click().catch(()=>{});
    await page.waitForTimeout(800);
  } else {
    console.log('MISS', clean, JSON.stringify(p));
    await hold(page, ['s'], 800);
  }
}
const nb = await safeEval(page, () => JSON.parse(localStorage.getItem('ch1:notebook:v1')));
console.log('found:', nb.found.length, 'entries:', nb.entries.length);
await browser.close();
