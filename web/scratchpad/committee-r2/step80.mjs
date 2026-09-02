import { getPage, shot, safeEval, text } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
import fs from 'fs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=400) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
// dialog first
for (const q of ['מה זה ג׳אהליה?','אז איך יודעים מה באמת קרה?']) {
  await B(q).click().catch(()=>{});
  await page.waitForTimeout(1800);
  await page.keyboard.press(' '); await page.waitForTimeout(1100);
  await page.keyboard.press(' '); await page.waitForTimeout(1100);
}
for (let i=0;i<4;i++){ const t = await T(600); if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(1000); } else if (t.includes('להמשך')||t.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(900); } }
// route
await B('צפונה — בדרך הבשמים').click().catch(()=>{});
await page.waitForTimeout(2200);
console.log('after north:', JSON.stringify(await T(900)));
await B('הלאה').click().catch(()=>{});
await page.waitForTimeout(1600);
// wrap-up rawi line may play
for (let i=0;i<6;i++){ const t = await T(600); if (t.includes('להמשך')||t.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(900); } else if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(900); } else break; }
console.log('STATE:', JSON.stringify(await T(500)));
const ls = await safeEval(page, () => { const o={}; for (let i=0;i<localStorage.length;i++){const k=localStorage.key(i); o[k]=localStorage.getItem(k);} return o; });
if (ls && !ls.__err) fs.writeFileSync('C:/Users/nikag/ISLAM_NIKA/web/scratchpad/committee-r2/ls-camp-done.json', JSON.stringify(ls));
console.log('LS:', JSON.stringify(ls && ls['ch1:notebook:v1']));
await browser.close();
