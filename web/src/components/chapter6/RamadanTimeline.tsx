'use client'

/* "How the fast was born" as a plain horizontal axis: circular nodes on a drawn line, a caption
   under each, and a connector dropping from the selected node into a card with that era's text. */

import { useState, type ReactNode } from 'react'
import { type IconName } from './RamadanIcons'

export interface TimelineItem {
  label: string
  title: string
  paras: ReactNode[]
  icon?: IconName
  qadr?: boolean
}

export function RamadanTimeline({ items }: { items: TimelineItem[] }) {
  const [active, setActive] = useState(0)
  const cur = items[active]
  return (
    <div className="rm-tl" style={{ ['--i' as string]: active, ['--n' as string]: items.length }}>
      <div className="rm-tl-axis" role="tablist" aria-label="התפתחות הצום">
        {items.map((it, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active === i}
            className={'rm-tl-stop' + (active === i ? ' is-active' : '') + (it.qadr ? ' is-qadr' : '')}
            onClick={() => setActive(i)}
          >
            <span className="rm-tl-med" aria-hidden="true" />
            <span className="rm-tl-cap">{it.label}</span>
          </button>
        ))}
      </div>
      <div className="rm-tl-panelwrap">
        <span className="rm-tl-stem" aria-hidden="true" />
        <div className={'rm-tl-card' + (cur.qadr ? ' is-qadr' : '')} role="tabpanel">
          <div className="rm-tl-card-body">
            <h4 className="rm-tl-card-title">{cur.title}</h4>
            {cur.paras.map((p, j) => (
              <p key={j}>{p}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
