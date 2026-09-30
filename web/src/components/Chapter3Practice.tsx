'use client'

/* Chapter 3's closing practice.

   Same contract as chapter 6's: the chapter is not finished by reading it, only
   by working through this. `islam:chapter:3 = 'done'` is written here and
   nowhere else. Every board is saved as it is worked (practice-progress.ts), so
   a reload comes back to the same page.

   The questions live in practice.json with the §§ each one rests on. Two rules
   they obey: nothing is asked that the article answers by sitting next to it on
   the page (a term printed beside its gloss is not a question), and no answer
   invents a fact the source does not carry. */

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Feedback from '@/components/chapter6/summary/Feedback'
import PracticeNav from '@/components/chapter6/summary/PracticeNav'
import SlotSurface from '@/components/chapter6/summary/SlotSurface'
import Tray from '@/components/chapter6/summary/Tray'
import { usePickPlace } from '@/components/chapter6/summary/usePickPlace'
import raw from '@/lib/chapter3/practice.json'
import { CH3 } from '@/lib/chapter3/content'
import { markChapterComplete } from '@/lib/chapter3/progress'
import { readPractice, writePractice, type PracticeStore } from '@/lib/chapter3/practice-progress'

/* `photo` NAMES A FILE THE CHAPTER ALREADY PAINTED, and that is the whole
   principle here: the practice gets no picture set of its own, so a reader who
   worked the chapter recognises every picture, and recognition is the
   exercise. */
type Q =
  | { id: string; label: string; photo?: string; type: 'single' | 'multi'; prompt: string; ok: string; retry: string; options: { text: string; right: boolean }[] }
  | { id: string; label: string; photo?: string; type: 'match'; prompt: string; ok: string; retry: string; pairs: { left: string; right: string; photo?: string }[] }
  | { id: string; label: string; photo?: string; type: 'order'; prompt: string; ok: string; retry: string; steps: string[]; photos?: Record<string, string> }
  | { id: string; label: string; photo?: string; type: 'situations'; prompt: string; ok: string; retry: string; pairs: { key: string; text: string; to: string; photo?: string }[] }
  | { id: string; label: string; photo?: string; type: 'place'; prompt: string; ok: string; retry: string; slots: { n: number; answer: string }[] }

const ART = '/assets/chapter3/'

const QUESTIONS = (raw as unknown as { questions: Q[] }).questions

/** THE COUNT ON THE PAGE IS COUNTED, NEVER TYPED. The lead read „שש שאלות" over
    eight of them: practice.json had grown to eight — its own note says so — and
    the sentence above them had not. A number printed over the things it counts
    is the one error a reader spots immediately and does not forgive, so it is
    derived here and throws if the chapter ever outgrows the list. */
const NUMBER_WORD: Record<number, string> = {
  3: 'שלוש', 4: 'ארבע', 5: 'חמש', 6: 'שש',
  7: 'שבע', 8: 'שמונה', 9: 'תשע', 10: 'עשר',
}
const COUNT_WORD =
  NUMBER_WORD[QUESTIONS.length] ??
  (() => {
    throw new Error(`chapter 3 practice: no Hebrew word for ${QUESTIONS.length} questions`)
  })()

/** deterministic shuffle — the same reader gets the same board on a reload */
function shuffled<T>(items: T[], seed: number): T[] {
  const a = [...items]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type State = 'idle' | 'wrong' | 'right'

/** what every exercise is handed: the board it was left in, whether it was
    already solved, and where to report a change */
interface Saved {
  initial?: unknown
  solved: boolean
  onSolved: () => void
  onWork: (v: unknown) => void
}
const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
const asMap = (v: unknown): Record<string, string> =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x === 'string')) as Record<string, string>
    : {}

