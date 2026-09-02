await page.waitForTimeout(8000);
await page.screenshot({ path: base + '/02-after-start.png', timeout: 60000 });
const text = await page.evaluate(() => document.body.innerText);
return { url: page.url(), text: text.slice(0, 3000) };
