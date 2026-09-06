'use client'

/* Chapter 3 — ראשית חיי מוחמד, as a comic you turn.

   THE PAGE IS A COMIC PAGE: framed panels in tiers, gutters of bare paper
   between them, and the narration in lettering boxes inside the frames. The
   build before this one gave each page a single full-bleed picture with a cream
   caption strip under it, on the reasoning that a 4:3 painting cannot be poured
   into a panel without losing something. It was right about the arithmetic and
   wrong about the object: without frames and gutters, two pictures touching at
   the spine read as one wide banner cut in half — a slideshow, not a comic.

   THE PAGE SHAPE IS WHAT MAKES BOTH THINGS POSSIBLE, and it is measured, not
   chosen. Every picture in this chapter was painted 4:3. On a page of 690×900 —
   the proportion of a real comic book — a tier is 650×423, which keeps 87% of
   the painting. On the landscape page it replaced, the same tier kept 53%, and
   a 2×2 grid there came out at ratio 1.12 with panels a third of the size. The
   spread is then 1.53, which fills the height of a laptop screen exactly, so
   the book is bigger as well as better cut.

     · NO SENTENCE OF THE CHAPTER IS WRITTEN IN THIS FILE. Every word comes from
       comic.json, which concept/chapter3/sync-comic.mjs builds from the
       manifest. UI strings — an aria-label, the page counter — are this file's.
     · FOUR VOICES, and the data says which is which (see sync-comic.mjs):
       the narrator's box, the dated stamp, the gold verse card, and a speech
       balloon WHOSE TAIL LEAVES THE PANEL — because the two who speak in this
       book, Muhammad and Gabriel, are never drawn.
     · Reading is RTL: the right-hand page is the earlier one and the tiers read
       top to bottom. THE RIGHT HAND TURNS THE PAGE — the right half of the
       spread, the right arrow and the right cursor key all advance, because the
       leaf you take hold of is the right-hand one and it swings leftward over
       the spine. Every one of the three was pointing the other way once; they
       are one decision and they move together.

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
interface Panel { a: string; p: number; e?: number; b: Beat[]; m: string; c: string; peak?: number; film?: number }
interface Part { title: string; first: number }
const PANELS = (comicData as unknown as { pages: Panel[] }).pages
const PARTS = (comicData as unknown as { parts: Part[] }).parts

/* ---------------- the page templates ----------------
   Tiers, because a tier is the one shape that takes a 4:3 painting without
   throwing much of it away: two tiers keep 87% of the picture, three keep 50%.
   A three-tier page is for a run of quick beats, and that is the page's pacing
   — the same device a printed comic uses. `hero` gives one panel most of the
   page and a band of bare paper under it for a verse. */
const T: Record<string, number> = { two: 2, three: 3, hero: 1 }
const ROTATION = ['two', 'three', 'two', 'two', 'three']

/* A HERO PAGE IS FOR A LONG VERSE, AND ONLY FOR ONE. The three long recitations
   — sura 96 and the two verses of the night journey — are the moments the
   chapter is built towards, and giving each of them a page is how a comic says
   so. The two SHORT verses are five words each; on a page of their own they
   left a picture stranded above an acre of blank paper, so they ride in an
   ordinary tier with the gold card on the picture, which is what a short
   quotation wants. */
const isHero = (p: Panel) =>
  (p.b.find((b) => b.k === 'v')?.t.split(/\s+/).length ?? 0) > 8

interface Page { t: string; ps: Panel[] }
function paginate(): Page[] {
  const out: Page[] = []
  let i = 0
  let r = 0
  while (i < PANELS.length) {
    if (isHero(PANELS[i])) { out.push({ t: 'hero', ps: [PANELS[i++]] }); continue }
    const name = ROTATION[r++ % ROTATION.length]
    const run: Panel[] = []
    const epi = !!PANELS[i].e
    while (run.length < T[name] && i < PANELS.length &&
           !!PANELS[i].e === epi && !isHero(PANELS[i])) run.push(PANELS[i++])
    out.push({ t: run.length === T[name] ? name : run.length >= 2 ? 'two' : 'hero', ps: run })
  }
  return out
}

