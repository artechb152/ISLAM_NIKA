'use client'

/* The entrance sequence (was the inline <script> at the bottom of index.html).
   Same behaviour, same markup, same class names — the CSS is the original file, so the DOM
   it styles has to stay exactly this shape. What changed: getElementById became refs, the
   two class toggles became state, and the listeners are torn down on unmount. */

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export default function Entrance() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)
  const enterRef = useRef<HTMLAnchorElement>(null)
  const enteredRef = useRef(false)

  const [entered, setEntered] = useState(false)
  const [noIntro, setNoIntro] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    const skip = skipRef.current
    if (!video || !skip) return

    let guard: number | undefined
    let focusTimer: number | undefined

    function enter() {
      if (enteredRef.current) return
      enteredRef.current = true
      try {
        video?.pause()
      } catch {
        /* a video that refuses to pause must not hold the entrance shut */
      }
      setEntered(true)
      focusTimer = window.setTimeout(function () {
        try {
          enterRef.current?.focus({ preventScroll: true })
        } catch {
          /* focus is a courtesy here, never a requirement */
        }
      }, 1200)
    }

    // reduced motion: skip the cinematic intro entirely, show opening over the corridor image
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setNoIntro(true)
      enter()
      return () => {
        window.clearTimeout(focusTimer)
      }
    }

    // primary trigger: the entrance finished playing
    video.addEventListener('ended', enter)

    // safety net if 'ended' never fires
    guard = window.setTimeout(enter, 9000)
    function onMeta() {
      const ms = (isFinite(video!.duration) ? video!.duration : 5.1) * 1000 + 400
      window.clearTimeout(guard)
      guard = window.setTimeout(enter, ms)
    }
    video.addEventListener('loadedmetadata', onMeta)
    // catch the last moment in case 'ended' is skipped
    function onTime() {
      if (isFinite(video!.duration) && video!.duration - video!.currentTime <= 0.05) enter()
    }
    video.addEventListener('timeupdate', onTime)

    // user may enter early — feels interactive, not like skipping a video
    skip.addEventListener('click', enter)
    function onKey(e: KeyboardEvent) {
      if (enteredRef.current) return
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault()
        enter()
      }
    }
    document.addEventListener('keydown', onKey)

    // blocked autoplay: keep the exterior scene, start on first interaction
    let kick: (() => void) | null = null
    function tryPlay() {
      const p = video!.play()
      if (p && typeof p.then === 'function') {
        p.catch(function () {
          kick = function () {
            document.removeEventListener('pointerdown', kick!)
            video!.play().catch(function () {})
          }
          document.addEventListener('pointerdown', kick, { once: true })
        })
      }
    }
    if (video.readyState >= 2) tryPlay()
    else video.addEventListener('canplay', tryPlay, { once: true })

    function onCtx(e: Event) {
      e.preventDefault()
    }
    video.addEventListener('contextmenu', onCtx)

    return () => {
      window.clearTimeout(guard)
      window.clearTimeout(focusTimer)
      video.removeEventListener('ended', enter)
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('canplay', tryPlay)
      video.removeEventListener('contextmenu', onCtx)
      skip.removeEventListener('click', enter)
      document.removeEventListener('keydown', onKey)
      if (kick) document.removeEventListener('pointerdown', kick)
    }
  }, [])

  const stageClass = [entered ? 'entered' : '', noIntro ? 'no-intro' : ''].filter(Boolean).join(' ')

  return (
    <main id="stage" className={stageClass}>
      {/* fallback backdrop = the video's final frame (identical), for the no-video path */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="corridor" src="/assets/corridor.jpg" alt="" aria-hidden="true" />

      {/* the entrance sequence */}
      <video
        id="intro"
        ref={videoRef}
        muted
        autoPlay
        playsInline
        preload="auto"
        poster="/assets/exterior.jpg"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        x-webkit-airplay="deny"
      >
        <source src="/entrance video.mp4" type="video/mp4" />
      </video>

      {/* revealed on top of the frozen last frame — backdrop never swaps */}
      <div id="reveal">
        <div className="veil" aria-hidden="true" />
        <div className="inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand" src="/assets/logo-cream.png" alt="אסלאם" />
          <Link className="enter" id="enter" href="/chapters" ref={enterRef}>
            לכניסה
          </Link>
        </div>
      </div>

      {/* whole-screen "enter" affordance during the intro */}
      <button id="skip" ref={skipRef} aria-label="כניסה לאתר" />
    </main>
  )
}
