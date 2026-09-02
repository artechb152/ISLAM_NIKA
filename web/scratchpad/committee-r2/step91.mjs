import { getPage, safeEval, text, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
const spots = [[8,8],[-8,8],[10,-2],[-10,-2],[0,14],[6,-8],[-6,-8]];
for (const [x,z] of spots) {
  const p = await goto(page, x, z, { maxIter: 10, tol: 2, log: false });
  console.log('spot', x, z, '->', JSON.stringify(p));
  if (p && p.nearFind && p.nearFind.includes('sherd')) {
    await page.keyboard.press('f'); await page.waitForTimeout(2100);
    await shot(page, '222-roadsherd-card');
    const t = await T(1100); const j = t.lastIndexOf('נמצא');
    console.log('CARD:', JSON.stringify(j>=0 ? t.slice(j, j+300) : '?'));
    await B('המשיכו').click().catch(()=>{});
    break;
  }
}
await browser.close();
