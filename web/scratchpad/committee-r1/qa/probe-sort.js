const L = require('./lib');
(async () => {
  // yathrib connect
  {
    const { browser, ctx } = await L.launch();
    const errs = []; await L.seedInit(ctx, 'yathrib');
    const page = await ctx.newPage(); L.attachLogs(page, errs);
    await L.enter(page, 'yathrib');
    const ok = await L.openStation(page, 'yathrib');
    console.log('yathrib open:', ok);
    const html = () => page.evaluate(() => (document.querySelector('.ch1-task')||{outerHTML:'(none)'}).outerHTML.replace(/<svg[\s\S]*?<\/svg>/g,'<svg/>'));
    console.log((await html()).slice(0,5500));
    // click first item, then see what's clickable
    const items = page.locator('.ch1-task button:not(.ch1-task-foot button)');
    await L.shot(page, 'probe-yathrib-connect');
    // try clicking the item for 'law' (apart) then a wrong destination
    console.log('--- clicking first option-like button');
    const bs = await page.locator('.ch1-task button').allTextContents();
    console.log('buttons:', JSON.stringify(bs));
    await browser.close();
  }
  // monastery with the three observation finds collected
  {
    const { browser, ctx } = await L.launch();
    const errs = []; await L.seedInit(ctx, 'monastery');
    const page = await ctx.newPage(); L.attachLogs(page, errs);
    await L.enter(page, 'monastery');
    for (const [fx,fz] of L.STATIONS['monastery'].finds) {
      const got = await L.pickFind(page, fx, fz);
      console.log('find', fx, fz, '->', got);
    }
    const ok = await L.openStation(page, 'monastery');
    console.log('monastery open:', ok);
    const html = await page.evaluate(() => (document.querySelector('.ch1-task')||{outerHTML:'(none)'}).outerHTML.replace(/<svg[\s\S]*?<\/svg>/g,'<svg/>'));
    console.log(html.slice(0,6000));
    await L.shot(page, 'probe-monastery-sort');
    console.log('errors:', errs.length);
    await browser.close();
  }
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
