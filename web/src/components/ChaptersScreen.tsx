'use client'

/* The chapters screen — a flat vintage-parchment layout: a title banner (Kedem title + two
   photoreal photos as tilted, taped postcards), an "איפה עצרתם?" resume strip, a "כל הפרקים"
   grid of clean-framed chapter cards, and a
   "לפי נושא" filter row of the six categories. Progress is driven by real localStorage state.

   The header search, the off-canvas category drawer (hamburger), navigation and completion
   marks all carry over unchanged; one data source (lib/chapters-data) still feeds everything. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  allChapters,
  categoryRange,
  chapterCategories,
  secondaryItems,
  type ChapterDef,
} from '@/lib/chapters-data'

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

/* ---------------- category icons — a detailed Islamic line-art family (512 grid) ----------------
   Clean monoline glyphs in the style of the reference mosque: star-and-crescent, the
   mosque itself, an open Qur'an, a mihrab niche with a hanging lamp, crossed sabers and
   a fanous lantern. One shared stroke weight keeps them reading as a single set. */
function LineIcon({ d }: { d: string }) {
  return <Icon box="0 0 512 512" d={d} w={18} />
}
const CRESCENT =
  'M300 128 A162 162 0 1 0 300 384 A136 136 0 1 1 300 128 Z|M360 182 L377 232 L430 233 L388 265 L403 315 L360 284 L317 315 L332 265 L290 233 L343 232 Z'
const QURAN =
  'M256 202 C192 176 132 174 78 198 L78 346 C132 322 192 324 256 352 Z|M256 202 C320 176 380 174 434 198 L434 346 C380 322 320 324 256 352 Z|M256 202 L256 352|M112 236 L206 228|M112 268 L206 260|M112 300 L196 294|M300 228 L400 236|M306 260 L400 268|M316 294 L400 300|M256 352 L256 396 L240 380 L272 380 Z'
const MIHRAB =
  'M122 452 L390 452|M150 452 L150 250 C150 168 196 118 256 82 C316 118 362 168 362 250 L362 452|M188 452 L188 252 C188 190 222 150 256 122 C290 150 324 190 324 252 L324 452|M256 122 L256 178|M256 178 C244 178 236 188 236 200 C236 214 246 224 256 224 C266 224 276 214 276 200 C276 188 268 178 256 178 Z|M150 452 L362 452'
const SABERS =
  'M150 384 C232 332 344 236 392 132|M362 384 C280 332 168 236 120 132|M126 402 L164 366|M140 352 L176 398|M386 402 L348 366|M372 352 L336 398|M118 400 a13 13 0 1 0 0.1 0 z|M394 400 a13 13 0 1 0 0.1 0 z'
const LANTERN =
  'M248 104 A15 15 0 1 0 248 134 A11 11 0 1 1 248 104 Z|M256 134 L256 140|M226 140 L286 140 L302 176 L210 176 Z|M210 176 L196 208 L196 320 L214 352 L298 352 L316 320 L316 208 L302 176|M196 208 L316 208|M196 320 L316 320|M232 208 L232 320|M280 208 L280 320|M224 352 L288 352 L288 376 L224 376 Z|M256 376 L256 394'
const BOOKS =
  'M108 352 L360 352 L360 402 L108 402 Z|M120 352 L120 402|M124 306 L384 306 L384 352 L124 352 Z|M372 306 L372 352|M102 262 L350 262 L350 306 L102 306 Z|M114 262 L114 306'

/* the Kaaba — a draped cubic shrine: a facing seam, the kiswah band and a scalloped hem (512 grid) */
const MOSQUE =
  'M76 110 L436 110|M76 110 L76 430|M436 110 L436 430|M40 430 L472 430|M76 172 L436 172|M76 202 L436 202|M330 110 L330 384|M76 384 Q108 344 140 384 Q171 344 203 384 Q235 344 266 384 Q298 344 330 384|M330 384 Q356 348 383 384 Q409 348 436 384'
/* geometric arabesque rosette — two interlaced squares (an eight-point khatam) around an octagon */
const ARABESQUE =
  'M120 120 L392 120 L392 392 L120 392 Z|M256 58 L454 256 L256 454 L58 256 Z|M322 256 L303 303 L256 322 L209 303 L190 256 L209 209 L256 190 L303 209 Z'

/* three hanging fanous lanterns — the single-lantern glyph placed at three scales/positions
   (the stroke scales with each group, so the smaller side lanterns read as lighter/behind) */
function Lanterns() {
  const parts = LANTERN.split('|')
  const groups = [
    'translate(142 244) scale(0.54) translate(-256 -249)',
    'translate(370 244) scale(0.54) translate(-256 -249)',
    'translate(256 300) scale(0.82) translate(-256 -249)',
  ]
  return (
    <svg viewBox="0 0 512 512" width={18} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round">
      {groups.map((t, gi) => (
        <g key={gi} transform={t}>
          {parts.map((p, i) => (
            <path key={i} d={p} />
          ))}
        </g>
      ))}
    </svg>
  )
}

