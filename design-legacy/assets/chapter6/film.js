/* Screen 00 — the approved film, plus the seamless handoff into screen 01.
   The five commandments are real elements here, so they can fly into the chapter
   instead of the screen cutting to a new page. */
(function () {
  'use strict';

  var film = document.getElementById('film');
  var cue = document.querySelector('#film-subs .cue');
  var bigSpan = document.querySelector('#film-big span');
  var scenes = [].slice.call(document.querySelectorAll('.fscene'));
  var reduced = window.CH6E.reduced;

  var PILLARS = [
    { k: 'shahada', img: 'icon-shahada.png', name: 'השהאדה' },
    { k: 'prayer', img: 'icon-prayer.png', name: 'התפילה' },
    { k: 'charity', img: 'icon-charity.png', name: 'הצדקה' },
    { k: 'fast', img: 'icon-ramadan.png', name: 'צום רמדאן' },
    { k: 'hajj', img: 'icon-hajj.png', name: "החג׳" }
  ];

  function fillPillars(box) {
    PILLARS.forEach(function (p) {
      var d = document.createElement('div');
      d.className = 'pill';
      d.setAttribute('data-k', p.k);
      var im = document.createElement('img');
      im.src = 'assets/anim-video/' + p.img;
      im.alt = '';
      var b = document.createElement('b');
      b.textContent = p.name;
      d.appendChild(im); d.appendChild(b);
      box.appendChild(d);
    });
  }
  fillPillars(document.getElementById('pillars-mid'));
  fillPillars(document.getElementById('pillars-out'));

  /* Subtitles are the narrator's words VERBATIM — this text is exactly what was sent
     to the voice, so nothing on screen can drift from what is heard.
     Every cue time is MEASURED from the mp3 itself (ffmpeg silencedetect: a cue starts
     where speech actually resumes after a pause), not estimated by ear. */
  var SCENES = [
    { dur: 8.16, subs: [
      [0, 'יש מסורת באסלאם בשם עבדאללה בן עֻמַר, הח׳ליף השני,'],
      [4.26, 'שלפיה מוחמד ישב עם חבריו, הצַחאבּה, בעיר מדינה.']] },

    { dur: 10.08, subs: [
      [0, 'לְפֶתַע ניגש אליהם אדם עם בגדים מבהיקים מלובן ושיער שחור.'],
      [5.48, 'למרות שנראה שהגיע ממרחק, סימני המסע לא ניכרו עליו.']] },

    /* the question is carried by the big overlay, so the caption stops just before it
       rather than printing the same words twice */
    { dur: 4.72, subs: [
      [0, 'האדם ניגש למוחמד ושאל:'],
      [2.63, 'יא מוחמד,']],
      big: [3.81, 4.72, 'מהו האסלאם?'] },

    /* each pillar pops on the words that name it, not on an even rhythm */
    { dur: 17.36, light: true, pillars: 'pillars-mid', pops: [4.10, 8.85, 11.35, 12.49, 14.16],
      subs: [
      [0, 'מוחמד ענה: האסלאם הוא שעליך להאמין שאין אל מבלעדי אַללָּה, ושמוחמד הוא שליחו.'],
      [8.85, 'עליך להתפלל חמש תפילות ביום, לתת צדקה,'],
      [12.49, 'לצום את צום הרמדאן, ולעלות לרגל פעם בחיים, אם ביכולתך.']] },

    { dur: 8.0, subs: [
      [0, 'לאחר מספר שאלות נוספות, אמר האדם למוחמד: יפֶה אמרת.'],
      [6.85, 'ולאחר מכן נעלם.']] },

    { dur: 9.92, subs: [
      [0, 'מוחמד שאל את חבריו אם הם יודעים מי היה האיש.'],
      [5.85, 'הם השיבו בשלילה.'],
      [6.54, 'ואז אמר להם:']],
      big: [7.73, 9.92, 'זהו המלאך גַבּרִיאֵל'] },

    { dur: 13.36, light: true, pillars: 'pillars-out', pops: [1.6, 2.2, 2.8, 3.4, 4.0],
      subs: [
      [0, 'דרך השיחה הזו מוצגות חמש מצוות היסוד, הנחשבות לעמודי האסלאם.'],
      [5.96, 'בפרק זה נכיר כל אחת מהן, נבין את משמעותה,'],
      [9.84, 'ונלמד כיצד היא באה לידי ביטוי בחיי המוסלמי.']] }
  ];
  var TOTAL = SCENES.reduce(function (a, s) { return a + s.dur; }, 0);
  var ELAPSED_BEFORE = [];
  SCENES.reduce(function (a, s, i) { ELAPSED_BEFORE[i] = a; return a + s.dur; }, 0);

  var i = -1, guard = null, tick = null;
  var t0 = 0, pausedAt = 0, paused = false, muted = false, finished = false;

  var fcPlay = document.getElementById('fc-play');
  var fcMute = document.getElementById('fc-mute');
  var fcSeek = document.getElementById('fc-seek');
  var fcTime = document.getElementById('fc-time');
  var fcSkip = document.getElementById('fc-skip');

  var ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>';
  var ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_SOUND = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>';
  var ICON_MUTE = '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zm15.5-1.5l-1.4-1.4L15.7 8.5 13.3 6.1l-1.4 1.4L14.3 10l-2.4 2.4 1.4 1.4 2.4-2.4 2.4 2.4 1.4-1.4L17.1 10l2.4-2.5z"/></svg>';
  var ICON_PLAY_BIG = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  var ICON_PAUSE_BIG = '<svg viewBox="0 0 24 24"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>';
  var started = false;
  fcPlay.innerHTML = ICON_PAUSE;
  fcMute.innerHTML = ICON_SOUND;

  function el(id) { return document.getElementById(id); }
  function now() { return performance.now(); }
  /* wall clock drives subtitles and pops; audio.currentTime stalls and freezes the timeline */
  function sceneTime() { return ((paused ? pausedAt : now()) - t0) / 1000; }

  /* Browsers refuse to autoplay sound, and the click on the chapters page cannot carry
     across a navigation — verified in a real Chrome window, not just headless. So the
     film waits on its own first frame and the picture itself is the play control: the
     click that starts it IS the permission, and the narration runs from the first second
     with nothing missed. `soundBlocked` stays only as a safety net — if a browser still
     refuses, the film plays on with its captions and the timer takes over the pacing. */
  var soundBlocked = false;

  function startAudio(a) {
    var p = a.play();
    if (!p || !p.catch) return;
    p.catch(function () {
      if (soundBlocked || muted) return;
      soundBlocked = true;
      armGuard(); // nothing will fire `ended` now, so the timer paces the film
    });
  }

  /* The caption swaps on the same frame its cue is due. An earlier version faded out,
     waited 160ms, then swapped — which put every line visibly behind the voice. */
  function setCue(txt) {
    if (cue.textContent === txt) { if (txt) cue.classList.add('is-on'); return; }
    cue.textContent = txt;
    if (txt) cue.classList.add('is-on'); else cue.classList.remove('is-on');
  }

  function audio(idx) { return el('a' + idx); }

  /* The narration is the clock. Cue times were measured against the mp3, so reading the
     audio's own position keeps captions locked to the voice no matter how long decoding,
     buffering or a paused tab delayed playback. The wall clock only stands in when the
     browser refused to play the sound at all. */
  function sceneClock(a) {
    if (a && !a.paused && !a.ended && a.currentTime > 0) return a.currentTime;
    return sceneTime();
  }

  /* Scene length is the narration's length. When the narration plays, its `ended`
     event moves the film on and the timer is only a safety net, so it can sit late.
     When there is no sound, the timer IS the pacing — a late one would leave each
     scene hanging past its captions, so it lands on the scene's own duration. */
  var curNext = null;
  function armGuard() {
    clearTimeout(guard);
    if (!curNext || i < 0) return;
    var silent = soundBlocked || muted;
    var pad = silent ? 0.15 : 1.2;
    var left = (SCENES[i].dur + pad) * 1000 - (now() - t0);
    guard = setTimeout(curNext, Math.max(50, left));
  }

  function play(idx, startAt) {
    if (idx >= SCENES.length) { finish(); return; }
    startAt = startAt || 0;
    i = idx;
    clearTimeout(guard); clearInterval(tick);
    var S = SCENES[idx], sc = scenes[idx];
    scenes.forEach(function (s) { s.classList.remove('is-on'); });
    sc.classList.add('is-on');
    film.setAttribute('data-light', S.light ? '1' : '0');

    bigSpan.classList.remove('is-on'); bigSpan.textContent = '';
    cue.textContent = ''; cue.classList.remove('is-on');

    var v = sc.querySelector('video');
    if (v) {
      try {
        var fit = function () {
          if (v.duration > 0.2) {
            v.playbackRate = Math.max(0.4, Math.min(1.2, v.duration / S.dur));
            /* the clip is stretched to the scene's length, so a seek must scale too */
            v.currentTime = Math.min(v.duration, startAt * (v.duration / S.dur));
          }
        };
        v.currentTime = 0;
        v.onloadedmetadata = fit;
        if (v.readyState >= 1) fit();
        v.play().catch(function () {});
      } catch (e) {}
    }
    if (S.pillars) {
      el(S.pillars).querySelectorAll('.pill').forEach(function (p) { p.classList.remove('is-in'); });
    }

    var a = audio(idx);
    /* wind the clock back by the offset, so sceneTime() reads startAt immediately */
    t0 = now() - startAt * 1000;
    paused = false;
    film.classList.remove('is-paused');
    var advanced = false;
    curNext = function () { if (advanced) return; advanced = true; play(idx + 1); };
    if (a) {
      a.currentTime = startAt;
      a.muted = muted;
      a.onended = curNext;
      startAudio(a);
    }
    armGuard();

    tick = setInterval(function () {
      if (paused) return;
      var t = sceneClock(a);
      var s = '';
      for (var k = 0; k < S.subs.length; k++) if (t >= S.subs[k][0]) s = S.subs[k][1];
      setCue(s);
      if (S.big) {
        if (t >= S.big[0] && t <= S.big[1]) { bigSpan.textContent = S.big[2]; bigSpan.classList.add('is-on'); }
        else if (t > S.big[1]) bigSpan.classList.remove('is-on');
      }
      if (S.pillars) {
        /* toggle, not just add — scrubbing backwards has to take the pillars away again */
        var pills = el(S.pillars).querySelectorAll('.pill');
        for (var p = 0; p < S.pops.length; p++) pills[p].classList.toggle('is-in', t >= S.pops[p]);
      }
      if (!scrubbing) paintSeek(ELAPSED_BEFORE[idx] + t);
    }, 50); // tight enough that a cue is never a perceptible beat late
  }

  /* ---- controls ---- */
  function setPaused(p) {
    if (finished) return;
    paused = p;
    film.classList.toggle('is-paused', p);
    flashTap(p);
    if (!p) wake();
    var a = audio(i), v = scenes[i] && scenes[i].querySelector('video');
    if (p) {
      pausedAt = now();
      clearTimeout(guard);
      if (a) a.pause();
      if (v) v.pause();
      fcPlay.innerHTML = ICON_PLAY;
      fcPlay.setAttribute('aria-label', 'המשך ניגון');
    } else {
      t0 += now() - pausedAt; // keep the timeline honest across a pause
      if (a) a.play().catch(function () {});
      if (v) v.play().catch(function () {});
      armGuard();
      fcPlay.innerHTML = ICON_PAUSE;
      fcPlay.setAttribute('aria-label', 'השהיה');
    }
  }
  fcPlay.addEventListener('click', function () { setPaused(!paused); });

  /* ---------------- scrubbing the whole film ----------------
     The bar spans all seven scenes, not the current one, so dragging it behaves like
     any video player: one continuous timeline from the first word to the last. */
  var scrubbing = false;

  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
  }
  function paintSeek(globalT) {
    var pct = Math.min(100, Math.max(0, globalT / TOTAL * 100));
    fcSeek.value = String(pct);
    fcSeek.style.setProperty('--p', pct + '%');
    fcSeek.setAttribute('aria-valuetext', fmt(globalT) + ' מתוך ' + fmt(TOTAL));
    fcTime.textContent = fmt(globalT) + ' / ' + fmt(TOTAL);
  }
  /* map a point on the whole-film timeline back to a scene and an offset inside it */
  function locate(globalT) {
    for (var k = SCENES.length - 1; k >= 0; k--) {
      if (globalT >= ELAPSED_BEFORE[k]) return { idx: k, at: Math.min(globalT - ELAPSED_BEFORE[k], SCENES[k].dur) };
    }
    return { idx: 0, at: 0 };
  }
  function seekTo(globalT) {
    var L = locate(Math.min(Math.max(0, globalT), TOTAL - 0.05));
    play(L.idx, L.at);
    paintSeek(globalT);
  }

  fcSeek.addEventListener('pointerdown', function () { scrubbing = true; });
  fcSeek.addEventListener('input', function () {
    scrubbing = true;
    var t = +fcSeek.value / 100 * TOTAL;
    fcSeek.style.setProperty('--p', fcSeek.value + '%');
    fcTime.textContent = fmt(t) + ' / ' + fmt(TOTAL);
  });
  /* commit on release / on keyboard change, so dragging does not restart a scene per pixel */
  function commitSeek() {
    if (!scrubbing) return;
    scrubbing = false;
    seekTo(+fcSeek.value / 100 * TOTAL);
  }
  fcSeek.addEventListener('change', commitSeek);
  fcSeek.addEventListener('pointerup', commitSeek);
  fcSeek.addEventListener('pointercancel', commitSeek);

  /* ---------------- the picture is the play/pause target ---------------- */
  var tapWrap = document.createElement('div');
  tapWrap.id = 'film-tap';
  var tapGlyph = document.createElement('span');
  tapWrap.appendChild(tapGlyph);
  film.appendChild(tapWrap);

  function flashTap(playing) {
    tapGlyph.innerHTML = playing ? ICON_PLAY_BIG : ICON_PAUSE_BIG;
    tapGlyph.classList.remove('is-flash', 'is-held');
    void tapGlyph.offsetWidth;
    if (playing) tapGlyph.classList.add('is-held'); else tapGlyph.classList.add('is-flash');
  }

  function inControls(e) {
    return !!(e.target.closest && (e.target.closest('#film-controls') ||
      e.target.closest('#skip-confirm') || e.target.closest('#sound-cta')));
  }
  film.addEventListener('click', function (e) {
    if (finished || inControls(e)) return;
    if (!started) { startFilm(); return; }
    setPaused(!paused);
  });

  /* ---------------- controls step aside while it plays ---------------- */
  var idleTimer = null;
  function wake() {
    film.classList.remove('is-idle');
    clearTimeout(idleTimer);
    if (paused || finished) return;
    idleTimer = setTimeout(function () { film.classList.add('is-idle'); }, 2600);
  }
  film.addEventListener('pointermove', wake);
  film.addEventListener('pointerleave', function () { clearTimeout(idleTimer); });
  wake();

  fcMute.addEventListener('click', function () {
    muted = !muted;
    for (var k = 0; k < SCENES.length; k++) { var a = audio(k); if (a) a.muted = muted; }
    fcMute.innerHTML = muted ? ICON_MUTE : ICON_SOUND;
    fcMute.setAttribute('aria-label', muted ? 'ביטול השתקה' : 'השתקה');
    /* muting keeps the audio element running, so `ended` still leads; unmuting after a
       block would not, hence the explicit re-arm rather than assuming either way */
    armGuard();
  });

  /* ---- skip, behind the short warning the spec asks for ---- */
  var scBox = el('skip-confirm');
  var wasPaused = false;
  function askSkip() {
    wasPaused = paused;
    if (!paused) setPaused(true);
    scBox.hidden = false;
    el('sc-ok').focus();
  }
  fcSkip.addEventListener('click', askSkip);
  el('sc-cancel').addEventListener('click', function () {
    scBox.hidden = true;
    if (!wasPaused) setPaused(false);
    fcSkip.focus();
  });
  el('sc-ok').addEventListener('click', function () { scBox.hidden = true; finish(true); });

  document.addEventListener('keydown', function (e) {
    if (film.classList.contains('is-gone')) return;
    if (!scBox.hidden && e.key === 'Escape') { el('sc-cancel').click(); return; }
    if (film.classList.contains('is-handing')) return;
    var onFilm = e.target === document.body || e.target === film;
    if ((e.key === ' ' || e.key === 'Enter') && onFilm) {
      e.preventDefault();
      /* same rule as the picture: first press starts it, later presses pause/resume */
      if (!started) startFilm(); else setPaused(!paused);
    }
    if (e.key === 'Escape' && started) askSkip();
  });

  /* ---- finish + handoff into screen 01 ---- */
  function stopAll() {
    clearTimeout(guard); clearInterval(tick);
    for (var k = 0; k < SCENES.length; k++) { var a = audio(k); if (a) { a.pause(); a.onended = null; } }
    scenes.forEach(function (s) { var v = s.querySelector('video'); if (v) v.pause(); });
  }

  function finish(skipped) {
    if (finished) return;
    finished = true;
    stopAll();
    paintSeek(TOTAL);
    /* progress is recorded even when the learner skipped */
    window.CH6E.state.done['00'] = true;
    window.CH6E.save();

    if (skipped) { hardCut(); return; }
    handoff();
  }

  function hardCut() {
    film.classList.add('is-gone');
    window.CH6_START(1);
  }

  /* the five pillars fly from the last frame to their places in screen 01 */
  function handoff() {
    var out = el('pillars-out');
    var sources = [].slice.call(out.querySelectorAll('.pill'));
    var fromRects = sources.map(function (p) { return p.querySelector('img').getBoundingClientRect(); });

    film.classList.add('is-handing');
    document.getElementById('lesson').hidden = false;
    window.CH6_START(1);

    requestAnimationFrame(function () {
      var targets = {};
      document.querySelectorAll('#screen-01 [data-pillar]').forEach(function (t) {
        targets[t.getAttribute('data-pillar')] = t;
      });

      if (reduced || !Object.keys(targets).length) { film.classList.add('is-gone'); return; }

      var lesson = document.getElementById('lesson');
      lesson.style.opacity = '0';
      lesson.style.transition = 'opacity .5s ease';

      var flyers = sources.map(function (p, idx) {
        var k = p.getAttribute('data-k');
        var t = targets[k];
        var r = fromRects[idx];
        var f = document.createElement('div');
        f.className = 'flyer';
        f.style.cssText = 'left:0;top:0;width:' + r.width + 'px;transform:translate(' + r.left + 'px,' + r.top + 'px)';
        var im = document.createElement('img');
        im.src = p.querySelector('img').src;
        im.alt = '';
        f.appendChild(im);
        document.body.appendChild(f);
        /* the real target stays invisible until its stand-in arrives */
        if (t) t.style.opacity = '0';
        return { f: f, t: t, r: r };
      });

      /* hide the originals now that stand-ins are in flight */
      out.style.visibility = 'hidden';
      film.style.transition = 'opacity .5s ease';
      film.style.opacity = '0';

      requestAnimationFrame(function () {
        lesson.style.opacity = '1';
        flyers.forEach(function (o) {
          if (!o.t) { o.f.style.opacity = '0'; return; }
          var tr = o.t.getBoundingClientRect();
          var scale = tr.width / o.r.width;
          o.f.style.transform = 'translate(' + tr.left + 'px,' + tr.top + 'px) scale(' + scale + ')';
          o.f.style.transformOrigin = 'top left';
        });
      });

      setTimeout(function () {
        flyers.forEach(function (o) {
          if (o.t) { o.t.style.transition = 'opacity .25s ease'; o.t.style.opacity = '1'; }
          o.f.remove();
        });
        film.classList.add('is-gone');
        film.style.opacity = '';
        lesson.style.transition = '';
      }, reduced ? 30 : 900);
    });
  }

  /* ---- boot ---- */
  function skipFilmTo(idx) {
    stopAll();
    finished = true;
    started = true;
    film.classList.add('is-gone');
    window.CH6_START(idx);
  }

  /* the film waits on its own first frame, with one play glyph over the picture */
  function holdFirstFrame() {
    scenes[0].classList.add('is-on');
    film.setAttribute('data-light', '0');
    var v = scenes[0].querySelector('video');
    if (v) { try { v.pause(); v.currentTime = 0; } catch (e) {} }
    tapGlyph.innerHTML = ICON_PLAY_BIG;
    tapGlyph.classList.add('is-held', 'is-invite');
    paintSeek(0);
  }

  function startFilm() {
    if (started || finished) return;
    started = true;
    film.classList.add('is-playing');
    film.removeAttribute('role');
    film.setAttribute('aria-label', 'סרטון הפתיחה — לחיצה משהה או ממשיכה');
    tapGlyph.classList.remove('is-held', 'is-invite');
    play(0);
  }

  /* deep link for review: chapter6.html#s07 opens a screen without the film */
  if (/^#s\d/.test(location.hash)) {
    var want = location.hash.slice(2);
    var deep = window.CH6.screens.findIndex(function (s) { return s.id === want; });
    if (deep > 0) { skipFilmTo(deep); return; }
  }

  if (window.CH6E.state.done['00']) {
    /* they have already seen the film — resume the chapter instead of replaying it */
    skipFilmTo(Math.max(1, window.CH6_RESUME_SCREEN));
  } else {
    holdFirstFrame();
  }
})();
