async function step(key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }
await step('d', 600);
await step('w', 900);
await page.keyboard.press('f');
await page.waitForTimeout(1200);
let t = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/23-yemen-inscription.png', timeout: 60000 });
if (t.includes('נמצא')) {
  await page.click('text=המשיכו').catch(()=>{});
  await page.waitForTimeout(600);
}
return t.slice(0, 900);
