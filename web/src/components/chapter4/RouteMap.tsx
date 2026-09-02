'use client'

/* THE JOURNEY AS AN ILLUSTRATED ROUTE MAP — chapter 6's device, carrying
   chapter 4's places.

   Chapter 6 puts the hajj stations on a painted pilgrimage map as numbered
   pins; a pin opens a bubble beside it. This is that, for the road out of Mecca
   and the places the chapter reaches from it. The artwork is painted in the
   same hand — parchment, gold rule, the Red Sea down one side, the Hijaz ridge
   — and made for this chapter.

   THE PINS CARRY NAMES AND YEARS, NOT PARAGRAPHS. Chapter 6's bubbles hold
   their stations' text; here they do not, and the reason is this chapter's own
   rule: every sentence is consumed exactly once, in the section it belongs to,
   and verify-chapter4.mjs fails if one is printed twice. A pin that repeated a
   sentence from section 05 inside section 01 would break that. So the map
   orients and the sections tell.

   A pin is a real button: it takes focus, Escape closes the bubble, and focus
   returns to the pin that opened it. */

import { useEffect, useRef, useState } from 'react'

export interface Stop {
  id: string
  name: string
  year?: string
  /** 0..100 across the painted map, from its LEFT edge — the artwork's own axis */
  x: number
  y: number
}

export default function RouteMap({ stops, label }: { stops: Stop[]; label: string }) {
  const [at, setAt] = useState<number | null>(null)
  const pins = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    if (at === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        const i = at
        setAt(null)
        pins.current[i]?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [at])

  const line = stops.map((s) => `${s.x},${s.y}`).join(' ')

  return (
    <figure className="ch4-map" data-reveal>
      <div className="ch4-map-plane" role="group" aria-label={label}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/chapter4/route-map.jpg" alt="" aria-hidden="true" />
        <svg className="ch4-map-road" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={line} />
        </svg>
        {stops.map((s, i) => (
          <button
            key={s.id}
            type="button"
            ref={(el) => {
              pins.current[i] = el
            }}
            className={`ch4-map-pin${at === i ? ' is-on' : ''}`}
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
            aria-expanded={at === i}
            onClick={() => setAt((v) => (v === i ? null : i))}
          >
            <span className="ch4-map-dot" aria-hidden="true">
              {i + 1}
            </span>
            <span className="ch4-map-name">
              {s.name}
              {s.year && <i>{s.year}</i>}
            </span>
          </button>
        ))}
      </div>
      <figcaption>{label} · מפה מצוירת</figcaption>
    </figure>
  )
}
