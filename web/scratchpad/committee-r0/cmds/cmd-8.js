// Walk forward 4.5s, then run with Shift 4.5s (visible in video)
await page.mouse.click(800, 450); // make sure canvas focused
await page.keyboard.down('w');
await page.waitForTimeout(2200);
await page.screenshot({ path: base + '/09-yemen-walking.png', timeout: 60000 });
await page.waitForTimeout(2300);
await page.keyboard.down('Shift');
await page.waitForTimeout(2200);
await page.screenshot({ path: base + '/10-yemen-running.png', timeout: 60000 });
await page.waitForTimeout(2300);
await page.keyboard.up('Shift');
await page.keyboard.up('w');
await page.waitForTimeout(600);
const t = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/11-yemen-after-move.png', timeout: 60000 });
return t.slice(0, 900);
