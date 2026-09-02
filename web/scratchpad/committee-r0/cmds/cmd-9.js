// steer right toward the sparkle marker
await page.keyboard.down('d');
await page.waitForTimeout(900);
await page.keyboard.up('d');
await page.keyboard.down('w');
await page.waitForTimeout(1800);
await page.keyboard.up('w');
await page.waitForTimeout(400);
const t = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/12-yemen-approach-marker.png', timeout: 60000 });
return t.slice(0, 900);
