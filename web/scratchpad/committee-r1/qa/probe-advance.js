const L = require('./lib');
(async () => {
  const { browser, ctx } = await L.launch(1366, 768);
  const errs = [];
  await L.seedInit(ctx, 'yemen-heights');
  const page = await ctx.newPage(); L.attachLogs(page, errs);
  await L.enter(page, 'yemen-heights');
  await L.pickFind(page, -9.4, 12.6);
  await L.openStation(page, 'yemen-heights');
  await page.locator('.ch1-task-options button').nth(0).click();
  await page.waitForTimeout(900);
  // focus the advance button via keyboard Tab
  let focused = null;
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab'); await page.waitForTimeout(80);
    focused = await page.evaluate(() => { const a = document.activeElement; return a ? { cls: (a.className||'').toString(), t: (a.textContent||'').trim() } : null; });
    if (focused && focused.cls.includes('is-primary')) break;
  }
  console.log('focused:', JSON.stringify(focused));
  await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
  console.log('after Enter, panel open:', await page.evaluate(() => !!document.querySelector('.ch1-task')));
  const open1 = await page.evaluate(() => !!document.querySelector('.ch1-task'));
  if (open1) {
    await page.keyboard.press(' '); await page.waitForTimeout(1200);
    console.log('after Space, panel open:', await page.evaluate(() => !!document.querySelector('.ch1-task')));
  }
  const open2 = await page.evaluate(() => !!document.querySelector('.ch1-task'));
  if (open2) {
    await page.keyboard.press('Escape'); await page.waitForTimeout(800);
    console.log('after Escape, panel open:', await page.evaluate(() => !!document.querySelector('.ch1-task')));
  }
  // measure answered-state fit at 1366
  console.log('answered-fit:', JSON.stringify(await page.evaluate(() => {
    const card = document.querySelector('.ch1-task-card');
    if (!card) return null;
    const r = card.getBoundingClientRect();
    return { top: +r.top.toFixed(0), bottom: +r.bottom.toFixed(0), vh: innerHeight, of: getComputedStyle(card).overflowY };
  })));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
