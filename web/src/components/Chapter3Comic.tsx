'use client'

/* Chapter 3 — ראשית חיי מוחמד, as a book you turn.

   ONE PAGE HOLDS ONE PICTURE, and that is a measurement, not a taste. Every
   picture in this chapter was painted 4:3. The previous build cut each
   landscape page into two or three columns, so a 4:3 painting was poured into a
   frame of ratio 0.46–0.70 and `object-fit:cover` threw away up to 58% of its
   width — the elephant lost its head, the army lost its ranks. An audit of all
   75 panels put the median caption over 13% of its picture and the worst over
   45%, with boxes crossing the panel border and captions running to eight
   lines in a 114px column.

   Both faults have one cause: the page did not have the shape of its art. So
   the page is now 690×620 and its picture is 690×517, which is 4:3 exactly —
   nothing is cropped — and the narration lives UNDER the picture on paper,
   where it can never cover anything.

     · NO SENTENCE OF THE CHAPTER IS WRITTEN IN THIS FILE. Every word comes from
       comic.json, which concept/chapter3/sync-comic.mjs builds from the
       manifest. UI strings — an aria-label, the page counter — are this file's.
     · FOUR VOICES, and the data says which is which (see sync-comic.mjs):
       the narrator's band, the dated stamp, the gold verse card, and a speech
       balloon WHOSE TAIL LEAVES THE PANEL — because the two who speak in this
       book, Muhammad and Gabriel, are never drawn.
     · Reading is RTL: the right-hand page is the earlier one, and the LEFT
       arrow moves forward.

   ⚠ TWO TRAPS THAT COST THIS BUILD REAL TIME, RECORDED SO THEY ARE NOT REPEATED:
     1. `perspective` and `transform: scale()` must never sit on the same
        element — the scale is applied after the 3-D projection and skews the
        page turn. The book is sized in real pixels instead.
     2. A turning leaf needs TWO faces. With one face and
        backface-visibility:hidden the page vanishes at ninety degrees. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import comicData from '@/lib/chapter3/comic.json'
import { markContentComplete } from '@/lib/chapter3/progress'

interface Beat { t: string; s: string; k?: 'v' | 'say' | 'time' }
interface Page { a: string; p: number; e?: number; b: Beat[]; m: string; c: string; peak?: number }
interface Part { title: string; first: number }
const PAGES = (comicData as unknown as { pages: Page[] }).pages
const PARTS = (comicData as unknown as { parts: Part[] }).parts
/* folio → the part that opens on it */
const OPENS = new Map(PARTS.map((p, i) => [p.first, i]))

/* THE MOTION LAYER.
   `live`  — this page is one of the two the reader is looking at. Only these
             two carry the drifting layers, so the book animates two pages at a
             time and never seventy-eight.
   `fresh` — the turn has finished and this page has just arrived. It runs the
             entrance once. It is deliberately NOT the same flag as `live`: a
             page being turned AWAY from must keep its text on screen for the
             whole rotation, and tying the entrance to visibility made the
             outgoing page go blank in mid-air. */
