const L = require('./lib');
(async () => {
  const { browser, ctx } = await L.launch();
  await L.seedInit(ctx, 'border-post');
  const page = await ctx.newPage();
  await L.enter(page, 'border-post');
  // replicate gauntlet: locked-check first
  await L.openStation(page, 'border-post');
  await page.locator('.ch1-task-foot button').filter({ hasText: 'אחר כך' }).click();
  await page.waitForTimeout(500);
  for (const [fx, fz] of [[-2.97,-3.44],[1.66,0.9]]) {
    await L.teleport(page, fx, fz, 0.9);
    const near = await page.waitForFunction(() => !!document.querySelector('.poi-marker.is-find-marker.is-near'), null, { timeout: 8000 }).then(()=>true).catch(()=>false);
    console.log(`find ${fx},${fz} offset spot: near=${near}`);
    if (!near) {
      console.log('  markers:', await page.evaluate(() => [...document.querySelectorAll('.poi-marker')].map(m => m.className.replace('poi-marker','')).join(' | ')));
      console.log('  pos:', await page.evaluate(() => { const p = window.__ch1Live.player; return [+p.x.toFixed(2), +p.z.toFixed(2)]; }));
    }
    await page.keyboard.press('f'); await page.waitForTimeout(900);
    const open = await page.evaluate(() => !!document.querySelector('.ch1-find'));
    console.log('  find panel:', open, open ? await page.evaluate(() => document.querySelector('#ch1-find-title').textContent) : '');
    if (open) { await page.locator('.ch1-find-foot button.is-primary').click(); await page.waitForTimeout(600); }
  }
  await L.shot(page, 'probe-bp6');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
