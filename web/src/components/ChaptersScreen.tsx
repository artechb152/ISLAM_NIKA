'use client'

/* The chapters screen — a flat vintage-parchment layout: a cinematic video banner, an
   "איפה עצרתם?" resume strip, and a "תחנות הידע" grid of clean-framed chapter cards.
   Progress is driven by real localStorage state.

   The header search, the off-canvas category drawer (hamburger), navigation and completion
   marks all carry over unchanged; one data source (lib/chapters-data) still feeds everything. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  allChapters,
  chapterCategories,
  secondaryItems,
  type ChapterDef,
} from '@/lib/chapters-data'
import { CH6 } from '@/lib/chapter6/data'
import { STORE_KEY as CH1_STORE_KEY } from '@/lib/chapter1/progress'
import { STATION_COUNT_PLANNED as CH1_STATION_COUNT } from '@/lib/chapter1/stations'

/* the number of chapter-6 screens progress is measured against (derived, not hardcoded) */
const CH6_SCREEN_COUNT = CH6.screens.length

/* ---------------- UI line-icon primitive (search, close, chevrons, arrows) --------- */
function Icon({ d, box = '0 0 24 24', w = 1.7 }: { d: string; box?: string; w?: number }) {
  return (
    <svg viewBox={box} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      {d.split('|').map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  )
}

/* ---------------- category icons — a clean, uniform FILLED (solid) 24-grid family ----------------
   Solid silhouette glyphs (fill, no stroke); emblems are cut out with the even-odd rule so the
   whole set reads as one bold, filled system. */
function FIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" fillRule="evenodd" clipRule="evenodd">
      {d.split('|').map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  )
}
const IF_HISTORY =
  'M7 2.5A2.5 2.5 0 0 0 4.5 5V17.4A3.4 3.4 0 0 1 7 16.4H18V2.5ZM11.7 6A3.2 3.2 0 1 0 11.7 12.4 2.4 2.4 0 1 1 11.7 6ZM15.9 6.1 16.6 7.65 18.3 7.8 17 8.95 17.4 10.6 15.9 9.7 14.4 10.6 14.8 8.95 13.5 7.8 15.2 7.65Z|M7 17.9A2 2 0 0 0 7 21.9H18V17.9Z'
const IF_MOSQUE =
  'M12 2.2C13 3 13 4.2 12 5 11 4.2 11 3 12 2.2Z|M11.4 5.3H12.6V7.6H11.4Z|M4 21V12.4A8 8 0 0 1 20 12.4V21H14.5V17.5A2.5 2.5 0 0 0 9.5 17.5V21ZM11.5 21V17.5A0.5 0.5 0 0 1 12.5 17.5V21Z|M2.4 21H21.6V22.6H2.4Z'
const IF_BOOK =
  'M11.3 6.2C9.6 4.9 7.2 4.4 4.4 4.7V17.5C7 17.3 9.3 17.8 11.3 19V6.2Z|M12.7 6.2C14.4 4.9 16.8 4.4 19.6 4.7V17.5C17 17.3 14.7 17.8 12.7 19V6.2Z'
const IF_GLOBE =
  'M12 2A10 10 0 1 0 12 22A10 10 0 0 0 12 2ZM9.8 4.4C8.4 4.7 7.2 5.4 6.2 6.3L7.9 8.1C8.2 8.4 8.1 8.9 7.7 9.1L6.9 9.6C6.5 9.8 6.4 10.4 6.7 10.8L7.7 12C8 12.4 8.5 12.6 9 12.6C9.5 12.6 9.9 13 10 13.5L10.3 14.9C10.4 15.5 11 15.9 11.6 15.7C12.1 15.6 12.4 15.1 12.4 14.6V13.1C12.4 12.6 12.7 12.2 13.2 12.1C14 11.9 14.3 10.9 13.7 10.3L12.3 8.9C12 8.6 12 8.1 12.3 7.8L13.6 6.4C14.1 5.9 13.8 5 13.1 4.9C12 4.6 10.9 4.4 9.8 4.4ZM17.5 8.2C16.8 8.6 16.4 9.4 16.6 10.2L17.1 12.1C17.2 12.6 17.7 12.9 18.2 12.7C18.4 11 18.4 9.5 17.5 8.2Z'