/* CHAPTER 6'S FEEDBACK LINE, the component itself and not a copy of it.

   „You got it wrong“ and „you are not finished yet“ can never be confused there:
   a different glyph, a different colour and a different sentence shape. This page
   said both in one paragraph — 17px, a size the chapter does not use anywhere —
   inside a boxed panel with a gold bar down its margin, which is a shape the
   article has nowhere in 1487 lines.

   `idle` still renders NOTHING, which is this page's own rule and stays: chapter
   6 reserves the line because its surfaces have a running count to report, and
   these questions have nothing to say until they are checked.

   THE `role="status"` MOVES OUT TO THE WRAPPER AND DOES NOT DISAPPEAR. Chapter
   6's `Feedback` is deliberately not a live region, because that page has exactly
   one — at the bottom, fed by usePickPlace, and a card that was also live
   announced every placement twice. THIS page has no such region: only one of its
   eight questions uses the hook, and it does not render `say`. So dropping the
   role along with the old paragraph would have left „בדיקה“ with nothing spoken
   at all. It sits on the wrapper instead, appearing and disappearing exactly when
   the line does — which is what the paragraph it replaces did. */
function Answer({ state, q }: { state: State; q: Q }) {
  if (state === 'idle') return null
  return (
    <div className="p3-say" role="status">
      <Feedback kind={state === 'right' ? 'ok' : 'miss'} text={state === 'right' ? q.ok : q.retry} />
    </div>
  )
}

/* ---------------- one question per type ---------------- */

function Choice({ q, initial, solved, onSolved, onWork }: { q: Extract<Q, { type: 'single' | 'multi' }> } & Saved) {
  const opts = useMemo(() => shuffled(q.options, q.id.length * 97), [q])
  const [picked, setPicked] = useState<string[]>(() =>
    asStrings(initial).filter((t) => q.options.some((o) => o.text === t)),
  )
  const [state, setState] = useState<State>(solved ? 'right' : 'idle')
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    onWork(picked)
  }, [picked, onWork])
  const multi = q.type === 'multi'

  function toggle(text: string) {
    if (state === 'right') return
    setState('idle')
    setPicked((p) => (multi ? (p.includes(text) ? p.filter((x) => x !== text) : [...p, text]) : [text]))
  }
  function check() {
    const want = new Set(q.options.filter((o) => o.right).map((o) => o.text))
    const got = new Set(picked)
    const ok = want.size === got.size && [...want].every((w) => got.has(w))
    setState(ok ? 'right' : 'wrong')
    if (ok) onSolved()
  }

  return (
    <>
      <ul className="p3-options">
        {opts.map((o) => (
          <li key={o.text}>
            <button
              type="button"
              className={'p3-option' + (picked.includes(o.text) ? ' is-picked' : '') + (state === 'right' && o.right ? ' is-right' : '')}
              aria-pressed={picked.includes(o.text)}
              onClick={() => toggle(o.text)}
            >
              {o.text}
            </button>
          </li>
        ))}
      </ul>
      {multi && <p className="p3-hint">אפשר לסמן יותר מאחת.</p>}
      <div className="p3-actions">
        <button type="button" className="p3-check" disabled={!picked.length || state === 'right'} onClick={check}>
          בדיקה
        </button>
        <Answer state={state} q={q} />
      </div>
    </>
  )
}

