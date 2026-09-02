// go around the wall: turn left, walk, turn right, walk to marker; then F
async function step(key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }
await step('a', 800);
await step('w', 1200);
await page.keyboard.press('f');
await page.waitForTimeout(1000);
let t = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/21-yemen-evidence-try2.png', timeout: 60000 });
return t.slice(0, 500);
