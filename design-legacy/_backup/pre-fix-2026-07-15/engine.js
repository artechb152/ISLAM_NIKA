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

  /* the five verbs are the chapter's spine: sections map onto them */
  var VERBS = [
    { key: 'shahada', verb: 'להעיד', section: 'השהאדה' },
    { key: 'prayer', verb: 'להתפלל', section: 'התפילה' },
    { key: 'charity', verb: 'לתת', section: 'הצדקה' },
    { key: 'fast', verb: 'לצום', section: 'צום רמדאן' },
    { key: 'hajj', verb: 'לעלות לרגל', section: "החג'" }
  ];
  var verbOf = {};
  VERBS.forEach(function (v) { verbOf[v.section] = v; });

  var screens = DATA.screens;
  var byId = {};
  screens.forEach(function (s, i) { s._i = i; byId[s.id] = s; });

  /* ---------------- state ---------------- */
  var state = { screen: 0, done: {}, completed: false };
  try {
    if (PERSIST) {
      var raw = localStorage.getItem(STORE);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          state.done = p.done || {};
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
  var navHint = document.getElementById('nav-hint');

  var verbBtns = {};
  VERBS.forEach(function (v, i) {
    var li = el('li');
    var b = el('button', 'verb');
    b.type = 'button';
    b.appendChild(el('span', 'dot'));
    b.appendChild(el('span', null, v.verb));
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

  function buildScreen(idx) {
    var s = screens[idx];
    var root = el('section', 'screen');
    root.id = 'screen-' + s.id;
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', s.title);

    var head = el('div', 'screen-head');
    var eyebrow = el('div', 'eyebrow', s.section);
    var h1 = el('h1', null, s.title);
    h1.id = 'title-' + s.id;
    head.appendChild(eyebrow);
    head.appendChild(h1);
    root.appendChild(head);

    var split = el('div', 'split');
    var stage = el('div', 'stage-pane');
    stage.setAttribute('role', 'group');
    stage.setAttribute('aria-labelledby', 'title-' + s.id);

    var content = el('aside', 'content-pane');
    content.setAttribute('aria-label', 'תוכן הפרק — ' + s.title);

    /* every source paragraph renders up-front and stays in the DOM,
       readable regardless of whether the interaction was completed */
    var paras = [];
    if (s.content && s.content.length) {
      content.appendChild(el('h2', null, 'מן המקור'));
      s.content.forEach(function (p) {
        var n = el('p', null, p);
        content.appendChild(n);
        paras.push(n);
      });
    } else {
      content.appendChild(el('h2', null, 'מה עושים כאן'));
      content.appendChild(el('p', null, s.purpose));
    }

    var fb = el('div', 'feedback');
    fb.setAttribute('role', 'status');
    fb.setAttribute('aria-live', 'polite');
    content.appendChild(fb);

    split.appendChild(stage);
    split.appendChild(content);
    root.appendChild(split);
    chapterEl.appendChild(root);

    var api = {
      screen: s,
      stage: stage,
      content: content,
      paras: paras,
      reduced: reduced,
      el: el,
      svg: svg,
      /* mechanisms call this when the spec's completion condition is met */
      complete: function () {
        if (state.done[s.id]) return;
        state.done[s.id] = true;
        save();
        syncRail();
        if (idx === state.screen) syncNav();
      },
      say: function (text, tone) {
        fb.textContent = text || '';
        if (text) fb.setAttribute('data-tone', tone || 'ok');
        else fb.removeAttribute('data-tone');
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
      done: function () { return !!state.done[s.id]; }
    };

    var m = MECH[s.id];
    if (m) {
      try { m(api); }
      catch (err) { console.error('mechanism ' + s.id + ' failed', err); api.complete(); }
    } else {
      /* screens with no bespoke mechanism are reading screens: complete on arrival */
      api.complete();
    }

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
    railCount.textContent = 'מסך ' + (state.screen + 1) + ' מתוך ' + screens.length;
  }

  function syncNav() {
    var s = screens[state.screen];
    btnPrev.disabled = state.screen === 0;
    var isDone = !!state.done[s.id];
    /* the last screen carries its own finish button; a dead "המשך" beside it would only mislead */
    var last = state.screen === screens.length - 1;
    btnNext.hidden = last;
    btnNext.disabled = !isDone;
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
