'use client'

/* Chapter 1's closing practice.

   Same contract, same shell and the same exercise surfaces as chapters 2, 3 and
   6: `PracticeNav` is the article's own masthead + rail, and every class used
   below (`.p2-*`, `.article-section`, `.section-heading`, `.title-ornament`)
   already exists — this file invents no UI. Chapter 1 is a game rather than an
   article, so the ONE thing it adds is which picture stands in the banner, and
   that is a single rule at the end of chapter1.css.

   The questions rest only on the chapter's own approved content: dialogue.json,
   finds.ts and tasks.ts. Nothing here states a fact the traveller was not told
   or shown on the road. Two rules they obey, as in chapter 2: nothing is asked
   that answers itself by sitting next to its own gloss, and no option invents a
   fact the source does not carry.

   `islam:chapter:1 = 'done'` is written when the last question closes, exactly
   as chapters 2, 3 and 6 write theirs — the journey is the chapter, and this is
   where the chapter is signed off. */

import Link from 'next/link'
import { useCallback, useMemo, useRef, useState } from 'react'
import PracticeNav from '@/components/chapter6/summary/PracticeNav'

/* `why` IS THE WHOLE POINT OF GETTING IT WRONG. Chapter 2 answers a wrong check
   with one sentence per question; here a wrong option can answer for itself,
   because chapter 1's own tasks.ts does exactly that — every option in the game
   carries a `note` that explains why it is the option it is, right or wrong.
   Same idea, same line, same `.p2-feedback` paragraph: no new surface, only a
   better sentence in it. Falls back to the question's `retry` when the picked
   option has nothing of its own to say. */
type Option = { text: string; right?: boolean; why?: string }

/* ── התוכן עבר ל-practice.json ──────────────────────────────────────────
   הוא ישב כאן, בתוך הקומפוננטה, ולכן לא היה שער שקורא אותו: שאלה יכלה
   לשאול על „רמות תימן" שנה אחרי שהתחנה בוטלה, וזה בדיוק מה שקרה. עכשיו
   כל פריט נושא §N ו-check-content.mjs מאמת אותו מול SOURCE-TEXT, כמו כל
   מחרוזת לימודית אחרת בפרויקט. */
type Q = { id: string; label: string; prompt: string; ok: string; retry: string; source: string } & (
  | { type: 'single' | 'multi'; options: Option[] }
  | { type: 'match'; pairs: { left: string; right: string }[] }
  | { type: 'order'; steps: string[] }
)

import practice from '@/lib/chapter1/practice.json'

const QUESTIONS = practice.questions as unknown as Q[]

/* מה שנלקח מן הדרך — ארבעה משפטים, כל אחד סעיף בחוברת */
const TAKEAWAYS = (practice.takeaways as { source: string; text: string }[]).map((t) => t.text)

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

function Feedback({ state, text }: { state: State; text: string }) {
  if (state === 'idle') return null
  return (
    <p className={'p2-feedback' + (state === 'right' ? ' is-right' : '')} role="status">
      {text}
    </p>
  )
}

/* ---------------- one question per type ---------------- */

function Choice({ q, onSolved }: { q: Extract<Q, { type: 'single' | 'multi' }>; onSolved: () => void }) {
  const opts = useMemo(() => shuffled(q.options, q.id.length * 97), [q])
  const [picked, setPicked] = useState<string[]>([])
  const [state, setState] = useState<State>('idle')
  const [said, setSaid] = useState('')
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
    /* THE WRONG OPTION ANSWERS FOR ITSELF where it has something to say — the
       reader is told why THIS choice is not the one, not merely that it is not.
       With nothing picked wrong (a `multi` that is simply short) the question's
       own line explains what is missing. */
    const badly = q.options.find((o) => !o.right && got.has(o.text) && o.why)
    setSaid(ok ? q.ok : (badly?.why ?? q.retry))
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
              className={
                'p2-option' +
                (picked.includes(o.text) ? ' is-picked' : '') +
                (state === 'right' && o.right ? ' is-right' : '')
              }
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
        <Feedback state={state} text={said} />
      </div>
    </>
  )
}

