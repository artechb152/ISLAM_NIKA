'use client'

/* המחברת שלי — עמוד שנראה כמו פרק רגיל (אותו masthead, אותו סרגל
   סעיפים, אותה שפת קלף), אלא שהתוכן שלו הוא מה שהקורא/ת סימנו:
   כל סעיף הוא פרק, וכל סימון הוא ציטוט שאפשר לתלות עליו הערה אישית.
   המחברת אינה כותבת דבר משל עצמה. */

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { allChapters } from '@/lib/chapters-data'
import { deleteMark, MARKS_EVENT, readMarks, setMarkNote, type Mark } from '@/lib/site-notebook'

function fmt(ms: number): string {
  return new Date(ms).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function SiteNotebook() {
  const router = useRouter()
  const [marks, setMarks] = useState<Mark[]>([])
  const [ready, setReady] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [current, setCurrent] = useState<string | null>(null)
  const articleRef = useRef<HTMLElement | null>(null)

  const load = useCallback(() => setMarks(readMarks().marks), [])
  useEffect(() => {
    load()
    setReady(true)
    window.addEventListener(MARKS_EVENT, load)
    window.addEventListener('storage', load)
    return () => {
      window.removeEventListener(MARKS_EVENT, load)
      window.removeEventListener('storage', load)
    }
  }, [load])

  useEffect(() => {
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  /* סעיף לכל פרק שיש בו סימונים — סדר הפרקים, לא סדר הסימון */
  const sections = useMemo(() => {
    const by = new Map<number, Mark[]>()
    for (const m of marks) {
      const list = by.get(m.ch) ?? []
      list.push(m)
      by.set(m.ch, list)
    }
    for (const list of by.values()) list.sort((a, b) => a.at - b.at)
    return allChapters
      .filter((c) => by.has(c.number))
      .map((c) => ({ id: `ch-${c.number}`, num: c.number, title: c.title, href: c.href, marks: by.get(c.number)! }))
  }, [marks])

  /* איזה סעיף נקרא עכשיו — מסמן אותו בסרגל, בדיוק כמו בפרק */
  useEffect(() => {
    const root = articleRef.current
    if (!root) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    root.querySelectorAll('.article-section[id]').forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [sections])

  const saveNote = () => {
    if (!editing) return
    setMarkNote(editing.id, editing.text)
    setEditing(null)
  }

  return (
    <div className="chapter-page">
      <header className="chapter-site-header">
        <div className="chapter-site-header-inner">
          <div className="chapter-hdr-start">
            <button
              type="button"
              className="chapter-burger"
              aria-label={isDesktop ? 'כיווץ/הרחבה של התפריט' : 'פתיחת תפריט המחברת'}
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
          aria-label="תפריט המחברת"
          aria-hidden={!isDesktop && !drawer ? true : undefined}
          inert={!isDesktop && !drawer}
        >
          <div className="menu-head">
            <button type="button" className="menu-close" aria-label="סגירת התפריט" onClick={() => setDrawer(false)}>
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
            <p className="menu-title">מה סימנתם</p>
            <span className="menu-sub">לפי פרקים</span>
          </div>
          <nav className="chapter-menu-nav" aria-label="ניווט במחברת">
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={current === s.id ? 'is-current' : undefined}
                    aria-current={current === s.id ? 'true' : undefined}
                    onClick={() => setDrawer(false)}
                  >
                    <span className="menu-num">{String(s.num).padStart(2, '0')}</span>
                    <span className="menu-label">{s.title}</span>
                    <span className="nb-rail-count">{s.marks.length}</span>
                  </a>
                </li>
              ))}
            </ol>
            {ready && sections.length === 0 && <p className="nb-rail-empty">אין עדיין סימונים</p>}
          </nav>
        </aside>
        {drawer && !isDesktop && <div className="chapter-scrim" onClick={() => setDrawer(false)} />}

        <div className="chapter-content">
          <div className="chapter-layout">
            <main className="chapter-article" ref={articleRef}>
              <section className="article-section opening-section">
                <span className="chapter-number">המחברת שלי</span>
                <div className="title-ornament" aria-hidden="true"><span /></div>
                <h1 className="nb-h1">מה שסימנתם לעצמכם</h1>
                <p className="opening-subtitle">
                  {ready && marks.length > 0
                    ? `${marks.length} סימונים מתוך ${sections.length} פרקים`
                    : 'כאן נאסף מה שסימנתם בפרקים'}
                </p>
                <div className="nb-lede">
                  <p>
                    במהלך הקריאה בפרק אפשר לסמן משפט בעכבר — ומעליו יופיע כפתור קטן,
                    <b> „הוספה למחברת“</b>. מה שנוסף מופיע כאן, מסודר לפי הפרק שממנו בא,
                    ואפשר לתלות על כל סימון הערה אישית משלכם.
                  </p>
                  <p className="nb-lede-quiet">
                    המחברת נשמרת בדפדפן הזה בלבד — היא לא עולה לשום שרת.
                  </p>
                </div>
              </section>

              {ready && sections.length === 0 && (
                <section className="article-section nb-empty">
                  <p>עוד לא סימנתם דבר.</p>
                  <button type="button" className="nb-btn" onClick={() => router.push('/chapters')}>
                    אל הפרקים
                  </button>
                </section>
              )}

              {sections.map((s) => (
                <section className="article-section" id={s.id} key={s.id}>
                  <header className="section-heading">
                    <span className="section-eyebrow">פרק {s.num}</span>
                    <div>
                      <h2>{s.title}</h2>
                    </div>
                    {s.href && (
                      <p className="nb-sec-link">
                        <a href={s.href}>חזרה אל הפרק ←</a>
                      </p>
                    )}
                  </header>

                  <div className="nb-marks">
                    {s.marks.map((m) => (
                      <article className="nb-mark" key={m.id}>
                        <blockquote>
                          <p>{m.text}</p>
                          {m.where && <cite>{m.where}</cite>}
                        </blockquote>

                        {m.note && editing?.id !== m.id && (
                          <div className="nb-mark-note">
                            <span className="nb-mark-note-label">ההערה שלי</span>
                            <p>{m.note}</p>
                          </div>
                        )}

                        {editing?.id === m.id ? (
                          <div className="nb-mark-edit">
                            <textarea
                              rows={3}
                              autoFocus
                              placeholder="מה חשוב לזכור כאן?"
                              value={editing.text}
                              onChange={(e) => setEditing({ id: m.id, text: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveNote()
                                if (e.key === 'Escape') setEditing(null)
                              }}
                            />
                            <div className="nb-mark-actions">
                              <button type="button" className="nb-btn" onClick={saveNote}>שמירה</button>
                              <button type="button" className="nb-link" onClick={() => setEditing(null)}>ביטול</button>
                            </div>
                          </div>
                        ) : (
                          <div className="nb-mark-foot">
                            <span className="nb-mark-date">סומן {fmt(m.at)}</span>
                            <span className="nb-mark-tools">
                              <button
                                type="button"
                                className="nb-link"
                                onClick={() => { setConfirmDel(null); setEditing({ id: m.id, text: m.note ?? '' }) }}
                              >
                                {m.note ? 'עריכת ההערה' : 'הוספת הערה'}
                              </button>
                              {confirmDel === m.id ? (
                                <button
                                  type="button"
                                  className="nb-link is-danger"
                                  onClick={() => { deleteMark(m.id); setConfirmDel(null) }}
                                >
                                  למחוק את הסימון?
                                </button>
                              ) : (
                                <button type="button" className="nb-link" onClick={() => setConfirmDel(m.id)}>
                                  מחיקה
                                </button>
                              )}
                            </span>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
