/* Screens 13-15 — לתת. */
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

  /* ================= 13 — 2.5% שיוצאים מן המאזן ================= */
  M['13'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s13');

    var RECIPIENTS = ['עניים', 'נזקקים', 'יתומים', 'בתי תמחוי'];

    var field = el('div', 's13-field');
    var ring = el('div', 's13-ring');
    var ringFill = el('div', 's13-ring-fill');
    ringFill.setAttribute('aria-hidden', 'true');
    var ringLabel = el('div', 's13-ring-label');
    ring.appendChild(ringFill);
    ring.appendChild(ringLabel);
    field.appendChild(ring);

    var flows = el('div', 's13-flows');
    flows.setAttribute('aria-hidden', 'true');
    field.appendChild(flows);

    var nodes = RECIPIENTS.map(function (name, i) {
      var d = el('div', 's13-node');
      d.setAttribute('data-i', String(i));
      d.textContent = name;
      field.appendChild(d);
      var f = el('span', 's13-flow');
      f.style.setProperty('--n', i);
      flows.appendChild(f);
      return { node: d, flow: f };
    });

    /* the dial reads in tenths of a percent so 2.5 is reachable but not the default */
    var t = range(api, 'מחוג האחוזים מתוך המאזן השנתי', 0, 100, 0, 1);
    var read = el('div', 's13-read');
    read.setAttribute('role', 'status');
    read.setAttribute('aria-live', 'polite');

    function sync() {
      var raw = +t.range.value;          // 0..100 → 0..10.0 percent
      var pct = raw / 10;
      var exact = Math.abs(pct - 2.5) < 0.05;
      ringFill.style.setProperty('--p', (pct / 10 * 100) + '%');
      t.line.style.setProperty('--fill', raw + '%');
      ringLabel.innerHTML = '';
      ringLabel.appendChild(el('b', null, pct.toFixed(1).replace('.0', '') + '%'));
      ringLabel.appendChild(el('span', null, 'מן המאזן השנתי'));

      field.classList.toggle('is-exact', exact);
      nodes.forEach(function (o) {
        o.node.classList.toggle('is-lit', exact);
        o.flow.classList.toggle('is-on', exact);
      });

      read.textContent = exact
        ? '2.5% — כלומר 1/40 מן המאזן השנתי. הזרימה מגיעה לכל ארבעת המוקדים.'
        : (pct === 0 ? 'סובבו את המחוג' : 'בשיעור הזה הזרימה אינה יוצאת מן הטבעת');
      api.highlight(0);

      if (exact && !api.done()) {
        api.complete();
        api.say('2.5% הם 1/40 מן המאזן השנתי, והם מגיעים לעניים, לנזקקים, ליתומים ולבתי התמחוי.', 'ok');
        hint.classList.add('is-gone');
      }
    }
    t.range.addEventListener('input', sync);

    var frac = el('div', 's13-frac', '1/40');
    frac.setAttribute('aria-hidden', 'true');
    ring.appendChild(frac);

    wrap.appendChild(field);
    wrap.appendChild(read);
    wrap.appendChild(t.box);
    api.stage.appendChild(wrap);
    var hint = api.hint('סובבו את המחוג עד שהזרימה תצא מן הטבעת ותגיע לכל המוקדים');
    if (api.done()) t.range.value = '25';
    sync();
  };

  /* ================= 14 — מהנתינה אל ההשפעה ================= */
  M['14'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s14');

    var top = el('div', 's14-ripple-field');
    var source = el('button', 's14-source');
    source.type = 'button';
    source.textContent = 'נתינה';
    var ring1 = el('div', 's14-circle s14-c1');
    ring1.appendChild(el('span', null, 'המקבל'));
    var ring2 = el('div', 's14-circle s14-c2');
    ring2.appendChild(el('span', null, 'הקהילה'));
    var wave = el('div', 's14-wave');
    wave.setAttribute('aria-hidden', 'true');
    var double = el('div', 's14-double', 'בכפליים');
    double.hidden = true;
    top.appendChild(wave); top.appendChild(ring1); top.appendChild(ring2);
    top.appendChild(source); top.appendChild(double);

    var reached = { one: false, two: false };
    function give() {
      wave.classList.remove('is-go');
      void wave.offsetWidth; // restart the ripple
      wave.classList.add('is-go');
      api.highlight(0);
      setTimeout(function () { ring1.classList.add('is-lit'); reached.one = true; check(); }, api.reduced ? 0 : 420);
      setTimeout(function () {
        ring2.classList.add('is-lit'); reached.two = true;
        double.hidden = false;
        check();
      }, api.reduced ? 0 : 900);
    }
    source.addEventListener('click', give);

    /* the calendar separates the yearly duty from the other occasions */
    var cal = el('div', 's14-cal');
    var picked = {};
    var CAL = [
      { k: 'year', label: 'המאזן השנתי', sub: 'חובה', para: 1 },
      { k: 'fitr', label: 'עיד אלפטר', sub: 'חג שבירת הצום', para: 1 },
      { k: 'more', label: 'ומועדים נוספים', sub: '', para: 1 }
    ];
    var calNote = el('div', 's14-cal-note');
    calNote.setAttribute('role', 'status');
    calNote.setAttribute('aria-live', 'polite');
    CAL.forEach(function (C) {
      var b = el('button', 's14-cal-item');
      b.type = 'button';
      b.setAttribute('data-k', C.k);
      b.appendChild(el('b', null, C.label));
      if (C.sub) b.appendChild(el('span', null, C.sub));
      b.addEventListener('click', function () {
        picked[C.k] = true;
        cal.querySelectorAll('.s14-cal-item').forEach(function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        api.highlight(C.para);
        calNote.textContent = C.k === 'year'
          ? 'מצוות צדקה זו היא חובה.'
          : 'צדקה זו שונה מן החובה השנתית — היא ניתנת בעיד אלפטר ובמועדים נוספים.';
        check();
      });
      cal.appendChild(b);
    });

    function check() {
      if (reached.one && reached.two && picked.year && (picked.fitr || picked.more) && !api.done()) {
        api.complete();
        api.say('הנתינה מגיעה גם למקבל וגם לקהילה — „בכפליים”. החובה השנתית נבדלת מן הצדקה שבעיד אלפטר ובמועדים הנוספים.', 'ok');
        hint.classList.add('is-gone');
      }
    }

    wrap.appendChild(top);
    wrap.appendChild(cal);
    wrap.appendChild(calNote);
    api.stage.appendChild(wrap);
    var hint = api.hint('הפעילו את הנתינה, ואז השוו בין החובה השנתית למועדים הנוספים');
    if (api.done()) {
      give();
      cal.querySelector('[data-k="year"]').click();
      cal.querySelector('[data-k="fitr"]').click();
      picked.year = true;
      hint.classList.add('is-gone');
    }
  };

  /* ================= 15 — רגע החלטה: כמה עובר הלאה? ================= */
  M['15'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s15');

    var TOTAL = 10000;
    var field = el('div', 's15-field');
    var pool = el('div', 's15-pool');
    var poolFill = el('div', 's15-pool-fill');
    poolFill.setAttribute('aria-hidden', 'true');
    var poolLabel = el('div', 's15-pool-label');
    pool.appendChild(poolFill); pool.appendChild(poolLabel);

    var stream = el('div', 's15-stream');
    stream.setAttribute('aria-hidden', 'true');
    var community = el('div', 's15-community');
    var commLabel = el('div', 's15-comm-label');
    community.appendChild(commLabel);

    field.appendChild(pool); field.appendChild(stream); field.appendChild(community);

    /* no answer list: the number moves continuously and the learner reads it */
    var t = range(api, 'גבול ההקצאה מתוך המאזן', 0, 1000, 0, 5);
    var checkBtn = el('button', 'mech-btn mech-btn-primary');
    checkBtn.type = 'button';
    checkBtn.textContent = 'אישור ההקצאה';
    checkBtn.disabled = true;

    function amount() { return +t.range.value; }

    function sync() {
      var a = amount();
      var pct = a / TOTAL * 100;
      poolFill.style.setProperty('--p', (100 - pct) + '%');
      stream.style.setProperty('--w', Math.min(100, pct * 8) + '%');
      stream.classList.toggle('is-on', a > 0);
      t.line.style.setProperty('--fill', (a / 1000 * 100) + '%');

      poolLabel.innerHTML = '';
      poolLabel.appendChild(el('b', null, (TOTAL - a).toLocaleString('he-IL')));
      poolLabel.appendChild(el('span', null, 'נשאר במאזן'));

      commLabel.innerHTML = '';
      commLabel.appendChild(el('b', null, a.toLocaleString('he-IL')));
      commLabel.appendChild(el('span', null, 'עובר לקהילה — ' + (pct.toFixed(2).replace(/\.?0+$/, '') || '0') + '%'));

      field.classList.toggle('is-exact', a === 250);
      checkBtn.disabled = a === 0;
      api.say('', null);
    }
    t.range.addEventListener('input', sync);

    checkBtn.addEventListener('click', function () {
      var fb = api.screen.feedback || [];
      if (amount() === 250) {
        api.complete();
        api.say(fb[0] || '', 'ok');
        checkBtn.disabled = true;
        t.range.disabled = true;
        hint.classList.add('is-gone');
      } else {
        api.say(fb[1] || '', 'try');
      }
    });

    wrap.appendChild(field);
    wrap.appendChild(t.box);
    wrap.appendChild(checkBtn);
    api.stage.appendChild(wrap);
    var hint = api.hint('גררו את גבול ההקצאה מתוך מאזן של 10,000 ואשרו');
    if (api.done()) {
      t.range.value = '250';
      t.range.disabled = true;
      checkBtn.disabled = true;
      sync();
      api.say((api.screen.feedback || [])[0] || '', 'ok');
      hint.classList.add('is-gone');
    } else sync();
  };
})();
