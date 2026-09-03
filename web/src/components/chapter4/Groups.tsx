'use client'

/* WHO MET WHOM IN MEDINA.

   §3 is a single sentence that ends in a colon and then lists four groups of
   people. As running text the list is four clauses the reader skims; here each
   group is a face, and the four sit around the town they are named in relation
   to — which is what the sentence is actually about.

   THE FOURTH GROUP IS NOT IN MEDINA, AND THE PICTURE SAYS SO. „ובמכה התגוררו
   הכופרים משבט קריש" — they are the one group the source places somewhere else.
   So three vignettes stand beside the town and the fourth stands apart, past a
   rule, with a longer line running off the edge of the frame. The distance is
   the point: it is what section 02 and section 03 are about.

   EVERY WORD HERE IS THE SOURCE'S. The sentence under each face is that group's
   own fragment. The name above it is either the source's own name for the group
   (`name` in passages.json — המהגרים, התומכים) or a phrase LIFTED from that
   group's own sentence and proved to be in it by `pick`, which throws otherwise.
   Nothing is captioned in words this file composed.

   THE ANIMATION IS THE SENTENCE. On entering view the town settles first, then
   each line draws itself from its group toward the town, and the face arrives
   with it — the three from around the oasis, and Mecca's last and slowest, from
   outside. It runs once. Under prefers-reduced-motion nothing moves: everything
   is simply already there.

   THE LINES ARE MEASURED, NOT GUESSED. Their endpoints are read off the laid-out
   DOM through a ResizeObserver, so they stay attached at any width instead of
   being pinned to percentages that only hold at one. Below the breakpoint the
   ring becomes a column and the lines are not drawn at all — a connector that
   crosses stacked cards is noise. */

import { useCallback, useEffect, useId, useRef, useState } from 'react'

export interface Group {
  id: string
  /** The source's own name for the group, where it gives one — המהגרים,
      התומכים. Left out for the two it does not name: their sentence is so short
      that a label lifted out of it would print the same words twice, so the
      SENTENCE is set in the name's type and there is no second line. */
  name?: string
  /** the group's own sentence, verbatim */
  text: string
  /** the painted vignette, without extension */
  img: string
  /** true for the one group the source places outside the town */
  away?: boolean
}

interface Line {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  len: number
}

export default function Groups({
  groups,
  city,
  cityAlt,
  question,
  hint,
}: {
  groups: Group[]
  /** the painted view of the town, without extension */
  city: string
  cityAlt: string
  question: string
  hint: string
}) {
  const uid = useId().replace(/:/g, '')
  const stage = useRef<HTMLDivElement | null>(null)
  const town = useRef<HTMLDivElement | null>(null)
  const dots = useRef<Record<string, HTMLElement | null>>({})
  const [lines, setLines] = useState<Line[]>([])
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [at, setAt] = useState<string | null>(null)
  const [shown, setShown] = useState(false)
  const [still, setStill] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setStill(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  /* the connector geometry, read off the real layout */
  const measure = useCallback(() => {
    const root = stage.current
    const target = town.current
    if (!root || !target) return
    const r = root.getBoundingClientRect()
    setBox({ w: r.width, h: r.height })
    /* the ring collapses to a column on narrow screens; no lines there */
    if (r.width < 900) {
      setLines([])
      return
    }
    const t = target.getBoundingClientRect()
    const cx = t.left - r.left + t.width / 2
    const cy = t.top - r.top + t.height / 2
    const next: Line[] = []
    for (const g of groups) {
      const el = dots.current[g.id]
      if (!el) continue
      const d = el.getBoundingClientRect()
      const x1 = d.left - r.left + d.width / 2
      const y1 = d.top - r.top + d.height / 2
      /* stop the line at the edge of the circle and short of the town */
      const dx = cx - x1
      const dy = cy - y1
      const dist = Math.hypot(dx, dy) || 1
      const from = d.width / 2 + 6
      const to = Math.min(dist - 12, dist - t.width * 0.18)
      next.push({
        id: g.id,
        x1: x1 + (dx / dist) * from,
        y1: y1 + (dy / dist) * from,
        x2: x1 + (dx / dist) * to,
        y2: y1 + (dy / dist) * to,
        len: Math.max(0, to - from),
      })
    }
    setLines(next)
  }, [groups])

  useEffect(() => {
    measure()
    const root = stage.current
    if (!root) return
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  /* run the arrival once, when the figure is actually looked at */
  useEffect(() => {
    const root = stage.current
    if (!root) return
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    io.observe(root)
    return () => io.disconnect()
  }, [])

  const on = shown || still
  const near = groups.filter((g) => !g.away)
  const away = groups.filter((g) => g.away)

  const card = (g: Group, i: number) => (
    <article
      key={g.id}
      className={`ch4-who-card${at === g.id ? ' is-on' : ''}${g.away ? ' is-away' : ''}`}
      style={{ ['--step' as string]: `${0.55 + i * 0.28}s` }}
    >
      <button
        type="button"
        className="ch4-who-dot"
        ref={(el) => {
          dots.current[g.id] = el
        }}
        aria-expanded={at === g.id}
        aria-controls={`${uid}-${g.id}`}
        onClick={() => setAt((v) => (v === g.id ? null : g.id))}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/chapter4/${g.img}.jpg`} alt="" aria-hidden="true" loading="lazy" />
      </button>
      {g.name ? (
        <>
          <h4 className="ch4-who-name">{g.name}</h4>
          <p className="ch4-who-text" id={`${uid}-${g.id}`}>
            {g.text}
          </p>
        </>
      ) : (
        <h4 className="ch4-who-name is-only" id={`${uid}-${g.id}`}>
          {g.text}
        </h4>
      )}
    </article>
  )

  return (
    <figure className={`ch4-who${on ? ' is-on' : ''}${still ? ' is-still' : ''}`}>
      <figcaption className="ch4-who-head">
        <h3>{question}</h3>
        <p>{hint}</p>
      </figcaption>

      <div className="ch4-who-stage" ref={stage}>
        <svg className="ch4-who-web" viewBox={`0 0 ${box.w || 1} ${box.h || 1}`} aria-hidden="true">
          {lines.map((l, i) => (
            <line
              key={l.id}
              className={`ch4-who-line${at === l.id ? ' is-on' : ''}`}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              style={{
                ['--len' as string]: `${Math.round(l.len)}`,
                ['--step' as string]: `${0.75 + i * 0.28}s`,
              }}
            />
          ))}
        </svg>

        <div className="ch4-who-side ch4-who-near">{near.slice(0, 2).map((g, i) => card(g, i))}</div>

        <div className="ch4-who-town" ref={town}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/assets/chapter4/${city}.jpg`} alt={cityAlt} />
        </div>

        <div className="ch4-who-side ch4-who-far">
          {near.slice(2).map((g, i) => card(g, i + 2))}
          {away.map((g, i) => card(g, i + near.length))}
        </div>
      </div>
    </figure>
  )
}
