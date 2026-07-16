/* Screen 00 — the approved film, plus the seamless handoff into screen 01.
   The five commandments are real elements here, so they can fly into the chapter
   instead of the screen cutting to a new page.

   Ported from assets/chapter6/film.js. The film itself is untouched: the same seven scenes,
   the same measured cue times, the same handoff. What changed is the wrapper — the IIFE
   became initFilm(), the globals became a typed engine reference, and the timers and
   document-level listeners are now handed back in a destroy() so a React unmount can stop
   the narration instead of leaving it playing to an empty page. */

import { CH6 } from './data'
import { engine } from './runtime'

interface SceneDef {
  dur: number
  light?: boolean
  pillars?: string
  pops?: number[]
  subs: Array<[number, string]>
  big?: [number, number, string]
}

interface Pillar {
  k: string
  img: string
  name: string
}

function must<T extends HTMLElement>(id: string): T {
  const n = document.getElementById(id)
  if (!n) throw new Error('CH6 film: missing #' + id)
  return n as T
}

export interface Film {
  destroy: () => void
}

export function initFilm(): Film {
  const film = must('film')
  const cue = document.querySelector<HTMLParagraphElement>('#film-subs .cue')
  const bigSpan = document.querySelector<HTMLSpanElement>('#film-big span')
  if (!cue || !bigSpan) throw new Error('CH6 film: the caption layer is missing')
  const scenes = Array.from(document.querySelectorAll<HTMLElement>('.fscene'))
  const reduced = engine().reduced

  const PILLARS: Pillar[] = [
    { k: 'shahada', img: 'icon-shahada.png', name: 'השהאדה' },
    { k: 'prayer', img: 'icon-prayer.png', name: 'התפילה' },
    { k: 'charity', img: 'icon-charity.png', name: 'הצדקה' },
    { k: 'fast', img: 'icon-ramadan.png', name: 'צום רמדאן' },
    /* ASCII apostrophe, matching the rail and data.ts — one gersh for one word */
    { k: 'hajj', img: 'icon-hajj.png', name: "החג'" },
  ]

  function fillPillars(box: HTMLElement): void {
    PILLARS.forEach(function (p) {
      const d = document.createElement('div')
      d.className = 'pill'
      d.setAttribute('data-k', p.k)
      const im = document.createElement('img')
      im.src = '/assets/anim-video/' + p.img
      im.alt = ''
      const b = document.createElement('b')
      b.textContent = p.name
      d.appendChild(im)
      d.appendChild(b)
      box.appendChild(d)
    })
  }
  fillPillars(must('pillars-mid'))
  fillPillars(must('pillars-out'))

  /* Subtitles are the narrator's words VERBATIM — this text is exactly what was sent
     to the voice, so nothing on screen can drift from what is heard.
     Every cue time is MEASURED from the mp3 itself (ffmpeg silencedetect: a cue starts
     where speech actually resumes after a pause), not estimated by ear. */
  const SCENES: SceneDef[] = [
    {
      dur: 8.16,
      subs: [
        [0, 'יש מסורת באסלאם בשם עבדאללה בן עֻמַר, הח׳ליף השני,'],
        [4.26, 'שלפיה מוחמד ישב עם חבריו, הצַחאבּה, בעיר מדינה.'],
      ],
    },

    {
      dur: 10.08,
      subs: [
        [0, 'לְפֶתַע ניגש אליהם אדם עם בגדים מבהיקים מלובן ושיער שחור.'],
        [5.48, 'למרות שנראה שהגיע ממרחק, סימני המסע לא ניכרו עליו.'],
      ],
    },

    /* the question is carried by the big overlay, so the caption stops just before it
       rather than printing the same words twice */
    {
      dur: 4.72,
      subs: [
        [0, 'האדם ניגש למוחמד ושאל:'],
        [2.63, 'יא מוחמד,'],
      ],
      big: [3.81, 4.72, 'מהו האסלאם?'],
    },

    /* each pillar pops on the words that name it, not on an even rhythm */
    {
      dur: 17.36,
      light: true,
      pillars: 'pillars-mid',
      pops: [4.1, 8.85, 11.35, 12.49, 14.16],
      subs: [
        [0, 'מוחמד ענה: האסלאם הוא שעליך להאמין שאין אל מבלעדי אַללָּה, ושמוחמד הוא שליחו.'],
        [8.85, 'עליך להתפלל חמש תפילות ביום, לתת צדקה,'],
        [12.49, 'לצום את צום הרמדאן, ולעלות לרגל פעם בחיים, אם ביכולתך.'],
      ],
    },

    {
      dur: 8.0,
      subs: [
        [0, 'לאחר מספר שאלות נוספות, אמר האדם למוחמד: יפֶה אמרת.'],
        [6.85, 'ולאחר מכן נעלם.'],
      ],
    },

    {
      dur: 9.92,
      subs: [
        [0, 'מוחמד שאל את חבריו אם הם יודעים מי היה האיש.'],
        [5.85, 'הם השיבו בשלילה.'],
        [6.54, 'ואז אמר להם:'],
      ],
      big: [7.73, 9.92, 'זהו המלאך גַבּרִיאֵל'],
    },

    {
      dur: 13.36,
      light: true,
      pillars: 'pillars-out',
      pops: [1.6, 2.2, 2.8, 3.4, 4.0],
      subs: [
        [0, 'דרך השיחה הזו מוצגות חמש מצוות היסוד, הנחשבות לעמודי האסלאם.'],
        [5.96, 'בפרק זה נכיר כל אחת מהן, נבין את משמעותה,'],
        [9.84, 'ונלמד כיצד היא באה לידי ביטוי בחיי המוסלמי.'],
      ],
    },
  ]
  const TOTAL = SCENES.reduce(function (a, s) {
    return a + s.dur
  }, 0)
  const ELAPSED_BEFORE: number[] = []
  SCENES.reduce(function (a, s, i) {
    ELAPSED_BEFORE[i] = a
    return a + s.dur
  }, 0)

  let i = -1
  let guard: number | undefined
  let tick: number | undefined
  let t0 = 0
  let pausedAt = 0
  let paused = false
  let muted = false
  let finished = false

  const fcPlay = must<HTMLButtonElement>('fc-play')
  const fcMute = must<HTMLButtonElement>('fc-mute')
  const fcSeek = must<HTMLInputElement>('fc-seek')
  const fcTime = must('fc-time')
  const fcSkip = must<HTMLButtonElement>('fc-skip')

  const ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>'
  const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
  const ICON_SOUND =
    '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg>'
  const ICON_MUTE =
    '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4zm15.5-1.5l-1.4-1.4L15.7 8.5 13.3 6.1l-1.4 1.4L14.3 10l-2.4 2.4 1.4 1.4 2.4-2.4 2.4 2.4 1.4-1.4L17.1 10l2.4-2.5z"/></svg>'
  const ICON_PLAY_BIG = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
  const ICON_PAUSE_BIG = '<svg viewBox="0 0 24 24"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>'
  let started = false
  fcPlay.innerHTML = ICON_PAUSE
  fcMute.innerHTML = ICON_SOUND

  function now(): number {
    return performance.now()
  }
  /* wall clock drives subtitles and pops; audio.currentTime stalls and freezes the timeline */
  function sceneTime(): number {
    return ((paused ? pausedAt : now()) - t0) / 1000
  }

  /* Browsers refuse to autoplay sound, and the click on the chapters page cannot carry
     across a navigation — verified in a real Chrome window, not just headless. So the
     film waits on its own first frame and the picture itself is the play control: the
     click that starts it IS the permission, and the narration runs from the first second
     with nothing missed. `soundBlocked` stays only as a safety net — if a browser still
     refuses, the film plays on with its captions and the timer takes over the pacing. */
  let soundBlocked = false

  function startAudio(a: HTMLAudioElement): void {
    const p = a.play()
    if (!p || !p.catch) return
    p.catch(function () {
      if (soundBlocked || muted) return
      soundBlocked = true
      armGuard() // nothing will fire `ended` now, so the timer paces the film
    })
  }

  /* The caption swaps on the same frame its cue is due. An earlier version faded out,
     waited 160ms, then swapped — which put every line visibly behind the voice. */
  function setCue(txt: string): void {
    if (cue!.textContent === txt) {
      if (txt) cue!.classList.add('is-on')
      return
    }
    cue!.textContent = txt
    if (txt) cue!.classList.add('is-on')
    else cue!.classList.remove('is-on')
  }

  function audio(idx: number): HTMLAudioElement | null {
    return document.getElementById('a' + idx) as HTMLAudioElement | null
  }

  /* The narration is the clock. Cue times were measured against the mp3, so reading the
     audio's own position keeps captions locked to the voice no matter how long decoding,
     buffering or a paused tab delayed playback. The wall clock only stands in when the
     browser refused to play the sound at all. */
  function sceneClock(a: HTMLAudioElement | null): number {
    if (a && !a.paused && !a.ended && a.currentTime > 0) return a.currentTime
    return sceneTime()
  }

  /* Scene length is the narration's length. When the narration plays, its `ended`
     event moves the film on and the timer is only a safety net, so it can sit late.
     When there is no sound, the timer IS the pacing — a late one would leave each
     scene hanging past its captions, so it lands on the scene's own duration. */
  let curNext: (() => void) | null = null
  /* the current scene's frame painter — a paused seek calls it once, off the tick */
  let curRender: (() => void) | null = null
  function armGuard(): void {
    window.clearTimeout(guard)
    /* never arm against a paused film: t0 is frozen while paused, so `left` would count
       down anyway, go negative, clamp to 50ms and skip the scene — muting a paused film
       used to do exactly that. setPaused(false) re-arms when play resumes. */
    if (paused || !curNext || i < 0) return
    const silent = soundBlocked || muted
    const pad = silent ? 0.15 : 1.2
    const left = (SCENES[i].dur + pad) * 1000 - (now() - t0)
    guard = window.setTimeout(curNext, Math.max(50, left))
  }

  function play(idx: number, startAt?: number): void {
    if (idx >= SCENES.length) {
      finish()
      return
    }
    /* Silence whatever is still sounding before this scene takes over. On the normal
       scene→scene advance this is a no-op — the narration just ended — but a SEEK lands
       here mid-narration. Without this, the outgoing audio kept playing UNDER the new
       scene, and when it eventually ran out, its own `ended` handler dragged the film
       back to the scene after IT: two voices at once, then a spontaneous jump. */
    stopAll()
    startAt = startAt || 0
    i = idx
    window.clearTimeout(guard)
    window.clearInterval(tick)
    const S = SCENES[idx]
    const sc = scenes[idx]
    scenes.forEach(function (s) {
      s.classList.remove('is-on')
    })
    sc.classList.add('is-on')
    film.setAttribute('data-light', S.light ? '1' : '0')

    bigSpan!.classList.remove('is-on')
    bigSpan!.textContent = ''
    cue!.textContent = ''
    cue!.classList.remove('is-on')

    const v = sc.querySelector('video')
    if (v) {
      try {
        const fit = function () {
          if (v.duration > 0.2) {
            v.playbackRate = Math.max(0.4, Math.min(1.2, v.duration / S.dur))
            /* the clip is stretched to the scene's length, so a seek must scale too */
            v.currentTime = Math.min(v.duration, startAt! * (v.duration / S.dur))
          }
        }
        v.currentTime = 0
        v.onloadedmetadata = fit
        if (v.readyState >= 1) fit()
        v.play().catch(function () {})
      } catch {
        /* a video that refuses to seek must not take the scene down with it */
      }
    }
    if (S.pillars) {
      must(S.pillars)
        .querySelectorAll<HTMLElement>('.pill')
        .forEach(function (p) {
          p.classList.remove('is-in')
        })
    }

    const a = audio(idx)
    /* wind the clock back by the offset, so sceneTime() reads startAt immediately */
    t0 = now() - startAt * 1000
    paused = false
    film.classList.remove('is-paused')
    let advanced = false
    curNext = function () {
      if (advanced) return
      advanced = true
      play(idx + 1)
    }
    if (a) {
      a.currentTime = startAt
      a.muted = muted
      a.onended = curNext
      startAudio(a)
    }
    armGuard()

    /* one frame of the scene's timeline — the tick runs it while playing, and a paused
       seek runs it once so the new position shows its caption instead of a blank */
    const renderFrame = function () {
      const t = sceneClock(a)
      let s = ''
      for (let k = 0; k < S.subs.length; k++) if (t >= S.subs[k][0]) s = S.subs[k][1]
      setCue(s)
      if (S.big) {
        if (t >= S.big[0] && t <= S.big[1]) {
          bigSpan!.textContent = S.big[2]
          bigSpan!.classList.add('is-on')
        } else if (t > S.big[1]) bigSpan!.classList.remove('is-on')
      }
      if (S.pillars && S.pops) {
        /* toggle, not just add — scrubbing backwards has to take the pillars away again */
        const pills = must(S.pillars).querySelectorAll<HTMLElement>('.pill')
        for (let p = 0; p < S.pops.length; p++) pills[p].classList.toggle('is-in', t >= S.pops[p])
      }
      if (!scrubbing) paintSeek(ELAPSED_BEFORE[idx] + t)
    }
    curRender = renderFrame
    tick = window.setInterval(function () {
      if (paused) return
      renderFrame()
    }, 50) // tight enough that a cue is never a perceptible beat late
  }

  /* ---- controls ---- */
  function setPaused(p: boolean): void {
    if (finished) return
    paused = p
    film.classList.toggle('is-paused', p)
    flashTap(p)
    if (!p) wake()
    const a = audio(i)
    const v = scenes[i] && scenes[i].querySelector('video')
    if (p) {
      pausedAt = now()
      window.clearTimeout(guard)
      if (a) a.pause()
      if (v) v.pause()
      fcPlay.innerHTML = ICON_PLAY
      fcPlay.setAttribute('aria-label', 'המשך ניגון')
    } else {
      t0 += now() - pausedAt // keep the timeline honest across a pause
      if (a) a.play().catch(function () {})
      if (v) v.play().catch(function () {})
      armGuard()
      fcPlay.innerHTML = ICON_PAUSE
      fcPlay.setAttribute('aria-label', 'השהיה')
    }
  }
  function onPlayClick(): void {
    /* before the first start there is nothing to pause — the play button starts */
    if (!started) {
      startFilm()
      return
    }
    setPaused(!paused)
  }
  fcPlay.addEventListener('click', onPlayClick)

  /* ---------------- scrubbing the whole film ----------------
     The bar spans all seven scenes, not the current one, so dragging it behaves like
     any video player: one continuous timeline from the first word to the last. */
  let scrubbing = false

  function fmt(sec: number): string {
    sec = Math.max(0, Math.round(sec))
    return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2)
  }
  function paintSeek(globalT: number): void {
    const pct = Math.min(100, Math.max(0, (globalT / TOTAL) * 100))
    fcSeek.value = String(pct)
    fcSeek.style.setProperty('--p', pct + '%')
    fcSeek.setAttribute('aria-valuetext', fmt(globalT) + ' מתוך ' + fmt(TOTAL))
    fcTime.textContent = fmt(globalT) + ' / ' + fmt(TOTAL)
  }
  /* map a point on the whole-film timeline back to a scene and an offset inside it */
  function locate(globalT: number): { idx: number; at: number } {
    for (let k = SCENES.length - 1; k >= 0; k--) {
      if (globalT >= ELAPSED_BEFORE[k]) {
        return { idx: k, at: Math.min(globalT - ELAPSED_BEFORE[k], SCENES[k].dur) }
      }
    }
    return { idx: 0, at: 0 }
  }
  function seekTo(globalT: number): void {
    if (finished) return
    /* the controls are only opacity-hidden before the first click, so the keyboard can
       reach the bar early — a seek then is a deliberate start, from the sought moment */
    if (!started) {
      startFilm(globalT)
      return
    }
    /* Seeking must not change the play/pause state. play() starts the scene running, so
       a film that was paused is re-frozen on its new spot — with the frame rendered once,
       captions included, so the learner sees WHERE they landed. Before this, dragging a
       paused film silently resumed it while the play button still showed "play". */
    const wasPaused = paused
    const L = locate(Math.min(Math.max(0, globalT), TOTAL - 0.05))
    play(L.idx, L.at)
    if (wasPaused) {
      setPaused(true)
      if (curRender) curRender()
    }
    paintSeek(globalT)
  }

  function onSeekDown(): void {
    scrubbing = true
  }
  function onSeekInput(): void {
    scrubbing = true
    const t = (+fcSeek.value / 100) * TOTAL
    fcSeek.style.setProperty('--p', fcSeek.value + '%')
    fcTime.textContent = fmt(t) + ' / ' + fmt(TOTAL)
  }
  /* commit on release / on keyboard change, so dragging does not restart a scene per pixel */
  function commitSeek(): void {
    if (!scrubbing) return
    scrubbing = false
    seekTo((+fcSeek.value / 100) * TOTAL)
  }
  fcSeek.addEventListener('pointerdown', onSeekDown)
  fcSeek.addEventListener('input', onSeekInput)
  fcSeek.addEventListener('change', commitSeek)
  fcSeek.addEventListener('pointerup', commitSeek)
  fcSeek.addEventListener('pointercancel', commitSeek)

  /* ---------------- the picture is the play/pause target ---------------- */
  const tapWrap = document.createElement('div')
  tapWrap.id = 'film-tap'
  const tapGlyph = document.createElement('span')
  tapWrap.appendChild(tapGlyph)
  film.appendChild(tapWrap)

  function flashTap(playing: boolean): void {
    tapGlyph.innerHTML = playing ? ICON_PLAY_BIG : ICON_PAUSE_BIG
    tapGlyph.classList.remove('is-flash', 'is-held')
    void tapGlyph.offsetWidth
    if (playing) tapGlyph.classList.add('is-held')
    else tapGlyph.classList.add('is-flash')
  }

  /* composedPath, not closest: the play/mute handlers replace their button's innerHTML,
     so by the time the same click bubbles up to #film its target is an orphaned <path> —
     closest() on an orphan finds nothing, #film thought the picture was clicked, and it
     un-did the button's own action (play looked dead; mute also paused). The composed
     path is captured at dispatch, before the handler tore the target out of the tree. */
  function inControls(e: Event): boolean {
    return e.composedPath().some(function (n) {
      const id = (n as Element).id
      return id === 'film-controls' || id === 'skip-confirm' || id === 'sound-cta'
    })
  }
  function onFilmClick(e: MouseEvent): void {
    if (finished || inControls(e)) return
    if (!started) {
      startFilm()
      return
    }
    setPaused(!paused)
  }
  film.addEventListener('click', onFilmClick)

  /* ---------------- controls step aside while it plays ---------------- */
  let idleTimer: number | undefined
  function wake(): void {
    film.classList.remove('is-idle')
    window.clearTimeout(idleTimer)
    if (paused || finished) return
    idleTimer = window.setTimeout(function () {
      film.classList.add('is-idle')
    }, 2600)
  }
  function onPointerLeave(): void {
    window.clearTimeout(idleTimer)
  }
  film.addEventListener('pointermove', wake)
  film.addEventListener('pointerleave', onPointerLeave)
  wake()

  function onMuteClick(): void {
    muted = !muted
    for (let k = 0; k < SCENES.length; k++) {
      const a = audio(k)
      if (a) a.muted = muted
    }
    fcMute.innerHTML = muted ? ICON_MUTE : ICON_SOUND
    fcMute.setAttribute('aria-label', muted ? 'ביטול השתקה' : 'השתקה')
    /* muting keeps the audio element running, so `ended` still leads; unmuting after a
       block would not, hence the explicit re-arm rather than assuming either way */
    armGuard()
  }
  fcMute.addEventListener('click', onMuteClick)

  /* ---- skip, behind the short warning the spec asks for ---- */
  const scBox = must('skip-confirm')
  const scOk = must<HTMLButtonElement>('sc-ok')
  const scCancel = must<HTMLButtonElement>('sc-cancel')
  let wasPaused = false
  function askSkip(): void {
    wasPaused = paused
    if (!paused) setPaused(true)
    scBox.hidden = false
    scOk.focus()
  }
  function onCancel(): void {
    scBox.hidden = true
    if (!wasPaused) setPaused(false)
    fcSkip.focus()
  }
  function onOk(): void {
    scBox.hidden = true
    finish(true)
  }
  fcSkip.addEventListener('click', askSkip)
  scCancel.addEventListener('click', onCancel)
  scOk.addEventListener('click', onOk)

  function onKeyDown(e: KeyboardEvent): void {
    if (film.classList.contains('is-gone')) return
    if (!scBox.hidden) {
      /* the dialog is modal, so it traps: Tab cycles its two buttons instead of walking
         out to the controls behind the scrim, and Escape is the way back */
      if (e.key === 'Escape') {
        scCancel.click()
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        ;(document.activeElement === scOk ? scCancel : scOk).focus()
        return
      }
    }
    if (film.classList.contains('is-handing')) return
    const onFilm = e.target === document.body || e.target === film
    if ((e.key === ' ' || e.key === 'Enter') && onFilm) {
      e.preventDefault()
      /* same rule as the picture: first press starts it, later presses pause/resume */
      if (!started) startFilm()
      else setPaused(!paused)
    }
    if (e.key === 'Escape' && started) askSkip()
  }
  document.addEventListener('keydown', onKeyDown)

  /* ---- finish + handoff into screen 01 ---- */
  function stopAll(): void {
    window.clearTimeout(guard)
    window.clearInterval(tick)
    for (let k = 0; k < SCENES.length; k++) {
      const a = audio(k)
      if (a) {
        a.pause()
        a.onended = null
      }
    }
    scenes.forEach(function (s) {
      const v = s.querySelector('video')
      if (v) v.pause()
    })
  }

  function finish(skipped?: boolean): void {
    if (finished) return
    finished = true
    stopAll()
    paintSeek(TOTAL)
    /* progress is recorded even when the learner skipped */
    engine().state.done['00'] = true
    engine().save()

    if (skipped) {
      hardCut()
      return
    }
    handoff()
  }

  function hardCut(): void {
    film.classList.add('is-gone')
    engine().start(1)
  }

  /* the five pillars fly from the last frame to their places in screen 01 */
  function handoff(): void {
    const out = must('pillars-out')
    const sources = Array.from(out.querySelectorAll<HTMLElement>('.pill'))
    const fromRects = sources.map(function (p) {
      const im = p.querySelector('img')
      if (!im) throw new Error('CH6 film: a pillar lost its image')
      return im.getBoundingClientRect()
    })

    film.classList.add('is-handing')
    const lesson = must('lesson')
    lesson.hidden = false
    engine().start(1)

    requestAnimationFrame(function () {
      const targets: Record<string, HTMLElement> = {}
      document.querySelectorAll<HTMLElement>('#screen-01 [data-pillar]').forEach(function (t) {
        const k = t.getAttribute('data-pillar')
        if (k) targets[k] = t
      })

      if (reduced || !Object.keys(targets).length) {
        film.classList.add('is-gone')
        return
      }

      lesson.style.opacity = '0'
      lesson.style.transition = 'opacity .5s ease'

      const flyers = sources.map(function (p, idx) {
        const k = p.getAttribute('data-k')
        const t = k ? targets[k] : undefined
        const r = fromRects[idx]
        const f = document.createElement('div')
        f.className = 'flyer'
        f.style.cssText =
          'left:0;top:0;width:' +
          r.width +
          'px;transform:translate(' +
          r.left +
          'px,' +
          r.top +
          'px)'
        const im = document.createElement('img')
        const srcImg = p.querySelector('img')
        im.src = srcImg ? srcImg.src : ''
        im.alt = ''
        f.appendChild(im)
        document.body.appendChild(f)
        /* the real target stays invisible until its stand-in arrives */
        if (t) t.style.opacity = '0'
        return { f: f, t: t, r: r }
      })

      /* hide the originals now that stand-ins are in flight */
      out.style.visibility = 'hidden'
      film.style.transition = 'opacity .5s ease'
      film.style.opacity = '0'

      requestAnimationFrame(function () {
        lesson.style.opacity = '1'
        flyers.forEach(function (o) {
          if (!o.t) {
            o.f.style.opacity = '0'
            return
          }
          const tr = o.t.getBoundingClientRect()
          const scale = tr.width / o.r.width
          o.f.style.transform =
            'translate(' + tr.left + 'px,' + tr.top + 'px) scale(' + scale + ')'
          o.f.style.transformOrigin = 'top left'
        })
      })

      window.setTimeout(
        function () {
          flyers.forEach(function (o) {
            if (o.t) {
              o.t.style.transition = 'opacity .25s ease'
              o.t.style.opacity = '1'
            }
            o.f.remove()
          })
          film.classList.add('is-gone')
          film.style.opacity = ''
          lesson.style.transition = ''
        },
        reduced ? 30 : 900
      )
    })
  }

  /* ---- boot ---- */
  function skipFilmTo(idx: number): void {
    stopAll()
    finished = true
    started = true
    /* the rail gates every section on done['00'] — finish() records it, so a deep link
       must too, or all five rail buttons arrive disabled */
    engine().state.done['00'] = true
    engine().save()
    film.classList.add('is-gone')
    engine().start(idx)
  }

  /* the film waits on its own first frame, with one play glyph over the picture */
  function holdFirstFrame(): void {
    scenes[0].classList.add('is-on')
    film.setAttribute('data-light', '0')
    const v = scenes[0].querySelector('video')
    if (v) {
      try {
        v.pause()
        v.currentTime = 0
      } catch {
        /* a video that refuses to seek must not hold the first frame hostage */
      }
    }
    tapGlyph.innerHTML = ICON_PLAY_BIG
    tapGlyph.classList.add('is-held', 'is-invite')
    paintSeek(0)
  }

  function startFilm(at?: number): void {
    if (started || finished) return
    started = true
    film.classList.add('is-playing')
    film.removeAttribute('role')
    film.setAttribute('aria-label', 'סרטון הפתיחה — לחיצה משהה או ממשיכה')
    tapGlyph.classList.remove('is-held', 'is-invite')
    if (typeof at === 'number') seekTo(at)
    else play(0)
  }

  /* A <script> tag never had to clean up after itself; a React effect does — and in
     development it is mounted twice on purpose. Without this the narration would keep
     playing over an unmounted page and a second film would start on top of it. */
  const destroy = function (): void {
    stopAll()
    window.clearTimeout(idleTimer)
    document.removeEventListener('keydown', onKeyDown)
    film.removeEventListener('click', onFilmClick)
    film.removeEventListener('pointermove', wake)
    film.removeEventListener('pointerleave', onPointerLeave)
    fcPlay.removeEventListener('click', onPlayClick)
    fcMute.removeEventListener('click', onMuteClick)
    fcSkip.removeEventListener('click', askSkip)
    scCancel.removeEventListener('click', onCancel)
    scOk.removeEventListener('click', onOk)
    fcSeek.removeEventListener('pointerdown', onSeekDown)
    fcSeek.removeEventListener('input', onSeekInput)
    fcSeek.removeEventListener('change', commitSeek)
    fcSeek.removeEventListener('pointerup', commitSeek)
    fcSeek.removeEventListener('pointercancel', commitSeek)
    tapWrap.remove()
    document.querySelectorAll('.flyer').forEach(function (f) {
      f.remove()
    })
    must('pillars-mid').innerHTML = ''
    must('pillars-out').innerHTML = ''
  }

  /* Deep link for review: /chapter6#s/sh-v opens a screen without playing the film.

     This used to read /^#s\d/, which required a digit straight after the "s" — written when
     every screen was numbered (#s07). The screens were later renamed to sh-1, pr-v1, hj-c and
     so on, and the test was never revisited, so it silently stopped matching all but one of
     them: of the 44 ids only "00" and "01" still begin with a digit, and "00" is the film
     itself, which the `deep > 0` line correctly declines to skip to. The feature had been
     down to exactly one reachable screen.

     The id is now taken as-is, so every screen is addressable. The separator is optional:
     #s/sh-v reads properly for the current ids, and the old #s01 form still resolves. */
  const deepMatch = /^#s\/?(.+)$/.exec(location.hash)
  if (deepMatch) {
    const want = decodeURIComponent(deepMatch[1])
    const deep = CH6.screens.findIndex(function (s) {
      return s.id === want
    })
    /* an unknown id, or the film's own id, falls through to the normal boot below */
    if (deep > 0) {
      skipFilmTo(deep)
      return { destroy }
    }
  }

  if (engine().state.done['00']) {
    /* they have already seen the film — resume the chapter instead of replaying it */
    skipFilmTo(Math.max(1, engine().resumeScreen))
  } else {
    holdFirstFrame()
  }

  return { destroy }
}
