'use client'

/* Full-screen photographic stages. Each area is a sequence of realistic, blurred
   images; the scroll position crossfades between them CONTINUOUSLY (p = step + t),
   so the scene glides — never frame-by-frame — and rewinds on reverse scroll.
   A white veil, strong on the right and fading left, keeps the text readable.
   The stage is decorative (aria-hidden); every fact lives in the text. */

import type { ReactNode } from 'react'
import { clamp01, seg, type ScrollyState } from './scrolly'
import { HAJJ_PLATE, HAJJ_POS } from '@/lib/chapter6/art'
import { CH6 } from '@/lib/chapter6/data'

interface Frame {
  src: string
  from: number
}

function PhotoStage({ p, frames, children }: { p: number; frames: Frame[]; children?: ReactNode }) {
  return (
    <div className="st st-photo">
      {frames.map((frame, i) => {
        const start = frame.from
        const next = frames[i + 1]?.from
        /* glide in around `start`, glide out as the next frame arrives */
        const alphaIn = i === 0 ? 1 : seg(p, start - 0.45, start + 0.05)
        const alphaOut = next === undefined ? 1 : 1 - seg(p, next - 0.45, next + 0.05)
        const alpha = clamp01(Math.min(alphaIn, alphaOut))
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={frame.src} alt="" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" style={{ opacity: alpha }} />
        )
      })}
      <span className="st-veil" />
      {children}
    </div>
  )
}

const A = '/assets/chapter6/'

/* ---- prayer, the DAY JOURNEY: the five daily prayers are read on ONE screen while the
   day itself passes. It is the same desert-and-mosque scene from dawn to night, and the
   sky crossfades CONTINUOUSLY with the scroll (dawn → noon → afternoon → sunset → night),
   so the reader never leaves the scene — they simply live a day between the prayers.
   Six steps drive it: the opening line (0), then one per prayer (1..5). No buttons. ---- */
const PRAYER_DAY_FRAMES: Frame[] = [
  { src: A + 'prayer-day-1.jpg', from: 0 }, // dawn — opening line + תפילת השחר
  { src: A + 'prayer-day-2.jpg', from: 2 }, // midday — תפילת הצהריים
  { src: A + 'prayer-day-3.jpg', from: 3 }, // afternoon — תפילת אחר הצהריים
  { src: A + 'prayer-day-4.jpg', from: 4 }, // sunset — תפילת הערב
  { src: A + 'prayer-day-5.jpg', from: 5 }, // night — תפילת הלילה
]

/* the scene itself carries the day (each frame already holds its own sun / sunset / moon),
   so the stage is simply the crossfade — the sky moves with the scroll, the place stays.
   A LONG, gentle crossfade (each frame eases out over almost a full step) so the tiny scene
   drift between frames dissolves instead of reading as a jump. */
export function PrayerDayStage({ step, t }: ScrollyState) {
  const p = step + t
  return (
    <div className="st st-photo">
      {PRAYER_DAY_FRAMES.map((frame, i) => {
        const start = frame.from
        const next = PRAYER_DAY_FRAMES[i + 1]?.from
        const alphaIn = i === 0 ? 1 : seg(p, start - 0.92, start + 0.08)
        const alphaOut = next === undefined ? 1 : 1 - seg(p, next - 0.92, next + 0.08)
        const alpha = clamp01(Math.min(alphaIn, alphaOut))
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={frame.src} alt="" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" style={{ opacity: alpha }} />
        )
      })}
      <span className="st-veil" />
    </div>
  )
}

/* ---- charity: giving hands; the fraction stated once over the scene ---- */
const CHARITY_FRAMES: Frame[] = [{ src: A + 'charity-real.jpg', from: 0 }]

export function CharityStage({ step, t }: ScrollyState) {
  return <PhotoStage p={step + t} frames={CHARITY_FRAMES} />
}

/* ---- ramadan, the MONTH OF THE MOON: one night sky held across the whole month while the
   moon changes its face with the scroll. It opens blazing on ליל אלקדר (the descent of the
   Quran), then wanes through the fast days and the last nights down to the thin crescent that
   opens Eid. Purely a function of scroll — reversible, no photos. The text rides over it. ---- */
export function RamadanStage({ step, t }: ScrollyState) {
  const p = step + t
  /* fullness wanes from a bright moon (Laylat al-Qadr) to a thin Eid crescent */
  const frac = 1 - clamp01(p / 2) * 0.84 // 1 → ~0.16
  const mx = 116 - frac * 132 // terminator position for the phase mask
  const qadr = step === 0
  return (
    <div className="st rm-night">
      <span className="rm-stars" aria-hidden="true" />
      <span className={'rm-moon' + (qadr ? ' is-qadr' : '')} aria-hidden="true">
        <span className="rm-moon-lit" style={{ ['--mx' as string]: mx + '%' }} />
      </span>
      <span className={'rm-qadr-tag' + (qadr ? ' is-on' : '')} aria-hidden="true">ליל אלקדר · 27</span>
      <span className="st-veil" />
    </div>
  )
}

/* ---- hajj, the DAY-JOURNEY through the pilgrimage: the same immersive language as the
   prayer day, but moving through PLACE — the reader walks the seven stations, each its own
   full-screen scene, the scroll crossfading gently between them. The embodied rituals (the
   seven tawaf circuits, the seven stones at Mina) live as small interactions in the copy. ---- */
