'use client'

/* Five daily prayers as buttons. The buttons live in the prayer text; clicking one changes
   the WHOLE-screen background (handled by PrayerStage via the `pick` prop) to that prayer's
   time of day, and shows the prayer's name, time and explanation beside them — no card, no
   scroll. Names+times come verbatim from the pr-c match pairs, descriptions from pr-2. */

import { CH6 } from '@/lib/chapter6/data'
import type { CheckPair } from '@/lib/chapter6/types'

const pr2 = CH6.screens.find((s) => s.id === 'pr-2')
const prc = CH6.screens.find((s) => s.id === 'pr-c')
const DESCRIPTIONS: string[] = (pr2?.content ?? []).slice(1)
const PAIRS: CheckPair[] = prc && prc.check && prc.check.type === 'match' ? prc.check.pairs : []

export default function PrayerTimes({ active, onPick }: { active: number; onPick: (index: number) => void }) {
  const pair = PAIRS[active]
  return (
    <div className="ptimes">
      <div className="ptimes-btns" role="group" aria-label="חמש התפילות וזמניהן">
        {PAIRS.map((p, index) => (
          <button
            key={p.left}
            type="button"
            aria-pressed={index === active}
            className={'ptimes-btn' + (index === active ? ' is-active' : '')}
            onClick={() => onPick(index)}
          >
            {p.left}
          </button>
        ))}
      </div>
      <div className="ptimes-copy" aria-live="polite">
        <b>{pair?.left}</b>
        <span className="ptimes-when">{pair?.right}</span>
        <p>{DESCRIPTIONS[active]}</p>
      </div>
    </div>
  )
}
