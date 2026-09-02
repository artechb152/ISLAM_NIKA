const texts = [];
for (let i = 0; i < 12; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(1200);
  const t = await page.evaluate(() => document.body.innerText);
  texts.push(t.slice(0, 400));
  // stop if the narrator panel is gone
  if (!t.includes('קריין') && !t.includes('להמשך')) break;
}
await page.screenshot({ path: base + '/05-after-intro.png', timeout: 60000 });
return texts;
