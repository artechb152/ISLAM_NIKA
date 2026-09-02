'use client'

/* A LOCAL CHOOSING TOOL, NOT PART OF THE CHAPTER.

   Describing a design in words has not worked once in this project; showing
   four rendered drafts settled it in a single message. So this page renders the
   WHOLE of section 01 — every one of its sentences, the chapter's own plates —
   five times, in five layouts that share nothing but the content.

   Nothing here is published anywhere. It is a route on the dev server, and the
   booklet is marked „מוגבל“. */

import { useState } from 'react'
import { text } from '@/lib/chapter4/content'

const P = {
  a: text('§0.a'),
  b: text('§0.b'),
  road: text('§1.a'),
  tribes: text('§1.b'),
  flight: text('§2.flight'),
  invited: text('§2.invited'),
  ansar: text('§3.a'),
  four: text('§3.b'),
  g1: text('§3.muhajirun'),
  g2: text('§3.ansar'),
  g3: text('§3.jews'),
  g4: text('§3.quraysh'),
  pact: text('§4.a'),
  became: text('§4.b'),
  terms: text('§8.a'),
  jewsRights: text('§8.b'),
  unravel: text('§8.c'),
  converts: text('§8.d'),
  hijra: text('§5.a'),
  meaning: text('§5.b'),
  echo1: text('§6.echo1'),
  echo2: text('§6.echo2'),
  camel: text('§7.a'),
  sign: text('§7.b'),
  built: text('§7.c'),
}
const N = { g1: 'המהגרים', g2: 'התומכים' }

const LOOKS = [
  { id: 'journal', name: '1 · יומן מסע', note: 'קו אנכי, תחנות תלויות עליו' },
  { id: 'sticky', name: '2 · תמונה נעוצה', note: 'הציור נשאר, הטקסט עובר לידו' },
  { id: 'versions', name: '3 · שתי גרסאות', note: 'המחלוקת פותחת את המקטע' },
  { id: 'column', name: '4 · עמודה צרה', note: 'פנורמה, ואז קריאה שקטה' },
  { id: 'grid', name: '5 · כרטיסי נושא', note: 'שישה כרטיסים, בלי רצף' },
]

export default function Looks() {
  const [look, setLook] = useState('journal')
  return (
    <div className="lk">
      <header className="lk-bar">
        <h1>מקטע 01 · ההגירה למדינה — חמש אפשרויות</h1>
        <div className="lk-tabs">
          {LOOKS.map((l) => (
            <button key={l.id} type="button" className={look === l.id ? 'is-on' : undefined} onClick={() => setLook(l.id)}>
              <b>{l.name}</b>
              <span>{l.note}</span>
            </button>
          ))}
        </div>
      </header>
      <main className={`lk-stage lk-${look}`}>
        {look === 'journal' && <Journal />}
        {look === 'sticky' && <Sticky />}
        {look === 'versions' && <Versions />}
        {look === 'column' && <Column />}
        {look === 'grid' && <Grid />}
      </main>
    </div>
  )
}

/* eslint-disable @next/next/no-img-element */
const Pic = ({ src, cap }: { src: string; cap?: string }) => (
  <figure>
    <img src={`/assets/chapter4/${src}.jpg`} alt="" aria-hidden="true" loading="lazy" />
    {cap && <figcaption>{cap} · שחזור מצויר</figcaption>}
  </figure>
)

const Title = () => <h2 className="lk-title">ההגירה למדינה</h2>

/* ---------- 1 · יומן מסע ---------- */
function Journal() {
  const Station = ({ head, pic, children }: { head: string; pic?: string; children: React.ReactNode }) => (
    <section className="lk-st">
      <h3>{head}</h3>
      <div>
        {pic && <Pic src={pic} cap={head} />}
        <div>{children}</div>
      </div>
    </section>
  )
  return (
    <article>
      <Title />
      <Station head="מכה" pic="stage-1-mecca"><p>{P.a}</p><p>{P.b}</p></Station>
      <Station head="הדרך" pic="stage-2-road"><p>{P.road}</p><p>{P.tribes}</p></Station>
      <Station head="בריחה או הזמנה"><p>{P.flight}</p><p>{P.invited}</p></Station>
      <Station head="ארבע קבוצות" pic="stage-4-arrival">
        <p>{P.ansar}</p><p>{P.four}</p>
        <ul className="lk-list"><li><b>{N.g1}</b> {P.g1}</li><li><b>{N.g2}</b> {P.g2}</li><li>{P.g3}</li><li>{P.g4}</li></ul>
      </Station>
      <Station head="חוזה האומה"><p>{P.pact}</p><p>{P.became}</p><p>{P.terms}</p><p>{P.jewsRights}</p><p>{P.unravel}</p><p>{P.converts}</p></Station>
      <Station head="ההגירה כמושג"><p>{P.hijra}</p><p>{P.meaning}</p><p className="lk-echo">{P.echo1}</p><p className="lk-echo">{P.echo2}</p></Station>
      <Station head="המסגד" pic="stage-5-yard"><p>{P.camel}</p><p>{P.sign}</p><p>{P.built}</p></Station>
    </article>
  )
}

