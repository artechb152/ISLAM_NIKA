'use client'

/* WHO MET WHOM IN MEDINA.

   §3 is a single sentence that ends in a colon and then lists four groups of
   people. As running text the list is four clauses the reader skims; here each
   group is a face standing on the town it is named in relation to.

   NO TEXT AROUND THE PICTURE. It was tried and it does not read: four labels at
   four corners give the eye no order to follow, and a Hebrew group name is
   longer than the column a corner leaves for it. So the picture carries only
   the four faces and their lines, and every word sits in ONE panel underneath —
   full measure, page ground, the chapter's own reading size. Press a face and
   the panel is about that group.

   THE FOURTH GROUP IS NOT IN MEDINA, AND THE PICTURE SAYS SO. „ובמכה התגוררו
   הכופרים משבט קריש" — the one group the source puts somewhere else, so its face
   stands outside the frame, in gold rather than maroon, on the longest line of
   the four. The distance is the point: it is what sections 02 and 03 are about.

   EVERY WORD IS THE SOURCE'S. The heading is the source's own name for the group
   where it gives one, and otherwise a phrase lifted out of that group's own
   sentence; the paragraph is the sentence itself.

   IT IS A TABLIST, and behaves like one: arrow keys move between the faces,
   Home and End jump to the ends, and only the selected face is in the tab order,
   so a keyboard reader tabs past the whole figure in one step.

   THE ANIMATION IS THE SENTENCE. On entering view the town settles first, then
   each line draws itself from its face in toward the oasis and the face arrives
   with it — Mecca last and slowest, from outside. Once. Under
   prefers-reduced-motion nothing moves.

   THE LINES ARE MEASURED, NOT GUESSED — endpoints read off the laid-out DOM
   through a ResizeObserver, so they stay attached at any width. Below 900px the
   faces leave the picture and become a row beneath it, and no lines are drawn. */

import { useCallback, useEffect, useId, useRef, useState } from 'react'

export interface Group {
  id: string
  /** the source's words: its own name for the group, or a phrase from its sentence */
  name: string
  /** the group's own sentence, verbatim */
  text: string
  /** the painted vignette, without extension */
  img: string
  /** position over the picture, in per cent from its left and top edges */
  x: number
  y: number
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
  const dots = useRef<Array<HTMLButtonElement | null>>([])
  const [lines, setLines] = useState<Line[]>([])
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [at, setAt] = useState(0)
  const [shown, setShown] = useState(false)
  const [still, setStill] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setStill(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const measure = useCallback(() => {
    const root = stage.current
    const pic = town.current
    if (!root || !pic) return
    const r = root.getBoundingClientRect()
    setBox({ w: r.width, h: r.height })
    /* THE BREAKPOINT IS THE WINDOW'S, NOT THE STAGE'S. The figure has its own
       measure — narrower than 900px even on a wide screen — so testing the
       stage's width switched the layout off everywhere. It has to be the same
       query the stylesheet uses, or the lines and the arrangement disagree. */
    if (!window.matchMedia('(min-width: 900px)').matches) {
      setLines([])
      return
    }
    const t = pic.getBoundingClientRect()
    const cx = t.left - r.left + t.width / 2
    const cy = t.top - r.top + t.height / 2
    const next: Line[] = []
    groups.forEach((g, i) => {
      const el = dots.current[i]
      if (!el) return
      const d = el.getBoundingClientRect()
      const x1 = d.left - r.left + d.width / 2
      const y1 = d.top - r.top + d.height / 2
      const dx = cx - x1
      const dy = cy - y1
      const dist = Math.hypot(dx, dy) || 1
      const from = d.width / 2 + 8
      /* stop well short of the middle: a line that reaches the centre of the
         oasis crosses the town instead of pointing at it */
      const to = Math.max(from + 4, dist - t.width * 0.16)
      next.push({
        id: g.id,
        x1: x1 + (dx / dist) * from,
        y1: y1 + (dy / dist) * from,
        x2: x1 + (dx / dist) * to,
        y2: y1 + (dy / dist) * to,
        len: Math.max(0, to - from),
      })
    })
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

  /* tablist keys. RTL: ArrowLeft advances, ArrowRight goes back. */
  const onKey = (e: React.KeyboardEvent) => {
    const last = groups.length - 1
    let to = -1
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') to = at === last ? 0 : at + 1
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') to = at === 0 ? last : at - 1
    else if (e.key === 'Home') to = 0
    else if (e.key === 'End') to = last
    if (to < 0) return
    e.preventDefault()
    setAt(to)
    dots.current[to]?.focus()
  }

  const on = shown || still
  const open = groups[at]

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
              className={`ch4-who-line${groups[at]?.id === l.id ? ' is-on' : ''}`}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              style={{ ['--len' as string]: `${Math.round(l.len)}`, ['--step' as string]: `${0.8 + i * 0.3}s` }}
            />
          ))}
        </svg>

        <div className="ch4-who-ring" role="tablist" aria-label={question} onKeyDown={onKey}>
          {groups.map((g, i) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              id={`${uid}-tab-${g.id}`}
              aria-selected={at === i}
              aria-controls={`${uid}-panel`}
              tabIndex={at === i ? 0 : -1}
              ref={(el) => {
                dots.current[i] = el
              }}
              className={`ch4-who-dot${at === i ? ' is-on' : ''}${g.away ? ' is-away' : ''}`}
              style={{ ['--x' as string]: `${g.x}%`, ['--y' as string]: `${g.y}%`, ['--step' as string]: `${0.6 + i * 0.3}s` }}
              onClick={() => setAt(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/assets/chapter4/${g.img}.jpg`} alt="" aria-hidden="true" loading="lazy" />
              <span className="ch4-who-sr">{g.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* one panel, full measure, on the page's own ground — this is where all
          the reading happens */}
      <div
        className={`ch4-who-panel${open?.away ? ' is-away' : ''}`}
        id={`${uid}-panel`}
        role="tabpanel"
        aria-labelledby={`${uid}-tab-${open?.id}`}
        key={open?.id}
      >
        <h4>{open?.name}</h4>
        <p>{open?.text}</p>
      </div>
    </figure>
  )
}
