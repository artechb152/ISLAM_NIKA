'use client'

/* The hajj as an illustrated route map: the ritual stations sit as numbered pins on a painted
   pilgrimage map; clicking a pin opens an info bubble beside it with the station's scene and its
   verbatim text. The map artwork carries the route, the Kaaba, and the compass.

   A pin is a plain button that discloses a dialog (aria-haspopup/aria-expanded); opening moves
   focus into the bubble, Escape closes it, and focus returns to the pin that opened it. */

import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface HajjStop {
  label: string
  place?: string
  img: string
  title: string
  paras: ReactNode[]
  x: number // 0..100, left-origin — matches the painted map
  y: number
}

export function HajjRouteMap({ stops }: { stops: HajjStop[] }) {
  const [active, setActive] = useState<number | null>(null)
  const bubbleRef = useRef<HTMLDivElement | null>(null)
  const pinsRef = useRef<Array<HTMLButtonElement | null>>([])
  const s = active === null ? null : stops[active]
  const ox = s ? (s.x > 50 ? 'left' : 'right') : 'right'
  const oy = s ? (s.y > 50 ? 'up' : 'down') : 'down'
  const tx = ox === 'left' ? 'calc(-100% - 16px)' : '16px'
  const ty = oy === 'up' ? 'calc(-100% - 16px)' : '16px'

  function close(): void {
    const i = active
    setActive(null)
    if (i !== null) pinsRef.current[i]?.focus()
  }

  /* on open: move focus to the bubble's close button, close on Escape, return focus to the pin */
  useEffect(() => {
    if (active === null) return
    bubbleRef.current?.querySelector<HTMLButtonElement>('.hjm-close')?.focus()
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  return (
    <div className="hajj-map">
      <div className="hjm-plane" role="group" aria-label="מפת מסע החג'">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hjm-mapimg" src="/assets/chapter6/hajj-route-map.jpg" alt="מפת מסע העלייה לרגל" />
        {stops.map((st, i) => (
          <button
            key={i}
            type="button"
            ref={(el) => {
              pinsRef.current[i] = el
            }}
            aria-haspopup="dialog"
            aria-expanded={active === i}
            aria-label={`תחנה ${i + 1}: ${st.label}`}
            className={'hjm-pin' + (active === i ? ' is-active' : '')}
            style={{ left: `${st.x}%`, top: `${st.y}%` }}
            onClick={() => setActive(active === i ? null : i)}
          >
            <span className="hjm-dot">{i + 1}</span>
            <span className="hjm-plabel">{st.label}</span>
          </button>
        ))}
        {s && (
          <div
            ref={bubbleRef}
            className={`hjm-bubble o-${ox} o-${oy}`}
            style={{ left: `${s.x}%`, top: `${s.y}%`, transform: `translate(${tx}, ${ty})` }}
            role="dialog"
            aria-label={s.title}
          >
            <button type="button" className="hjm-close" onClick={close} aria-label="סגירה">
              ×
            </button>
            <div className="hjm-bfig">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/assets/chapter6/${s.img}`} alt="" loading="lazy" decoding="async" />
            </div>
            <h3 className="hjm-title">{s.title}</h3>
            <div className="hjm-bscroll">
              {s.paras.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="hjm-hint">לחצו על תחנה במפה כדי לפתוח אותה</p>
    </div>
  )
}
