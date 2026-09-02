'use client'

/* HOTSPOTS ON A PAINTING.

   Eight paintings in this chapter and until now every one of them only sat
   there. The museum pattern the research turned up is the opposite: the picture
   is a source, and the reader can put a finger on a part of it and be told what
   that part is.

   THE WARNING FROM THE RESEARCH IS THE DESIGN RULE HERE. Museums hide their
   hotspots so as not to deface the artwork, and the consequence is that
   visitors never learn they exist. So these are marked — a ring on the picture,
   visible before anything is clicked.

   IT REVEALS A NAME, NOT THE CHAPTER. Every label is a word the section's own
   sentence already uses, and the sentence stays in the prose underneath where
   it always was. Nothing is hidden behind a click; the picture is simply
   labelled. That is the distinction the explorable-explanations literature
   draws — the reader is never forced to touch it to follow the chapter. */

import { useState } from 'react'

export interface Spot {
  /** 0..1 across the picture, from the reading edge */
  x: number
  /** 0..1 down the picture */
  y: number
  /** the word, lifted from the section's own sentence */
  label: string
}

export default function Spots({ img, caption, spots }: { img: string; caption: string; spots: Spot[] }) {
  const [on, setOn] = useState<number | null>(null)
  return (
    <figure className="ch4-spots" data-reveal>
      <div className="ch4-spots-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/chapter4/${img}.jpg`} alt="" aria-hidden="true" loading="lazy" />
        {spots.map((s, i) => (
          <button
            key={s.label}
            type="button"
            className={`ch4-spot${on === i ? ' is-on' : ''}`}
            style={{ insetInlineStart: `${s.x * 100}%`, top: `${s.y * 100}%` }}
            aria-label={s.label}
            aria-pressed={on === i}
            onClick={() => setOn((v) => (v === i ? null : i))}
          >
            <span className="ch4-spot-ring" aria-hidden="true" />
            <span className="ch4-spot-label">{s.label}</span>
          </button>
        ))}
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}
