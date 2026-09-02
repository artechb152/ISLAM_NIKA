const L = require('./lib');
(async () => {
  // A) yemen-heights: open station BEFORE picking up the find -> locked options UX
  {
    const { browser, ctx } = await L.launch();
    const errs = []; await L.seedInit(ctx, 'yemen-heights');
    const page = await ctx.newPage(); L.attachLogs(page, errs);
    await L.enter(page, 'yemen-heights');
    await L.pressAt(page, -7.4, 11.0, 'e');
    const html = await page.evaluate(() => { const el=document.querySelector('.ch1-task'); return el?el.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g,'<svg/>'):'(no panel)'; });
    console.log('=== YEMEN LOCKED PANEL ==='); console.log(html.slice(0,4000));
    // try clicking a locked option
    const b = page.locator('.ch1-task-options button').first();
    if (await b.count()) {
      const dis = await b.isDisabled();
      console.log('first option disabled:', dis);
      if (!dis) { await b.click({force:true}); await page.waitForTimeout(600);
        console.log('after click:', (await page.evaluate(()=>{const n=document.querySelector('.ch1-task-note');return n?n.className+' :: '+n.textContent:'(no note)';})));
      }
    }
    await L.shot(page, 'recon-yemen-locked');
    console.log('errors:', errs.length);
    await browser.close();
  }
  // B) yathrib connect panel
  {
    const { browser, ctx } = await L.launch();
    const errs = []; await L.seedInit(ctx, 'yathrib');
    const page = await ctx.newPage(); L.attachLogs(page, errs);
    await L.enter(page, 'yathrib');
    await L.pressAt(page, 1.4, 6.2, 'e');
    const html = await page.evaluate(() => { const el=document.querySelector('.ch1-task'); return el?el.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g,'<svg/>'):'(no panel)'; });
    console.log('=== YATHRIB CONNECT PANEL ==='); console.log(html.slice(0,6000));
    await L.shot(page, 'recon-yathrib-panel');
    console.log('errors:', errs.length);
    await browser.close();
  }
  // C) monastery: station BEFORE the three observation finds
  {
    const { browser, ctx } = await L.launch();
    const errs = []; await L.seedInit(ctx, 'monastery');
    const page = await ctx.newPage(); L.attachLogs(page, errs);
    await L.enter(page, 'monastery');
    await L.pressAt(page, -2.6, 3.8, 'e');
    const html = await page.evaluate(() => { const el=document.querySelector('.ch1-task'); return el?el.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g,'<svg/>'):'(NO PANEL OPENED)'; });
    console.log('=== MONASTERY BEFORE FINDS ==='); console.log(html.slice(0,4000));
    // any hint shown in world?
    console.log('hints:', await page.evaluate(()=>[...document.querySelectorAll('.poi-hints *, .ch1-task-lock, [class*=lock]')].map(e=>e.className+': '+(e.textContent||'').trim().slice(0,100)).join(' || ')));
    await L.shot(page, 'recon-monastery-locked');
    console.log('errors:', errs.length);
    await browser.close();
  }
  // D) loading-road choose + props
  {
    const { browser, ctx } = await L.launch();
    const errs = []; await L.seedInit(ctx, 'loading-road');
    const page = await ctx.newPage(); L.attachLogs(page, errs);
    await L.enter(page, 'loading-road');
    await L.pressAt(page, 3.92, -0.13, 'e');
    const html = await page.evaluate(() => { const el=document.querySelector('.ch1-task'); return el?el.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g,'<svg/>'):'(no panel)'; });
    console.log('=== LOADING-ROAD PANEL ==='); console.log(html.slice(0,4000));
    console.log('__ch1Task:', JSON.stringify(await page.evaluate(()=>window.__ch1Task||null)));
    await L.shot(page, 'recon-loading-panel');
    console.log('errors:', errs.length);
    await browser.close();
  }
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
