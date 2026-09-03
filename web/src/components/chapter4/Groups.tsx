'use client'

/* WHO MET WHOM IN MEDINA.

   §3 is a single sentence that ends in a colon and then lists four groups of
   people. As running text the list is four clauses the reader skims; here each
   group is a face standing ON the town it is named in relation to, which is
   what the sentence is actually about.

   THE FACES SIT OVER THE PICTURE, at the four corners, each with a dotted line
   running in toward the middle of the oasis. The name is always legible; the
   group's sentence is not printed until the reader asks for it. That is the one
   thing this figure does that a paragraph cannot: it makes the four groups a
   place before it makes them a text.

   THE FOURTH GROUP IS NOT IN MEDINA, AND THE PICTURE SAYS SO. „ובמכה התגוררו
   הכופרים משבט קריש" — they are the one group the source puts somewhere else,
   so their face stands outside the frame at the bottom, in gold rather than
   maroon, on the longest line of the four. The distance is the point: it is
   what section 02 and section 03 are about.

   EVERY WORD HERE IS THE SOURCE'S. The name is the source's own name for the
   group (`name` in passages.json — המהגרים, התומכים) and the sentence that
   opens is that group's own fragment. The two groups the source does not name
   carry no label until they are opened, and then the sentence is the label.

   THE ANIMATION IS THE SENTENCE. On entering view the town settles first, then
   each line draws itself from its face in toward the oasis and the face arrives
   with it — the three around the town, and Mecca's last and slowest, from
   outside. It runs once. Under prefers-reduced-motion nothing moves.

   THE LINES ARE MEASURED, NOT GUESSED — their endpoints are read off the
   laid-out DOM through a ResizeObserver, so they stay attached at any width.
   Below 900px the picture goes first and the four become a plain column: four
   labelled circles over a landscape need width, and connectors across stacked
   cards are noise. Groups.tsx stops measuring them at that breakpoint, so the
   SVG is empty rather than hidden. */

import { useCallback, useEffect, useId, useRef, useState } from 'react'

export interface Group {
  id: string
  /** The source's own name for the group, where it gives one. Where it does
      not, the sentence itself is the label once the group is opened. */
  name?: string
  /** the group's own sentence, verbatim */
  text: string
  /** the painted vignette, without extension */
  img: string
  /** position over the picture, in per cent from its left and top edges */
  x: number
  y: number
  /** which way the label reads out from the circle */
  side: 'start' | 'end'
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
  const town = useRef<HTMLImageElement | null>(null)
  const dots = useRef<Record<string, HTMLElement | null>>({})
  const [lines, setLines] = useState<Line[]>([])
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [at, setAt] = useState<string | null>(null)
  const [shown, setShown] = useState(false)
  const [still, setStill] = useState(false)
  const [wide, setWide] = useState(true)

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const room = window.matchMedia('(min-width: 900px)')
    const sync = () => {
      setStill(motion.matches)
      setWide(room.matches)
    }
    sync()
    motion.addEventListener('change', sync)
    room.addEventListener('change', sync)
    return () => {
      motion.removeEventListener('change', sync)
      room.removeEventListener('change', sync)
    }
  }, [])

  /* the connector geometry, read off the real layout */
  const measure = useCallback(() => {
    const root = stage.current
    const pic = town.current
    if (!root || !pic) return
    const r = root.getBoundingClientRect()
    setBox({ w: r.width, h: r.height })
    if (r.width < 900) {
      setLines([])
      return
    }
    const t = pic.getBoundingClientRect()
    const cx = t.left - r.left + t.width / 2
    const cy = t.top - r.top + t.height / 2
    const next: Line[] = []
    for (const g of groups) {
      const el = dots.current[g.id]
      if (!el) continue
      const d = el.getBoundingClientRect()
      const x1 = d.left - r.left + d.width / 2
      const y1 = d.top - r.top + d.height / 2
      const dx = cx - x1
      const dy = cy - y1
      const dist = Math.hypot(dx, dy) || 1
      const from = d.width / 2 + 8
      /* stop well short of the middle: a line that reaches the centre of the
         oasis crosses the town instead of pointing at it */
      const to = Math.max(from + 4, dist - t.width * 0.14)
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
      { threshold: 0.2 },
    )
    io.observe(root)
    return () => io.disconnect()
  }, [])

  /* Escape closes the open group and hands focus back to the face that opened it */
  useEffect(() => {
    if (!at) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      const el = dots.current[at]
      setAt(null)
      el?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [at])

  const on = shown || still

  return (
    <figure className={`ch4-who${on ? ' is-on' : ''}${still ? ' is-still' : ''}`}>
      <figcaption className="ch4-who-head">
        <h3>{question}</h3>
        <p>{hint}</p>
      </figcaption>

      <div className="ch4-who-stage" ref={stage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ch4-who-town" ref={town} src={`/assets/chapter4/${city}.jpg`} alt={cityAlt} />

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
                ['--step' as string]: `${0.8 + i * 0.3}s`,
              }}
            />
          ))}
        </svg>

        {groups.map((g, i) => (
          <article
            key={g.id}
            className={`ch4-who-card is-${g.side}${at === g.id ? ' is-on' : ''}${g.away ? ' is-away' : ''}`}
            style={{
              ['--x' as string]: `${g.x}%`,
              ['--y' as string]: `${g.y}%`,
              ['--step' as string]: `${0.6 + i * 0.3}s`,
            }}
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
            <div className="ch4-who-copy">
              {g.name && <h4 className="ch4-who-name">{g.name}</h4>}
              {/* A DISCLOSURE, and hidden the way one should be: the paragraph
                  stays in the document (chapter search still matches its words)
                  and the button beside it carries aria-expanded/aria-controls,
                  so a screen reader is told there is something to open and can
                  open it. BELOW THE BREAKPOINT NOTHING IS HIDDEN — the figure is
                  a plain column there and every sentence is simply printed. */}
              <p className="ch4-who-text" id={`${uid}-${g.id}`} hidden={wide && at !== g.id}>
                {g.text}
              </p>
            </div>
          </article>
        ))}
      </div>
    </figure>
  )
}
