'use client'

/* THE CLOSING PRACTICE — one engine for every chapter that runs the `p2-*` practice.

   Chapters 1, 5 and 7–14 were twelve copies of one 449-line file (diffed 11.11.2026: the only
   differences were imports, the asset folder, the banner's class and the masthead label),
   chapter 2 was the same file with the „✓ נכון" mark the others lacked, and chapters 3 and 4
   were the same engine under `p3-*` / `p4-*` names. A fix made in one never reached the other
   eleven — which is how the right/wrong mark lived in chapter 2 only, and how chapter 4 shipped
   a developer's note as its lead. Now a chapter's practice is `practice.json` + a wrapper of a
   dozen lines that says which chapter it is (see Chapter5Practice.tsx).

   THE CONTRACT IS UNCHANGED, chapter by chapter: the same localStorage key and shape
   (`chN:practice:v1` = {done, missed, work}, through the chapter's own read/write), the same
   board shapes in `work`, the same deterministic shuffles (same seeds — a returning reader gets
   the same board), and `markChapterComplete` called when the last question is solved — the only
   place `islam:chapter:N = 'done'` is written.

   What every chapter now gets, from one place:
   · the lead says up front that there is a score and what it counts (PracticeLead)
   · right and wrong are told apart by a mark and a word, not by text colour — „✓ נכון" boxed
     in gold, „↩ נסו שוב" boxed in a dashed stamp-red line — and the success opener is one word
   · after „בדיקה", the option / slot / step that is wrong is marked (✕ and a dashed border)
     until the reader changes something
   · single choice draws a radio, multiple choice a checkbox, and the instruction sits ABOVE the
     options instead of after them
   · an empty slot says what it is for; the order buttons are 44px; a step can also be moved in
     one go — tap it, then tap where it goes */

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import PracticeNav from '@/components/chapter6/summary/PracticeNav'
import PracticeScore, { PracticeLead } from '@/components/PracticeScore'
import { okBody } from './opener'
import '@/styles/shared-practice.css'

/* ---------------------------------------------------------------- the data ---- */

/* `photo` NAMES A FILE THE CHAPTER ALREADY PAINTED: the practice gets no picture set of its own,
   so a reader who worked the chapter recognises the plate. */
type Base = { id: string; label: string; photo?: string; prompt: string; ok: string; retry: string }
export type PracticeQuestion =
  | (Base & { type: 'single' | 'multi'; options: { text: string; right: boolean }[] })
  | (Base & { type: 'match'; pairs: { left: string; right: string; photo?: string }[] })
  | (Base & { type: 'order'; steps: string[]; photos?: Record<string, string> })
  | (Base & { type: 'situations'; pairs: { key: string; text: string; to: string; photo?: string }[] })
  /* chapter 3's prophets: numbered places, a name into each. Drawn as a numbered match; the
     board it stores is the same `{n: name}` map it always stored. */
  | (Base & { type: 'place'; slots: { n: number; answer: string }[] })

export interface PracticeStore {
  done: string[]
  missed: string[]
  work: Record<string, unknown>
}

export interface PracticeEngineProps {
  chapter: number
  /** the chapter's title, as its content module prints it */
  title: string
  questions: PracticeQuestion[]
  /** the chapter's asset folder, with the trailing slash */
  art: string
  /** the chapter's own store (lib/chapterN/practice-progress.ts), or `practiceStore(key)` */
  store: {
    /* `missed` may be absent in an older chapter's type (chapter 3); it is read as none */
    read: (known: Set<string>) => Omit<PracticeStore, 'missed'> & { missed?: string[] }
    write: (s: PracticeStore) => void
    reset?: () => Omit<PracticeStore, 'missed'> & { missed?: string[] }
  }
  /** lib/chapterN/progress.ts — writes `islam:chapter:N = 'done'` */
  onComplete: () => void
  /** chapter 3 marked the chapter again when a finished practice was reopened; kept */
  markOnRestore?: boolean
  back: { href: string; label: string }
  /** the banner: `prefix` is the hero family (`ch6` unless the chapter has its own), `className`
      and `mediaClassName` the chapter's still; `media` is a child of the media box (chapter 4) */
  banner: { prefix?: string; className?: string; mediaClassName?: string; media?: ReactNode }
  /** the `id` prefix of each question's section (and so the rail's anchors) — `p2-` unless the
      chapter's anchors were published under another */
  idPrefix?: string
  /** a plate that is a cut-out sits bare on the page (rule 45) — chapters 7 and 8 */
  isCut?: (photo: string) => boolean
  /** the place question's bank, by name (chapter 3: „הנביאים") */
  placeBankLabel?: string
  /** anything the chapter adds to its closing block, after the score */
  doneExtra?: ReactNode
}

