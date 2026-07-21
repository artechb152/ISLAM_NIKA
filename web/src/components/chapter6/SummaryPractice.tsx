'use client'

/* The single closing practice the spec allows: one verbatim sentence at a time, the five
   commandment icons beneath it, choice by CLICK only. A right pick confirms briefly and
   advances; a wrong pick dims and asks to try again — no score, no failure screen. */

import { useEffect, useRef, useState } from 'react'

const PILLARS = [
  { key: 'shahada', label: 'השהאדה', icon: 'icon-shahada.png' },
  { key: 'prayer', label: 'התפילה', icon: 'icon-prayer.png' },
  { key: 'charity', label: 'הצדקה', icon: 'icon-charity.png' },
  { key: 'ramadan', label: 'צום רמדאן', icon: 'icon-ramadan.png' },
  { key: 'hajj', label: "החג'", icon: 'icon-hajj.png' },
] as const

type PillarKey = (typeof PILLARS)[number]['key']

/* every sentence is carried word-for-word from the chapter's source text */
const ITEMS: Array<{ quote: string; answer: PillarKey }> = [
  { quote: '"זמנה כשצלו של חפץ והחפץ עצמו באותו הגודל."', answer: 'prayer' },
  { quote: '"יאמר את השאהדה שלוש פעמים בפני שני עדים כשרים."', answer: 'shahada' },
  { quote: '"המוסלמי מחויב לתת 2.5% מהמאזן השנתי שלו."', answer: 'charity' },
  { quote: '"נאסר על המוסלמי לאכול, לשתות ולעשן מעלות השחר ועד לשקיעת החמה."', answer: 'ramadan' },
  { quote: '"הריטואל הראשון הוא הקפת הכעבה שבע פעמים."', answer: 'hajj' },
]

export default function SummaryPractice({ onComplete }: { onComplete: () => void }) {
  const [index, setIndex] = useState(0)
  const [wrong, setWrong] = useState<Set<PillarKey>>(new Set())
  const [solved, setSolved] = useState(false)
  const [finished, setFinished] = useState(false)
  const advanceTimer = useRef<number | null>(null)

  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
  }, [])

  const item = ITEMS[index]

  function pick(key: PillarKey): void {
    if (solved || finished) return
    if (key === item.answer) {
      setSolved(true)
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
      advanceTimer.current = window.setTimeout(() => {
        if (index === ITEMS.length - 1) {
          setFinished(true)
          onComplete()
        } else {
          setIndex(index + 1)
          setWrong(new Set())
          setSolved(false)
        }
      }, 950)
    } else {
      setWrong((current) => new Set(current).add(key))
    }
  }

  if (finished) {
    return (
      <div className="practice practice-finished" role="status">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5 10 18 19.5 7" /></svg>
        <p>זיהיתם את חמש מצוות היסוד. הפרק הושלם.</p>
      </div>
    )
  }

  return (
    <div className="practice">
      <div className="practice-head">
        <span className="practice-count" aria-hidden="true">{index + 1} / {ITEMS.length}</span>
        <p className="practice-quote" key={item.quote}>{item.quote}</p>
        <span className="practice-ask">לאיזו מצווה שייך המשפט? בחרו בלחיצה.</span>
      </div>
      <div className="practice-options" role="group" aria-label="בחירת המצווה המתאימה">
        {PILLARS.map((pillar) => {
          const isWrong = wrong.has(pillar.key)
          const isRight = solved && pillar.key === item.answer
          return (
            <button
              key={pillar.key}
              type="button"
              onClick={() => pick(pillar.key)}
              disabled={isWrong || solved}
              className={'practice-option' + (isWrong ? ' is-wrong' : '') + (isRight ? ' is-right' : '')}
              aria-pressed={isRight}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/assets/anim-video/${pillar.icon}`} alt="" loading="lazy" />
              <b>{pillar.label}</b>
              {isRight && (
                <svg className="practice-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5" /></svg>
              )}
            </button>
          )
        })}
      </div>
      <p className="practice-say" role="status">
        {solved ? 'נכון!' : wrong.size > 0 ? 'לא מתאים — נסו שוב.' : ' '}
      </p>
    </div>
  )
}
