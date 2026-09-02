const L = require('./lib');
const region = process.argv[2];
const doFinds = process.argv[3] === 'finds';
(async () => {
  const { browser, ctx } = await L.launch();
  const errs = [];
  await L.seedInit(ctx, region);
  const page = await ctx.newPage();
  L.attachLogs(page, errs);
  await L.enter(page, region);
  const st = L.STATIONS[region];
  const panelHTML = async () => page.evaluate(() => {
    const el = document.querySelector('.ch1-task') || document.querySelector('.ch1-find') || null;
    if (el) return el.outerHTML.replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>');
    // any overlay?
    const o = [...document.querySelectorAll('.ch1-stage > div')].map(d=>d.className).join(' | ');
    return '(no .ch1-task/.ch1-find) stage children: ' + o;
  });
  if (doFinds) {
    for (const [fx, fz] of st.finds) {
      await L.pressAt(page, fx, fz, 'f');
      console.log(`--- FIND at ${fx},${fz}:`);
      console.log((await panelHTML()).slice(0, 2500));
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      const still = await page.evaluate(()=>!!document.querySelector('.ch1-find'));
      console.log('   [after Escape, .ch1-find present:', still, ']');
      if (still) { await page.keyboard.press(' '); await page.waitForTimeout(400); }
    }
  }
  await L.pressAt(page, st.x, st.z, 'e');
  console.log('=== STATION PANEL ===');
  console.log((await panelHTML()).slice(0, 6000));
  // click the first option and see what changes
  const opt = page.locator('.ch1-task-options button').first();
  if (await opt.count()) {
    await opt.click(); await page.waitForTimeout(900);
    console.log('=== AFTER CLICK OPTION 1 ===');
    console.log((await panelHTML()).slice(0, 6000));
  }
  console.log('=== ERRORS === count=' + errs.length);
  console.log([...new Set(errs.map(e=>e.slice(0,160)))].slice(0,5).join('\n'));
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
