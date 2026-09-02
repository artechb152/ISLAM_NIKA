const L = require('./lib');
(async () => {
  for (const region of ['yemen-heights','loading-road']) {
    const { browser, ctx } = await L.launch();
    const errs = []; await L.seedInit(ctx, region);
    const page = await ctx.newPage(); L.attachLogs(page, errs);
    await L.enter(page, region);
    const opened = await L.openStation(page, region);
    console.log(`=== ${region}: panel opened (no finds collected) -> ${opened}`);
    if (opened) {
      const html = await page.evaluate(() => document.querySelector('.ch1-task').outerHTML.replace(/<svg[\s\S]*?<\/svg>/g,'<svg/>'));
      console.log(html.slice(0, 4500));
    } else {
      console.log('markers:', await page.evaluate(()=>[...document.querySelectorAll('.poi-marker')].map(m=>m.className).join(' | ')));
    }
    if (region==='loading-road') console.log('__ch1Task:', JSON.stringify(await page.evaluate(()=>window.__ch1Task||null)));
    await L.shot(page, 'probe-locked-'+region);
    console.log('errors:', errs.length, [...new Set(errs.map(e=>e.slice(0,90)))].slice(0,3));
    await browser.close();
  }
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
