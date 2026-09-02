const fs = require('fs');
const L = require('./lib');

(async () => {
  const OUT = {};
  const { browser, ctx } = await L.launch(1902, 942);
  const errs = [];
  await L.seedInit(ctx, 'loading-road');
  const page = await ctx.newPage();
  L.attachLogs(page, errs);
  await L.enter(page, 'loading-road');
  await L.teleport(page, 3.92, -0.13);
  await page.waitForFunction(() => !!(window.__ch1Task && window.__ch1Task.props && window.__ch1Task.props.length), null, { timeout: 8000 });
  const T = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__ch1Task)));
  const rings = () => page.evaluate(() => {
    const els = [...document.querySelectorAll('[class*=ring], [class*=drag], [class*=drop]')].filter(e => e.offsetParent !== null);
    return { domRings: els.map(e => e.className), cursor: getComputedStyle(document.querySelector('canvas')).cursor, bodyCursor: getComputedStyle(document.body).cursor };
  });

  let t = await T();
  OUT.initial = t;

  // hover first prop
  const p0 = t.props[0];
  await page.mouse.move(p0.x, p0.y, { steps: 8 });
  await page.waitForTimeout(600);
  OUT.hover = await rings();
  await L.shot(page, 'drag-hover');

  // pick up and drag toward target slowly
  await page.mouse.down();
  await page.waitForTimeout(400);
  OUT.afterDown = { task: await T(), rings: await rings() };
  const tgt = t.target;
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    const x = p0.x + (tgt.x - p0.x) * (i / steps);
    const y = p0.y + (tgt.y - p0.y) * (i / steps);
    await page.mouse.move(x, y);
    await page.waitForTimeout(70);
    if (i === 7) { OUT.midDrag = { task: await T(), rings: await rings() }; await L.shot(page, 'drag-mid'); }
  }
  await page.waitForTimeout(400);
  OUT.nearTarget = { rings: await rings() };
  await L.shot(page, 'drag-near-target');
  await page.mouse.up();
  await page.waitForTimeout(1200);
  t = await T();
  OUT.afterDrop1 = t;
  OUT.noteAfterDrop1 = await page.evaluate(() => {
    const n = document.querySelector('.ch1-task-note');
    const toast = [...document.querySelectorAll('[class*=note], [class*=toast], [role=status]')].filter(e => e.offsetParent !== null).map(e => e.className + ' :: ' + e.textContent.trim().slice(0, 100));
    return { note: n ? n.textContent.trim().slice(0, 140) : null, statusy: toast };
  });
  await L.shot(page, 'drag-dropped-1');

  // second prop: far-drop (should return), then proper drop
  t = await T();
  const rem = t.props.find(p => !p.placed);
  if (rem) {
    const start = { x: rem.x, y: rem.y };
    await page.mouse.move(rem.x, rem.y, { steps: 6 });
    await page.mouse.down();
    await page.waitForTimeout(300);
    // drag far away (left side of screen)
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(rem.x + (250 - rem.x) * i / 10, rem.y + (350 - rem.y) * i / 10);
      await page.waitForTimeout(60);
    }
    await L.shot(page, 'drag-far');
    await page.mouse.up();
    await page.waitForTimeout(1500);
    const t2 = await T();
    const p2 = t2.props.find(p => p.id === rem.id);
    OUT.farDrop = { placed: p2.placed, returnedNear: Math.hypot(p2.x - start.x, p2.y - start.y) < 80, pos: { x: +p2.x.toFixed(0), y: +p2.y.toFixed(0) }, start: { x: +start.x.toFixed(0), y: +start.y.toFixed(0) } };
    OUT.farDropNote = await page.evaluate(() => {
      const els = [...document.querySelectorAll('[role=status], [class*=note], [class*=hint]')].filter(e => e.offsetParent !== null);
      return els.map(e => e.className + ' :: ' + e.textContent.trim().slice(0, 120));
    });
    await L.shot(page, 'drag-after-far');
    // now drop properly
    const t3 = await T();
    const p3 = t3.props.find(p => !p.placed);
    if (p3) {
      await page.mouse.move(p3.x, p3.y, { steps: 6 });
      await page.mouse.down();
      await page.waitForTimeout(250);
      for (let i = 1; i <= 12; i++) {
        await page.mouse.move(p3.x + (t3.target.x - p3.x) * i / 12, p3.y + (t3.target.y - p3.y) * i / 12);
        await page.waitForTimeout(60);
      }
      await page.mouse.up();
      await page.waitForTimeout(1500);
      OUT.afterDrop2 = await T();
      OUT.doneState = await page.evaluate(() => {
        const d = document.querySelector('.ch1-task-done');
        const panel = !!document.querySelector('.ch1-task');
        const status = [...document.querySelectorAll('[role=status]')].filter(e => e.offsetParent !== null).map(e => e.textContent.trim().slice(0, 120));
        return { done: d ? d.textContent.trim().slice(0, 140) : null, panelOpen: panel, status };
      });
      await L.shot(page, 'drag-complete');
    }
  }
  OUT.errors = errs.length;
  OUT.uniqueErrors = [...new Set(errs.map(e => e.slice(0, 100)))].slice(0, 4);
  await browser.close();
  fs.writeFileSync('result-drag.json', JSON.stringify(OUT, null, 2));
  console.log('WROTE result-drag.json');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
