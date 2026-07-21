'use client'

/* The site entrance — a scroll-scrubbed film, drawn as a frame sequence.

   Seeking an MP4 by its currentTime stutters: the browser can only land on the codec's
   keyframes, so the scrub jumps. Instead the film is pre-split into 61 stills (ffmpeg,
   12fps) and the scroll position picks a frame that is painted to a <canvas>. There is no
   decoding on the scroll path, so it is glassy-smooth winding both forward AND back.

   The logo and "enter" button fade in over the final stretch (a --reveal custom property
   set per frame). The reveal is driven by SCROLL, not by asset loading, so the entrance is
   always reachable. Reduced-motion skips the scrub and shows the opening over the corridor. */

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const FRAME_COUNT = 61
const framePath = (i: number) => `/assets/entrance-frames/f-${String(i + 1).padStart(3, '0')}.jpg`
/* how much page-height the scrub spans — 3 screens of scroll winds the whole film */
const TRACK_VH = 300
/* the opening begins composing at 60% of the scroll and completes at the end */
const REVEAL_START = 0.6

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}
function smoothstep(x: number): number {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}

export default function Entrance() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLElement>(null)
  const revealRef = useRef<HTMLDivElement>(null)
  const enterRef = useRef<HTMLAnchorElement>(null)

  const [noIntro, setNoIntro] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    const reveal = revealRef.current
    if (!canvas || !stage || !reveal) return

    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setNoIntro(true)
      stage.style.setProperty('--reveal', '1')
      reveal.classList.add('is-live')
      window.setTimeout(() => {
        try {
          enterRef.current?.focus({ preventScroll: true })
        } catch {}
      }, 200)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    /* Direction: scrolling UP enters (winds the film forward, deeper into the building,
       to the "לכניסה"); scrolling DOWN exits. So the page loads at the BOTTOM of the
       runway — the exterior — and progress runs as the learner scrolls up toward the top.
       Manual restoration keeps the browser from fighting the initial jump. */
    try {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    } catch {
      /* older browsers just keep their default restoration */
    }

    /* ---- preload the frames; the scrub uses whatever has arrived, nearest-first ---- */
    const frames: HTMLImageElement[] = []
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image()
      img.decoding = 'async'
      img.src = framePath(i)
      img.onload = () => kickFrame()
      frames[i] = img
    }
    function ready(i: number): boolean {
      const im = frames[i]
      return !!im && im.complete && im.naturalWidth > 0
    }
    function nearestReady(i: number): number {
      if (ready(i)) return i
      for (let d = 1; d < FRAME_COUNT; d++) {
        if (ready(i - d)) return i - d
        if (ready(i + d)) return i + d
      }
      return -1
    }

    /* ---- canvas sizing (cover), crisp on HiDPI ---- */
    let cw = 0
    let ch = 0
    function resize(): void {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cw = window.innerWidth
      ch = window.innerHeight
      canvas!.width = Math.round(cw * dpr)
      canvas!.height = Math.round(ch * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      kickFrame()
    }
    function drawCover(img: HTMLImageElement): void {
      const ir = img.naturalWidth / img.naturalHeight
      const cr = cw / ch
      let dw: number
      let dh: number
      if (cr > ir) {
        dw = cw
        dh = cw / ir
      } else {
        dh = ch
        dw = ch * ir
      }
      ctx!.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
    }

    /* ---- the scrub loop ---- */
    let raf: number | undefined
    let curr = 0 // eased frame index chasing the scroll target
    let running = false
    let lastDrawn = -1

    function maxScroll(): number {
      return Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    }
    function frame(): void {
      running = true
      /* inverted: top of the page (scrollY 0) is fully ENTERED, bottom is the exterior */
      const p = clamp01(1 - window.scrollY / maxScroll())
      const target = p * (FRAME_COUNT - 1)

      curr += (target - curr) * 0.24
      if (Math.abs(target - curr) < 0.05) curr = target

      const want = nearestReady(Math.round(curr))
      if (want >= 0 && want !== lastDrawn) {
        drawCover(frames[want])
        lastDrawn = want
      }

      const r = smoothstep((p - REVEAL_START) / (1 - REVEAL_START))
      stage!.style.setProperty('--reveal', r.toFixed(4))
      reveal!.classList.toggle('is-live', r > 0.35)

      if (Math.abs(target - curr) > 0.01) raf = requestAnimationFrame(frame)
      else running = false
    }
    function kickFrame(): void {
      if (!running) raf = requestAnimationFrame(frame)
    }

    function onScroll(): void {
      kickFrame()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', resize)

    /* skip for keyboard / the corner button: glide to the TOP so the film enters fully and
       the opening composes, then hand focus to the entrance link */
    function skipToEnd(): void {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      window.setTimeout(() => {
        try {
          enterRef.current?.focus({ preventScroll: true })
        } catch {}
      }, 620)
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        if (e.target !== enterRef.current) {
          e.preventDefault()
          skipToEnd()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const skipBtn = stage.querySelector<HTMLButtonElement>('#skip')
    skipBtn?.addEventListener('click', skipToEnd)

    /* start at the exterior: pin the scroll to the bottom of the runway, so the only way
       forward is up. Done now (pre-paint the canvas is still blank, so no flash) and again
       on the next frame in case the runway's height was not yet settled. */
    function toStart(): void {
      const el = document.scrollingElement || document.documentElement
      el.scrollTop = maxScroll()
      kickFrame()
    }
    toStart()
    const startRaf = requestAnimationFrame(toStart)

    resize() // sizes the canvas and paints the first ready frame

    return () => {
      if (raf) cancelAnimationFrame(raf)
      cancelAnimationFrame(startRaf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', resize)
      document.removeEventListener('keydown', onKey)
      skipBtn?.removeEventListener('click', skipToEnd)
      for (const im of frames) im.onload = null
      try {
        if ('scrollRestoration' in history) history.scrollRestoration = 'auto'
      } catch {}
    }
  }, [])

  return (
    <>
      <main id="stage" ref={stageRef} className={noIntro ? 'no-intro' : ''}>
        {/* fallback backdrop = the film's final frame (identical), for the no-canvas path */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="corridor" src="/assets/corridor.jpg" alt="" aria-hidden="true" />

        {/* the entrance film — a frame sequence painted by scroll */}
        <canvas id="film-canvas" ref={canvasRef} aria-hidden="true" />

        {/* revealed on top of the film's current frame — the backdrop pixels never swap */}
        <div id="reveal" ref={revealRef}>
          <div className="veil" aria-hidden="true" />
          <div className="inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand" src="/assets/logo-cream.png" alt="אסלאם" />
            <Link className="enter" id="enter" href="/chapters" ref={enterRef}>
              לכניסה
            </Link>
          </div>
        </div>

        {/* a quiet scroll cue while the opening is still winding in — up = enter */}
        <div id="scroll-cue" aria-hidden="true">
          <span className="cue-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
          </span>
          <span className="cue-text">גללו למעלה כדי להיכנס</span>
        </div>

        {/* skip for those who would rather not scroll (keyboard-reachable) */}
        <button id="skip" type="button" aria-label="דילוג לכניסה">
          דילוג
        </button>
      </main>

      {/* the scroll runway that gives the scrub its length; absent under reduced motion */}
      {!noIntro && <div className="scroll-track" aria-hidden="true" style={{ height: `${TRACK_VH}vh` }} />}
    </>
  )
}
