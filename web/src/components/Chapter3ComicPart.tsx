'use client'

/* ONE PART OF THE BOOK, SET INSIDE THE ARTICLE — section 05, ההתגלות הראשונה.

   THIS IS THE COMIC ITSELF, NOT A LOOKALIKE. The two builds before it were
   article devices wearing the comic's pictures — one frame and a caption, then
   a picture beside a column of words — and both came back as „זה לא קומיקס".
   What makes the book a comic is its page: panels in tiers read right to left,
   gutters of bare paper, lettering boxes inside the frames, speech balloons, the
   gold verse card, and a leaf that turns. So this file draws none of that
   itself. It takes `PageView` from Chapter3Comic.tsx and the c3- sheet
   unchanged, and only builds the part that differs: a book that sits in a
   column instead of filling a screen.

   THE SCRIPT IS ITS OWN — revelation-comic.json / night-comic.json, not a cut
   of comic.json. The
   book's cut of this part came back as „לא מובן — הסדר והתוכן", with „יותר
   סיפורי, וכל המקטע כלול" (see the file's $note). Every line carries its §,
   condensed the way lettering is; the source's own sentences for §17–§23 stay
   on the page verbatim in the fold-out under the book (Chapter3.tsx), which is
   where the gate and the chapter search find them.

   ⚠ THE LEAVES TURN THE HEBREW WAY — AND THE BOOK'S DO NOT. In a Hebrew book
   the reader finishes the right page, then the left, and turns the LEFT leaf
   over to the RIGHT. The book (Chapter3Comic.tsx) hinges its leaves on the
   right half and swings them leftward, which is how an English book turns:
   the page just read flips away and the reader clicks the RIGHT half to go on.
   Sent back here as „rtl". So this file builds its own leaves:

     · page 1 is a fixed base on the right half — the first right-hand page;
     · leaf k lies on the LEFT half, hinged at the spine: its front is the left
       page of spread k (page 2k+2), its back the right page of spread k+1
       (page 2k+3);
     · turning leaf k swings it over to the right, where its back becomes the
       new right-hand page and leaf k+1's front is uncovered on the left.

   `at` is the spread, 0-based. Clicking the LEFT half, the „לדף הבא" button
   (on the left) and ← all go forward — one decision, the way the page moves. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PageView, type Page } from '@/components/Chapter3Comic'
import { useFindHit } from '@/lib/chapter3/useFindHit'

const TURN_MS = 800
/* two 690×900 comic pages side by side */
const ASPECT = 1380 / 900

/** `script` is one of lib/chapter3/*-comic.json — section 05's revelation and
    section 08's night journey run on this one book. */
