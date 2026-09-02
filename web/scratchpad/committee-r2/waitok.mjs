import { getPage, safeEval, text } from './lib2.mjs';
const { browser, page } = await getPage();
for (let i = 0; i < 20; i++) {
  const t = await text(page, 300);
  const bad = !t || typeof t !== 'string' || t.includes('Build Error') || t.includes('1 Issue');
  if (!bad && (t.includes('מחנה') || t.includes('המשיכו במסע') || t.includes('מחברת'))) { console.log('OK at', i, JSON.stringify(t.slice(0,120))); break; }
  await page.waitForTimeout(20000);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(()=>{});
  await page.waitForTimeout(6000);
  console.log('poll', i, JSON.stringify((await text(page,80)||'').slice ? (await text(page,80)).slice(0,80) : ''));
}
await browser.close();
