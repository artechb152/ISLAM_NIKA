const fs = require('fs');
const L = require('./lib');

const SPEC = {
  'yemen-heights': { kind: 'choose', right: 0, wrong: 1, locked: true },
  'night-camp':    { kind: 'choose', right: 0, wrong: 1 },
  'border-post':   { kind: 'choose', right: 0, wrong: 1, locked: true },
  'narrow-pass':   { kind: 'choose', right: 0, wrong: 1, locked: true },
  'mecca':         { kind: 'choose', right: 0, wrong: 1, locked: true },
  'loading-road':  { kind: 'multi', rights: [0, 1] },
  'yathrib':       { kind: 'sort', map: [0,0,1,1,0], wrongItem: 0, wrongBin: 1 },
  'monastery':     { kind: 'sort', map: [0,0,0,0,1], wrongItem: 0, wrongBin: 1, locked: true },
};

const q = (s) => s ? s.replace(/\s+/g,' ').trim().slice(0,140) : s;

async function fitCheck(page) {
  return page.evaluate(() => {
    const card = document.querySelector('.ch1-task-card');
    if (!card) return { present: false };
    const r = card.getBoundingClientRect();
    const cs = getComputedStyle(card);
    const btns = [...card.querySelectorAll('button')];
    const close = btns.find(b => /אחר כך|הלאה/.test(b.textContent));
    const cb = close ? close.getBoundingClientRect() : null;
    const inView = (b) => !!b && b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth;
    return {
      present: true, vw: innerWidth, vh: innerHeight,
      card: { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
      cardInView: inView(r),
      overflowY: cs.overflowY, scrollH: card.scrollHeight, clientH: card.clientHeight,
      scrollable: card.scrollHeight > card.clientHeight + 2,
      closeText: close ? close.textContent.trim() : null,
      closeInView: inView(cb),
      anyBtnClipped: btns.some(b => { const x = b.getBoundingClientRect(); return x.bottom > innerHeight || x.top < 0; }),
    };
  });
}

const noteState = (page) => page.evaluate(() => {
  const n = document.querySelector('.ch1-task-note');
  const d = document.querySelector('.ch1-task-done');
  const p = document.querySelector('.ch1-task-progress');
  const opts = [...document.querySelectorAll('.ch1-task-options button, .ch1-task-tray button')].map(b => ({ dis: b.disabled, cls: b.className, t: b.textContent.trim().slice(0,40) }));
  return { note: n ? { cls: n.className, text: n.textContent.trim() } : null, done: d ? d.textContent.trim() : null, progress: p ? p.textContent.trim() : null, opts };
});

const panelOpen = (page) => page.evaluate(() => !!document.querySelector('.ch1-task'));
const hud = (page) => page.evaluate(() => {
  const g = document.querySelector('.hud-goal');
  return g ? g.textContent.replace(/\s+/g,' ').trim() : null;
});

async function clickOption(page, idx) {
  await page.locator('.ch1-task-options button').nth(idx).click();
  await page.waitForTimeout(800);
}
async function sortPlace(page, itemIdx, binIdx) {
  const items = page.locator('.ch1-task-tray button');
  await items.nth(itemIdx).click();
  await page.waitForTimeout(350);
  await page.locator('.ch1-task-rings button, .ch1-task-bins button').nth(binIdx).click();
  await page.waitForTimeout(800);
}

async function reEnter(page) {
  try {
    const btn = page.locator('button, a, [role=button]').filter({ hasText: /התחילו|המשיכו/ }).first();
    await btn.waitFor({ state: 'visible', timeout: 12000 });
    await btn.click();
  } catch (e) {}
  await page.waitForFunction(() => !!window.__ch1Live, null, { timeout: 30000 });
  await page.waitForFunction(() => { const el = document.querySelector('.ch1-arrive'); return !el || el.classList.contains('is-gone'); }, null, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(400);
}

(async () => {
  const region = process.argv[2];
  const spec = SPEC[region];
  const R = { region, errors: [], phases: {} };
  const errs = [];
  let phase = 'boot';
  const mark = (m) => { phase = m; };

  // ---------- Browser A: 1902x942, mouse flow ----------
  const { browser, ctx } = await L.launch(1902, 942);
  await L.seedInit(ctx, region);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push('[' + phase + '] ' + String(e).split('\n')[0]));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[' + phase + '][console] ' + m.text().slice(0,200)); });

  mark('enter'); await L.enter(page, region);

  if (spec.locked) {
    mark('locked-open');
    const opened = await L.openStation(page, region);
    const st = opened ? await noteState(page) : null;
    const lockTexts = opened ? await page.evaluate(() => [...document.querySelectorAll('.ch1-task-lock, .ch1-task-observe, .ch1-task-hint')].map(e => e.textContent.trim().slice(0,120))) : [];
    R.phases.locked = { opened, lockTexts: [...new Set(lockTexts)] };
    await L.shot(page, region + '-locked-1902');
    const c = page.locator('.ch1-task-foot button').filter({ hasText: 'אחר כך' });
    if (opened && await c.count()) { await c.click(); await page.waitForTimeout(400); }
    else if (opened) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
  }

  mark('finds');
  const findResults = [];
  for (const [fx, fz] of L.STATIONS[region].finds) {
    const got = await L.pickFind(page, fx, fz);
    findResults.push({ fx, fz, got });
  }
  R.phases.finds = findResults;

  mark('open-1902');
  const opened = await L.openStation(page, region);
  R.phases.open1902 = { opened };
  R.phases.fit1902 = await fitCheck(page);
  await L.shot(page, region + '-panel-1902');

  mark('escape');
  if (spec.kind === 'sort') { await page.locator('.ch1-task-tray button').first().click(); await page.waitForTimeout(300); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  const closedByEsc = !(await panelOpen(page));
  const reopened = await L.openStation(page, region);
  const afterEsc = await noteState(page);
  R.phases.escape = { closedByEsc, reopened, progressAfter: afterEsc.progress, selectedAfter: afterEsc.opts.filter(o => (o.cls||'').includes('is-picked') || (o.cls||'').includes('pressed')).length };

  mark('partial');
  let partialDesc = '';
  if (spec.kind === 'choose') { await clickOption(page, spec.wrong); partialDesc = 'clicked wrong option'; }
  else if (spec.kind === 'multi') { await clickOption(page, spec.rights[0]); partialDesc = 'placed 1 of 2'; }
  else { await sortPlace(page, 1, spec.map[1]); partialDesc = 'sorted 1 of 5 correctly'; }
  const beforeReload = await noteState(page);
  mark('reload');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await reEnter(page);
  const nextDlg = await page.evaluate(() => !!document.querySelector('[data-nextjs-dialog]'));
  const hudAfter = await hud(page);
  const reopenAfterReload = await L.openStation(page, region);
  const stateAfterReload = reopenAfterReload ? await noteState(page) : null;
  R.phases.reload = { partialDesc, progressBefore: beforeReload.progress, noteBefore: q(beforeReload.note && beforeReload.note.text), nextDlg, hudAfter, reopenAfterReload, progressAfterReload: stateAfterReload ? stateAfterReload.progress : null, findsStillNeeded: stateAfterReload ? stateAfterReload.opts.filter(o => (o.cls||'').includes('is-locked')).length : null };
  await L.shot(page, region + '-after-reload');

  mark('feedback');
  if (!(await panelOpen(page))) await L.openStation(page, region);
  const fb = { steps: [] };
  if (spec.kind === 'choose') {
    await clickOption(page, spec.wrong);
    let s = await noteState(page);
    fb.steps.push({ act: 'wrong', note: s.note && { cls: s.note.cls, text: q(s.note.text) }, optsDisabled: s.opts.map(o=>o.dis) });
    await L.shot(page, region + '-wrong');
    await page.waitForFunction(() => { const b = document.querySelectorAll('.ch1-task-options button'); return [...b].some(x => !x.disabled); }, null, { timeout: 9000 }).catch(() => {});
    s = await noteState(page);
    fb.steps.push({ act: 'after-wait', optsDisabled: s.opts.map(o=>o.dis) });
    await clickOption(page, spec.right);
    s = await noteState(page);
    fb.steps.push({ act: 'right', note: s.note && { cls: s.note.cls, text: q(s.note.text) }, done: q(s.done) });
    await L.shot(page, region + '-right');
  } else if (spec.kind === 'multi') {
    for (let i = 0; i < 3; i++) {
      const btns = await page.locator('.ch1-task-options button').all();
      if (!btns.length) break;
      const enabledIdx = [];
      for (let k = 0; k < btns.length; k++) if (!(await btns[k].isDisabled())) enabledIdx.push(k);
      if (!enabledIdx.length) break;
      await clickOption(page, enabledIdx[0]);
      const s = await noteState(page);
      fb.steps.push({ act: 'place', note: s.note && q(s.note.text), progress: s.progress, done: q(s.done) });
      if (s.done) break;
    }
    await L.shot(page, region + '-right');
  } else {
    await sortPlace(page, spec.wrongItem, spec.wrongBin);
    let s = await noteState(page);
    fb.steps.push({ act: 'wrong-sort', note: s.note && { cls: s.note.cls, text: q(s.note.text) }, progress: s.progress });
    await L.shot(page, region + '-wrong');
    const ALL = { 'yathrib': ['התמרים','השירה','הריב','הדת','הציפייה'], 'monastery': ['צניעות','דאגה','התבודדות','מנהגים','שורשי'] }[region];
    for (let guard = 0; guard < 12; guard++) {
      const labels = await page.locator('.ch1-task-tray button').allTextContents();
      if (!labels.length) break;
      const first = labels[0];
      const oi = ALL.findIndex(p => first.startsWith(p));
      await sortPlace(page, 0, spec.map[oi]);
      s = await noteState(page);
      fb.steps.push({ act: 'place ' + first.slice(0,16), note: s.note && q(s.note.text), progress: s.progress, done: q(s.done) });
      if (s.done) break;
    }
    await L.shot(page, region + '-right');
  }
  R.phases.feedback = fb;

  mark('post-done');
  const adv = page.locator('.ch1-task-foot button.is-primary');
  if (await adv.count()) { await adv.click(); await page.waitForTimeout(700); }
  const closedAfterDone = !(await panelOpen(page));
  const reopenDone = await L.openStation(page, region);
  const doneState = reopenDone ? await noteState(page) : null;
  R.phases.postDone = { closedAfterDone, reopenAfterComplete: reopenDone, doneProgress: doneState ? doneState.progress : null, hud: await hud(page) };
  if (reopenDone) await L.shot(page, region + '-reopen-done');

  await browser.close();
  R.errors = errs.slice(0, 400);
  R.errorSummary = { count: errs.length, unique: [...new Set(errs.map(e => e.replace(/^\[[^\]]*\]/, '').trim().slice(0,120)))].slice(0, 6), phases: [...new Set(errs.map(e => (e.match(/^\[([^\]]*)\]/)||[])[1]))] };
  delete R.errors;

  // ---------- Browser B: 1366x768, keyboard-only ----------
  const errsB = [];
  const B = await L.launch(1366, 768);
  await L.seedInit(B.ctx, region);
  const pb = await B.ctx.newPage();
  pb.on('pageerror', (e) => errsB.push(String(e).split('\n')[0]));
  await L.enter(pb, region);
  for (const [fx, fz] of L.STATIONS[region].finds) await L.pickFind(pb, fx, fz);
  const openedB = await L.openStation(pb, region);
  R.phases.fit1366 = await fitCheck(pb);
  await L.shot(pb, region + '-panel-1366');
  const kb = { openedB, focusTrace: [] };
  kb.initialFocus = await pb.evaluate(() => document.activeElement ? document.activeElement.tagName + '|' + (document.activeElement.textContent||'').trim().slice(0,30) : null);
  for (let i = 0; i < 14; i++) {
    await pb.keyboard.press('Tab');
    await pb.waitForTimeout(120);
    const f = await pb.evaluate(() => {
      const a = document.activeElement; if (!a) return null;
      const inPanel = !!a.closest('.ch1-task');
      return { t: a.tagName, txt: (a.textContent||'').trim().slice(0,30), inPanel, cls: (a.className||'').toString().slice(0,40) };
    });
    kb.focusTrace.push(f);
    if (f && f.inPanel) break;
  }
  const focusByText = async (needle, max = 30) => {
    for (let i = 0; i < max; i++) {
      const f = await pb.evaluate(() => { const a=document.activeElement; return a ? (a.textContent||'').trim() : ''; });
      if (f.includes(needle)) return true;
      await pb.keyboard.press('Tab'); await pb.waitForTimeout(90);
    }
    return false;
  };
  try {
    if (spec.kind === 'choose') {
      const labels = await pb.locator('.ch1-task-options button').allTextContents();
      const target = labels[spec.right].slice(0, 12);
      kb.foundRight = await focusByText(target);
      if (kb.foundRight) { await pb.keyboard.press('Enter'); await pb.waitForTimeout(900); }
      const s = await noteState(pb);
      kb.done = !!s.done; kb.noteCls = s.note && s.note.cls;
      if (s.done) { kb.advFocused = await focusByText('הלאה'); if (kb.advFocused) { await pb.keyboard.press('Enter'); await pb.waitForTimeout(600); } }
      kb.closed = !(await panelOpen(pb));
    } else if (spec.kind === 'multi') {
      for (let n = 0; n < 2; n++) {
        const lab = (await pb.locator('.ch1-task-options button:not([disabled])').allTextContents())[0];
        if (!lab) break;
        if (!(await focusByText(lab.slice(0, 6)))) break;
        await pb.keyboard.press('Enter'); await pb.waitForTimeout(900);
      }
      const s = await noteState(pb);
      kb.done = !!s.done;
      if (s.done) { if (await focusByText('הלאה')) { await pb.keyboard.press('Enter'); await pb.waitForTimeout(600); } }
      kb.closed = !(await panelOpen(pb));
    } else {
      const ALL = { 'yathrib': ['התמרים','השירה','הריב','הדת','הציפייה'], 'monastery': ['צניעות','דאגה','התבודדות','מנהגים','שורשי'] }[region];
      const binLabels = { 'yathrib': ['המעגל המשותף','בבית פנימה'], 'monastery': ['הלך איתם','נשאר כאן'] }[region];
      for (let guard = 0; guard < 6; guard++) {
        const labels = await pb.locator('.ch1-task-tray button').allTextContents();
        if (!labels.length) break;
        const oi = ALL.findIndex(p => labels[0].startsWith(p));
        if (!(await focusByText(labels[0].slice(0, 8)))) break;
        await pb.keyboard.press('Enter'); await pb.waitForTimeout(400);
        if (!(await focusByText(binLabels[spec.map[oi]].slice(0, 8)))) break;
        await pb.keyboard.press('Enter'); await pb.waitForTimeout(800);
      }
      const s = await noteState(pb);
      kb.done = !!s.done;
      if (s.done) { if (await focusByText('הלאה')) { await pb.keyboard.press('Enter'); await pb.waitForTimeout(600); } }
      kb.closed = !(await panelOpen(pb));
    }
  } catch (e) { kb.err = String(e).slice(0, 200); }
  R.phases.keyboard = kb;
  R.errorsB = errsB.length;
  await L.shot(pb, region + '-kb-final');
  await B.browser.close();

  fs.writeFileSync('result-' + region + '.json', JSON.stringify(R, null, 2));
  console.log('WROTE result-' + region + '.json  errorsA=' + errs.length + ' errorsB=' + errsB.length);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
