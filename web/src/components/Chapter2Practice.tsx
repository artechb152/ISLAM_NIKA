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
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import raw from '@/lib/chapter2/practice.json'
import { CH2 } from '@/lib/chapter2/content'
import { markChapterComplete } from '@/lib/chapter2/progress'

type Q =
  | { id: string; type: 'single' | 'multi'; prompt: string; ok: string; retry: string; options: { text: string; right: boolean }[] }
  | { id: string; type: 'match'; prompt: string; ok: string; retry: string; pairs: { left: string; right: string }[] }
  | { id: string; type: 'order'; prompt: string; ok: string; retry: string; steps: string[] }
  | { id: string; type: 'situations'; prompt: string; ok: string; retry: string; pairs: { key: string; text: string; to: string }[] }

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
  const [state, setState] = useState<State>('idle')

  function check() {
    const ok = rows.every((r) => chosen[r.left] === r.right)
    setState(ok ? 'right' : 'wrong')
    if (ok) onSolved()
  }

  return (
    <>
      <div className="p2-match">
        {rows.map((r) => (
          <div className="p2-match-row" key={r.left}>
            <span className="p2-match-left">{r.left}</span>
            <select
              className="p2-select"
              value={chosen[r.left] ?? ''}
              disabled={state === 'right'}
              onChange={(e) => {
                setState('idle')
                setChosen((c) => ({ ...c, [r.left]: e.target.value }))
              }}
              aria-label={r.left}
            >
              <option value="">בחרו…</option>
              {answers.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="p2-actions">
        <button
          type="button"
          className="p2-check"
          disabled={Object.keys(chosen).length < rows.length || state === 'right'}
          onClick={check}
        >
          בדיקה
        </button>
        <Feedback state={state} q={q} />
      </div>
    </>
  )
}

function Order({ q, onSolved }: { q: Extract<Q, { type: 'order' }>; onSolved: () => void }) {
  const [items, setItems] = useState(() => shuffled(q.steps, q.id.length * 31))
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
  const router = useRouter()
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

  return (
    <div className="chapter-page">
      <header className="chapter-site-header">
        <div className="chapter-site-header-inner">
          <div className="chapter-hdr-start">
            <button type="button" className="chapter-logo" onClick={() => router.push('/chapters')} aria-label="חזרה לעמוד הפרקים">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo-cream.png" alt="אסלאם" />
            </button>
          </div>
          <Link className="p2-back" href="/chapter2">חזרה לפרק</Link>
        </div>
      </header>

      <div className="chapter-layout">
        <main className="chapter-article p2-main">
          <header className="section-heading" data-reveal>
            <div>
              <h1 id="p2-title">התרגול המסכם</h1>
            </div>
            {/* no ornament. The article carries zero of them — chapter 6 puts its
                diamond under a PILLAR title and nowhere else — and the practice
                is the same chapter, so it obeys the same rule. */}
            <p>{CH2.title} — שמונה שאלות. אין ניקוד ואין כישלון: שאלה נשארת פתוחה עד שהיא נפתרת.</p>
          </header>

          <div className="p2-progress" aria-label="התקדמות">
            <span className="p2-progress-bar"><i style={{ width: `${(solved.size / QUESTIONS.length) * 100}%` }} /></span>
            <span className="p2-progress-n">{solved.size} מתוך {QUESTIONS.length}</span>
          </div>

          <ol className="p2-list">
            {QUESTIONS.map((q, i) => (
              <li className={'p2-q' + (solved.has(q.id) ? ' is-solved' : '')} key={q.id}>
                <h2>
                  <span className="p2-q-n">{String(i + 1).padStart(2, '0')}</span>
                  {q.prompt}
                </h2>
                {(q.type === 'single' || q.type === 'multi') && <Choice q={q} onSolved={() => solve(q.id)} />}
                {(q.type === 'match' || q.type === 'situations') && <Match q={q} onSolved={() => solve(q.id)} />}
                {q.type === 'order' && <Order q={q} onSolved={() => solve(q.id)} />}
              </li>
            ))}
          </ol>

          {finished && (
            <div className="p2-done" role="status">
              <div className="title-ornament" aria-hidden="true"><span /></div>
              <p>הפרק הושלם.</p>
              <Link className="ch2-end-link" href="/chapters">לכל פרקי הלמידה</Link>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
