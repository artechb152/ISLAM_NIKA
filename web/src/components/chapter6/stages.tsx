'use client'

/* Full-screen photographic stages. Each area is a sequence of realistic, blurred
   images; the scroll position crossfades between them CONTINUOUSLY (p = step + t),
   so the scene glides — never frame-by-frame — and rewinds on reverse scroll.
   A white veil, strong on the right and fading left, keeps the text readable.
   The stage is decorative (aria-hidden); every fact lives in the text. */

import type { ReactNode } from 'react'
import { clamp01, seg, type ScrollyState } from './scrolly'

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

/* ---- prayer: the scroll moves through the night journey, the ablution, the mosque and
   the qibla; the "five prayers & times" step (index 2) is CLICK-driven instead — its five
   buttons pick the time of day, and that choice fills the whole screen ---- */
const PRAYER_FRAMES: Frame[] = [
  { src: A + 'prayer-night-real.jpg', from: 0 },
  { src: A + 'prayer-wudu-real.jpg', from: 3 },
  { src: A + 'mosque-hall-real.jpg', from: 5 },
  { src: A + 'kaaba-real.jpg', from: 8 },
]

/* one photo per prayer, dawn → night (index-aligned with the five prayer buttons) */
const PRAYER_PICK: string[] = [
  A + 'prayer-dawn-real.jpg', // תפילת השחר
  A + 'prayer-noon-real.jpg', // תפילת הצהריים
  A + 'prayer-noon-real.jpg', // תפילת אחר הצהריים
  A + 'prayer-sunset-real.jpg', // תפילת הערב
  A + 'prayer-night-real.jpg', // תפילת הלילה
]

const PRAYER_TIMES_STEP = 2

export function PrayerStage({ step, t, pick = 0 }: ScrollyState & { pick?: number }) {
  const onTimes = step === PRAYER_TIMES_STEP
  const p = step + t
  return (
    <div className="st st-photo">
      {PRAYER_FRAMES.map((frame, i) => {
        const start = frame.from
        const next = PRAYER_FRAMES[i + 1]?.from
        const alphaIn = i === 0 ? 1 : seg(p, start - 0.45, start + 0.05)
        const alphaOut = next === undefined ? 1 : 1 - seg(p, next - 0.45, next + 0.05)
        const alpha = clamp01(Math.min(alphaIn, alphaOut))
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={frame.src} alt="" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" style={{ opacity: alpha }} />
        )
      })}
      {/* the click-controlled layer, covering the scene only on the five-prayers step */}
      {PRAYER_PICK.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={'pick' + i} className="st-pick" src={src} alt="" loading="lazy" decoding="async" style={{ opacity: onTimes && i === pick ? 1 : 0 }} />
      ))}
      <span className="st-veil" />
    </div>
  )
}

/* ---- charity: giving hands; the fraction stated once over the scene ---- */
const CHARITY_FRAMES: Frame[] = [{ src: A + 'charity-real.jpg', from: 0 }]

export function CharityStage({ step, t }: ScrollyState) {
  return <PhotoStage p={step + t} frames={CHARITY_FRAMES} />
}

/* ---- ramadan: crescent, Medina, the revelation, the fast day, the festival ---- */
const RAMADAN_FRAMES: Frame[] = [
  { src: A + 'ramadan-crescent-real.jpg', from: 0 },
  { src: A + 'medina-real.jpg', from: 1 },
  { src: A + 'quran-night-real.jpg', from: 5 },
  { src: A + 'iftar-real.jpg', from: 7 },
  { src: A + 'quran-night-real.jpg', from: 8 },
  { src: A + 'eid-lanterns-real.jpg', from: 10 },
  { src: A + 'ramadan-crescent-real.jpg', from: 12 },
]

export function RamadanStage({ step, t }: ScrollyState) {
  const qadr = step === 6
  return (
    <PhotoStage p={step + t} frames={RAMADAN_FRAMES}>
      <div className="st-qadr" style={{ opacity: qadr ? 1 : 0 }}>
        <b>27</b>
        <small>ליל אלקדר</small>
      </div>
    </PhotoStage>
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
