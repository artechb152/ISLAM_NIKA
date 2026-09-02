const L = require('./lib');
(async () => {
  const { browser, ctx } = await L.launch();
  await L.seedInit(ctx, 'border-post');
  const page = await ctx.newPage();
  await L.enter(page, 'border-post');
  // replicate gauntlet order: locked-check first
  const opened = await L.openStation(page, 'border-post');
  console.log('locked-check open:', opened);
  const c = page.locator('.ch1-task-foot button').filter({ hasText: 'אחר כך' });
  if (opened && await c.count()) { await c.click(); await page.waitForTimeout(400); }
  for (const [fx, fz] of L.STATIONS['border-post'].finds) {
    const got = await L.pickFind(page, fx, fz);
    console.log('pickFind', fx, fz, '->', got);
  }
  const ok = await L.openStation(page, 'border-post');
  console.log('reopen:', ok);
  console.log('opts:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.ch1-task-options button')].map(b => ({ cls: b.className, dis: b.disabled, t: b.textContent.trim().slice(0, 40) })), ), null, 1));
  await L.shot(page, 'probe-bp2');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
