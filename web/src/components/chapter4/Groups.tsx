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
  /** Where on the ring it stands, in degrees clockwise from twelve o'clock.
      A ONE-NUMBER POSITION ON PURPOSE: the four sit on one circle at one
      radius, so no face can end up nearer the town than another. Percentages
      could not do that — the picture is wider than it is tall, so equal
      percentages are unequal distances. */
  angle: number
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

/** where a face stands, in pixels from the top-left of the stage */
interface Spot {
  id: string
  left: number
  top: number
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
  const [spots, setSpots] = useState<Spot[]>([])
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
      setSpots([])
      return
    }
    const t = pic.getBoundingClientRect()
    const cx = t.left - r.left + t.width / 2
    const cy = t.top - r.top + t.height / 2

    /* ONE CIRCLE, ONE RADIUS. The ring is laid out in pixels rather than in per
       cent so that it is a real circle on a picture that is wider than it is
       tall: every face is the same distance from the middle of the oasis, and
       therefore every connector is the same length. The radius clears the
       painting's dense middle and still keeps the faces over it. */
    const size = Math.min(t.width, t.height)
    const R = size * 0.46
    const half = (dots.current[0]?.getBoundingClientRect().width ?? 110) / 2

    const nextSpots: Spot[] = []
    const nextLines: Line[] = []
    groups.forEach((g) => {
      const a = ((g.angle - 90) * Math.PI) / 180
      const px = cx + Math.cos(a) * R
      const py = cy + Math.sin(a) * R
      nextSpots.push({ id: g.id, left: px, top: py })
      /* the connector runs from the edge of the face in toward the middle and
         stops short of it — a line that reaches the centre crosses the town
         instead of pointing at it */
      const from = half + 8
      const to = Math.max(from + 4, R - size * 0.17)
      nextLines.push({
        id: g.id,
        x1: px - Math.cos(a) * from,
        y1: py - Math.sin(a) * from,
        x2: px - Math.cos(a) * to,
        y2: py - Math.sin(a) * to,
        len: Math.max(0, to - from),
      })
    })
    setSpots(nextSpots)
    setLines(nextLines)
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
              style={{
                ['--x' as string]: spots[i] ? `${spots[i].left}px` : '50%',
                ['--y' as string]: spots[i] ? `${spots[i].top}px` : '50%',
                ['--step' as string]: `${0.6 + i * 0.3}s`,
              }}
              onClick={() => setAt(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/assets/chapter4/${g.img}.jpg`} alt="" aria-hidden="true" loading="lazy" />
              <span className="ch4-who-sr">{g.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* what the open face says: not a card, just text on the reading edge in
          the same column as the paragraphs around the figure */}
      <div
        className={`ch4-who-said${open?.away ? ' is-away' : ''}`}
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
