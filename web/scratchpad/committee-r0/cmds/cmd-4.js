// advance narrator dialogue a few times, capturing text each time
const out = [];
for (let i = 0; i < 8; i++) {
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  const t = await page.evaluate(() => document.body.innerText);
  out.push(t.slice(0, 700));
  if (i === 1) await page.screenshot({ path: base + '/04-intro-dialogue.png', timeout: 60000 });
}
await page.screenshot({ path: base + '/05-after-intro.png', timeout: 60000 });
return out;
