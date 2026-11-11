'use client'

/* פרק 15 · the stage — chapter 5's parchment plate, full screen, under the table's rows.

   THREE THINGS ON IT, and each is one column of the source table:
     · the ruler (שנה) — every one of the 23 rows on one bar drawn TO SCALE from 570 to
       874, so the crowd of 619–632 and the empty stretch after 661 are visible; the row
       being read is marked, the rows behind it are filled;
     · the place (אירוע) — a pin only when the event NAMES a place, its label cut from the
       event's own words (layout.json `places`, rule 27);
     · the region (גאוגרפיה ומקום השפעה) — the merged cell the row sits in, washed onto the
       plate with the cell's own words as its label. A state shows ITS cell and nothing
       else: no accumulation from row to row. The map stands the source's column up and
       is silent (rule 59) — it does not draw an empire growing.

   THE CROP is chapter 5's: deterministic, from the stage's own aspect, so the plate, the
   SVG wash and every pin are placed by the same numbers (ConquestMap.tsx explains why).
   Mounted dir="ltr" and placed with `left` — geography is not reading direction (rule 61). */

import { useEffect, useRef, useState } from 'react'
import type { ScrollyState } from '@/components/chapter6/scrolly'
import { LAYOUT, REGIONS, ROW_ORDER, regionOf, years } from '@/lib/chapter15/content'
import { toPlate } from '@/lib/chapter15/map'

const MAP = '/assets/chapter5/umar-map.jpg'
const SRC = 4 / 3
/* the SVG wash shares the plate's box; its user units are the plate's own fractions ×1000 */
const VW = 1000
const VH = 750

/* THE CAMERA. Each row brings the plate in on what the row is about: the place it names,
   or — when it names none — the region its cell washes. The box is derived from the data
   (a pin ± PIN_R degrees, or the lit shapes' bounds), never written per row. */
