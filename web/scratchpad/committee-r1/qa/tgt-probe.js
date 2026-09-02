const L = require('./lib');
(async () => {
  const { browser, ctx } = await L.launch();
  const errs = [];
  let phase = 'init';
  await L.seedInit(ctx, 'night-camp');
  const page = await ctx.newPage();
  page.on('pageerror', e => errs.push(`[${phase}] ${String(e).split('\n')[0]}`));
  page.on('console', m => { if (m.type()==='error') errs.push(`[${phase}][console] ` + m.text().slice(0,300)); });
  phase='goto'; await page.goto('http://localhost:3000/chapter1?region=night-camp',{waitUntil:'domcontentloaded'});
  phase='start-click';
  try { await page.locator('button, a, [role=button]').filter({hasText:/התחילו|המשיכו/}).first().click({timeout:15000}); } catch(e){ console.log('no start btn'); }
  phase='wait-live'; await page.waitForFunction(()=>!!window.__ch1Live,null,{timeout:30000});
  phase='idle-5s'; await page.waitForTimeout(5000);
  phase='teleport'; await L.teleport(page, 1.6, -5.2);
  phase='idle-after-tp'; await page.waitForTimeout(3000);
  phase='open-E'; await page.keyboard.press('e'); await page.waitForTimeout(1000);
  phase='idle-panel'; await page.waitForTimeout(3000);
  console.log(errs.join('\n') || '(no errors)');
  // also get a stack for the error
  const stack = await page.evaluate(() => new Promise(res => {
    window.addEventListener('error', ev => res(ev.error && ev.error.stack ? ev.error.stack : String(ev.message)), {once:true});
    setTimeout(()=>res('(no error within 6s)'), 6000);
  }));
  console.log('=== STACK ==='); console.log(stack);
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
