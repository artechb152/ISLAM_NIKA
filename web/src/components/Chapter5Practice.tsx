'use client'

/* Chapter 5's closing practice.

   Same contract as chapter 6's: the chapter is not finished by reading it, only
   by working through this. `islam:chapter:5 = 'done'` is written here (through
   markChapterComplete) and nowhere else; the article reads it for its „הושלם" chip.

   The questions live in practice.json with the §§ each one rests on. Two rules
   they obey: nothing is asked that the article answers by sitting next to it on
   the page, and no answer invents a fact the source does not carry.

   Every board survives a reload: `ch5:practice:v1` = {done, missed, work}, the
   shape chapter 4's practice uses (lib/chapter5/practice-progress.ts). */

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PracticeNav from '@/components/chapter6/summary/PracticeNav'
import raw from '@/lib/chapter5/practice.json'
import { CH5 } from '@/lib/chapter5/content'
import { markChapterComplete } from '@/lib/chapter5/progress'
import { readPractice, writePractice, type PracticeStore } from '@/lib/chapter5/practice-progress'

/* `photo` NAMES A FILE THE CHAPTER ALREADY PAINTED: the practice gets no picture
   set of its own, so a reader who worked the chapter recognises the plate. */
type Q =
  | { id: string; label: string; photo?: string; type: 'single' | 'multi'; prompt: string; ok: string; retry: string; options: { text: string; right: boolean }[] }
  | { id: string; label: string; photo?: string; type: 'match'; prompt: string; ok: string; retry: string; pairs: { left: string; right: string; photo?: string }[] }
  | { id: string; label: string; photo?: string; type: 'order'; prompt: string; ok: string; retry: string; steps: string[]; photos?: Record<string, string> }
  | { id: string; label: string; photo?: string; type: 'situations'; prompt: string; ok: string; retry: string; pairs: { key: string; text: string; to: string; photo?: string }[] }

const ART = '/assets/chapter5/'

const QUESTIONS = (raw as unknown as { questions: Q[] }).questions
const KNOWN = new Set(QUESTIONS.map((q) => q.id))

const WORDS = ['אפס', 'שאלה אחת', 'שתי', 'שלוש', 'ארבע', 'חמש', 'שש', 'שבע', 'שמונה', 'תשע', 'עשר']
const COUNT_WORD = WORDS[QUESTIONS.length] ?? String(QUESTIONS.length)

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

/* ---------------- one question per type ----------------

   Every type takes the same things: the question, what to do when it is solved or
   missed, the board it was left on (`initial`, and whether it was already solved),
   and how to hand a new board back. `work` is `unknown` in the store — each type
   owns its shape — so the two coercers drop a shape they do not recognise. */
type Ex<T extends Q['type']> = {
  q: Extract<Q, { type: T }>
  solved: boolean
  onSolved: () => void
  onMissed: () => void
  initial: unknown
  onWork: (value: unknown) => void
}

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

const asMap = (v: unknown): Record<string, string> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, string> = {}
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (typeof x === 'string') out[k] = x
  return out
}

