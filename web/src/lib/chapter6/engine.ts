/* Chapter 6 engine — screen orchestration, progress, persistence, drawer.
   Mechanisms register themselves into the registry; this file knows nothing about them.

   Ported from assets/chapter6/engine.js. The logic is the original's, line for line; what
   changed is the wrapper: the IIFE became a factory, the three window globals became a
   typed module boundary, and the factory now hands back a destroy() — React mounts and
   unmounts this widget, which a plain <script> never had to survive. */

import { CH6 } from './data'
import { MECH } from './mechanisms'
import { setEngine } from './runtime'
import type { EngineApi, EngineState, MechApi, Screen, Tone, VerbDef } from './types'

const STORE = 'ch6:v1'

/* ---------------------------------------------------------------------------
   PROGRESS SAVING — TEMPORARILY OFF (at the user's request, while reviewing).
   Off: every entry replays the film and starts the chapter clean, so the flow
   can be judged as a first-time learner sees it. Progress still tracks in
   memory during a session, so "המשך" and the rail behave normally.
   To switch it back on later, set this to true. The restore blocks were
   audited in round 3 — every live mechanism AND all six checks now rebuild
   their solved state — so the flag flip is safe, but re-run the chapter walk
   after flipping it: restored state is a code path a fresh session never runs.
--------------------------------------------------------------------------- */
const PERSIST = false

/* The rail carries the five commandments by name — that is what the learner is looking
   for when they ask "where am I". The verb stays on the record because screen 01 and the
   closing summary are built around the commandment→action move. */
const VERBS: VerbDef[] = [
  { key: 'shahada', verb: 'להעיד', name: 'השהאדה', section: 'השהאדה' },
  { key: 'prayer', verb: 'להתפלל', name: 'התפילה', section: 'התפילה' },
  { key: 'charity', verb: 'לתת', name: 'הצדקה', section: 'הצדקה' },
  { key: 'fast', verb: 'לצום', name: 'רמדאן', section: 'צום רמדאן' },
  { key: 'hajj', verb: 'לעלות לרגל', name: "החג'", section: "החג'" },
]

const CHECK_MARK =
  '<path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>'
/* the navbar's own "next" chevron, reused by the transition seal */
const NEXT_ARROW =
  '<path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'

const VERB_ICON: Record<string, string> = {
  shahada: 'icon-shahada.png',
  prayer: 'icon-prayer.png',
  charity: 'icon-charity.png',
  fast: 'icon-ramadan.png',
  hajj: 'icon-hajj.png',
}

/* the chapter's chrome is rendered by React, so a missing node is a wiring bug, not a
   runtime condition to branch on — say so loudly rather than fail three calls later */
function must<T extends HTMLElement>(id: string): T {
  const n = document.getElementById(id)
  if (!n) throw new Error('CH6: missing #' + id)
  return n as T
}

/* narrowing a `const` does not survive into the closures below, so the throw has to happen
   where the binding is made rather than as a separate guard after it */
function mustIn<T extends Element>(root: Element, sel: string): T {
  const n = root.querySelector<T>(sel)
  if (!n) throw new Error('CH6: missing ' + sel)
  return n
}

export interface Engine extends EngineApi {
  destroy: () => void
}

