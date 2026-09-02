await page.goto('http://localhost:3000/chapter1', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
await page.screenshot({ path: base + '/01-title.png' });
const text = await page.evaluate(() => document.body.innerText);
return { url: page.url(), text: text.slice(0, 3000) };
