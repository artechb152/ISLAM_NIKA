await page.click('text=המשיכו');
await page.waitForTimeout(800);
// face the ? marker: it was far right in view; rotate right a bit and run
await page.mouse.move(800, 450);
await page.mouse.down();
await page.mouse.move(1150, 450, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(400);
await page.keyboard.down('w');
await page.keyboard.down('Shift');
await page.waitForTimeout(2500);
await page.keyboard.up('Shift');
await page.keyboard.up('w');
await page.waitForTimeout(400);
const t = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/22-yemen-toward-station.png', timeout: 60000 });
return t.slice(0, 700);
