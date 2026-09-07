'use client'

/* Chapter 2's closing practice.

   Same contract as chapter 6's: the chapter is not finished by reading it, only
   by working through this. `islam:chapter:4 = 'done'` is written here and
   nowhere else.

   The questions live in practice.json with the §§ each one rests on. Two rules
   they obey: nothing is asked that the article answers by sitting next to it on
   the page (a term printed beside its gloss is not a question), and no answer
   invents a fact the source does not carry. */

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PracticeNav from '@/components/chapter6/summary/PracticeNav'
import raw from '@/lib/chapter4/practice.json'
import { CH4 } from '@/lib/chapter4/content'
import { markChapterComplete } from '@/lib/chapter4/progress'
import layout from '@/lib/chapter4/layout.json'
import {
  readPractice,
  resetPractice,
  writePractice,
  type PracticeStore,
} from '@/lib/chapter4/practice-progress'

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

const ART = '/assets/chapter4/'

const QUESTIONS = (raw as unknown as { questions: Q[] }).questions

/** which exercises this reader has already solved. Versioned like every other
    store in the product; the loader also filters against the current ids, so a
    change to the question set can never resurrect a tick for a question that
    no longer exists. */
/** the chapter's own sections, for the way back in at the foot of the screen.
    Read from the layout like every other name in this product — the component
    writes no title of its own. */
const SECTIONS = (layout as { sections: { id: string; title: string }[] }).sections
const KNOWN = new Set(QUESTIONS.map((q) => q.id))

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
    <p className={'p4-feedback' + (state === 'right' ? ' is-right' : '')} role="status">
      {state === 'right' ? q.ok : q.retry}
    </p>
  )
}

/* ---------------- one question per type ----------------

   EVERY TYPE TAKES THE SAME FOUR THINGS: the question, what to do when it is
   solved, what to do when an attempt misses, the board it was left on, and how
   to hand a new board back. The store keeps `work` as `unknown` on purpose —
   each type owns its own shape — so the two coercers below are where an
   unrecognised shape is dropped instead of crashing a screen. */
type Ex<T extends Q['type']> = {
  q: Extract<Q, { type: T }>
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


function Choice({ q, onSolved, onMissed, initial, onWork }: Ex<'single' | 'multi'>) {
  const opts = useMemo(() => shuffled(q.options, q.id.length * 97), [q])
  /* the board is restored from the store, so a half-marked question survives a
     reload exactly as it was left */
  const [picked, setPicked] = useState<string[]>(() => asStrings(initial))
  const [state, setState] = useState<State>('idle')
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
      <ul className="p4-options">
        {opts.map((o) => (
          <li key={o.text}>
            <button
              type="button"
              className={'p4-option' + (picked.includes(o.text) ? ' is-picked' : '') + (state === 'right' && o.right ? ' is-right' : '')}
              aria-pressed={picked.includes(o.text)}
              onClick={() => toggle(o.text)}
            >
              {o.text}
            </button>
          </li>
        ))}
      </ul>
      {multi && <p className="p4-hint">אפשר לסמן יותר מאחת.</p>}
      <div className="p4-actions">
        <button type="button" className="p4-check" disabled={!picked.length || state === 'right'} onClick={check}>
          בדיקה
        </button>
        <Feedback state={state} q={q} />
      </div>
    </>
  )
}