/* ---------------------------------------------------------------- helpers ---- */

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

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

const asMap = (v: unknown): Record<string, string> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, string> = {}
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (typeof x === 'string') out[k] = x
  return out
}


type State = 'idle' | 'wrong' | 'right'

const Tick = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5 10 17.5 19 7.5" />
  </svg>
)
/* chapter 6's return arrow: the attempt went back, nothing was lost */
const Retry = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 14H17a4 4 0 0 0 0-8h-6M9 14l3-3M9 14l3 3" />
  </svg>
)
const Cross = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
    <path d="M7 7l10 10M17 7 7 17" />
  </svg>
)

function Feedback({ state, q }: { state: State; q: PracticeQuestion }) {
  if (state === 'idle') return null
  const right = state === 'right'
  return (
    <p className={'p2-feedback' + (right ? ' is-right' : ' is-wrong')} role="status">
      <b className="p2-feedback-mark">
        {right ? <Tick /> : <Retry />}
        {right ? 'נכון' : 'נסו שוב'}
      </b>
      <span className="p2-feedback-text">{right ? okBody(q.ok) : q.retry}</span>
    </p>
  )
}

/* ------------------------------------------------------- one question per type ----

   Every type takes the same things: the question, what to do when it is solved or missed, the
   board it was left on (`initial`, and whether it was already solved), and how to hand a new
   board back. The next board is computed in the handler and not inside a state updater, because
   it is also persisted — a side effect in an updater is one React may repeat. */
type Ex<T extends PracticeQuestion['type']> = {
  q: Extract<PracticeQuestion, { type: T }>
  art: string
  solved: boolean
  onSolved: () => void
  onMissed: () => void
  initial: unknown
  onWork: (value: unknown) => void
}