export default function ComicPart({ script }: { script: { pages: unknown[] } }) {
  /* THE PAGES ARE WRITTEN OUT, NOT PAGINATED. The book's own pagination cut
     this part as numbers 24–34, split sentences into loose boxes and paired a
     three-caption panel into half a tier; returned as „לא מובן — הסדר והתוכן".
     The script (revelation-comic.json) sets each page by hand: ten panels in
     the order things happened, the vision and the refusal together, the verse
     on a page of its own. */
  const pages = script.pages as unknown as Page[]

  const spreads = Math.ceil(pages.length / 2)
  const leaves = useMemo(() => {
    const leaf = (i: number) => (pages[i] ? { page: pages[i], folio: i + 1 } : null)
    return Array.from({ length: spreads }, (_, k) => ({ front: leaf(2 * k + 1), back: leaf(2 * k + 2) }))
  }, [pages, spreads])

  const last = spreads - 1
  const [at, setAt] = useState(0)
  const [moving, setMoving] = useState(-1)
  /* the leaf in motion rides above the stack for the whole turn — the book's
     own lesson: at its resting z-index it vanishes behind the others mid-way */
  const goTo = useCallback((n: number) => setAt((v) => {
    const t = Math.min(Math.max(n, 0), last)
    if (t !== v) setMoving(t > v ? v : t)
    return t
  }), [last])
  const turn = useCallback((d: number) => setAt((v) => {
    const t = Math.min(Math.max(v + d, 0), last)
    if (t !== v) setMoving(d > 0 ? v : t)
    return t
  }), [last])
  useEffect(() => {
    if (moving < 0) return
    const t = setTimeout(() => setMoving(-1), TURN_MS)
    return () => clearTimeout(t)
  }, [moving])

  /* SIZED TO THE COLUMN, CAPPED BY THE SCREEN. The book is as wide as the
     prose above and below it; on a short, wide screen it is held to the height
     that fits under the site header, so a whole spread is always in view at
     once. Real pixels, as in the book — `perspective` and `scale()` must never
     share an element. */
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [pan, setPan] = useState(false)
  const bookRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const fit = () => {
      const wrap = wrapRef.current, book = bookRef.current
      if (!wrap || !book) return
      const availW = wrap.clientWidth
      const availH = window.innerHeight - 56 - 120
      let w = Math.min(availW, Math.round(availH * ASPECT))
      let h = Math.round(w / ASPECT)
      /* A NARROW COLUMN PANS INSTEAD OF SHRINKING — the book's own answer on a
         phone. Fitted to 712px of column, a spread came out at u 0.52 and the
         lettering at 8px. Below u 0.62 the spread keeps a readable height, is
         wider than the column, and the reader slides across it. */
      const pan = h / 900 < 0.62
      if (pan) {
        h = Math.max(420, Math.min(availH, 620))
        w = Math.round(h * ASPECT)
      }
      setPan(pan)
      book.style.width = `${w}px`
      book.style.height = `${h}px`
      book.style.setProperty('--u', String(h / 900))
    }
    fit()
    const ro = new ResizeObserver(fit)
    if (wrapRef.current) ro.observe(wrapRef.current)
    window.addEventListener('resize', fit)
    return () => { ro.disconnect(); window.removeEventListener('resize', fit) }
  }, [])

  /* RTL, as in the book: ← goes forward, → back. Only while the book has focus
     — in an article the arrow keys belong to the page until the reader is in
     the comic. */
  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') turn(1)
    else if (e.key === 'ArrowRight') turn(-1)
    else return
    e.preventDefault()
  }, [turn])

  /* clicking the paper turns it, by the half it landed on: the LEFT half is
     the leaf you take hold of in a Hebrew book, so it goes forward */
  const onStage = useCallback((e: React.MouseEvent) => {
    const r = bookRef.current?.getBoundingClientRect()
    if (!r) return
    turn(e.clientX < (r.left + r.right) / 2 ? 1 : -1)
  }, [turn])

  /* A SEARCH HIT ON A PAGE THAT IS NOT SHOWING TURNS THE BOOK TO IT. The base
     is spread 0; leaf k's front is on the left of spread k, its back on the
     right of spread k+1. */
  useFindHit(wrapRef, (el) => {
    if (el.closest('.ch3-book-base')) { goTo(0); return }
    const face = el.closest('.c3-face')
    const leaf = face?.parentElement
    if (!face || !leaf?.parentElement) return
    const k = Array.from(leaf.parentElement.querySelectorAll(':scope > .c3-sheet')).indexOf(leaf)
    if (k >= 0) goTo(face.classList.contains('is-back') ? k + 1 : k)
  })

  /* a turn puts a panning reader back on the right-hand page — the earlier one,
     and scrollLeft 0 in RTL */
  useEffect(() => { if (stageRef.current) stageRef.current.scrollLeft = 0 }, [at])

  const openNow = [at * 2 + 1, at * 2 + 2]
  const shownFrom = at * 2 + 1
  const shownTo = Math.min(at * 2 + 2, pages.length)

  return (
    <div className="ch3-book" ref={wrapRef} data-reveal>
      <div className={'ch3-book-stage' + (pan ? ' is-pan' : '')} ref={stageRef} onClick={onStage} onKeyDown={onKey} tabIndex={0}
           role="group" aria-roledescription="קומיקס"
           aria-label={`עמודים ${shownFrom}–${shownTo} מתוך ${pages.length}`}>
        <div className="c3-book" ref={bookRef}>
          <div className="c3-under" aria-hidden="true">
            <span className="c3-half is-l" /><span className="c3-half is-r" />
          </div>
          <div className="ch3-book-base">
            <PageView page={pages[0]} folio={1} side="r" parts={[]} live={at === 0} />
          </div>
          {leaves.map((l, k) => (
            <div className={'c3-sheet' + (k < at ? ' is-turned' : '')} key={k}
                 style={{ zIndex: k === moving ? spreads + 5 : k < at ? k + 1 : spreads - k }}>
              <div className="c3-face is-front">
                <PageView page={l.front?.page ?? null} folio={l.front?.folio ?? 0} side="l"
                          parts={[]} live={openNow.includes(l.front?.folio ?? -1)} />
              </div>
              <div className="c3-face is-back">
                <PageView page={l.back?.page ?? null} folio={l.back?.folio ?? 0} side="r"
                          parts={[]} live={openNow.includes(l.back?.folio ?? -1)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* THE WAY THROUGH, under the book and labelled in words. The book's own
          arrows are `position:fixed` to the window's edges, which is right for a
          screen that is only a book and wrong for one block of an article. */}
      <div className="ch3-book-nav">
        <button type="button" className="ch3-book-go is-prev" onClick={() => turn(-1)}
                disabled={at === 0}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          הקודם
        </button>
        <span className="ch3-book-where" aria-hidden="true">
          כפולה {at + 1} מתוך {spreads}
        </span>
        <button type="button" className="ch3-book-go is-next" onClick={() => turn(1)}
                disabled={at === last}>
          לדף הבא
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" /></svg>
        </button>
      </div>
    </div>
  )
}
