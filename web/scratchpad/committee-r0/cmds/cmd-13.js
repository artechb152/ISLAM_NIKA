// rotate back to the view with the near sparkle marker, then walk to it
await page.mouse.move(1400, 450);
await page.mouse.down();
await page.mouse.move(800, 450, { steps: 20 });
await page.mouse.up();
await page.waitForTimeout(500);
// marker was slightly left of center; nudge left
await page.keyboard.down('a');
await page.waitForTimeout(400);
await page.keyboard.up('a');
await page.keyboard.down('w');
await page.waitForTimeout(2000);
await page.keyboard.up('w');
await page.waitForTimeout(400);
const t = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/19-yemen-to-marker.png', timeout: 60000 });
return t.slice(0, 700);
