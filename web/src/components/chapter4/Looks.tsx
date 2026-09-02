'use client'

/* A LOCAL CHOOSING TOOL, NOT PART OF THE CHAPTER.

   The chapter has been rebuilt several times against descriptions, and
   descriptions are the hard way to settle a look. This page renders the SAME
   passage — the opening of section 01 — four times, in four different design
   languages, with the chapter's real sentences and the chapter's real plates.
   Nothing here is published anywhere: it is a route on the dev server, and the
   booklet is marked „מוגבל“.

   Pick one and the chapter gets built to it. The four are deliberately far
   apart; the point is to find the direction, not to polish any of them. */

import { useState } from 'react'
import { text } from '@/lib/chapter4/content'

const T = {
  a: text('§0.a'),
  b: text('§0.b'),
  road: text('§1.a'),
  tribes: text('§1.b'),
  groupsLead: text('§3.b'),
  g1: text('§3.muhajirun'),
  g2: text('§3.ansar'),
  g3: text('§3.jews'),
  g4: text('§3.quraysh'),
}
const N = { g1: 'המהגרים', g2: 'התומכים' }

const LOOKS = [
  { id: 'editorial', name: 'א · מערכתי', note: 'טקסט מוביל, תמונה רחבה, כרטיסים שקטים' },
  { id: 'gallery', name: 'ב · גלריה', note: 'תמונה מובילה, טקסט קצר לצידה, לסירוגין' },
  { id: 'cinema', name: 'ג · קולנועי', note: 'רקע כהה, תמונות מלאות, טיפוגרפיה גדולה' },
  { id: 'document', name: 'ד · מסמך', note: 'קלף, מסגרות, שתי עמודות, פרטים קטנים' },
]

export default function Looks() {
  const [look, setLook] = useState('editorial')
  return (
    <div className="lk">
      <header className="lk-bar">
        <h1>ארבע שפות עיצוב לאותו מקטע</h1>
        <div className="lk-tabs">
          {LOOKS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={look === l.id ? 'is-on' : undefined}
              onClick={() => setLook(l.id)}
            >
              <b>{l.name}</b>
              <span>{l.note}</span>
            </button>
          ))}
        </div>
      </header>

      <main className={`lk-stage lk-${look}`}>
        {look === 'editorial' && <Editorial />}
        {look === 'gallery' && <Gallery />}
        {look === 'cinema' && <Cinema />}
        {look === 'document' && <Document />}
      </main>
    </div>
  )
}

function Head() {
  return (
    <header className="lk-head">
      <h2>ההגירה למדינה</h2>
      <div className="lk-orn" aria-hidden="true">
        <span />
        <i />
        <span />
      </div>
    </header>
  )
}

/* eslint-disable @next/next/no-img-element */
const Img = ({ src, cap }: { src: string; cap?: string }) => (
  <figure>
    <img src={`/assets/chapter4/${src}.jpg`} alt="" aria-hidden="true" />
    {cap && <figcaption>{cap}</figcaption>}
  </figure>
)

function Editorial() {
  return (
    <article>
      <Head />
      <p className="lk-lead">{T.a}</p>
      <p>{T.b}</p>
      <Img src="stage-1-mecca" cap="מכה בעמקה · שחזור מצויר" />
      <p>{T.road}</p>
      <p>{T.tribes}</p>
      <h3>ארבע קבוצות אנשים</h3>
      <p>{T.groupsLead}</p>
      <div className="lk-cards">
        <div><b>{N.g1}</b><p>{T.g1}</p></div>
        <div><b>{N.g2}</b><p>{T.g2}</p></div>
        <div><p>{T.g3}</p></div>
        <div><p>{T.g4}</p></div>
      </div>
    </article>
  )
}

function Gallery() {
  return (
    <article>
      <Head />
      <div className="lk-row">
        <Img src="stage-1-mecca" cap="מכה · שחזור מצויר" />
        <div>
          <p className="lk-lead">{T.a}</p>
          <p>{T.b}</p>
        </div>
      </div>
      <div className="lk-row is-flip">
        <Img src="stage-4-arrival" cap="שער הנווה · שחזור מצויר" />
        <div>
          <p className="lk-lead">{T.road}</p>
          <p>{T.tribes}</p>
        </div>
      </div>
      <div className="lk-cards">
        <div><b>{N.g1}</b><p>{T.g1}</p></div>
        <div><b>{N.g2}</b><p>{T.g2}</p></div>
        <div><p>{T.g3}</p></div>
        <div><p>{T.g4}</p></div>
      </div>
    </article>
  )
}

function Cinema() {
  return (
    <article>
      <section className="lk-bleed">
        <img src="/assets/chapter4/stage-1-mecca.jpg" alt="" aria-hidden="true" />
        <div>
          <h2>ההגירה למדינה</h2>
          <p>{T.a}</p>
        </div>
      </section>
      <p className="lk-quiet">{T.b}</p>
      <section className="lk-bleed">
        <img src="/assets/chapter4/stage-4-arrival.jpg" alt="" aria-hidden="true" />
        <div>
          <p>{T.road}</p>
        </div>
      </section>
      <p className="lk-quiet">{T.tribes}</p>
      <div className="lk-cards">
        <div><b>{N.g1}</b><p>{T.g1}</p></div>
        <div><b>{N.g2}</b><p>{T.g2}</p></div>
        <div><p>{T.g3}</p></div>
        <div><p>{T.g4}</p></div>
      </div>
    </article>
  )
}

function Document() {
  return (
    <article>
      <Head />
      <div className="lk-two">
        <div>
          <p className="lk-lead">{T.a}</p>
          <p>{T.b}</p>
          <ul className="lk-chips">
            <li>מכה</li>
            <li>ית׳רב</li>
          </ul>
        </div>
        <Img src="stage-1-mecca" cap="מכה בעמקה · שחזור מצויר" />
      </div>
      <div className="lk-rule" aria-hidden="true" />
      <div className="lk-two is-flip">
        <div>
          <p className="lk-lead">{T.road}</p>
          <p>{T.tribes}</p>
        </div>
        <Img src="stage-4-arrival" cap="שער הנווה · שחזור מצויר" />
      </div>
      <div className="lk-ledger">
        <p className="lk-ledger-lead">{T.groupsLead}</p>
        <div>
          <div><b>{N.g1}</b><p>{T.g1}</p></div>
          <div><b>{N.g2}</b><p>{T.g2}</p></div>
          <div><p>{T.g3}</p></div>
          <div><p>{T.g4}</p></div>
        </div>
      </div>
    </article>
  )
}