function Match({ q, initial, solved, onSolved, onWork }: { q: Extract<Q, { type: 'match' | 'situations' }> } & Saved) {
  const rows =
    q.type === 'match'
      ? q.pairs.map((p) => ({ left: p.left, right: p.right, photo: p.photo }))
      : q.pairs.map((p) => ({ left: p.key + ' — ' + p.text, right: p.to, photo: p.photo }))
  const withArt = rows.some((r) => r.photo)
  const answers = useMemo(() => shuffled(rows.map((r) => r.right), q.id.length * 53), [q])
  const [chosen, setChosen] = useState<Record<string, string>>(() => {
    const kept = asMap(initial)
    return Object.fromEntries(
      Object.entries(kept).filter(([l, a]) => rows.some((r) => r.left === l) && answers.includes(a)),
    )
  })
  const [held, setHeld] = useState<string | null>(null)
  const heldRef = useRef<string | null>(null)
  const [state, setState] = useState<State>(solved ? 'right' : 'idle')
  const done = state === 'right'
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    onWork(chosen)
  }, [chosen, onWork])
  const placed = new Set(Object.values(chosen))

  /* hold an answer, then give it to a row — and clicking a filled row hands the
     answer back to the bank. The same two moves chapter 6's exercises use, and
     the reason there is no <select> here: a native dropdown on this page was a
     government form on parchment, and it hid the whole answer set behind a
     click so nothing could be compared.

     THE HELD ANSWER IS KEPT IN A REF AS WELL AS IN STATE. Read from state, the
     slot's handler sees the value from the render that attached it: a reader who
     picks an answer and drops it in the same tick — or faster than a re-render —
     placed the PREVIOUS answer, so the whole board came out shifted by one. The
     ref is what the handler acts on; the state is only what the chip draws with.
     Measured, this is the same class of bug as the stage's forty-clicks-one-beat. */
  const put = (row: string) => {
    const h = heldRef.current
    setState('idle')
    setChosen((c) => {
      const next = { ...c }
      if (next[row]) {
        delete next[row]
        return next
      }
      if (!h) return next
      for (const k of Object.keys(next)) if (next[k] === h) delete next[k]
      next[row] = h
      return next
    })
    if (h) {
      heldRef.current = null
      setHeld(null)
    }
  }
  const hold = (a: string) => {
    setState('idle')
    const next = heldRef.current === a ? null : a
    heldRef.current = next
    setHeld(next)
  }

  function check() {
    const ok = rows.every((r) => chosen[r.left] === r.right)
    setState(ok ? 'right' : 'wrong')
    if (ok) onSolved()
  }

  return (
    <>
      <ul className="p3-bank" aria-label="התשובות">
        {answers.map((a) => (
          <li key={a}>
            <button
              type="button"
              className={'p3-chip' + (held === a ? ' is-held' : '') + (placed.has(a) ? ' is-placed' : '')}
              aria-pressed={held === a}
              disabled={done || placed.has(a)}
              onClick={() => hold(a)}
            >
              {a}
            </button>
          </li>
        ))}
      </ul>
      {/* a slot stays enabled while the question is open, rather than only while
          something is held: that condition read `held` from state, so a slot
          could still be disabled at the instant a fast reader clicked it. A slot
          clicked with an empty hand simply does nothing. */}
      {/* WITH PICTURES IT IS A ROW OF BOARDS, WITHOUT THEM IT IS A LIST OF ROWS —
          and EITHER WAY the answer goes UNDER the thing it belongs to, which is
          chapter 6's shape: a slot is a medallion, then what names it, then the
          rule that fills. The list used to put the two side by side in a 200px
          column, which is the shape of a form. */}
      {/* `is-prose` IS READ OFF THE QUESTION'S TYPE, not guessed in the sheet. A
          `match` row's cue is a NAME („אבו טאלב“) and takes chapter 6's caption —
          Kedem at 700, maroon-deep — while a `situations` row's is a forty-word
          sentence, and the chapter never sets a sentence in its display face. */}
      <ul className={'p3-match' + (withArt ? ' is-boards' : '') + (q.type === 'situations' ? ' is-prose' : '')}>
        {rows.map((r) => (
          <li className="p3-match-row" key={r.left}>
            {/* CHAPTER 6'S MEDALLION, in its `is-blank` form: these four rows are a
                SET and not a rank, and a digit on each disc is a promise of an
                order the question does not have. It fills maroon when the row has
                an answer, which is the one selection colour the page uses — and
                the hairline the sheet runs through the column of discs is what
                makes the rows read as one exercise now that the boxes are gone. */}
            <span
              className={'p3-slot-n is-blank' + (chosen[r.left] ? ' is-full' : '')}
              aria-hidden="true"
            />
            {r.photo && (
              <span className="p3-shot" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ART + r.photo} alt="" loading="lazy" decoding="async" />
              </span>
            )}
            <span className="p3-match-left">{r.left}</span>
            <button
              type="button"
              className={'p3-slot' + (chosen[r.left] ? ' is-full' : '')}
              disabled={done}
              onClick={() => put(r.left)}
              aria-label={chosen[r.left] ? `${r.left}: ${chosen[r.left]} — לחצו כדי להחזיר` : `${r.left}: בחרו תשובה`}
            >
              {chosen[r.left] ?? ''}
            </button>
          </li>
        ))}
      </ul>
      <div className="p3-actions">
        <button
          type="button"
          className="p3-check"
          disabled={Object.keys(chosen).length < rows.length || done}
          onClick={check}
        >
          בדיקה
        </button>
        <Answer state={state} q={q} />
      </div>
    </>
  )
}

