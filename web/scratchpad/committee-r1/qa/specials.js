const fs = require('fs');
const L = require('./lib');

(async () => {
  const OUT = { };

  // ---------- 1) night-camp forward gate at (0,0,-20) with nothing done ----------
  {
    const { browser, ctx } = await L.launch(1902, 942);
    const errs = [];
    await L.seedInit(ctx, 'night-camp');
    const page = await ctx.newPage();
    L.attachLogs(page, errs);
    await L.enter(page, 'night-camp');
    const gateInfo = () => page.evaluate(() => {
      const g = document.querySelector('.poi-marker.is-gate-marker');
      const hints = [...document.querySelectorAll('.poi-hints *')].map(e => (e.textContent||'').trim()).filter(Boolean);
      const overlays = [...document.querySelectorAll('.ch1-stage > div')].map(d => d.className).filter(c => c && !/vignette|hud-|poi-/.test(c));
      return { gateCls: g ? g.className : null, hints, overlays, url: location.href };
    });
    OUT.gateBefore = await gateInfo();
    // walk into the gate
    await L.teleport(page, 0, -17);
    await page.evaluate(() => window.__ch1Live.player.set(0, 0, -20));
    await page.waitForTimeout(1500);
    OUT.gateAttempt = await gateInfo();
    const pos1 = await page.evaluate(() => { const p = window.__ch1Live.player; return { x: +p.x.toFixed(2), z: +p.z.toFixed(2) }; });
    OUT.gateAttempt.playerPos = pos1;
    // also try walking with keys toward the gate
    await L.teleport(page, 0, -16);
    await page.keyboard.down('s'); await page.waitForTimeout(2500); await page.keyboard.up('s');
    await page.waitForTimeout(800);
    const pos2 = await page.evaluate(() => { const p = window.__ch1Live.player; return { x: +p.x.toFixed(2), z: +p.z.toFixed(2) }; });
    OUT.gateWalk = { playerPos: pos2, ...(await gateInfo()) };
    await L.shot(page, 'gate-held');
    // now complete core: R dialogue + plan task
    await page.keyboard.press('r'); await page.waitForTimeout(1200);
    OUT.rawiDialogue = await page.evaluate(() => {
      const d = [...document.querySelectorAll('[role=dialog], .ch1-dialogue, .ch1-talk')].map(x => x.className);
      const stage = [...document.querySelectorAll('.ch1-stage > div')].map(x => x.className).filter(c => c && !/vignette|hud-|poi-/.test(c));
      return { stage };
    });
    await L.shot(page, 'rawi-dialogue');
    // advance dialogue with Space until gone (max 25)
    for (let i = 0; i < 25; i++) {
      const open = await page.evaluate(() => !!document.querySelector('.ch1-dialogue, .ch1-talk, .ch1-encounter, [class*=dialog]:not([class*=task]):not([class*=find])'));
      if (!open) break;
      await page.keyboard.press(' ');
      await page.waitForTimeout(600);
      // if choices present, click first
      const choice = page.locator('.ch1-choices button, .ch1-dialogue button').first();
      if (await choice.count().catch(()=>0)) { /* leave — space may not advance choices */ }
    }
    OUT.afterDialogueStage = await page.evaluate(() => [...document.querySelectorAll('.ch1-stage > div')].map(x => x.className).filter(c => c && !/vignette|hud-|poi-/.test(c)));
    // plan task
    const opened = await L.openStation(page, 'night-camp');
    if (opened) {
      await page.locator('.ch1-task-options button').nth(0).click();
      await page.waitForTimeout(900);
      const adv = page.locator('.ch1-task-foot button.is-primary');
      if (await adv.count()) { await adv.click(); await page.waitForTimeout(900); }
    }
    OUT.taskDone = opened;
    await page.waitForTimeout(1000);
    OUT.gateAfterCore = await gateInfo();
    // walk through gate again
    await L.teleport(page, 0, -16);
    await page.keyboard.down('s'); await page.waitForTimeout(3000); await page.keyboard.up('s');
    await page.waitForTimeout(2500);
    OUT.gateAfterWalk = { url: page.url(), stage: await page.evaluate(() => [...document.querySelectorAll('.ch1-stage > div')].map(x => x.className).filter(c => c && !/vignette|hud-|poi-/.test(c))), pos: await page.evaluate(() => { const p = window.__ch1Live && window.__ch1Live.player; return p ? { x: +p.x.toFixed(2), z: +p.z.toFixed(2) } : null; }) };
    await L.shot(page, 'gate-after-core');
    OUT.gateErrors = errs.length;
    await browser.close();
  }

  // ---------- 2) Notebook (J) and Map (M) at 1366x768 ----------
  {
    const { browser, ctx } = await L.launch(1366, 768);
    const errs = [];
    await L.seedInit(ctx, 'night-camp');
    const page = await ctx.newPage();
    L.attachLogs(page, errs);
    await L.enter(page, 'night-camp');
    await page.keyboard.press('j'); await page.waitForTimeout(1000);
    OUT.notebook = await page.evaluate(() => {
      const cands = [...document.querySelectorAll('[role=dialog], [class*=journal], [class*=notebook], [class*=מחברת]')];
      const el = cands.find(c => c.offsetParent !== null) || cands[0];
      if (!el) return { open: false };
      const r = el.getBoundingClientRect();
      const scroller = [...el.querySelectorAll('*')].find(x => x.scrollHeight > x.clientHeight + 4);
      const btns = [...el.querySelectorAll('button')].map(b => ({ t: b.textContent.trim().slice(0,20), inView: (() => { const q = b.getBoundingClientRect(); return q.top >= 0 && q.bottom <= innerHeight; })() }));
      return { open: true, cls: el.className, rect: { t: +r.top.toFixed(0), b: +r.bottom.toFixed(0), l: +r.left.toFixed(0), r2: +r.right.toFixed(0) }, fits: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, scrollable: !!scroller, btns };
    });
    await L.shot(page, 'notebook-1366');
    await page.keyboard.press('Escape'); await page.waitForTimeout(600);
    OUT.notebookEscClosed = await page.evaluate(() => ![...document.querySelectorAll('[class*=journal], [class*=notebook]')].some(c => c.offsetParent !== null));
    await page.keyboard.press('m'); await page.waitForTimeout(1000);
    OUT.map = await page.evaluate(() => {
      const cands = [...document.querySelectorAll('[role=dialog], [class*=map]')].filter(c => !c.className.includes('hud-map'));
      const el = cands.find(c => c.offsetParent !== null);
      if (!el) return { open: false, all: cands.map(c=>c.className) };
      const r = el.getBoundingClientRect();
      return { open: true, cls: el.className, rect: { t: +r.top.toFixed(0), b: +r.bottom.toFixed(0), l: +r.left.toFixed(0), r2: +r.right.toFixed(0) }, fits: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, text: el.textContent.replace(/\s+/g,' ').slice(0,200) };
    });
    await L.shot(page, 'map-1366');
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    OUT.mapEscClosed = await page.evaluate(() => {
      const cands = [...document.querySelectorAll('[role=dialog], [class*=map]')].filter(c => !c.className.includes('hud-map'));
      return !cands.some(c => c.offsetParent !== null);
    });
    OUT.globalErrors = errs.length;
    await browser.close();
  }

  fs.writeFileSync('result-specials.json', JSON.stringify(OUT, null, 2));
  console.log('WROTE result-specials.json');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