/* one scene per station (ihram is now read as prose, before the journey). These are
   DIFFERENT places, so the dissolve between them is short — each scene stays crisp and
   never muddies into the next. */
const HAJJ_JOURNEY_FRAMES: Frame[] = [
  { src: A + 'tawaf-real.jpg', from: 0 }, // טוואף — circling the Kaaba
  { src: A + 'hajj-sai.jpg', from: 1 }, // סעי — between Safa and Marwah
  { src: A + 'arafat-real.jpg', from: 2 }, // ערפה — the standing
  { src: A + 'hajj-muzdalifah.jpg', from: 3 }, // מוזדליפה — night, gathering stones
  { src: A + 'mina-real.jpg', from: 4 }, // מינא — stoning the devil
  { src: A + 'kaaba-real.jpg', from: 5 }, // return to Mecca — the sacrifice
]

export function HajjJourneyStage({ step, t, tawafTurn = 0 }: ScrollyState & { tawafTurn?: number }) {
  const p = step + t
  /* the scene spins one-seventh of a full turn per tawaf circuit (7 → a whole 360°). While
     it is mid-spin the rotor is zoomed so its corners always cover the screen; it settles
     back to normal at 0 and at the completed 360°. The veil stays fixed so text never turns. */
  /* only the tawaf scene (the first station) turns — otherwise the tilt would leak into the
     later stations */
  const onTawaf = step === 0
  const rot = onTawaf ? tawafTurn * (360 / 7) : 0
  const spinning = onTawaf && tawafTurn > 0 && tawafTurn < 7
  const scale = spinning ? 1.55 : 1.08
  return (
    <div className="st st-photo">
      <div className="st-rotor" style={{ transform: `rotate(${rot}deg) scale(${scale})` }}>
        {HAJJ_JOURNEY_FRAMES.map((frame, i) => {
          const start = frame.from
          const next = HAJJ_JOURNEY_FRAMES[i + 1]?.from
          /* short, crisp cross-dissolve near each boundary — no long blend of two places */
          const alphaIn = i === 0 ? 1 : seg(p, start - 0.22, start)
          const alphaOut = next === undefined ? 1 : 1 - seg(p, next - 0.22, next)
          const alpha = clamp01(Math.min(alphaIn, alphaOut))
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={frame.src} alt="" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" style={{ opacity: alpha }} />
          )
        })}
      </div>
      <span className="st-veil" />
    </div>
  )
}

/* ---- hajj: the road, the ihram, the tawaf (counted), Arafat, Mina, back to Mecca ---- */
const HAJJ_FRAMES: Frame[] = [
  { src: A + 'hajj-caravan-real.jpg', from: 0 },
  { src: A + 'ihram-real.jpg', from: 4 },
  { src: A + 'tawaf-real.jpg', from: 8 },
  { src: A + 'kaaba-real.jpg', from: 9 },
  { src: A + 'arafat-real.jpg', from: 11 },
  { src: A + 'mina-real.jpg', from: 15 },
  { src: A + 'kaaba-real.jpg', from: 18 },
]

export function HajjStage({ step, t }: ScrollyState) {
  const tawaf = step === 8
  return (
    <PhotoStage p={step + t} frames={HAJJ_FRAMES}>
      <span className="st-count" style={{ opacity: tawaf ? 1 : 0 }}>
        {Math.min(7, 1 + Math.floor(t * 7))} מתוך 7
      </span>
    </PhotoStage>
  )
}

/* ---- hajj, the journey MAP (replaces the photo run): one sticky calibrated plate; the
   scroll walks the seven stations, the reached ones fill in, the active one carries its
   name, and the tawaf count still ticks 1→7 while its step is centred. Station names are
   read verbatim from the ordering check in data.ts — nothing here retypes content. ---- */
const HJC = CH6.screens.find((s) => s.id === 'hj-c')
const HAJJ_STATIONS: string[] =
  HJC && HJC.check && HJC.check.type === 'order' ? HJC.check.steps : []

export function HajjMapStage({ step, t }: ScrollyState) {
  const last = HAJJ_POS.length - 1
  const active = Math.max(0, Math.min(last, step))
  const tawaf = active === 1
  const label = HAJJ_POS[active]
  return (
    <div className="st st-photo st-hajj">
      <div className="st-map">
        <div className="map-plate" dir="ltr" dangerouslySetInnerHTML={{ __html: HAJJ_PLATE }} />
        {HAJJ_POS.map((pos, i) => (
          <span
            key={i}
            className={'st-dot' + (i < active ? ' is-done' : '') + (i === active ? ' is-active' : '')}
            style={{ left: pos.x + '%', top: pos.y + '%' }}
          />
        ))}
        <span className="st-pin is-active" style={{ left: label.x + '%', top: label.y + '%' }}>
          {HAJJ_STATIONS[active]}
        </span>
      </div>
      <span className="st-count" style={{ opacity: tawaf ? 1 : 0 }}>
        {Math.min(7, 1 + Math.floor(t * 7))} מתוך 7
      </span>
    </div>
  )
}