/** Put the steps in order. The board starts shuffled and the reader walks a
    step up or down until the chain reads the way it happened. */
function Order({ q, initial, solved, onSolved, onWork }: { q: Extract<Q, { type: 'order' }> } & Saved) {
  const [items, setItems] = useState<string[]>(() => {
    /* a kept order is used only if it is exactly this question's steps */
    const kept = asStrings(initial)
    const same = kept.length === q.steps.length && q.steps.every((x) => kept.includes(x))
    return same ? kept : shuffled(q.steps, q.id.length * 71)
  })
  const [state, setState] = useState<State>(solved ? 'right' : 'idle')
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    onWork(items)
  }, [items, onWork])

  const move = useCallback((i: number, dir: -1 | 1) => {
    setState('idle')
    setItems((cur) => {
      const j = i + dir
      if (j < 0 || j >= cur.length) return cur
      const next = [...cur]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }, [])

  function check() {
    const ok = items.every((s, i) => s === q.steps[i])
    setState(ok ? 'right' : 'wrong')
    if (ok) onSolved()
  }

  return (
    <>
      {/* THE PICTURE TRAVELS WITH THE STEP. The chain is four beats of the
          desert stage the reader has just walked — the dusk valley, the shrunken
          waterhole, the two camps facing each other, the lone traveller — so
          ordering the chain is ordering those four pictures, and the sentence
          under each is what the frame says. Keyed by the step's own text, so a
          step carries its frame wherever it is moved to. */}
      <ol className={'p3-order' + (q.photos ? ' is-illustrated' : '')}>
        {items.map((s, i) => (
          <li key={s}>
            <span className={'p3-order-n' + (state === 'right' ? ' is-full' : '')}>{i + 1}</span>
            {q.photos?.[s] && (
              <span className="p3-shot" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ART + q.photos[s]} alt="" loading="lazy" decoding="async" />
              </span>
            )}
            <span className="p3-order-text">{s}</span>
            <span className="p3-order-moves">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || state === 'right'} aria-label="הזזה למעלה">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1 || state === 'right'} aria-label="הזזה למטה">↓</button>
            </span>
          </li>
        ))}
      </ol>
      <div className="p3-actions">
        <button type="button" className="p3-check" disabled={state === 'right'} onClick={check}>
          בדיקה
        </button>
        <Answer state={state} q={q} />
      </div>
    </>
  )
}


/** ---------------- the place engine: chapter 6's, not chapter 2's ----------------

    THE ONE EXERCISE WHERE ORDER IS THE CONTENT. Seven numbered slots and a
    label for each; the reader picks a name and seats it. This is chapter 6's
    `usePickPlace` + `SlotSurface`, which serves tap, drag AND keyboard through
    one code path — Enter picks up, Enter on a slot places, Escape cancels.

    A WRONG NAME STILL SEATS. `onPlace` returns true unconditionally, so the
    board never grades a move as it is made: the check button is the only place
    correctness is spoken, exactly as in the other five questions. Nothing is
    ever deleted — clicking a filled slot hands its label back to the tray. */
