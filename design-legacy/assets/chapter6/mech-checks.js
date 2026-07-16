/* The chapter's checks — one per commandment, plus the closing exercise, plus the route map
   the החג' section was missing.

   Every question, option, order and feedback line here is read from data.js; this file holds
   no content of its own, only the five interactions the spec names. They share one rule:
   a wrong answer never resets the exercise. It returns the one thing that is out of place,
   says why in a sentence, and after the second miss reveals the hint (engine's api.miss).

   Loaded last, so it owns the ids the retired mechanisms used to answer to. */
(function () {
  'use strict';
  var M = window.CH6M;

  /* A fixed reordering, not Math.random: the bank must be shuffled — otherwise the answer is
     just "keep the order you were given" — but it must also be the same every visit, so a
     learner comparing notes sees the same screen twice. */
  function reorder(list, perm) {
    return perm.map(function (i) { return list[i]; });
  }

  function goButton(api, onClick) {
    var b = api.el('button', 'mech-btn mech-btn-primary chk-go');
    b.type = 'button';
    b.textContent = 'בדיקה';
    b.disabled = true;
    b.addEventListener('click', onClick);
    return b;
  }

  function pass(api, C, go) {
    api.complete();
    api.say(C.ok || '', 'ok');
    if (go) go.disabled = true;
  }

  /* ================= multi — "סמנו את כל המצבים המתאימים" ================= */
  function multi(api, C) {
    var el = api.el;
    var wrap = el('div', 'mech chk chk-multi');
    if (C.question) wrap.appendChild(el('p', 'chk-q', C.question));

    var picked = {};
    var locked = false;
    var box = el('div', 'chk-opts');
    var btns = C.options.map(function (o, i) {
      var b = el('button', 'chk-opt');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('span', 'chk-box'));
      b.appendChild(el('span', 'chk-text', o.text));
      b.addEventListener('click', function () {
        if (locked) return;
        picked[i] = !picked[i];
        b.setAttribute('aria-pressed', String(!!picked[i]));
        b.classList.toggle('is-picked', !!picked[i]);
        api.say('', null);
        go.disabled = !Object.keys(picked).some(function (k) { return picked[k]; });
      });
      box.appendChild(b);
      return b;
    });

    var go = goButton(api, function () {
      var right = C.options.every(function (o, i) { return !!picked[i] === !!o.right; });
      if (!right) { api.miss(); return; }
      locked = true;
      btns.forEach(function (b, i) {
        b.disabled = true;
        if (C.options[i].right) b.classList.add('is-right');
      });
      pass(api, C, go);
    });

    wrap.appendChild(box);
    wrap.appendChild(go);
    api.stage.appendChild(wrap);
  }

  /* ================= single — one right answer out of four ================= */
  function single(api, C) {
    var el = api.el;
    var wrap = el('div', 'mech chk chk-single');
    if (C.question) wrap.appendChild(el('p', 'chk-q', C.question));

    var pick = -1;
    var locked = false;
    var box = el('div', 'chk-opts');
    var btns = C.options.map(function (o, i) {
      var b = el('button', 'chk-opt');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('span', 'chk-box chk-radio'));
      b.appendChild(el('span', 'chk-text', o.text));
      b.addEventListener('click', function () {
        if (locked) return;
        pick = i;
        btns.forEach(function (x, k) {
          x.setAttribute('aria-pressed', String(k === i));
          x.classList.toggle('is-picked', k === i);
        });
        api.say('', null);
        go.disabled = false;
      });
      box.appendChild(b);
      return b;
    });

    var go = goButton(api, function () {
      if (pick < 0 || !C.options[pick].right) { api.miss(); return; }
      locked = true;
      btns.forEach(function (b, i) {
        b.disabled = true;
        if (C.options[i].right) b.classList.add('is-right');
      });
      pass(api, C, go);
    });

    wrap.appendChild(box);
    wrap.appendChild(go);
    api.stage.appendChild(wrap);
  }

  /* ================= match — each prayer to its time ================= */
  function match(api, C) {
    var el = api.el;
    var wrap = el('div', 'mech chk chk-match');

    var pairs = C.pairs;
    var order = reorder(pairs.map(function (_, i) { return i; }), [3, 0, 4, 1, 2].slice(0, pairs.length));
    var sel = -1;         // index of the currently picked left item
    var matched = {};     // left index -> pair number
    var count = 0;

    var grid = el('div', 'chk-grid');
    var colL = el('div', 'chk-col');
    colL.setAttribute('aria-label', 'תפילות');
    var colR = el('div', 'chk-col');
    colR.setAttribute('aria-label', 'זמנים');

    var lefts = pairs.map(function (p, i) {
      var b = el('button', 'chk-item');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('span', 'chk-num'));
      b.appendChild(el('span', 'chk-text', p.left));
      b.addEventListener('click', function () {
        if (matched[i] != null) return;
        sel = i;
        lefts.forEach(function (x, k) {
          if (matched[k] != null) return;
          x.setAttribute('aria-pressed', String(k === i));
          x.classList.toggle('is-sel', k === i);
        });
        api.say('בחרו את הזמן שבו נאמרת ' + p.left + '.', 'ok');
      });
      colL.appendChild(b);
      return b;
    });

    var rights = order.map(function (srcIdx) {
      var b = el('button', 'chk-item');
      b.type = 'button';
      b.appendChild(el('span', 'chk-num'));
      b.appendChild(el('span', 'chk-text', pairs[srcIdx].right));
      b.addEventListener('click', function () {
        if (b.disabled) return;
        if (sel < 0) { api.say('בחרו קודם תפילה, ואז את הזמן המתאים לה.', 'try'); return; }
        if (srcIdx !== sel) {
          /* only this attempt falls away — every pair already made stays where it is */
          var back = sel;
          lefts[back].classList.remove('is-sel');
          lefts[back].setAttribute('aria-pressed', 'false');
          sel = -1;
          api.miss();
          return;
        }
        count++;
        matched[sel] = count;
        lefts[sel].classList.remove('is-sel');
        lefts[sel].classList.add('is-matched');
        lefts[sel].disabled = true;
        lefts[sel].querySelector('.chk-num').textContent = String(count);
        b.classList.add('is-matched');
        b.disabled = true;
        b.querySelector('.chk-num').textContent = String(count);
        sel = -1;
        api.say('', null);
        if (count === pairs.length) pass(api, C);
      });
      colR.appendChild(b);
      return b;
    });

    grid.appendChild(colL);
    grid.appendChild(colR);
    wrap.appendChild(grid);
    api.stage.appendChild(wrap);
    api.hint('בחרו תפילה, ואז את הזמן שלה. התאמה שכבר נעשתה נשארת במקומה.');
  }

  /* ================= order — put the steps in sequence =================
     The spec's rule is the whole design here: a wrong order must never wipe the exercise.
     So slots are addressed individually rather than as a stack — on a check, each step that
     is already in the right place locks where it is, and only the ones out of place come
     back to the bank. Getting step 1 wrong costs you step 1, not the other six. */
  function ordering(api, C) {
    var el = api.el;
    var wrap = el('div', 'chk chk-order mech');

    var STEPS = C.steps;
    var placed = STEPS.map(function () { return null; });  // slot index -> step name
    var locked = STEPS.map(function () { return false; });

    var line = el('div', 'chk-slots');
    var slots = STEPS.map(function (_, i) {
      var s = el('div', 'chk-slot');
      s.setAttribute('data-i', String(i));
      line.appendChild(s);
      return s;
    });

    var bank = el('div', 'chk-bank');
    var chips = {};
    /* A stable scramble. Stepping by 3 hits every index exactly once for 5 and for 7 (both
       are coprime with 3), so the bank holds each step once, in an order that is never the
       answer and never changes between visits. */
    var perm = STEPS.map(function (_, i) { return (i * 3 + 2) % STEPS.length; });
    perm.forEach(function (i) {
      var name = STEPS[i];
      var b = el('button', 'chk-chip');
      b.type = 'button';
      b.textContent = name;
      b.addEventListener('click', function () { place(name); });
      bank.appendChild(b);
      chips[name] = b;
    });

    function full() {
      return placed.every(function (x) { return x != null; });
    }

    function paintSlot(i) {
      var s = slots[i];
      s.innerHTML = '';
      var name = placed[i];
      if (name == null) {
        s.appendChild(el('span', 'chk-slot-num', String(i + 1)));
        s.classList.remove('is-full', 'is-locked');
        return;
      }
      s.classList.add('is-full');
      var tag = el('button', 'chk-placed');
      tag.type = 'button';
      tag.appendChild(el('span', 'chk-slot-num', String(i + 1)));
      tag.appendChild(el('span', 'chk-text', name));
      if (locked[i]) {
        s.classList.add('is-locked');
        tag.disabled = true;
        tag.appendChild(api.svg('<path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'));
      } else {
        tag.setAttribute('aria-label', 'הסרה: ' + name);
        tag.addEventListener('click', function () { pull(i); });
      }
      s.appendChild(tag);
    }

    function place(name) {
      if (placed.indexOf(name) >= 0) return;
      var at = placed.indexOf(null);      // the first slot still open
      if (at < 0) return;
      placed[at] = name;
      chips[name].disabled = true;
      paintSlot(at);
      api.say('', null);
      go.disabled = !full();
    }

    function pull(i) {
      if (locked[i] || placed[i] == null) return;
      chips[placed[i]].disabled = false;
      placed[i] = null;                    // only this slot opens; the rest stay put
      paintSlot(i);
      go.disabled = true;
      api.say('', null);
    }

    var go = goButton(api, function () {
      var wrong = [];
      STEPS.forEach(function (want, i) {
        if (placed[i] === want) locked[i] = true; else wrong.push(i);
      });
      /* Local correction, never a reset: a step already in its right place is locked there
         even if the steps around it are wrong. Only the misplaced ones return to the bank,
         so a learner who has four of five right refills one slot, not five. */
      wrong.forEach(function (i) {
        if (placed[i] != null) chips[placed[i]].disabled = false;
        placed[i] = null;
      });
      slots.forEach(function (_, i) { paintSlot(i); });
      if (!wrong.length) { pass(api, C, go); return; }
      go.disabled = true;
      api.miss();
    });

    wrap.appendChild(line);
    wrap.appendChild(bank);
    wrap.appendChild(go);
    api.stage.appendChild(wrap);
    api.hint('לחצו על שלב כדי למקם אותו בתור הבא; לחיצה על שלב שכבר מוקם מחזירה אותו.');
    slots.forEach(function (_, i) { paintSlot(i); });
  }

  /* ================= situations — the closing exercise ================= */
  function situations(api, C) {
    var el = api.el;
    var wrap = el('div', 'mech chk chk-sits');

    var VERB_ICON = {
      shahada: 'icon-shahada.png', prayer: 'icon-prayer.png', charity: 'icon-charity.png',
      fast: 'icon-ramadan.png', hajj: 'icon-hajj.png'
    };
    var sel = null;
    var matched = {};

    var targets = {};
    var row = el('div', 'chk-targets');
    C.pairs.forEach(function (p) {
      var t = el('button', 'chk-target');
      t.type = 'button';
      t.setAttribute('data-k', p.key);
      t.setAttribute('aria-label', 'שיוך אל ' + p.to);
      var im = el('img');
      im.src = 'assets/anim-video/' + VERB_ICON[p.key];
      im.alt = '';
      t.appendChild(im);
      t.appendChild(el('b', null, p.to));
      t.addEventListener('click', function () { drop(p.key); });
      row.appendChild(t);
      targets[p.key] = t;
    });

    var pool = el('div', 'chk-bank chk-sit-bank');
    var chips = {};
    reorder(C.pairs, [2, 4, 0, 3, 1]).forEach(function (p) {
      var b = el('button', 'chk-chip chk-sit');
      b.type = 'button';
      b.textContent = p.text;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        if (matched[p.key]) return;
        sel = p.key;
        Object.keys(chips).forEach(function (k) {
          chips[k].setAttribute('aria-pressed', String(k === p.key));
          chips[k].classList.toggle('is-sel', k === p.key);
        });
        api.say('בחרו את מצוות היסוד שאליה הסיטואציה שייכת.', 'ok');
      });
      pool.appendChild(b);
      chips[p.key] = b;
    });

    function drop(key) {
      if (!sel) { api.say('בחרו קודם סיטואציה, ואז את המצווה המתאימה לה.', 'try'); return; }
      if (key !== sel) {
        chips[sel].classList.remove('is-sel');
        chips[sel].setAttribute('aria-pressed', 'false');
        sel = null;
        api.miss();
        return;
      }
      matched[key] = true;
      chips[key].classList.remove('is-sel');
      chips[key].classList.add('is-matched');
      chips[key].disabled = true;
      targets[key].classList.add('is-filled');
      sel = null;
      api.say('', null);
      if (Object.keys(matched).length === C.pairs.length) pass(api, C);
    }

    wrap.appendChild(row);
    wrap.appendChild(pool);
    api.stage.appendChild(wrap);
    api.hint('בחרו סיטואציה, ואז את מצוות היסוד שאליה היא שייכת.');
  }

  var TYPES = { multi: multi, single: single, match: match, order: ordering, situations: situations };

  /* every check screen in data.js routes through here by its declared type */
  ['sh-c', 'pr-c', 'ch-c', 'rm-c', 'hj-c', 'sum-c'].forEach(function (id) {
    M[id] = function (api) {
      var C = api.screen.check;
      if (!C || !TYPES[C.type]) { console.error('check ' + id + ': unknown type', C && C.type); return; }
      TYPES[C.type](api, C);
    };
  });

  /* ================= hj-v — the route map the החג' section was missing =================
     Seven stations in the order the source gives them. It is an illustration, not a puzzle:
     it never gates the chapter, and stepping through it is the whole interaction. */
  M['hj-v'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech hjmap');

    var STOPS = [
      { name: 'אחראם', note: 'כניסה למצב טהרה, לפני קו המיקאת.' },
      { name: 'טוואף', note: 'שבע הקפות סביב הכעבה, נגד כיוון השעון.' },
      { name: 'סעי', note: 'ריצה בין צפא ומרוה, כריצתה של הגר.' },
      { name: 'ערפה', note: 'העלייה להר והעמידה — הווקוף — במישור.' },
      { name: 'מוזדליפה', note: 'עצירה בדרך חזרה, ואיסוף האבנים.' },
      { name: 'מינא', note: 'רגימת השטן באבנים שנאספו.' },
      { name: 'חזרה למכה', note: 'חג הקורבן וההקפות האחרונות.' }
    ];

    var route = el('div', 'hjmap-route');
    var line = el('div', 'hjmap-line');
    line.setAttribute('aria-hidden', 'true');
    route.appendChild(line);

    var read = el('div', 'hjmap-read');
    read.setAttribute('role', 'status');
    read.setAttribute('aria-live', 'polite');

    var at = -1;
    var seen = {};

    var nodes = STOPS.map(function (S, i) {
      var b = el('button', 'hjmap-stop');
      b.type = 'button';
      b.setAttribute('aria-label', S.name);
      b.appendChild(el('span', 'hjmap-dot', String(i + 1)));
      b.appendChild(el('span', 'hjmap-name', S.name));
      b.addEventListener('click', function () { show(i); });
      route.appendChild(b);
      return b;
    });

    function show(i) {
      at = i;
      seen[i] = true;
      nodes.forEach(function (n, k) {
        n.classList.toggle('is-on', k === i);
        n.classList.toggle('is-past', k < i);
      });
      line.style.setProperty('--p', (i / (STOPS.length - 1) * 100) + '%');
      read.innerHTML = '';
      read.appendChild(el('b', null, (i + 1) + '. ' + STOPS[i].name));
      read.appendChild(el('span', null, STOPS[i].note));
      if (Object.keys(seen).length === STOPS.length) {
        api.complete();
        api.say('זהו סדר התחנות: אחראם, טוואף, סעי, ערפה, מוזדליפה, מינא וחזרה למכה.', 'ok');
        hint.classList.add('is-gone');
      }
    }

    var step = el('button', 'mech-btn mech-btn-primary hjmap-step');
    step.type = 'button';
    step.textContent = 'התחנה הבאה';
    step.addEventListener('click', function () {
      show(at >= STOPS.length - 1 ? 0 : at + 1);
    });

    wrap.appendChild(route);
    wrap.appendChild(read);
    wrap.appendChild(step);
    api.stage.appendChild(wrap);
    var hint = api.hint('לחצו על תחנה, או התקדמו לאורך המסלול תחנה אחר תחנה.');
    show(0);
  };
})();
