await page.click('text=המשיכו').catch(()=>{});
await page.waitForTimeout(700);
// go back to the stone station (behind us) — rotate 180 and creep until atTask
await page.mouse.move(650, 450);
await page.mouse.down();
await page.mouse.move(1250, 450, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(400);
let at = false;
for (let i = 0; i < 8; i++) {
  const s = await page.evaluate(() => ({ at: window.__ch1Live.atTask }));
  if (s.at) { at = true; break; }
  await page.keyboard.down('w');
  await page.waitForTimeout(450);
  await page.keyboard.up('w');
  await page.waitForTimeout(200);
}
await page.keyboard.press('e');
await page.waitForTimeout(1200);
const t = await page.evaluate(() => document.body.innerText);
await page.screenshot({ path: base + '/29-yemen-question-unlocked.png', timeout: 60000 });
return { at, hud: t.slice(0, 1200) };
