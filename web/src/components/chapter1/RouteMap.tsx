'use client'

/* פרק 1 · דרך הבשמים — the section's journey, on the game's own painted map.

   Chapter 5's full-screen stage (ConquestMap), part for part: the plate fills the
   viewport behind the reading, the source's sentences ride over it in parchment cards,
   and the scroll drives the scene. What is new here is the caravan: a medallion cut from
   the opening painting, walking the dotted road from the south northward as the reader
   reads §7 — the road the tribes kept.

   THE ROAD IS MEASURED, NOT DRAWN BY EYE (rule 65). The plate's own dots were found by
   colour (b<30, r−g>38), chained from the southern village upward, and checked by
   overlaying the result on the plate. The points in layout.json are fractions of the
   1280×724 SOURCE image, and the image, the trail and every marker are placed through
   one frame — so they cannot drift apart.

   NOTHING ON THE MAP IS INFERRED (rule 25). The plate carries no lettering; the only
   words on it are cut from §7 and §8. The two empires stand at the top edge, north-west
   and north-east, because §3 and §4 put them there — off the map, beyond the road. No
   place on the road is named that the source does not name. */

import { useEffect, useRef, useState } from 'react'
import { clamp01, seg, type ScrollyState } from '@/components/chapter6/scrolly'
import { LAYOUT } from '@/lib/chapter1/article/content'

const A = '/assets/chapter1/article/'
const R = LAYOUT.route
const SRC = R.width / R.height

/* the steps of the Scrolly this map belongs to: §6, §7, §8 */
const STEP_ROAD = 1
const STEP_EMPIRES = 2
/* how far up the road the caravan is when §7's card is done (the rest is walked under §8) */
const ROAD_AT_7 = 0.66

/* --- the road as one polyline, in SOURCE pixels so its lengths are true --- */
const PTS = R.points.map(([x, y]) => [x * R.width, y * R.height] as const)
const LENS = PTS.slice(1).map((p, i) => Math.hypot(p[0] - PTS[i][0], p[1] - PTS[i][1]))
const TOTAL = LENS.reduce((a, b) => a + b, 0)
function along(p: number): { x: number; y: number } {
  let d = clamp01(p) * TOTAL
  for (let i = 0; i < LENS.length; i++) {
    if (d <= LENS[i]) {
      const k = LENS[i] ? d / LENS[i] : 0
      return {
        x: (PTS[i][0] + (PTS[i + 1][0] - PTS[i][0]) * k) / R.width,
        y: (PTS[i][1] + (PTS[i + 1][1] - PTS[i][1]) * k) / R.height,
      }
    }
    d -= LENS[i]
  }
  const last = PTS[PTS.length - 1]
  return { x: last[0] / R.width, y: last[1] / R.height }
}

/* --- the frame: chapter 5's frameFor, with this road's span --- */
const XS = [...R.points.map((p) => p[0]), ...R.empires.map((e) => e.x)]
const PAD = 0.06
const SPAN = { from: Math.max(0, Math.min(...XS) - PAD), to: Math.min(1, Math.max(...XS) + PAD) }
const SPAN_W = SPAN.to - SPAN.from
const SPAN_MID = (SPAN.from + SPAN.to) / 2
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
  /* a phone: the road fills the width, and the plate is set so the whole road shows */
  const w = 1 / SPAN_W
  const h = (w * aspect) / SRC
  return { l: -SPAN.from * w, w, tp: Math.max(1 - h, (1 - h) / 2), h, narrow: true }
}

/* rounded ourselves — the hydration rule (rule 64) */
const pct = (v: number) => `${(v * 100).toFixed(4)}%`

/** How far up the road the caravan is, as a pure function of the scroll. */
function progress(step: number, t: number): number {
  if (step < STEP_ROAD) return 0
  if (step === STEP_ROAD) return seg(t, 0.08, 0.92) * ROAD_AT_7
  if (step === STEP_EMPIRES) return ROAD_AT_7 + seg(t, 0, 0.8) * (1 - ROAD_AT_7)
  return 1
}

export default function RouteMap({ step, t }: ScrollyState) {
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
  const fx = (v: number) => fr.l + v * fr.w
  const fy = (v: number) => fr.tp + v * fr.h
  const p = progress(step, t)
  const at = along(p)
  const moving = step === STEP_ROAD || (step === STEP_EMPIRES && p < 1)
  const goods = step >= STEP_ROAD
  const empires = step >= STEP_EMPIRES
  const start = R.points[0]

  return (
    <div className={'ch1-map' + (fr.narrow ? ' is-narrow' : '')} ref={ref} dir="ltr">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${A}route-map.jpg`}
        alt="מפה מצוירת של חצי האי ערב: ים סוף במערב, ודרך מנוקדת שעולה מכפר בדרום צפונה דרך מבצר ונווה מדבר"
        style={{ left: pct(fr.l), top: pct(fr.tp), width: pct(fr.w), height: pct(fr.h) }}
      />
      <span className="ch1-map-veil" aria-hidden="true" />

      {/* the trail the caravan has walked so far, over the painted dots */}
      <svg
        className="ch1-map-trail"
        viewBox={`0 0 ${R.width} ${R.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ left: pct(fr.l), top: pct(fr.tp), width: pct(fr.w), height: pct(fr.h) }}
      >
        <polyline
          points={PTS.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={(1 - p).toFixed(4)}
        />
      </svg>

      {/* where the road starts — the source's own word for it */}
      <span className="ch1-map-place" style={{ left: pct(fx(start[0])), top: pct(fy(start[1])) }} aria-hidden="true">
        <i />
        <b dir="rtl">{R.start.label}</b>
      </span>

      {/* the caravan, and what it carries */}
      <span
        className={'ch1-caravan' + (moving ? ' is-moving' : '')}
        style={{ left: pct(fx(at.x)), top: pct(fy(at.y)) }}
        aria-hidden="true"
      >
        <span className="ch1-caravan-coin" style={{ backgroundImage: `url(${A}hero-poster.jpg)` }} />
        <span className={'ch1-caravan-goods' + (goods ? ' is-on' : '')} dir="rtl">
          {R.goods.map((g) => <b key={g.label}>{g.label}</b>)}
        </span>
      </span>

      {/* the two empires, off the map to the north — and the tribe that served each */}
      {R.empires.map((e) => (
        <span
          key={e.side}
          className={'ch1-empire is-' + e.side + (empires ? ' is-on' : '')}
          /* the empires are OFF the map, to the north: they stand at the top of the STAGE,
             not at a point of the plate — a plate-relative top fell under the header when
             the frame cropped the plate's top (measured: only the tribe line showed) */
          style={fr.narrow ? undefined : { left: pct(fx(e.x)), top: pct(e.y) }}
          aria-hidden="true"
        >
          <span className="ch1-empire-arrow" />
          <span className="ch1-empire-text" dir="rtl">
            <b>{e.label}</b>
            <span>{e.tribe}</span>
          </span>
        </span>
      ))}
    </div>
  )
}
