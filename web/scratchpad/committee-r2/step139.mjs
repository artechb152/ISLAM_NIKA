import { getPage, safeEval, text, shot } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=800) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
// snapshot state, then unsee abraha-story to retrigger
const backup = await safeEval(page, () => localStorage.getItem('ch1:notebook:v1'));
await safeEval(page, () => {
  const nb = JSON.parse(localStorage.getItem('ch1:notebook:v1'));
  nb.seen = nb.seen.filter(s => s !== 'abraha-story');
  localStorage.setItem('ch1:notebook:v1', JSON.stringify(nb));
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(11000);
let t = await T(400);
if (t.includes('המשיכו במסע')) { await page.getByText('המשיכו במסע').click().catch(()=>{}); await page.waitForTimeout(13000); }
// press R to retrigger the story+film
await page.keyboard.press('r'); await page.waitForTimeout(1700);
for (let i = 0; i < 20; i++) {
  const v = await safeEval(page, () => { const vv = document.querySelector('video'); return vv ? { t: +vv.currentTime.toFixed(1), paused: vv.paused } : null; });
  if (v && !v.paused && v.t > 1) {
    console.log('film playing at', v.t, '- pressing Escape');
    await shot(page, '292-film-mid');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
    const v2 = await safeEval(page, () => { const vv = document.querySelector('video'); return vv ? { t: +vv.currentTime.toFixed(1), paused: vv.paused, ended: vv.ended } : null; });
    console.log('after Escape:', JSON.stringify(v2));
    console.log('TXT:', JSON.stringify(await T(600)));
    await shot(page, '293-film-escape');
    break;
  }
  const t2 = await T(700);
  if (t2.includes('להמשך') || t2.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(900); continue; }
  if (t2.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(900); continue; }
  await page.waitForTimeout(700);
}
// restore backup seen? leave as-is; the beat may need completing again — drain
for (let i = 0; i < 12; i++) {
  const t3 = await T(700);
  if (t3.includes('להמשך') || t3.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(900); continue; }
  if (t3.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(900); continue; }
  break;
}
console.log('FINAL:', JSON.stringify(await T(500)));
await browser.close();
