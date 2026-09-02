import { getPage, shot, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
try {
  await page.getByText('התחילו במסע').first().click({ timeout: 5000 });
} catch (e) { console.log('click err', String(e).slice(0,150)); }
await page.waitForTimeout(2500);
await shot(page, '01-intro-t2');
await page.waitForTimeout(5000);
await shot(page, '01-intro-t7');
const txt = await safeEval(page, () => document.body.innerText.slice(0, 1500));
console.log('TEXT:', JSON.stringify(txt));
// look for skip button
const skip = await safeEval(page, () => {
  const els = [...document.querySelectorAll('button,[role=button]')].map(b => b.innerText.trim()).filter(Boolean);
  return els;
});
console.log('BUTTONS:', JSON.stringify(skip));
await browser.close();
