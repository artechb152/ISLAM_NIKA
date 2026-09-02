const btn = page.locator('text=התחילו במסע');
const count = await btn.count();
let info = { count };
if (count) {
  await btn.first().click({ force: true });
}
await page.waitForTimeout(8000);
info.url = page.url();
info.canvas = await page.evaluate(() => !!document.querySelector('canvas'));
info.text = (await page.evaluate(() => document.body.innerText)).slice(0, 2500);
await page.screenshot({ path: base + '/03-first-minute.png', timeout: 60000 });
return info;
