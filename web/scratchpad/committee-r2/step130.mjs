import { getPage, safeEval, text, shot, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=800) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
await B('הלאה').click().catch(()=>{});
await page.waitForTimeout(1500);
for (let i=0;i<6;i++){ const t = await T(500); if (t.includes('להמשך')||t.includes('להשלמת')) { await page.keyboard.press(' '); await page.waitForTimeout(900); } else if (t.includes('המשך ←')) { await B('המשך').click().catch(()=>{}); await page.waitForTimeout(900); } else break; }
console.log('STATE:', JSON.stringify(await T(600)));
// any video elements on page?
const vids = await safeEval(page, () => [...document.querySelectorAll('video')].map(v => ({ src: (v.currentSrc||v.src||'').slice(-60), paused: v.paused, muted: v.muted })));
console.log('VIDEOS:', JSON.stringify(vids));
await shot(page, '280-after-stones');
await browser.close();
