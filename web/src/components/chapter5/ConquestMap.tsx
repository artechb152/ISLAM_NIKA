'use client'

/* עמר · הכיבושים — the chapter's one journey.

   The plate is a DRAWING (`/assets/chapter5/umar-map.jpg`), not a projection, and it
   carries no lettering of any kind: every name on screen is DOM text over it. That is
   chapter 6's rule for its own maps and the reason this one was generated blank.

   IT IS CHAPTER 6'S FULL-SCREEN STAGE, the shape the prayer day uses: the map fills the
   viewport behind the reading, the paragraphs ride over it in parchment cards, and both
   the cards and the pins advance with the scroll. Two shapes were tried before it and
   both were wrong for a map — a side-by-side `Scrolly` gave the art a 460px column and
   cropped the whole east off the plate, and a full-width block in the flow had the text
   above the picture instead of in it.

   THE CROP IS DETERMINISTIC, and it has to be, because the pin positions in map.ts are
   fractions of the SOURCE image. The plate is placed by `frameFor(aspect)` — the stage's
   own aspect, measured at run time — and the image, every pin and every arm are drawn
   through that one frame, so they cannot drift apart. */

import { useEffect, useRef, useState } from 'react'
import { CONQUESTS, ORIGIN, type MapPin } from '@/lib/chapter5/map'
import { clamp01, type ScrollyState } from '@/components/chapter6/scrolly'

const MAP = '/assets/chapter5/umar-map.jpg'

/* The source plate's own aspect. */
const SRC = 4 / 3

/* The stretch of the plate that has to stay on screen: every pin, Medina included,
   plus room for its whole marker — a pin is centred on dot AND label, so half a label
   either side (0.05 cut Egypt's dot and Qadisiyya's label at 390). Derived from the
   pins, so a moved pin moves the window with it. */
const XS = [ORIGIN, ...CONQUESTS].map((p) => p.x)
const PAD = 0.11
const SPAN = { from: Math.max(0, Math.min(...XS) - PAD), to: Math.min(1, Math.max(...XS) + PAD) }
const SPAN_W = SPAN.to - SPAN.from
/* the southernmost pin (Medina) — on a phone it is set just above the stage's foot */
const LOW = Math.max(...[ORIGIN, ...CONQUESTS].map((p) => p.y))
const FOOT = 0.08
const SPAN_MID = (SPAN.from + SPAN.to) / 2

/* Where the plate sits on the stage, in fractions of the stage's width (l, w) and
   height (tp, h).
     · wider than 4:3 — cover: full width, height cropped around the middle;
     · narrower, but a cover crop still holds the span — cover, with the window slid
       onto the pins rather than centred (a centred window cut Egypt off first);
     · narrower still (a phone: cover showed 37% of the width and Egypt fell off) —
       the span fills the width and the plate stops short of the stage's height. It is
       set low, Medina just above the stage's FOOT and the empty south cropped off: the
       cards read across the middle and rise out of the top, so the lower third is where
       the pins stay clear of the text while they light. */
function frameFor(aspect: number) {
  if (aspect >= SRC) {
    const h = aspect / SRC
    return { l: 0, w: 1, tp: (1 - h) / 2, h, narrow: false }
  }
  const cover = aspect / SRC
  if (cover >= SPAN_W) {
    const from = Math.min(Math.max(SPAN_MID - cover / 2, 0), 1 - cover)
    const w = 1 / cover
    return { l: -from * w, w, tp: 0, h: 1, narrow: false }
  }
  const w = 1 / SPAN_W
  const h = (w * aspect) / SRC
  const tp = Math.max(1 - FOOT - LOW * h, 1 - h)
  return { l: -SPAN.from * w, w, tp, h, narrow: true }
}

/* The conquests all live inside ONE step, because the source gives all four in one
   sentence and cutting it into four cards would have printed four things that are not
   sentences. They light across that step's own 0..1 progress, on the SAME thresholds
   chapter 6's `P` lights its marked phrases — (i+1)/(n+1) — so the place name in the
   card and the pin on the map arrive together. */
const STEP_CONQUEST = 1
const AT = CONQUESTS.map((_, i) => (i + 1) / (CONQUESTS.length + 1))