/* ---------- 2 · תמונה נעוצה ---------- */
function Sticky() {
  const Pair = ({ pic, cap, children }: { pic: string; cap: string; children: React.ReactNode }) => (
    <section className="lk-sticky">
      <div className="lk-sticky-pic"><Pic src={pic} cap={cap} /></div>
      <div className="lk-sticky-text">{children}</div>
    </section>
  )
  return (
    <article>
      <Title />
      <Pair pic="stage-1-mecca" cap="מכה"><p>{P.a}</p><p>{P.b}</p><p>{P.road}</p><p>{P.tribes}</p></Pair>
      <Pair pic="stage-4-arrival" cap="שער הנווה">
        <p>{P.flight}</p><p>{P.invited}</p><p>{P.ansar}</p><p>{P.four}</p>
        <ul className="lk-list"><li><b>{N.g1}</b> {P.g1}</li><li><b>{N.g2}</b> {P.g2}</li><li>{P.g3}</li><li>{P.g4}</li></ul>
      </Pair>
      <Pair pic="yathrib-oasis" cap="ית׳רב"><p>{P.pact}</p><p>{P.became}</p><p>{P.terms}</p><p>{P.jewsRights}</p><p>{P.unravel}</p><p>{P.converts}</p></Pair>
      <Pair pic="stage-5-yard" cap="החצר"><p>{P.hijra}</p><p>{P.meaning}</p><p className="lk-echo">{P.echo1}</p><p className="lk-echo">{P.echo2}</p><p>{P.camel}</p><p>{P.sign}</p><p>{P.built}</p></Pair>
    </article>
  )
}

/* ---------- 3 · שתי גרסאות ---------- */
function Versions() {
  return (
    <article>
      <Title />
      <div className="lk-versus">
        <div><h3>בריחה</h3><p>{P.flight}</p></div>
        <div><h3>הזמנה</h3><p>{P.invited}</p></div>
      </div>
      <p className="lk-lead">{P.a}</p>
      <p>{P.b}</p>
      <p>{P.road}</p>
      <p>{P.tribes}</p>
      <Pic src="stage-4-arrival" cap="שער הנווה" />
      <p>{P.ansar}</p>
      <p>{P.four}</p>
      <ul className="lk-list"><li><b>{N.g1}</b> {P.g1}</li><li><b>{N.g2}</b> {P.g2}</li><li>{P.g3}</li><li>{P.g4}</li></ul>
      <p>{P.pact}</p><p>{P.became}</p><p>{P.terms}</p><p>{P.jewsRights}</p><p>{P.unravel}</p><p>{P.converts}</p>
      <p>{P.hijra}</p><p>{P.meaning}</p>
      <p className="lk-echo">{P.echo1}</p><p className="lk-echo">{P.echo2}</p>
      <Pic src="stage-5-yard" cap="החצר" />
      <p>{P.camel}</p><p>{P.sign}</p><p>{P.built}</p>
    </article>
  )
}

/* ---------- 4 · עמודה צרה ---------- */
function Column() {
  return (
    <article className="lk-narrow">
      <div className="lk-pano"><Pic src="stage-2-road" cap="הדרך צפונה" /></div>
      <Title />
      <p className="lk-lead">{P.a}</p>
      <p>{P.b}</p>
      <aside className="lk-margin"><Pic src="stage-1-mecca" cap="מכה" /></aside>
      <p>{P.road}</p><p>{P.tribes}</p>
      <p>{P.flight}</p><p>{P.invited}</p>
      <h3>ארבע קבוצות אנשים</h3>
      <p>{P.ansar}</p><p>{P.four}</p>
      <ul className="lk-list"><li><b>{N.g1}</b> {P.g1}</li><li><b>{N.g2}</b> {P.g2}</li><li>{P.g3}</li><li>{P.g4}</li></ul>
      <h3>חוזה האומה</h3>
      <aside className="lk-margin"><Pic src="stage-4-arrival" cap="שער הנווה" /></aside>
      <p>{P.pact}</p><p>{P.became}</p><p>{P.terms}</p><p>{P.jewsRights}</p><p>{P.unravel}</p><p>{P.converts}</p>
      <p>{P.hijra}</p><p>{P.meaning}</p>
      <p className="lk-echo">{P.echo1}</p><p className="lk-echo">{P.echo2}</p>
      <aside className="lk-margin"><Pic src="stage-5-yard" cap="החצר" /></aside>
      <p>{P.camel}</p><p>{P.sign}</p><p>{P.built}</p>
    </article>
  )
}

/* ---------- 5 · כרטיסי נושא ---------- */
function Grid() {
  const Card = ({ head, pic, children }: { head: string; pic?: string; children: React.ReactNode }) => (
    <section className="lk-card">
      {pic && <Pic src={pic} />}
      <h3>{head}</h3>
      {children}
    </section>
  )
  return (
    <article>
      <Title />
      <div className="lk-grid">
        <Card head="שתים־עשרה שנים" pic="stage-1-mecca"><p>{P.a}</p><p>{P.b}</p></Card>
        <Card head="הדרך לית׳רב" pic="stage-2-road"><p>{P.road}</p><p>{P.tribes}</p></Card>
        <Card head="בריחה או הזמנה" pic="stage-3-night"><p>{P.flight}</p><p>{P.invited}</p></Card>
        <Card head="ארבע קבוצות" pic="stage-4-arrival">
          <p>{P.ansar}</p><p>{P.four}</p>
          <ul className="lk-list"><li><b>{N.g1}</b> {P.g1}</li><li><b>{N.g2}</b> {P.g2}</li><li>{P.g3}</li><li>{P.g4}</li></ul>
        </Card>
        <Card head="חוזה האומה" pic="yathrib-oasis"><p>{P.pact}</p><p>{P.became}</p><p>{P.terms}</p><p>{P.jewsRights}</p><p>{P.unravel}</p><p>{P.converts}</p></Card>
        <Card head="ההגירה כמושג"><p>{P.hijra}</p><p>{P.meaning}</p><p className="lk-echo">{P.echo1}</p><p className="lk-echo">{P.echo2}</p></Card>
        <Card head="הגמל והמסגד" pic="stage-5-yard"><p>{P.camel}</p><p>{P.sign}</p><p>{P.built}</p></Card>
      </div>
    </article>
  )
}
