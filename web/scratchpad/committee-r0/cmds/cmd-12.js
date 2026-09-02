// drag mouse to rotate view ~180 degrees and screenshot
await page.mouse.move(800, 450);
await page.mouse.down();
await page.mouse.move(1400, 450, { steps: 20 });
await page.mouse.up();
await page.waitForTimeout(700);
await page.screenshot({ path: base + '/17-look-around-1.png', timeout: 60000 });
await page.mouse.move(800, 450);
await page.mouse.down();
await page.mouse.move(1400, 450, { steps: 20 });
await page.mouse.up();
await page.waitForTimeout(700);
await page.screenshot({ path: base + '/18-look-around-2.png', timeout: 60000 });
return 'done';