/* WHERE EACH LETTERING BOX SITS, and it depends on how many there are.
   With two boxes the RTL Z is right: top right, then bottom left, and the eye
   crosses the picture. With THREE it is wrong — a reader takes the two bottom
   boxes right to left, so a third box at the bottom right is read BEFORE the
   one at the bottom left and the sentences arrive out of order. Three boxes
   therefore run top-right, bottom-right, bottom-left, which is both a reading
   order and a shape. */
const SLOTS: Record<number, string[]> = {
  1: ['is-tr'],
  2: ['is-tr', 'is-bl'],
  3: ['is-tr', 'is-br', 'is-bl'],
}

/* THE MOTION LAYER.
   `live`  — this page is one of the two the reader is looking at. Only these
             carry the drifting layers, so the book animates a handful of panels
             and never all of them at once.
   THE LETTERING NEVER ANIMATES. It is ink on the same sheet as the drawing, so
   it cannot arrive after it; a staged entrance read as a slideshow build. The
   page turn is the animation, and what still moves is only what would move if
   the panel were a window. */
function PanelView({ panel, order, hideVerse, live }: {
  panel: Panel; order: number; hideVerse?: boolean; live: boolean
}) {
  const time = panel.b.find((b) => b.k === 'time')
  const says = panel.b.filter((b) => b.k === 'say')
  const verses = hideVerse ? [] : panel.b.filter((b) => b.k === 'v')
  const caps = panel.b.filter((b) => !b.k)
  return (
    <figure className={'c3-pn' + (verses.length ? ' has-verse' : '') + (panel.e ? ' is-today' : '')}
            data-m={panel.m} data-c={panel.c} style={{ '--i': order } as React.CSSProperties}>
      <span className="c3-lens">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/chapter3/comic/${panel.a}.jpg`} alt="" aria-hidden="true"
             loading="lazy" decoding="async" />
        {/* A FEW PANELS ARE FILMS, AND ONLY WHILE THEY ARE OPEN. The painting
            stays underneath as the poster, so a panel that has not loaded, or a
            reader who has asked for less motion, sees exactly the drawing. Only
            the live page mounts a <video>: three of these decoding behind
            seventeen sheets would cost more than the whole book. */}
        {panel.film === 1 && live && (
          <video src={`/assets/chapter3/comic/motion/${panel.a}.mp4`}
                 poster={`/assets/chapter3/comic/${panel.a}.jpg`}
                 autoPlay muted loop playsInline aria-hidden="true" />
        )}
      </span>
      <span className="c3-haze" aria-hidden="true" />
      <span className="c3-fx" aria-hidden="true" />
      {time && <span className="c3-stamp">{time.t}</span>}
      {/* the RTL Z: the first box enters at the top right and the last leaves at
          the bottom left, so the eye crosses the picture instead of sitting on
          one edge of it */}
      {caps.map((b, k) => (
        <p className={'c3-cap ' + SLOTS[caps.length][k]} key={k}>{b.t}</p>
      ))}
      {says.map((b, k) => <p className="c3-say" key={k}>{b.t}</p>)}
      {verses.map((b, k) => <p className="c3-verse" key={k}>{b.t}</p>)}
    </figure>
  )
}

function PageView({ page, folio, side, live, parts }: {
  page: Page | null; folio: number; side: 'r' | 'l'; live: boolean; parts: Part[]
}) {
  if (!page) return <div className="c3-page is-blank" />
  const opens = parts.findIndex((p) => p.first === folio)
  const peak = page.ps.some((p) => p.peak)
  /* on a hero page the verse comes out of the panel and stands on bare paper
     under it, at twice the size — a printed comic gives its one big moment the
     whole page, not a card floating in a corner of it */
  const hero = page.t === 'hero' ? page.ps[0].b.find((b) => b.k === 'v') : undefined
  return (
    <div className={'c3-page is-' + page.t + (side === 'r' ? ' is-recto' : '') +
                    (live ? ' is-live' : '') +
                    (peak ? ' is-peak' : '') + (page.ps[0]?.e ? ' is-today' : '')}>
      <div className="c3-grid">
        {page.ps.map((p, k) => (
          <PanelView panel={p} key={p.a + k} order={k} hideVerse={!!hero} live={live} />
        ))}
      </div>
      {hero && <p className="c3-hero-verse">{hero.t}</p>}
      {opens >= 0 && (
        <div className="c3-plate">
          <span className="c3-plate-n">{String(opens + 1).padStart(2, '0')}</span>
          <span className="c3-plate-t">{parts[opens].title}</span>
        </div>
      )}
      <span className="c3-folio">{folio}</span>
    </div>
  )
}

export default function Chapter3Comic() {
  const router = useRouter()
  const bookRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [at, setAt] = useState(0)
  const [drawer, setDrawer] = useState(false)
  /* the sheet currently in motion. It must sit ABOVE the stack for the whole
     rotation: given its resting z-index the moment the turn starts, it spends
     the first ninety degrees behind the unturned sheets and simply vanishes,
     then reappears on the left — which reads as a glitch, not a page. */
  const [moving, setMoving] = useState(-1)

  const pages = useMemo(() => paginate(), [])
  /* the folio a part opens on, recomputed from the pagination — a part opens on
     the PAGE that carries its first panel */
  const parts = useMemo(() => PARTS.map((part, i) => ({
    ...part,
    first: pages.findIndex((pg) => pg.ps.some((p) => p.p === i)) + 1,
  })), [pages])

  /* SHEETS. After n turns the reader sees sheet[n-1]'s BACK on the left and
     sheet[n]'s FRONT on the right, and in an RTL book the right page is the
     earlier one. So folio 1 is the front of the sheet under the cover, and
     folio 2 rides on the COVER'S BACK — which is what an inside front cover is
     for, and is why no blank page opens the book. */
  const sheets = useMemo(() => {
    const leaf = (n: number) => (pages[n] ? { page: pages[n], folio: n + 1 } : null)
    const out: { front: 'cover' | ReturnType<typeof leaf>; back: ReturnType<typeof leaf> }[] =
      [{ front: 'cover', back: leaf(1) }]
    for (let k = 1; k * 2 - 2 < pages.length; k++) {
      out.push({ front: leaf(2 * k - 2), back: leaf(2 * k + 1) })
    }
    return out
  }, [pages])

  /* WHERE THE CLOSING LEAF GOES. The last sheet is never turned — its front is
     the last page — so its back is never seen. The leaf the reader actually
     ends on is the back of the sheet BEFORE it, which is the first back with no
     page on it. */
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
      const ASPECT = 1380 / 900          /* two comic-book pages side by side */
      /* ON A PHONE THE SPREAD IS SIZED BY HEIGHT AND PANNED ACROSS. Fitting a
         whole spread into 390px of width leaves captions a few pixels tall —
         measured. The narrow layout gives the spread the height it wants, lets
         it be wider than the screen, and the reader pans across it the way you
         would tilt a real book. The page turn itself is untouched. */
      let w = narrow ? Math.round(availH * ASPECT) : Math.min(availW, Math.round(availH * ASPECT))
      let h = Math.round(w / ASPECT)
      if (at === 0) {                    /* the closed book is one leaf */
        w = Math.min(w / 2, availW)
        h = Math.min(Math.round(w / (690 / 900)), availH)
        w = Math.round(h * (690 / 900))
      }
      book.style.width = `${Math.round(w)}px`
      book.style.height = `${h}px`
      /* one unit for every measurement inside the page */
      book.style.setProperty('--u', String(h / 900))
      /* THE ARROWS BELONG TO THE BOOK, NOT TO THE WINDOW. Pinned to the window
         edge they sat 88px out in the empty parchment at 1440 and read as two
         loose buttons; put beside the leaf they read as the thing you press to
         turn it. The book is centred, so its edge is arithmetic. */
      const out = Math.max(6, Math.round((window.innerWidth - w) / 2) - 66)
      document.documentElement.style.setProperty('--c3-out', `${out}px`)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [at])

  /* the right-hand cursor key advances, with the right half and the right
     arrow — see the note at the top of the file */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDrawer(false); return }
      if (e.key === 'ArrowRight') turn(1)
      else if (e.key === 'ArrowLeft') turn(-1)
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

  /* a turn puts the reader back at the start of the new spread, which on a
     panned narrow screen is the RIGHT edge — the earlier page */
  useEffect(() => { if (stageRef.current) stageRef.current.scrollLeft = 0 }, [at])

  const atEnd = at >= sheets.length - 1
  const shown = at === 0 ? 0 : Math.min(at * 2, pages.length)
  const partNow = parts.reduce((acc, p, i) => (p.first <= Math.max(shown, 1) ? i : acc), 0)
  const openNow = at === 0 ? [] : [at * 2 - 1, at * 2]
  const settled = moving < 0

  const onStage = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a,button')) return
    const r = bookRef.current?.getBoundingClientRect()
    if (!r) return
    turn(at === 0 || e.clientX > (r.left + r.right) / 2 ? 1 : -1)
  }, [at, turn])

  /* THE POINTER MOVES THE LAYERS AGAINST EACH OTHER. Two numbers, written on
     the book once per frame; every layer reads them and multiplies them by its
     own depth, so the picture, the atmosphere and the motes travel at three
     different speeds. Written straight to the element rather than through
     state — a re-render per mouse move would re-render every sheet. */
  /* ⚠ AND IT IS WRITTEN ONTO THE SIX LIVE LAYERS, NOT INTO A CUSTOM PROPERTY ON
     THE BOOK. --px on .c3-book inherits into every .c3-lens in the document —
     seventy-five of them, seventeen sheets deep — and Chrome recomputes the lot
     on every mouse move whether or not their page is on screen. Measured: a
     single sweep across the book cost 1.5s of long tasks with the variable, and
     the layers the reader can actually see number six. So the six are collected
     whenever the spread changes and written to directly. */
  const layers = useRef<{ el: HTMLElement; mx: number; my: number }[]>([])
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) { layers.current = []; return }
    const pick = (sel: string, mx: number, my: number) =>
      [...stage.querySelectorAll<HTMLElement>('.c3-page.is-live ' + sel)].map((el) => ({ el, mx, my }))
    layers.current = [
      ...pick('.c3-lens', 4, 3),      /* the picture, nearest to still     */
      ...pick('.c3-haze', -6, -5),    /* the air in front of it            */
      ...pick('.c3-fx', -11, -9),     /* what hangs in the air, travelling most */
    ]
  }, [at, moving])

  const raf = useRef(0)
  const onMove = useCallback((e: React.PointerEvent) => {
    if (raf.current) return
    const x = e.clientX, y = e.clientY
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const book = bookRef.current
      if (!book) return
      const px = (x / window.innerWidth) * 2 - 1
      const py = (y / window.innerHeight) * 2 - 1
      for (const l of layers.current) {
        l.el.style.transform = `translate3d(${(px * l.mx).toFixed(2)}px,${(py * l.my).toFixed(2)}px,0)`
      }
      /* ⚠ THE HOVERED SIDE IS WRITTEN ONTO THE ELEMENT, NEVER INTO STATE. It was
         a useState, set from this same callback, and every mouse movement then
         re-rendered all seventeen sheets: a single sweep across the book cost
         3.45s wall clock with 2.75s of long tasks — measured. The class goes
         straight onto the stage for the same reason --px and --py do. */
      const stage = stageRef.current
      if (!stage) return
      const r = book.getBoundingClientRect()
      const s = x < (r.left + r.right) / 2 ? 'hover-l' : 'hover-r'
      if (!stage.classList.contains(s)) {
        stage.classList.remove('hover-l', 'hover-r')
        stage.classList.add(s)
      }
    })
  }, [])
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])

  /* THE SPREADS THE CHAPTER TURNS ON. Nothing about the page itself changes —
     the room around the book does: the stage takes the colour of the picture
     the reader has just arrived at. */
  const peak = settled
    ? openNow.map((f) => pages[f - 1]).flatMap((pg) => pg?.ps ?? []).find((p) => p?.peak)
    : undefined

  return (
    <div className="c3-shell">
      <header className="chapter-site-header">
        <div className="chapter-site-header-inner">
          <div className="chapter-hdr-start">
            <button type="button" className="chapter-burger" aria-label="פתיחת תפריט הפרק"
                    aria-controls="chapter-menu" aria-expanded={drawer}
                    onClick={() => setDrawer(true)}>
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
            <span className="c3-place-bar" aria-hidden="true"
                  style={{ transform: `scaleX(${shown / pages.length})` }} />
            <span className="c3-place-part">{parts[partNow].title}</span>
            <span className="c3-place-n">
              {at === 0 ? 'הכריכה' : `${shown}/${pages.length}`}
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
            {parts.map((part, i) => (
              <li key={part.title}>
                <a href={`#p${part.first}`}
                   className={i === partNow && at > 0 ? 'is-current' : undefined}
                   aria-current={i === partNow && at > 0 ? 'true' : undefined}
                   onClick={(e) => {
                     e.preventDefault()
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
      <div className={'c3-stage' + (peak ? ' is-peak' : '')}
           ref={stageRef} onClick={onStage} onPointerMove={onMove}
           onPointerLeave={(e) => e.currentTarget.classList.remove('hover-l', 'hover-r')}>
        <div className={'c3-scene' + (peak ? ' is-on' : '')} aria-hidden="true"
             style={peak ? { backgroundImage: `url(/assets/chapter3/comic/${peak.a}.jpg)` } : undefined} />
        <div className={'c3-book' + (at === 0 ? ' is-closed' : '')} ref={bookRef}>
          <div className="c3-under" aria-hidden="true">
            <span className="c3-half is-l" /><span className="c3-half is-r" />
          </div>
          <span className="c3-lift is-l" aria-hidden="true" />
          <span className="c3-lift is-r" aria-hidden="true" />
          {sheets.map((s, i) => (
            <div className={'c3-sheet' + (i < at ? ' is-turned' : '')} key={i}
                 style={{ zIndex: i === moving ? sheets.length + 5 : i < at ? i + 1 : sheets.length - i }}>
              <div className="c3-face is-front">
                {s.front === 'cover'
                  ? <Cover pages={pages.length} />
                  : <PageView page={s.front?.page ?? null} folio={s.front?.folio ?? 0} side="r"
                              parts={parts}
                              live={openNow.includes(s.front?.folio ?? -1)} />}
              </div>
              <div className="c3-face is-back">
                {i === endAt
                  ? <EndPage pages={pages.length} />
                  : <PageView page={s.back?.page ?? null} folio={s.back?.folio ?? 0} side="l"
                              parts={parts}
                              live={openNow.includes(s.back?.folio ?? -1)} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="c3-arrow is-next" onClick={() => turn(1)}
              disabled={atEnd} aria-label="העמוד הבא">
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
             strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M10 5l7 7-7 7" /></svg>
      </button>
      <button className="c3-arrow is-prev" onClick={() => turn(-1)}
              disabled={at === 0} aria-label="העמוד הקודם">
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
             strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 5l-7 7 7 7" /></svg>
      </button>
    </div>
  )
}

/* the leaf that follows the last page. A book ends on a blank verso; a screen
   that does so looks unfinished, and this is also the one place the reader is
   meant to be handed on to the practice. */
function EndPage({ pages }: { pages: number }) {
  return (
    <div className="c3-page is-end">
      <div className="c3-end">
        <span className="c3-end-mark" aria-hidden="true" />
        <p className="c3-end-t">סוף הפרק</p>
        <p className="c3-end-s">ראשית חיי מוחמד · {pages} עמודים</p>
        <Link className="c3-end-go" href="/chapter3/practice">לתרגול המסכם</Link>
      </div>
    </div>
  )
}

function Cover({ pages }: { pages: number }) {
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
        {PARTS.length} חלקים · {PANELS.length} פאנלים · {pages} עמודים
      </div>
    </div>
  )
}
