'use client'

/* BEFORE THE COVENANT, AND AFTER IT.

   §4.b holds twelve years of „אי הצלחה, דשדוש וחוסר יכולת" on one side of the
   word „נהיה" and „דת, מוסר, ערכים וצבא" on the other. It is a before and an
   after inside one sentence, and as one paragraph it reads as neither.

   So the band opens on the before, holds it, and turns — a film that runs once,
   from the first drawing to the second, and stops on it. The reader starts it;
   nothing moves on its own.

   THE TWO CAPTIONS ARE THE SENTENCE'S OWN WORDS. The label above each is ours —
   a caption on our own drawing, which this file may write — but the line under
   it is a phrase lifted out of §4.b, and the caller proves it with `pick`, which
   throws if the phrase is not in that fragment. The whole sentence is printed
   under the band as a paragraph, so the shape is added and nothing is replaced
   by its own summary.

   REDUCED MOTION SKIPS THE FILM, it does not skip the point: the band goes
   straight from the first drawing to the second and says so. A reader who has
   asked not to be moved still gets the before, the after and both captions.

   THE LAST FRAME OF THE FILM IS THE SECOND DRAWING — it was generated with that
   still as its end image — so the swap from video to picture at the end has
   nothing to show. */

import { useEffect, useRef, useState } from 'react'

type Phase = 'before' | 'running' | 'after'

export default function Pact({
  film,
  stillBefore,
  stillAfter,
  labelBefore,
  labelAfter,
  textBefore,
  textAfter,
  alt,
  replay,
}: {
  /** the transition, without extension */
  film: string
  stillBefore: string
  stillAfter: string
  /** our own captions on our own drawings */
  labelBefore: string
  labelAfter: string
  /** the source's words, lifted from §4.b by the caller */
  textBefore: string
  textAfter: string
  alt: string
  replay: string
}) {
  const video = useRef<HTMLVideoElement | null>(null)
  const [phase, setPhase] = useState<Phase>('before')
  const [still, setStill] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setStill(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const run = () => {
    if (phase !== 'before') return
    if (still) {
      setPhase('after')
      return
    }
    setPhase('running')
    const v = video.current
    if (!v) {
      setPhase('after')
      return
    }
    v.currentTime = 0
    v.play().catch(() => setPhase('after'))
  }

  const back = () => {
    setPhase('before')
    video.current?.pause()
  }

  return (
    <figure className={`ch4-pact is-${phase}`}>
      <div className="ch4-pact-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ch4-pact-still is-before" src={`/assets/chapter4/${stillBefore}.jpg`} alt={alt} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ch4-pact-still is-after" src={`/assets/chapter4/${stillAfter}.jpg`} alt="" aria-hidden="true" />
        <video
          className="ch4-pact-film"
          ref={video}
          src={`/assets/chapter4/${film}.mp4`}
          poster={`/assets/chapter4/${stillBefore}.jpg`}
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onEnded={() => setPhase('after')}
        />

        <span className="ch4-pact-scrim" aria-hidden="true" />

        <figcaption className="ch4-pact-cap is-before">
          <b>{labelBefore}</b>
          <span>{textBefore}</span>
        </figcaption>
        <figcaption className="ch4-pact-cap is-after">
          <b>{labelAfter}</b>
          <span>{textAfter}</span>
        </figcaption>

        {phase === 'before' && (
          <button type="button" className="ch4-pact-go" onClick={run}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>{labelAfter}</span>
          </button>
        )}
        {phase === 'after' && (
          <button type="button" className="ch4-pact-back" onClick={back}>
            {replay}
          </button>
        )}
      </div>
    </figure>
  )
}