const CAT_ICON: Record<string, ReactNode> = {
  clock: <LineIcon d={CRESCENT} />, // history → star & crescent
  person: <LineIcon d={MOSQUE} />, // Muhammad & early Islam → mosque
  book: <LineIcon d={QURAN} />, // (glossary) → open Qur'an
  arabesque: <LineIcon d={ARABESQUE} />, // faith, worship & sources → arabesque rosette
  arch: <LineIcon d={MIHRAB} />, // streams & jurisprudence → mihrab niche
  shield: <LineIcon d={SABERS} />, // jihad & symbols → crossed sabers
  cap: <Lanterns />, // study tools & depth → three fanous lanterns
  book2: <LineIcon d={QURAN} />, // glossary → Qur'an
  books: <LineIcon d={BOOKS} />, // recommended reading → book stack
}
const SEARCH_D = 'M10.5 4.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z M15 15l4.5 4.5'
const CLOSE_D = 'M6 6l12 12M18 6 6 18'
const CHECK_D = 'M20 6 9 17l-5-5'
const ARROW_L = 'M14 6l-6 6 6 6' // ← continue / enter (RTL)
const CHEVRON = 'M6.5 9.5 12 15l5.5-5.5'

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
  const [openCats, setOpenCats] = useState<string[]>([chapterCategories[0].id])
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
      const oc = sessionStorage.getItem('chapters:open')
      if (oc) setOpenCats(JSON.parse(oc) as string[])
    } catch {}
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
            if (n > 0) progress = Math.min(99, Math.round((n / 44) * 100))
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

  function persistOpen(next: string[]): void {
    setOpenCats(next)
    try {
      sessionStorage.setItem('chapters:open', JSON.stringify(next))
    } catch {}
  }
  function toggleCat(id: string): void {
    persistOpen(openCats.includes(id) ? [] : [id])
  }

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
  function expandTo(catId: string): void {
    setCollapsed(false)
    try {
      localStorage.setItem('chapters:side-collapsed', '0')
    } catch {}
    persistOpen([catId])
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

  function menuBody() {
    return (
      <>
        <div className="menu-head">
          <button type="button" className="menu-close" aria-label="סגירת התפריט" onClick={() => setDrawer(false)}>
            <Icon d={CLOSE_D} />
          </button>
          <h2 className="menu-title">תפריט התוכן</h2>
        </div>
        <nav className="menu-cats" aria-label="ניווט בתוכן">
          {searchView.map(({ cat, chapters }) => {
            const active = openCats.includes(cat.id)
            const open = q ? true : active
            const listId = 'cat-list-' + cat.id
            return (
              <section className="cat" key={cat.id}>
                <button
                  type="button"
                  className={'cat-head' + (active ? ' is-active' : '')}
                  aria-expanded={open}
                  aria-controls={listId}
                  title={cat.title}
                  onClick={() => (collapsed ? expandTo(cat.id) : toggleCat(cat.id))}
                >
                  <span className="cat-ico">{CAT_ICON[cat.icon]}</span>
                  <span className="cat-text">
                    <b className="cat-name">{cat.title}</b>
                    <span className="cat-range">{categoryRange(cat)}</span>
                  </span>
                  <span className={'cat-chev' + (open ? ' is-open' : '')} aria-hidden="true">
                    <Icon d={CHEVRON} />
                  </span>
                </button>
                <ul id={listId} className="cat-list" hidden={!open}>
                  {chapters.map((chp) => {
                    const st = status[chp.number]
                    const label = `פרק ${chp.number} — ${chp.title}`
                    const inner = (
                      <>
                        <span className={'m-dot' + (st?.completed ? ' is-done' : '')} aria-hidden="true" />
                        <span className="m-name">{label}</span>
                        {st?.completed && <span className="m-seen">נצפה</span>}
                      </>
                    )
                    return (
                      <li key={chp.id}>
                        {chp.available ? (
                          <Link className="m-item" href={chp.href!} aria-label={label} onClick={() => setDrawer(false)}>
                            {inner}
                          </Link>
                        ) : (
                          <span className="m-item is-locked" aria-label={label + ' — יעלה בקרוב'} title="הפרק יעלה בקרוב">
                            {inner}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
          {q && searchView.length === 0 && <p className="menu-empty">לא נמצאו פרקים התואמים לחיפוש</p>}
        </nav>
        <div className="menu-extra">
          {secondaryItems.map((s) => (
            <span className="m-item x-item is-locked" key={s.id} title="יעלה בקרוב">
              <span className="x-ico" aria-hidden="true">
                {CAT_ICON[s.icon]}
              </span>
              <span className="m-name">{s.title}</span>
            </span>
          ))}
        </div>
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
          <span className="card-num">
            פרק {chp.number}
          </span>
          <span className="card-name" title={chp.title}>
            {chp.title}
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
              aria-label={isDesktop ? 'כיווץ/הרחבה של התפריט' : 'פתיחת תפריט התוכן'}
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
          aria-label="תפריט התוכן"
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
              <h1 id="hero-title" className="hero-title">מגלים את עולם האסלאם</h1>
              <p className="hero-sub">הכירו את ההיסטוריה, האמונה והתרבות דרך מסע בין פרקים ונושאים.</p>
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
          <section className="sec chapters-panel" aria-labelledby="sec-all">
            <h2 id="sec-all" className="sec-title">
              <span>כל הפרקים</span>
            </h2>
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