function Match({ q, onSolved }: { q: Extract<Q, { type: 'match' }>; onSolved: () => void }) {
  const rows = q.pairs
  const answers = useMemo(() => shuffled(q.pairs.map((p) => p.right), q.id.length * 53), [q])
  const [chosen, setChosen] = useState<Record<string, string>>({})
  const [held, setHeld] = useState<string | null>(null)
  const heldRef = useRef<string | null>(null)
  const [state, setState] = useState<State>('idle')
  const done = state === 'right'
  const placed = new Set(Object.values(chosen))

  /* hold an answer, then give it to a row — and clicking a filled row hands the
     answer back to the bank. Chapter 2's two moves exactly, including the ref:
     read from state, the slot's handler sees the value from the render that
     attached it, so a reader fast enough to pick and drop inside one tick
     places the PREVIOUS answer and the whole board comes out shifted by one. */
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
        <Feedback state={state} text={state === 'right' ? q.ok : q.retry} />
      </div>
    </>
  )
}

/** Put the steps in order. The board starts shuffled and the reader walks a
    step up or down until the chain reads the way it was walked. */
function Order({ q, onSolved }: { q: Extract<Q, { type: 'order' }>; onSolved: () => void }) {
  const [items, setItems] = useState<string[]>(() => shuffled(q.steps, q.id.length * 71))
  const [state, setState] = useState<State>('idle')
  /** מה מוחזק עכשיו — בעכבר או במקלדת. אותו מצב לשתי הדרכים. */
  const [held, setHeld] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)

  /* גרירה, ולא שני חצאי-כפתורים.
     ‎↑/↓ זעירים הם מטרה של כמה פיקסלים, וסידור חמישה פריטים דרכם הוא
     תריסר לחיצות מדויקות. הגרירה היא הדרך הראשית; המקלדת עושה בדיוק
     את אותו דבר — רווח מרים ומניח, החצים מזיזים את מה שמוחזק — כדי
     שמי שאינו משתמש בעכבר יקבל את אותה פעולה ולא פעולה אחרת. */
  const moveTo = useCallback((from: number, to: number) => {
    setState('idle')
    setItems((cur) => {
      if (to < 0 || to >= cur.length || from === to) return cur
      const next = [...cur]
      const [it] = next.splice(from, 1)
      next.splice(to, 0, it)
      return next
    })
  }, [])

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (state === 'right') return
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      setHeld((h) => (h === i ? null : i))
      return
    }
    if (held === null) return
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault(); moveTo(held, held - 1); setHeld(held - 1)
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault(); moveTo(held, held + 1); setHeld(held + 1)
    }
  }

  function check() {
    const ok = items.every((s, i) => s === q.steps[i])
    setState(ok ? 'right' : 'wrong')
    if (ok) { setHeld(null); onSolved() }
  }

  return (
    <>
      <p className="p1-order-how">גררו את השורות לסדר הנכון. במקלדת: רווח מרים ומניח, והחצים מזיזים.</p>
      <ol className="p2-order p1-order">
        {items.map((s, i) => (
          <li
            key={s}
            draggable={state !== 'right'}
            tabIndex={0}
            role="button"
            aria-grabbed={held === i}
            aria-label={`${i + 1}. ${s}`}
            className={
              (held === i ? 'is-held' : '') + (over === i && held !== null && held !== i ? ' is-over' : '')
            }
            onKeyDown={(e) => onKey(e, i)}
            onDragStart={(e) => { setHeld(i); e.dataTransfer.effectAllowed = 'move' }}
            onDragOver={(e) => { e.preventDefault(); setOver(i) }}
            onDragLeave={() => setOver((o) => (o === i ? null : o))}
            onDrop={(e) => { e.preventDefault(); if (held !== null) moveTo(held, i); setHeld(null); setOver(null) }}
            onDragEnd={() => { setHeld(null); setOver(null) }}
            onClick={() => {
              if (state === 'right') return
              if (held === null) setHeld(i)
              else { moveTo(held, i); setHeld(null) }
            }}
          >
            <span className="p2-order-n">{i + 1}</span>
            <span className="p2-order-text">{s}</span>
            <span className="p1-order-grip" aria-hidden="true">⋮⋮</span>
          </li>
        ))}
      </ol>
      <div className="p2-actions">
        <button type="button" className="p2-check" disabled={state === 'right'} onClick={check}>
          בדיקה
        </button>
        <Feedback state={state} text={state === 'right' ? q.ok : q.retry} />
      </div>
    </>
  )
}

/* ---------------- the page ---------------- */