function Place({ q, initial, solved, onSolved, onWork }: { q: Extract<Q, { type: 'place' }> } & Saved) {
  const [filled, setFilled] = useState<Record<number, string>>(() => {
    const out: Record<number, string> = {}
    for (const [k, v] of Object.entries(asMap(initial))) {
      if (q.slots.some((x) => x.n === Number(k)) && q.slots.some((x) => x.answer === v)) out[Number(k)] = v
    }
    return out
  })
  const [state, setState] = useState<State>(solved ? 'right' : 'idle')
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    onWork(filled)
  }, [filled, onWork])
  const done = state === 'right'

  const bank = useMemo(() => shuffled(q.slots.map((x) => x.answer), q.id.length * 61), [q])
  const seated = new Set(Object.values(filled))

  const slotIdFor = useCallback((n: number) => `${q.id}-s${n}`, [q.id])
  const nOf = (slotId: string) => Number(slotId.slice(slotId.lastIndexOf('s') + 1))

  const pp = usePickPlace({
    labelOf: (id) => id,
    slotLabelOf: (slotId) => String(nOf(slotId)),
    onPlace: (itemId, slotId) => {
      setState('idle')
      setFilled((cur) => ({ ...cur, [nOf(slotId)]: itemId }))
      return true
    },
  })

  /* a filled slot stops being a target and becomes the way back to the tray */
  const slotPropsFor = (n: number) =>
    filled[n]
      ? {
          'data-slot': slotIdFor(n),
          onClick: () => {
            setState('idle')
            setFilled((cur) => {
              const next = { ...cur }
              delete next[n]
              return next
            })
          },
        }
      : pp.slotProps(slotIdFor(n))

  function check() {
    const ok = q.slots.every((x) => filled[x.n] === x.answer)
    setState(ok ? 'right' : 'wrong')
    if (ok) onSolved()
  }

  return (
    <>
      <Tray
        items={bank.filter((a) => !seated.has(a)).map((a) => ({ id: a, text: a }))}
        label='הנביאים'
        heldId={pp.held}
        itemPropsFor={(id: string) => pp.itemProps(id)}
        emptyText='ריק'
      />
      <SlotSurface
        layout='line'
        slots={q.slots}
        filled={filled}
        slotIdFor={slotIdFor}
        slotPropsFor={done ? undefined : slotPropsFor}
        refused={pp.refused}
        numbersAreOrder
      />
      <div className='p3-actions'>
        <button
          type='button'
          className='p3-check'
          disabled={Object.keys(filled).length < q.slots.length || done}
          onClick={check}
        >
          בדיקה
        </button>
        <Answer state={state} q={q} />
      </div>
    </>
  )
}

/* ---------------- the page ---------------- */

const KNOWN = new Set(QUESTIONS.map((q) => q.id))

