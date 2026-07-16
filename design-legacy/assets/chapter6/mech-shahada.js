/* השהאדה.
   LIVE: sh-v — the calligraphy illustration. The check moved to mech-checks.js.
   RETIRED, code kept intact: 05 — the check the spec asks for here has a different
   option set and different wording, so it is authored in mech-checks.js from data.js.
   RETIRED, code kept intact: 03 and 04. They are registered under ids that no longer
   appear in data.js, so the engine never reaches them — nothing links to them and nothing
   was deleted. Re-adding a screen with that id is all it takes to bring one back.
   Every mechanism here is driven by a native range/button, so pointer and keyboard
   are the same control rather than a fallback bolted on afterwards. */
(function () {
  'use strict';
  var M = window.CH6M;

  /* a line the learner travels along; returns the range element */
  function track(api, opts) {
    var box = api.el('div', 'track');
    var line = api.el('div', 'track-line');
    line.setAttribute('aria-hidden', 'true');
    var r = api.el('input');
    r.type = 'range';
    r.min = '0'; r.max = '100'; r.value = '0'; r.step = '1';
    r.className = 'track-range';
    r.setAttribute('aria-label', opts.label);
    box.appendChild(line);
    box.appendChild(r);
    return { box: box, range: r, line: line };
  }

  /* ================= 02 — ממילה לעדות ================= */
  M['sh-v'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s02');

    var layers = [
      { at: 8, cls: 'ar', text: 'الشهادة', note: 'ערבית' },
      { at: 45, cls: 'tr', text: 'שהאדה', note: 'תעתיק' },
      { at: 82, cls: 'he', text: 'עדות', note: 'משמעה' }
    ];

    var stack = el('div', 's02-stack');
    var nodes = layers.map(function (L) {
      var d = el('div', 's02-layer ' + L.cls);
      d.appendChild(el('span', 's02-word', L.text));
      d.appendChild(el('span', 's02-note', L.note));
      stack.appendChild(d);
      return d;
    });

    var t = track(api, { label: 'מעבר לאורך הקו הקליגרפי' });
    var seen = {};

    function sync() {
      var v = +t.range.value;
      layers.forEach(function (L, i) {
        var on = v >= L.at;
        nodes[i].classList.toggle('is-on', on);
        if (on && !seen[i]) {
          seen[i] = true;
          if (Object.keys(seen).length === 3) {
            api.complete();
            api.say('שלוש השכבות נחשפו: המילה בערבית, התעתיק והמשמעות.', 'ok');
            hint.classList.add('is-gone');
          }
        }
      });
      api.highlight(0);
      t.line.style.setProperty('--fill', v + '%');
    }
    t.range.addEventListener('input', sync);

    wrap.appendChild(stack);
    wrap.appendChild(t.box);
    api.stage.appendChild(wrap);
    var hint = api.hint('הזיזו את הסמן לאורך הקו — כל עצירה חושפת שכבה. אין כאן תשובה שגויה.');
    if (api.done()) { t.range.value = '100'; }
    sync();
  };

  /* ================= 03 — שני חלקים, עדות אחת ================= */
  M['03'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s03');

    var field = el('div', 's03-field');
    /* the gap between the halves is the "פירוד" the spec describes */
    var idols = el('div', 's03-idols');
    idols.setAttribute('aria-hidden', 'true');
    for (var k = 0; k < 7; k++) {
      var d = el('span', 's03-idol');
      d.style.setProperty('--n', k);
      idols.appendChild(d);
    }
    var light = el('div', 's03-light');
    light.setAttribute('aria-hidden', 'true');

    var right = el('div', 's03-half s03-right', 'אין אל מבלעדי אללה');
    var left = el('div', 's03-half s03-left', 'ומוחמד הוא שליחו');

    field.appendChild(idols);
    field.appendChild(light);
    field.appendChild(right);
    field.appendChild(left);

    var t = track(api, { label: 'קירוב שני חלקי המשפט למרכז' });
    var joined = false;

    /* How far each half must travel for the sentence to close to a single word space.
       A percentage cannot express this: `translateX(42%)` is 42% of each half's OWN width,
       and the two halves are different widths, so the pair overshot and the sentence ran
       through itself — measured, "אין אל מבלעדי אללה" overlapped "ומוחמד הוא שליחו" by
       34-42px at exactly the moment the screen completed. Offsets are layout values, so
       they are unaffected by the transform we are about to set and stay right on resize. */
    var JOINED_GAP = 14;
    function travel() {
      var a = right.offsetLeft, aw = right.offsetWidth;
      var b = left.offsetLeft, bw = left.offsetWidth;
      var gap = (a > b) ? a - (b + bw) : b - (a + aw);
      return Math.max(0, (gap - JOINED_GAP) / 2);
    }

    function sync() {
      var v = +t.range.value / 100;
      /* whichever half the writing direction puts on the right travels left, and vice
         versa — so the two always close toward each other, in RTL and LTR alike */
      var d = travel() * v;
      var rSign = right.offsetLeft > left.offsetLeft ? -1 : 1;
      right.style.transform = 'translateX(' + (rSign * d) + 'px)';
      left.style.transform = 'translateX(' + (-rSign * d) + 'px)';
      idols.style.opacity = String(1 - v);
      light.style.opacity = String(v);
      field.classList.toggle('is-joined', v >= 0.98);
      t.line.style.setProperty('--fill', (v * 100) + '%');
      api.highlight(v >= 0.98 ? 1 : 0);
      if (v >= 0.98 && !joined) {
        joined = true;
        api.complete();
        api.say((api.screen.feedback || [])[0] || '', 'ok');
        hint.classList.add('is-gone');
      }
    }
    t.range.addEventListener('input', sync);

    wrap.appendChild(field);
    wrap.appendChild(t.box);
    api.stage.appendChild(wrap);
    var hint = api.hint('קרבו את שני חלקי המשפט זה אל זה');
    if (api.done()) t.range.value = '100';
    sync();
  };

  /* ================= 04 — העדות נשמעת ================= */
  M['04'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s04');

    var STATIONS = [
      { key: 'adhan', name: 'קריאה לתפילה', sub: 'אד׳אן — המואזין', para: 0 },
      { key: 'salah', name: 'במהלך התפילה', sub: 'התפילה עצמה', para: 0 },
      { key: 'witness', name: 'קבלת האסלאם', sub: 'בפני שני עדים כשרים', para: 1 }
    ];

    var scene = el('div', 's04-scene');
    var row = el('div', 's04-row');
    var nodes = STATIONS.map(function (S) {
      var d = el('div', 's04-station');
      d.setAttribute('data-k', S.key);
      d.appendChild(el('div', 's04-name', S.name));
      d.appendChild(el('div', 's04-sub', S.sub));
      row.appendChild(d);
      return d;
    });

    /* the route the wave travels, directly under the stations it connects */
    var laneBox = el('div', 's04-lanebox');
    laneBox.setAttribute('aria-hidden', 'true');
    laneBox.appendChild(el('div', 's04-lane'));

    /* three rings close only at the third station, once per utterance */
    var ringBox = el('div', 's04-rings');
    ringBox.hidden = true;
    var rings = [0, 1, 2].map(function (n) {
      var r = el('span', 's04-ring');
      r.style.setProperty('--n', n);
      ringBox.appendChild(r);
      return r;
    });
    var sayBtn = el('button', 'mech-btn s04-say');
    sayBtn.type = 'button';
    sayBtn.textContent = 'אמירת השהאדה';
    var said = 0;
    sayBtn.addEventListener('click', function () {
      if (said >= 3) return;
      rings[said].classList.add('is-closed');
      said++;
      sayBtn.textContent = said < 3 ? 'אמירת השהאדה (' + said + ' מתוך 3)' : 'נאמרה שלוש פעמים';
      if (said >= 3) { sayBtn.disabled = true; check(); }
    });

    var wave = el('div', 's04-wave');
    wave.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 5; i++) { var b = el('span'); b.style.setProperty('--n', i); wave.appendChild(b); }

    /* One press per move: the wave travels to the next station on its own.
       There is nothing to drag here — the learner chooses when to advance, not how far. */
    var nextBtn = el('button', 'mech-btn mech-btn-primary s04-next');
    nextBtn.type = 'button';
    nextBtn.textContent = 'המשך למצב הבא';
    nextBtn.addEventListener('click', function () {
      if (at >= STATIONS.length - 1) return;
      at++;
      visited[STATIONS[at].key] = true;
      sync();
    });

    var controls = el('div', 's04-controls');
    controls.appendChild(nextBtn);
    controls.appendChild(sayBtn);

    var at = 0;
    var visited = {};
    visited[STATIONS[0].key] = true;

    function check() {
      if (Object.keys(visited).length === 3 && said >= 3) {
        api.complete();
        api.say('גל הקול עבר בשלושת המצבים, ובמעמד קבלת האסלאם נאמרה השהאדה שלוש פעמים.', 'ok');
        hint.classList.add('is-gone');
      }
    }

    /* The wave lands on the station's measured centre rather than a tuned percentage: the
       stations are flex:1 siblings, so their centres move with the pane. Screens are built
       while `display:none`, where every measurement reads 0 — hence placing on enter and
       resize rather than at build time. In RTL `inset-inline-start` counts from the right
       edge, which is also the edge the first station sits against, so the two stay in step. */
    function place() {
      var lb = laneBox.getBoundingClientRect();
      if (!lb.width) return;
      var st = nodes[at].getBoundingClientRect();
      var mid = st.left + st.width / 2 - lb.left;
      var rtl = getComputedStyle(scene).direction === 'rtl';
      var start = rtl ? lb.width - mid : mid;
      wave.style.insetInlineStart = (start - (wave.offsetWidth || 52) / 2) + 'px';
    }

    function sync() {
      place();
      nodes.forEach(function (n, i) { n.classList.toggle('is-on', i === at); });
      api.highlight(STATIONS[at].para);
      var atWitness = at === STATIONS.length - 1;
      ringBox.hidden = !atWitness;
      sayBtn.hidden = !atWitness;
      nextBtn.hidden = atWitness;
      check();
    }

    laneBox.appendChild(wave);
    scene.appendChild(row);
    scene.appendChild(laneBox);
    wrap.appendChild(scene);
    wrap.appendChild(ringBox);
    wrap.appendChild(controls);
    api.stage.appendChild(wrap);
    var hint = api.hint('לחצו כדי להעביר את גל הקול אל המצב הבא; במעמד קבלת האסלאם אמרו את השהאדה שלוש פעמים');
    if (api.done()) {
      at = STATIONS.length - 1; said = 3;
      rings.forEach(function (r) { r.classList.add('is-closed'); });
      sayBtn.disabled = true; sayBtn.textContent = 'נאמרה שלוש פעמים';
      STATIONS.forEach(function (S) { visited[S.key] = true; });
    }
    api.onEnter = place;
    window.addEventListener('resize', place);
    sync();
  };

  /* ================= 05 — רגע החלטה: היכן העדות שייכת? ================= */
  M['05'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s05');

    /* the fourth event is in the chapter but is not a moment the text names */
    var EVENTS = [
      { name: 'קריאה לתפילה', right: true },
      { name: 'התפילה', right: true },
      { name: 'קבלת האסלאם', right: true },
      { name: 'עלייה לרגל', right: false }
    ];
    var picked = {};

    var axis = el('div', 's05-axis');
    var line = el('div', 's05-line');
    line.setAttribute('aria-hidden', 'true');
    axis.appendChild(line);

    var btns = EVENTS.map(function (E, i) {
      var b = el('button', 's05-point');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('span', 's05-dot'));
      b.appendChild(el('span', 's05-label', E.name));
      b.addEventListener('click', function () {
        if (locked) return;
        picked[i] = !picked[i];
        b.setAttribute('aria-pressed', String(!!picked[i]));
        b.classList.toggle('is-picked', !!picked[i]);
        api.say('', null);
        checkBtn.disabled = !Object.keys(picked).some(function (k) { return picked[k]; });
      });
      axis.appendChild(b);
      return b;
    });

    var checkBtn = el('button', 'mech-btn mech-btn-primary');
    checkBtn.type = 'button';
    checkBtn.textContent = 'בדיקה';
    checkBtn.disabled = true;
    var locked = false;

    checkBtn.addEventListener('click', function () {
      var ok = EVENTS.every(function (E, i) { return !!picked[i] === E.right; });
      var fb = api.screen.feedback || [];
      if (ok) {
        locked = true;
        btns.forEach(function (b, i) {
          b.disabled = true;
          if (EVENTS[i].right) b.classList.add('is-right');
        });
        checkBtn.disabled = true;
        api.complete();
        api.say(fb[0] || '', 'ok');
        hint.classList.add('is-gone');
      } else {
        api.say(fb[1] || '', 'try');
      }
    });

    wrap.appendChild(axis);
    wrap.appendChild(checkBtn);
    api.stage.appendChild(wrap);
    var hint = api.hint('סמנו את הרגעים שבהם השהאדה נאמרת, ואז בדקו. אפשר לשנות לפני הבדיקה.');

    if (api.done()) {
      locked = true;
      EVENTS.forEach(function (E, i) {
        if (E.right) { picked[i] = true; btns[i].classList.add('is-picked', 'is-right'); btns[i].setAttribute('aria-pressed', 'true'); }
        btns[i].disabled = true;
      });
      checkBtn.disabled = true;
      api.say((api.screen.feedback || [])[0] || '', 'ok');
      hint.classList.add('is-gone');
    }
  };
})();
