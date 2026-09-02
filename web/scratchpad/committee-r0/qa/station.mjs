import { launch, openRegion, teleport, openStation, pickFind, measurePanel, noteText, shot, errorOverlay, tabToAndEnter, save, startGame } from './lib.mjs';

const ENC = {
  'yemen-heights': ['opening'],
  'night-camp': ['rawi-intro', 'camp-departure'],
  'border-post': ['envoy-empires', 'envoy-sasanian', 'rawi-zoroaster'],
  'narrow-pass': ['chief-tribes', 'rawi-ghassan'],
  'loading-road': ['rawi-seep', 'ideas-afterload'],
  'yathrib': ['jewish-arrival', 'jewish-south', 'jewish-neighbors', 'jewish-difference', 'jewish-messiah'],
  'monastery': ['monk-christianity', 'monk-influence', 'monk-practices', 'monk-quran'],
  'mecca': ['merchant-idols', 'merchant-blackstone', 'merchant-hubal', 'merchant-goddesses', 'rawi-hisham', 'rawi-abraham', 'abraha-story', 'birds-cinematic'],
};

const CFG = {
  'yemen-heights': { task: 'task-compare', x: -7.4, z: 11.0, kind: 'choose',
    finds: [[-9.4, 12.6]], findIds: ['find-terrace-inscription'],
    wrong: 'שמסופר על התקופה נכון', rights: ['שבנו'] },
  'night-camp': { task: 'task-plan-route', x: 1.6, z: -5.2, kind: 'choose',
    finds: [], findIds: [], wrong: 'מזרחה', rights: ['צפונה'] },
  'border-post': { task: 'task-toll', x: 0.4, z: -3.4, kind: 'choose',
    finds: [[-2.97, -3.44], [1.66, 0.9]], findIds: ['find-drachm', 'find-seal-byz'],
    wrong: 'חותם החרס', rights: ['מטבע הכסף'] },
  'narrow-pass': { task: 'task-protection', x: -1.4, z: 2.4, kind: 'choose',
    finds: [[3.9, 9.2], [-4.36, -10.64]], findIds: ['find-pass-inscription', 'find-pass-coin'],
    wrong: 'בכוח', rights: ['בחסותך'] },
  'loading-road': { task: 'task-loading', x: 3.92, z: -0.13, kind: 'choose',
    finds: [], findIds: [], wrong: null, rights: ['משי', 'תבלינים'] },
  'yathrib': { task: 'task-market', x: 1.4, z: 6.2, kind: 'sort',
    finds: [], findIds: [],
    wrongPair: ['התמרים', 'בבית פנימה'],
    pairs: [['התמרים', 'המעגל המשותף'], ['השירה', 'המעגל המשותף'], ['הריב', 'בבית פנימה'], ['הדת עצמה', 'בבית פנימה'], ['הציפייה למשיח', 'המעגל המשותף']] },
  'monastery': { task: 'task-monk', x: -2.6, z: 3.8, kind: 'sort',
    finds: [[1.2, 19.6], [5.2, -3.4], [-7.2, -4.6]], findIds: ['find-monk-bread', 'find-monk-hymn', 'find-monk-routine'],
    wrongPair: ['צניעות ופרישות', 'נשאר כאן'],
    pairs: [['צניעות ופרישות', 'הלך איתם'], ['דאגה לנזקקים', 'הלך איתם'], ['התבודדות', 'הלך איתם'], ['מנהגים פולחניים', 'הלך איתם'], ['שורשי האמונה', 'נשאר כאן']] },
  'mecca': { task: 'task-stones', x: -1.8, z: -12.6, kind: 'choose',
    finds: [[-11.4, -12.8], [13.2, 2.4], [-3.6, -9.8]], findIds: ['find-ansab', 'find-mecca-coin', 'find-divination'],
    wrong: 'אין להן שמות', rights: ['אללאת'] },
};

const region = process.argv[2];
const cfg = CFG[region];
if (!cfg) { console.error('unknown region'); process.exit(1); }
const R = { region, task: cfg.task, results: {}, shots: [], errorsA: [], errorsB: [] };

function log(k, v) { R.results[k] = v; console.log(k, '=>', JSON.stringify(v).slice(0, 300)); }

