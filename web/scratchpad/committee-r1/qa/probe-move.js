const L = require('./lib');
(async () => {
  const { browser, ctx } = await L.launch();
  await L.seedInit(ctx, 'border-post');
  const page = await ctx.newPage();
  await L.enter(page, 'border-post');
  const pos = () => page.evaluate(() => { const p = window.__ch1Live.player; return [+p.x.toFixed(2), +p.z.toFixed(2)]; });
  const hold = async (k, ms) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
  // baseline at spawn, no teleport at all
  console.log('spawn pos:', await pos(), 'active:', await page.evaluate(() => document.activeElement.tagName));
  await hold('w', 2000); console.log('after w 2s:', await pos());
  await hold('s', 2000); console.log('after s 2s:', await pos());
  await hold('a', 2000); console.log('after a 2s:', await pos());
  // ArrowKeys?
  await hold('ArrowUp', 2000); console.log('after ArrowUp 2s:', await pos());
  // now open+close panel and repeat
  await L.openStation(page, 'border-post');
  await page.locator('.ch1-task-foot button').filter({ hasText: 'אחר כך' }).click();
  await page.waitForTimeout(700);
  console.log('panel closed. active:', await page.evaluate(() => document.activeElement.tagName + '.' + document.activeElement.className));
  await hold('w', 2000); console.log('after close + w 2s:', await pos());
  await page.mouse.click(950, 500); await page.waitForTimeout(300);
  await hold('w', 2000); console.log('after canvas-click + w 2s:', await pos());
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await hold('w', 2000); console.log('after Esc + w 2s:', await pos());
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
