/* התפילה.
   LIVE: pr-v1 (the day cycle) and pr-v2 (the qibla map). The check moved to mech-checks.js,
   which matches each prayer to its time as the spec asks.
   RETIRED, code kept intact: 06, 08, 09, 11, 12 — their ids are absent from data.js, so the
   engine never reaches them. Their source text now reads as plain content screens. */
(function () {
  'use strict';
  var M = window.CH6M;

  function range(api, label, min, max, val) {
    var box = api.el('div', 'track');
    var line = api.el('div', 'track-line');
    line.setAttribute('aria-hidden', 'true');
    var r = api.el('input');
    r.type = 'range'; r.min = String(min); r.max = String(max); r.value = String(val); r.step = '1';
    r.className = 'track-range';
    r.setAttribute('aria-label', label);
    box.appendChild(line); box.appendChild(r);
    return { box: box, range: r, line: line };
  }

  /* ================= 06 — מהמסע הלילי לחמש תפילות ================= */
  M['06'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s06');

    var sky = el('div', 's06-sky');
    var beam = el('div', 's06-beam');
    beam.setAttribute('aria-hidden', 'true');
    sky.appendChild(beam);

    /* two readings that cannot be reconciled into one number */
    var claims = [
      { t: 'שתי תפילות', s: 'נכתב במקום אחד' },
      { t: '„התפילה התיכונה”', s: 'נכתב במקום אחר' }
    ];
    var pair = el('div', 's06-pair');
    var nodes = claims.map(function (c) {
      var d = el('div', 's06-claim');
      d.appendChild(el('b', null, c.t));
      d.appendChild(el('span', null, c.s));
      pair.appendChild(d);
      return d;
    });
    var joinLine = el('div', 's06-join');
    joinLine.setAttribute('aria-hidden', 'true');
    pair.appendChild(joinLine);
    sky.appendChild(pair);

    var five = el('div', 's06-five');
    five.hidden = true;
    ['אלפג׳ר', 'אלט׳הר', 'אלעצר', 'אלמע׳רב', 'אלעשאא׳'].forEach(function (n, i) {
      var d = el('span', 's06-dot');
      d.style.setProperty('--n', i);
      d.setAttribute('title', n);
      five.appendChild(d);
    });
    sky.appendChild(five);

    var tryBtn = el('button', 'mech-btn mech-btn-primary');
    tryBtn.type = 'button';
    tryBtn.textContent = 'לחבר את שתי נקודות המידע';

    tryBtn.addEventListener('click', function () {
      nodes.forEach(function (n) { n.classList.add('is-pull'); });
      joinLine.classList.add('is-strained');
      api.highlight(1);
      setTimeout(function () {
        nodes.forEach(function (n) { n.classList.remove('is-pull'); });
        joinLine.classList.remove('is-strained');
        joinLine.classList.add('is-broken');
        five.hidden = false;
        requestAnimationFrame(function () { five.classList.add('is-in'); });
        tryBtn.disabled = true;
        tryBtn.textContent = 'שתי נקודות המידע נבדקו';
        api.complete();
        api.say('שתי נקודות המידע אינן מצטרפות למספר חד-משמעי. קביעת חמש תפילות התפתחה ככל הנראה בתקופה מאוחרת יותר.', 'ok');
        hint.classList.add('is-gone');
      }, api.reduced ? 10 : 900);
    });

    wrap.appendChild(sky);
    wrap.appendChild(tryBtn);
    api.stage.appendChild(wrap);
    var hint = api.hint('נסו לחבר את שתי נקודות המידע שבקוראן');
    api.highlight(0);
    if (api.done()) tryBtn.click();
  };

  /* ================= 07 — יום שמסתובב סביבך ================= */
  M['pr-v1'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s07');

    /* one continuous dome from dawn to night; para indexes match the source order */
    var STOPS = [
      { at: 0, name: 'תפילת השחר', ar: 'צלאה אלפג׳ר', para: 1, sky: '#2b2038', sunX: 6, sunY: 62, glow: '#e8b56a' },
      { at: 25, name: 'תפילת הצהריים', ar: 'צלאה אלט׳הר', para: 2, sky: '#8fc4e8', sunX: 50, sunY: 8, glow: '#fff4cf' },
      { at: 50, name: 'תפילת אחר הצהריים', ar: 'צלאה אלעצר', para: 3, sky: '#b8cfe0', sunX: 72, sunY: 30, glow: '#ffe2a8', shadow: true },
      { at: 75, name: 'תפילת הערב', ar: 'צלאה אלמע׳רב', para: 4, sky: '#c9713f', sunX: 92, sunY: 62, glow: '#ff9d4d' },
      { at: 100, name: 'תפילת הלילה', ar: 'צלאה אלעשאא׳', para: 5, sky: '#1a1630', sunX: 100, sunY: 82, glow: '#7f8fc4' }
    ];

    var dome = el('div', 's07-dome');
    var sun = el('div', 's07-sun');
    sun.setAttribute('aria-hidden', 'true');
    dome.appendChild(sun);

    /* the shadow matters at אלעצר, where object and shadow reach the same size */
    var shadowBox = el('div', 's07-shadow-box');
    shadowBox.setAttribute('aria-hidden', 'true');
    shadowBox.appendChild(el('div', 's07-obj'));
    shadowBox.appendChild(el('div', 's07-shd'));
    dome.appendChild(shadowBox);

    var label = el('div', 's07-label');
    label.setAttribute('role', 'status');
    label.setAttribute('aria-live', 'polite');
    dome.appendChild(label);

    var marks = el('div', 's07-marks');
    marks.setAttribute('aria-hidden', 'true');
    STOPS.forEach(function (S) {
      var m = el('span', 's07-mark');
      m.style.insetInlineStart = S.at + '%';
      marks.appendChild(m);
    });
    dome.appendChild(marks);

    var t = range(api, 'סיבוב כיפת השמים לאורך היום', 0, 100, 0);
    var seen = {};

    function nearest(v) {
      var best = STOPS[0], d = 1e9;
      STOPS.forEach(function (S) { var k = Math.abs(v - S.at); if (k < d) { d = k; best = S; } });
      return { S: best, d: d };
    }

    function sync() {
      var v = +t.range.value;
      var n = nearest(v), S = n.S;
      dome.style.setProperty('--sky', S.sky);
      dome.style.setProperty('--glow', S.glow);
      sun.style.insetInlineStart = S.sunX + '%';
      sun.style.insetBlockStart = S.sunY + '%';
      shadowBox.classList.toggle('is-equal', !!S.shadow);
      shadowBox.style.opacity = (S.at >= 25 && S.at <= 75) ? '1' : '0';
      t.line.style.setProperty('--fill', v + '%');

      label.innerHTML = '';
      label.appendChild(el('b', null, S.name));
      label.appendChild(el('span', null, S.ar));
      api.highlight(S.para);

      if (n.d < 13) {
        seen[S.name] = true;
        if (Object.keys(seen).length === 5 && !api.done()) {
          api.complete();
          api.say('חמש התחנות בוקרו: מעלות השחר, דרך חצות היום ואחר הצהריים, אל השקיעה והלילה.', 'ok');
          hint.classList.add('is-gone');
        }
      }
    }
    t.range.addEventListener('input', sync);

    wrap.appendChild(dome);
    wrap.appendChild(t.box);
    api.stage.appendChild(wrap);
    var hint = api.hint('סובבו את השמים לאורך היום ועצרו בכל אחת מחמש התחנות');
    if (api.done()) STOPS.forEach(function (S) { seen[S.name] = true; });
    sync();
  };

  /* ================= 08 — ממים לכוונה ================= */
  M['08'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s08');

    var ZONES = [
      { k: 'head', name: 'שיער הראש והזקן', y: 8, w: 30 },
      { k: 'face', name: 'הפנים', y: 26, w: 26 },
      { k: 'hands', name: 'הידיים', y: 50, w: 60 },
      { k: 'feet', name: 'הרגליים', y: 76, w: 34 }
    ];
    var washed = {};

    var body = el('div', 's08-body');
    var noise = el('div', 's08-noise');
    noise.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 22; i++) {
      var n = el('span');
      n.style.setProperty('--x', ((i * 37) % 100) + '%');
      n.style.setProperty('--y', ((i * 53) % 100) + '%');
      n.style.setProperty('--d', ((i % 7) * 0.3).toFixed(2) + 's');
      noise.appendChild(n);
    }
    body.appendChild(noise);

    var zoneEls = ZONES.map(function (Z) {
      var b = el('button', 's08-zone');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.style.cssText = 'inset-block-start:' + Z.y + '%;width:' + Z.w + '%';
      b.appendChild(el('span', 's08-zname', Z.name));
      var wash = function () {
        if (washed[Z.k]) return;
        washed[Z.k] = true;
        b.classList.add('is-wet');
        b.setAttribute('aria-pressed', 'true');
        api.highlight(0);
        if (Object.keys(washed).length === ZONES.length) openStill();
      };
      b.addEventListener('click', wash);
      /* dragging water across works too, but the button is the real control */
      b.addEventListener('pointerenter', function (e) { if (e.buttons === 1) wash(); });
      body.appendChild(b);
      return b;
    });

    var still = el('div', 's08-still');
    still.hidden = true;
    var ringWrap = el('div', 's08-ring');
    ringWrap.setAttribute('aria-hidden', 'true');
    var ringFill = el('div', 's08-ring-fill');
    ringWrap.appendChild(ringFill);
    var stillBtn = el('button', 'mech-btn mech-btn-primary s08-hold');
    stillBtn.type = 'button';
    stillBtn.textContent = 'החזיקו לרגע של כוונה';
    still.appendChild(el('p', 's08-still-text', 'ההיטהרות הושלמה. עכשיו רגע של שקט — נייה, כוונה.'));
    still.appendChild(ringWrap);
    still.appendChild(stillBtn);

    function openStill() {
      still.hidden = false;
      noise.classList.add('is-calm');
      api.highlight(1);
    }

    var raf = null, holdStart = 0;
    function beginHold() {
      if (api.done()) return;
      holdStart = performance.now();
      body.classList.add('is-holding');
      var step = function () {
        var p = Math.min(1, (performance.now() - holdStart) / 2000);
        ringFill.style.setProperty('--p', (p * 100) + '%');
        if (p >= 1) { endHold(true); return; }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    function endHold(ok) {
      cancelAnimationFrame(raf);
      body.classList.remove('is-holding');
      if (ok) {
        ringFill.style.setProperty('--p', '100%');
        stillBtn.disabled = true;
        stillBtn.textContent = 'הכוונה הושלמה';
        api.complete();
        api.say((api.screen.feedback || [])[0] || '', 'ok');
        hint.classList.add('is-gone');
      } else {
        ringFill.style.setProperty('--p', '0%');
      }
    }
    stillBtn.addEventListener('pointerdown', beginHold);
    stillBtn.addEventListener('pointerup', function () { endHold(false); });
    stillBtn.addEventListener('pointerleave', function () { endHold(false); });
    /* keyboard gets the same 2-second dwell rather than a shortcut */
    stillBtn.addEventListener('keydown', function (e) {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); beginHold(); }
    });
    stillBtn.addEventListener('keyup', function (e) {
      if (e.key === ' ' || e.key === 'Enter') endHold(false);
    });

    wrap.appendChild(body);
    wrap.appendChild(still);
    api.stage.appendChild(wrap);
    var hint = api.hint('העבירו מים על האזורים המוזכרים בטקסט');
    api.highlight(0);
    if (api.done()) {
      ZONES.forEach(function (Z, i) {
        washed[Z.k] = true;
        zoneEls[i].classList.add('is-wet');
        zoneEls[i].setAttribute('aria-pressed', 'true');
      });
      openStill();
      ringFill.style.setProperty('--p', '100%');
      stillBtn.disabled = true;
      stillBtn.textContent = 'הכוונה הושלמה';
      hint.classList.add('is-gone');
    }
  };

  /* ================= 09 — אותה תפילה, מרחבים שונים ================= */
  M['09'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s09');

    var SPACES = [
      { k: 'road', name: 'דרך' },
      { k: 'home', name: 'בית' },
      { k: 'open', name: 'שטח פתוח' },
      { k: 'mosque', name: 'מסגד ביום שישי', friday: true }
    ];
    var visited = {};

    var scene = el('div', 's09-scene');
    var bg = el('div', 's09-bg');
    bg.setAttribute('aria-hidden', 'true');
    var figure = el('div', 's09-figure');
    figure.setAttribute('aria-hidden', 'true');
    var caption = el('div', 's09-caption');
    caption.setAttribute('role', 'status');
    caption.setAttribute('aria-live', 'polite');
    scene.appendChild(bg); scene.appendChild(figure); scene.appendChild(caption);

    var FOCI = [
      { k: 'imam', name: 'האמאם', para: 0 },
      { k: 'khutba', name: 'הדרשה (ח׳טבה)', para: 0 },
      { k: 'jama', name: 'הציבור', para: 1 }
    ];
    var lit = {};
    var fociBox = el('div', 's09-foci');
    fociBox.hidden = true;
    var fociBtns = FOCI.map(function (F) {
      var b = el('button', 's09-focus');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.textContent = F.name;
      b.addEventListener('click', function () {
        lit[F.k] = true;
        b.classList.add('is-lit');
        b.setAttribute('aria-pressed', 'true');
        api.highlight(F.para);
        check();
      });
      fociBox.appendChild(b);
      return b;
    });

    var ring = el('div', 's09-ring');
    var ringBtns = SPACES.map(function (S, i) {
      var b = el('button', 's09-space');
      b.type = 'button';
      b.textContent = S.name;
      b.addEventListener('click', function () { select(i); });
      ring.appendChild(b);
      return b;
    });

    function select(i) {
      var S = SPACES[i];
      visited[S.k] = true;
      ringBtns.forEach(function (b, k) {
        b.setAttribute('aria-current', String(k === i));
        b.classList.toggle('is-on', k === i);
      });
      scene.setAttribute('data-space', S.k);
      caption.textContent = S.friday
        ? 'ביום השישי מצווה המוסלמי להגיע למסגד ולשמוע דרשה'
        : 'רשאי להתפלל היכן שנמצא בשעת התפילה';
      fociBox.hidden = !S.friday;
      api.highlight(S.friday ? 0 : 0);
      check();
    }
    function check() {
      if (Object.keys(visited).length === SPACES.length &&
          Object.keys(lit).length === FOCI.length && !api.done()) {
        api.complete();
        api.say('התפילה אפשרית בכל מרחב; ביום שישי מתווספים המסגד, הדרשה והציבור. אישה מחויבת להתפלל כמו גבר, אך אינה מצווה ללכת למסגד לתפילת יום השישי.', 'ok');
        hint.classList.add('is-gone');
      }
    }

    wrap.appendChild(scene);
    wrap.appendChild(fociBox);
    wrap.appendChild(ring);
    api.stage.appendChild(wrap);
    var hint = api.hint('סובבו בין המרחבים; במסגד ביום שישי הפעילו את שלושת המוקדים');
    if (api.done()) {
      SPACES.forEach(function (S) { visited[S.k] = true; });
      FOCI.forEach(function (F, i) {
        lit[F.k] = true;
        fociBtns[i].classList.add('is-lit');
        fociBtns[i].setAttribute('aria-pressed', 'true');
      });
      select(3);
      hint.classList.add('is-gone');
    } else select(0);
  };

  /* ================= 10 — המחט ששינתה כיוון ================= */
  M['pr-v2'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s10');

    var map = el('div', 's10-map');
    map.appendChild(el('div', 's10-city s10-jer', 'ירושלים'));
    map.appendChild(el('div', 's10-city s10-mak', 'מכה'));
    map.appendChild(el('div', 's10-city s10-med', 'מדינה'));
    var compass = el('div', 's10-compass');
    var needle = el('div', 's10-needle');
    needle.setAttribute('aria-hidden', 'true');
    compass.appendChild(needle);
    map.appendChild(compass);

    var read = el('div', 's10-read');
    read.setAttribute('role', 'status');
    read.setAttribute('aria-live', 'polite');

    var t = range(api, 'ציר הזמן — חודשים במדינה', 0, 17, 0);

    function sync() {
      var v = +t.range.value;
      /* The needle only ever holds the two directions the source states, and it must hold
         the ones actually on the map: under RTL the chips mirror, so מכה sits down-LEFT
         (measured: dx=-211, dy=+110). 152deg aims down-right, at empty map — 208deg is
         the direction of the chip that lights up. ירושלים at 18deg (up-right) is correct. */
      var toMakkah = v >= 17;
      needle.style.transform = 'rotate(' + (toMakkah ? 208 : 18) + 'deg)';
      map.classList.toggle('is-makkah', toMakkah);
      t.line.style.setProperty('--fill', (v / 17 * 100) + '%');
      read.innerHTML = '';
      read.appendChild(el('b', null, 'חודש ' + v + ' מתוך 17'));
      read.appendChild(el('span', null, toMakkah
        ? 'ההתגלות (קוראן 2:144) — הכיוון מופנה למכה'
        : 'כיוון התפילה: ירושלים'));
      api.highlight(toMakkah ? 0 : 1);
      if (toMakkah && !api.done()) {
        api.complete();
        api.say('בנקודת ההתגלות הופנה כיוון התפילה מירושלים למכה.', 'ok');
        hint.classList.add('is-gone');
      }
    }
    t.range.addEventListener('input', sync);

    wrap.appendChild(map);
    wrap.appendChild(read);
    wrap.appendChild(t.box);
    api.stage.appendChild(wrap);
    var hint = api.hint('גררו את ציר הזמן עד לנקודת השינוי');
    if (api.done()) t.range.value = '17';
    sync();
  };

  /* ================= 11 — שני סימנים שנשארו מן הכיוון הראשון ================= */
  M['11'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s11');

    var map = el('div', 's11-map');
    var now = el('div', 's11-layer s11-now');
    now.appendChild(el('div', 's11-tag s11-tag-med', 'מדינה — מסגד בעל שני כיווני התפילה'));
    var past = el('div', 's11-layer s11-past');
    past.appendChild(el('div', 's11-tag s11-tag-jer', 'ירושלים — כיוון התפילה הראשון'));
    map.appendChild(now); map.appendChild(past);

    var t = range(api, 'החלקת שכבת העבר מעל שכבת ההווה', 0, 100, 50);
    var sawPast = false, sawNow = false;

    function sync() {
      var v = +t.range.value;
      past.style.clipPath = 'inset(0 0 0 ' + (100 - v) + '%)';
      t.line.style.setProperty('--fill', v + '%');
      if (v > 72) { sawPast = true; api.highlight(1); }
      if (v < 28) { sawNow = true; api.highlight(2); }
      if (sawPast && sawNow && !api.done()) {
        api.complete();
        api.say('שני הסימנים נחשפו: קדושתה של ירושלים ככיוון התפילה הראשון, והמסגד בעל שני כיווני התפילה במדינה.', 'ok');
        hint.classList.add('is-gone');
      }
    }
    t.range.addEventListener('input', sync);

    wrap.appendChild(map);
    wrap.appendChild(t.box);
    api.stage.appendChild(wrap);
    var hint = api.hint('החליקו את שכבת העבר מעל שכבת ההווה — עד לשני הקצוות');
    api.highlight(0);
    if (api.done()) { sawPast = sawNow = true; }
    sync();
  };

  /* ================= 12 — רגע החלטה: הזמן, המקום והכיוון ================= */
  M['12'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s12');

    var scene = el('div', 's12-scene');
    scene.appendChild(el('div', 's12-sun'));
    scene.appendChild(el('div', 's12-ground'));
    var needle = el('div', 's12-needle');
    needle.setAttribute('aria-hidden', 'true');
    scene.appendChild(needle);

    var answers = { when: null, where: null, dir: null };

    function group(legendText, opts, key, onPick) {
      var f = el('fieldset', 's12-group');
      f.appendChild(el('legend', null, legendText));
      var row = el('div', 's12-opts');
      opts.forEach(function (o) {
        var b = el('button', 's12-opt');
        b.type = 'button';
        b.textContent = o.label;
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          answers[key] = o.v;
          row.querySelectorAll('.s12-opt').forEach(function (x) {
            x.setAttribute('aria-pressed', 'false');
            x.classList.remove('is-on');
          });
          b.setAttribute('aria-pressed', 'true');
          b.classList.add('is-on');
          api.say('', null);
          if (onPick) onPick(o.v);
          checkBtn.disabled = !(answers.when && answers.where && answers.dir);
        });
        row.appendChild(b);
      });
      f.appendChild(row);
      return f;
    }

    var checkBtn = el('button', 'mech-btn mech-btn-primary');
    checkBtn.type = 'button';
    checkBtn.textContent = 'בדיקה';
    checkBtn.disabled = true;

    var form = el('div', 's12-form');
    form.appendChild(group('איזו תפילה מתקרבת?', [
      { label: 'תפילת הצהריים', v: 'zuhr' },
      { label: 'תפילת הערב', v: 'maghrib' },
      { label: 'תפילת הלילה', v: 'isha' }
    ], 'when'));
    form.appendChild(group('האם ניתן להתפלל כאן?', [
      { label: 'כן, במקום', v: 'here' },
      { label: 'רק במסגד', v: 'mosque' }
    ], 'where'));
    form.appendChild(group('לאיזה כיוון לפנות?', [
      { label: 'ירושלים', v: 'jer' },
      { label: 'מכה', v: 'mak' }
    ], 'dir', function (v) {
      needle.style.transform = 'rotate(' + (v === 'mak' ? 152 : 18) + 'deg)';
    }));

    checkBtn.addEventListener('click', function () {
      var fb = api.screen.feedback || [];
      var ok = answers.when === 'maghrib' && answers.where === 'here' && answers.dir === 'mak';
      if (ok) {
        api.complete();
        api.say(fb[0] || '', 'ok');
        checkBtn.disabled = true;
        scene.classList.add('is-solved');
        form.querySelectorAll('.s12-opt').forEach(function (b) { b.disabled = true; });
        hint.classList.add('is-gone');
      } else {
        api.say(fb[1] || '', 'try');
      }
    });

    wrap.appendChild(scene);
    wrap.appendChild(form);
    wrap.appendChild(checkBtn);
    api.stage.appendChild(wrap);
    var hint = api.hint('אדם בשטח פתוח לקראת שקיעה, רחוק ממסגד — קבעו את שלושת הדברים');
    if (api.done()) {
      form.querySelectorAll('.s12-opt').forEach(function (b) { b.disabled = true; });
      checkBtn.disabled = true;
      scene.classList.add('is-solved');
      api.say((api.screen.feedback || [])[0] || '', 'ok');
      hint.classList.add('is-gone');
    }
  };
})();
