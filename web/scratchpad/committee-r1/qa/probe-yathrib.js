const L = require('./lib');
(async () => {
  const { browser, ctx } = await L.launch();
  const errs = []; await L.seedInit(ctx, 'yathrib');
  const page = await ctx.newPage(); L.attachLogs(page, errs);
  await L.enter(page, 'yathrib');
  const overlays = () => page.evaluate(() => ({
    task: !!document.querySelector('.ch1-task'),
    find: !!document.querySelector('.ch1-find'),
    dlg: [...document.querySelectorAll('[role=dialog]')].map(d=>d.className).join(','),
    stage: [...document.querySelectorAll('.ch1-stage > div')].map(d=>d.className).filter(c=>c&&!c.includes('vignette')&&!c.includes('poi-')).join(' | '),
    near: [...document.querySelectorAll('.poi-marker')].map(m=>m.className+' "'+(m.querySelector('.ch1-visually-hidden')||{}).textContent+'"').join(' || '),
    active: document.activeElement && (document.activeElement.tagName + '.' + document.activeElement.className),
  }));
  await L.teleport(page, 1.4, 6.2);
  console.log('t0:', JSON.stringify(await overlays(), null, 1));
  // click canvas first to ensure focus, then E
  await page.mouse.click(950, 500); await page.waitForTimeout(300);
  await page.keyboard.press('e'); await page.waitForTimeout(1200);
  console.log('after click+E:', JSON.stringify(await overlays()));
  await page.keyboard.press('E'); await page.waitForTimeout(1200);
  console.log('after E(upper):', JSON.stringify(await overlays()));
  // hebrew layout? try ק (hebrew E key)
  await page.keyboard.press('ק').catch(()=>{}); await page.waitForTimeout(800);
  // walk a tiny bit then E
  await page.keyboard.down('w'); await page.waitForTimeout(300); await page.keyboard.up('w');
  await page.waitForTimeout(300);
  await page.keyboard.press('e'); await page.waitForTimeout(1500);
  console.log('after walk+E:', JSON.stringify(await overlays()));
  const pos = await page.evaluate(()=>{const p=window.__ch1Live.player; return {x:p.x,z:p.z};});
  console.log('player pos:', JSON.stringify(pos));
  await L.shot(page, 'probe-yathrib-afterE');
  console.log('errors:', errs.length);
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
