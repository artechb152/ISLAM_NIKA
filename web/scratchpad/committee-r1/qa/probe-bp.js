const L = require('./lib');
(async () => {
  const { browser, ctx } = await L.launch();
  const errs = []; await L.seedInit(ctx, 'border-post');
  const page = await ctx.newPage(); L.attachLogs(page, errs);
  await L.enter(page, 'border-post');
  const markers = () => page.evaluate(() => [...document.querySelectorAll('.poi-marker')].map(m => m.className + ' "' + ((m.querySelector('.ch1-visually-hidden')||{textContent:''}).textContent) + '"'));
  console.log('markers at spawn:', JSON.stringify(await markers(), null, 1));
  for (const [fx, fz] of [[-2.97,-3.44],[1.66,0.9]]) {
    await L.teleport(page, fx, fz);
    await page.waitForTimeout(1500);
    console.log(`--- at ${fx},${fz}:`, JSON.stringify(await markers()));
    await page.keyboard.press('f');
    await page.waitForTimeout(900);
    const open = await page.evaluate(() => !!document.querySelector('.ch1-find'));
    console.log('   find panel:', open);
    if (open) {
      console.log('   title:', await page.evaluate(() => document.querySelector('#ch1-find-title').textContent));
      await page.locator('.ch1-find-foot button.is-primary').click();
      await page.waitForTimeout(500);
    }
  }
  const hud = await page.evaluate(() => document.querySelector('.hud-goal').textContent);
  console.log('hud:', hud);
  await L.shot(page, 'probe-bp');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