function PageView({ page, folio, side, live, fresh }: {
  page: Page | null; folio: number; side: 'r' | 'l'; live: boolean; fresh: boolean
}) {
  if (!page) return <div className="c3-page is-blank" />
  const opens = OPENS.get(folio)
  const time = page.b.find((b) => b.k === 'time')
  const says = page.b.filter((b) => b.k === 'say')
  const verses = page.b.filter((b) => b.k === 'v')
  const caps = page.b.filter((b) => !b.k)
  return (
    <div className={'c3-page' + (page.e ? ' is-today' : '') + (caps.length ? '' : ' is-full') +
                    (side === 'r' ? ' is-recto' : '') + (live ? ' is-live' : '') +
                    (fresh ? ' is-fresh' : '') + (page.peak ? ' is-peak' : '')}
         data-m={page.m} data-c={page.c}>
      <figure className={'c3-art' + (verses.length ? ' has-verse' : '')}>
        <span className="c3-lens">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/assets/chapter3/comic/${page.a}.jpg`} alt="" aria-hidden="true"
               loading="lazy" decoding="async" />
        </span>
        {live && <><span className="c3-haze" aria-hidden="true" />
                   <span className="c3-fx" aria-hidden="true" /></>}
        {(opens !== undefined || time) && (
          <div className="c3-top">
            {opens !== undefined && (
              <div className="c3-plate">
                <span className="c3-plate-n">{String(opens + 1).padStart(2, '0')}</span>
                <span className="c3-plate-t">{PARTS[opens].title}</span>
              </div>
            )}
            {time && <span className="c3-stamp">{time.t}</span>}
          </div>
        )}
        {says.map((b, k) => (
          <p className="c3-say" key={k}>{b.t}</p>
        ))}
        {verses.map((b, k) => (
          <p className="c3-verse" key={k}>{b.t}</p>
        ))}
      </figure>
      {caps.length > 0 && (
        <div className="c3-band">
          {caps.map((b, k) => <p className="c3-cap" key={k}>{b.t}</p>)}
        </div>
      )}
      <span className="c3-folio">{folio}</span>
    </div>
  )
}

export default function Chapter3Comic() {
  const router = useRouter()
  const bookRef = useRef<HTMLDivElement | null>(null)
  const [at, setAt] = useState(0)
  const [drawer, setDrawer] = useState(false)
  /* the sheet currently in motion. It must sit ABOVE the stack for the whole
     rotation: given its resting z-index the moment the turn starts, it spends
     the first ninety degrees behind the unturned sheets and simply vanishes,
     then reappears on the left — which reads as a glitch, not a page. */
  const [moving, setMoving] = useState(-1)

  /* SHEETS. After n turns the reader sees sheet[n-1]'s BACK on the left and
     sheet[n]'s FRONT on the right, and in an RTL book the right page is the
     earlier one. So folio 1 is the front of the sheet under the cover, and
     folio 2 rides on the COVER'S BACK — which is what an inside front cover is
     for, and is why no blank page opens the book. */
  const sheets = useMemo(() => {
    const page = (n: number) => (PAGES[n] ? { page: PAGES[n], folio: n + 1 } : null)
    const out: { front: 'cover' | ReturnType<typeof page>; back: ReturnType<typeof page> }[] =
      [{ front: 'cover', back: page(1) }]
    for (let k = 1; k * 2 - 2 < PAGES.length; k++) {
      out.push({ front: page(2 * k - 2), back: page(2 * k + 1) })
    }
    return out
  }, [])

  /* WHERE THE CLOSING LEAF GOES. The last sheet is never turned — its front is
     the last page — so its back is never seen. The leaf the reader actually
     ends on is the back of the sheet BEFORE it, which is the first back with no
     page on it. Putting the ending on the last sheet left the reader staring at
     a blank left page with the ending hidden behind the one leaf the book will
     not turn. */
  const endAt = useMemo(() => sheets.findIndex((s) => !s.back), [sheets])

  const TURN_MS = 800
  const goTo = useCallback((n: number) => {
    setAt((v) => {
      const t = Math.min(Math.max(n, 0), sheets.length - 1)
      if (t !== v) setMoving(t > v ? v : t)
      return t
    })
  }, [sheets.length])
  const turn = useCallback((d: number) => setAt((v) => {
    const n = Math.min(Math.max(v + d, 0), sheets.length - 1)
    if (n !== v) setMoving(d > 0 ? v : n)
    return n
  }), [sheets.length])

  useEffect(() => {
    if (moving < 0) return
    const t = setTimeout(() => setMoving(-1), TURN_MS)
    return () => clearTimeout(t)
  }, [moving])

  /* the page is sized in real pixels; nothing is transform-scaled */
  useEffect(() => {
    const fit = () => {
      const book = bookRef.current
      if (!book) return
      const narrow = window.innerWidth < 860
      const availW = window.innerWidth - (narrow ? 12 : 132)
      const availH = window.innerHeight - 56 - 46
      const ASPECT = 1380 / 620          /* two landscape pages side by side */
      /* ON A PHONE THE SPREAD IS SIZED BY HEIGHT AND PANNED ACROSS.
         Fitting a spread of ratio 2.23 into 390px of width leaves a book 137px
         tall with 3.6px captions — measured, not guessed. So the narrow layout
         gives the spread the full height it wants, lets it be wider than the
         screen, and the reader pans across it the way you would tilt a real
         book. The page turn itself is untouched. */
      let w = narrow ? Math.round(availH * ASPECT) : Math.min(availW, Math.round(availH * ASPECT))
      let h = Math.round(w / ASPECT)
      /* the closed book is one leaf, so it is fitted as one leaf */
      if (at === 0) {
        w = Math.min(w / 2, availW)
        h = Math.min(Math.round(w / (690 / 620)), availH)
        w = Math.round(h * (690 / 620))
      }
      book.style.width = `${Math.round(w)}px`
      book.style.height = `${h}px`
      /* one unit for every measurement inside the page */
      book.style.setProperty('--u', String(h / 620))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [at])

  /* RTL: the LEFT arrow moves forward, because forward is leftward */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDrawer(false); return }
      if (e.key === 'ArrowLeft') turn(1)
      else if (e.key === 'ArrowRight') turn(-1)
      else if (e.key === 'Home') goTo(0)
      else if (e.key === 'End') goTo(sheets.length - 1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [turn, goTo, sheets.length])

  /* reaching the last page records the READING; the chapter itself is
     completed by the closing practice, which is the only place that writes
     islam:chapter:3 = done */
  useEffect(() => {
    if (at >= sheets.length - 1) markContentComplete()
  }, [at, sheets.length])

  const atEnd = at >= sheets.length - 1

  const onStage = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a,button')) return
    const r = bookRef.current?.getBoundingClientRect()
    if (!r) return
    turn(at === 0 || e.clientX < (r.left + r.right) / 2 ? 1 : -1)
  }, [at, turn])
  const shown = at === 0 ? 0 : Math.min(at * 2, PAGES.length)
  /* the part the reader is standing in, by the later of the two open folios */
  const partNow = PARTS.reduce((acc, p, i) => (p.first <= Math.max(shown, 1) ? i : acc), 0)

  /* the two folios the reader is looking at: the right leaf is 2·at−1 and the
     left leaf 2·at, which is the whole of what the motion layer runs on */
  const openNow = at === 0 ? [] : [at * 2 - 1, at * 2]
  const settled = moving < 0

  /* THE POINTER MOVES THE LAYERS AGAINST EACH OTHER. Two numbers, written on
     the book once per frame; every layer reads them and multiplies them by its
     own depth, so the picture, the atmosphere and the motes travel at three
     different speeds. Written straight to the element rather than through
     state — a re-render per mouse move would re-render 39 sheets. */
  /* a turn puts the reader back at the start of the new spread, which on a
     panned narrow screen is the RIGHT edge — folio 2·at−1, the earlier page */
  const stageRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => { if (stageRef.current) stageRef.current.scrollLeft = 0 }, [at])

  const raf = useRef(0)
  const onMove = useCallback((e: React.PointerEvent) => {
    if (raf.current) return
    const x = e.clientX, y = e.clientY
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const book = bookRef.current
      if (!book) return
      book.style.setProperty('--px', String(((x / window.innerWidth) * 2 - 1).toFixed(3)))
      book.style.setProperty('--py', String(((y / window.innerHeight) * 2 - 1).toFixed(3)))
    })
  }, [])
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])

  /* THE FOUR PAGES THE CHAPTER TURNS ON. Nothing about the page itself changes
     — the room around the book does: the stage takes the colour of the picture
     the reader has just arrived at. */
  const peak = settled ? openNow.map((f) => PAGES[f - 1]).find((p) => p?.peak) : undefined

  return (
    <div className="c3-shell">
      <header className="chapter-site-header">
        <div className="chapter-site-header-inner">
          <div className="chapter-hdr-start">
            <button
              type="button"
              className="chapter-burger"
              aria-label="פתיחת תפריט הפרק"
              aria-controls="chapter-menu"
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16" /></svg>
            </button>
            <button type="button" className="chapter-logo" onClick={() => router.push('/chapters')}
                    aria-label="חזרה לעמוד הפרקים">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo-cream.png" alt="אסלאם" />
            </button>
          </div>
          {/* the article's search field has no meaning in a book whose pages are
              turned rather than scrolled; the reader's place stands in for it */}
          <div className="c3-place">
            <span className="c3-place-part">{PARTS[partNow].title}</span>
            <span className="c3-place-n">
              {at === 0 ? 'הכריכה' : `${shown} מתוך ${PAGES.length}`}
            </span>
            <span className="c3-place-bar" aria-hidden="true">
              <i style={{ transform: `scaleX(${shown / PAGES.length})` }} />
            </span>
          </div>
        </div>
      </header>

      <aside id="chapter-menu" className={'chapter-drawer c3-drawer' + (drawer ? ' is-open' : '')}
             aria-label="תפריט הפרק" aria-hidden={!drawer ? true : undefined} inert={!drawer}>
        <div className="menu-head">
          <button type="button" className="menu-close" aria-label="סגירת התפריט"
                  onClick={() => setDrawer(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
                 strokeWidth={1.9} strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          <h2 className="menu-title">תוכן הפרק</h2>
          <span className="menu-sub">פרק 3 · ראשית חיי מוחמד</span>
        </div>
        <nav className="chapter-menu-nav" aria-label="ניווט בפרק">
          <ol>
            {PARTS.map((part, i) => (
              <li key={part.title}>
                <a href={`#p${part.first}`}
                   className={i === partNow && at > 0 ? 'is-current' : undefined}
                   aria-current={i === partNow && at > 0 ? 'true' : undefined}
                   onClick={(e) => {
                     e.preventDefault()
                     /* folio f sits on sheet ceil(f/2) — turning to it opens the
                        spread that carries it */
                     goTo(Math.ceil(part.first / 2))
                     setDrawer(false)
                   }}>
                  <span className="menu-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="menu-label">{part.title}</span>
                  <span className="menu-folio">{part.first}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="menu-extra">
          <Link className="menu-x-item" href="/chapter3/practice" onClick={() => setDrawer(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
                 strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            לתרגול המסכם
          </Link>
          <Link className="menu-x-item" href="/chapters" onClick={() => setDrawer(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
                 strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            לכל פרקי הלמידה
          </Link>
        </div>
      </aside>
      {drawer && <div className="chapter-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}

      {/* CLICKING THE PAPER TURNS IT. The direction comes from where the click
          landed: in an RTL book the left leaf carries you forward and the right
          leaf back. It lives on the stage rather than on two overlay buttons
          because an overlay would have to sit above the sheets, and then it
          would swallow the one link the book contains. */}
      <div className={'c3-stage' + (peak ? ' is-peak' : '')} ref={stageRef} onClick={onStage} onPointerMove={onMove}>
        <div className={'c3-scene' + (peak ? ' is-on' : '')} aria-hidden="true"
             style={peak ? { backgroundImage: `url(/assets/chapter3/comic/${peak.a}.jpg)` } : undefined} />
        <div className={'c3-book' + (at === 0 ? ' is-closed' : '')} ref={bookRef}>
          <div className="c3-under" aria-hidden="true">
            <span className="c3-half is-l" /><span className="c3-half is-r" />
          </div>
          {sheets.map((s, i) => (
            <div className={'c3-sheet' + (i < at ? ' is-turned' : '')} key={i}
                 style={{ zIndex: i === moving ? sheets.length + 5 : i < at ? i + 1 : sheets.length - i }}>
              <div className="c3-face is-front">
                {s.front === 'cover'
                  ? <Cover />
                  : <PageView page={s.front?.page ?? null} folio={s.front?.folio ?? 0} side="r"
                              live={openNow.includes(s.front?.folio ?? -1)}
                              fresh={settled && openNow.includes(s.front?.folio ?? -1)} />}
              </div>
              <div className="c3-face is-back">
                {i === endAt
                  ? <EndPage />
                  : <PageView page={s.back?.page ?? null} folio={s.back?.folio ?? 0} side="l"
                              live={openNow.includes(s.back?.folio ?? -1)}
                              fresh={settled && openNow.includes(s.back?.folio ?? -1)} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="c3-arrow is-next" onClick={() => turn(1)}
              disabled={atEnd} aria-label="העמוד הבא">
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
             strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 5l-7 7 7 7" /></svg>
      </button>
      <button className="c3-arrow is-prev" onClick={() => turn(-1)}
              disabled={at === 0} aria-label="העמוד הקודם">
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
             strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 5l7 7-7 7" /></svg>
      </button>

    </div>
  )
}

/* the leaf that follows the last page. A book ends on a blank verso; a
   screen that does so looks unfinished, and this is also the one place the
   reader is meant to be handed on to the practice. */
function EndPage() {
  return (
    <div className="c3-page is-end">
      <div className="c3-end">
        <span className="c3-end-mark" aria-hidden="true" />
        <p className="c3-end-t">סוף הפרק</p>
        <p className="c3-end-s">ראשית חיי מוחמד · {PAGES.length} עמודים</p>
        <Link className="c3-end-go" href="/chapter3/practice">לתרגול המסכם</Link>
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
        {PARTS.length} חלקים · {PAGES.length} עמודים · לחצו לפתיחה
      </div>
    </div>
  )
}
