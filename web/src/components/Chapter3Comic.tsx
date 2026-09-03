'use client'

/* Chapter 3 — ראשית חיי מוחמד, as a comic you turn.

   THE CHAPTER USED TO BE AN ARTICLE. It is now a book of 75 panels over 37
   landscape pages, and the reasoning for every part of that shape is recorded
   in concept/chapter3/STRUCTURE-COMIC.md and in the mockup builder it came
   from. What matters here:

     · NO SENTENCE OF THE CHAPTER IS WRITTEN IN THIS FILE. Every caption comes
       from beats.json, every panel placement from panels75.json. UI strings —
       an aria-label, the page counter — are this file's to write.
     · The eight verbatim quotations (Quranic verses and the three lines of
       direct speech) are marked `v` in the data and carry the gold card. They
       are never reworded; concept/chapter3/verify-beats.mjs checks them
       against SOURCE-TEXT.md on every run.
     · Reading is RTL: the right-hand page is the earlier one, the panel number
       runs with the story, and the LEFT arrow moves forward.

   ⚠ TWO TRAPS THAT COST THIS BUILD REAL TIME, RECORDED SO THEY ARE NOT REPEATED:
     1. `perspective` and `transform: scale()` must never sit on the same
        element — the scale is applied after the 3-D projection and skews the
        page turn. The book is sized in real pixels instead.
     2. A turning leaf needs TWO faces. With one face and
        backface-visibility:hidden the page vanishes at ninety degrees. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import beatsData from '@/lib/chapter3/beats.json'
import panelsData from '@/lib/chapter3/panels75.json'
import { markContentComplete } from '@/lib/chapter3/progress'

interface Beat { s: string; t: string; v?: boolean }
interface Panel {
  id: string
  part: string
  epilogue?: boolean
  grid: 'six' | 'nine' | 'splash'
  beats: Beat[]
  assetId: string
}
const PANELS = (panelsData as unknown as { panels: Panel[] }).panels
const PARTS = (beatsData as unknown as { parts: { title: string }[] }).parts

/* ---------------- page templates ----------------
   Landscape pages: one or two panels each, and one shape per page carries a
   panel larger than its neighbour so the eye is told what matters. */
type Tpl = { n: number; css: string; areas: string[] }
const T: Record<string, Tpl> = {
  duo: { n: 2, css: 'grid-template-columns:1fr 1fr;grid-template-rows:1fr;',
         areas: ['1/1/2/2', '1/2/2/3'] },
  wide2: { n: 2, css: 'grid-template-columns:1.5fr 1fr;grid-template-rows:1fr;',
           areas: ['1/1/2/2', '1/2/2/3'] },
  stack3: { n: 3, css: 'grid-template-columns:1.4fr 1fr;grid-template-rows:1fr 1fr;',
            areas: ['1/1/3/2', '1/2/2/3', '2/2/3/3'] },
  /* the epilogue is the one page shape with no emphasis anywhere — §§4–6 are
     not narrative, and a rigid even row is what that material is */
  rigid3: { n: 3, css: 'grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr;',
            areas: ['1/1/2/2', '1/2/2/3', '1/3/2/4'] },
  splash: { n: 1, css: 'grid-template-columns:1fr;grid-template-rows:1fr;', areas: ['1/1/2/2'] },
}

interface Leaf { t: string; ps: Panel[] }
function paginate(): Leaf[] {
  const leaves: Leaf[] = []
  const rotation = ['duo', 'wide2', 'stack3', 'duo', 'wide2', 'duo']
  let i = 0
  let r = 0
  while (i < PANELS.length) {
    const p = PANELS[i]
    if (p.grid === 'splash') { leaves.push({ t: 'splash', ps: [p] }); i++; continue }
    if (p.epilogue) {
      const run: Panel[] = []
      while (i < PANELS.length && PANELS[i].epilogue) run.push(PANELS[i++])
      for (let k = 0; k < run.length; k += 3) leaves.push({ t: 'rigid3', ps: run.slice(k, k + 3) })
      continue
    }
    let name = rotation[r++ % rotation.length]
    const run: Panel[] = []
    while (run.length < T[name].n && i < PANELS.length &&
           PANELS[i].grid !== 'splash' && !PANELS[i].epilogue) run.push(PANELS[i++])
    if (run.length < T[name].n) name = run.length >= 2 ? 'duo' : 'splash'
    leaves.push({ t: name, ps: run })
  }
  return leaves
}

/** the panel's place in the STORY — never its place in the render, which is
    paginated out of order (page 2 is built before page 1, on the cover's back) */
const ORDER = new Map(PANELS.map((p, k) => [p.id, k + 1]))

