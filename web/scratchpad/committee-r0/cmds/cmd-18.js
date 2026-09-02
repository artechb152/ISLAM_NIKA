// rotate in 4 quarter turns, screenshot each until markers found
const shots = [];
for (let i = 0; i < 4; i++) {
  await page.mouse.move(800, 450);
  await page.mouse.down();
  await page.mouse.move(1100, 450, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: base + '/scan-' + i + '.png', timeout: 60000 });
}
return 'done';
