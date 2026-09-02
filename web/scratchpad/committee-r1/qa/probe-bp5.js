const L = require('./lib');
async function tryWalk(page, label) {
  const pos = () => page.evaluate(() => { const p = window.__ch1Live.player; return [+p.x.toFixed(2), +p.z.toFixed(2)]; });
  const p0 = await pos();
  await page.keyboard.down('w'); await page.waitForTimeout(1000); await page.keyboard.up('w');
  await page.keyboard.down('d'); await page.waitForTimeout(1000); await page.keyboard.up('d');
  const p1 = await pos();
  const moved = Math.hypot(p1[0]-p0[0], p1[1]-p0[1]);
  console.log(label, 'from', p0, 'to', p1, 'moved', +moved.toFixed(2));
  return moved > 0.3;
}
(async () => {
  // A: no panel interaction at all — teleport to open ground, walk
  {
    const { browser, ctx } = await L.launch();
    await L.seedInit(ctx, 'border-post');
    const page = await ctx.newPage();
    await L.enter(page, 'border-post');
    await page.evaluate(() => window.__ch1Live.player.set(1.66, 0, 5.5)); await page.waitForTimeout(600);
    await tryWalk(page, 'A(no-panel, at 1.66,5.5)');
    await browser.close();
  }
  // B: open station, close with button, walk from station spot
  {
    const { browser, ctx } = await L.launch();
    await L.seedInit(ctx, 'border-post');
    const page = await ctx.newPage();
    await L.enter(page, 'border-post');
    await L.openStation(page, 'border-post');
    await page.locator('.ch1-task-foot button').filter({ hasText: 'אחר כך' }).click();
    await page.waitForTimeout(700);
    await tryWalk(page, 'B(after button-close, at station)');
  // C same session: close/reopen with Escape then walk
    await L.openStation(page, 'border-post');
    await page.keyboard.press('Escape'); await page.waitForTimeout(700);
    await tryWalk(page, 'C(after Esc-close)');
    await browser.close();
  }
  // D: yemen for comparison — button-close then walk
  {
    const { browser, ctx } = await L.launch();
    await L.seedInit(ctx, 'yemen-heights');
    const page = await ctx.newPage();
    await L.enter(page, 'yemen-heights');
    await L.openStation(page, 'yemen-heights');
    await page.locator('.ch1-task-foot button').filter({ hasText: 'אחר כך' }).click();
    await page.waitForTimeout(700);
    await tryWalk(page, 'D(yemen after button-close)');
    await browser.close();
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