const IF_KAABA =
  'M12 2.3 20.7 7V17L12 21.7 3.3 17V7Z M3.3 7.6 12 12 20.7 7.6 20.7 8.7 12 13.1 3.3 8.7Z M6.9 14.2 9.5 15.5 8.9 16.7 6.3 15.4Z M17.1 14.2 14.5 15.5 15.1 16.7 17.7 15.4Z'
const IF_SHIELD = 'M12 2.3 20 5.1V11.4C20 16.5 16.6 19.9 12 21.5 7.4 19.9 4 16.5 4 11.4V5.1Z'
const IF_CAP =
  'M5.5 5A2.5 2.5 0 0 0 3 7.5V18A2.5 2.5 0 0 0 5.5 20.5H18.5A2.5 2.5 0 0 0 21 18V7.5A2.5 2.5 0 0 0 18.5 5ZM3 9.2H21V10.4H3ZM8 13.75A1.25 1.25 0 1 0 8 16.25 1.25 1.25 0 0 0 8 13.75ZM12 13.75A1.25 1.25 0 1 0 12 16.25 1.25 1.25 0 0 0 12 13.75ZM16 13.75A1.25 1.25 0 1 0 16 16.25 1.25 1.25 0 0 0 16 13.75Z|M8.5 2.6A0.85 0.85 0 0 1 9.35 3.45V5.4H7.65V3.45A0.85 0.85 0 0 1 8.5 2.6Z|M15.5 2.6A0.85 0.85 0 0 1 16.35 3.45V5.4H14.65V3.45A0.85 0.85 0 0 1 15.5 2.6Z'
const IF_BOOKS = 'M3.6 15.3H16.4V19.7H3.6Z|M5.2 10.9H18V15.3H5.2Z|M3.6 6.5H16.4V10.9H3.6Z'
const IF_SOURCES =
  'M6.5 2.5A2 2 0 0 0 4.5 4.5V19.5A2 2 0 0 0 6.5 21.5H16.5A2 2 0 0 0 18.5 19.5V8H13.5V2.5ZM8 11.5H15V13H8ZM8 15H15V16.5H8ZM8 8H11V9.5H8Z|M14.8 3 18.4 6.6H14.8Z'
const IF_MAP = 'M8.7 3.3 3 5.6V20.7L8.7 18.4V3.3Z|M10.1 3.4V18.5L14.9 20.2V5.1Z|M16.3 5.1V20.2L21 18V3.4Z'

const CAT_ICON: Record<string, ReactNode> = {
  clock: <FIcon d={IF_HISTORY} />, // history → book with crescent & star
  person: <FIcon d={IF_MOSQUE} />, // early Islam → mosque
  book: <FIcon d={IF_BOOK} />, // glossary → open book
  arabesque: <FIcon d={IF_GLOBE} />, // faith & worship → globe
  arch: <FIcon d={IF_KAABA} />, // streams & law → Kaaba cube
  shield: <FIcon d={IF_SHIELD} />, // jihad & symbols → shield
  cap: <FIcon d={IF_CAP} />, // time → mortarboard
  books: <FIcon d={IF_BOOKS} />, // recommended reading → book stack
  sources: <FIcon d={IF_SOURCES} />, // sources → document
  map: <FIcon d={IF_MAP} />, // maps → folded map
}
const SEARCH_D = 'M10.5 4.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z M15 15l4.5 4.5'
const CLOSE_D = 'M6 6l12 12M18 6 6 18'
const CHECK_D = 'M20 6 9 17l-5-5'
const ARROW_L = 'M14 6l-6 6 6 6' // ← continue / enter (RTL)

/* persistent sidebar (YouTube-style): a fixed-width panel that toggles between the full
   width and a slim icon rail via the header hamburger. Widths live in the stylesheet. */

