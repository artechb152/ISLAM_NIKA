'use client'

/* The chapters menu, rebuilt to the approved mockup: a fixed brown header with search,
   a YouTube-style right-hand menu of six numbered categories, and a 16:9 cards grid.

   One data source (lib/chapters-data) feeds the menu, the grid and the search. Nothing
   here pre-highlights any chapter: until the learner picks one, every card and every
   menu item carries the same visual weight. Completion marks appear only when a chapter
   was actually finished (read from localStorage — the same keys the lesson engine writes). */

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  allChapters,
  categoryRange,
  chapterCategories,
  secondaryItems,
  type ChapterDef,
} from '@/lib/chapters-data'

/* ---------------- flat line icons — one drawn set, no mixed styles ---------------- */
function Icon({ d, box = '0 0 24 24' }: { d: string; box?: string }) {
  return (
    <svg viewBox={box} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const CAT_ICON: Record<string, ReactNode> = {
  clock: <Icon d="M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17Z M12 7.5V12l3 2.2" />,
  person: <Icon d="M12 4.5a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2Z M4.8 19.5c1.3-3.4 4-5 7.2-5s5.9 1.6 7.2 5" />,
  book: <Icon d="M12 6.2C10.4 4.9 8 4.4 4.5 4.6v13.2c3.5-.2 5.9.3 7.5 1.6 1.6-1.3 4-1.8 7.5-1.6V4.6c-3.5-.2-5.9.3-7.5 1.6Z M12 6.2v13.2" />,
  arch: <Icon d="M4.5 19.5h15 M6 19.5v-7.2c0-3.6 2.6-6.3 6-7.8 3.4 1.5 6 4.2 6 7.8v7.2 M9.4 19.5v-3.4a2.6 2.6 0 0 1 5.2 0v3.4" />,
  shield: <Icon d="M12 3.8 5 6.4v5.2c0 4.4 2.9 7.4 7 8.6 4.1-1.2 7-4.2 7-8.6V6.4L12 3.8Z" />,
  cap: <Icon d="M3.5 9.6 12 5.5l8.5 4.1L12 13.7 3.5 9.6Z M7 11.8v4.1c0 1.3 2.2 2.6 5 2.6s5-1.3 5-2.6v-4.1 M20.5 9.9v4.6" />,
  map: <Icon d="M4.5 6.6 9.3 4.5l5.4 2.1 4.8-2.1v12.9l-4.8 2.1-5.4-2.1-4.8 2.1V6.6Z M9.3 4.5v13 M14.7 6.6v12.9" />,
  books: <Icon d="M5 4.5h3.4v15H5zM8.4 7h3.4v12.5H8.4z M13.3 5.4l3.3-.7 2.9 14.2-3.3.7z" />,
}

const CHEVRON = 'M6.5 9.5 12 15l5.5-5.5'
const SEARCH_D = 'M10.5 4.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z M15 15l4.5 4.5'
const CLOSE_D = 'M6 6l12 12M18 6 6 18'
const CHECK_D = 'M20 6 9 17l-5-5'

/* gershayim-blind matching, so "ג'האד" finds "ג׳האד" */
function norm(s: string): string {
  return s.replace(/[׳'"״’–—-]/g, '').toLowerCase()
}
function chapterHit(chp: ChapterDef, q: string): boolean {
  const nq = norm(q)
  if (!nq) return true
  return (
    norm(chp.title).includes(nq) ||
    String(chp.number) === q.trim() ||
    norm('פרק ' + chp.number).includes(nq)
  )
}

interface ChapterStatus {
  completed: boolean
  progress: number
}

export default function ChaptersScreen() {
  const [query, setQuery] = useState('')
  const [openCats, setOpenCats] = useState<string[]>([chapterCategories[0].id])
  /* the rail arrives CLOSED: the chapters are the screen, and the menu is opened when it
     is wanted. The hamburger swings it out, and the choice is remembered per session. */
  const [collapsed, setCollapsed] = useState(true)
  const [drawer, setDrawer] = useState(false)
  const [status, setStatus] = useState<Record<number, ChapterStatus>>({})
  const asideRef = useRef<HTMLElement | null>(null)
  const hamburgerRef = useRef<HTMLButtonElement | null>(null)

  /* session state + real progress, read once on the client */
  useEffect(() => {
    try {
      const oc = sessionStorage.getItem('chapters:open')
      if (oc) setOpenCats(JSON.parse(oc) as string[])
      /* only an explicit "0" re-opens it — an absent key means a fresh visit, and a
         fresh visit starts closed */
      if (sessionStorage.getItem('chapters:collapsed') === '0') setCollapsed(false)
    } catch {
      /* storage may be blocked; the menu still works from defaults */
    }
    try {
      const st: Record<number, ChapterStatus> = {}
      for (const chp of allChapters) {
        const done = localStorage.getItem('islam:chapter:' + chp.number) === 'done'
        let progress = done ? 100 : 0
        if (chp.number === 6 && !done) {
          /* the lesson engine's own store — count of finished screens out of 44 */
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
    } catch {
      /* no storage — every card simply renders neutral */
    }
  }, [])

  function persistOpen(next: string[]): void {
    setOpenCats(next)
    try {
      sessionStorage.setItem('chapters:open', JSON.stringify(next))
    } catch {}
  }
  function toggleCat(id: string): void {
    persistOpen(openCats.includes(id) ? openCats.filter((x) => x !== id) : [...openCats, id])
  }
  function setCollapsedPersist(v: boolean): void {
    setCollapsed(v)
    try {
      sessionStorage.setItem('chapters:collapsed', v ? '1' : '0')
    } catch {}
  }

  /* the hamburger: a drawer on narrow screens, collapse on wide ones */
  function onHamburger(): void {
    if (window.matchMedia('(max-width:1024px)').matches) setDrawer(true)
    else setCollapsedPersist(!collapsed)
  }

  /* category click while collapsed re-opens the rail on that category */
  function onCatHead(id: string): void {
    if (collapsed) {
      setCollapsedPersist(false)
      if (!openCats.includes(id)) persistOpen([...openCats, id])
      return
    }
    toggleCat(id)
  }

  /* ---------------- drawer: scrim, Escape, focus trap, focus return ---------------- */
  useEffect(() => {
    if (!drawer) return
    const aside = asideRef.current
    const first = aside?.querySelector<HTMLElement>('button,[href],input')
    first?.focus()
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        setDrawer(false)
        return
      }
      if (e.key !== 'Tab' || !aside) return
      const f = Array.from(
        aside.querySelectorAll<HTMLElement>('button,[href],input')
      ).filter((n) => n.offsetParent !== null)
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
      document.removeEventListener('keydown', onKey)
      hamburgerRef.current?.focus()
    }
  }, [drawer])

  /* ---------------- search: one query filters the menu AND the grid ---------------- */
  const q = query.trim()
  const view = useMemo(() => {
    return chapterCategories
      .map((cat) => {
        if (!q) return { cat, chapters: cat.chapters }
        const catHit = norm(cat.title).includes(norm(q))
        return { cat, chapters: cat.chapters.filter((chp) => catHit || chapterHit(chp, q)) }
      })
      .filter((v) => !q || v.chapters.length > 0)
  }, [q])
  const gridChapters = useMemo(() => view.flatMap((v) => v.chapters), [view])

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

  function menuBody(inDrawer: boolean) {
    return (
      <>
        <div className="menu-head">
          {inDrawer && (
            <button type="button" className="menu-close" aria-label="סגירת התפריט" onClick={() => setDrawer(false)}>
              <Icon d={CLOSE_D} />
            </button>
          )}
          {/* the search lives in the header only — one field filters the menu and the grid */}
          <h2 className="menu-title">תפריט הלמידה</h2>
        </div>

        <nav className="menu-cats" aria-label="קטגוריות הפרקים">
          {view.map(({ cat, chapters }) => {
            const open = q ? true : openCats.includes(cat.id)
            const listId = 'cat-list-' + cat.id + (inDrawer ? '-m' : '')
            return (
              <section className="cat" key={cat.id}>
                <button
                  type="button"
                  className="cat-head"
                  aria-expanded={open}
                  aria-controls={listId}
                  title={!inDrawer && collapsed ? cat.title : undefined}
                  onClick={() => onCatHead(cat.id)}
                >
                  <span className="cat-ico">{CAT_ICON[cat.icon]}</span>
                  <span className="cat-text">
                    <b className="cat-name">
                      {cat.number}. {cat.title}
                    </b>
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
          {q && view.length === 0 && <p className="menu-empty">לא נמצאו פרקים התואמים לחיפוש</p>}
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

  function card(chp: ChapterDef) {
    const st = status[chp.number]
    const progress = st?.progress ?? 0
    const label =
      `פרק ${chp.number} — ${chp.title}` +
      (st?.completed ? ' — הושלם' : progress > 0 ? ` — ${progress}% הושלמו` : '') +
      (chp.available ? '' : ' — יעלה בקרוב')
    const inner = (
      <>
        <span className="card-media" style={{ backgroundImage: `url('${chp.image}')` }}>
          {st?.completed && (
            <span className="card-done" aria-hidden="true">
              <Icon d={CHECK_D} />
            </span>
          )}
        </span>
        <span className="card-body">
          <b className="card-num">פרק {chp.number}</b>
          <span className="card-name" title={chp.title}>
            {chp.title}
          </span>
          <span className="card-progress" aria-hidden="true">
            <i style={{ width: progress + '%' }} />
          </span>
        </span>
      </>
    )
    return chp.available ? (
      <Link className="card" href={chp.href!} aria-label={label}>
        {inner}
      </Link>
    ) : (
      <span className="card is-locked" aria-label={label}>
        {inner}
      </span>
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
              aria-label="פתיחת תפריט הלמידה"
              aria-controls="side-menu"
              aria-expanded={drawer || !collapsed}
              onClick={onHamburger}
            >
              <Icon d="M4 6.5h16M4 12h16M4 17.5h16" />
            </button>
            <Link className="logo-link" href="/" aria-label="חזרה למסך הבית">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="logo" src="/assets/logo-cream.png" alt="אסלאם" />
            </Link>
          </div>
          {searchField('hdr-search', 'חיפוש...', true)}
        </div>
      </header>

      <div className="shell">
        <aside
          id="side-menu"
          ref={asideRef}
          className={'side' + (collapsed ? ' is-collapsed' : '') + (drawer ? ' is-drawer-open' : '')}
          aria-label="תפריט הלמידה"
        >
          {menuBody(drawer)}
        </aside>
        {drawer && <div className="scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}

        <main className="content">
          <div className="page-head">
            <h1 className="title">פרקי הלמידה</h1>
            <span className="ornament" aria-hidden="true">
              <svg viewBox="0 0 120 12" fill="none">
                <path d="M2 6h44M74 6h44" stroke="currentColor" strokeWidth="1" />
                <path d="M60 1.5 64.5 6 60 10.5 55.5 6Z" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="49.5" cy="6" r="1.1" fill="currentColor" />
                <circle cx="70.5" cy="6" r="1.1" fill="currentColor" />
              </svg>
            </span>
            <p className="subtitle">בחרו פרק כדי להתחיל ללמוד</p>
          </div>

          {gridChapters.length ? (
            <ul className="cards">
              {gridChapters.map((chp, idx) => (
                <li key={chp.id} style={{ ['--i' as string]: idx }}>
                  {card(chp)}
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid-empty">
              <p>לא נמצאו פרקים התואמים לחיפוש</p>
              <button type="button" className="empty-clear" onClick={() => setQuery('')}>
                ניקוי החיפוש
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