function Match({ q, onSolved, onMissed, initial, onWork }: Ex<'match' | 'situations'>) {
  const rows =
    q.type === 'match'
      ? q.pairs.map((p) => ({ left: p.left, right: p.right, photo: p.photo }))
      : q.pairs.map((p) => ({ left: p.key + ' — ' + p.text, right: p.to, photo: p.photo }))
  const withArt = rows.some((r) => r.photo)
  const answers = useMemo(() => shuffled(rows.map((r) => r.right), q.id.length * 53), [q])
  const [chosen, setChosen] = useState<Record<string, string>>(() => asMap(initial))
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
  /* THE NEXT BOARD IS COMPUTED HERE, NOT INSIDE THE UPDATER. Persisting from
     within `setChosen`'s callback is a side effect in a function React may call
     more than once — the React compiler refuses to memoise around it and the
     build fails. The updater is pure; the write happens after it. */
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
      <ul className="p4-bank" aria-label="התשובות">
        {answers.map((a) => (
          <li key={a}>
            <button
              type="button"
              className={'p4-chip' + (held === a ? ' is-held' : '') + (placed.has(a) ? ' is-placed' : '')}
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
      <ul className={'p4-match' + (withArt ? ' is-boards' : '')}>
        {rows.map((r) => (
          <li className="p4-match-row" key={r.left}>
            {r.photo && (
              <span className="p4-shot" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ART + r.photo} alt="" loading="lazy" decoding="async" />
              </span>
            )}
            <span className="p4-match-left">{r.left}</span>
            <button
              type="button"
              className={'p4-slot' + (chosen[r.left] ? ' is-full' : '')}
              disabled={done}
              onClick={() => put(r.left)}
              aria-label={chosen[r.left] ? `${r.left}: ${chosen[r.left]} — לחצו כדי להחזיר` : `${r.left}: בחרו תשובה`}
            >
              {chosen[r.left] ?? ''}
            </button>
          </li>
        ))}
      </ul>
      <div className="p4-actions">
        <button
          type="button"
          className="p4-check"
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
function Order({ q, onSolved, onMissed, initial, onWork }: Ex<'order'>) {
  /* the order the reader left it in, or the deterministic shuffle on a first
     visit. A stored order is accepted only if it is the same set of steps —
     anything else is a store written against a different question. */
  const [items, setItems] = useState<string[]>(() => {
    const kept = asStrings(initial)
    const same = kept.length === q.steps.length && kept.every((x) => q.steps.includes(x))
    return same ? kept : shuffled(q.steps, q.id.length * 71)
  })
  const [state, setState] = useState<State>('idle')

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
      {/* THE PICTURE TRAVELS WITH THE STEP. The chain is four beats of the
          desert stage the reader has just walked — the dusk valley, the shrunken
          waterhole, the two camps facing each other, the lone traveller — so
          ordering the chain is ordering those four pictures, and the sentence
          under each is what the frame says. Keyed by the step's own text, so a
          step carries its frame wherever it is moved to. */}
      <ol className={'p4-order' + (q.photos ? ' is-illustrated' : '')}>
        {items.map((s, i) => (
          <li key={s}>
            <span className="p4-order-n">{i + 1}</span>
            {q.photos?.[s] && (
              <span className="p4-shot" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ART + q.photos[s]} alt="" loading="lazy" decoding="async" />
              </span>
            )}
            <span className="p4-order-text">{s}</span>
            <span className="p4-order-moves">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || state === 'right'} aria-label="הזזה למעלה">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1 || state === 'right'} aria-label="הזזה למטה">↓</button>
            </span>
          </li>
        ))}
      </ol>
      <div className="p4-actions">
        <button type="button" className="p4-check" disabled={state === 'right'} onClick={check}>
          בדיקה
        </button>
        <Feedback state={state} q={q} />
      </div>
    </>
  )
}

/* ---------------- the page ---------------- */

