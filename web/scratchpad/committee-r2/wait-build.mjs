import { getPage, shot, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
for (let i = 0; i < 20; i++) {
  try { await page.reload({ waitUntil: 'domcontentloaded' }); } catch {}
  await page.waitForTimeout(9000);
  const txt = await safeEval(page, () => document.body.innerText.slice(0, 300));
  const ok = typeof txt === 'string' && (txt.includes('טרום האסלאם') || txt.includes('מחברת') || txt.includes('המשיכו'));
  console.log(i, ok ? 'OK' : 'not yet', JSON.stringify(String(txt||'').slice(0,80)));
  if (ok) break;
}
await shot(page, '68-build-wait');
console.log('TXT:', JSON.stringify(await safeEval(page, () => document.body.innerText.slice(0, 400))));
await browser.close();
