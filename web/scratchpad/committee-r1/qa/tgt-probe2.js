const L = require('./lib');
(async () => {
  for (let run=1; run<=3; run++) {
    const { browser, ctx } = await L.launch();
    const errs = [];
    let phase='init';
    await L.seedInit(ctx, 'night-camp');
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__errLog = [];
      window.addEventListener('error', ev => window.__errLog.push({t:performance.now()|0, m:String(ev.message), s:(ev.error&&ev.error.stack||'').split('\n').slice(0,4).join(' | ')}));
    });
    page.on('pageerror', e => errs.push(`[${phase}] ${String(e).split('\n')[0]}`));
    phase='goto'; await page.goto('http://localhost:3000/chapter1?region=night-camp',{waitUntil:'domcontentloaded'});
    phase='start';
    try { await page.locator('button, a, [role=button]').filter({hasText:/התחילו|המשיכו/}).first().click({timeout:15000}); } catch(e){}
    phase='live'; await page.waitForFunction(()=>!!window.__ch1Live,null,{timeout:30000});
    phase='arrive-wait';
    await page.waitForFunction(()=>{const el=document.querySelector('.ch1-arrive');return !el||el.classList.contains('is-gone');},null,{timeout:25000}).catch(()=>{});
    await page.waitForTimeout(400);
    phase='screenshot1'; await page.screenshot({path:'shots/_p2.png'});
    phase='teleport'; await page.evaluate(()=>window.__ch1Live.player.set(1.6,0,-5.2)); await page.waitForTimeout(500);
    phase='keyE'; await page.keyboard.press('e'); await page.waitForTimeout(700);
    phase='screenshot2'; await page.screenshot({path:'shots/_p2b.png'});
    phase='tail'; await page.waitForTimeout(2000);
    const log = await page.evaluate(()=>window.__errLog);
    console.log(`--- run ${run}: pageerrors=${errs.length}`);
    console.log(errs.slice(0,3).join('\n'));
    for (const l of (log||[]).slice(0,3)) console.log('  window.__errLog:', JSON.stringify(l));
    await browser.close();
  }
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
