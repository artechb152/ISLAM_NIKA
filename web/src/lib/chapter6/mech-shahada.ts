/* השהאדה.
   LIVE: sh-v — the calligraphy illustration. The check moved to mech-checks.ts.
   RETIRED, code kept intact: 05 — the check the spec asks for here has a different
   option set and different wording, so it is authored in mech-checks.ts from data.ts.
   RETIRED, code kept intact: 03 and 04. They are registered under ids that no longer
   appear in data.ts, so the engine never reaches them — nothing links to them and nothing
   was deleted. Re-adding a screen with that id is all it takes to bring one back.
   Every mechanism here is driven by a native range/button, so pointer and keyboard
   are the same control rather than a fallback bolted on afterwards. */

import type { MechApi, MechRegistry } from './types'

export function registerShahada(M: MechRegistry): void {
  /* a line the learner travels along; returns the range element */
  function track(api: MechApi, opts: { label: string }) {
    const box = api.el('div', 'track')
    const line = api.el('div', 'track-line')
    line.setAttribute('aria-hidden', 'true')
    const r = api.el('input')
    r.type = 'range'
    r.min = '0'
    r.max = '100'
    r.value = '0'
    r.step = '1'
    r.className = 'track-range'
    r.setAttribute('aria-label', opts.label)
    box.appendChild(line)
    box.appendChild(r)
    return { box: box, range: r, line: line }
  }

  /* ================= 02 — ממילה לעדות ================= */
  M['sh-v'] = function (api: MechApi) {
    const el = api.el
    const wrap = el('div', 'mech s02')

    const layers = [
      { at: 8, cls: 'ar', text: 'الشهادة', note: 'ערבית' },
      { at: 45, cls: 'tr', text: 'שהאדה', note: 'תעתיק' },
      { at: 82, cls: 'he', text: 'עדות', note: 'משמעה' },
    ]

    const stack = el('div', 's02-stack')
    const nodes = layers.map(function (L) {
      const d = el('div', 's02-layer ' + L.cls)
      d.appendChild(el('span', 's02-word', L.text))
      d.appendChild(el('span', 's02-note', L.note))
      stack.appendChild(d)
      return d
    })

    const t = track(api, { label: 'מעבר לאורך הקו הקליגרפי' })
    /* The first illustration screen in the chapter must not open EMPTY: it opens on the
       Arabic word already showing, and the drag adds the transliteration and the meaning.
       Four reviewers met the blank version and read it as a screen that failed to load —
       the first impression decided what every later illustration "was". */
    t.range.value = '12'
    const seen: Record<number, boolean> = {}

    function sync() {
      const v = +t.range.value
      let note = ''
      layers.forEach(function (L, i) {
        const on = v >= L.at
        nodes[i].classList.toggle('is-on', on)
        if (on) note = L.note
        if (on && !seen[i]) {
          seen[i] = true
          if (Object.keys(seen).length === 3) {
            api.complete()
            api.say('שלוש השכבות נחשפו: המילה בערבית, התעתיק והמשמעות.', 'ok')
            hint.classList.add('is-gone')
          }
        }
      })
      t.range.setAttribute('aria-valuetext', note ? note : Math.round(v) + '%')
      api.highlight(0)
      t.line.style.setProperty('--fill', v + '%')
    }
    t.range.addEventListener('input', sync)

    wrap.appendChild(stack)
    wrap.appendChild(t.box)
    api.stage.appendChild(wrap)
    const hint = api.hint('הזיזו את הסמן לאורך הקו — כל עצירה חושפת שכבה. אין כאן תשובה שגויה.')
    if (api.done()) {
      t.range.value = '100'
    }
    sync()
  }

  /* ================= 03 — שני חלקים, עדות אחת ================= */
  M['03'] = function (api: MechApi) {
    const el = api.el
    const wrap = el('div', 'mech s03')

    const field = el('div', 's03-field')
    /* the gap between the halves is the "פירוד" the spec describes */
    const idols = el('div', 's03-idols')
    idols.setAttribute('aria-hidden', 'true')
    for (let k = 0; k < 7; k++) {
      const d = el('span', 's03-idol')
      d.style.setProperty('--n', String(k))
      idols.appendChild(d)
    }
    const light = el('div', 's03-light')
    light.setAttribute('aria-hidden', 'true')

    const right = el('div', 's03-half s03-right', 'אין אל מבלעדי אללה')
    const left = el('div', 's03-half s03-left', 'ומוחמד הוא שליחו')

    field.appendChild(idols)
    field.appendChild(light)
    field.appendChild(right)
    field.appendChild(left)

    const t = track(api, { label: 'קירוב שני חלקי המשפט למרכז' })
    let joined = false

    /* How far each half must travel for the sentence to close to a single word space.
       A percentage cannot express this: `translateX(42%)` is 42% of each half's OWN width,
       and the two halves are different widths, so the pair overshot and the sentence ran
       through itself — measured, "אין אל מבלעדי אללה" overlapped "ומוחמד הוא שליחו" by
       34-42px at exactly the moment the screen completed. Offsets are layout values, so
       they are unaffected by the transform we are about to set and stay right on resize. */
    const JOINED_GAP = 14
    function travel() {
      const a = right.offsetLeft,
        aw = right.offsetWidth
      const b = left.offsetLeft,
        bw = left.offsetWidth
      const gap = a > b ? a - (b + bw) : b - (a + aw)
      return Math.max(0, (gap - JOINED_GAP) / 2)
    }

    function sync() {
      const v = +t.range.value / 100
      /* whichever half the writing direction puts on the right travels left, and vice
         versa — so the two always close toward each other, in RTL and LTR alike */
      const d = travel() * v
      const rSign = right.offsetLeft > left.offsetLeft ? -1 : 1
      right.style.transform = 'translateX(' + rSign * d + 'px)'
      left.style.transform = 'translateX(' + -rSign * d + 'px)'
      idols.style.opacity = String(1 - v)
      light.style.opacity = String(v)
      field.classList.toggle('is-joined', v >= 0.98)
      t.line.style.setProperty('--fill', v * 100 + '%')
      api.highlight(v >= 0.98 ? 1 : 0)
      if (v >= 0.98 && !joined) {
        joined = true
        api.complete()
        api.say((api.screen.feedback || [])[0] || '', 'ok')
        hint.classList.add('is-gone')
      }
    }
    t.range.addEventListener('input', sync)

    wrap.appendChild(field)
    wrap.appendChild(t.box)
    api.stage.appendChild(wrap)
    const hint = api.hint('קרבו את שני חלקי המשפט זה אל זה')
    if (api.done()) t.range.value = '100'
    sync()
  }

  /* ================= 04 — העדות נשמעת ================= */
  M['04'] = function (api: MechApi) {
    const el = api.el
    const wrap = el('div', 'mech s04')

    const STATIONS = [
      { key: 'adhan', name: 'קריאה לתפילה', sub: 'אד׳אן — המואזין', para: 0 },
      { key: 'salah', name: 'במהלך התפילה', sub: 'התפילה עצמה', para: 0 },
      { key: 'witness', name: 'קבלת האסלאם', sub: 'בפני שני עדים כשרים', para: 1 },
    ]

    const scene = el('div', 's04-scene')
    const row = el('div', 's04-row')
    const nodes = STATIONS.map(function (S) {
      const d = el('div', 's04-station')
      d.setAttribute('data-k', S.key)
      d.appendChild(el('div', 's04-name', S.name))
      d.appendChild(el('div', 's04-sub', S.sub))
      row.appendChild(d)
      return d
    })

    /* the route the wave travels, directly under the stations it connects */
    const laneBox = el('div', 's04-lanebox')
    laneBox.setAttribute('aria-hidden', 'true')
    laneBox.appendChild(el('div', 's04-lane'))

    /* three rings close only at the third station, once per utterance */
    const ringBox = el('div', 's04-rings')
    ringBox.hidden = true
    const rings = [0, 1, 2].map(function (n) {
      const r = el('span', 's04-ring')
      r.style.setProperty('--n', String(n))
      ringBox.appendChild(r)
      return r
    })
    const sayBtn = el('button', 'mech-btn s04-say')
    sayBtn.type = 'button'
    sayBtn.textContent = 'אמירת השהאדה'
    let said = 0
    sayBtn.addEventListener('click', function () {
      if (said >= 3) return
      rings[said].classList.add('is-closed')
      said++
      sayBtn.textContent = said < 3 ? 'אמירת השהאדה (' + said + ' מתוך 3)' : 'נאמרה שלוש פעמים'
      if (said >= 3) {
        sayBtn.disabled = true
        check()
      }
    })

    const wave = el('div', 's04-wave')
    wave.setAttribute('aria-hidden', 'true')
    for (let i = 0; i < 5; i++) {
      const b = el('span')
      b.style.setProperty('--n', String(i))
      wave.appendChild(b)
    }

    /* One press per move: the wave travels to the next station on its own.
       There is nothing to drag here — the learner chooses when to advance, not how far. */
    const nextBtn = el('button', 'mech-btn mech-btn-primary s04-next')
    nextBtn.type = 'button'
    nextBtn.textContent = 'המשך למצב הבא'
    nextBtn.addEventListener('click', function () {
      if (at >= STATIONS.length - 1) return
      at++
      visited[STATIONS[at].key] = true
      sync()
    })

    const controls = el('div', 's04-controls')
    controls.appendChild(nextBtn)
    controls.appendChild(sayBtn)

    let at = 0
    const visited: Record<string, boolean> = {}
    visited[STATIONS[0].key] = true

    function check() {
      if (Object.keys(visited).length === 3 && said >= 3) {
        api.complete()
        api.say('גל הקול עבר בשלושת המצבים, ובמעמד קבלת האסלאם נאמרה השהאדה שלוש פעמים.', 'ok')
        hint.classList.add('is-gone')
      }
    }

    /* The wave lands on the station's measured centre rather than a tuned percentage: the
       stations are flex:1 siblings, so their centres move with the pane. Screens are built
       while `display:none`, where every measurement reads 0 — hence placing on enter and
       resize rather than at build time. In RTL `inset-inline-start` counts from the right
       edge, which is also the edge the first station sits against, so the two stay in step. */
    function place() {
      const lb = laneBox.getBoundingClientRect()
      if (!lb.width) return
      const st = nodes[at].getBoundingClientRect()
      const mid = st.left + st.width / 2 - lb.left
      const rtl = getComputedStyle(scene).direction === 'rtl'
      const start = rtl ? lb.width - mid : mid
      wave.style.insetInlineStart = start - (wave.offsetWidth || 52) / 2 + 'px'
    }

    function sync() {
      place()
      nodes.forEach(function (n, i) {
        n.classList.toggle('is-on', i === at)
      })
      api.highlight(STATIONS[at].para)
      const atWitness = at === STATIONS.length - 1
      ringBox.hidden = !atWitness
      sayBtn.hidden = !atWitness
      nextBtn.hidden = atWitness
      check()
    }

    laneBox.appendChild(wave)
    scene.appendChild(row)
    scene.appendChild(laneBox)
    wrap.appendChild(scene)
    wrap.appendChild(ringBox)
    wrap.appendChild(controls)
    api.stage.appendChild(wrap)
    const hint = api.hint(
      'לחצו כדי להעביר את גל הקול אל המצב הבא; במעמד קבלת האסלאם אמרו את השהאדה שלוש פעמים'
    )
    if (api.done()) {
      at = STATIONS.length - 1
      said = 3
      rings.forEach(function (r) {
        r.classList.add('is-closed')
      })
      sayBtn.disabled = true
      sayBtn.textContent = 'נאמרה שלוש פעמים'
      STATIONS.forEach(function (S) {
        visited[S.key] = true
      })
    }
    api.onEnter = place
    window.addEventListener('resize', place)
    sync()
  }

  /* ================= 05 — רגע החלטה: היכן העדות שייכת? ================= */
  M['05'] = function (api: MechApi) {
    const el = api.el
    const wrap = el('div', 'mech s05')

    /* the fourth event is in the chapter but is not a moment the text names */
    const EVENTS = [
      { name: 'קריאה לתפילה', right: true },
      { name: 'התפילה', right: true },
      { name: 'קבלת האסלאם', right: true },
      { name: 'עלייה לרגל', right: false },
    ]
    const picked: Record<string, boolean> = {}

    const axis = el('div', 's05-axis')
    const line = el('div', 's05-line')
    line.setAttribute('aria-hidden', 'true')
    axis.appendChild(line)

    const btns = EVENTS.map(function (E, i) {
      const b = el('button', 's05-point')
      b.type = 'button'
      b.setAttribute('aria-pressed', 'false')
      b.appendChild(el('span', 's05-dot'))
      b.appendChild(el('span', 's05-label', E.name))
      b.addEventListener('click', function () {
        if (locked) return
        picked[i] = !picked[i]
        b.setAttribute('aria-pressed', String(!!picked[i]))
        b.classList.toggle('is-picked', !!picked[i])
        api.say('', null)
        checkBtn.disabled = !Object.keys(picked).some(function (k) {
          return picked[k]
        })
      })
      axis.appendChild(b)
      return b
    })

    const checkBtn = el('button', 'mech-btn mech-btn-primary')
    checkBtn.type = 'button'
    checkBtn.textContent = 'בדיקה'
    checkBtn.disabled = true
    let locked = false

    checkBtn.addEventListener('click', function () {
      const ok = EVENTS.every(function (E, i) {
        return !!picked[i] === E.right
      })
      const fb = api.screen.feedback || []
      if (ok) {
        locked = true
        btns.forEach(function (b, i) {
          b.disabled = true
          if (EVENTS[i].right) b.classList.add('is-right')
        })
        checkBtn.disabled = true
        api.complete()
        api.say(fb[0] || '', 'ok')
        hint.classList.add('is-gone')
      } else {
        api.say(fb[1] || '', 'try')
      }
    })

    wrap.appendChild(axis)
    wrap.appendChild(checkBtn)
    api.stage.appendChild(wrap)
    const hint = api.hint('סמנו את הרגעים שבהם השהאדה נאמרת, ואז בדקו. אפשר לשנות לפני הבדיקה.')

    if (api.done()) {
      locked = true
      EVENTS.forEach(function (E, i) {
        if (E.right) {
          picked[i] = true
          btns[i].classList.add('is-picked', 'is-right')
          btns[i].setAttribute('aria-pressed', 'true')
        }
        btns[i].disabled = true
      })
      checkBtn.disabled = true
      api.say((api.screen.feedback || [])[0] || '', 'ok')
      hint.classList.add('is-gone')
    }
  }
}
