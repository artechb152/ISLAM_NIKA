'use client'

/* Chapter 2's closing practice.

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
import raw from '@/lib/chapter2/practice.json'
import { CH2 } from '@/lib/chapter2/content'
import { markChapterComplete } from '@/lib/chapter2/progress'

type Q =
  | { id: string; label: string; type: 'single' | 'multi'; prompt: string; ok: string; retry: string; options: { text: string; right: boolean }[] }
  | { id: string; label: string; type: 'match'; prompt: string; ok: string; retry: string; pairs: { left: string; right: string }[] }
  | { id: string; label: string; type: 'order'; prompt: string; ok: string; retry: string; steps: string[] }
  | { id: string; label: string; type: 'situations'; prompt: string; ok: string; retry: string; pairs: { key: string; text: string; to: string }[] }

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
    <p className={'p2-feedback' + (state === 'right' ? ' is-right' : '')} role="status">
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
      <ul className="p2-options">
        {opts.map((o) => (
          <li key={o.text}>
            <button
              type="button"
              className={'p2-option' + (picked.includes(o.text) ? ' is-picked' : '') + (state === 'right' && o.right ? ' is-right' : '')}
              aria-pressed={picked.includes(o.text)}
              onClick={() => toggle(o.text)}
            >
              {o.text}
            </button>
          </li>
        ))}
      </ul>
      {multi && <p className="p2-hint">אפשר לסמן יותר מאחת.</p>}
      <div className="p2-actions">
        <button type="button" className="p2-check" disabled={!picked.length || state === 'right'} onClick={check}>
          בדיקה
        </button>
        <Feedback state={state} q={q} />
      </div>
    </>
  )
}

function Match({ q, onSolved }: { q: Extract<Q, { type: 'match' | 'situations' }>; onSolved: () => void }) {
  const rows = q.type === 'match' ? q.pairs.map((p) => ({ left: p.left, right: p.right })) : q.pairs.map((p) => ({ left: p.key + ' — ' + p.text, right: p.to }))
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
      <ul className="p2-bank" aria-label="התשובות">
        {answers.map((a) => (
          <li key={a}>
            <button
              type="button"
              className={'p2-chip' + (held === a ? ' is-held' : '') + (placed.has(a) ? ' is-placed' : '')}
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
      <ul className="p2-match">
        {rows.map((r) => (
          <li className="p2-match-row" key={r.left}>
            <span className="p2-match-left">{r.left}</span>
            <button
              type="button"
              className={'p2-slot' + (chosen[r.left] ? ' is-full' : '')}
              disabled={done}
              onClick={() => put(r.left)}
              aria-label={chosen[r.left] ? `${r.left}: ${chosen[r.left]} — לחצו כדי להחזיר` : `${r.left}: בחרו תשובה`}
            >
              {chosen[r.left] ?? ''}
            </button>
          </li>
        ))}
      </ul>
      <div className="p2-actions">
        <button
          type="button"
          className="p2-check"
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
      <ol className="p2-order">
        {items.map((s, i) => (
          <li key={s}>
            <span className="p2-order-n">{i + 1}</span>
            <span className="p2-order-text">{s}</span>
            <span className="p2-order-moves">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || state === 'right'} aria-label="הזזה למעלה">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1 || state === 'right'} aria-label="הזזה למטה">↓</button>
            </span>
          </li>
        ))}
      </ol>
      <div className="p2-actions">
        <button type="button" className="p2-check" disabled={state === 'right'} onClick={check}>
          בדיקה
        </button>
        <Feedback state={state} q={q} />
      </div>
    </>
  )
}

/* ---------------- the page ---------------- */

export default function Chapter2Practice() {
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
  const stops = QUESTIONS.map((q) => ({ id: `p2-${q.id}`, label: q.label, done: solved.has(q.id) }))

  return (
    <PracticeNav stops={stops} back={{ href: '/chapter2', label: 'חזרה לפרק' }}>
      <main className="chapter-article p2-main">
        {/* THE CHAPTER'S OWN BANNER, and this is the largest thing that was
            missing. The practice opened on a bare heading in a column as wide as
            the window — measured, 1457px against the article's 1172 — with no
            masthead, no rail and no band. Two pages of one chapter that shared
            no edge. Same banner as the article, without the film: a practice
            screen has no business autoplaying the chapter's video a second
            time, so the still stands on its own. */}
        <div className="ch2-hero p2-banner">
          <div className="ch2-hero-media" aria-hidden="true" />
          <div className="ch2-hero-copy">
            <h1 id="p2-title" className="ch2-hero-title">התרגול המסכם</h1>
          </div>
        </div>

        <p className="p2-lead" data-reveal>
          {CH2.title} — שמונה שאלות. אין ניקוד ואין כישלון: שאלה נשארת פתוחה עד שהיא נפתרת.
        </p>

        {/* EACH EXERCISE IS A SECTION OF THE ARTICLE, not an item of a list.
            They were `<li>`s under one `<h2>`-less list, so the page had one
            heading for eight subjects and the rail had nothing to point at. Now
            each carries the article's own heading block — title, ornament, and
            the section rhythm around it. */}
        {QUESTIONS.map((q, i) => (
          <section
            className={'article-section p2-q' + (solved.has(q.id) ? ' is-solved' : '')}
            id={`p2-${q.id}`}
            key={q.id}
            aria-labelledby={`p2-${q.id}-t`}
          >
            <header className="section-heading" data-reveal>
              <div>
                <h2 id={`p2-${q.id}-t`}>
                  <span className="p2-q-n">{String(i + 1).padStart(2, '0')}</span>
                  {q.prompt}
                </h2>
              </div>
              <div className="title-ornament section-ornament" aria-hidden="true"><span /></div>
            </header>
            <div className="p2-work" data-reveal>
              {(q.type === 'single' || q.type === 'multi') && <Choice q={q} onSolved={() => solve(q.id)} />}
              {(q.type === 'match' || q.type === 'situations') && <Match q={q} onSolved={() => solve(q.id)} />}
              {q.type === 'order' && <Order q={q} onSolved={() => solve(q.id)} />}
            </div>
          </section>
        ))}

        {finished && (
          <div className="p2-done" role="status">
            <div className="title-ornament" aria-hidden="true"><span /></div>
            <p>הפרק הושלם.</p>
            <Link className="ch2-end-link" href="/chapters">לכל פרקי הלמידה</Link>
          </div>
        )}
      </main>
    </PracticeNav>
  )
}