function norm(s: string): string {
  return s.replace(/[׳'"״’–—-]/g, '').toLowerCase()
}
function chapterHit(chp: ChapterDef, q: string): boolean {
  const nq = norm(q)
  if (!nq) return true
  return norm(chp.title).includes(nq) || String(chp.number) === q.trim() || norm('פרק ' + chp.number).includes(nq)
}

interface ChapterStatus {
  completed: boolean
  progress: number
}

export default function ChaptersScreen() {
  const [query, setQuery] = useState('')
  const [activeTopic, setActiveTopic] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [status, setStatus] = useState<Record<number, ChapterStatus>>({})
  const [isDesktop, setIsDesktop] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [playHeroVideo, setPlayHeroVideo] = useState(false)
  const [heroReady, setHeroReady] = useState(false)
  const asideRef = useRef<HTMLElement | null>(null)
  const hamburgerRef = useRef<HTMLButtonElement | null>(null)
  const router = useRouter()

  /* Logo click: always return to the entrance (opening) screen. */
  function goBack(): void {
    router.push('/')
  }

  useEffect(() => {
    try {
      const st: Record<number, ChapterStatus> = {}
      for (const chp of allChapters) {
        const done = localStorage.getItem('islam:chapter:' + chp.number) === 'done'
        let progress = done ? 100 : 0
        if (chp.number === 6 && !done) {
          const raw = localStorage.getItem('ch6:v1')
          if (raw) {
            const p = JSON.parse(raw) as { done?: Record<string, boolean> } | null
            const n = Object.keys((p && p.done) || {}).length
            if (n > 0) progress = Math.min(99, Math.round((n / CH6_SCREEN_COUNT) * 100))
          }
        }
        /* chapter 1 is the exploration game: progress is stations completed */
        if (chp.number === 1 && !done) {
          const raw = localStorage.getItem(CH1_STORE_KEY)
          if (raw) {
            const p = JSON.parse(raw) as { stationsDone?: string[] } | null
            const n = Array.isArray(p?.stationsDone) ? p.stationsDone.length : 0
            if (n > 0) progress = Math.min(99, Math.round((n / CH1_STATION_COUNT) * 100))
          }
        }
        st[chp.number] = { completed: done, progress }
      }
      setStatus(st)
    } catch {}
  }, [])

  /* Render motion only on wider screens when the visitor has not requested reduced motion.
     Until this client-side check completes, the matching poster remains visible. */
  useEffect(() => {
    const wide = window.matchMedia('(min-width:761px)')
    const motion = window.matchMedia('(prefers-reduced-motion:no-preference)')
    const sync = (): void => setPlayHeroVideo(wide.matches && motion.matches)
    sync()
    wide.addEventListener('change', sync)
    motion.addEventListener('change', sync)
    return () => {
      wide.removeEventListener('change', sync)
      motion.removeEventListener('change', sync)
    }
  }, [])

  /* ---------------- persistent sidebar (YouTube-style): viewport class + saved collapse ---------------- */
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('chapters:side-collapsed') === '1')
    } catch {}
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = (): void => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  /* the header hamburger is the only control: it collapses to / expands from the icon rail */
  function toggleCollapse(): void {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem('chapters:side-collapsed', next ? '1' : '0')
      } catch {}
      return next
    })
  }

  /* ---------------- drawer: scrim, Escape, focus trap, focus return ---------------- */
  useEffect(() => {
    if (!drawer) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const aside = asideRef.current
    const first = aside?.querySelector<HTMLElement>('button,[href],input')
    first?.focus()
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        setDrawer(false)
        return
      }
      if (e.key !== 'Tab' || !aside) return
      const f = Array.from(aside.querySelectorAll<HTMLElement>('button,[href],input')).filter((n) => n.offsetParent !== null)
      if (!f.length) return
      const firstEl = f[0]
      const lastEl = f[f.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
      hamburgerRef.current?.focus()
    }
  }, [drawer])

  /* ---------------- search filters the drawer; search + topic filter the grid ---------- */
  const q = query.trim()
  const searchView = useMemo(() => {
    return chapterCategories
      .map((cat) => {
        if (!q) return { cat, chapters: cat.chapters }
        const catHit = norm(cat.title).includes(norm(q))
        return { cat, chapters: cat.chapters.filter((chp) => catHit || chapterHit(chp, q)) }
      })
      .filter((v) => !q || v.chapters.length > 0)
  }, [q])
  const gridChapters = useMemo(() => {
    const cats = activeTopic ? searchView.filter((v) => v.cat.id === activeTopic) : searchView
    return cats.flatMap((v) => v.chapters)
  }, [searchView, activeTopic])

  /* the "where did you stop?" chapter: the furthest-along available chapter.
     A brand-new visitor with no progress anywhere gets null, so the strip is hidden —
     it appears only once at least one chapter has been started or completed. */
  const resume = useMemo<ChapterDef | null>(() => {
    const avail = allChapters.filter((c) => c.available)
    const hasProgress = avail.some((c) => (status[c.number]?.progress ?? 0) > 0)
    if (!hasProgress) return null
    let best: ChapterDef | null = null
    let bestP = 0
    for (const c of avail) {
      const p = status[c.number]?.progress ?? 0
      if (p > 0 && p < 100 && p > bestP) {
        best = c
        bestP = p
      }
    }
    /* only completed chapters so far → point to the next unfinished one (none → strip hides) */
    if (!best) best = avail.find((c) => (status[c.number]?.progress ?? 0) < 100) || null
    return best
  }, [status])

  function searchField(id: string, placeholder: string, dark?: boolean) {
    return (
      <div className={'search-field' + (dark ? ' is-dark' : '')}>
        <input
          id={id}
          type="text"
          value={query}
          placeholder={placeholder}
          aria-label="חיפוש פרק"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e: ReactKeyboardEvent) => {
            if (e.key === 'Escape' && query) setQuery('')
          }}
        />
        {query ? (
          <button type="button" className="search-clear" aria-label="ניקוי החיפוש" onClick={() => setQuery('')}>
            <Icon d={CLOSE_D} />
          </button>
        ) : (
          <span className="search-ico" aria-hidden="true">
            <Icon d={SEARCH_D} />
          </span>
        )}
      </div>
    )
  }

  /* The sidebar holds only the study tools (glossary, reading, sources, maps), moved to the
     top, each on its own row with a divider between them. The subject categories live in the
     chip filter under the cards, not here. */
  function menuBody() {
    return (
      <>
        <div className="menu-head">
          <button type="button" className="menu-close" aria-label="סגירת התפריט" onClick={() => setDrawer(false)}>
            <Icon d={CLOSE_D} />
          </button>
          <h2 className="menu-title">כלי עזר</h2>
        </div>
        <nav className="menu-extra menu-tools" aria-label="כלי עזר והעמקה">
          {secondaryItems.map((s) => (
            <span className="m-item x-item is-locked" key={s.id} title="יעלה בקרוב">
              <span className="x-ico" aria-hidden="true">
                {CAT_ICON[s.icon]}
              </span>
              <span className="m-name">{s.title}</span>
            </span>
          ))}
        </nav>
      </>
    )
  }

  function card(chp: ChapterDef, idx: number) {
    const st = status[chp.number]
    const progress = st?.progress ?? 0
    const label =
      `פרק ${chp.number} — ${chp.title}` +
      (st?.completed ? ' — הושלם' : progress > 0 ? ` — ${progress}% הושלמו` : '') +
      (chp.available ? '' : ' — יעלה בקרוב')
    const inner = (
      <>
        <span className="card-frame">
          <span className="card-shot" style={{ backgroundImage: `url('${chp.image}')` }} />
          {st?.completed && (
            <span className="card-done" aria-hidden="true">
              <Icon d={CHECK_D} />
            </span>
          )}
        </span>
        <span className="card-body">
          <span className="card-name" title={chp.title}>
            {chp.title}
          </span>
          <span className="card-num">
            פרק {chp.number}
          </span>
          {progress > 0 && (
            <span className="card-progress" aria-hidden="true">
              <i style={{ width: progress + '%' }} />
            </span>
          )}
        </span>
      </>
    )
    return (
      <li key={chp.id} style={{ ['--i' as string]: idx }}>
        {chp.available ? (
          <Link className="card" href={chp.href!} aria-label={label}>
            {inner}
          </Link>
        ) : (
          <span className="card is-locked" aria-label={label}>
            {inner}
          </span>
        )}
      </li>
    )
  }

  return (
    <div className="page">
      <header className="site-hdr">
        <div className="hdr-inner">
          <div className="hdr-start">
            <button
              type="button"
              ref={hamburgerRef}
              className="hamburger"
              aria-label={isDesktop ? 'כיווץ/הרחבה של התפריט' : 'פתיחת תפריט כלי העזר'}
              aria-controls="side-menu"
              aria-expanded={isDesktop ? !collapsed : drawer}
              onClick={() => (isDesktop ? toggleCollapse() : setDrawer(true))}
            >
              <Icon d="M4 6.5h16M4 12h16M4 17.5h16" />
            </button>
            <button type="button" className="logo-link" onClick={goBack} aria-label="חזרה למסך הפתיחה">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="logo" src="/assets/logo-cream.png" alt="אסלאם" />
            </button>
          </div>
          {searchField('hdr-search', 'חיפוש...', true)}
        </div>
      </header>

      <div className="shell">
        <aside
          id="side-menu"
          ref={asideRef}
          className={'side' + (drawer ? ' is-drawer-open' : '') + (collapsed ? ' is-collapsed' : '')}
          aria-label="כלי עזר"
          aria-hidden={!isDesktop && !drawer ? true : undefined}
          inert={!isDesktop && !drawer}
        >
          {menuBody()}
        </aside>
        {drawer && <div className="scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}

        <main className="content">
          {/* ============ video hero ============ */}
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-media" aria-hidden="true">
              {playHeroVideo && (
                <video
                  className={'hero-video' + (heroReady ? ' is-ready' : '')}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  poster="/assets/chapters/desert-hero-poster.png"
                  tabIndex={-1}
                  onPlaying={() => setHeroReady(true)}
                  onError={(event) => { event.currentTarget.hidden = true }}
                >
                  <source src="/assets/chapters/desert-banner.mp4" type="video/mp4" />
                </video>
              )}
            </div>
            <div className="hero-copy">
              <h1 id="hero-title" className="hero-title">מסע אל העולם<br />האסלאמי</h1>
              <p className="hero-sub">גלו עולם חדש של היסטוריה, תרבות ומורשת אסלאמית.</p>
            </div>
          </section>

          {/* ============ where did you stop? (moved to the top) ============ */}
          {resume && (
            <section className="sec" aria-labelledby="sec-resume">
              <h2 id="sec-resume" className="sec-title">
                <span>איפה עצרתם</span>
              </h2>
              <div className="resume">
                <span className="resume-thumb" style={{ backgroundImage: `url('${resume.image}')` }} />
                <div className="resume-body">
                  <b className="resume-name">
                    פרק {resume.number} — {resume.title}
                  </b>
                  <div className="resume-track" aria-hidden="true">
                    <span className="resume-pct">{status[resume.number]?.progress ?? 0}%</span>
                    <span className="resume-bar">
                      <i style={{ width: (status[resume.number]?.progress ?? 0) + '%' }} />
                    </span>
                  </div>
                </div>
                <Link className="resume-go" href={resume.href!} aria-label={`המשך לפרק ${resume.number} — ${resume.title}`}>
                  המשך לפרק
                  <Icon d={ARROW_L} />
                </Link>
              </div>
            </section>
          )}

          {/* ============ all chapters ============ */}
          <section className="sec chapters-panel" aria-label="פרקי הלמידה">
            {/* YouTube-style topic chips: filter the grid; "הכל" clears the filter */}
            <div className="chip-row" role="group" aria-label="סינון לפי נושא">
              <button
                type="button"
                className={'chip' + (activeTopic === null ? ' is-active' : '')}
                aria-pressed={activeTopic === null}
                onClick={() => setActiveTopic(null)}
              >
                הכל
              </button>
              {chapterCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={'chip' + (activeTopic === cat.id ? ' is-active' : '')}
                  aria-pressed={activeTopic === cat.id}
                  onClick={() => setActiveTopic((t) => (t === cat.id ? null : cat.id))}
                >
                  {cat.title}
                </button>
              ))}
            </div>
            {gridChapters.length ? (
              <ul className="cards">{gridChapters.map((chp, idx) => card(chp, idx))}</ul>
            ) : (
              <div className="grid-empty">
                <p>לא נמצאו פרקים התואמים לחיפוש</p>
                <button type="button" className="empty-clear" onClick={() => { setQuery(''); setActiveTopic(null) }}>
                  ניקוי החיפוש
                </button>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
