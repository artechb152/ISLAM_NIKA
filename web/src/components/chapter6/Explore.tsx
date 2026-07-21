'use client'

/* The chapter's only two explore interactions (per the spec): the shahada in its two
   spoken contexts, and the two Sunni schools for sighting the Ramadan crescent. Both are
   plain accessible tab pairs — a click switches a scene, nothing blocks scrolling, no
   answer is right or wrong, and the source text always sits ABOVE the interaction.
   The scenes are Magnific-generated plates in the site's illuminated-manuscript palette. */

import { useId, useRef, useState, type KeyboardEvent } from 'react'

interface TabDef {
  key: string
  title: string
  caption: string
  image: string
  alt: string
}

function ExploreTabs({ label, tabs }: { label: string; tabs: TabDef[] }) {
  const [active, setActive] = useState(0)
  const base = useId()
  const buttons = useRef<Array<HTMLButtonElement | null>>([])

  function focusTab(index: number): void {
    const next = (index + tabs.length) % tabs.length
    setActive(next)
    buttons.current[next]?.focus()
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>): void {
    /* RTL tablist: the "next" tab sits to the LEFT */
    if (event.key === 'ArrowLeft') focusTab(active + 1)
    else if (event.key === 'ArrowRight') focusTab(active - 1)
    else if (event.key === 'Home') focusTab(0)
    else if (event.key === 'End') focusTab(tabs.length - 1)
    else return
    event.preventDefault()
  }

  return (
    <div className="explore" data-reveal>
      <div className="explore-tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            ref={(node) => {
              buttons.current[index] = node
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${tab.key}`}
            aria-selected={index === active}
            aria-controls={`${base}-panel-${tab.key}`}
            tabIndex={index === active ? 0 : -1}
            className={index === active ? 'is-active' : undefined}
            onClick={() => setActive(index)}
          >
            {tab.title}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`${base}-panel-${tab.key}`}
          aria-labelledby={`${base}-tab-${tab.key}`}
          className="explore-panel"
          hidden={index !== active}
        >
          <div className="explore-scene">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tab.image} alt={tab.alt} loading="lazy" decoding="async" />
          </div>
          <p className="explore-caption">{tab.caption}</p>
        </div>
      ))}
    </div>
  )
}

/* the shahada spoken in its two contexts — the first explore interaction */
export function ShahadaContexts() {
  return (
    <ExploreTabs
      label="השהאדה בשני הקשרים"
      tabs={[
        {
          key: 'adhan',
          title: 'קריאה לתפילה',
          caption: 'המואזין נושא את הקריאה לתפילה (אד׳אן) מן המינרט אל העיר.',
          image: '/assets/chapter6/adhan-real.jpg',
          alt: 'מינרט, מואזין וגלי קול מעל העיר',
        },
        {
          key: 'salah',
          title: 'במהלך התפילה',
          caption: 'המשפט נאמר גם בתוך התפילה עצמה, בתוך המסגד.',
          image: '/assets/chapter6/mosque-hall-real.jpg',
          alt: 'פנים המסגד ובו מתפללים',
        },
      ]}
    />
  )
}

/* the two Sunni schools for the Ramadan crescent — the second and last explore interaction */
export function MoonSchools() {
  return (
    <ExploreTabs
      label="שתי האסכולות לראיית הירח"
      tabs={[
        {
          key: 'saudi',
          title: 'האסכולה הסעודית',
          caption: 'ראיית המולד בטלסקופ — המולד האמיתי.',
          image: '/assets/chapter6/moon-telescope-scene.jpg',
          alt: 'טלסקופ הצופה בסהר — ראייה ישירה',
        },
        {
          key: 'egyptian',
          title: 'האסכולה המצרית',
          caption: 'קביעת המולד לפי חישובים אסטרונומיים — המולד הממוצע.',
          image: '/assets/chapter6/moon-calculation-scene.jpg',
          alt: 'תרשים חישובים אסטרונומיים של המולד',
        },
      ]}
    />
  )
}
