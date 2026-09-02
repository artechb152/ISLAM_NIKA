await page.click('text=התחילו במסע');
await page.waitForTimeout(6000);
await page.screenshot({ path: base + '/02-after-start.png' });
const text = await page.evaluate(() => document.body.innerText);
return { url: page.url(), text: text.slice(0, 3000) };
