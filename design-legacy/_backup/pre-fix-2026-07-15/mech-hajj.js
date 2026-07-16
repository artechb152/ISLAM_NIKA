/* Screens 23-28 — לעלות לרגל.
   The section is one continuous journey: every screen advances along the same road. */
(function () {
  'use strict';
  var M = window.CH6M;

  function range(api, label, min, max, val, step) {
    var box = api.el('div', 'track');
    var line = api.el('div', 'track-line');
    line.setAttribute('aria-hidden', 'true');
    var r = api.el('input');
    r.type = 'range'; r.min = String(min); r.max = String(max);
    r.value = String(val); r.step = String(step || 1);
    r.className = 'track-range';
    r.setAttribute('aria-label', label);
    box.appendChild(line); box.appendChild(r);
    return { box: box, range: r, line: line };
  }

  /* ================= 23 — מי יוצא לדרך ומתי? ================= */
  M['23'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s23');

    var road = el('div', 's23-road');
    var hazards = el('div', 's23-hazards');
    hazards.setAttribute('aria-hidden', 'true');
    ['שודדים', 'חיות רעות', 'חום המדבר'].forEach(function (h) {
      hazards.appendChild(el('span', 's23-hazard', h));
    });
    road.appendChild(hazards);
    var gateEl = el('div', 's23-gate');
    gateEl.setAttribute('aria-hidden', 'true');
    road.appendChild(gateEl);
    var dayRead = el('div', 's23-day');
    dayRead.setAttribute('role', 'status');
    dayRead.setAttribute('aria-live', 'polite');
    road.appendChild(dayRead);

    var t = range(api, 'ציר הזמן — ימי החודש ד׳ו אלחג׳ה', 1, 8, 1);
    var dateReached = false;

    function sync() {
      var v = +t.range.value;
      dateReached = v >= 8;
      road.classList.toggle('is-open-day', dateReached);
      t.line.style.setProperty('--fill', ((v - 1) / 7 * 100) + '%');
      dayRead.textContent = dateReached
        ? 'היום ה־8 לחודש ד׳ו אלחג׳ה — החודש ה־12 בלוח השנה ההג׳רי'
        : 'יום ' + v + ' בד׳ו אלחג׳ה';
      api.highlight(0);
      travBox.hidden = !dateReached;
      check();
    }
    t.range.addEventListener('input', sync);

    /* the gate opens only for the traveller the text allows — able in both respects */
    var TRAVELLERS = [
      { k: 'a', name: 'נוסע א׳', money: 'ביכולתו הכלכלית', health: 'בריאותו תקינה', ok: true },
      { k: 'b', name: 'נוסע ב׳', money: 'אין ביכולתו הכלכלית', health: 'בריאותו תקינה', ok: false },
      { k: 'c', name: 'נוסע ג׳', money: 'ביכולתו הכלכלית', health: 'מצב בריאותי המונע את המסע', ok: false }
    ];
    var checked = {};
    var chosen = null;

    var travBox = el('div', 's23-travellers');
    travBox.hidden = true;
    TRAVELLERS.forEach(function (T) {
      var b = el('button', 's23-trav');
      b.type = 'button';
      b.appendChild(el('b', null, T.name));
      b.appendChild(el('span', null, T.money));
      b.appendChild(el('span', null, T.health));
      b.addEventListener('click', function () {
        checked[T.k] = true;
        travBox.querySelectorAll('.s23-trav').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        b.classList.toggle('is-allowed', T.ok);
        b.classList.toggle('is-blocked', !T.ok);
        chosen = T;
        road.classList.toggle('is-open', !!T.ok);
        api.highlight(3);
        api.say(T.ok
          ? 'העלייה לרגל תלויה ביכולתו של האדם — הן בהיבט הכלכלי והן בהיבט הבריאותי. השער נפתח.'
          : 'העלייה לרגל אינה חובה כמו שאר מצוות היסוד; היא תלויה ביכולת. השער נשאר סגור.', T.ok ? 'ok' : 'try');
        check();
      });
      travBox.appendChild(b);
    });

    function check() {
      if (dateReached && chosen && chosen.ok && !api.done()) {
        api.complete();
        hint.classList.add('is-gone');
      }
    }

    wrap.appendChild(road);
    wrap.appendChild(travBox);
    wrap.appendChild(t.box);
    api.stage.appendChild(wrap);
    var hint = api.hint('קדמו את ציר הזמן ליום ה־8, ואז בדקו מי מן הנוסעים יכול לצאת לדרך');
    if (api.done()) { t.range.value = '8'; sync(); travBox.querySelectorAll('.s23-trav')[0].click(); }
    else sync();
  };

  /* ================= 24 — לפני שחוצים את המיקאת ================= */
  M['24'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s24');

    var PREP = [
      { k: 'shave', name: 'להתגלח', para: 1 },
      { k: 'hair', name: 'להסתפר', para: 1 },
      { k: 'nails', name: 'לקצוץ ציפורניים', para: 1 },
      { k: 'cloth1', name: 'בגד לבן המקיף את הכתף', para: 1 },
      { k: 'cloth2', name: 'בגד לבן המקיף את המותניים', para: 1 }
    ];
    var done = {};

    var field = el('div', 's24-field');
    var before = el('div', 's24-side s24-before');
    before.appendChild(el('div', 's24-side-label', 'לפני המיקאת'));
    var figure = el('div', 's24-figure');
    figure.setAttribute('aria-hidden', 'true');
    before.appendChild(figure);
    var lineEl = el('div', 's24-miqat');
    lineEl.appendChild(el('span', null, 'מיקאת'));
    var after = el('div', 's24-side s24-after');
    after.appendChild(el('div', 's24-side-label', 'מרחב נקי ופשוט'));
    field.appendChild(before); field.appendChild(lineEl); field.appendChild(after);

    var row = el('div', 's24-row');
    PREP.forEach(function (P) {
      var b = el('button', 's24-prep');
      b.type = 'button';
      b.textContent = P.name;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        done[P.k] = true;
        b.classList.add('is-done');
        b.setAttribute('aria-pressed', 'true');
        figure.setAttribute('data-step', String(Object.keys(done).length));
        api.highlight(P.para);
        cross.disabled = Object.keys(done).length !== PREP.length;
        if (!cross.disabled) {
          api.say('על הבגדים להיות ללא תפרים או כפלים, אלא חלקים. אפשר לחצות את קו המיקאת.', 'ok');
          api.highlight(2);
        }
      });
      row.appendChild(b);
    });

    var cross = el('button', 'mech-btn mech-btn-primary');
    cross.type = 'button';
    cross.textContent = 'חציית קו המיקאת';
    cross.disabled = true;
    cross.addEventListener('click', function () {
      field.classList.add('is-crossed');
      cross.disabled = true;
      cross.textContent = 'קו המיקאת נחצה';
      api.complete();
      api.say('מצב האחראם הושלם וקו המיקאת נחצה. חובת ההיטהרות מתחילה מאז שהמוסלמי מתקרב לאזור סמוך למכה.', 'ok');
      api.highlight(3);
      hint.classList.add('is-gone');
    });

    wrap.appendChild(field);
    wrap.appendChild(row);
    wrap.appendChild(cross);
    api.stage.appendChild(wrap);
    var hint = api.hint('בצעו את ההכנות המוזכרות בטקסט, ורק אז חצו את הקו');
    api.highlight(0);
    if (api.done()) {
      row.querySelectorAll('.s24-prep').forEach(function (b) { b.click(); });
      cross.click();
    }
  };

  /* ================= 25 — סיבוב וריצה ================= */
  M['25'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s25');

    var map = el('div', 's25-map');
    var kaaba = el('div', 's25-kaaba');
    var ring = el('div', 's25-ring');
    ring.setAttribute('aria-hidden', 'true');
    var walker = el('div', 's25-walker');
    walker.setAttribute('aria-hidden', 'true');
    ring.appendChild(walker);
    var counter = el('div', 's25-count');
    counter.setAttribute('role', 'status');
    counter.setAttribute('aria-live', 'polite');
    map.appendChild(ring); map.appendChild(kaaba); map.appendChild(counter);

    var laps = 0;
    var turn = el('button', 'mech-btn mech-btn-primary');
    turn.type = 'button';
    turn.textContent = 'הקפה נגד כיוון השעון';

    /* Both halves of the screen can be finished in either order, so the completion test
       belongs to neither of them — doing the run before the seven laps used to leave the
       screen finished on screen but never marked done, with "המשך" stuck disabled. */
    function check() {
      if (laps >= 7 && atSafa && atMarwa && !api.done()) {
        api.complete();
        api.say('שבע ההקפות והמסלול בין הגבעות הושלמו. המלאך גבריאל המציא מבין שתי הגבעות את מעיין הזמזם.', 'ok');
        hint.classList.add('is-gone');
      }
    }

    function paint() {
      /* counter-clockwise: negative rotation */
      walker.style.transform = 'rotate(' + (-laps * 360) + 'deg)';
      counter.textContent = laps + ' מתוך 7 הקפות';
      if (laps >= 7) {
        turn.disabled = true;
        turn.textContent = 'שבע ההקפות הושלמו';
        hills.hidden = false;
        api.highlight(1);
        check();
      }
    }
    turn.addEventListener('click', function () {
      if (laps >= 7) return;
      laps++;
      api.highlight(0);
      paint();
    });

    /* the run between the hills continues the same journey, on the same surface */
    var hills = el('div', 's25-hills');
    hills.hidden = true;
    var safa = el('div', 's25-hill', 'צפא');
    var marwa = el('div', 's25-hill', 'מרוה');
    var runner = el('div', 's25-runner');
    runner.setAttribute('aria-hidden', 'true');
    var zam = el('div', 's25-zam');
    zam.hidden = true;
    zam.textContent = 'מעיין הזמזם';
    hills.appendChild(safa); hills.appendChild(runner); hills.appendChild(marwa); hills.appendChild(zam);

    var t = range(api, 'המסע בין צפא למרוה', 0, 100, 0);
    var atSafa = false, atMarwa = false;
    function syncRun() {
      var v = +t.range.value;
      runner.style.insetInlineStart = v + '%';
      t.line.style.setProperty('--fill', v + '%');
      if (v < 6) atSafa = true;
      if (v > 94) atMarwa = true;
      if (atSafa && atMarwa) {
        zam.hidden = false;
        api.highlight(2);
        check();
      }
    }
    t.range.addEventListener('input', syncRun);

    wrap.appendChild(map);
    wrap.appendChild(turn);
    wrap.appendChild(hills);
    wrap.appendChild(t.box);
    api.stage.appendChild(wrap);
    var hint = api.hint('השלימו שבע הקפות נגד כיוון השעון, ואז עברו בין צפא למרוה');
    api.highlight(0);
    if (api.done()) {
      laps = 7; paint();
      atSafa = atMarwa = true; t.range.value = '100'; syncRun();
      hint.classList.add('is-gone');
    } else paint();
  };

  /* ================= 26 — יום ערפה ================= */
  M['26'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s26');

    var scene = el('div', 's26-scene');
    var mount = el('div', 's26-mount');
    mount.setAttribute('aria-hidden', 'true');
    var pilgrim = el('div', 's26-pilgrim');
    pilgrim.setAttribute('aria-hidden', 'true');
    var talbiya = el('div', 's26-talbiya', 'תלביה');
    talbiya.hidden = true;
    var caption = el('div', 's26-caption');
    caption.setAttribute('role', 'status');
    caption.setAttribute('aria-live', 'polite');
    scene.appendChild(mount); scene.appendChild(pilgrim);
    scene.appendChild(talbiya); scene.appendChild(caption);

    /* 0 → noon of day two; 100 → morning of day three */
    var t = range(api, 'ציר הזמן — מצהרי היום השני עד בוקר היום השלישי', 0, 100, 0);
    var climbed = false, descended = false, stood = false;

    function sync() {
      var v = +t.range.value;
      /* up the mountain to the halfway point, then down to the plain */
      var up = Math.min(1, v / 50);
      var down = Math.max(0, (v - 50) / 50);
      pilgrim.style.insetBlockEnd = (14 + up * 52 - down * 52) + '%';
      pilgrim.style.insetInlineStart = (18 + v * 0.55) + '%';
      talbiya.hidden = !(v > 8 && v < 52);
      scene.setAttribute('data-phase', v < 50 ? 'up' : (v < 96 ? 'down' : 'plain'));
      t.line.style.setProperty('--fill', v + '%');
      caption.textContent = v < 50
        ? 'עלייה להר, תוך כדי קריאת תפילות (תלביה)'
        : (v < 96 ? 'ירידה מן ההר' : 'המישור — הגיע הרגע לעמידה (וקוף)');
      if (v >= 48) climbed = true;
      if (v >= 96) { descended = true; holdBtn.hidden = false; }
      api.highlight(v < 50 ? 2 : 2);
      if (v < 8) api.highlight(1);
    }
    t.range.addEventListener('input', sync);

    var holdBtn = el('button', 'mech-btn mech-btn-primary');
    holdBtn.type = 'button';
    holdBtn.textContent = 'החזיקו לעמידה (וקוף)';
    holdBtn.hidden = true;
    var raf = null, start0 = 0;
    var wq = el('div', 's26-wq');
    wq.setAttribute('aria-hidden', 'true');
    var wqFill = el('div', 's26-wq-fill');
    wq.appendChild(wqFill);

    function begin() {
      if (stood) return;
      start0 = performance.now();
      var step = function () {
        var p = Math.min(1, (performance.now() - start0) / 2200);
        wqFill.style.setProperty('--p', (p * 100) + '%');
        if (p >= 1) { finishStand(); return; }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    function end() { cancelAnimationFrame(raf); if (!stood) wqFill.style.setProperty('--p', '0%'); }
    function finishStand() {
      cancelAnimationFrame(raf);
      stood = true;
      wqFill.style.setProperty('--p', '100%');
      holdBtn.disabled = true;
      holdBtn.textContent = 'הווקוף הושלם';
      mem.hidden = false;
      api.highlight(3);
    }
    holdBtn.addEventListener('pointerdown', begin);
    holdBtn.addEventListener('pointerup', end);
    holdBtn.addEventListener('pointerleave', end);
    holdBtn.addEventListener('keydown', function (e) {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); begin(); }
    });
    holdBtn.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') end(); });

    /* the two traditions the source attaches to the mountain */
    var MEMS = [
      { k: 'adam', name: 'אדם וחוה לאחר גירושם מגן עדן' },
      { k: 'ismail', name: 'עקדת ישמעאל' }
    ];
    var openedMem = {};
    var mem = el('div', 's26-mem');
    mem.hidden = true;
    MEMS.forEach(function (Mm) {
      var b = el('button', 's26-mem-btn');
      b.type = 'button';
      b.textContent = Mm.name;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        openedMem[Mm.k] = true;
        b.classList.add('is-on');
        b.setAttribute('aria-pressed', 'true');
        api.highlight(3);
        if (Object.keys(openedMem).length === 2 && stood && !api.done()) {
          api.complete();
          api.say('העלייה, הירידה, הווקוף ושתי שכבות המסורת הושלמו. הר ערפה נחשב להר קדוש באסלאם.', 'ok');
          hint.classList.add('is-gone');
        }
      });
      mem.appendChild(b);
    });

    wrap.appendChild(scene);
    wrap.appendChild(wq);
    wrap.appendChild(holdBtn);
    wrap.appendChild(mem);
    wrap.appendChild(t.box);
    api.stage.appendChild(wrap);
    var hint = api.hint('התקדמו על הציר: עלייה, ירידה, ואז החזיקו לעמידה');
    api.highlight(0);
    if (api.done()) {
      t.range.value = '100'; sync();
      holdBtn.hidden = false; finishStand();
      mem.querySelectorAll('.s26-mem-btn').forEach(function (b) { b.click(); });
      hint.classList.add('is-gone');
    } else sync();
  };

  /* ================= 27 — מוזדליפה ומינא ================= */
  M['27'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s27');

    var road = el('div', 's27-road');
    var traveller = el('div', 's27-trav');
    traveller.setAttribute('aria-hidden', 'true');
    var muz = el('div', 's27-place s27-muz', 'מוזדליפה');
    var mina = el('div', 's27-place s27-mina', 'מינא');
    var caption = el('div', 's27-caption');
    caption.setAttribute('role', 'status');
    caption.setAttribute('aria-live', 'polite');
    road.appendChild(muz); road.appendChild(mina);
    road.appendChild(traveller); road.appendChild(caption);

    var stones = 0;
    var stoneRead = el('div', 's27-stones');
    stoneRead.setAttribute('role', 'status');
    stoneRead.setAttribute('aria-live', 'polite');

    var pickBtn = el('button', 'mech-btn');
    pickBtn.type = 'button';
    pickBtn.textContent = 'איסוף אבן';
    pickBtn.hidden = true;
    pickBtn.addEventListener('click', function () {
      if (stones >= 3) return;
      stones++;
      stoneRead.textContent = 'נאספו ' + stones + ' אבנים';
      if (stones >= 3) { pickBtn.disabled = true; pickBtn.textContent = 'האבנים נאספו'; }
      api.highlight(1);
    });

    /* three abstract marks — no figure of a devil, no violent depiction */
    var marks = el('div', 's27-marks');
    marks.hidden = true;
    var thrown = 0;
    var markBtns = [0, 1, 2].map(function (n) {
      var b = el('button', 's27-mark');
      b.type = 'button';
      b.setAttribute('aria-label', 'השלכה לעבר סימן ' + (n + 1));
      b.addEventListener('click', function () {
        if (b.classList.contains('is-hit') || stones <= thrown) return;
        b.classList.add('is-hit');
        thrown++;
        api.highlight(2);
        if (thrown === 3 && !api.done()) {
          api.complete();
          api.say('המסלול למוזדליפה ולמינא הושלם. זריקת האבנים מסמלת את הנזיפה שקיבל השטן כאשר לא עלה בידו לפתות את אברהם.', 'ok');
          hint.classList.add('is-gone');
        }
      });
      marks.appendChild(b);
      return b;
    });

    var t = range(api, 'המסלול ממכה למוזדליפה ולמינא', 0, 100, 0);
    function sync() {
      var v = +t.range.value;
      traveller.style.insetInlineStart = v + '%';
      t.line.style.setProperty('--fill', v + '%');
      var atMuz = v > 38 && v < 66;
      var atMina = v >= 88;
      muz.classList.toggle('is-on', atMuz);
      mina.classList.toggle('is-on', atMina);
      pickBtn.hidden = !atMuz;
      marks.hidden = !atMina;
      caption.textContent = atMina ? 'מינא — ריטואל זריקת האבנים'
        : (atMuz ? 'מוזדליפה — כאן נאספות האבנים' : 'לקראת ערב, בדרך חזרה למכה');
      api.highlight(atMina ? 2 : (atMuz ? 1 : 0));
    }
    t.range.addEventListener('input', sync);

    wrap.appendChild(road);
    wrap.appendChild(pickBtn);
    wrap.appendChild(stoneRead);
    wrap.appendChild(marks);
    wrap.appendChild(t.box);
    api.stage.appendChild(wrap);
    var hint = api.hint('התקדמו בדרך: במוזדליפה אספו אבנים, ובמינא השליכו אותן לעבר שלושת הסימנים');
    if (api.done()) {
      t.range.value = '50'; sync();
      pickBtn.click(); pickBtn.click(); pickBtn.click();
      t.range.value = '100'; sync();
      markBtns.forEach(function (b) { b.click(); });
      hint.classList.add('is-gone');
    } else sync();
  };

  /* ================= 28 — חזרה למכה וברכת הדרך ================= */
  M['28'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s28');

    var days = el('div', 's28-days');
    var dayEls = [1, 2, 3, 4].map(function (n) {
      var d = el('div', 's28-day');
      d.appendChild(el('b', null, 'יום ' + n));
      if (n === 1) {
        var lamb = el('span', 's28-lamb', 'שחיטת כבש');
        d.appendChild(lamb);
        d.appendChild(el('span', 's28-overlap', 'חופף ליום האחרון של החג׳'));
      }
      days.appendChild(d);
      return d;
    });

    var t = range(api, 'ארבעת ימי חג הקורבן', 1, 4, 1);
    var lastDay = false;
    function sync() {
      var v = +t.range.value;
      dayEls.forEach(function (d, i) { d.classList.toggle('is-on', i + 1 <= v); });
      t.line.style.setProperty('--fill', ((v - 1) / 3 * 100) + '%');
      api.highlight(v === 1 ? 0 : 1);
      if (v === 4) { lastDay = true; tawafBtn.hidden = false; }
    }
    t.range.addEventListener('input', sync);

    var tawafBtn = el('button', 'mech-btn mech-btn-primary');
    tawafBtn.type = 'button';
    tawafBtn.textContent = 'הקפה נוספת סביב הכעבה';
    tawafBtn.hidden = true;
    var blessing = el('div', 's28-blessing');
    blessing.hidden = true;
    tawafBtn.addEventListener('click', function () {
      tawafBtn.disabled = true;
      tawafBtn.textContent = 'ההקפה הושלמה';
      blessing.hidden = false;
      api.highlight(2);
      if (!api.done()) {
        api.complete();
        api.say('ארבעת ימי חג הקורבן, ההקפה הנוספת והברכה נחשפו.', 'ok');
        hint.classList.add('is-gone');
      }
    });

    /* the Arabic blessing and its translation, exactly as the source gives them */
    var src = api.screen.content || [];
    var ar = el('p', 's28-ar', src[4] || '');
    ar.setAttribute('lang', 'ar');
    ar.setAttribute('dir', 'rtl');
    var he = el('p', 's28-he', src[5] || '');
    blessing.appendChild(el('div', 's28-bless-label', src[3] || ''));
    blessing.appendChild(ar);
    blessing.appendChild(he);

    wrap.appendChild(days);
    wrap.appendChild(t.box);
    wrap.appendChild(tawafBtn);
    wrap.appendChild(blessing);
    api.stage.appendChild(wrap);
    var hint = api.hint('העבירו את הזמן לאורך ארבעת ימי החג, השלימו הקפה אחרונה וחשפו את הברכה');
    if (api.done()) { t.range.value = '4'; sync(); tawafBtn.click(); }
    else sync();
  };
})();
