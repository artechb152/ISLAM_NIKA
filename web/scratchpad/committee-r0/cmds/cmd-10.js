// head toward the pale shards on the left
await page.keyboard.down('a');
await page.waitForTimeout(500);
await page.keyboard.up('a');
await page.keyboard.down('w');
await page.waitForTimeout(1400);
await page.keyboard.up('w');
await page.waitForTimeout(400);
let t = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/13-yemen-near-shards.png', timeout: 60000 });
// try F
await page.keyboard.press('f');
await page.waitForTimeout(1200);
let t2 = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/14-yemen-F-attempt.png', timeout: 60000 });
return { before: t.slice(0, 500), afterF: t2.slice(0, 900) };
