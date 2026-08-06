'use client'

/* The page shell — the SAME shell the article uses, not a lookalike.

   The practice screen used to carry its own: a masthead with a lone back-pill and an empty
   middle, no sidebar, and a centred 1180px column. Measured at 1920 the article's text column
   starts 64px from the edge and the practice's started 370px from it — the two pages did not
   share a single edge, which is most of what „מרגיש כמו עמוד שנבנה בנפרד“ was.

   So this renders the article's masthead (`.chapter-site-header`, burger + logo) and the
   article's persistent sidebar (`.chapter-drawer`, `.chapter-menu-nav`, `.menu-num`,
   `.menu-label`, `.menu-done`, `.menu-extra`) with the practice's own seven stops in it. Every
   class here already exists in chapter6-article.css; this file adds no styling of its own.

   The sidebar also does a job the page was missing. It is the ONE progress display: a tick
   appears beside a commandment when its beat is done, beside a question when it is answered,
   beside the closing when it is chosen — so „what is left“ is answerable at a glance and
   clickable. The five-plate row that used to sit under the masthead did half of that and
   nothing else, and it collided with itself at 390px.

   `ch6:side-collapsed` is deliberately the article's key: collapse the rail on the chapter and
   it is collapsed here too. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface NavStop {
  id: string
  label: string
  done: boolean
}

export default function PracticeNav({
  stops,
  children,
}: {
  stops: NavStop[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const [drawer, setDrawer] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [current, setCurrent] = useState(stops[0]?.id ?? '')
  const asideRef = useRef<HTMLElement | null>(null)
  const burgerRef = useRef<HTMLButtonElement | null>(null)

  /* the article's own breakpoint and the article's own stored flag */
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('ch6:side-collapsed') === '1')
    } catch {}
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = (): void => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggleCollapse = useCallback((): void => {
    setCollapsed((value) => {
      const next = !value
      try {
        localStorage.setItem('ch6:side-collapsed', next ? '1' : '0')
      } catch {}
      return next
    })
  }, [])

  /* which stop the reader is in — the article's rule exactly: the one crossing the middle band
     of the viewport. Re-armed whenever the set of stops changes, because the end block appears
     only once everything is finished. */
  const ids = stops.map((s) => s.id).join(',')
  useEffect(() => {
    const nodes = ids
      .split(',')
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => !!n)
    if (!nodes.length) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id)
      },
      { rootMargin: '-42% 0px -42% 0px', threshold: 0 }
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [ids])

  /* the off-canvas drawer traps nothing and closes on Escape, like the article's */
  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setDrawer(false)
        burgerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  return (
    <div className="chapter-page gv-page">
      <header className="chapter-site-header">
        <div className="chapter-site-header-inner">
          <div className="chapter-hdr-start">
            <button
              type="button"
              ref={burgerRef}
              className="chapter-burger"
              aria-label={isDesktop ? 'כיווץ/הרחבה של התפריט' : 'פתיחת תפריט התרגול'}
              aria-controls="practice-menu"
              aria-expanded={isDesktop ? !collapsed : drawer}
              onClick={() => (isDesktop ? toggleCollapse() : setDrawer(true))}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6.5h16M4 12h16M4 17.5h16" />
              </svg>
            </button>
            <button
              type="button"
              className="chapter-logo"
              onClick={() => router.push('/chapters')}
              aria-label="חזרה לעמוד הפרקים"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo-cream.png" alt="אסלאם" />
            </button>
          </div>
          {/* the end slot the article gives to its find-field. Same height, same hairline on
              maroon — one component family, not a second button style. */}
          <Link className="gv-back" href="/chapter6#chapter-end">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
            חזרה לפרק 6
          </Link>
        </div>
      </header>

      <div className="chapter-shell">
        <aside
          id="practice-menu"
          ref={asideRef}
          className={'chapter-drawer' + (drawer ? ' is-open' : '') + (collapsed ? ' is-collapsed' : '')}
          aria-label="תפריט התרגול"
          aria-hidden={!isDesktop && !drawer ? true : undefined}
          inert={!isDesktop && !drawer}
        >
          <div className="menu-head">
            <button type="button" className="menu-close" aria-label="סגירת התפריט" onClick={() => setDrawer(false)}>
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
            <h2 className="menu-title">התרגול</h2>
            <span className="menu-sub">פרק 6 · תרגול מסכם</span>
          </div>
          <nav className="chapter-menu-nav" aria-label="ניווט בתרגול">
            <ol>
              {stops.map((stop, index) => (
                <li key={stop.id}>
                  <a
                    href={`#${stop.id}`}
                    className={current === stop.id ? 'is-current' : undefined}
                    aria-current={current === stop.id ? 'true' : undefined}
                    onClick={() => setDrawer(false)}
                  >
                    <span className="menu-num">{String(index + 1).padStart(2, '0')}</span>
                    <span className="menu-label">{stop.label}</span>
                    {stop.done && (
                      <>
                        <svg className="menu-done" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M5 12.5 10 17.5 19 7.5" />
                        </svg>
                        <span className="sr-only"> — הושלם</span>
                      </>
                    )}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="menu-extra">
            <Link className="menu-x-item" href="/chapters" onClick={() => setDrawer(false)}>
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
              לכל פרקי הלמידה
            </Link>
          </div>
        </aside>
        {drawer && <div className="chapter-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}

        <div className="chapter-content">
          <div className="chapter-layout">{children}</div>
        </div>
      </div>
    </div>
  )
}
