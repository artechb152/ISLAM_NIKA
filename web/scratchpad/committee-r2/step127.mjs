import { getPage, safeEval, text, shot, hold } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind } from './seek.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=1200) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
let sn = 272;
for (const clean of ['divination','ansab','mecca-coin']) {
  const p = await seekFind(page, clean, 26);
  if (p && p.nearFind) {
    await page.keyboard.press('f'); await page.waitForTimeout(2000);
    const t = await T(1400); const j = t.lastIndexOf('נמצא');
    console.log(clean, ':', JSON.stringify(j>=0 ? t.slice(j, j+300) : '?'));
    await shot(page, String(sn++) + '-' + clean);
    await B('המשיכו').click().catch(()=>{});
    await page.waitForTimeout(800);
  } else { console.log('MISS', clean, JSON.stringify(p)); await hold(page, ['s'], 900); }
}
await browser.close();
