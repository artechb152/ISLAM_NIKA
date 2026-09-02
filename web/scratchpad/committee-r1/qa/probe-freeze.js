const L = require('./lib');
async function walkDelta(page, ms) {
  const pos = () => page.evaluate(() => { const p = window.__ch1Live.player; return [p.x, p.z]; });
  const p0 = await pos();
  await page.keyboard.down('s'); await page.waitForTimeout(ms); await page.keyboard.up('s');
  await page.keyboard.down('a'); await page.waitForTimeout(ms); await page.keyboard.up('a');
  const p1 = await pos();
  return +Math.hypot(p1[0]-p0[0], p1[1]-p0[1]).toFixed(2);
}
async function fresh(region) {
  const { browser, ctx } = await L.launch();
  await L.seedInit(ctx, region);
  const page = await ctx.newPage();
  await L.enter(page, region);
  return { browser, page };
}
(async () => {
  // 1. Escape-close from a fresh open (night-camp: no find needed)
  {
    const { browser, page } = await fresh('night-camp');
    await L.openStation(page, 'night-camp');
    await page.keyboard.press('Escape'); await page.waitForTimeout(700);
    console.log('1) esc-close fresh, walk:', await walkDelta(page, 1500));
    await browser.close();
  }
  // 2. complete task + הלאה, then walk
  {
    const { browser, page } = await fresh('night-camp');
    await L.openStation(page, 'night-camp');
    await page.locator('.ch1-task-options button').nth(0).click();
    await page.waitForTimeout(900);
    await page.locator('.ch1-task-foot button.is-primary').click();
    await page.waitForTimeout(1200);
    console.log('2) completed+הלאה, panel open:', await page.evaluate(() => !!document.querySelector('.ch1-task')), 'walk:', await walkDelta(page, 1500));
    await browser.close();
  }
  // 3. find panel close via המשיכו, then walk (yemen find)
  {
    const { browser, page } = await fresh('yemen-heights');
    await L.teleport(page, -9.4, 12.6);
    await page.waitForFunction(() => !!document.querySelector('.poi-marker.is-find-marker.is-near'), null, { timeout: 8000 }).catch(()=>{});
    await page.keyboard.press('f'); await page.waitForTimeout(800);
    const open = await page.evaluate(() => !!document.querySelector('.ch1-find'));
    await page.locator('.ch1-find-foot button.is-primary').click(); await page.waitForTimeout(700);
    console.log('3) find open was:', open, '; after המשיכו walk:', await walkDelta(page, 1500));
    await browser.close();
  }
  // 4. walk WITHOUT ever teleporting, open station by walking? too slow; instead: teleport then open, esc, walk — teleport contamination check
  {
    const { browser, page } = await fresh('night-camp');
    // no teleport: player spawns somewhere; just open nothing. walk baseline
    console.log('4) baseline walk (no teleport, no panel):', await walkDelta(page, 1500));
    // now teleport only (no panel) and walk
    await L.teleport(page, 1.6, -5.2);
    console.log('   after teleport only, walk:', await walkDelta(page, 1500));
    await browser.close();
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