function Choice({ q, solved, onSolved, onMissed, initial, onWork }: Ex<'single' | 'multi'>) {
  const opts = useMemo(() => shuffled(q.options, q.id.length * 97), [q])
  const [picked, setPicked] = useState<string[]>(() =>
    asStrings(initial).filter((t) => q.options.some((o) => o.text === t)),
  )
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
      {/* the instruction comes BEFORE the options — printed after them it sat ~450px under the
          prompt it qualifies, read only by someone who had already answered */}
      <p className="p2-hint">{multi ? 'אפשר לסמן יותר מתשובה אחת.' : 'בחרו תשובה אחת.'}</p>
      <ul className={'p2-options' + (multi ? ' is-multi' : ' is-single')}>
        {opts.map((o) => {
          const on = picked.includes(o.text)
          const wrong = state === 'wrong' && on && !o.right
          return (
            <li key={o.text}>
              <button
                type="button"
                className={
                  'p2-option' +
                  (on ? ' is-picked' : '') +
                  (state === 'right' && o.right ? ' is-right' : '') +
                  (wrong ? ' is-wrong' : '')
                }
                aria-pressed={on}
                onClick={() => toggle(o.text)}
              >
                <span className="p2-tick" aria-hidden="true">
                  {wrong ? <Cross /> : (state === 'right' && o.right) || (multi && on) ? <Tick /> : null}
                </span>
                <span className="p2-option-text">{o.text}</span>
                {wrong && <span className="sr-only"> — לא נכון</span>}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="p2-actions">
        <button type="button" className="p2-check" disabled={!picked.length || state === 'right'} onClick={check}>
          בדיקה
        </button>
        <Feedback state={state} q={q} />
      </div>
    </>
  )
}

type Row = { left: string; right: string; photo?: string }

function Match({
  q,
  art,
  solved,
  onSolved,
  onMissed,
  initial,
  onWork,
  bankLabel,
}: Ex<'match' | 'situations' | 'place'> & { bankLabel?: string }) {
  const numbered = q.type === 'place'
  const rows: Row[] =
    q.type === 'match'
      ? q.pairs.map((p) => ({ left: p.left, right: p.right, photo: p.photo }))
      : q.type === 'situations'
        ? q.pairs.map((p) => ({ left: p.key + ' — ' + p.text, right: p.to, photo: p.photo }))
        : [...q.slots].sort((a, b) => a.n - b.n).map((s) => ({ left: String(s.n), right: s.answer }))
  const withArt = rows.some((r) => r.photo)
  const answers = useMemo(
    () => shuffled(rows.map((r) => r.right), q.id.length * (numbered ? 61 : 53)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q],
  )
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
  const placed = new Set(Object.values(chosen))

  /* hold an answer, then give it to a row — and clicking a filled row hands the answer back to
     the bank. Chapter 6's two moves, and the reason there is no <select>: a native dropdown hid
     the whole answer set behind a click so nothing could be compared.

     THE HELD ANSWER IS KEPT IN A REF AS WELL AS IN STATE. Read from state, the slot's handler
     sees the value from the render that attached it: a reader who picks an answer and drops it
     in the same tick placed the PREVIOUS answer, and the whole board came out shifted by one. */
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
      <p className="p2-hint">
        {numbered ? 'לחצו על שם, ואז על המקום שלו.' : 'לחצו על תשובה, ואז על המשבצת שלה. לחיצה על משבצת מלאה מחזירה את התשובה.'}
      </p>
      <ul className="p2-bank" aria-label={bankLabel ?? 'התשובות'}>
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
      {/* WITH PICTURES IT IS A ROW OF BOARDS, WITHOUT THEM IT IS A LIST OF ROWS. A slot stays
          enabled while the question is open; clicked with an empty hand it does nothing. */}
      <ul className={'p2-match' + (withArt ? ' is-boards' : '') + (numbered ? ' is-numbered' : '')}>
        {rows.map((r) => {
          const val = chosen[r.left]
          const wrong = state === 'wrong' && !!val && val !== r.right
          const name = numbered ? `מקום ${r.left}` : r.left
          return (
            <li className={'p2-match-row' + (wrong ? ' is-wrong' : '')} key={r.left}>
              {r.photo && (
                <span className="p2-shot" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={art + r.photo} alt="" loading="lazy" decoding="async" />
                </span>
              )}
              <span className={numbered ? 'p2-order-n' : 'p2-match-left'}>{r.left}</span>
              <button
                type="button"
                className={'p2-slot' + (val ? ' is-full' : ' is-empty') + (held && !val ? ' is-ready' : '') + (wrong ? ' is-wrong' : '')}
                disabled={done}
                onClick={() => put(r.left)}
                aria-label={
                  val
                    ? `${name}: ${val}${wrong ? ' — לא נכון' : ''} — לחצו כדי להחזיר`
                    : `${name}: ${held ? `לחצו כדי להניח את „${held}"` : 'בחרו תשובה'}`
                }
              >
                {wrong && <Cross className="p2-x" />}
                {val ?? <span className="p2-slot-ph" aria-hidden="true">{held ? 'לחצו כאן' : 'בחרו תשובה'}</span>}
              </button>
            </li>
          )
        })}
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

/** Put the steps in order. The board starts shuffled; a step walks up or down one place at a
    time with the arrows, or goes straight to where it belongs: tap it, then tap the step whose
    place it should take (six steps used to take up to fifteen presses). */
function Order({ q, art, solved, onSolved, onMissed, initial, onWork }: Ex<'order'>) {
  const [items, setItems] = useState<string[]>(() => {
    const kept = asStrings(initial)
    const same = kept.length === q.steps.length && kept.every((x) => q.steps.includes(x))
    return same ? kept : shuffled(q.steps, q.id.length * 71)
  })
  const [state, setState] = useState<State>(solved ? 'right' : 'idle')
  const [held, setHeld] = useState<number | null>(null)
  const done = state === 'right'

  const commit = (next: string[]) => {
    setState('idle')
    setItems(next)
    onWork(next)
  }
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    setHeld(null)
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    commit(next)
  }
  const pick = (i: number) => {
    if (done) return
    if (held === null) {
      setHeld(i)
      return
    }
    if (held === i) {
      setHeld(null)
      return
    }
    const next = [...items]
    const [it] = next.splice(held, 1)
    next.splice(i, 0, it)
    setHeld(null)
    commit(next)
  }

  function check() {
    setHeld(null)
    const ok = items.every((s, i) => s === q.steps[i])
    setState(ok ? 'right' : 'wrong')
    if (ok) onSolved()
    else onMissed()
  }

  return (
    <>
      <p className="p2-hint">הזיזו שלב בחצים, או לחצו עליו ואחר כך על המקום שאליו הוא עובר.</p>
      {/* a step's picture is keyed by the step's own text, so it travels with the step */}
      <ol className={'p2-order' + (q.photos ? ' is-illustrated' : '')}>
        {items.map((s, i) => {
          const wrong = state === 'wrong' && s !== q.steps[i]
          return (
            <li key={s} className={(held === i ? 'is-held' : '') + (wrong ? ' is-wrong' : '')}>
              <button
                type="button"
                className="p2-order-pick"
                disabled={done}
                aria-pressed={held === i}
                aria-label={
                  `${i + 1}. ${s}` +
                  (wrong ? ' — לא במקום' : '') +
                  (held === null ? ' — לחצו כדי להעביר' : held === i ? ' — לחצו כדי לבטל' : ' — לחצו כדי להעביר לכאן')
                }
                onClick={() => pick(i)}
              >
                <span className="p2-order-n">
                  {i + 1}
                  {wrong && <Cross className="p2-x" />}
                </span>
                {q.photos?.[s] && (
                  <span className="p2-shot" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={art + q.photos[s]} alt="" loading="lazy" decoding="async" />
                  </span>
                )}
                <span className="p2-order-text">{s}</span>
              </button>
              <span className="p2-order-moves">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || done} aria-label="הזזה למעלה">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1 || done} aria-label="הזזה למטה">↓</button>
              </span>
            </li>
          )
        })}
      </ol>
      <div className="p2-actions">
        <button type="button" className="p2-check" disabled={done} onClick={check}>
          בדיקה
        </button>
        <Feedback state={state} q={q} />
      </div>
    </>
  )
}

/* ---------------------------------------------------------------- the page ---- */

export default function PracticeEngine({
  chapter,
  title,
  questions,
  art,
  store: io,
  onComplete,
  markOnRestore = false,
  back,
  banner,
  idPrefix = 'p2-',
  isCut,
  placeBankLabel,
  doneExtra,
}: PracticeEngineProps) {
  const known = useMemo(() => new Set(questions.map((q) => q.id)), [questions])
  const [store, setStore] = useState<PracticeStore>({ done: [], missed: [], work: {} })
  const [finished, setFinished] = useState(false)
  const [askReset, setAskReset] = useState(false)
  /* The boards seed from `initial` in a lazy useState, which runs on the first render — one
     render before the store is read. Flipping `ready` changes their `key` and remounts them
     once with the real board (BUILD-RULES 75). */
  const [ready, setReady] = useState(false)
  /* the writer must not clear storage with the empty store of the first render */
  const loaded = useRef(false)
  /* arrived already complete: a state, not an event to announce again */
  const restored = useRef(false)

  /* read in an effect: there is no localStorage on the server */
  useEffect(() => {
    const got = io.read(known)
    const read: PracticeStore = { ...got, missed: got.missed ?? [] }
    restored.current = read.done.length === questions.length
    setStore(read)
    if (restored.current) {
      setFinished(true)
      if (markOnRestore) onComplete()
    }
    loaded.current = true
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* side effects here, never in a state updater (React may call those twice) */
  useEffect(() => {
    if (!loaded.current) return
    io.write(store)
    if (store.done.length === questions.length && !restored.current) {
      onComplete()
      setFinished(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const reset = () => {
    if (!io.reset) return
    const fresh = io.reset()
    setStore({ ...fresh, missed: fresh.missed ?? [] })
    restored.current = false
    setFinished(false)
    setAskReset(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* the rail IS the progress display: a tick beside a question when it is solved */
  const stops = questions.map((q) => ({ id: `${idPrefix}${q.id}`, label: q.label, done: solved.has(q.id) }))
  const hero = banner.prefix ?? 'ch6'

  return (
    <PracticeNav stops={stops} back={back} subtitle={`פרק ${chapter} · התרגול המסכם`}>
      <main className="chapter-article p2-main">
        {/* THE CHAPTER'S OWN BANNER, without the film: a practice screen has no business
            autoplaying the chapter's video a second time, so the still stands on its own. */}
        <div className={`${hero}-hero p2-banner` + (banner.className ? ' ' + banner.className : '')}>
          <div className={`${hero}-hero-media` + (banner.mediaClassName ? ' ' + banner.mediaClassName : '')} aria-hidden="true">
            {banner.media}
          </div>
          <div className={`${hero}-hero-copy`}>
            <h1 id="p2-title" className={`${hero}-hero-title`}>התרגול המסכם</h1>
          </div>
        </div>

        <PracticeLead title={title} count={questions.length} />

        {/* EACH QUESTION IS A SECTION OF THE ARTICLE: the article's heading block, ornament and
            rhythm, and an id the rail points at. */}
        {questions.map((q, i) => {
          const k = ready ? 'r' : 'i'
          const props = {
            art,
            solved: solved.has(q.id),
            onSolved: () => solve(q.id),
            onMissed: () => miss(q.id),
            initial: store.work[q.id],
            onWork: (v: unknown) => saveWork(q.id, v),
          }
          return (
            <section
              className={'article-section p2-q' + (solved.has(q.id) ? ' is-solved' : '')}
              id={`${idPrefix}${q.id}`}
              key={q.id}
              aria-labelledby={`${idPrefix}${q.id}-t`}
            >
              <header className="section-heading" data-reveal>
                <div>
                  <h2 id={`${idPrefix}${q.id}-t`}>
                    <span className="p2-q-n">{String(i + 1).padStart(2, '0')}</span>
                    {q.prompt}
                  </h2>
                </div>
                <div className="title-ornament section-ornament" aria-hidden="true"><span /></div>
              </header>
              <div className={'p2-work' + (q.photo ? ' has-plate' : '')} data-reveal>
                {/* a question whose subject the chapter painted gets that painting beside it */}
                {q.photo && (
                  <figure className={'p2-plate' + (isCut?.(q.photo) ? ' is-cut' : '')} aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={art + q.photo} alt="" loading="lazy" decoding="async" />
                  </figure>
                )}
                {/* one box for the exercise, so the plate beside it spans one row and the
                    exercise's own parts keep their own spacing */}
                <div className="p2-body">
                  {(q.type === 'single' || q.type === 'multi') && <Choice key={k} q={q} {...props} />}
                  {(q.type === 'match' || q.type === 'situations' || q.type === 'place') && (
                    <Match key={k} q={q} {...props} bankLabel={q.type === 'place' ? placeBankLabel : undefined} />
                  )}
                  {q.type === 'order' && <Order key={k} q={q} {...props} />}
                </div>
              </div>
            </section>
          )
        })}

        {finished && (
          <div className="p2-done" role="status">
            <div className="title-ornament" aria-hidden="true"><span /></div>
            <p className="p2-done-title">הפרק הושלם.</p>
            <PracticeScore chapter={chapter} questions={questions} missed={store.missed} idPrefix={idPrefix} />
            {doneExtra}
            <div className="p2-out">
              <Link className="chapter-end-back" href="/chapters">לכל פרקי הלמידה</Link>
              {io.reset &&
                (askReset ? (
                  <span className="p2-reset-confirm" role="group" aria-label="אישור חזרה על התרגול">
                    <span className="p2-reset-ask">לאפס ולהתחיל מחדש?</span>
                    <button type="button" className="p2-secondary" onClick={reset}>כן, להתחיל מחדש</button>
                    <button type="button" className="p2-secondary" onClick={() => setAskReset(false)}>ביטול</button>
                  </span>
                ) : (
                  <button type="button" className="p2-secondary" onClick={() => setAskReset(true)}>לעבור על התרגול שוב</button>
                ))}
            </div>
            {io.reset && <p className="p2-out-note">איפוס מוחק את התשובות בלבד. הפרק נשאר מסומן כהושלם.</p>}
          </div>
        )}
      </main>
    </PracticeNav>
  )
}
