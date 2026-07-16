/* צום רמדאן.
   LIVE: rm-v — the fast day. The check moved to mech-checks.ts.
   RETIRED, code kept intact: 22 — the check the spec asks for here has a different
   option set and different wording, so it is authored in mech-checks.ts from data.ts.
   RETIRED, code kept intact: 16, 17, 19, 20, 21 — absent from data.ts, never reached. */

import { SKYLINE } from './art'
import type { MechApi, MechRegistry } from './types'

export function registerRamadan(M: MechRegistry): void {
  function range(
    api: MechApi,
    label: string,
    min: number,
    max: number,
    val: number,
    step?: number
  ) {
    const box = api.el('div', 'track')
    const line = api.el('div', 'track-line')
    line.setAttribute('aria-hidden', 'true')
    const r = api.el('input')
    r.type = 'range'
    r.min = String(min)
    r.max = String(max)
    r.value = String(val)
    r.step = String(step || 1)
    r.className = 'track-range'
    r.setAttribute('aria-label', label)
    box.appendChild(line)
    box.appendChild(r)
    return { box: box, range: r, line: line }
  }

  /* ================= 16 — זיכרונות בתוך הירח ================= */
  M['16'] = function (api: MechApi) {
    const el = api.el
    const wrap = el('div', 'mech s16')

    /* six moon phases, one per source paragraph, in the order the text tells it */
    const MEM = [
      { phase: 0, title: 'התקופה הטרום-אסלאמית', para: 0 },
      { phase: 1, title: 'מדינה', para: 1 },
      { phase: 2, title: 'צום יום הכיפורים', para: 2 },
      { phase: 3, title: 'תשובת היהודים', para: 3 },
      { phase: 4, title: 'תגובת מוחמד', para: 4 },
      { phase: 5, title: 'המעבר לצום רמדאן', para: 5 },
    ]
    const seen: Record<number, boolean> = {}

    const moon = el('div', 's16-moon')
    const disc = el('div', 's16-disc')
    disc.setAttribute('aria-hidden', 'true')
    const shade = el('div', 's16-shade')
    shade.setAttribute('aria-hidden', 'true')
    disc.appendChild(shade)
    moon.appendChild(disc)

    const caption = el('div', 's16-caption')
    caption.setAttribute('role', 'status')
    caption.setAttribute('aria-live', 'polite')
    moon.appendChild(caption)

    const t = range(api, 'סיבוב מופעי הירח', 0, 5, 0)

    function sync() {
      const i = +t.range.value
      const M0 = MEM[i]
      /* The shade sweeps across the disc as the phase advances. The step must clear the
         disc over the whole range: at 40% per memory the sweep ran -100%→+100%, so it
         left the disc at BOTH ends and the six memories only ever showed three distinct
         moons (0/40/80/80/40/0% covered — 1 and 6 identical, 2 and 5 identical). */
      shade.style.transform = 'translateX(' + (-100 + i * 16) + '%)'
      t.line.style.setProperty('--fill', (i / 5 * 100) + '%')
      caption.textContent = M0.title
      api.highlight(M0.para)
      seen[i] = true
      if (Object.keys(seen).length === MEM.length && !api.done()) {
        api.complete()
        api.say('ששת הזיכרונות נפתחו — מן הצום הטרום-אסלאמי ועד לקביעת הצום בחודש רמדאן.', 'ok')
        hint.classList.add('is-gone')
      }
    }
    t.range.addEventListener('input', sync)

    wrap.appendChild(moon)
    wrap.appendChild(t.box)
    api.stage.appendChild(wrap)
    const hint = api.hint('סובבו את מופעי הירח — כל מופע פותח זיכרון והפסקה שלו')
    if (api.done())
      MEM.forEach(function (m, i) {
        seen[i] = true
      })
    sync()
  }

  /* ================= 17 — ליל אלקדר ================= */
  M['17'] = function (api: MechApi) {
    const el = api.el
    const wrap = el('div', 'mech s17')

    const grid = el('div', 's17-grid')
    const cells: HTMLButtonElement[] = []
    for (let n = 1; n <= 30; n++) {
      const c = el('button', 's17-night')
      c.type = 'button'
      c.textContent = String(n)
      c.setAttribute('aria-label', 'לילה ' + n)
      ;(function (num: number, cell: HTMLButtonElement) {
        cell.addEventListener('click', function () {
          land(num)
        })
      })(n, c)
      grid.appendChild(c)
      cells.push(c)
    }

    const reveal = el('div', 's17-reveal')
    reveal.hidden = true
    reveal.appendChild(el('b', null, 'ליל אלקדר'))
    reveal.appendChild(el('span', null, 'הלילה ה־27 לחודש'))

    const t = range(api, 'הזזת האור על פני לילות החודש', 1, 30, 1)

    function land(n: number) {
      t.range.value = String(n)
      sync()
    }
    function sync() {
      const v = +t.range.value
      cells.forEach(function (c, i) {
        c.classList.toggle('is-lit', i + 1 === v)
      })
      t.line.style.setProperty('--fill', ((v - 1) / 29 * 100) + '%')
      const found = v === 27
      reveal.hidden = !found
      grid.classList.toggle('is-found', found)
      api.highlight(0)
      if (found && !api.done()) {
        api.complete()
        api.say('הלילה ה־27 אותר — „ליל אלקדר”, שבו ירד הקוראן בהתגלות הראשונה בשנת 610.', 'ok')
        hint.classList.add('is-gone')
      }
    }
    t.range.addEventListener('input', sync)

    wrap.appendChild(grid)
    wrap.appendChild(reveal)
    wrap.appendChild(t.box)
    api.stage.appendChild(wrap)
    const hint = api.hint('הזיזו את האור אל הלילה שבו ירד הקוראן')
    if (api.done()) t.range.value = '27'
    sync()
  }

  /* ================= 18 — להחזיק את היום עד השקיעה ================= */
  M['rm-v'] = function (api: MechApi) {
    const el = api.el
    const wrap = el('div', 'mech s18')

    const sky = el('div', 's18-sky')
    const sun = el('div', 's18-sun')
    sun.setAttribute('aria-hidden', 'true')
    sky.appendChild(sun)

    /* the fast is defined horizon to horizon — dawn rises and the sun sets behind the
       same skyline the prayer screen stands on */
    const skyline = el('div', 's18-skyline')
    skyline.setAttribute('aria-hidden', 'true')
    skyline.innerHTML = SKYLINE
    sky.appendChild(skyline)

    /* the forbidden things sit in the background, disabled — never a menu to pick from */
    const band = el('div', 's18-band')
    band.setAttribute('aria-hidden', 'true')
    ;['אכילה', 'שתייה', 'עישון'].forEach(function (n) {
      band.appendChild(el('span', 's18-item', n))
    })
    sky.appendChild(band)

    const stage2 = el('div', 's18-after')
    stage2.hidden = true
    const iftar = el('div', 's18-step', 'אפטאר — סעודה קלה')
    const tarawih = el('div', 's18-step', 'מסגד — תפילות התראויח')
    stage2.appendChild(iftar)
    stage2.appendChild(tarawih)

    const clock = el('div', 's18-clock')
    clock.setAttribute('role', 'status')
    clock.setAttribute('aria-live', 'polite')

    const holdBtn = el('button', 'mech-btn mech-btn-primary s18-hold')
    holdBtn.type = 'button'
    holdBtn.textContent = 'החזיקו כדי לקדם את היום'

    let p = 0,
      raf: number | null = null,
      last = 0
    function tickOn(ts: number) {
      if (!last) last = ts
      const dt = (ts - last) / 1000
      last = ts
      p = Math.min(1, p + dt / 6) // a full fast day in six seconds of holding
      paint()
      if (p >= 1) {
        finish()
        return
      }
      raf = requestAnimationFrame(tickOn)
    }
    function paint() {
      const deg = 180 * p
      sun.style.insetInlineStart = (p * 100) + '%'
      sun.style.insetBlockStart = (52 - Math.sin(deg * Math.PI / 180) * 42) + '%'
      sky.style.setProperty('--t', String(p))
      band.classList.toggle('is-off', p < 1)
      const hh = Math.floor(5 + p * 14)
      clock.textContent = p < 1
        ? 'מעלות השחר — הצום נמשך (' + hh + ':00)'
        : 'שקיעת החמה — שבירת הצום'
      api.highlight(0)
    }
    function finish() {
      /* raf is null until the first hold; the original leaned on the DOM turning that
         into a no-op cancel, so the assertion only satisfies the typed signature */
      cancelAnimationFrame(raf!)
      holdBtn.disabled = true
      holdBtn.textContent = 'היום הושלם'
      stage2.hidden = false
      requestAnimationFrame(function () {
        iftar.classList.add('is-in')
        setTimeout(function () {
          tarawih.classList.add('is-in')
        }, api.reduced ? 0 : 450)
      })
      api.complete()
      api.say(
        'הצום נמשך מעלות השחר עד שקיעת החמה; אז נשבר הצום באפטאר, ולאחריו תפילות התראויח במסגד.',
        'ok'
      )
      hint.classList.add('is-gone')
    }
    /* A plain click does nothing here on purpose — the holding IS the fast — but doing
       nothing silently read as broken (the learner went looking for a refresh). A short
       tap now answers with a visible "hold me" pulse and lights the instruction line. */
    let downAt = 0
    function nudge() {
      wrap.classList.remove('is-nudge')
      void wrap.offsetWidth
      wrap.classList.add('is-nudge')
    }
    function start(e?: Event) {
      if (api.done() || holdBtn.disabled) return
      if (e && e.preventDefault) e.preventDefault()
      downAt = performance.now()
      last = 0
      raf = requestAnimationFrame(tickOn)
    }
    function stop() {
      cancelAnimationFrame(raf!)
      last = 0
      if (!api.done() && !holdBtn.disabled && downAt && performance.now() - downAt < 280) nudge()
      downAt = 0
    }
    holdBtn.addEventListener('pointerdown', start)
    holdBtn.addEventListener('pointerup', stop)
    holdBtn.addEventListener('pointerleave', stop)
    holdBtn.addEventListener('keydown', function (e) {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e)
    })
    holdBtn.addEventListener('keyup', function (e) {
      if (e.key === ' ' || e.key === 'Enter') stop()
    })

    wrap.appendChild(sky)
    wrap.appendChild(clock)
    wrap.appendChild(stage2)
    wrap.appendChild(holdBtn)
    api.stage.appendChild(wrap)
    const hint = api.hint('החזיקו את הלחיצה כדי לקדם את השמש מעלות השחר עד השקיעה')
    if (api.done()) {
      p = 1
      paint()
      finish()
    } else paint()
  }

  /* ================= 19 — עשרת הלילות האחרונים ================= */
  M['19'] = function (api: MechApi) {
    const el = api.el
    const wrap = el('div', 'mech s19')

    const FOCI = [
      { k: 'allah', name: 'התקרבות לאללה', scene: 'תפילה' },
      { k: 'midot', name: 'עבודת המידות בין אדם לחברו', scene: 'תיקון קשר בין אנשים' },
      { k: 'tongue', name: 'שליטה עצמית על לשונו', scene: 'השתקת מילים פוגעות' },
    ]
    const opened: Record<string, boolean> = {}

    const field = el('div', 's19-field')
    const lights = el('div', 's19-lights')
    lights.setAttribute('aria-hidden', 'true')
    for (let i = 0; i < 10; i++) {
      const L = el('span', 's19-light')
      L.style.setProperty('--n', String(i))
      lights.appendChild(L)
    }
    field.appendChild(lights)

    const scene = el('div', 's19-scene')
    scene.setAttribute('role', 'status')
    scene.setAttribute('aria-live', 'polite')
    field.appendChild(scene)

    const row = el('div', 's19-row')
    const btns = FOCI.map(function (F) {
      const b = el('button', 's19-focus')
      b.type = 'button'
      b.textContent = F.name
      b.setAttribute('aria-pressed', 'false')
      b.addEventListener('click', function () {
        opened[F.k] = true
        /* this is a single-select, so the previous choice must be un-pressed as well as
           un-styled — setting aria-pressed without ever clearing it left all three
           announcing as pressed once the learner had been through them all */
        row.querySelectorAll<HTMLButtonElement>('.s19-focus').forEach(function (x) {
          x.classList.remove('is-on')
          x.setAttribute('aria-pressed', 'false')
        })
        b.classList.add('is-on')
        b.setAttribute('aria-pressed', 'true')
        field.setAttribute('data-focus', F.k)
        scene.textContent = F.scene
        api.highlight(0)
        if (Object.keys(opened).length === 3 && !api.done()) {
          api.complete()
          /* the mercy line lands as content at the end, without staging a judgement */
          api.say(
            'שלושת מוקדי המשמעות נפתחו. המסורת המוסלמית אומרת בשם מוחמד כי מי שצם לשם שמים בחודש רמדאן, כל עוונות העבר נמחלות לו.',
            'ok'
          )
          api.highlight(1)
          hint.classList.add('is-gone')
        }
      })
      row.appendChild(b)
      return b
    })

    wrap.appendChild(field)
    wrap.appendChild(row)
    api.stage.appendChild(wrap)
    const hint = api.hint('עברו בין שלושת מוקדי המשמעות של עשרת הלילות האחרונים')
    api.highlight(0)
    if (api.done()) {
      FOCI.forEach(function (F, i) {
        opened[F.k] = true
        btns[i].setAttribute('aria-pressed', 'true')
      })
      btns[2].classList.add('is-on')
      field.setAttribute('data-focus', 'tongue')
      scene.textContent = FOCI[2].scene
      hint.classList.add('is-gone')
    }
  }

  /* ================= 20 — מן הצום אל עיד אלפטר ================= */
  M['20'] = function (api: MechApi) {
    const el = api.el
    const wrap = el('div', 'mech s20')

    const STOPS = [
      { at: 0, k: 'table', name: 'ארוחות משפחתיות משותפות', para: 0 },
      { at: 25, k: 'clothes', name: 'בגדים ותכשיטים חדשים', para: 0 },
      { at: 50, k: 'charity', name: 'צדקה נוספת מעבר לצדקה השנתית', para: 0 },
      { at: 75, k: 'visit', name: 'ביקור קרובי משפחה (צלת אלרחם)', para: 1 },
      { at: 100, k: 'peace', name: 'פיוס עם קרובים', para: 1 },
    ]
    const seen: Record<string, boolean> = {}

    const house = el('div', 's20-house')
    const figure = el('div', 's20-figure')
    figure.setAttribute('aria-hidden', 'true')
    house.appendChild(figure)

    /* the reconciliation is a broken line rejoining, not a badge */
    const mend = el('div', 's20-mend')
    mend.setAttribute('aria-hidden', 'true')
    mend.appendChild(el('span', 's20-mend-a'))
    mend.appendChild(el('span', 's20-mend-b'))
    house.appendChild(mend)

    const caption = el('div', 's20-caption')
    caption.setAttribute('role', 'status')
    caption.setAttribute('aria-live', 'polite')
    house.appendChild(caption)

    const t = range(api, 'מעבר הדמות בסצנת החג', 0, 100, 0)

    function sync() {
      const v = +t.range.value
      let best = STOPS[0],
        d = 1e9
      STOPS.forEach(function (S) {
        const k = Math.abs(v - S.at)
        if (k < d) {
          d = k
          best = S
        }
      })
      figure.style.insetInlineStart = v + '%'
      house.setAttribute('data-stop', best.k)
      mend.classList.toggle('is-mended', best.k === 'peace')
      t.line.style.setProperty('--fill', v + '%')
      caption.textContent = best.name
      api.highlight(best.para)
      if (d < 13) {
        seen[best.k] = true
        if (Object.keys(seen).length === STOPS.length && !api.done()) {
          api.complete()
          api.say(
            'חמשת הביטויים של החג נחשפו: ארוחות משותפות, בגדים ותכשיטים חדשים, צדקה נוספת, ביקור קרובים ופיוס.',
            'ok'
          )
          hint.classList.add('is-gone')
        }
      }
    }
    t.range.addEventListener('input', sync)

    wrap.appendChild(house)
    wrap.appendChild(t.box)
    api.stage.appendChild(wrap)
    const hint = api.hint('העבירו את הדמות בסצנה ועצרו בכל אחד מביטויי החג')
    if (api.done())
      STOPS.forEach(function (S) {
        seen[S.k] = true
      })
    sync()
  }

  /* ================= 21 — מתי החודש מתחיל ומסתיים? ================= */
  M['21'] = function (api: MechApi) {
    const el = api.el
    const wrap = el('div', 'mech s21')

    const field = el('div', 's21-field')
    const moon = el('div', 's21-moon')
    moon.setAttribute('aria-hidden', 'true')
    const scope = el('div', 's21-lens s21-scope')
    scope.appendChild(el('b', null, 'טלסקופ'))
    scope.appendChild(el('span', null, 'האסכולה הסעודית — ראיית המולד (המולד האמיתי)'))
    const calc = el('div', 's21-lens s21-calc')
    calc.appendChild(el('b', null, 'חישוב אסטרונומי'))
    calc.appendChild(el('span', null, 'האסכולה המצרית — חישובים אסטרונומיים (המולד הממוצע)'))
    field.appendChild(scope)
    field.appendChild(moon)
    field.appendChild(calc)

    const t = range(api, 'מחוון בין שתי העדשות', 0, 100, 50)
    let sawScope = false,
      sawCalc = false

    function sync() {
      const v = +t.range.value
      /* RTL: 0 sits on the right, where the telescope lens is */
      scope.style.opacity = String(Math.max(0.25, 1 - v / 100 * 1.4))
      calc.style.opacity = String(Math.max(0.25, v / 100 * 1.4))
      scope.classList.toggle('is-on', v < 28)
      calc.classList.toggle('is-on', v > 72)
      moon.setAttribute('data-lens', v < 28 ? 'scope' : (v > 72 ? 'calc' : 'both'))
      t.line.style.setProperty('--fill', v + '%')
      if (v < 28) {
        sawScope = true
        api.highlight(0)
      }
      if (v > 72) {
        sawCalc = true
        api.highlight(0)
      }
      if (sawScope && sawCalc && !api.done()) {
        api.complete()
        api.say(
          'שתי העדשות נבדקו: האסכולה הסעודית קובעת לפי ראיית המולד בטלסקופ, והאסכולה המצרית לפי חישובים אסטרונומיים.',
          'ok'
        )
        hint.classList.add('is-gone')
      }
    }
    t.range.addEventListener('input', sync)

    wrap.appendChild(field)
    wrap.appendChild(t.box)
    api.stage.appendChild(wrap)
    const hint = api.hint('הזיזו את המחוון אל שתי העדשות')
    api.highlight(0)
    if (api.done()) {
      sawScope = sawCalc = true
    }
    sync()
  }

  /* ================= 22 — רגע החלטה: יום שלם בחודש רמדאן ================= */
  M['22'] = function (api: MechApi) {
    const el = api.el
    const wrap = el('div', 'mech s22')

    const ORDER = ['fast', 'sunset', 'iftar', 'tarawih', 'eid']
    const LABEL: Record<string, string> = {
      fast: 'תחילת הצום (עלות השחר)',
      sunset: 'השקיעה',
      iftar: 'האפטאר',
      tarawih: 'תפילות התראויח',
      eid: 'עיד אלפטר',
    }
    const placed: string[] = []

    const line = el('div', 's22-line')
    const slots = ORDER.map(function (_, i) {
      const s = el('div', 's22-slot')
      s.setAttribute('data-i', String(i))
      s.appendChild(el('span', 's22-num', String(i + 1)))
      line.appendChild(s)
      return s
    })

    const pool = el('div', 's22-pool')
    /* deliberately shuffled so the order is a decision, not a reading of the layout */
    const bank = ['iftar', 'eid', 'fast', 'tarawih', 'sunset']
    const chips: Record<string, HTMLButtonElement> = {}
    bank.forEach(function (k) {
      const b = el('button', 's22-chip')
      b.type = 'button'
      b.textContent = LABEL[k]
      b.setAttribute('data-k', k)
      b.addEventListener('click', function () {
        placeNext(k)
      })
      pool.appendChild(b)
      chips[k] = b
    })

    function placeNext(k: string) {
      if (placed.indexOf(k) >= 0 || placed.length >= ORDER.length) return
      const i = placed.length
      placed.push(k)
      const s = slots[i]
      s.innerHTML = ''
      const tag = el('button', 's22-placed')
      tag.type = 'button'
      tag.textContent = LABEL[k]
      tag.setAttribute('aria-label', 'הסרה: ' + LABEL[k])
      tag.addEventListener('click', function () {
        undo(k)
      })
      s.appendChild(tag)
      chips[k].disabled = true
      api.say('', null)
      checkBtn.disabled = placed.length !== ORDER.length
      api.highlight(0)
    }
    function undo(k: string) {
      const i = placed.indexOf(k)
      if (i < 0) return
      /* removing a chip re-opens everything after it, so order stays honest */
      const tail = placed.splice(i)
      tail.forEach(function (x) {
        chips[x].disabled = false
      })
      slots.forEach(function (s, n) {
        if (n >= i) {
          s.innerHTML = ''
          s.appendChild(el('span', 's22-num', String(n + 1)))
        }
      })
      checkBtn.disabled = true
      api.say('', null)
    }

    const extraBox = el('div', 's22-extra')
    extraBox.hidden = true
    extraBox.appendChild(el('p', 's22-q', 'באיזו נקודה ניתנת הצדקה הנוספת?'))
    let extraPick: string | null = null
    const extraRow = el('div', 's22-extra-row')
    ORDER.forEach(function (k) {
      const b = el('button', 's22-extra-opt')
      b.type = 'button'
      b.textContent = LABEL[k]
      b.setAttribute('aria-pressed', 'false')
      b.addEventListener('click', function () {
        extraPick = k
        extraRow.querySelectorAll<HTMLButtonElement>('.s22-extra-opt').forEach(function (x) {
          x.setAttribute('aria-pressed', 'false')
          x.classList.remove('is-on')
        })
        b.setAttribute('aria-pressed', 'true')
        b.classList.add('is-on')
        api.say('', null)
      })
      extraRow.appendChild(b)
    })
    extraBox.appendChild(extraRow)

    const checkBtn = el('button', 'mech-btn mech-btn-primary')
    checkBtn.type = 'button'
    checkBtn.textContent = 'בדיקה'
    checkBtn.disabled = true
    checkBtn.addEventListener('click', function () {
      const fb = api.screen.feedback || []
      const orderOk = placed.join(',') === ORDER.join(',')
      if (!orderOk) {
        api.say(fb[1] || '', 'try')
        return
      }
      if (extraBox.hidden) {
        extraBox.hidden = false
        api.say('הסדר נכון. עכשיו קבעו באיזו נקודה ניתנת הצדקה הנוספת.', 'ok')
        return
      }
      if (extraPick !== 'eid') {
        api.say(fb[1] || '', 'try')
        return
      }
      api.complete()
      api.say(fb[0] || '', 'ok')
      checkBtn.disabled = true
      hint.classList.add('is-gone')
    })

    wrap.appendChild(line)
    wrap.appendChild(pool)
    wrap.appendChild(extraBox)
    wrap.appendChild(checkBtn)
    api.stage.appendChild(wrap)
    const hint = api.hint('מקמו את האירועים על הקו לפי סדרם, ואז קבעו היכן ניתנת הצדקה הנוספת')
    if (api.done()) {
      ORDER.forEach(placeNext)
      extraBox.hidden = false
      extraRow.querySelectorAll<HTMLButtonElement>('.s22-extra-opt')[4].classList.add('is-on')
      extraPick = 'eid'
      checkBtn.disabled = true
      api.say((api.screen.feedback || [])[0] || '', 'ok')
      hint.classList.add('is-gone')
    }
  }
}