function PanelView({ p, area }: { p: Panel; area: string }) {
  return (
    <figure className="c3-pn" style={{ gridArea: area }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/assets/chapter3/comic/${p.assetId}.jpg`} alt="" aria-hidden="true"
           loading="lazy" decoding="async" />
      <span className="c3-num" aria-hidden="true">{ORDER.get(p.id)}</span>
      <div className="c3-boxes">
        {p.beats.map((b, k) => (
          <div className={'c3-box' + (b.v ? ' is-verse' : '')} key={k}>{b.t}</div>
        ))}
      </div>
    </figure>
  )
}

function PageView({ leaf, folio }: { leaf: Leaf | null; folio: number }) {
  if (!leaf) return <div className="c3-page is-blank" />
  const tpl = T[leaf.t]
  const oneScene = new Set(leaf.ps.map((p) => p.part)).size === 1
  return (
    <div className="c3-page">
      <div className={'c3-grid' + (oneScene ? ' is-tight' : ' is-loose')}
           style={{ gridTemplateColumns: '', ...cssOf(tpl.css) }}>
        {leaf.ps.map((p, k) => <PanelView p={p} area={tpl.areas[k]} key={p.id} />)}
      </div>
      <span className="c3-folio">{folio}</span>
    </div>
  )
}
/** the template's grid declaration, as a style object */
function cssOf(css: string): React.CSSProperties {
  const out: Record<string, string> = {}
  for (const rule of css.split(';')) {
    const [k, v] = rule.split(':')
    if (!k || !v) continue
    out[k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v.trim()
  }
  return out as React.CSSProperties
}

export default function Chapter3Comic() {
  const router = useRouter()
  const leaves = useMemo(paginate, [])
  const bookRef = useRef<HTMLDivElement | null>(null)
  const [at, setAt] = useState(0)

  /* SHEETS. After n turns the reader sees sheet[n-1]'s BACK on the left and
     sheet[n]'s FRONT on the right, and in an RTL book the right page is the
     earlier one. So page 1 is the front of the sheet under the cover, and
     page 2 rides on the COVER'S BACK — which is what an inside front cover is
     for, and is why no blank page opens the book. */
  const sheets = useMemo(() => {
    const page = (n: number) => (leaves[n] ? { leaf: leaves[n], folio: n + 1 } : null)
    const out: { front: 'cover' | ReturnType<typeof page>; back: ReturnType<typeof page> }[] =
      [{ front: 'cover', back: page(1) }]
    for (let k = 1; k * 2 - 2 < leaves.length; k++) {
      out.push({ front: page(2 * k - 2), back: page(2 * k + 1) })
    }
    return out
  }, [leaves])

  const turn = useCallback((d: number) => {
    setAt((v) => Math.min(Math.max(v + d, 0), sheets.length - 1))
  }, [sheets.length])

  /* the page is sized in real pixels; nothing is transform-scaled */
  useEffect(() => {
    const fit = () => {
      const book = bookRef.current
      if (!book) return
      const availW = window.innerWidth - 150
      const availH = window.innerHeight - 56 - 52
      const ASPECT = 1380 / 500          /* two landscape pages side by side */
      const w = Math.min(availW, Math.round(availH * ASPECT))
      const h = Math.round(w / ASPECT)
      book.style.width = `${at === 0 ? Math.round(w / 2) : w}px`
      book.style.height = `${h}px`
      /* one unit for every measurement inside the page */
      book.style.setProperty('--u', String(h / 500))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [at])

  /* RTL: the LEFT arrow moves forward, because forward is leftward */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') turn(1)
      else if (e.key === 'ArrowRight') turn(-1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [turn])

  /* reaching the last page records the READING; the chapter itself is
     completed by the closing practice, which is the only place that writes
     islam:chapter:3 = done */
  useEffect(() => {
    if (at >= sheets.length - 1) markContentComplete()
  }, [at, sheets.length])

  const atEnd = at >= sheets.length - 1

  return (
    <div className="c3-shell">
      <header className="chapter-site-header c3-head">
        <button type="button" className="c3-home" onClick={() => router.push('/chapters')}>
          אסלאם · דת ותרבות
        </button>
        <span className="c3-title">03 · ראשית חיי מוחמד</span>
      </header>

      <div className="c3-stage">
        <div className={'c3-book' + (at === 0 ? ' is-closed' : '')} ref={bookRef}>
          <div className="c3-under" aria-hidden="true">
            <span className="c3-half is-l" /><span className="c3-half is-r" />
          </div>
          {sheets.map((s, i) => (
            <div className={'c3-sheet' + (i < at ? ' is-turned' : '')} key={i}
                 style={{ zIndex: i < at ? i + 1 : sheets.length - i }}
                 onClick={() => turn(1)}>
              <div className="c3-face is-front">
                {s.front === 'cover'
                  ? <Cover />
                  : <PageView leaf={s.front?.leaf ?? null} folio={s.front?.folio ?? 0} />}
              </div>
              <div className="c3-face is-back">
                <PageView leaf={s.back?.leaf ?? null} folio={s.back?.folio ?? 0} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="c3-arrow is-next" onClick={() => turn(1)}
              disabled={atEnd} aria-label="העמוד הבא">‹</button>
      <button className="c3-arrow is-prev" onClick={() => turn(-1)}
              disabled={at === 0} aria-label="העמוד הקודם">›</button>

      <div className="c3-foot">
        <span className="c3-count">
          {at === 0 ? 'לחצו לפתיחה' : `${Math.min(at * 2, leaves.length)} / ${leaves.length}`}
        </span>
        {atEnd && (
          <Link className="c3-practice" href="/chapter3/practice">לתרגול המסכם</Link>
        )}
      </div>
    </div>
  )
}

function Cover() {
  return (
    <div className="c3-cover">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/chapter3/comic/cover.jpg" alt="" aria-hidden="true" />
      <div className="c3-cover-type">
        <div className="c3-eyebrow">פרק שלישי</div>
        <h1 className="c3-cover-title">ראשית חיי מוחמד</h1>
        <div className="c3-cover-rule" />
      </div>
      <div className="c3-cover-foot">
        {PARTS.length} חלקים · {PANELS.length} פאנלים
      </div>
    </div>
  )
}
