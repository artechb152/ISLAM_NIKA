const L = require('./lib');
async function watchNear(page, label, secs) {
  for (let i = 0; i < secs * 2; i++) {
    const s = await page.evaluate(() => [...document.querySelectorAll('.poi-marker')].map(m => (m.classList.contains('is-near') ? 'NEAR:' : '') + (m.className.match(/is-(find|task|dialogue|gate)/) || ['?'])[0] + '"' + ((m.querySelector('.ch1-visually-hidden') || { textContent: '' }).textContent || '').slice(0, 10) + '"').join(' '));
    if (s.includes('NEAR')) { console.log(label, 'near at', i * 0.5 + 's:', s); return true; }
    await page.waitForTimeout(500);
  }
  console.log(label, 'NEVER near');
  return false;
}
(async () => {
  for (const withLocked of [false, true]) {
    const { browser, ctx } = await L.launch();
    await L.seedInit(ctx, 'border-post');
    const page = await ctx.newPage();
    await L.enter(page, 'border-post');
    if (withLocked) {
      const opened = await L.openStation(page, 'border-post');
      const c = page.locator('.ch1-task-foot button').filter({ hasText: 'אחר כך' });
      if (opened && await c.count()) { await c.click(); await page.waitForTimeout(600); }
      console.log('locked-check done, panel closed:', !(await page.evaluate(() => !!document.querySelector('.ch1-task'))));
    }
    await L.teleport(page, 1.66, 0.9);
    await watchNear(page, `[locked=${withLocked}] seal`, 6);
    await L.teleport(page, -2.5, -3.9);
    await watchNear(page, `[locked=${withLocked}] drachm(-2.5,-3.9)`, 6);
    await browser.close();
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
