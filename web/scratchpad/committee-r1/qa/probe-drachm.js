const L = require('./lib');
(async () => {
  const { browser, ctx } = await L.launch();
  await L.seedInit(ctx, 'border-post');
  const page = await ctx.newPage();
  await L.enter(page, 'border-post');
  const near = () => page.evaluate(() => {
    const ms = [...document.querySelectorAll('.poi-marker.is-find-marker')];
    return ms.map(m => ({ near: m.classList.contains('is-near'), t: (m.querySelector('.ch1-visually-hidden')||{textContent:''}).textContent, style: m.getAttribute('style') }));
  });
  console.log('markers+styles:', JSON.stringify(await near(), null, 1));
  const spots = [[-2.97,-3.44],[-3.5,-3.4],[-2.5,-3.9],[-2,-3],[-3,-2.5],[-4,-4],[-2.97,-4.5],[-1.5,-3.44],[-3.8,-2.8]];
  for (const [x,z] of spots) {
    await L.teleport(page, x, z);
    await page.waitForTimeout(1200);
    const n = await near();
    const drachm = n.find(m => m.t.includes('מטבע'));
    console.log(`at ${x},${z} -> drachm near=${drachm && drachm.near}`);
    if (drachm && drachm.near) break;
  }
  await L.shot(page, 'probe-drachm-spot');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
