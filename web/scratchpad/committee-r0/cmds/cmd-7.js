const texts = [];
let escTested = false;
for (let i = 0; i < 16; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(1100);
  const t = await page.evaluate(() => document.body.innerText);
  texts.push(t.slice(0, 350));
  if (i === 2) await page.screenshot({ path: base + '/06-rawi-dialogue.png', timeout: 60000 });
  if (!escTested && i === 4) {
    // test Escape mid-dialogue
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1200);
    const t2 = await page.evaluate(() => document.body.innerText);
    texts.push('AFTER-ESC: ' + t2.slice(0, 350));
    await page.screenshot({ path: base + '/07-escape-mid-dialogue.png', timeout: 60000 });
    escTested = true;
  }
  if (!t.includes('להמשך') && !t.includes('להשלמת השורה') && !t.includes('המשך')) break;
}
await page.screenshot({ path: base + '/08-post-dialogue.png', timeout: 60000 });
return texts;