function Choice({ q, solved, onSolved, onMissed, initial, onWork }: Ex<'single' | 'multi'>) {
  const opts = useMemo(() => shuffled(q.options, q.id.length * 97), [q])
  const [picked, setPicked] = useState<string[]>(() => asStrings(initial))
  const [state, setState] = useState<State>(solved ? 'right' : 'idle')
  const multi = q.type === 'multi'

  function toggle(text: string) {
    if (state === 'right') return
    setState('idle')
    const next = multi ? (picked.includes(text) ? picked.filter((x) => x !== text) : [...picked, text]) : [text]
    setPicked(next)
    onWork(next)
  }
  function check() {
    const want = new Set(q.options.filter((o) => o.right).map((o) => o.text))
    const got = new Set(picked)
    const ok = want.size === got.size && [...want].every((w) => got.has(w))
    setState(ok ? 'right' : 'wrong')
    if (ok) onSolved()
    else onMissed()
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

function Match({ q, solved, onSolved, onMissed, initial, onWork }: Ex<'match' | 'situations'>) {
  const rows =
    q.type === 'match'
      ? q.pairs.map((p) => ({ left: p.left, right: p.right, photo: p.photo }))
      : q.pairs.map((p) => ({ left: p.key + ' — ' + p.text, right: p.to, photo: p.photo }))
  const withArt = rows.some((r) => r.photo)
  const answers = useMemo(() => shuffled(rows.map((r) => r.right), q.id.length * 53), [q])
  const [chosen, setChosen] = useState<Record<string, string>>(() => asMap(initial))
  const [held, setHeld] = useState<string | null>(null)
  const heldRef = useRef<string | null>(null)
  const [state, setState] = useState<State>(solved ? 'right' : 'idle')
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
     Measured, this is the same class of bug as the stage's forty-clicks-one-beat.

     The next board is computed here and not inside a `setChosen` updater, because
     it is also persisted — a side effect in an updater is one React may repeat. */
  const put = (row: string) => {
    const h = heldRef.current
    setState('idle')
    const next = { ...chosen }
    if (next[row]) delete next[row]
    else if (h) {
      for (const k of Object.keys(next)) if (next[k] === h) delete next[k]
      next[row] = h
    }
    setChosen(next)
    onWork(next)
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
    else onMissed()
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
      {/* WITH PICTURES IT IS A ROW OF BOARDS, WITHOUT THEM IT IS A LIST OF ROWS.
          Chapter 6 puts the answer UNDER the picture it belongs to; a row with no
          painted subject keeps its plain two-column form rather than stock art. */}
      <ul className={'p2-match' + (withArt ? ' is-boards' : '')}>
        {rows.map((r) => (
          <li className="p2-match-row" key={r.left}>
            {r.photo && (
              <span className="p2-shot" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ART + r.photo} alt="" loading="lazy" decoding="async" />
              </span>
            )}
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
function Order({ q, solved, onSolved, onMissed, initial, onWork }: Ex<'order'>) {
  /* the order the reader left it in, accepted only if it is the same set of steps;
     otherwise the deterministic shuffle of a first visit */
  const [items, setItems] = useState<string[]>(() => {
    const kept = asStrings(initial)
    const same = kept.length === q.steps.length && kept.every((x) => q.steps.includes(x))
    return same ? kept : shuffled(q.steps, q.id.length * 71)
  })
  const [state, setState] = useState<State>(solved ? 'right' : 'idle')

  const move = (i: number, dir: -1 | 1) => {
    setState('idle')
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    setItems(next)
    onWork(next)
  }

  function check() {
    const ok = items.every((s, i) => s === q.steps[i])
    setState(ok ? 'right' : 'wrong')
    if (ok) onSolved()
    else onMissed()
  }

  return (
    <>
      {/* a step's picture, if it has one, is keyed by the step's own text so it
          travels with the step wherever it is moved */}
      <ol className={'p2-order' + (q.photos ? ' is-illustrated' : '')}>
        {items.map((s, i) => (
          <li key={s}>
            <span className="p2-order-n">{i + 1}</span>
            {q.photos?.[s] && (
              <span className="p2-shot" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ART + q.photos[s]} alt="" loading="lazy" decoding="async" />
              </span>
            )}
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

export default function Chapter5Practice() {
  const [store, setStore] = useState<PracticeStore>({ done: [], missed: [], work: {} })
  const [finished, setFinished] = useState(false)
  /* The boards seed from `initial` in a lazy useState, which runs on the first
     render — one render before the store is read. Flipping `ready` changes their
     `key` and remounts them once with the real board. */
  const [ready, setReady] = useState(false)
  /* the writer must not clear storage with the empty store of the first render */
  const loaded = useRef(false)
  /* arrived already complete: a state, not an event to announce again */
  const restored = useRef(false)

  /* read in an effect: there is no localStorage on the server */
  useEffect(() => {
    const read = readPractice(KNOWN)
    restored.current = read.done.length === QUESTIONS.length
    setStore(read)
    if (restored.current) setFinished(true)
    loaded.current = true
    setReady(true)
  }, [])

  /* side effects here, never in a state updater (React may call those twice) */
  useEffect(() => {
    if (!loaded.current) return
    writePractice(store)
    if (store.done.length === QUESTIONS.length && !restored.current) {
      markChapterComplete()
      setFinished(true)
    }
  }, [store])

  const solved = useMemo(() => new Set(store.done), [store.done])

  const solve = useCallback((id: string) => {
    setStore((s) => (s.done.includes(id) ? s : { ...s, done: [...s.done, id] }))
  }, [])
  const miss = useCallback((id: string) => {
    setStore((s) => (s.missed.includes(id) ? s : { ...s, missed: [...s.missed, id] }))
  }, [])
  const saveWork = useCallback((id: string, value: unknown) => {
    setStore((s) => ({ ...s, work: { ...s.work, [id]: value } }))
  }, [])

  /* the rail IS the progress display, as it is on chapter 6's practice: a tick
     beside an exercise when it is solved, and the name of every exercise
     reachable from anywhere on the page. The bar that used to sit under the
     title did half of that and could not be clicked. */
  const stops = QUESTIONS.map((q) => ({ id: `p2-${q.id}`, label: q.label, done: solved.has(q.id) }))

  return (
    <PracticeNav stops={stops} back={{ href: '/chapter5', label: 'חזרה לפרק 5' }}>
      <main className="chapter-article p2-main">
        {/* THE CHAPTER'S OWN BANNER, and this is the largest thing that was
            missing. The practice opened on a bare heading in a column as wide as
            the window — measured, 1457px against the article's 1172 — with no
            masthead, no rail and no band. Two pages of one chapter that shared
            no edge. Same banner as the article, without the film: a practice
            screen has no business autoplaying the chapter's video a second
            time, so the still stands on its own. */}
        <div className="ch6-hero p2-banner ch5-practice-banner">
          <div className="ch6-hero-media ch5-hero-media" aria-hidden="true" />
          <div className="ch6-hero-copy">
            <h1 id="p2-title" className="ch6-hero-title">התרגול המסכם</h1>
          </div>
        </div>

        <p className="p2-lead" data-reveal>
          {/* the count is DERIVED. Copied from chapter 2 it said „שמונה שאלות" over four
              of them — a page that miscounts itself is the kind of thing a reader
              notices immediately and never fully trusts again. */}
          {CH5.title} — {COUNT_WORD} שאלות. אין ניקוד ואין כישלון: שאלה נשארת פתוחה עד שהיא נפתרת.
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
            <div className={'p2-work' + (q.photo ? ' has-plate' : '')} data-reveal>
              {/* a question whose subject the chapter painted gets that painting
                  beside it — never a picture the chapter does not show */}
              {q.photo && (
                <figure className="p2-plate" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ART + q.photo} alt="" loading="lazy" decoding="async" />
                </figure>
              )}
              {(q.type === 'single' || q.type === 'multi') && (
                <Choice key={ready ? 'r' : 'i'} q={q} solved={solved.has(q.id)} onSolved={() => solve(q.id)} onMissed={() => miss(q.id)} initial={store.work[q.id]} onWork={(v) => saveWork(q.id, v)} />
              )}
              {(q.type === 'match' || q.type === 'situations') && (
                <Match key={ready ? 'r' : 'i'} q={q} solved={solved.has(q.id)} onSolved={() => solve(q.id)} onMissed={() => miss(q.id)} initial={store.work[q.id]} onWork={(v) => saveWork(q.id, v)} />
              )}
              {q.type === 'order' && (
                <Order key={ready ? 'r' : 'i'} q={q} solved={solved.has(q.id)} onSolved={() => solve(q.id)} onMissed={() => miss(q.id)} initial={store.work[q.id]} onWork={(v) => saveWork(q.id, v)} />
              )}
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
