await page.keyboard.press('e');
await page.waitForTimeout(1500);
const t = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/27-yemen-stone-station.png', timeout: 60000 });
return t.slice(0, 1600);
