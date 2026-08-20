'use client'

/* מפת המסע — a drawn parchment, not a menu. Gold means you have not been there
   yet, olive means the region is finished, white means you are standing in it.
   Forward is walked, never clicked: a region you have not reached is marked but
   inert. Travel back to a finished region will hang off these same pins once
   the regions beyond the night camp exist in the engine. */

import { useEffect, useMemo } from 'react'
import { regionProgress } from '@/lib/chapter1/dialogue'
import { MAP_ASPECT, MAP_PINS } from '@/lib/chapter1/journey'

export function WorldMap({
  seen,
  currentRegion,
  onClose,
}: {
  seen: string[]
  currentRegion: string
  onClose: () => void
}) {
  const progress = useMemo(() => {
    const byId = new Map(regionProgress(seen).map((r) => [r.id, r]))
    return MAP_PINS.map((pin) => ({ pin, state: byId.get(pin.id) }))
  }, [seen])

  /* The travelled road is drawn up to the last finished region; the rest of the
     way is a faint dashed track, so the map reads as a journey in progress. */
  const travelled = useMemo(() => {
    let last = -1
    progress.forEach(({ pin, state }, i) => {
      if (state?.complete || pin.id === currentRegion) last = i
    })
    return last
  }, [progress, currentRegion])

  const path = (from: number, to: number) =>
    MAP_PINS.slice(from, to + 1)
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.left} ${p.top}`)
      .join(' ')

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="ch1-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="מפת המסע"
      onPointerDown={(ev) => ev.stopPropagation()}
    >
      <div className="ch1-overlay-scrim" onClick={onClose} />
      <div className="map-plate" style={{ aspectRatio: MAP_ASPECT }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="map-image" src="/assets/chapter1/tex/worldmap.jpg" alt="" />

        <svg className="map-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <path className="map-route-rest" d={path(Math.max(travelled, 0), MAP_PINS.length - 1)} />
          {travelled > 0 && <path className="map-route-done" d={path(0, travelled)} />}
        </svg>

        <div className="map-pins">
          {progress.map(({ pin, state }) => {
            const here = pin.id === currentRegion
            const done = !!state?.complete
            const cls = 'map-pin' + (here ? ' is-here' : done ? ' is-done' : '')
            return (
              <div key={pin.id} className={cls} style={{ left: `${pin.left}%`, top: `${pin.top}%` }}>
                <span className="map-dot" />
                <span className={'map-label' + (pin.side === 'start' ? ' is-start' : '')}>
                  {pin.label}
                  {state && state.done > 0 && !done && (
                    <i className="map-count">
                      {state.done}/{state.total}
                    </i>
                  )}
                </span>
              </div>
            )
          })}
        </div>

        <div className="map-title">
          <h2>דרך הבשמים</h2>
          <p>מתימן למכה — לפי סדר הדרך</p>
        </div>

        <div className="map-legend">
          <span><i className="map-dot is-here-key" /> אתם כאן</span>
          <span><i className="map-dot is-done-key" /> הושלם</span>
          <span><i className="map-dot" /> עוד לא הגעתם</span>
          <button type="button" className="map-close" onClick={onClose}>
            <i className="hud-key">M</i> לסגירה
          </button>
        </div>
      </div>
    </div>
  )
}
