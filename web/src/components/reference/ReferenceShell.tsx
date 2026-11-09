'use client'

/* המעטפת של ארבעת עמודי העזר — מילון מונחים, ספרות מומלצת, מקורות, מפות.
   אותו masthead, אותו סרגל ואותה שפת קלף כמו בפרק ובמחברת (chapter6-article.css).
   הסרגל נושא את ארבעת העמודים עצמם ולא תת-סעיפים בתוכם (כלל 29): כל עמוד הוא
   פריט אחד, והמעבר ביניהם הוא קישור ולא גלילה.

   התוכן כולו מגיע מ-lib/reference, שנבדק מול החוברת ב-concept/reference/verify-reference.mjs.
   המעטפת לא כותבת משפט לימודי — רק תוויות.

   עמוד יכול להעביר `rail` — ואז הוא יושב בסרגל במקום רשימת העמודים (במילון: החיפוש
   והאותיות). הפונקציה מקבלת `close`, כדי שלחיצה בתוך המגירה בנייד תסגור אותה. */

import SiteFooter from '@/components/SiteFooter'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'

export const REFERENCE_PAGES = [
  { id: 'glossary', href: '/glossary', title: 'מילון מונחים' },
  { id: 'recommended-reading', href: '/recommended-reading', title: 'ספרות מומלצת' },
  { id: 'sources', href: '/sources', title: 'מקורות' },
  { id: 'maps', href: '/maps', title: 'מפות' },
] as const

export type ReferenceId = (typeof REFERENCE_PAGES)[number]['id']

export default function ReferenceShell({
  current,
  eyebrow,
  title,
  subtitle,
  rail,
  children,
}: {
  current: ReferenceId
  eyebrow: string
  title: string
  subtitle?: ReactNode
  rail?: (close: () => void) => ReactNode
  children: ReactNode
}) {
  const router = useRouter()
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return (
    <div className="chapter-page ref-page">
      <header className="chapter-site-header">
        <div className="chapter-site-header-inner">
          <div className="chapter-hdr-start">
            <button
              type="button"
              className="chapter-burger"
              aria-label={isDesktop ? 'כיווץ/הרחבה של התפריט' : 'פתיחת תפריט כלי העזר'}
              aria-controls="chapter-menu"
              aria-expanded={isDesktop ? !collapsed : drawer}
              onClick={() => (isDesktop ? setCollapsed((c) => !c) : setDrawer(true))}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16" /></svg>
            </button>
            <button type="button" className="chapter-logo" onClick={() => router.push('/chapters')} aria-label="חזרה לעמוד הפרקים">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo-cream.png" alt="אסלאם" />
            </button>
          </div>
        </div>
      </header>

      <div className="chapter-shell">
        <aside
          id="chapter-menu"
          className={'chapter-drawer' + (drawer ? ' is-open' : '') + (collapsed ? ' is-collapsed' : '')}
          aria-label="כלי עזר"
          aria-hidden={!isDesktop && !drawer ? true : undefined}
          inert={!isDesktop && !drawer}
        >
          <div className="menu-head">
            <button type="button" className="menu-close" aria-label="סגירת התפריט" onClick={() => setDrawer(false)}>
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
            <p className="menu-title">כלי עזר</p>
          </div>
          {rail ? (
            <div className="ref-rail">{rail(() => setDrawer(false))}</div>
          ) : (
            <nav className="chapter-menu-nav" aria-label="עמודי כלי העזר">
              <ol>
                {REFERENCE_PAGES.map((p, i) => (
                  <li key={p.id}>
                    <Link
                      href={p.href}
                      className={current === p.id ? 'is-current' : undefined}
                      aria-current={current === p.id ? 'page' : undefined}
                      onClick={() => setDrawer(false)}
                    >
                      <span className="menu-num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="menu-label">{p.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className="menu-extra">
            <Link className="menu-x-item" href="/chapters" onClick={() => setDrawer(false)}>
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 11.2 12 4.5l8 6.7M6.3 9.5v9.7h4.4v-5.4h2.6v5.4h4.4V9.5" /></svg>
              לכל פרקי הלמידה
            </Link>
          </div>
        </aside>
        {drawer && !isDesktop && <div className="chapter-scrim" onClick={() => setDrawer(false)} />}

        <div className="chapter-content">
          <div className="chapter-layout">
            <main className="chapter-article">
              <section className="article-section opening-section">
                <span className="chapter-number">{eyebrow}</span>
                <div className="title-ornament" aria-hidden="true"><span /></div>
                <h1 className="ref-h1">{title}</h1>
                {subtitle && <p className="opening-subtitle">{subtitle}</p>}
              </section>
              {children}
            </main>
          </div>
          <SiteFooter />
        </div>
      </div>
    </div>
  )
}
