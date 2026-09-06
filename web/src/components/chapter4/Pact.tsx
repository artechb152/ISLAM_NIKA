'use client'

/* BEFORE THE COVENANT, AND AFTER IT.

   §4.b holds twelve years of „אי הצלחה, דשדוש וחוסר יכולת" on one side of the
   word „נהיה" and „דת, מוסר, ערכים וצבא" on the other. It is a before and an
   after inside one sentence, and as one paragraph it reads as neither.

   TWO DRAWINGS OF ONE VIEW. Not two pictures of two places: the same camera,
   the same wall, the same gate, the same ridge and the same tree. The second
   was made by editing the first, so nothing in the frame moves and the only
   thing the reader can see is what changed — dusk to morning, a shut gate to an
   open one, bare ground to a working courtyard, a dead tree in leaf.

   THE WHOLE PICTURE IS THE BUTTON, and nothing is drawn on it to say so — a
   press anywhere turns the view. The button's own aria-label names what the
   press will show, so a screen reader is still told.

   THE CAPTIONS ARE THE SENTENCE'S OWN WORDS. The small line above each is ours
   — a caption on our own drawing, which this file may write — but the line
   under it is a phrase lifted out of §4.b, and the caller proves it with
   `pick`, which throws if the phrase is not in that fragment. The sentence
   itself is printed under the figure in full, so the shape is added and nothing
   is replaced by its own summary.

   BOTH DRAWINGS ARE ALWAYS LOADED and cross-faded in place, so the turn has
   nothing to fetch and the frame cannot jump. */

import { useState } from 'react'

export default function Pact({
  stillBefore,
  stillAfter,
  labelBefore,
  labelAfter,
  textBefore,
  textAfter,
  altBefore,
  altAfter,
}: {
  stillBefore: string
  stillAfter: string
  /** our own captions on our own drawings */
  labelBefore: string
  labelAfter: string
  /** the source's words, lifted from §4.b by the caller */
  textBefore: string
  textAfter: string
  altBefore: string
  altAfter: string
}) {
  const [after, setAfter] = useState(false)

  return (
    /* THE STATE CLASS IS NOT ON THE REVEALED ELEMENT. `.is-inview` is added to
       [data-reveal] imperatively by the article's observer; re-rendering this
       figure with a className of our own wiped it, and the whole picture went
       to opacity 0 the moment it was pressed. The figure's class is now
       constant and the state lives on the button inside it. */
    <figure className="ch4-pact" data-reveal>
      <button
        type="button"
        className={`ch4-pact-stage${after ? ' is-after' : ''}`}
        aria-pressed={after}
        aria-label={after ? labelBefore : labelAfter}
        onClick={() => setAfter((v) => !v)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ch4-pact-still is-before" src={`/assets/chapter4/${stillBefore}.jpg`} alt={altBefore} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ch4-pact-still is-after" src={`/assets/chapter4/${stillAfter}.jpg`} alt={altAfter} />

        <span className="ch4-pact-scrim" aria-hidden="true" />

        <span className="ch4-pact-cap is-before" aria-hidden={after}>
          <b>{labelBefore}</b>
          <i>{textBefore}</i>
        </span>
        <span className="ch4-pact-cap is-after" aria-hidden={!after}>
          <b>{labelAfter}</b>
          <i>{textAfter}</i>
        </span>
      </button>
    </figure>
  )
}
