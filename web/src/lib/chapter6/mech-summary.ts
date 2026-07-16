/* סיכום.
   LIVE: sum-end — the finish screen. The closing exercise moved to mech-checks.ts.
   RETIRED, code kept intact: 29 — the check the spec asks for here has a different
   option set and different wording, so it is authored in mech-checks.ts from data.ts. */

import { engine } from './runtime'
import type { MechApi, MechRegistry } from './types'

export function registerSummary(M: MechRegistry): void {
  const VERB_ICON: Record<string, string> = {
    shahada: 'icon-shahada.png',
    prayer: 'icon-prayer.png',
    charity: 'icon-charity.png',
    fast: 'icon-ramadan.png',
    hajj: 'icon-hajj.png',
  }

  /* ================= 29 — חמש פעולות, דרך חיים אחת ================= */
  M['29'] = function (api: MechApi) {
    const el = api.el
    const wrap = el('div', 'mech s29')

    /* each situation belongs to exactly one verb; they are states, not trivia */
    const SITS = [
      { k: 'shahada', text: 'אמירת העדות', verb: 'להעיד' },
      { k: 'prayer', text: 'תפילה בשקיעה', verb: 'להתפלל' },
      { k: 'charity', text: 'מתן 2.5%', verb: 'לתת' },
      { k: 'fast', text: 'צום עד השקיעה', verb: 'לצום' },
      { k: 'hajj', text: 'הקפת הכעבה', verb: 'לעלות לרגל' },
    ]
    const matched: Record<string, boolean> = {}
    let selected: string | null = null

    const sentence = el('div', 's29-sentence')
    const targets: Record<string, HTMLButtonElement> = {}
    engine().verbs.forEach(function (v) {
      const t = el('button', 's29-verb')
      t.type = 'button'
      t.setAttribute('data-k', v.key)
      t.setAttribute('aria-label', 'שיוך אל ' + v.verb)
      const im = el('img')
      im.src = '/assets/anim-video/' + VERB_ICON[v.key]
      im.alt = ''
      t.appendChild(im)
      t.appendChild(el('b', null, v.verb))
      t.addEventListener('click', function () {
        drop(v.key)
      })
      sentence.appendChild(t)
      targets[v.key] = t
    })

    const pool = el('div', 's29-pool')
    const chips: Record<string, HTMLButtonElement> = {}
    /* offered out of order so the match is a judgement, not a row-by-row copy */
    ;['charity', 'hajj', 'shahada', 'fast', 'prayer'].forEach(function (k) {
      const S = SITS.filter(function (x) {
        return x.k === k
      })[0]
      const b = el('button', 's29-sit')
      b.type = 'button'
      b.textContent = S.text
      b.setAttribute('aria-pressed', 'false')
      b.addEventListener('click', function () {
        pick(k, b)
      })
      pool.appendChild(b)
      chips[k] = b
    })

    function pick(k: string, b: HTMLButtonElement): void {
      if (matched[k]) return
      selected = k
      pool.querySelectorAll<HTMLButtonElement>('.s29-sit').forEach(function (x) {
        x.setAttribute('aria-pressed', 'false')
        x.classList.remove('is-sel')
      })
      b.setAttribute('aria-pressed', 'true')
      b.classList.add('is-sel')
      api.say('בחרו את הפועל שאליו הסיטואציה שייכת', 'ok')
    }

    function drop(verbKey: string): void {
      if (!selected) {
        api.say('בחרו קודם סיטואציה, ואז את הפועל המתאים לה', 'try')
        return
      }
      if (verbKey !== selected) {
        api.say('הסיטואציה הזו שייכת לפועל אחר. בדקו שוב לאיזו מצווה היא מתארת.', 'try')
        return
      }
      matched[verbKey] = true
      chips[verbKey].disabled = true
      chips[verbKey].classList.remove('is-sel')
      chips[verbKey].classList.add('is-done')
      targets[verbKey].classList.add('is-filled')
      selected = null
      api.say('', null)
      if (Object.keys(matched).length === 5) {
        api.complete()
        api.say((api.screen.feedback || [])[0] || '', 'ok')
        hint.classList.add('is-gone')
      }
    }

    wrap.appendChild(sentence)
    wrap.appendChild(pool)
    api.stage.appendChild(wrap)
    const hint = api.hint('בחרו סיטואציה, ואז את הפועל שאליו היא שייכת')
    if (api.done()) {
      Object.keys(chips).forEach(function (k) {
        matched[k] = true
        chips[k].disabled = true
        chips[k].classList.add('is-done')
        targets[k].classList.add('is-filled')
      })
      api.say((api.screen.feedback || [])[0] || '', 'ok')
      hint.classList.add('is-gone')
    }
  }

  /* ================= 30 — סיום הפרק ================= */
  M['sum-end'] = function (api: MechApi) {
    const el = api.el
    const wrap = el('div', 'mech s30')

    /* one memory line per verb — a summary of the chapter, never a replacement for it */
    const MEMORY: Record<string, string> = {
      shahada: 'העדות שאין אל מבלעדי אללה ושמוחמד הוא שליחו.',
      prayer: 'חמש תפילות ביום, בזמנים קבועים, בכוונה ולכיוון מכה.',
      charity: '2.5% מן המאזן השנתי — 1/40 — לעניים, לנזקקים, ליתומים ולבתי תמחוי.',
      fast: 'צום מעלות השחר עד השקיעה בחודש שבו ירד הקוראן.',
      hajj: 'מסע אחד בחיים, למי שביכולתו — מן המיקאת ועד ההקפה האחרונה.',
    }

    const grid = el('div', 's30-grid')
    engine().verbs.forEach(function (v) {
      const card = el('button', 's30-card')
      card.type = 'button'
      const complete = engine().sectionDone(v.section)
      card.setAttribute('data-done', complete ? '1' : '0')
      card.setAttribute('aria-label', 'חזרה אל ' + v.verb)
      const im = el('img')
      im.src = '/assets/anim-video/' + VERB_ICON[v.key]
      im.alt = ''
      card.appendChild(im)
      card.appendChild(el('b', null, v.verb))
      card.appendChild(el('span', 's30-mem', MEMORY[v.key]))
      if (!complete) card.appendChild(el('span', 's30-flag', 'נותרו חלקים פתוחים'))
      card.addEventListener('click', function () {
        const t = engine().firstScreenOfSection(v.section)
        if (t != null) engine().go(t)
      })
      grid.appendChild(card)
    })

    const openSections = engine().verbs.filter(function (v) {
      return !engine().sectionDone(v.section)
    })

    const note = el('p', 's30-note')
    note.textContent = openSections.length
      ? 'אפשר לחזור לחלקים שנותרו פתוחים, או לסיים את הפרק.'
      : 'כל חמשת החלקים הושלמו.'

    /* The closing moment. After 43 screens, a film and six exercises, "finish" used to be
       one line of text beside an empty box. The seal is the site's own completion mark —
       the gold ring and tick the rail uses — landed once, large, when the chapter closes. */
    const seal = el('div', 's30-seal')
    seal.setAttribute('aria-hidden', 'true')
    seal.appendChild(
      api.svg(
        '<path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
      )
    )
    seal.hidden = true

    const finish = el('button', 'btn btn-primary s30-finish')
    finish.type = 'button'
    finish.textContent = 'סיום הפרק'

    const after = el('div', 's30-after')
    after.hidden = true
    const back = el('a', 'btn btn-ghost')
    back.href = '/chapters'
    back.textContent = 'חזרה לפרקי הלמידה'
    after.appendChild(back)
    /* "לפרק הבא" was removed: chapter 7 is not built, so it pointed at the same place as
       "חזרה לפרקי הלמידה" — two buttons, one destination. Restore it (btn btn-primary,
       href to the next chapter) the day that chapter exists. */

    function closeChapter(): void {
      finish.hidden = true
      seal.hidden = false
      after.hidden = false
      wrap.classList.add('is-finished')
      api.say('פרק 6 סומן כהושלם.', 'ok')
    }

    finish.addEventListener('click', function () {
      engine().markChapterComplete()
      api.complete()
      /* status, not a score — the spec forbids a numeric grade */
      closeChapter()
      back.focus()
    })

    wrap.appendChild(grid)
    wrap.appendChild(seal)
    wrap.appendChild(note)
    wrap.appendChild(finish)
    wrap.appendChild(after)
    api.stage.appendChild(wrap)

    if (engine().state.completed) {
      api.complete()
      closeChapter()
    }
  }
}
