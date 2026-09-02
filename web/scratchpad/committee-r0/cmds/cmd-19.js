// rotate to the scan-1 bearing (two quarter turns) and run forward toward the ? marker
await page.mouse.move(650, 450);
await page.mouse.down();
await page.mouse.move(1250, 450, { steps: 15 });
await page.mouse.up();
await page.waitForTimeout(500);
await page.keyboard.down('w'); await page.keyboard.down('Shift');
await page.waitForTimeout(2000);
await page.keyboard.up('Shift'); await page.keyboard.up('w');
await page.waitForTimeout(400);
const t = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/24-yemen-station-approach.png', timeout: 60000 });
return t.slice(0, 700);
