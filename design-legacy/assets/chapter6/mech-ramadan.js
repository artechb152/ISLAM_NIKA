/* צום רמדאן.
   LIVE: rm-v — the fast day. The check moved to mech-checks.js.
   RETIRED, code kept intact: 22 — the check the spec asks for here has a different
   option set and different wording, so it is authored in mech-checks.js from data.js.
   RETIRED, code kept intact: 16, 17, 19, 20, 21 — absent from data.js, never reached. */
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

  /* ================= 16 — זיכרונות בתוך הירח ================= */
  M['16'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s16');

    /* six moon phases, one per source paragraph, in the order the text tells it */
    var MEM = [
      { phase: 0, title: 'התקופה הטרום-אסלאמית', para: 0 },
      { phase: 1, title: 'מדינה', para: 1 },
      { phase: 2, title: 'צום יום הכיפורים', para: 2 },
      { phase: 3, title: 'תשובת היהודים', para: 3 },
      { phase: 4, title: 'תגובת מוחמד', para: 4 },
      { phase: 5, title: 'המעבר לצום רמדאן', para: 5 }
    ];
    var seen = {};

    var moon = el('div', 's16-moon');
    var disc = el('div', 's16-disc');
    disc.setAttribute('aria-hidden', 'true');
    var shade = el('div', 's16-shade');
    shade.setAttribute('aria-hidden', 'true');
    disc.appendChild(shade);
    moon.appendChild(disc);

    var caption = el('div', 's16-caption');
    caption.setAttribute('role', 'status');
    caption.setAttribute('aria-live', 'polite');
    moon.appendChild(caption);

    var t = range(api, 'סיבוב מופעי הירח', 0, 5, 0);

    function sync() {
      var i = +t.range.value;
      var M0 = MEM[i];
      /* The shade sweeps across the disc as the phase advances. The step must clear the
         disc over the whole range: at 40% per memory the sweep ran -100%→+100%, so it
         left the disc at BOTH ends and the six memories only ever showed three distinct
         moons (0/40/80/80/40/0% covered — 1 and 6 identical, 2 and 5 identical). */
      shade.style.transform = 'translateX(' + (-100 + i * 16) + '%)';
      t.line.style.setProperty('--fill', (i / 5 * 100) + '%');
      caption.textContent = M0.title;
      api.highlight(M0.para);
      seen[i] = true;
      if (Object.keys(seen).length === MEM.length && !api.done()) {
        api.complete();
        api.say('ששת הזיכרונות נפתחו — מן הצום הטרום-אסלאמי ועד לקביעת הצום בחודש רמדאן.', 'ok');
        hint.classList.add('is-gone');
      }
    }
    t.range.addEventListener('input', sync);

    wrap.appendChild(moon);
    wrap.appendChild(t.box);
    api.stage.appendChild(wrap);
    var hint = api.hint('סובבו את מופעי הירח — כל מופע פותח זיכרון והפסקה שלו');
    if (api.done()) MEM.forEach(function (m, i) { seen[i] = true; });
    sync();
  };

  /* ================= 17 — ליל אלקדר ================= */
  M['17'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s17');

    var grid = el('div', 's17-grid');
    var cells = [];
    for (var n = 1; n <= 30; n++) {
      var c = el('button', 's17-night');
      c.type = 'button';
      c.textContent = String(n);
      c.setAttribute('aria-label', 'לילה ' + n);
      (function (num, cell) {
        cell.addEventListener('click', function () { land(num); });
      })(n, c);
      grid.appendChild(c);
      cells.push(c);
    }

    var reveal = el('div', 's17-reveal');
    reveal.hidden = true;
    reveal.appendChild(el('b', null, 'ליל אלקדר'));
    reveal.appendChild(el('span', null, 'הלילה ה־27 לחודש'));

    var t = range(api, 'הזזת האור על פני לילות החודש', 1, 30, 1);

    function land(n) {
      t.range.value = String(n);
      sync();
    }
    function sync() {
      var v = +t.range.value;
      cells.forEach(function (c, i) { c.classList.toggle('is-lit', i + 1 === v); });
      t.line.style.setProperty('--fill', ((v - 1) / 29 * 100) + '%');
      var found = v === 27;
      reveal.hidden = !found;
      grid.classList.toggle('is-found', found);
      api.highlight(0);
      if (found && !api.done()) {
        api.complete();
        api.say('הלילה ה־27 אותר — „ליל אלקדר”, שבו ירד הקוראן בהתגלות הראשונה בשנת 610.', 'ok');
        hint.classList.add('is-gone');
      }
    }
    t.range.addEventListener('input', sync);

    wrap.appendChild(grid);
    wrap.appendChild(reveal);
    wrap.appendChild(t.box);
    api.stage.appendChild(wrap);
    var hint = api.hint('הזיזו את האור אל הלילה שבו ירד הקוראן');
    if (api.done()) t.range.value = '27';
    sync();
  };

  /* ================= 18 — להחזיק את היום עד השקיעה ================= */
  M['rm-v'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s18');

    var sky = el('div', 's18-sky');
    var sun = el('div', 's18-sun');
    sun.setAttribute('aria-hidden', 'true');
    sky.appendChild(sun);

    /* the forbidden things sit in the background, disabled — never a menu to pick from */
    var band = el('div', 's18-band');
    band.setAttribute('aria-hidden', 'true');
    ['אכילה', 'שתייה', 'עישון'].forEach(function (n) {
      band.appendChild(el('span', 's18-item', n));
    });
    sky.appendChild(band);

    var stage2 = el('div', 's18-after');
    stage2.hidden = true;
    var iftar = el('div', 's18-step', 'אפטאר — סעודה קלה');
    var tarawih = el('div', 's18-step', 'מסגד — תפילות התראויח');
    stage2.appendChild(iftar); stage2.appendChild(tarawih);

    var clock = el('div', 's18-clock');
    clock.setAttribute('role', 'status');
    clock.setAttribute('aria-live', 'polite');

    var holdBtn = el('button', 'mech-btn mech-btn-primary s18-hold');
    holdBtn.type = 'button';
    holdBtn.textContent = 'החזיקו כדי לקדם את היום';

    var p = 0, raf = null, last = 0;
    function tickOn(ts) {
      if (!last) last = ts;
      var dt = (ts - last) / 1000; last = ts;
      p = Math.min(1, p + dt / 6); // a full fast day in six seconds of holding
      paint();
      if (p >= 1) { finish(); return; }
      raf = requestAnimationFrame(tickOn);
    }
    function paint() {
      var deg = 180 * p;
      sun.style.insetInlineStart = (p * 100) + '%';
      sun.style.insetBlockStart = (52 - Math.sin(deg * Math.PI / 180) * 42) + '%';
      sky.style.setProperty('--t', String(p));
      band.classList.toggle('is-off', p < 1);
      var hh = Math.floor(5 + p * 14);
      clock.textContent = p < 1
        ? 'מעלות השחר — הצום נמשך (' + hh + ':00)'
        : 'שקיעת החמה — שבירת הצום';
      api.highlight(0);
    }
    function finish() {
      cancelAnimationFrame(raf);
      holdBtn.disabled = true;
      holdBtn.textContent = 'היום הושלם';
      stage2.hidden = false;
      requestAnimationFrame(function () {
        iftar.classList.add('is-in');
        setTimeout(function () { tarawih.classList.add('is-in'); }, api.reduced ? 0 : 450);
      });
      api.complete();
      api.say('הצום נמשך מעלות השחר עד שקיעת החמה; אז נשבר הצום באפטאר, ולאחריו תפילות התראויח במסגד.', 'ok');
      hint.classList.add('is-gone');
    }
    function start(e) {
      if (api.done() || holdBtn.disabled) return;
      if (e && e.preventDefault) e.preventDefault();
      last = 0;
      raf = requestAnimationFrame(tickOn);
    }
    function stop() { cancelAnimationFrame(raf); last = 0; }
    holdBtn.addEventListener('pointerdown', start);
    holdBtn.addEventListener('pointerup', stop);
    holdBtn.addEventListener('pointerleave', stop);
    holdBtn.addEventListener('keydown', function (e) {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e);
    });
    holdBtn.addEventListener('keyup', function (e) {
      if (e.key === ' ' || e.key === 'Enter') stop();
    });

    wrap.appendChild(sky);
    wrap.appendChild(clock);
    wrap.appendChild(stage2);
    wrap.appendChild(holdBtn);
    api.stage.appendChild(wrap);
    var hint = api.hint('החזיקו את הלחיצה כדי לקדם את השמש מעלות השחר עד השקיעה');
    if (api.done()) { p = 1; paint(); finish(); }
    else paint();
  };

  /* ================= 19 — עשרת הלילות האחרונים ================= */
  M['19'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s19');

    var FOCI = [
      { k: 'allah', name: 'התקרבות לאללה', scene: 'תפילה' },
      { k: 'midot', name: 'עבודת המידות בין אדם לחברו', scene: 'תיקון קשר בין אנשים' },
      { k: 'tongue', name: 'שליטה עצמית על לשונו', scene: 'השתקת מילים פוגעות' }
    ];
    var opened = {};

    var field = el('div', 's19-field');
    var lights = el('div', 's19-lights');
    lights.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 10; i++) {
      var L = el('span', 's19-light');
      L.style.setProperty('--n', i);
      lights.appendChild(L);
    }
    field.appendChild(lights);

    var scene = el('div', 's19-scene');
    scene.setAttribute('role', 'status');
    scene.setAttribute('aria-live', 'polite');
    field.appendChild(scene);

    var row = el('div', 's19-row');
    var btns = FOCI.map(function (F) {
      var b = el('button', 's19-focus');
      b.type = 'button';
      b.textContent = F.name;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        opened[F.k] = true;
        /* this is a single-select, so the previous choice must be un-pressed as well as
           un-styled — setting aria-pressed without ever clearing it left all three
           announcing as pressed once the learner had been through them all */
        row.querySelectorAll('.s19-focus').forEach(function (x) {
          x.classList.remove('is-on');
          x.setAttribute('aria-pressed', 'false');
        });
        b.classList.add('is-on');
        b.setAttribute('aria-pressed', 'true');
        field.setAttribute('data-focus', F.k);
        scene.textContent = F.scene;
        api.highlight(0);
        if (Object.keys(opened).length === 3 && !api.done()) {
          api.complete();
          /* the mercy line lands as content at the end, without staging a judgement */
          api.say('שלושת מוקדי המשמעות נפתחו. המסורת המוסלמית אומרת בשם מוחמד כי מי שצם לשם שמים בחודש רמדאן, כל עוונות העבר נמחלות לו.', 'ok');
          api.highlight(1);
          hint.classList.add('is-gone');
        }
      });
      row.appendChild(b);
      return b;
    });

    wrap.appendChild(field);
    wrap.appendChild(row);
    api.stage.appendChild(wrap);
    var hint = api.hint('עברו בין שלושת מוקדי המשמעות של עשרת הלילות האחרונים');
    api.highlight(0);
    if (api.done()) {
      FOCI.forEach(function (F, i) { opened[F.k] = true; btns[i].setAttribute('aria-pressed', 'true'); });
      btns[2].classList.add('is-on');
      field.setAttribute('data-focus', 'tongue');
      scene.textContent = FOCI[2].scene;
      hint.classList.add('is-gone');
    }
  };

  /* ================= 20 — מן הצום אל עיד אלפטר ================= */
  M['20'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s20');

    var STOPS = [
      { at: 0, k: 'table', name: 'ארוחות משפחתיות משותפות', para: 0 },
      { at: 25, k: 'clothes', name: 'בגדים ותכשיטים חדשים', para: 0 },
      { at: 50, k: 'charity', name: 'צדקה נוספת מעבר לצדקה השנתית', para: 0 },
      { at: 75, k: 'visit', name: 'ביקור קרובי משפחה (צלת אלרחם)', para: 1 },
      { at: 100, k: 'peace', name: 'פיוס עם קרובים', para: 1 }
    ];
    var seen = {};

    var house = el('div', 's20-house');
    var figure = el('div', 's20-figure');
    figure.setAttribute('aria-hidden', 'true');
    house.appendChild(figure);

    /* the reconciliation is a broken line rejoining, not a badge */
    var mend = el('div', 's20-mend');
    mend.setAttribute('aria-hidden', 'true');
    mend.appendChild(el('span', 's20-mend-a'));
    mend.appendChild(el('span', 's20-mend-b'));
    house.appendChild(mend);

    var caption = el('div', 's20-caption');
    caption.setAttribute('role', 'status');
    caption.setAttribute('aria-live', 'polite');
    house.appendChild(caption);

    var t = range(api, 'מעבר הדמות בסצנת החג', 0, 100, 0);

    function sync() {
      var v = +t.range.value;
      var best = STOPS[0], d = 1e9;
      STOPS.forEach(function (S) { var k = Math.abs(v - S.at); if (k < d) { d = k; best = S; } });
      figure.style.insetInlineStart = v + '%';
      house.setAttribute('data-stop', best.k);
      mend.classList.toggle('is-mended', best.k === 'peace');
      t.line.style.setProperty('--fill', v + '%');
      caption.textContent = best.name;
      api.highlight(best.para);
      if (d < 13) {
        seen[best.k] = true;
        if (Object.keys(seen).length === STOPS.length && !api.done()) {
          api.complete();
          api.say('חמשת הביטויים של החג נחשפו: ארוחות משותפות, בגדים ותכשיטים חדשים, צדקה נוספת, ביקור קרובים ופיוס.', 'ok');
          hint.classList.add('is-gone');
        }
      }
    }
    t.range.addEventListener('input', sync);

    wrap.appendChild(house);
    wrap.appendChild(t.box);
    api.stage.appendChild(wrap);
    var hint = api.hint('העבירו את הדמות בסצנה ועצרו בכל אחד מביטויי החג');
    if (api.done()) STOPS.forEach(function (S) { seen[S.k] = true; });
    sync();
  };

  /* ================= 21 — מתי החודש מתחיל ומסתיים? ================= */
  M['21'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s21');

    var field = el('div', 's21-field');
    var moon = el('div', 's21-moon');
    moon.setAttribute('aria-hidden', 'true');
    var scope = el('div', 's21-lens s21-scope');
    scope.appendChild(el('b', null, 'טלסקופ'));
    scope.appendChild(el('span', null, 'האסכולה הסעודית — ראיית המולד (המולד האמיתי)'));
    var calc = el('div', 's21-lens s21-calc');
    calc.appendChild(el('b', null, 'חישוב אסטרונומי'));
    calc.appendChild(el('span', null, 'האסכולה המצרית — חישובים אסטרונומיים (המולד הממוצע)'));
    field.appendChild(scope); field.appendChild(moon); field.appendChild(calc);

    var t = range(api, 'מחוון בין שתי העדשות', 0, 100, 50);
    var sawScope = false, sawCalc = false;

    function sync() {
      var v = +t.range.value;
      /* RTL: 0 sits on the right, where the telescope lens is */
      scope.style.opacity = String(Math.max(0.25, 1 - v / 100 * 1.4));
      calc.style.opacity = String(Math.max(0.25, v / 100 * 1.4));
      scope.classList.toggle('is-on', v < 28);
      calc.classList.toggle('is-on', v > 72);
      moon.setAttribute('data-lens', v < 28 ? 'scope' : (v > 72 ? 'calc' : 'both'));
      t.line.style.setProperty('--fill', v + '%');
      if (v < 28) { sawScope = true; api.highlight(0); }
      if (v > 72) { sawCalc = true; api.highlight(0); }
      if (sawScope && sawCalc && !api.done()) {
        api.complete();
        api.say('שתי העדשות נבדקו: האסכולה הסעודית קובעת לפי ראיית המולד בטלסקופ, והאסכולה המצרית לפי חישובים אסטרונומיים.', 'ok');
        hint.classList.add('is-gone');
      }
    }
    t.range.addEventListener('input', sync);

    wrap.appendChild(field);
    wrap.appendChild(t.box);
    api.stage.appendChild(wrap);
    var hint = api.hint('הזיזו את המחוון אל שתי העדשות');
    api.highlight(0);
    if (api.done()) { sawScope = sawCalc = true; }
    sync();
  };

  /* ================= 22 — רגע החלטה: יום שלם בחודש רמדאן ================= */
  M['22'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s22');

    var ORDER = ['fast', 'sunset', 'iftar', 'tarawih', 'eid'];
    var LABEL = {
      fast: 'תחילת הצום (עלות השחר)',
      sunset: 'השקיעה',
      iftar: 'האפטאר',
      tarawih: 'תפילות התראויח',
      eid: 'עיד אלפטר'
    };
    var placed = [];

    var line = el('div', 's22-line');
    var slots = ORDER.map(function (_, i) {
      var s = el('div', 's22-slot');
      s.setAttribute('data-i', String(i));
      s.appendChild(el('span', 's22-num', String(i + 1)));
      line.appendChild(s);
      return s;
    });

    var pool = el('div', 's22-pool');
    /* deliberately shuffled so the order is a decision, not a reading of the layout */
    var bank = ['iftar', 'eid', 'fast', 'tarawih', 'sunset'];
    var chips = {};
    bank.forEach(function (k) {
      var b = el('button', 's22-chip');
      b.type = 'button';
      b.textContent = LABEL[k];
      b.setAttribute('data-k', k);
      b.addEventListener('click', function () { placeNext(k); });
      pool.appendChild(b);
      chips[k] = b;
    });

    function placeNext(k) {
      if (placed.indexOf(k) >= 0 || placed.length >= ORDER.length) return;
      var i = placed.length;
      placed.push(k);
      var s = slots[i];
      s.innerHTML = '';
      var tag = el('button', 's22-placed');
      tag.type = 'button';
      tag.textContent = LABEL[k];
      tag.setAttribute('aria-label', 'הסרה: ' + LABEL[k]);
      tag.addEventListener('click', function () { undo(k); });
      s.appendChild(tag);
      chips[k].disabled = true;
      api.say('', null);
      checkBtn.disabled = placed.length !== ORDER.length;
      api.highlight(0);
    }
    function undo(k) {
      var i = placed.indexOf(k);
      if (i < 0) return;
      /* removing a chip re-opens everything after it, so order stays honest */
      var tail = placed.splice(i);
      tail.forEach(function (x) { chips[x].disabled = false; });
      slots.forEach(function (s, n) {
        if (n >= i) { s.innerHTML = ''; s.appendChild(el('span', 's22-num', String(n + 1))); }
      });
      checkBtn.disabled = true;
      api.say('', null);
    }

    var extraBox = el('div', 's22-extra');
    extraBox.hidden = true;
    extraBox.appendChild(el('p', 's22-q', 'באיזו נקודה ניתנת הצדקה הנוספת?'));
    var extraPick = null;
    var extraRow = el('div', 's22-extra-row');
    ORDER.forEach(function (k) {
      var b = el('button', 's22-extra-opt');
      b.type = 'button';
      b.textContent = LABEL[k];
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        extraPick = k;
        extraRow.querySelectorAll('.s22-extra-opt').forEach(function (x) {
          x.setAttribute('aria-pressed', 'false'); x.classList.remove('is-on');
        });
        b.setAttribute('aria-pressed', 'true');
        b.classList.add('is-on');
        api.say('', null);
      });
      extraRow.appendChild(b);
    });
    extraBox.appendChild(extraRow);

    var checkBtn = el('button', 'mech-btn mech-btn-primary');
    checkBtn.type = 'button';
    checkBtn.textContent = 'בדיקה';
    checkBtn.disabled = true;
    checkBtn.addEventListener('click', function () {
      var fb = api.screen.feedback || [];
      var orderOk = placed.join(',') === ORDER.join(',');
      if (!orderOk) { api.say(fb[1] || '', 'try'); return; }
      if (extraBox.hidden) {
        extraBox.hidden = false;
        api.say('הסדר נכון. עכשיו קבעו באיזו נקודה ניתנת הצדקה הנוספת.', 'ok');
        return;
      }
      if (extraPick !== 'eid') { api.say(fb[1] || '', 'try'); return; }
      api.complete();
      api.say(fb[0] || '', 'ok');
      checkBtn.disabled = true;
      hint.classList.add('is-gone');
    });

    wrap.appendChild(line);
    wrap.appendChild(pool);
    wrap.appendChild(extraBox);
    wrap.appendChild(checkBtn);
    api.stage.appendChild(wrap);
    var hint = api.hint('מקמו את האירועים על הקו לפי סדרם, ואז קבעו היכן ניתנת הצדקה הנוספת');
    if (api.done()) {
      ORDER.forEach(placeNext);
      extraBox.hidden = false;
      extraRow.querySelectorAll('.s22-extra-opt')[4].classList.add('is-on');
      extraPick = 'eid';
      checkBtn.disabled = true;
      api.say((api.screen.feedback || [])[0] || '', 'ok');
      hint.classList.add('is-gone');
    }
  };
})();
