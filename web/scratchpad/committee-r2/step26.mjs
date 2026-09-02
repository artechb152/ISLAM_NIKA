import { getPage, shot, safeEval, text } from './lib2.mjs';
const { browser, page } = await getPage();
await page.getByText('המשך').click().catch(e => console.log('err'));
await page.waitForTimeout(2500);
await shot(page, '127-after-departure-line');
console.log('TXT:', JSON.stringify(await text(page, 900)));
const live = await safeEval(page, () => {
  const l = window.__ch1Live;
  return l ? { riseAt: l.riseAt, nearFind: l.nearFind, talk: !!l.talk } : null;
});
console.log('LIVE:', JSON.stringify(live));
await page.waitForTimeout(4000);
await shot(page, '128-camp-after');
await browser.close();