export default function Chapter4Practice() {
  const [store, setStore] = useState<PracticeStore>({ done: [], missed: [], work: {} })
  const [finished, setFinished] = useState(false)
  const [askReset, setAskReset] = useState(false)
  /* THE EXERCISES REMOUNT ONCE, WHEN THE STORE HAS BEEN READ. Each question
     seeds its board from `initial` in a lazy `useState`, which runs on the
     FIRST render only — and the store arrives one render later, so every board
     was seeded empty and the restore silently did nothing. Measured: two
     placements and one mark written to storage, zero of them back on screen.
     Flipping this flag changes the components' `key`, which remounts them with
     the real board. One remount, and only ever one. */
  const [ready, setReady] = useState(false)
  /* true once the stored board has been read, so the writer below cannot clear
     storage with the empty store it holds on the very first render */
  const loaded = useRef(false)
  /* the screen was already complete when the reader arrived — the completion is
     then a state, not an event, and is not announced a second time */
  const restored = useRef(false)

  /* EVERYTHING THE READER DID SURVIVES A RELOAD, not only which questions are
     finished. Chapter 6 stores the individual placements and recomputes the
     rest from them; `work` is the same idea — the half-filled board of every
     question, whatever shape that question needs.

     READ IN AN EFFECT, NEVER DURING RENDER: localStorage does not exist on the
     server, and reading it while rendering is the classic hydration mismatch. */
  useEffect(() => {
    const read = readPractice(KNOWN)
    if (read.done.length || read.missed.length || Object.keys(read.work).length) {
      restored.current = read.done.length === QUESTIONS.length
      setStore(read)
      if (restored.current) setFinished(true)
    }
    loaded.current = true
    setReady(true)
  }, [])

  /* THE SIDE EFFECTS LIVE HERE AND NOT IN A STATE UPDATER. Writing to storage
     and marking the chapter complete from inside a `setState` callback is a
     side effect in a function React is free to call more than once; the React
     compiler refuses to memoise around it and the build fails. */
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

  /* a wrong attempt is remembered so the closing block can offer the way back
     to exactly those questions — chapter 6's `missed`, part for part */
  const miss = useCallback((id: string) => {
    setStore((s) => (s.missed.includes(id) ? s : { ...s, missed: [...s.missed, id] }))
  }, [])

  const saveWork = useCallback((id: string, value: unknown) => {
    setStore((s) => ({ ...s, work: { ...s.work, [id]: value } }))
  }, [])

  const reset = useCallback(() => {
    setStore(resetPractice())
    restored.current = false
    setFinished(false)
    setAskReset(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  /* the rail IS the progress display, as it is on chapter 6's practice: a tick
     beside an exercise when it is solved, and the name of every exercise
     reachable from anywhere on the page. The bar that used to sit under the
     title did half of that and could not be clicked. */
  const stops = QUESTIONS.map((q) => ({ id: `p4-${q.id}`, label: q.label, done: solved.has(q.id) }))

  return (
    <PracticeNav stops={stops} back={{ href: '/chapter4#chapter-end', label: 'חזרה לפרק 4' }}
      subtitle="פרק 4 · תרגול מסכם">
      <main className="chapter-article p4-main">
        {/* THE CHAPTER'S OWN BANNER, and this is the largest thing that was
            missing. The practice opened on a bare heading in a column as wide as
            the window — measured, 1457px against the article's 1172 — with no
            masthead, no rail and no band. Two pages of one chapter that shared
            no edge. Same banner as the article, without the film: a practice
            screen has no business autoplaying the chapter's video a second
            time, so the still stands on its own. */}
        <div className="ch4-hero p4-banner">
          <div className="ch4-hero-media" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/chapter4/hero-road.jpg" alt="" />
          </div>
          <div className="ch4-hero-copy">
            <h1 id="p4-title" className="ch4-hero-title">התרגול המסכם</h1>
          </div>
        </div>

        {/* THE COUNT IS DERIVED, NEVER TYPED (rule 32). „שמונה שאלות" over
            seven of them is the kind of thing a reader notices at once and
            does not forgive. */}
        <p className="p4-lead" data-reveal>
          {CH4.title} — {QUESTIONS.length} שאלות. אין ניקוד ואין כישלון: שאלה נשארת פתוחה עד שהיא נפתרת.
        </p>

        {/* EACH EXERCISE IS A SECTION OF THE ARTICLE, not an item of a list.
            They were `<li>`s under one `<h2>`-less list, so the page had one
            heading for eight subjects and the rail had nothing to point at. Now
            each carries the article's own heading block — title, ornament, and
            the section rhythm around it. */}
        {QUESTIONS.map((q, i) => (
          <section
            className={'article-section p4-q' + (solved.has(q.id) ? ' is-solved' : '')}
            id={`p4-${q.id}`}
            key={q.id}
            aria-labelledby={`p4-${q.id}-t`}
          >
            <header className="section-heading" data-reveal>
              <div>
                <h2 id={`p4-${q.id}-t`}>
                  <span className="p4-q-n">{String(i + 1).padStart(2, '0')}</span>
                  {q.prompt}
                </h2>
              </div>
              <div className="title-ornament section-ornament" aria-hidden="true"><span /></div>
            </header>
            <div className={'p4-work' + (q.photo ? ' has-plate' : '')} data-reveal>
              {/* A QUESTION THAT NAMES A THING GETS THE THING BESIDE IT. „ממה
                  התעשר שבט קורייש" over the Kaaba, „כיצד נפתרו סכסוכים" over
                  the seated arbiter, the two ancestors over the map of the
                  peninsula — the picture is not decoration, it is the subject
                  the four options are about, and the reader has met all three
                  in the chapter. */}
              {q.photo && (
                <figure className="p4-plate" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ART + q.photo} alt="" loading="lazy" decoding="async" />
                </figure>
              )}
              {(q.type === 'single' || q.type === 'multi') && (
                <Choice key={ready ? 'r' : 'i'} q={q} onSolved={() => solve(q.id)} onMissed={() => miss(q.id)} initial={store.work[q.id]} onWork={(v) => saveWork(q.id, v)} />
              )}
              {(q.type === 'match' || q.type === 'situations') && (
                <Match key={ready ? 'r' : 'i'} q={q} onSolved={() => solve(q.id)} onMissed={() => miss(q.id)} initial={store.work[q.id]} onWork={(v) => saveWork(q.id, v)} />
              )}
              {q.type === 'order' && (
                <Order key={ready ? 'r' : 'i'} q={q} onSolved={() => solve(q.id)} onMissed={() => miss(q.id)} initial={store.work[q.id]} onWork={(v) => saveWork(q.id, v)} />
              )}
            </div>
          </section>
        ))}

        {/* THE CLOSE IS CHAPTER 6'S, PART FOR PART: the article's own heading
            block, the way BACK into the chapter as a row of its sections, the
            focused return to whatever took a wrong attempt, and one row holding
            the way out beside the offer to work the questions again. No score —
            the spec is explicit that a completion status and focused feedback
            take its place. */}
        {finished && (
          <section className="p4-end" aria-labelledby="p4-end-t" data-reveal>
            <header className="section-heading" role="status">
              <div>
                <h2 id="p4-end-t">הפרק הושלם.</h2>
              </div>
              <div className="title-ornament section-ornament" aria-hidden="true"><span /></div>
              <p>{QUESTIONS.length} שאלות, וכולן נפתרו. הפרק מסומן כהושלם במסך הפרקים.</p>
            </header>

            <p className="p4-end-nav">חזרה לפרק:</p>
            <ul className="p4-end-frieze">
              {SECTIONS.map((sec) => (
                <li key={sec.id}>
                  <Link className="p4-end-sec" href={`/chapter4#${sec.id}`}>{sec.title}</Link>
                </li>
              ))}
            </ul>

            {store.missed.length > 0 && (
              <p className="p4-revisit">
                <span>שווה לחזור אל:</span>
                {QUESTIONS.filter((x) => store.missed.includes(x.id)).map((x) => (
                  <a key={x.id} href={`#p4-${x.id}`}>{x.label}</a>
                ))}
              </p>
            )}

            <div className="p4-out">
              <Link className="ch4-end-link" href="/chapters">לכל פרקי הלמידה</Link>
              {askReset ? (
                <span className="p4-reset-confirm" role="group" aria-label="אישור חזרה על התרגול">
                  <span className="p4-reset-ask">לאפס ולהתחיל מחדש?</span>
                  <button type="button" className="p4-secondary" onClick={reset}>כן, להתחיל מחדש</button>
                  <button type="button" className="p4-secondary" onClick={() => setAskReset(false)}>ביטול</button>
                </span>
              ) : (
                <button type="button" className="p4-secondary" onClick={() => setAskReset(true)}>לעבור על התרגול שוב</button>
              )}
            </div>
            <p className="p4-out-note">איפוס מוחק את התשובות בלבד. הפרק נשאר מסומן כהושלם.</p>
          </section>
        )}
      </main>
    </PracticeNav>
  )
}