export default function Chapter1Practice() {
  const [solved, setSolved] = useState<Set<string>>(new Set())
  const [finished, setFinished] = useState(false)

  const solve = useCallback((id: string) => {
    setSolved((s) => {
      if (s.has(id)) return s
      const next = new Set(s).add(id)
      if (next.size === QUESTIONS.length) {
        /* the chapter is signed off here, as it is on every other chapter's
           practice. Blocked storage must never break the page. */
        try {
          window.localStorage.setItem('islam:chapter:1', 'done')
        } catch {
          /* private mode — the screen still finishes */
        }
        setFinished(true)
      }
      return next
    })
  }, [])

  /* the rail IS the progress display, as it is on chapters 2, 3 and 6: a tick
     beside an exercise when it is solved, and the name of every exercise
     reachable from anywhere on the page. No bar, no percentage, no score. */
  const stops = QUESTIONS.map((q) => ({ id: `p1-${q.id}`, label: q.label, done: solved.has(q.id) }))
  return (
    <PracticeNav stops={stops} subtitle="פרק 1 · תרגול מסכם" back={{ href: '/chapter1', label: 'חזרה לפרק 1' }}>
      <main className="chapter-article p2-main">
        {/* THE CHAPTER'S OWN BANNER — the article shell's band, carrying the
            still the journey opens on rather than chapter 2's desert. */}
        <div className="ch2-hero p1-banner">
          <div className="ch2-hero-media" aria-hidden="true" />
          <div className="ch2-hero-copy">
            <h1 id="p1-title" className="ch2-hero-title">
              התרגול המסכם
            </h1>
          </div>
        </div>

        {/* המספר נגזר מן הרשימה ולא מועתק לתוך המשפט: „שש שאלות" מעל
            שבע הוא הדבר שקורא מבחין בו מיד ולא סולח עליו. */}
        <p className="p2-lead" data-reveal>
          {`${QUESTIONS.length} שאלות בדף אחד, כולן על השאלה שהפרק נפתח בה: איך עלה רעיון המונותאיזם בדעתו של מוחמד. `}
          אין ניקוד ואין כישלון: שאלה נשארת פתוחה עד שהיא נפתרת, ותשובה שאינה נכונה מקבלת הסבר ולא ציון.
        </p>

        {/* כל השאלות בדף אחד, כמו בתרגול של פרק 2 — גוללים, והסרגל
            מסמן מה נפתר. הגרסה של „שאלה אחת בכל פעם" ירדה לבקשת הבעלים. */}
        {QUESTIONS.map((q, i) => (
          <section
            className={'article-section p2-q' + (solved.has(q.id) ? ' is-solved' : '')}
            id={`p1-${q.id}`}
            key={q.id}
            aria-labelledby={`p1-${q.id}-t`}
          >
            <header className="section-heading" data-reveal>
              <div>
                <h2 id={`p1-${q.id}-t`}>
                  <span className="p2-q-n">{String(i + 1).padStart(2, '0')}</span>
                  {q.prompt}
                </h2>
              </div>
              <div className="title-ornament section-ornament" aria-hidden="true">
                <span />
              </div>
            </header>
            <div className="p2-work" data-reveal>
              {(q.type === 'single' || q.type === 'multi') && <Choice q={q} onSolved={() => solve(q.id)} />}
              {q.type === 'match' && <Match q={q} onSolved={() => solve(q.id)} />}
              {q.type === 'order' && <Order q={q} onSolved={() => solve(q.id)} />}
            </div>
          </section>
        ))}

        {finished && (
          <>
            {/* WHAT THE ROAD LEAVES BEHIND. Four sentences, in the article's own
                section block — not a summary of the exercises just finished, but
                the chapter's own conclusions, stated once. */}
            <section className="article-section p2-q" id="p1-takeaways" aria-labelledby="p1-takeaways-t">
              <header className="section-heading">
                <div>
                  <h2 id="p1-takeaways-t">מה לוקחים מן הדרך</h2>
                </div>
                <div className="title-ornament section-ornament" aria-hidden="true">
                  <span />
                </div>
              </header>
              <ul className="p1-takeaways">
                {TAKEAWAYS.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>

            <div className="p2-done" role="status">
              <div className="title-ornament" aria-hidden="true">
                <span />
              </div>
              <p>הפרק הושלם.</p>
              <Link className="ch2-end-link" href="/chapters">
                לכל פרקי הלמידה
              </Link>
            </div>
          </>
        )}
      </main>
    </PracticeNav>
  )
}