export function createEngine(): Engine {
  const reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches

  const screens: Screen[] = CH6.screens
  const byId: Record<string, Screen> = {}
  screens.forEach((s, i) => {
    s._i = i
    byId[s.id] = s
  })

  /* ---------------- state ----------------
     `done` = the learner may move on (every screen earns this on arrival except a check).
     `mech` = the screen's own interaction was actually finished. Keeping them apart is what
     lets an illustration be non-blocking without rendering itself pre-solved on arrival. */
  const state: EngineState = { screen: 0, done: {}, mech: {}, completed: false }
  try {
    if (PERSIST) {
      const raw = localStorage.getItem(STORE)
      if (raw) {
        const p = JSON.parse(raw) as Partial<EngineState> | null
        if (p && typeof p === 'object') {
          state.done = p.done || {}
          state.mech = p.mech || {}
          state.completed = !!p.completed
          if (typeof p.screen === 'number' && p.screen >= 0 && p.screen < screens.length) {
            state.screen = p.screen
          }
        }
      }
    } else {
      /* clear anything an earlier visit left behind, so a stale key can't
         silently skip the film or pre-tick screens while reviewing */
      localStorage.removeItem(STORE)
      localStorage.removeItem('islam:chapter:6')
    }
  } catch {
    /* corrupt or blocked storage must never break the lesson */
  }

  function save(): void {
    if (!PERSIST) return
    try {
      localStorage.setItem(STORE, JSON.stringify(state))
    } catch {
      /* blocked storage must never break the lesson */
    }
  }

  /* one place records a screen as passed, so the rail and the nav can never disagree */
  function markDone(id: string, idx: number): void {
    if (state.done[id]) return
    state.done[id] = true
    save()
    syncRail()
    if (idx === state.screen) syncNav()
  }

  /* ---------------- dom helpers ---------------- */
  function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    cls?: string | null,
    text?: string | null
  ): HTMLElementTagNameMap[K] {
    const n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }
  function svg(paths: string, vb?: string): SVGSVGElement {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    s.setAttribute('viewBox', vb || '0 0 24 24')
    s.setAttribute('aria-hidden', 'true')
    s.innerHTML = paths
    return s
  }

  /* ---------------- chrome ---------------- */
  const lessonEl = must('lesson')
  const chapterEl = must('chapter')
  const railList = must<HTMLOListElement>('rail-list')
  const railCount = must('rail-count')
  const btnPrev = must<HTMLButtonElement>('btn-prev')
  const btnNext = must<HTMLButtonElement>('btn-next')
  const btnNextLabel = mustIn<HTMLSpanElement>(btnNext, '.label')
  const navHint = must('nav-hint')

  const verbBtns: Record<string, HTMLButtonElement> = {}
  VERBS.forEach((v, i) => {
    const li = el('li')
    const b = el('button', 'verb')
    b.type = 'button'
    /* the dot carries a tick once the commandment is finished — state is never colour alone */
    const dot = el('span', 'dot')
    dot.appendChild(svg(CHECK_MARK))
    b.appendChild(dot)
    b.appendChild(el('span', null, v.name))
    b.addEventListener('click', () => {
      const target = firstScreenOfSection(v.section)
      if (target != null && reachable(target)) go(target)
    })
    li.appendChild(b)
    railList.appendChild(li)
    verbBtns[v.key] = b
    if (i < VERBS.length - 1) {
      const sep = el('li')
      sep.appendChild(el('span', 'sep'))
      sep.setAttribute('aria-hidden', 'true')
      railList.appendChild(sep)
    }
  })

  function firstScreenOfSection(section: string): number | null {
    for (let i = 0; i < screens.length; i++) if (screens[i].section === section) return i
    return null
  }
  /* a section is reachable once its first screen has been seen, or the one before it is done */
  function reachable(i: number): boolean {
    if (i <= state.screen) return true
    for (let k = 0; k < i; k++) if (!state.done[screens[k].id]) return false
    return true
  }
  function sectionDone(section: string): boolean {
    return screens.every((s) => s.section !== section || state.done[s.id])
  }

  /* ---------------- screen construction ---------------- */
  const built: Record<number, { root: HTMLElement; api: MechApi }> = {}

  /* Four shapes, one per job. The rule behind them: a reading screen is a reading screen —
     the source text gets the whole column, at full size, with the page's own scroll. It is
     never squeezed into a card beside an interaction, and never hidden behind one. */
  function buildScreen(idx: number): { root: HTMLElement; api: MechApi } {
    const s = screens[idx]
    const kind = s.kind || 'content'
    const root = el('section', 'screen kind-' + kind)
    root.id = 'screen-' + s.id
    root.setAttribute('role', 'group')
    root.setAttribute('aria-label', s.section + ' — ' + s.title)

    const head = el('div', 'screen-head')
    head.appendChild(el('div', 'eyebrow', s.section))
    const h1 = el('h1', null, s.title)
    h1.id = 'title-' + s.id
    head.appendChild(h1)
    root.appendChild(head)

    const stage = el('div', 'stage-pane')
    stage.setAttribute('role', 'group')
    stage.setAttribute('aria-labelledby', 'title-' + s.id)

    const fb = el('div', 'feedback')
    fb.setAttribute('role', 'status')
    fb.setAttribute('aria-live', 'polite')

    const paras: HTMLParagraphElement[] = []
    function readingColumn(host: HTMLElement): void {
      ;(s.content || []).forEach((t) => {
        const n = el('p', null, t)
        host.appendChild(n)
        paras.push(n)
      })
    }

    /* only the bespoke screens (opening, finish) are given a side pane */
    let content: HTMLElement | undefined

    if (kind === 'content') {
      /* the whole screen IS the text: one column, page scroll, nothing beside it */
      const read = el('article', 'read')
      readingColumn(read)
      root.appendChild(read)
    } else if (kind === 'transition') {
      /* A short summary and one clear button — the button lives in the navbar.
         The ✓ lands on this screen (the rail ticks the commandment the moment it is
         entered), so it is the announcement and the reward at once: the finished
         commandment's icon carries the tick, the next one waits. Both icons already
         exist — reuse, not production. */
      const t = el('div', 'transition')
      t.appendChild(el('p', 'transition-text', s.text || ''))
      const seal = el('div', 'transition-seal')
      seal.setAttribute('aria-hidden', 'true')
      const doneVerb = VERBS.find((v) => v.section === s.section)
      if (doneVerb) {
        const d = el('span', 'tseal-done')
        const im = el('img')
        im.src = '/assets/anim-video/' + VERB_ICON[doneVerb.key]
        im.alt = ''
        d.appendChild(im)
        d.appendChild(svg(CHECK_MARK))
        seal.appendChild(d)
      }
      const nextVerb = screens[idx + 1]
        ? VERBS.find((v) => v.section === screens[idx + 1].section)
        : undefined
      if (nextVerb && nextVerb !== doneVerb) {
        seal.appendChild(svg(NEXT_ARROW))
        const n = el('span', 'tseal-next')
        const im = el('img')
        im.src = '/assets/anim-video/' + VERB_ICON[nextVerb.key]
        im.alt = ''
        n.appendChild(im)
        seal.appendChild(n)
      }
      if (seal.childNodes.length) t.appendChild(seal)
      root.appendChild(t)
    } else if (kind === 'visual' || kind === 'check') {
      /* the text was already read; this screen shows or asks, and says so in one line */
      if (s.lead) root.appendChild(el('p', 'lead', s.lead))
      if (s.check && s.check.instruction) {
        const lead = el('p', 'lead lead-do', s.check.instruction)
        root.appendChild(lead)
      }
      root.appendChild(stage)
      root.appendChild(fb)
    } else {
      /* opening (01) and finish: bespoke screens that own their own layout */
      const split = el('div', 'split')
      split.appendChild(stage)
      if (s.content && s.content.length) {
        content = el('aside', 'content-pane')
        content.setAttribute('aria-label', 'תוכן הפרק — ' + s.title)
        readingColumn(content)
        content.appendChild(fb)
        split.appendChild(content)
      } else {
        /* sum-end carries no source text. Building the pane anyway left a fully-styled
           empty box holding 29% of the last screen while the five cards beside it were
           crushed to 10.7px type — five reviewers landed on it independently. No content,
           no pane: the stage owns the row and the live region sits under it. */
        split.classList.add('is-solo')
      }
      root.appendChild(split)
      if (!content) root.appendChild(fb)
    }
    chapterEl.appendChild(root)

    let misses = 0
    let hintBox: HTMLDivElement | null = null

    const api: MechApi = {
      screen: s,
      stage,
      content,
      paras,
      reduced,
      el,
      svg,
      /* mechanisms call this when their own completion condition is met */
      complete() {
        if (state.mech[s.id]) return
        state.mech[s.id] = true
        markDone(s.id, idx)
        save()
      },
      say(text: string, tone?: Tone | null) {
        fb.textContent = text || ''
        if (text) fb.setAttribute('data-tone', tone || 'ok')
        else fb.removeAttribute('data-tone')
      },
      /* A wrong answer never resets the exercise — it says what is off and lets the learner
         fix that one thing. The spec's rule: after the second miss, and only then, the hint
         appears and stays, so a learner cannot get stuck on a gated screen. */
      miss(text?: string) {
        misses++
        api.say(text || (s.check && s.check.try) || '', 'try')
        const h = s.check && s.check.hint
        if (misses >= 2 && h && !hintBox) {
          hintBox = el('div', 'hint-box')
          hintBox.setAttribute('role', 'note')
          hintBox.appendChild(svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/>'))
          hintBox.appendChild(el('span', null, h))
          /* Into the check card, above its own button — not below the stage. Appended
             after the feedback line it landed at the bottom of the page, exactly under
             the fixed navbar for anyone who had not scrolled; the learner who most
             needs the hint is the one who will not find it there. */
          const card = stage.querySelector('.mech.chk')
          if (card) card.insertBefore(hintBox, card.querySelector('.chk-go'))
          else fb.parentNode?.insertBefore(hintBox, fb.nextSibling)
        }
        return misses
      },
      /* emphasis follows the interaction; it never hides or gates the text */
      highlight(i: number) {
        paras.forEach((p, k) => {
          if (i === k) p.setAttribute('data-hl', '1')
          else p.removeAttribute('data-hl')
        })
      },
      /* The hint is the mechanism's own closing line, so it goes inside the mechanism's
         column — every mechanism calls this straight after appending its wrapper, so the
         hint lands last, under the control it describes. Floated off the stage's bottom
         edge instead, it was painted straight across the slider thumb and the buttons on
         nearly every screen once the viewport dropped below ~1170px: the controls sit on
         `.mech`'s bottom padding (2.4vw), which shrinks faster than the hint's own 12px. */
      hint(text: string) {
        const h = el('div', 'hint', text)
        ;(stage.querySelector('.mech') || stage).appendChild(h)
        return h
      },
      /* "did the mechanism finish", which is not the same question as "may the learner move
         on" — an illustration is free to be unfinished and the chapter still moves. */
      done() {
        return !!state.mech[s.id]
      },
    }

    const m = MECH[s.id]
    if (m) {
      try {
        m(api)
      } catch (err) {
        console.error('mechanism ' + s.id + ' failed', err)
      }
    }
    /* Only a check may hold the learner. Reading screens and illustrations are done the
       moment they are on screen, so no illustration can ever turn into a gate. */
    if (kind !== 'check') markDone(s.id, idx)

    built[idx] = { root, api }
    return built[idx]
  }

  /* ---------------- navigation ---------------- */
  function syncRail(): void {
    let activeBtn: HTMLButtonElement | null = null
    VERBS.forEach((v) => {
      const b = verbBtns[v.key]
      const cur = screens[state.screen].section === v.section
      if (cur) {
        b.setAttribute('aria-current', 'step')
        activeBtn = b
      } else b.removeAttribute('aria-current')
      b.setAttribute('data-done', sectionDone(v.section) ? '1' : '0')
      const t = firstScreenOfSection(v.section)
      const ok = t != null && reachable(t)
      if (ok) b.removeAttribute('disabled')
      else b.setAttribute('disabled', '')
    })
    /* on a narrow rail the row scrolls; the chapter must bring the current commandment
       into view itself, because nothing tells the learner the rail has more to give */
    const scroller = railList.parentElement
    if (activeBtn && scroller && scroller.scrollWidth > scroller.clientWidth + 1) {
      ;(activeBtn as HTMLButtonElement).scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
    /* Position inside the commandment, not inside the chapter: "12 מתוך 44" tells a learner
       nothing they can act on, while "השהאדה · 2 מתוך 6" answers the question they asked. */
    const cur = screens[state.screen]
    const fam = screens.filter((x) => x.section === cur.section)
    const at = fam.indexOf(cur) + 1
    railCount.textContent = cur.section + ' · ' + at + ' מתוך ' + fam.length
  }

  function syncNav(): void {
    const s = screens[state.screen]
    btnPrev.disabled = state.screen === 0
    const isDone = !!state.done[s.id]
    /* the last screen carries its own finish button; a dead "המשך" beside it would only mislead */
    const last = state.screen === screens.length - 1
    btnNext.hidden = last
    btnNext.disabled = !isDone
    /* a transition button names where it goes; inside a commandment "המשך" is the truth */
    btnNextLabel.textContent = s.nextLabel || 'המשך'
    navHint.textContent = isDone ? '' : s.completion || ''
  }

  function go(idx: number): void {
    if (idx < 0 || idx >= screens.length) return
    if (!built[idx]) buildScreen(idx)
    Object.keys(built).forEach((k) => {
      built[Number(k)].root.classList.remove('is-active')
    })
    built[idx].root.classList.add('is-active')
    state.screen = idx
    /* the address keeps up with the screen, so a refresh or a bookmark returns HERE
       rather than to the film. replaceState, not location.hash: forty-three history
       entries would bury the page the learner came from under the Back button. */
    try {
      history.replaceState(null, '', '#s/' + screens[idx].id)
    } catch {
      /* history can be unavailable (sandboxed iframe); navigation must not care */
    }
    save()
    syncRail()
    syncNav()
    if (built[idx].api.onEnter) built[idx].api.onEnter?.()
    const h = built[idx].root.querySelector('h1')
    if (h) {
      h.setAttribute('tabindex', '-1')
      h.focus({ preventScroll: true })
    }
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  function onPrev(): void {
    go(state.screen - 1)
  }
  function onNext(): void {
    if (state.screen === screens.length - 1) return // the finish screen owns its own button
    go(state.screen + 1)
  }
  btnPrev.addEventListener('click', onPrev)
  btnNext.addEventListener('click', onNext)

  /* ---------------- story drawer (screen 01) ---------------- */
  const scrim = must('drawer-scrim')
  const drawer = must('drawer')
  const drawerBody = must('drawer-body')
  const drawerTitle = must('drawer-title')
  const drawerClose = must<HTMLButtonElement>('drawer-close')
  let lastFocus: HTMLElement | null = null

  function openDrawer(title: string, paras: string[], opener?: HTMLElement | null): void {
    drawerTitle.textContent = title
    drawerBody.innerHTML = ''
    paras.forEach((p) => drawerBody.appendChild(el('p', null, p)))
    lastFocus = opener || (document.activeElement as HTMLElement | null)
    scrim.classList.add('is-open')
    drawer.classList.add('is-open')
    drawer.setAttribute('aria-hidden', 'false')
    /* The panel is `visibility:hidden` until `.is-open` is applied, and focus() on a hidden
       element is silently a no-op — measured: the dialog opened with focus still on the page
       behind it, so the trap never engaged and a keyboard user was never taken into it.
       requestAnimationFrame is NOT the fix: its callbacks run before the frame's style
       recalc, so the element is still hidden there. Reading a layout property forces the
       class change into computed style first, and then the same call lands. */
    void drawer.offsetHeight
    drawerClose.focus()
    document.addEventListener('keydown', drawerKeys)
  }
  function closeDrawer(): void {
    scrim.classList.remove('is-open')
    drawer.classList.remove('is-open')
    drawer.setAttribute('aria-hidden', 'true')
    document.removeEventListener('keydown', drawerKeys)
    if (lastFocus) lastFocus.focus()
  }
  function drawerKeys(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      closeDrawer()
      return
    }
    if (e.key !== 'Tab') return
    /* focus trap */
    const f = drawer.querySelectorAll<HTMLElement>('button,[href],[tabindex]:not([tabindex="-1"])')
    if (!f.length) return
    const first = f[0]
    const last = f[f.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
  drawerClose.addEventListener('click', closeDrawer)
  scrim.addEventListener('click', closeDrawer)

  /* ---------------- public surface for mechanisms ---------------- */
  const api: Engine = {
    go,
    goto(id: string) {
      const s = byId[id]
      if (s && typeof s._i === 'number') go(s._i)
    },
    openDrawer,
    closeDrawer,
    verbs: VERBS,
    state,
    save,
    sectionDone,
    firstScreenOfSection,
    reduced,
    markChapterComplete() {
      state.completed = true
      save()
      if (!PERSIST) return
      try {
        /* the site has no progress store yet; use a namespace the chapters page can read later */
        localStorage.setItem('islam:chapter:6', 'done')
      } catch {
        /* blocked storage must never break the lesson */
      }
    },
    start(startIdx?: number) {
      lessonEl.hidden = false
      go(typeof startIdx === 'number' ? startIdx : Math.max(1, state.screen))
    },
    resumeScreen: state.screen,
    hasProgress: Object.keys(state.done).length > 0,

    /* A <script> tag never had to clean up after itself; a React effect does — and in
       development it is mounted twice on purpose. Without this the rail would be built
       twice and every screen would be appended twice. */
    destroy() {
      setEngine(null)
      document.removeEventListener('keydown', drawerKeys)
      btnPrev.removeEventListener('click', onPrev)
      btnNext.removeEventListener('click', onNext)
      drawerClose.removeEventListener('click', closeDrawer)
      scrim.removeEventListener('click', closeDrawer)
      railList.innerHTML = ''
      chapterEl.innerHTML = ''
      drawerBody.innerHTML = ''
      scrim.classList.remove('is-open')
      drawer.classList.remove('is-open')
      Object.keys(built).forEach((k) => delete built[Number(k)])
      lessonEl.hidden = true
    },
  }

  setEngine(api)
  return api
}