/* `left`, NOT `inset-inline-start`, and the plate is mounted dir="ltr". The article is
   RTL, so the logical property resolved to the RIGHT edge and mirrored the whole map:
   Qadisiyya, which is on the Euphrates, landed on the Nile. Geography is not reading
   direction — the same rule chapter 6 states at the top of its own map plates. Only the
   label runs RTL, because that is text. */
/* THE LINE IS THE POINT. Four labels lighting up on an old map is a decorated map; it
   does not say „an empire expanded", which is what the paragraph beside it says. Each
   conquest is drawn as a reach OUT OF MEDINA — one origin, four arms, in the order the
   source names them — and then the map is making the sentence's argument instead of
   illustrating its nouns.

   The geometry is done in fractions of the plate's WIDTH, so a vertical fraction has to
   be divided by the aspect ratio before it can be combined with a horizontal one. Get
   that wrong and every arm points somewhere plausible and nowhere true. */
/* ROUND THE NUMBERS OURSELVES. `y()` returns 0.6933333…, and React's server output
   carried every digit of it while the browser's CSSOM handed the same declaration back
   rounded — a hydration mismatch on a value that was never actually different. Four
   decimals is a hundredth of a pixel on a 1000px plate and is emitted identically on
   both sides. */
const pct = (v: number) => `${(v * 100).toFixed(4)}%`

interface Frame { x: (v: number) => number; y: (v: number) => number; aspect: number }

function Arm({ pin, on, f }: { pin: MapPin; on: boolean; f: Frame }) {
  const dx = f.x(pin.x) - f.x(ORIGIN.x)
  const dy = (f.y(pin.y) - f.y(ORIGIN.y)) / f.aspect
  const len = Math.hypot(dx, dy)
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI
  return (
    <span
      className={'ch5-route' + (on ? ' is-on' : '')}
      style={{
        left: pct(f.x(ORIGIN.x)),
        top: pct(f.y(ORIGIN.y)),
        width: pct(len),
        rotate: `${deg.toFixed(4)}deg`,
      }}
    />
  )
}

function Pin({ pin, on, origin = false, f }: { pin: MapPin; on: boolean; origin?: boolean; f: Frame }) {
  /* A pin in the eastern half sits under the reading column, so its label opens WEST,
     into the country. Computed from the pin's own position rather than written into a
     selector: `nth-of-type` counted the arms and the veil as well as the pins and
     flipped the wrong one. */
  const flip = f.x(pin.x) > 0.52
  return (
    <span
      className={'ch5-pin' + (origin ? ' is-origin' : '') + (on ? ' is-on' : '') + (flip ? ' is-flipped' : '')}
      style={{ left: pct(f.x(pin.x)), top: pct(f.y(pin.y)) }}
    >
      <i className="ch5-pin-dot" />
      <b className="ch5-pin-label" dir="rtl">
        {pin.label}
        {pin.note && <span className="ch5-pin-note">{pin.note}</span>}
      </b>
    </span>
  )
}

export default function ConquestMap({ step, t }: ScrollyState) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [aspect, setAspect] = useState(16 / 9)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      if (height > 0) setAspect(width / height)
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const fr = frameFor(aspect)
  const f: Frame = { x: (v) => fr.l + v * fr.w, y: (v) => fr.tp + v * fr.h, aspect }
  /* before the conquest step nothing has been taken; after it, nothing goes back */
  const on = (i: number) =>
    step > STEP_CONQUEST || (step === STEP_CONQUEST && clamp01(t) >= AT[i])

  return (
    <div className={'ch5-map' + (fr.narrow ? ' is-narrow' : '')} ref={ref} dir="ltr">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MAP}
        alt="מפת האזור שבו נעשו הכיבושים — מהנילוס במערב עד הפרת במזרח"
        style={{ left: pct(fr.l), top: pct(fr.tp), width: pct(fr.w), height: pct(fr.h) }}
      />
      <span className="ch5-map-veil" aria-hidden="true" />
      {CONQUESTS.map((c, i) => (
        <Arm key={'arm-' + c.id} pin={c} on={on(i)} f={f} />
      ))}
      <Pin pin={ORIGIN} on origin f={f} />
      {CONQUESTS.map((c, i) => (
        <Pin key={c.id} pin={c} on={on(i)} f={f} />
      ))}
    </div>
  )
}
