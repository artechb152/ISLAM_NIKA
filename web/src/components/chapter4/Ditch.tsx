'use client'

/* THE TRENCH, AS SOMETHING THE READER DIGS.

   §24 is the only event in the chapter whose whole meaning is a change to the
   ground: a Persian advised a ditch on the side the city stood open, the
   technique was not one the Arabs used, and the siege broke on it. As a
   sentence that is a clause inside thirty-eight words. As a handle you drag
   across the same view, it is the event.

   WHY A SLIDER AND NOT A DISCLOSURE. The research on explorable explanations
   makes the distinction that matters here: the reader is never forced to touch
   the thing in order to follow the chapter — the paragraph beneath says
   everything — but touching it is what turns a fact into an act. A drawer that
   hides text behind a click does the opposite: it withholds, and it is the
   generic move this chapter was asked to avoid.

   THE TWO PAINTINGS ARE THE SAME PAINTING. The „after" was made by editing the
   „before" rather than generated fresh, so the town, the palms, the sky and the
   light are identical and the only thing that changes under the handle is the
   ground. scratchpad/align.mjs then cropped it so both horizons sit at the same
   height — without that the town jumps as you drag, and the eye reads the jump
   instead of the ditch.

   KEYBOARD AND TOUCH BOTH WORK: it is a range input under the hood, so arrow
   keys move it and a screen reader announces it. */

import { useState } from 'react'

export default function Ditch({ before, after, alt }: { before: string; after: string; alt: string }) {
  const [at, setAt] = useState(38)
  return (
    <figure className="ch4-ditch" data-reveal>
      <div className="ch4-ditch-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ch4-ditch-a" src={`/assets/chapter4/${before}.jpg`} alt="" aria-hidden="true" />
        <div className="ch4-ditch-clip" style={{ clipPath: `inset(0 0 0 ${at}%)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/assets/chapter4/${after}.jpg`} alt="" aria-hidden="true" />
        </div>
        <div className="ch4-ditch-handle" style={{ insetInlineStart: `${at}%` }} aria-hidden="true">
          <span />
          <i>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M9 6l-4 6 4 6M15 6l4 6-4 6" />
            </svg>
          </i>
        </div>
        <input
          className="ch4-ditch-range"
          type="range"
          min={0}
          max={100}
          value={at}
          onChange={(e) => setAt(Number(e.target.value))}
          aria-label={alt}
        />
      </div>
    </figure>
  )
}