export default function Chapter3Practice() {
  const [store, setStore] = useState<PracticeStore>({ done: [], work: {} })
  /* THE BOARDS REMOUNT ONCE THE STORE IS READ. Each seeds itself in a lazy
     `useState`, which runs on the first render — before this effect has read
     localStorage — so without the remount every board came up empty and the
     restore did nothing (chapter 4 measured it). The store is read in an
     effect, not at render: the server has no localStorage. */
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setStore(readPractice(KNOWN))
    setReady(true)
  }, [])
  useEffect(() => {
    if (ready) writePractice(store)
  }, [store, ready])

  const solved = useMemo(() => new Set(store.done), [store.done])
  const finished = solved.size === QUESTIONS.length
  /* completing is a side effect, so it lives in an effect — it used to run
     inside the `setSolved` updater, which React may call twice */
  useEffect(() => {
    if (ready && finished) markChapterComplete()
  }, [ready, finished])

  const solve = useCallback((id: string) => {
    setStore((s) => (s.done.includes(id) ? s : { ...s, done: [...s.done, id] }))
  }, [])
  const works = useMemo(() => {
    const out: Record<string, (v: unknown) => void> = {}
    for (const q of QUESTIONS) {
      out[q.id] = (v: unknown) => setStore((s) => ({ ...s, work: { ...s.work, [q.id]: v } }))
    }
    return out
  }, [])

  /* the rail IS the progress display, as it is on chapter 6's practice: a tick
     beside an exercise when it is solved, and the name of every exercise
     reachable from anywhere on the page. The bar that used to sit under the
     title did half of that and could not be clicked. */
  const stops = QUESTIONS.map((q) => ({ id: `p3-${q.id}`, label: q.label, done: solved.has(q.id) }))

  return (
    <PracticeNav
      stops={stops}
      back={{ href: '/chapter3#chapter-end', label: 'חזרה לפרק 3' }}
      subtitle="פרק 3 · תרגול מסכם"
    >
      <main className="chapter-article p3-main">
        {/* THE CHAPTER'S OWN BANNER, and this is the largest thing that was
            missing. The practice opened on a bare heading in a column as wide as
            the window — measured, 1457px against the article's 1172 — with no
            masthead, no rail and no band. Two pages of one chapter that shared
            no edge. Same banner as the article, without the film: a practice
            screen has no business autoplaying the chapter's video a second
            time, so the still stands on its own. */}
        <div className="ch3-hero p3-banner">
          <div className="ch3-hero-media" aria-hidden="true" />
          <div className="ch3-hero-copy">
            <h1 id="p3-title" className="ch3-hero-title">התרגול המסכם</h1>
          </div>
        </div>

        <p className="p3-lead" data-reveal>
          {CH3.title} — {COUNT_WORD} שאלות. אין ניקוד ואין כישלון: שאלה נשארת פתוחה עד שהיא נפתרת.
        </p>

        {/* EACH EXERCISE IS A SECTION OF THE ARTICLE, not an item of a list.
            They were `<li>`s under one `<h2>`-less list, so the page had one
            heading for eight subjects and the rail had nothing to point at. Now
            each carries the article's own heading block — title, ornament, and
            the section rhythm around it. */}
        {QUESTIONS.map((q, i) => (
          <section
            className={'article-section p3-q' + (solved.has(q.id) ? ' is-solved' : '')}
            id={`p3-${q.id}`}
            key={q.id}
            aria-labelledby={`p3-${q.id}-t`}
          >
            <header className="section-heading" data-reveal>
              <div>
                <h2 id={`p3-${q.id}-t`}>
                  {/* the ordinal is chapter 6's medallion, and it FILLS when the
                      question is solved — the one selection colour doing the
                      chapter's own progress display, next to the ✓ in the rail */}
                  <span className={'p3-q-n' + (solved.has(q.id) ? ' is-full' : '')}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {q.prompt}
                </h2>
              </div>
              <div className="title-ornament section-ornament" aria-hidden="true"><span /></div>
            </header>
            <div className={'p3-work' + (q.photo ? ' has-plate' : '')} data-reveal>
              {/* A QUESTION THAT NAMES A THING GETS THE THING BESIDE IT. „ממה
                  התעשר שבט קורייש" over the Kaaba, „כיצד נפתרו סכסוכים" over
                  the seated arbiter, the two ancestors over the map of the
                  peninsula — the picture is not decoration, it is the subject
                  the four options are about, and the reader has met all three
                  in the chapter. */}
              {q.photo && (
                <figure className="p3-plate" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ART + q.photo} alt="" loading="lazy" decoding="async" />
                </figure>
              )}
              {(() => {
                /* `key` goes on the element itself — React refuses it inside a
                   spread — and flips once, when the store has been read */
                const k = ready ? 'r' : 'i'
                const saved = {
                  initial: store.work[q.id],
                  solved: solved.has(q.id),
                  onSolved: () => solve(q.id),
                  onWork: works[q.id],
                }
                if (q.type === 'single' || q.type === 'multi') return <Choice key={k} q={q} {...saved} />
                if (q.type === 'match' || q.type === 'situations') return <Match key={k} q={q} {...saved} />
                if (q.type === 'order') return <Order key={k} q={q} {...saved} />
                if (q.type === 'place') return <Place key={k} q={q} {...saved} />
                return null
              })()}
            </div>
          </section>
        ))}

        {finished && (
          <div className="p3-done" role="status">
            <div className="title-ornament" aria-hidden="true"><span /></div>
            <p>הפרק הושלם.</p>
            {/* chapter 6's button, as on its own practice page (`.gv-out
                .chapter-end-back`). It was `.ch3-end-link` — this chapter's
                restatement of that rule — and the restatement is gone. */}
            <Link className="chapter-end-back" href="/chapters">לכל פרקי הלמידה</Link>
          </div>
        )}
      </main>
    </PracticeNav>
  )
}
