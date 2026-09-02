import { getPage, safeEval, text, shot } from './lib2.mjs';
const { browser, page } = await getPage();
const T = async (n=700) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await safeEval(page, () => {
  localStorage.setItem('ch1:arrived:mecca:v1', '1');
  const nb = JSON.parse(localStorage.getItem('ch1:notebook:v1'));
  nb.region = 'mecca';
  localStorage.setItem('ch1:notebook:v1', JSON.stringify(nb));
});
await page.goto('http://localhost:3000/chapter1?region=mecca', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(12000);
let t = await T(400);
if (t.includes('המשיכו במסע')) { await page.getByText('המשיכו במסע').click().catch(()=>{}); await page.waitForTimeout(14000); }
console.log('TXT:', JSON.stringify(await T(1100)));
await shot(page, '269-mecca-arrival');
await browser.close();
