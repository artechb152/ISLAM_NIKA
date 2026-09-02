import { getPage, safeEval, text, shot } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
const T = async (n=600) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
const before = await safeEval(page, () => localStorage.getItem('ch1:notebook:v1'));
console.log('P before:', JSON.stringify(await pos2(page)));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(11000);
let t = await T(400);
if (t.includes('המשיכו במסע')) { await page.getByText('המשיכו במסע').click().catch(()=>{}); await page.waitForTimeout(13000); }
console.log('AFTER F5 TXT:', JSON.stringify(await T(700)));
console.log('P after:', JSON.stringify(await pos2(page)));
const after = await safeEval(page, () => localStorage.getItem('ch1:notebook:v1'));
console.log('NB same:', before === after);
await shot(page, '254-after-f5');
await browser.close();
