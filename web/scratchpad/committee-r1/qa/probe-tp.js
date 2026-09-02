const L = require('./lib');
(async () => {
  const { browser, ctx } = await L.launch();
  await L.seedInit(ctx, 'border-post');
  const page = await ctx.newPage();
  await L.enter(page, 'border-post');
  const pos = () => page.evaluate(() => { const p = window.__ch1Live.player; return [+p.x.toFixed(2), +p.z.toFixed(2)]; });
  const hold = async (k, ms) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
  console.log('spawn:', await pos());
  await hold('s', 1500); console.log('baseline s:', await pos());
  await page.evaluate(() => window.__ch1Live.player.set(0, 0, 8));
  await page.waitForTimeout(500);
  await hold('s', 1500); console.log('right after tp:', await pos());
  await page.waitForTimeout(5000);
  await hold('s', 1500); console.log('5s after tp:', await pos());
  await page.waitForTimeout(10000);
  await hold('s', 1500); console.log('15s after tp:', await pos());
  // taps instead of holds
  for (let i = 0; i < 10; i++) { await page.keyboard.press('s'); await page.waitForTimeout(80); }
  console.log('after 10 taps:', await pos());
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
