/* סיכום.
   LIVE: sum-end — the finish screen. The closing exercise moved to mech-checks.js.
   RETIRED, code kept intact: 29 — the check the spec asks for here has a different
   option set and different wording, so it is authored in mech-checks.js from data.js. */
(function () {
  'use strict';
  var M = window.CH6M;

  var VERB_ICON = {
    shahada: 'icon-shahada.png',
    prayer: 'icon-prayer.png',
    charity: 'icon-charity.png',
    fast: 'icon-ramadan.png',
    hajj: 'icon-hajj.png'
  };

  /* ================= 29 — חמש פעולות, דרך חיים אחת ================= */
  M['29'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s29');

    /* each situation belongs to exactly one verb; they are states, not trivia */
    var SITS = [
      { k: 'shahada', text: 'אמירת העדות', verb: 'להעיד' },
      { k: 'prayer', text: 'תפילה בשקיעה', verb: 'להתפלל' },
      { k: 'charity', text: 'מתן 2.5%', verb: 'לתת' },
      { k: 'fast', text: 'צום עד השקיעה', verb: 'לצום' },
      { k: 'hajj', text: 'הקפת הכעבה', verb: 'לעלות לרגל' }
    ];
    var matched = {};
    var selected = null;

    var sentence = el('div', 's29-sentence');
    var targets = {};
    window.CH6E.verbs.forEach(function (v) {
      var t = el('button', 's29-verb');
      t.type = 'button';
      t.setAttribute('data-k', v.key);
      t.setAttribute('aria-label', 'שיוך אל ' + v.verb);
      var im = el('img');
      im.src = 'assets/anim-video/' + VERB_ICON[v.key];
      im.alt = '';
      t.appendChild(im);
      t.appendChild(el('b', null, v.verb));
      t.addEventListener('click', function () { drop(v.key); });
      sentence.appendChild(t);
      targets[v.key] = t;
    });

    var pool = el('div', 's29-pool');
    var chips = {};
    /* offered out of order so the match is a judgement, not a row-by-row copy */
    ['charity', 'hajj', 'shahada', 'fast', 'prayer'].forEach(function (k) {
      var S = SITS.filter(function (x) { return x.k === k; })[0];
      var b = el('button', 's29-sit');
      b.type = 'button';
      b.textContent = S.text;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { pick(k, b); });
      pool.appendChild(b);
      chips[k] = b;
    });

    function pick(k, b) {
      if (matched[k]) return;
      selected = k;
      pool.querySelectorAll('.s29-sit').forEach(function (x) {
        x.setAttribute('aria-pressed', 'false'); x.classList.remove('is-sel');
      });
      b.setAttribute('aria-pressed', 'true');
      b.classList.add('is-sel');
      api.say('בחרו את הפועל שאליו הסיטואציה שייכת', 'ok');
    }

    function drop(verbKey) {
      if (!selected) { api.say('בחרו קודם סיטואציה, ואז את הפועל המתאים לה', 'try'); return; }
      if (verbKey !== selected) {
        api.say('הסיטואציה הזו שייכת לפועל אחר. בדקו שוב לאיזו מצווה היא מתארת.', 'try');
        return;
      }
      matched[verbKey] = true;
      chips[verbKey].disabled = true;
      chips[verbKey].classList.remove('is-sel');
      chips[verbKey].classList.add('is-done');
      targets[verbKey].classList.add('is-filled');
      selected = null;
      api.say('', null);
      if (Object.keys(matched).length === 5) {
        api.complete();
        api.say((api.screen.feedback || [])[0] || '', 'ok');
        hint.classList.add('is-gone');
      }
    }

    wrap.appendChild(sentence);
    wrap.appendChild(pool);
    api.stage.appendChild(wrap);
    var hint = api.hint('בחרו סיטואציה, ואז את הפועל שאליו היא שייכת');
    if (api.done()) {
      Object.keys(chips).forEach(function (k) {
        matched[k] = true;
        chips[k].disabled = true;
        chips[k].classList.add('is-done');
        targets[k].classList.add('is-filled');
      });
      api.say((api.screen.feedback || [])[0] || '', 'ok');
      hint.classList.add('is-gone');
    }
  };

  /* ================= 30 — סיום הפרק ================= */
  M['sum-end'] = function (api) {
    var el = api.el;
    var wrap = el('div', 'mech s30');

    /* one memory line per verb — a summary of the chapter, never a replacement for it */
    var MEMORY = {
      shahada: 'העדות שאין אל מבלעדי אללה ושמוחמד הוא שליחו.',
      prayer: 'חמש תפילות ביום, בזמנים קבועים, בכוונה ולכיוון מכה.',
      charity: '2.5% מן המאזן השנתי — 1/40 — לעניים, לנזקקים, ליתומים ולבתי תמחוי.',
      fast: 'צום מעלות השחר עד השקיעה בחודש שבו ירד הקוראן.',
      hajj: 'מסע אחד בחיים, למי שביכולתו — מן המיקאת ועד ההקפה האחרונה.'
    };

    var grid = el('div', 's30-grid');
    window.CH6E.verbs.forEach(function (v) {
      var card = el('button', 's30-card');
      card.type = 'button';
      var complete = window.CH6E.sectionDone(v.section);
      card.setAttribute('data-done', complete ? '1' : '0');
      card.setAttribute('aria-label', 'חזרה אל ' + v.verb);
      var im = el('img');
      im.src = 'assets/anim-video/' + VERB_ICON[v.key];
      im.alt = '';
      card.appendChild(im);
      card.appendChild(el('b', null, v.verb));
      card.appendChild(el('span', 's30-mem', MEMORY[v.key]));
      if (!complete) card.appendChild(el('span', 's30-flag', 'נותרו חלקים פתוחים'));
      card.addEventListener('click', function () {
        var t = window.CH6E.firstScreenOfSection(v.section);
        if (t != null) window.CH6E.go(t);
      });
      grid.appendChild(card);
    });

    var openSections = window.CH6E.verbs.filter(function (v) {
      return !window.CH6E.sectionDone(v.section);
    });

    var note = el('p', 's30-note');
    note.textContent = openSections.length
      ? 'אפשר לחזור לחלקים שנותרו פתוחים, או לסיים את הפרק.'
      : 'כל חמשת החלקים הושלמו.';

    var finish = el('button', 'btn btn-primary s30-finish');
    finish.type = 'button';
    finish.textContent = 'סיום הפרק';

    var after = el('div', 's30-after');
    after.hidden = true;
    var back = el('a', 'btn btn-ghost');
    back.href = 'chapters.html';
    back.textContent = 'חזרה לפרקי הלמידה';
    var next = el('a', 'btn btn-primary');
    next.href = 'chapters.html';
    next.textContent = 'לפרק הבא';
    after.appendChild(back);
    after.appendChild(next);

    finish.addEventListener('click', function () {
      window.CH6E.markChapterComplete();
      api.complete();
      finish.hidden = true;
      after.hidden = false;
      /* status, not a score — the spec forbids a numeric grade */
      api.say('פרק 6 סומן כהושלם.', 'ok');
      wrap.classList.add('is-finished');
      back.focus();
    });

    wrap.appendChild(grid);
    wrap.appendChild(note);
    wrap.appendChild(finish);
    wrap.appendChild(after);
    api.stage.appendChild(wrap);

    if (window.CH6E.state.completed) {
      finish.hidden = true;
      after.hidden = false;
      wrap.classList.add('is-finished');
      api.complete();
      api.say('פרק 6 סומן כהושלם.', 'ok');
    }
  };
})();
