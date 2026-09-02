import { getPage, shot, safeEval, text } from './lib2.mjs';
const { browser, page } = await getPage();
for (let i = 1; i <= 3; i++) {
  await page.mouse.click(640, 570);
  await page.waitForTimeout(2200);
  const t = await text(page, 1000);
  console.log(`--- after click ${i} ---`);
  console.log(JSON.stringify(t));
}
await shot(page, '97-rawi-dialog2');
await browser.close();
