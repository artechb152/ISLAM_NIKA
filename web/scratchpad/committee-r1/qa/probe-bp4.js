const L = require('./lib');
(async () => {
  const { browser, ctx } = await L.launch();
  await L.seedInit(ctx, 'border-post');
  const page = await ctx.newPage();
  await L.enter(page, 'border-post');
  const opened = await L.openStation(page, 'border-post');
  const c = page.locator('.ch1-task-foot button').filter({ hasText: 'אחר כך' });
  if (opened && await c.count()) { await c.click(); await page.waitForTimeout(600); }
  console.log('panel closed after locked-check');
  const state = () => page.evaluate(() => ({
    pos: (() => { const p = window.__ch1Live.player; return [+p.x.toFixed(1), +p.z.toFixed(1)]; })(),
    near: [...document.querySelectorAll('.poi-marker.is-near')].map(m => (m.className.match(/is-(find|task|dialogue)/) || ['?'])[0] + '"' + ((m.querySelector('.ch1-visually-hidden') || { textContent: '' }).textContent || '').slice(0, 12) + '"'),
  }));
  // put player a few metres from the seal, then WALK toward it with keys
  await page.evaluate(() => window.__ch1Live.player.set(1.66, 0, 5.5));
  await page.waitForTimeout(600);
  console.log('before walk:', JSON.stringify(await state()));
  await page.keyboard.down('s');           // walk (screen-down = +z? unknown; try both)
  await page.waitForTimeout(1500);
  await page.keyboard.up('s');
  console.log('after walk s:', JSON.stringify(await state()));
  await page.keyboard.down('w');
  await page.waitForTimeout(2500);
  await page.keyboard.up('w');
  console.log('after walk w:', JSON.stringify(await state()));
  // wherever we are, walk a circle near the seal using keys until near find
  for (const k of ['a','s','d','w','a','s']) {
    await page.keyboard.down(k); await page.waitForTimeout(700); await page.keyboard.up(k);
    const s = await state();
    console.log('walk', k, JSON.stringify(s));
    if (s.near.some(n => n.includes('find'))) { console.log('FIND became near by walking'); break; }
  }
  // final: press F if find near
  const s = await state();
  if (s.near.some(n => n.includes('find'))) {
    await page.keyboard.press('f'); await page.waitForTimeout(900);
    console.log('find panel open:', await page.evaluate(() => !!document.querySelector('.ch1-find')));
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
