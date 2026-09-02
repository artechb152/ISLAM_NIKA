const L = require('./lib');
(async () => {
  const { browser, ctx } = await L.launch(1902, 942);
  const errs = [];
  await L.seedInit(ctx, 'night-camp');
  const page = await ctx.newPage();
  L.attachLogs(page, errs);
  await L.enter(page, 'night-camp');
  await L.shot(page, 'recon-nightcamp-world');
  console.log('=== WORLD UI ===');
  console.log(await L.dumpUI(page));
  // open station
  await L.pressAt(page, 1.6, -5.2, 'e');
  await L.shot(page, 'recon-nightcamp-station');
  console.log('=== STATION UI ===');
  console.log(await L.dumpUI(page));
  console.log('=== ERRORS ===');
  console.log(errs.join('\n') || '(none)');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