type Box = [number, number, number, number] // plate fractions: x0 y0 x1 y1
const PIN_R: [number, number] = [3.4, 2.6] // degrees of lon / lat around a pin
function boxOf(ref: string): Box {
  const p = LAYOUT.places[ref]
  const ll: [number, number][] = p
    ? [[p.lon - PIN_R[0], p.lat - PIN_R[1]], [p.lon + PIN_R[0], p.lat + PIN_R[1]]]
    : LAYOUT.regions[regionOf(ref).id].shapes.flatMap((s) => LAYOUT.shapes[s])
  const xy = ll.map(([lon, lat]) => toPlate(lon, lat))
  const xs = xy.map(([x]) => x)
  const ys = xy.map(([, y]) => y)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

/* The part of the stage the card does not cover, in stage fractions: on a wide stage the
   cards ride the west (left) edge and the ruler stands on the east; on a phone the card
   crosses the middle, so the plate is read above it. */
function freeOf(aspect: number): Box {
  return aspect < 0.85 ? [0.04, 0.03, 0.96, 0.38] : [0.4, 0.08, 0.88, 0.92]
}
const ZOOM_MAX = 2.4 // × the covering width; the plate is 2400px wide, more than this blurs

/* Fit the box into the free part of the stage. The plate keeps covering the stage when it
   can (no parchment gap at an edge); when the stage is too tall for that (a phone showing
   a whole region) it hangs at the top and dissolves downward — `narrow`. */
function frameFor(aspect: number, [bx0, by0, bx1, by1]: Box) {
  const [fx0, fy0, fx1, fy1] = freeOf(aspect)
  const cover = Math.max(1, SRC / aspect) // the width (in stage widths) that covers the stage
  const fit = Math.min((fx1 - fx0) / (bx1 - bx0), ((fy1 - fy0) * SRC) / (aspect * (by1 - by0)))
  const w = Math.min(Math.max(fit, aspect < 0.85 ? 1 : cover), cover * ZOOM_MAX)
  const h = (w * aspect) / SRC
  const clamp = (v: number, size: number) => (size >= 1 ? Math.min(Math.max(v, 1 - size), 0) : v)
  const l = clamp((fx0 + fx1) / 2 - ((bx0 + bx1) / 2) * w, w)
  const tp = h >= 1 ? clamp((fy0 + fy1) / 2 - ((by0 + by1) / 2) * h, h) : Math.min(fy0 - by0 * h, 0.02)
  return { l, w, tp, h, narrow: h < 1 }
}

/* rule 64 — round floats ourselves, or the server and the browser disagree */
const pct = (v: number) => `${(v * 100).toFixed(4)}%`
const pts = (shape: [number, number][]) =>
  shape.map(([lon, lat]) => toPlate(lon, lat)).map(([x, y]) => `${(x * VW).toFixed(1)},${(y * VH).toFixed(1)}`).join(' ')

/* THE RULER. Rows that share a year (656 ×2) stand side by side, not on top of each
   other; „656-874" — the table's one span — is a bar with its two ends numbered (rule 60). */
const { from: Y0, to: Y1 } = LAYOUT.axis
const at = (y: number) => (y - Y0) / (Y1 - Y0)
const TICKS = ROW_ORDER.map((ref, i) => {
  const ys = years(ref)
  const lane = ROW_ORDER.slice(0, i).filter((r) => years(r).length === 1 && years(r)[0] === ys[0]).length
  return { ref, i, top: at(ys[0]), end: ys.length > 1 ? at(ys[1]) : null, lane, span: ys }
})

export default function TimelineMap({ rows, step }: ScrollyState & { rows: string[] }) {
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

  const active = rows[Math.min(Math.max(step, 0), rows.length - 1)]
  const fr = frameFor(aspect, boxOf(active))
  const box = { left: pct(fr.l), top: pct(fr.tp), width: pct(fr.w), height: pct(fr.h) }
  const x = (v: number) => fr.l + v * fr.w
  const y = (v: number) => fr.tp + v * fr.h
  /* a region label whose point the camera has left is pulled back into view — the cell's
     words stay on screen even when the plate is in close on one of its places */
  const [fx0, fy0, fx1, fy1] = freeOf(aspect)
  const keep = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)

  const activeAt = ROW_ORDER.indexOf(active)
  const cell = regionOf(active)
  const lit = new Set(LAYOUT.regions[cell.id].shapes)
  /* the region labels this stage owns — each cell lives in exactly one section, so each
     label is printed on exactly one stage (verify-chapter15.mjs checks the cells) */
  const own = REGIONS.filter((g) => g.rows.some((r) => rows.includes(r)))

  return (
    <div className={'ch15-map' + (fr.narrow ? ' is-narrow' : '')} ref={ref} dir="ltr">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MAP} alt="" style={box} />
      <svg className="ch15-wash" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" style={box} aria-hidden="true">
        {Object.entries(LAYOUT.shapes).map(([id, shape]) => (
          <polygon key={id} points={pts(shape)} className={lit.has(id) ? 'is-on' : undefined} />
        ))}
      </svg>
      <span className="ch15-veil" aria-hidden="true" />

      {own.map((g) => {
        const [lx, ly] = toPlate(...LAYOUT.regions[g.id].label)
        const sx = keep(x(lx), fx0 + 0.1, fx1 - 0.1)
        const sy = keep(y(ly), fy0 + 0.05, fy1 - 0.05)
        return (
          <b key={g.id} className={'ch15-region' + (g.id === cell.id ? ' is-on' : '')} dir="rtl" style={{ left: pct(sx), top: pct(sy) }}>
            {g.text}
          </b>
        )
      })}

      {Object.entries(LAYOUT.places).filter(([r]) => rows.includes(r)).map(([r, p]) => {
        const [px, py] = toPlate(p.lon, p.lat)
        /* the label opens west, unless the pin is so near the stage's west edge that a west
           label would leave the screen (Damascus on a phone) — decided from the pin's place
           on THIS stage, not written per pin */
        const east = x(px) < 0.24
        return (
          <span key={r} className={'ch15-pin' + (r === active ? ' is-on' : '') + (east ? ' is-east' : '')} style={{ left: pct(x(px)), top: pct(y(py)) }}>
            <i className="ch15-pin-dot" />
            <b className="ch15-pin-label" dir="rtl">{p.cut}</b>
          </span>
        )
      })}

      <div className="ch15-ruler" aria-hidden="true">
        <span className="ch15-ruler-end is-from">{Y0}</span>
        <span className="ch15-ruler-end is-to">{Y1}</span>
        <div className="ch15-ruler-track">
        {TICKS.map((t) => (
          <span
            key={t.ref}
            className={'ch15-tick' + (t.end !== null ? ' is-span' : '') + (t.i < activeAt ? ' is-past' : '') + (t.i === activeAt ? ' is-now' : '')}
            /* positions as variables, not top/height: the ruler stands on the desktop and
               lies down on a phone, and the stylesheet decides which axis --at runs on */
            style={{
              ['--at' as string]: pct(t.top),
              ...(t.end !== null ? { ['--len' as string]: pct(t.end - t.top) } : {}),
              ['--lane' as string]: t.end !== null ? -1 : t.lane,
            }}
          />
        ))}
        </div>
      </div>
    </div>
  )
}
