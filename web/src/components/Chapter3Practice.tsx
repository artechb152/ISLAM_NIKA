'use client'

/* Chapter 3's closing practice.

   Same contract as chapter 6's: the chapter is not finished by reading it, only
   by working through this. `islam:chapter:2 = 'done'` is written here and
   nowhere else.

   The questions live in practice.json with the §§ each one rests on. Two rules
   they obey: nothing is asked that the article answers by sitting next to it on
   the page (a term printed beside its gloss is not a question), and no answer
   invents a fact the source does not carry. */

import Link from 'next/link'
import { useCallback, useMemo, useRef, useState } from 'react'
import PracticeNav from '@/components/chapter6/summary/PracticeNav'
import SlotSurface from '@/components/chapter6/summary/SlotSurface'
import Tray from '@/components/chapter6/summary/Tray'
import { usePickPlace } from '@/components/chapter6/summary/usePickPlace'
import raw from '@/lib/chapter3/practice.json'
import { CH3 } from '@/lib/chapter3/content'
import { markChapterComplete } from '@/lib/chapter3/progress'

/* `photo` NAMES A FILE THE CHAPTER ALREADY PAINTED, and that is the whole
   principle here. The practice does not get a picture set of its own: the four
   trait figures are the ones that open the cards in section 04, the four desert
   frames are beats of the stage the reader has just walked, the two camps are
   the valley the wars happen in, and the arbiter is the man section 04 draws
   sitting beside the prose. A reader who worked the chapter recognises every one
   of them, and recognition is the exercise. */
type Q =
  | { id: string; label: string; photo?: string; type: 'single' | 'multi'; prompt: string; ok: string; retry: string; options: { text: string; right: boolean }[] }
  | { id: string; label: string; photo?: string; type: 'match'; prompt: string; ok: string; retry: string; pairs: { left: string; right: string; photo?: string }[] }
  | { id: string; label: string; photo?: string; type: 'order'; prompt: string; ok: string; retry: string; steps: string[]; photos?: Record<string, string> }
  | { id: string; label: string; photo?: string; type: 'situations'; prompt: string; ok: string; retry: string; pairs: { key: string; text: string; to: string; photo?: string }[] }
  | { id: string; label: string; photo?: string; type: 'place'; prompt: string; ok: string; retry: string; slots: { n: number; answer: string }[] }

const ART = '/assets/chapter3/'

const QUESTIONS = (raw as unknown as { questions: Q[] }).questions

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

function Feedback({ state, q }: { state: State; q: Q }) {
  if (state === 'idle') return null
  return (
    <p className={'p3-feedback' + (state === 'right' ? ' is-right' : '')} role="status">
      {state === 'right' ? q.ok : q.retry}
    </p>
  )
}

/* ---------------- one question per type ---------------- */

function Choice({ q, onSolved }: { q: Extract<Q, { type: 'single' | 'multi' }>; onSolved: () => void }) {
  const opts = useMemo(() => shuffled(q.options, q.id.length * 97), [q])
  const [picked, setPicked] = useState<string[]>([])
  const [state, setState] = useState<State>('idle')
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
        <Feedback state={state} q={q} />
      </div>
    </>
  )
}

function Match({ q, onSolved }: { q: Extract<Q, { type: 'match' | 'situations' }>; onSolved: () => void }) {
  const rows =
    q.type === 'match'
      ? q.pairs.map((p) => ({ left: p.left, right: p.right, photo: p.photo }))
      : q.pairs.map((p) => ({ left: p.key + ' — ' + p.text, right: p.to, photo: p.photo }))
  const withArt = rows.some((r) => r.photo)
  const answers = useMemo(() => shuffled(rows.map((r) => r.right), q.id.length * 53), [q])
  const [chosen, setChosen] = useState<Record<string, string>>({})
  const [held, setHeld] = useState<string | null>(null)
  const heldRef = useRef<string | null>(null)
  const [state, setState] = useState<State>('idle')
  const done = state === 'right'
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
      {/* WITH PICTURES IT IS A ROW OF BOARDS, WITHOUT THEM IT IS A LIST OF ROWS.
          Chapter 6's exercises put the answer UNDER the thing it belongs to —
          each picture is a place, and the reader fills the place. Where this
          chapter has painted the subject already (the four traits, the desert's
          own beats) the exercise takes that shape; where it has not, the row
          keeps its plain two-column form rather than reaching for stock art. */}
      <ul className={'p3-match' + (withArt ? ' is-boards' : '')}>
        {rows.map((r) => (
          <li className="p3-match-row" key={r.left}>
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
        <Feedback state={state} q={q} />
      </div>
    </>
  )
}

/** Put the steps in order. The board starts shuffled and the reader walks a
    step up or down until the chain reads the way it happened. */
function Order({ q, onSolved }: { q: Extract<Q, { type: 'order' }>; onSolved: () => void }) {
  const [items, setItems] = useState<string[]>(() => shuffled(q.steps, q.id.length * 71))
  const [state, setState] = useState<State>('idle')

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
            <span className="p3-order-n">{i + 1}</span>
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
        <Feedback state={state} q={q} />
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
function Place({ q, onSolved }: { q: Extract<Q, { type: 'place' }>; onSolved: () => void }) {
  const [filled, setFilled] = useState<Record<number, string>>({})
  const [state, setState] = useState<State>('idle')
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
        <Feedback state={state} q={q} />
      </div>
    </>
  )
}

/* ---------------- the page ---------------- */

export default function Chapter3Practice() {
  const [solved, setSolved] = useState<Set<string>>(new Set())
  const [finished, setFinished] = useState(false)

  const solve = useCallback((id: string) => {
    setSolved((s) => {
      if (s.has(id)) return s
      const next = new Set(s).add(id)
      if (next.size === QUESTIONS.length) {
        markChapterComplete()
        setFinished(true)
      }
      return next
    })
  }, [])

  /* the rail IS the progress display, as it is on chapter 6's practice: a tick
     beside an exercise when it is solved, and the name of every exercise
     reachable from anywhere on the page. The bar that used to sit under the
     title did half of that and could not be clicked. */
  const stops = QUESTIONS.map((q) => ({ id: `p3-${q.id}`, label: q.label, done: solved.has(q.id) }))

  return (
    <PracticeNav stops={stops} back={{ href: '/chapter3', label: 'חזרה לפרק 3' }}>
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
          {CH3.title} — שש שאלות. אין ניקוד ואין כישלון: שאלה נשארת פתוחה עד שהיא נפתרת.
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
                  <span className="p3-q-n">{String(i + 1).padStart(2, '0')}</span>
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
              {(q.type === 'single' || q.type === 'multi') && <Choice q={q} onSolved={() => solve(q.id)} />}
              {(q.type === 'match' || q.type === 'situations') && <Match q={q} onSolved={() => solve(q.id)} />}
              {q.type === 'order' && <Order q={q} onSolved={() => solve(q.id)} />}
              {q.type === 'place' && <Place q={q} onSolved={() => solve(q.id)} />}
            </div>
          </section>
        ))}

        {finished && (
          <div className="p3-done" role="status">
            <div className="title-ornament" aria-hidden="true"><span /></div>
            <p>הפרק הושלם.</p>
            <Link className="ch3-end-link" href="/chapters">לכל פרקי הלמידה</Link>
          </div>
        )}
      </main>
    </PracticeNav>
  )
}
