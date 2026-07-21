'use client'

/* One light comprehension check per commandment, rendered straight from the verbatim check in
   data.ts. Click-only and accessible — no score, no failure screen: a wrong pick bounces and
   invites another try, a right pick locks. Four shapes: single, multi, match, order. Every
   string (question, instruction, ok, try, hint, options) is read from the data — nothing here
   retypes content. Order/right columns are shuffled with a STABLE hash so server and client
   agree (no Math.random → no hydration mismatch). */

import { useMemo, useState } from 'react'
import { CH6 } from '@/lib/chapter6/data'
import type { Check as CheckT } from '@/lib/chapter6/types'

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
function shuffle<T>(items: T[], key: (t: T) => string): T[] {
  return items
    .map((v, i) => ({ v, k: hash(key(v) + '#' + i) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v)
}

function Say({ tone, text }: { tone: '' | 'ok' | 'try'; text: string }) {
  return (
    <p className={'chk-say' + (tone ? ' is-' + tone : '')} role="status" aria-live="polite">
      {text || ' '}
    </p>
  )
}

/* ---- single: pick the one right answer ---- */
function SingleCheck({ check }: { check: Extract<CheckT, { type: 'single' }> }) {
  const opts = useMemo(() => shuffle(check.options.map((o, i) => ({ o, i })), (x) => x.o.text), [check])
  const [wrong, setWrong] = useState<Set<number>>(new Set())
  const [right, setRight] = useState<number | null>(null)
  const solved = right !== null
  return (
    <div className="chk">
      <p className="chk-q">{check.question}</p>
      <span className="chk-ask">{check.instruction}</span>
      <div className="chk-opts chk-col">
        {opts.map(({ o, i }) => (
          <button
            key={i}
            type="button"
            disabled={wrong.has(i) || solved}
            className={'chk-opt' + (wrong.has(i) ? ' is-wrong' : '') + (right === i ? ' is-right' : '')}
            onClick={() => (o.right ? setRight(i) : setWrong((w) => new Set(w).add(i)))}
          >
            {o.text}
          </button>
        ))}
      </div>
      <Say tone={solved ? 'ok' : wrong.size ? 'try' : ''} text={solved ? check.ok : wrong.size ? check.try : ''} />
    </div>
  )
}

/* ---- multi: select every situation that fits, then check ---- */
function MultiCheck({ check }: { check: Extract<CheckT, { type: 'multi' }> }) {
  const opts = useMemo(() => shuffle(check.options.map((o, i) => ({ o, i })), (x) => x.o.text), [check])
  const rightCount = useMemo(() => check.options.filter((o) => o.right).length, [check])
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [state, setState] = useState<'idle' | 'try' | 'ok'>('idle')
  function toggle(i: number, isRight: boolean): void {
    if (state === 'ok') return
    setState('idle')
    setSel((s) => {
      const n = new Set(s)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })
    void isRight
  }
  function submit(): void {
    const chosen = [...sel]
    const ok = chosen.length === rightCount && chosen.every((i) => check.options[i].right)
    setState(ok ? 'ok' : 'try')
  }
  return (
    <div className="chk">
      <p className="chk-q">{check.question}</p>
      <span className="chk-ask">{check.instruction}</span>
      <div className="chk-opts chk-col">
        {opts.map(({ o, i }) => (
          <button
            key={i}
            type="button"
            aria-pressed={sel.has(i)}
            disabled={state === 'ok'}
            className={'chk-opt chk-multi' + (sel.has(i) ? ' is-sel' : '') + (state === 'ok' && o.right ? ' is-right' : '')}
            onClick={() => toggle(i, o.right)}
          >
            <span className="chk-box" aria-hidden="true" />
            <span>{o.text}</span>
          </button>
        ))}
      </div>
      {state !== 'ok' && (
        <button type="button" className="chk-submit" disabled={sel.size === 0} onClick={submit}>
          בדיקה
        </button>
      )}
      <Say tone={state === 'ok' ? 'ok' : state === 'try' ? 'try' : ''} text={state === 'ok' ? check.ok : state === 'try' ? check.try : ''} />
    </div>
  )
}

/* ---- match: connect each item on the right to its pair — click one side, then the other ---- */
function MatchCheck({ check }: { check: Extract<CheckT, { type: 'match' }> }) {
  const lefts = check.pairs.map((p, i) => ({ t: p.left, i }))
  const rights = useMemo(() => shuffle(check.pairs.map((p, i) => ({ t: p.right, i })), (x) => x.t), [check])
  const [active, setActive] = useState<number | null>(null)
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [state, setState] = useState<'idle' | 'try'>('idle')
  const solved = matched.size === check.pairs.length
  function clickRight(pairIndex: number): void {
    if (active === null || matched.has(pairIndex) || solved) return
    if (active === pairIndex) {
      setMatched((m) => new Set(m).add(pairIndex))
      setActive(null)
      setState('idle')
    } else {
      setState('try')
      setActive(null)
    }
  }
  return (
    <div className="chk">
      <span className="chk-ask">{check.instruction}</span>
      <div className="chk-match">
        <ul className="chk-col-left">
          {lefts.map(({ t, i }) => (
            <li key={i}>
              <button
                type="button"
                disabled={matched.has(i) || solved}
                aria-pressed={active === i}
                className={'chk-pill' + (active === i ? ' is-active' : '') + (matched.has(i) ? ' is-matched' : '')}
                onClick={() => setActive((a) => (a === i ? null : i))}
              >
                {t}
              </button>
            </li>
          ))}
        </ul>
        <ul className="chk-col-right">
          {rights.map(({ t, i }) => (
            <li key={i}>
              <button
                type="button"
                disabled={matched.has(i) || solved || active === null}
                className={'chk-pill chk-pill-r' + (matched.has(i) ? ' is-matched' : '')}
                onClick={() => clickRight(i)}
              >
                {t}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <Say tone={solved ? 'ok' : state === 'try' ? 'try' : ''} text={solved ? check.ok : state === 'try' ? check.try : ''} />
    </div>
  )
}

/* ---- order: tap the steps into their sequence — the correct next one locks, others bounce ---- */
function OrderCheck({ check }: { check: Extract<CheckT, { type: 'order' }> }) {
  const bank = useMemo(() => shuffle(check.steps.map((s, i) => ({ s, i })), (x) => x.s), [check])
  const [placed, setPlaced] = useState<number[]>([])
  const [bounce, setBounce] = useState<number | null>(null)
  const [state, setState] = useState<'idle' | 'try'>('idle')
  const solved = placed.length === check.steps.length
  function pick(i: number): void {
    if (placed.includes(i) || solved) return
    if (i === placed.length) {
      setPlaced((p) => [...p, i])
      setState('idle')
      setBounce(null)
    } else {
      setBounce(i)
      setState('try')
    }
  }
  return (
    <div className="chk">
      <span className="chk-ask">{check.instruction}</span>
      <ol className="chk-slots">
        {check.steps.map((_, slot) => {
          const filledIndex = placed[slot]
          return (
            <li key={slot} className={'chk-slot' + (filledIndex !== undefined ? ' is-filled' : '')}>
              <span className="chk-slot-n">{slot + 1}</span>
              <span className="chk-slot-t">{filledIndex !== undefined ? check.steps[filledIndex] : ''}</span>
            </li>
          )
        })}
      </ol>
      <div className="chk-bank">
        {bank.map(({ s, i }) =>
          placed.includes(i) ? null : (
            <button
              key={i}
              type="button"
              className={'chk-chip' + (bounce === i ? ' is-bounce' : '')}
              onClick={() => pick(i)}
              onAnimationEnd={() => bounce === i && setBounce(null)}
            >
              {s}
            </button>
          )
        )}
      </div>
      <Say tone={solved ? 'ok' : state === 'try' ? 'try' : ''} text={solved ? check.ok : state === 'try' ? check.try : ''} />
    </div>
  )
}

export default function Check({ id }: { id: string }) {
  const screen = CH6.screens.find((s) => s.id === id)
  const check = screen?.check
  if (!check) return null
  return (
    <section className="check-wrap" data-reveal aria-label={screen?.title}>
      <h3 className="check-title">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3 8-8M4 12a8 8 0 1 0 8-8" /></svg>
        {screen?.title}
      </h3>
      {check.type === 'single' && <SingleCheck check={check} />}
      {check.type === 'multi' && <MultiCheck check={check} />}
      {check.type === 'match' && <MatchCheck check={check} />}
      {check.type === 'order' && <OrderCheck check={check} />}
    </section>
  )
}
