import { getPage, safeEval, text, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { goto } from './nav.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=500) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
await B('הלאה').click().catch(()=>{});
await page.waitForTimeout(1400);
for (let i=0;i<5;i++){ const t = await T(400); if (t.includes('להמשך')||t.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(900); } else if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(900); } else break; }
// walk north seeking Mecca transition
for (const z of [-8,-16,-24,-32,-40,-48]) {
  let p = await goto(page, 0, z, { run: true, maxIter: 10, tol: 2.5, log: false });
  let t = await T(300);
  const m = t.match(/(\d+) מ׳/);
  console.log('z', z, '->', p ? [p.x, p.z] : null, m ? m[1]+'m' : '-');
  if (t.includes('טוען')) { await page.waitForTimeout(9000); t = await T(300); }
  if (t.includes('מכה') && !t.includes('הלאה אל מכה')) { console.log('AT MECCA'); break; }
}
await page.waitForTimeout(1500);
console.log('FINAL:', JSON.stringify(await T(800)));
await shot(page, '266-to-mecca');
await browser.close();
