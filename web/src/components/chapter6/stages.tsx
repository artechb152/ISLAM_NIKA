'use client'

/* The full-screen photographic stage of the prayer day (the only Scrolly stage chapter 6
   still uses). The scroll position crossfades between the frames CONTINUOUSLY (p = step + t),
   so the scene glides — never frame-by-frame — and rewinds on reverse scroll. A dark radial
   veil (.prayer-day .st-veil) keeps the light text readable. The stage is decorative
   (aria-hidden); every fact lives in the text. */

import { clamp01, seg, type ScrollyState } from './scrolly'

interface Frame {
  src: string
  from: number
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
