/* Chapter 6 engine — screen orchestration, progress, persistence, drawer.
   Mechanisms register themselves into CH6M[screenId]; this file knows nothing about them. */
(function () {
  'use strict';

  var DATA = window.CH6;
  var MECH = (window.CH6M = window.CH6M || {});
  var STORE = 'ch6:v1';

  /* ---------------------------------------------------------------------------
     PROGRESS SAVING — TEMPORARILY OFF (at the user's request, while reviewing).
     Off: every entry replays the film and starts the chapter clean, so the flow
     can be judged as a first-time learner sees it. Progress still tracks in
     memory during a session, so "המשך" and the rail behave normally.
     To switch it back on later, set this to true — nothing else needs changing.
  --------------------------------------------------------------------------- */
  var PERSIST = false;

  var reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* The rail carries the five commandments by name — that is what the learner is looking
     for when they ask "where am I". The verb stays on the record because screen 01 and the
     closing summary are built around the commandment→action move. */
  var VERBS = [
    { key: 'shahada', verb: 'להעיד', name: 'השהאדה', section: 'השהאדה' },
    { key: 'prayer', verb: 'להתפלל', name: 'התפילה', section: 'התפילה' },
    { key: 'charity', verb: 'לתת', name: 'הצדקה', section: 'הצדקה' },
    { key: 'fast', verb: 'לצום', name: 'רמדאן', section: 'צום רמדאן' },
    { key: 'hajj', verb: 'לעלות לרגל', name: "החג'", section: "החג'" }
  ];
  var verbOf = {};
  VERBS.forEach(function (v) { verbOf[v.section] = v; });

  var screens = DATA.screens;
  var byId = {};
  screens.forEach(function (s, i) { s._i = i; byId[s.id] = s; });

  /* ---------------- state ----------------
     `done` = the learner may move on (every screen earns this on arrival except a check).
     `mech` = the screen's own interaction was actually finished. Keeping them apart is what
     lets an illustration be non-blocking without rendering itself pre-solved on arrival. */
  var state = { screen: 0, done: {}, mech: {}, completed: false };
  try {
    if (PERSIST) {
      var raw = localStorage.getItem(STORE);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          state.done = p.done || {};
          state.mech = p.mech || {};
          state.completed = !!p.completed;
          if (typeof p.screen === 'number' && p.screen >= 0 && p.screen < screens.length) state.screen = p.screen;
        }
      }
    } else {
      /* clear anything an earlier visit left behind, so a stale key can't
         silently skip the film or pre-tick screens while reviewing */
      localStorage.removeItem(STORE);
      localStorage.removeItem('islam:chapter:6');
    }
  } catch (e) { /* corrupt or blocked storage must never break the lesson */ }

  function save() {
    if (!PERSIST) return;
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
  }

  /* one place records a screen as passed, so the rail and the nav can never disagree */
  function markDone(id, idx) {
    if (state.done[id]) return;
    state.done[id] = true;
    save();
    syncRail();
    if (idx === state.screen) syncNav();
  }

  /* ---------------- dom helpers ---------------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(paths, vb) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', vb || '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = paths;
    return s;
  }

  /* ---------------- chrome ---------------- */
  var chapterEl = document.getElementById('chapter');
  var railList = document.getElementById('rail-list');
  var railCount = document.getElementById('rail-count');
  var btnPrev = document.getElementById('btn-prev');
  var btnNext = document.getElementById('btn-next');
  var btnNextLabel = btnNext.querySelector('.label');
  var navHint = document.getElementById('nav-hint');

  var CHECK_MARK = '<path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>';

  var verbBtns = {};
  VERBS.forEach(function (v, i) {
    var li = el('li');
    var b = el('button', 'verb');
    b.type = 'button';
    /* the dot carries a tick once the commandment is finished — state is never colour alone */
    var dot = el('span', 'dot');
    dot.appendChild(svg(CHECK_MARK));
    b.appendChild(dot);
    b.appendChild(el('span', null, v.name));
    b.addEventListener('click', function () {
      var target = firstScreenOfSection(v.section);
      if (target != null && reachable(target)) go(target);
    });
    li.appendChild(b);
    railList.appendChild(li);
    verbBtns[v.key] = b;
    if (i < VERBS.length - 1) {
      var sep = el('li');
      sep.appendChild(el('span', 'sep'));
      sep.setAttribute('aria-hidden', 'true');
      railList.appendChild(sep);
    }
  });

  function firstScreenOfSection(section) {
    for (var i = 0; i < screens.length; i++) if (screens[i].section === section) return i;
    return null;
  }
  /* a section is reachable once its first screen has been seen, or the one before it is done */
  function reachable(i) {
    if (i <= state.screen) return true;
    for (var k = 0; k < i; k++) if (!state.done[screens[k].id]) return false;
    return true;
  }
  function sectionDone(section) {
    return screens.every(function (s) { return s.section !== section || state.done[s.id]; });
  }

  /* ---------------- screen construction ---------------- */
  var built = {};

  /* Four shapes, one per job. The rule behind them: a reading screen is a reading screen —
     the source text gets the whole column, at full size, with the page's own scroll. It is
     never squeezed into a card beside an interaction, and never hidden behind one. */
  function buildScreen(idx) {
    var s = screens[idx];
    var kind = s.kind || 'content';
    var root = el('section', 'screen kind-' + kind);
    root.id = 'screen-' + s.id;
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', s.section + ' — ' + s.title);

    var head = el('div', 'screen-head');
    head.appendChild(el('div', 'eyebrow', s.section));
    var h1 = el('h1', null, s.title);
    h1.id = 'title-' + s.id;
    head.appendChild(h1);
    root.appendChild(head);

    var stage = el('div', 'stage-pane');
    stage.setAttribute('role', 'group');
    stage.setAttribute('aria-labelledby', 'title-' + s.id);

    var fb = el('div', 'feedback');
    fb.setAttribute('role', 'status');
    fb.setAttribute('aria-live', 'polite');

    var paras = [];
    function readingColumn(host) {
      (s.content || []).forEach(function (t) {
        var n = el('p', null, t);
        host.appendChild(n);
        paras.push(n);
      });
    }

    if (kind === 'content') {
      /* the whole screen IS the text: one column, page scroll, nothing beside it */
      var read = el('article', 'read');
      readingColumn(read);
      root.appendChild(read);

    } else if (kind === 'transition') {
      /* a short summary and one clear button — the button lives in the navbar */
      var t = el('div', 'transition');
      t.appendChild(el('p', 'transition-text', s.text || ''));
      root.appendChild(t);

    } else if (kind === 'visual' || kind === 'check') {
      /* the text was already read; this screen shows or asks, and says so in one line */
      if (s.lead) root.appendChild(el('p', 'lead', s.lead));
      if (s.check && s.check.instruction) {
        var lead = el('p', 'lead lead-do', s.check.instruction);
        root.appendChild(lead);
      }
      root.appendChild(stage);
      root.appendChild(fb);

    } else {
      /* opening (01) and finish: bespoke screens that own their own layout */
      var split = el('div', 'split');
      var content = el('aside', 'content-pane');
      content.setAttribute('aria-label', 'תוכן הפרק — ' + s.title);
      readingColumn(content);
      content.appendChild(fb);
      split.appendChild(stage);
      split.appendChild(content);
      root.appendChild(split);
    }
    chapterEl.appendChild(root);

    var misses = 0;
    var hintBox = null;

    var api = {
      screen: s,
      stage: stage,
      content: content,
      paras: paras,
      reduced: reduced,
      el: el,
      svg: svg,
      /* mechanisms call this when their own completion condition is met */
      complete: function () {
        if (state.mech[s.id]) return;
        state.mech[s.id] = true;
        markDone(s.id, idx);
        save();
      },
      say: function (text, tone) {
        fb.textContent = text || '';
        if (text) fb.setAttribute('data-tone', tone || 'ok');
        else fb.removeAttribute('data-tone');
      },
      /* A wrong answer never resets the exercise — it says what is off and lets the learner
         fix that one thing. The spec's rule: after the second miss, and only then, the hint
         appears and stays, so a learner cannot get stuck on a gated screen. */
      miss: function (text) {
        misses++;
        api.say(text || (s.check && s.check.try) || '', 'try');
        var h = (s.check && s.check.hint);
        if (misses >= 2 && h && !hintBox) {
          hintBox = el('div', 'hint-box');
          hintBox.setAttribute('role', 'note');
          hintBox.appendChild(svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/>'));
          hintBox.appendChild(el('span', null, h));
          fb.parentNode.insertBefore(hintBox, fb.nextSibling);
        }
        return misses;
      },
      /* emphasis follows the interaction; it never hides or gates the text */
      highlight: function (i) {
        paras.forEach(function (p, k) {
          if (i === k) p.setAttribute('data-hl', '1'); else p.removeAttribute('data-hl');
        });
      },
      /* The hint is the mechanism's own closing line, so it goes inside the mechanism's
         column — every mechanism calls this straight after appending its wrapper, so the
         hint lands last, under the control it describes. Floated off the stage's bottom
         edge instead, it was painted straight across the slider thumb and the buttons on
         nearly every screen once the viewport dropped below ~1170px: the controls sit on
         `.mech`'s bottom padding (2.4vw), which shrinks faster than the hint's own 12px. */
      hint: function (text) {
        var h = el('div', 'hint', text);
        (stage.querySelector('.mech') || stage).appendChild(h);
        return h;
      },
      /* every pointer mechanism must also be operable from a button */
      altButtons: function (defs) {
        var box = el('div', 'kbd-alt');
        defs.forEach(function (d) {
          var b = el('button', null, d.label);
          b.type = 'button';
          b.addEventListener('click', d.onClick);
          box.appendChild(b);
        });
        stage.appendChild(box);
        return box;
      },
      /* "did the mechanism finish", which is not the same question as "may the learner move
         on" — an illustration is free to be unfinished and the chapter still moves. */
      done: function () { return !!state.mech[s.id]; }
    };

    var m = MECH[s.id];
    if (m) {
      try { m(api); }
      catch (err) { console.error('mechanism ' + s.id + ' failed', err); }
    }
    /* Only a check may hold the learner. Reading screens and illustrations are done the
       moment they are on screen, so no illustration can ever turn into a gate. */
    if (kind !== 'check') markDone(s.id, idx);

    built[idx] = { root: root, api: api };
    return built[idx];
  }

  /* ---------------- navigation ---------------- */
  function syncRail() {
    VERBS.forEach(function (v) {
      var b = verbBtns[v.key];
      var cur = screens[state.screen].section === v.section;
      if (cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.setAttribute('data-done', sectionDone(v.section) ? '1' : '0');
      var t = firstScreenOfSection(v.section);
      var ok = t != null && reachable(t);
      if (ok) b.removeAttribute('disabled'); else b.setAttribute('disabled', '');
    });
    /* Position inside the commandment, not inside the chapter: "12 מתוך 44" tells a learner
       nothing they can act on, while "השהאדה · 2 מתוך 6" answers the question they asked. */
    var cur = screens[state.screen];
    var fam = screens.filter(function (x) { return x.section === cur.section; });
    var at = fam.indexOf(cur) + 1;
    railCount.textContent = cur.section + ' · ' + at + ' מתוך ' + fam.length;
  }

  function syncNav() {
    var s = screens[state.screen];
    btnPrev.disabled = state.screen === 0;
    var isDone = !!state.done[s.id];
    /* the last screen carries its own finish button; a dead "המשך" beside it would only mislead */
    var last = state.screen === screens.length - 1;
    btnNext.hidden = last;
    btnNext.disabled = !isDone;
    /* a transition button names where it goes; inside a commandment "המשך" is the truth */
    btnNextLabel.textContent = s.nextLabel || 'המשך';
    navHint.textContent = isDone ? '' : (s.completion || '');
  }

  function go(idx) {
    if (idx < 0 || idx >= screens.length) return;
    if (!built[idx]) buildScreen(idx);
    Object.keys(built).forEach(function (k) { built[k].root.classList.remove('is-active'); });
    built[idx].root.classList.add('is-active');
    state.screen = idx;
    save();
    syncRail();
    syncNav();
    if (built[idx].api.onEnter) built[idx].api.onEnter();
    var h = built[idx].root.querySelector('h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  }

  btnPrev.addEventListener('click', function () { go(state.screen - 1); });
  btnNext.addEventListener('click', function () {
    if (state.screen === screens.length - 1) return; // screen 30 owns its own finish button
    go(state.screen + 1);
  });

  /* ---------------- story drawer (screen 01) ---------------- */
  var scrim = document.getElementById('drawer-scrim');
  var drawer = document.getElementById('drawer');
  var drawerBody = document.getElementById('drawer-body');
  var drawerTitle = document.getElementById('drawer-title');
  var drawerClose = document.getElementById('drawer-close');
  var lastFocus = null;

  function openDrawer(title, paras, opener) {
    drawerTitle.textContent = title;
    drawerBody.innerHTML = '';
    paras.forEach(function (p) { drawerBody.appendChild(el('p', null, p)); });
    lastFocus = opener || document.activeElement;
    scrim.classList.add('is-open');
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    /* The panel is `visibility:hidden` until `.is-open` is applied, and focus() on a hidden
       element is silently a no-op — measured: the dialog opened with focus still on the page
       behind it, so the trap never engaged and a keyboard user was never taken into it.
       requestAnimationFrame is NOT the fix: its callbacks run before the frame's style
       recalc, so the element is still hidden there. Reading a layout property forces the
       class change into computed style first, and then the same call lands. */
    void drawer.offsetHeight;
    drawerClose.focus();
    document.addEventListener('keydown', drawerKeys);
  }
  function closeDrawer() {
    scrim.classList.remove('is-open');
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', drawerKeys);
    if (lastFocus) lastFocus.focus();
  }
  function drawerKeys(e) {
    if (e.key === 'Escape') { closeDrawer(); return; }
    if (e.key !== 'Tab') return;
    /* focus trap */
    var f = drawer.querySelectorAll('button,[href],[tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  drawerClose.addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);

  /* ---------------- public surface for mechanisms ---------------- */
  window.CH6E = {
    go: go,
    goto: function (id) { if (byId[id]) go(byId[id]._i); },
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    verbs: VERBS,
    state: state,
    save: save,
    sectionDone: sectionDone,
    firstScreenOfSection: firstScreenOfSection,
    reduced: reduced,
    markChapterComplete: function () {
      state.completed = true;
      save();
      if (!PERSIST) return;
      try {
        /* the site has no progress store yet; use a namespace the chapters page can read later */
        localStorage.setItem('islam:chapter:6', 'done');
      } catch (e) {}
    }
  };

  /* ---------------- boot ---------------- */
  window.CH6_START = function (startIdx) {
    document.getElementById('lesson').hidden = false;
    go(typeof startIdx === 'number' ? startIdx : Math.max(1, state.screen));
  };
  window.CH6_RESUME_SCREEN = state.screen;
  window.CH6_HAS_PROGRESS = Object.keys(state.done).length > 0;
})();
