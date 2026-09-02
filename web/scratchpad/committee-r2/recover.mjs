import { getPage, shot, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(2500);
  const txt = await safeEval(page, () => document.body.innerText.slice(0, 400));
  if (typeof txt === 'string' && txt.includes('המשיכו במסע')) {
    try { await page.getByText('המשיכו במסע').first().click({ timeout: 3000 }); } catch {}
    await page.waitForTimeout(5000);
    await page.keyboard.press('h');
    break;
  }
  if (typeof txt === 'string' && txt.includes('רמות') && !txt.includes('טוען')) {
    if (txt.includes('W\nקדימה')) await page.keyboard.press('h');
    break;
  }
}
await shot(page, process.argv[2] || 'recovered');
console.log('TXT:', JSON.stringify(await safeEval(page, () => document.body.innerText.slice(0, 500))));
await browser.close();
