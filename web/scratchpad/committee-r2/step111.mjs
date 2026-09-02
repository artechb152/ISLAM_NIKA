import { getPage, safeEval, text, shot } from './lib2.mjs';
const { browser, page } = await getPage();
const T = async (n=600) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await safeEval(page, () => {
  localStorage.setItem('ch1:arrived:yathrib:v1', '1');
  localStorage.setItem('ch1:arrived:monastery:v1', '1');
  const nb = JSON.parse(localStorage.getItem('ch1:notebook:v1'));
  nb.region = 'monastery';
  localStorage.setItem('ch1:notebook:v1', JSON.stringify(nb));
});
await page.goto('http://localhost:3000/chapter1?region=monastery', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(12000);
let t = await T(400);
if (t.includes('המשיכו במסע')) { await page.getByText('המשיכו במסע').click().catch(()=>{}); await page.waitForTimeout(13000); }
console.log('TXT:', JSON.stringify(await T(900)));
await shot(page, '248-monastery-tp');
await browser.close();