const optBtn = (page, text) => page.locator('.ch1-task-options button', { hasText: text }).first();
const trayBtn = (page, text) => page.locator('.ch1-sort-item', { hasText: text }).first();
const binBtn = (page, text) => page.locator('.ch1-sort-bin', { hasText: text }).first();

async function clickPair(page, item, bin) {
  await trayBtn(page, item).click();
  await page.waitForTimeout(150);
  await binBtn(page, bin).click();
  await page.waitForTimeout(300);
  return noteText(page);
}

const browser = await launch();
try {
  /* ---------- scenario A @1902x942: fresh, no finds pre-seeded ---------- */
  const A = await openRegion(browser, region, { width: 1902, height: 942, seen: ENC[region] });
  const pa = A.page;

  const open1 = await openStation(pa, cfg.x, cfg.z);
  log('A.open', open1);
  if (open1.opened) {
    log('A.fit1902', await measurePanel(pa));
    const locked = await pa.evaluate(() => ({
      observe: !!document.querySelector('.ch1-task-observe'),
      observeText: document.querySelector('.ch1-task-observe') ? document.querySelector('.ch1-task-observe').textContent.trim().slice(0, 200) : null,
      lockedBtns: [...document.querySelectorAll('.ch1-task button.is-locked')].map((b) => b.textContent.trim().slice(0, 80)),
      disabledBtns: [...document.querySelectorAll('.ch1-task button[disabled]')].length,
    }));
    log('A.lockedState', locked);
    R.shots.push(await shot(pa, region + '-A-fresh-1902'));

    await pa.keyboard.press('Escape');
    await pa.waitForTimeout(300);
    const closed = await pa.locator('.ch1-task').count() === 0;
    const re = await openStation(pa, cfg.x, cfg.z);
    log('A.escape', { closedOnEscape: closed, reopened: re.opened });
    await pa.keyboard.press('Escape');
    await pa.waitForTimeout(200);
  }

  for (let i = 0; i < cfg.finds.length; i++) {
    const [fx, fz] = cfg.finds[i];
    const r = await pickFind(pa, fx, fz);
    log('A.find.' + (cfg.findIds[i] || i), r);
  }

  const open2 = await openStation(pa, cfg.x, cfg.z);
  log('A.reopenAfterFinds', open2);
  if (open2.opened) {
    if (cfg.kind === 'choose' && cfg.wrong) {
      await optBtn(pa, cfg.wrong).click();
      await pa.waitForTimeout(350);
      log('A.wrongNote', await noteText(pa));
      R.shots.push(await shot(pa, region + '-A-wrong'));
    } else if (cfg.kind === 'sort' && cfg.wrongPair) {
      log('A.wrongNote', await clickPair(pa, cfg.wrongPair[0], cfg.wrongPair[1]));
      R.shots.push(await shot(pa, region + '-A-wrong'));
    }

    if (cfg.kind === 'choose') {
      await optBtn(pa, cfg.rights[0]).click();
      await pa.waitForTimeout(350);
      log('A.firstRightNote', await noteText(pa));
      R.shots.push(await shot(pa, region + '-A-right'));
    } else {
      log('A.firstRightNote', await clickPair(pa, cfg.pairs[0][0], cfg.pairs[0][1]));
      R.shots.push(await shot(pa, region + '-A-right'));
    }

    const partialSolved = await pa.evaluate(() => JSON.parse(localStorage.getItem('ch1:notebook:v1') || '{}').solved || []);
    const singleAnswer = (cfg.kind === 'choose' && cfg.rights.length === 1);
    log('A.solvedAfterFirstRight', partialSolved);

    if (!singleAnswer || !partialSolved.includes(cfg.task)) {
      await pa.keyboard.press('Escape');
      await pa.waitForTimeout(300);
      const re2 = await openStation(pa, cfg.x, cfg.z);
      const kept = await pa.evaluate(() => ({
        taken: [...document.querySelectorAll('.ch1-task .is-taken')].map((b) => b.textContent.trim().slice(0, 60)),
        note: document.querySelector('.ch1-task-note') ? document.querySelector('.ch1-task-note').textContent.trim().slice(0, 100) : null,
        progress: document.querySelector('.ch1-task-progress') ? document.querySelector('.ch1-task-progress').textContent.trim() : null,
      }));
      log('A.escapeMidProgress', { reopened: re2.opened, kept });
    }

    await pa.reload({ waitUntil: 'domcontentloaded' });
    await startGame(pa);
    log('A.reload.overlay', await errorOverlay(pa));
    const open3 = await openStation(pa, cfg.x, cfg.z);
    const afterReload = await pa.evaluate(() => ({
      taken: [...document.querySelectorAll('.ch1-task .is-taken')].map((b) => b.textContent.trim().slice(0, 60)),
      progress: document.querySelector('.ch1-task-progress') ? document.querySelector('.ch1-task-progress').textContent.trim() : null,
      solved: JSON.parse(localStorage.getItem('ch1:notebook:v1') || '{}').solved || [],
      found: JSON.parse(localStorage.getItem('ch1:notebook:v1') || '{}').found || [],
      doneShown: !!document.querySelector('.ch1-task-done'),
    }));
    log('A.reload.state', { opened: open3.opened, ...afterReload });
    R.shots.push(await shot(pa, region + '-A-after-reload'));

    if (open3.opened && !afterReload.doneShown) {
      if (cfg.kind === 'choose') {
        for (const t of cfg.rights) {
          const b = optBtn(pa, t);
          if (await b.isEnabled().catch(() => false)) { await b.click(); await pa.waitForTimeout(350); }
        }
      } else {
        for (const [item, bin] of cfg.pairs) {
          const b = trayBtn(pa, item);
          if (await b.count() && await b.isEnabled().catch(() => false)) {
            await clickPair(pa, item, bin);
          }
        }
      }
    }
    await pa.waitForTimeout(400);
    const doneState = await pa.evaluate(() => ({
      done: document.querySelector('.ch1-task-done') ? document.querySelector('.ch1-task-done').textContent.trim().slice(0, 120) : null,
      solved: JSON.parse(localStorage.getItem('ch1:notebook:v1') || '{}').solved || [],
    }));
    log('A.done', doneState);
    log('A.fitDone1902', await measurePanel(pa));
    R.shots.push(await shot(pa, region + '-A-done'));
    const closeBtn = pa.locator('.ch1-task-foot button.is-primary');
    if (await closeBtn.count()) { await closeBtn.click(); await pa.waitForTimeout(300); }
    log('A.closedAfterDone', await pa.locator('.ch1-task').count() === 0);
  }
  R.errorsA = A.errors;
  await A.context.close();

  /* ---------- scenario B @1366x768: pre-seeded, keyboard-only ---------- */
  const B = await openRegion(browser, region, { width: 1366, height: 768, seen: ENC[region], found: cfg.findIds });
  const pb = B.page;
  const openB = await openStation(pb, cfg.x, cfg.z);
  log('B.open', openB);
  if (openB.opened) {
    log('B.fit1366', await measurePanel(pb));
    R.shots.push(await shot(pb, region + '-B-fresh-1366'));
    const kb = [];
    if (cfg.kind === 'choose') {
      for (const t of cfg.rights) {
        const r = await tabToAndEnter(pb, t, 40);
        kb.push({ step: t, ok: r.ok, tabs: r.tabs });
        await pb.waitForTimeout(300);
      }
    } else {
      for (const [item, bin] of cfg.pairs) {
        const r1 = await tabToAndEnter(pb, item, 40);
        await pb.waitForTimeout(150);
        const r2 = await tabToAndEnter(pb, bin, 40);
        kb.push({ step: item + ' -> ' + bin, item: r1.ok, bin: r2.ok, tabs: r1.tabs + r2.tabs });
        await pb.waitForTimeout(250);
      }
    }
    const doneB = await pb.evaluate(() => ({
      done: !!document.querySelector('.ch1-task-done'),
      focusInPanel: !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('.ch1-task')),
      focusedTag: document.activeElement ? document.activeElement.tagName : null,
    }));
    let closeKb = null;
    if (doneB.done) { closeKb = await tabToAndEnter(pb, 'הלאה', 40); await pb.waitForTimeout(300); }
    const closedB = await pb.locator('.ch1-task').count() === 0;
    log('B.keyboard', { steps: kb, doneB, closeKb, closed: closedB });
    R.shots.push(await shot(pb, region + '-B-done-1366'));
  }
  R.errorsB = B.errors;
  await B.context.close();
} finally {
  await browser.close();
  save('result-' + region + '.json', R);
  console.log('SAVED result-' + region + '.json');
}
