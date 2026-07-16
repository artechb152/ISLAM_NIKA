/* Screen 01 — the film's five commandments become the chapter's five actions.
   This screen owns the handoff targets (data-pillar) that film.ts flies into.

   It reads as one centred column rather than the chapter's usual split: the source
   text opens the screen, the detail panel sits in the middle, and the five stops
   close it along the bottom edge. The side pane goes away with the text it held. */

import { engine } from './runtime'
import type { ActionDetail, MechApi, MechRegistry } from './types'

export function registerOpening(M: MechRegistry): void {
  M['01'] = function (api: MechApi) {
    const s = api.screen
    const el = api.el

    const wrap = el('div', 's01')

    /* The full story stays one click away and never blocks progress. It rides in the
       normal flow above the path: as an absolutely-positioned corner pill it sat on top
       of the first stop (השהאדה) at every viewport width. */
    const story = el('button', 's01-story')
    story.type = 'button'
    story.appendChild(
      api.svg(
        '<path d="M4 5h10a3 3 0 0 1 3 3v11a2.5 2.5 0 0 0-2.5-2.5H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M20 5h-2a3 3 0 0 0-3 3v11a2.5 2.5 0 0 1 2.5-2.5H20z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'
      )
    )
    story.appendChild(el('span', null, 'לקריאת הסיפור המלא'))
    story.addEventListener('click', function () {
      engine().openDrawer(s.drawerTitle || '', s.drawerContent || [], story)
    })
    wrap.appendChild(story)

    /* The source text opens the screen, unlabelled: it is the first thing to read here,
       so it moves up out of the side pane and the now-empty pane goes with it. The
       paragraphs themselves are moved, not copied, so api.paras keeps working. */
    const lead = el('div', 's01-lead')
    if (api.paras.length) {
      api.paras.forEach(function (p) {
        lead.appendChild(p)
      })
    } else {
      ;(s.content || []).forEach(function (t) {
        lead.appendChild(el('p', null, t))
      })
    }
    wrap.appendChild(lead)

    const split = api.stage.parentElement
    if (split) split.classList.add('is-solo')
    if (api.content && api.content.parentNode) api.content.parentNode.removeChild(api.content)

    /* one path, five stops — the spec's "מסלול אחד" */
    const path = el('div', 's01-path')
    const line = el('div', 's01-line')
    line.setAttribute('aria-hidden', 'true')
    path.appendChild(line)

    const stops = el('div', 's01-stops')
    const opened: Record<string, boolean> = {}

    const IMG: Record<string, string> = {
      השהאדה: 'icon-shahada.png',
      התפילה: 'icon-prayer.png',
      הצדקה: 'icon-charity.png',
      'צום רמדאן': 'icon-ramadan.png',
      "החג'": 'icon-hajj.png',
    }
    const KEY: Record<string, string> = {
      השהאדה: 'shahada',
      התפילה: 'prayer',
      הצדקה: 'charity',
      'צום רמדאן': 'fast',
      "החג'": 'hajj',
    }

    const detail = el('div', 's01-detail')
    detail.setAttribute('role', 'status')
    detail.setAttribute('aria-live', 'polite')

    /* The move to השהאדה belongs to the navbar's own button, which now names its
       destination on every screen. A second copy of it here was only ever a duplicate. */

    /* the promise "בחרו כל אחת מחמש המצוות" now keeps score in the open: every explored
       stop is ticked, and the line that made the promise counts toward five */
    function paintCount(): void {
      const n = Object.keys(opened).length
      counter.textContent = n ? n + ' מתוך 5' : ''
    }

    function show(d: ActionDetail, btn: HTMLButtonElement): void {
      detail.innerHTML = ''
      const name = el('div', 's01-name', d.commandment)
      const act = el('div', 's01-act', d.action)
      const q = el('blockquote', 's01-quote', '„' + d.quote + '”')
      detail.appendChild(name)
      detail.appendChild(act)
      detail.appendChild(q)
      stops.querySelectorAll<HTMLButtonElement>('.s01-stop').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn))
      })

      if (!opened[d.commandment]) {
        opened[d.commandment] = true
        btn.setAttribute('data-open', '1')
        paintCount()
        if (Object.keys(opened).length === 5) {
          api.complete()
          hint.classList.add('is-gone')
        }
      }
    }

    ;(s.actionDetails || []).forEach(function (d, idx) {
      const b = el('button', 's01-stop')
      b.type = 'button'
      b.setAttribute('aria-pressed', 'false')
      b.setAttribute('aria-label', d.commandment + ' — ' + d.action)

      const im = el('img')
      im.src = '/assets/anim-video/' + (IMG[d.commandment] || 'icon-shahada.png')
      im.alt = ''
      im.setAttribute('data-pillar', KEY[d.commandment] || 'p' + idx)

      const nm = el('b', null, d.commandment)
      const vb = el('span', 's01-verb', d.action)

      b.appendChild(im)
      b.appendChild(nm)
      b.appendChild(vb)
      b.addEventListener('click', function () {
        show(d, b)
      })
      /* hover reveals too, per the spec, but click/keyboard is the source of truth */
      b.addEventListener('mouseenter', function () {
        if (!api.done()) show(d, b)
      })
      stops.appendChild(b)
    })

    path.appendChild(stops)

    /* the hint sits in flow directly above the stops it talks about — the stops now
       own the bottom edge that the floating version of it used to sit on */
    const hint = el(
      'div',
      'hint s01-hint',
      'בחרו כל אחת מחמש המצוות כדי לראות לאיזו פעולה היא הופכת'
    )
    const counter = el('b', 's01-count')
    hint.appendChild(counter)
    wrap.appendChild(hint)
    wrap.appendChild(path)
    /* the reveal lands UNDER the icons that trigger it — it used to appear 200px above
       the hand that clicked, where nothing tied the two together */
    wrap.appendChild(detail)
    api.stage.appendChild(wrap)

    /* the story text must exist in the DOM even while the drawer is closed */
    const shadow = el('div', 's01-shadow')
    shadow.hidden = true
    ;(s.drawerContent || []).forEach(function (p) {
      shadow.appendChild(el('p', null, p))
    })
    api.stage.appendChild(shadow)

    if (api.done()) {
      /* returning to the screen: the five were already opened, so say so */
      stops.querySelectorAll<HTMLButtonElement>('.s01-stop').forEach(function (b) {
        b.setAttribute('data-open', '1')
      })
      ;(s.actionDetails || []).forEach(function (d) {
        opened[d.commandment] = true
      })
      paintCount()
      hint.classList.add('is-gone')
    }
  }
}
