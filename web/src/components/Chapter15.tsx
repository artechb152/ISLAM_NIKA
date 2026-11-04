'use client'

/* Chapter 15 — ציר זמן בראשית האסלאם.

   Same product as chapters 2, 5, 6 and 8–10: masthead, rail, type scale, reveal and every
   colour come from chapter6-article.css, which the route layout loads first;
   chapter15-article.css adds only this chapter's devices.

   THE SHAPE. The source chapter is one table — year · event · region of influence, 23 rows,
   six merged region cells — and not one sentence of prose. The user chose (3.11.2026) a
   ruler drawn to scale over a sticky map: chapter 5's parchment plate fills the screen
   (rule 56) and the rows pass over it one card at a time, while the stage stands up the
   table's three columns — the ruler, the place the event names, and the region cell
   (components/chapter15/TimelineMap.tsx). Three sections, cut where the region cells
   change; their titles are spans of years, derived and checked (rule 32).

   THE SOURCE IS PRINTED AS IT IS, its date errors included — Siffin 656 / the Camel 657,
   „758" for the Mongol conquest (the user's decision; concept/chapter15/DECISIONS.md).

   AND NO CHECKS. Every question lives at /chapter15/practice.

   WHAT THIS FILE MAY NOT DO: write a word of the table. Every row comes from passages.json
   by its §N; layout.json says which rows each section prints, and
   concept/chapter15/verify-chapter15.mjs fails if a row is printed twice or dropped. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import { Scrolly } from '@/components/chapter6/scrolly'
import TimelineMap from '@/components/chapter15/TimelineMap'
import MarkToNotebook from '@/components/MarkToNotebook'
import { allChapters } from '@/lib/chapters-data'
import { CH15, HEAD, LAYOUT, REGIONS, row } from '@/lib/chapter15/content'
import {
  completedSections,
  markContentComplete,
  markSectionDone,
  practiceComplete,
  resumeSectionId,
  saveCurrentSection,
  SECTION_ORDER,
} from '@/lib/chapter15/progress'

const SECTIONS = LAYOUT.sections
const meta = (id: string) => {
  const s = SECTIONS.find((x) => x.id === id)
  if (!s) throw new Error(`chapter 15: unknown section ${id}`)
  return s
}
const chapterTitle = (n: number): string => {
  const c = allChapters.find((x) => x.number === n)
  if (!c) throw new Error(`chapter 15: no chapter ${n}`)
  return c.title
}

/** The section heading, part for part as chapter 6 sets it. The title is a span of years:
    numbers, run LTR so it does not flip. No term — the table names no period. */
function Head({ id }: { id: string }) {
  return (
    <header className="section-heading" data-reveal>
      <div>
        <h2 id={`${id}-title`} dir="ltr">{meta(id).title}</h2>
      </div>
      <div className="title-ornament section-ornament" aria-hidden="true"><span /></div>
    </header>
  )
}

function Section({ id, className = '', children }: { id: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`article-section ${className}`} id={id} aria-labelledby={`${id}-title`}>
      {children}
    </section>
  )
}

/** The source's own table, whole, before the stage (the user, 4.11: „נטו טבלה של ציר זמן").
    Laid out as pages 111–112 lay it out: three columns under §0's headings, each geography
    cell merged down the rows it covers (passages.json `regions`). Every row here is printed
    again on the stage — a deliberate second copy, like chapter 3's comic beside its fold. */
function Table() {
  return (
    <div className="ch15-table-wrap" data-reveal>
      <table className="ch15-table">
        <thead>
          <tr><th scope="col">{HEAD.year}</th><th scope="col">{HEAD.event}</th><th scope="col">{HEAD.region}</th></tr>
        </thead>
        <tbody>
          {REGIONS.map((g) =>
            g.rows.map((r, i) => (
              <tr key={r} className={i === 0 ? 'is-first' : undefined}>
                <td className="ch15-t-year"><bdi dir="ltr">{row(r).year}</bdi></td>
                <td className="ch15-t-event">{row(r).text}</td>
                {i === 0 && <td className="ch15-t-region" rowSpan={g.rows.length}>{g.text}</td>}
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  )
}

/** The table's own column headings (§0), printed once, as the key to the stage: each one
    stands beside the mark that carries that column on the map (rule 58). */
function Legend() {
  return (
    <dl className="ch15-legend" data-reveal>
      <div><dt><i className="ch15-glyph is-year" aria-hidden="true" /></dt><dd>{HEAD.year}</dd></div>
      <div><dt><i className="ch15-glyph is-event" aria-hidden="true" /></dt><dd>{HEAD.event}</dd></div>
      <div><dt><i className="ch15-glyph is-region" aria-hidden="true" /></dt><dd>{HEAD.region}</dd></div>
    </dl>
  )
}

/** One row of the table: its year, its event, and — when the event is told elsewhere on
    the site — the chapter that tells it (layout.json `links`, each backed by a sentence of
    that chapter; the gate checks). */
function Card({ r }: { r: string }) {
  const { year, text } = row(r)
  const link = LAYOUT.links[r]
  return (
    <div className="ch15-card">
      <span className="ch15-year" dir="ltr">{year}</span>
      <p className="ch15-event">{text}</p>
      {link && (
        <Link className="ch15-link" href={`/chapter${link.ch}`}>
          <span>פרק {link.ch} · {chapterTitle(link.ch)}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </Link>
      )}
    </div>
  )
}

/** A section's rows over the sticky plate — chapter 6's full-screen stage. */
function Stage({ id }: { id: string }) {
  const rows = meta(id).rows
  return (
    <div className="ch15-stage">
      <Scrolly full art={(s) => <TimelineMap {...s} rows={rows} />}>
        {rows.map((r) => <Card key={r} r={r} />)}
      </Scrolly>
    </div>
  )
}

export default function Chapter15() {
  const router = useRouter()
  const articleRef = useRef<HTMLElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const jumpUntil = useRef(0)
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [currentSection, setCurrentSection] = useState<string>(SECTION_ORDER[0])
  const [doneSections, setDoneSections] = useState<Set<string>>(new Set())

  useEffect(() => { setDoneSections(new Set(completedSections())) }, [])

  /* resume where the reader stopped — never on the first visit, and never when the
     URL carries a hash (the hash wins) */
  useEffect(() => {
    if (window.location.hash) return
    const id = resumeSectionId()
    if (!id) return
    const node = document.getElementById(id)
    if (!node) return
    jumpUntil.current = Date.now() + 1800
    node.scrollIntoView({ block: 'start' })
  }, [])

  useEffect(() => {
    const nodes = SECTION_ORDER.map((id) => document.getElementById(id)).filter((n): n is HTMLElement => !!n)
    if (!nodes.length) return
    const centre = new IntersectionObserver(
      () => {
        const line = window.innerHeight * 0.4
        let active = SECTION_ORDER[0]
        for (const n of nodes) if (n.getBoundingClientRect().top <= line) active = n.id
        setCurrentSection((cur) => {
          if (cur === active) return cur
          if (Date.now() >= jumpUntil.current) saveCurrentSection(active)
          return active
        })
      },
      { rootMargin: '0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    const completion = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || Date.now() < jumpUntil.current) continue
          const i = SECTION_ORDER.indexOf(e.target.id)
          if (i <= 0) continue
          const prev = SECTION_ORDER[i - 1]
          markSectionDone(prev)
          setDoneSections((cur) => (cur.has(prev) ? cur : new Set(cur).add(prev)))
        }
      },
      { rootMargin: '0px 0px -35% 0px', threshold: 0 },
    )
    nodes.forEach((n) => { centre.observe(n); completion.observe(n) })
    return () => { centre.disconnect(); completion.disconnect() }
  }, [])

  useEffect(() => {
    const end = endRef.current
    if (!end) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || Date.now() < jumpUntil.current) continue
          markContentComplete()
          setDoneSections(new Set(SECTION_ORDER))
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -24px 0px', threshold: 0 },
    )
    io.observe(end)
    return () => io.disconnect()
  }, [])

  /* the „הושלם" chip — read in an effect, never during render (hydration) */
  const [practiceDone, setPracticeDone] = useState(false)
  useEffect(() => { setPracticeDone(practiceComplete()) }, [])

  useEffect(() => {
    const root = articleRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return
    root.classList.add('js-reveal')
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) e.target.classList.toggle('is-inview', e.isIntersecting) },
      { rootMargin: '-6% 0px -6% 0px', threshold: 0 },
    )
    root.querySelectorAll('[data-reveal]').forEach((n) => io.observe(n))
    return () => { io.disconnect(); root.classList.remove('js-reveal') }
  }, [])

  useEffect(() => {
    try { setCollapsed(localStorage.getItem('ch15:side-collapsed') === '1') } catch {}
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('ch15:side-collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }, [])
  const onMenuJump = useCallback(() => { jumpUntil.current = Date.now() + 1800 }, [])
  /* ChapterSearch announces its jump with `chapter:jump` — skipped sections earn no tick */
  useEffect(() => {
    window.addEventListener('chapter:jump', onMenuJump)
    return () => window.removeEventListener('chapter:jump', onMenuJump)
  }, [onMenuJump])

  return (
    <div className="chapter-page">
      <MarkToNotebook ch={15} />
      <header className="chapter-site-header">
        <div className="chapter-site-header-inner">
          <div className="chapter-hdr-start">
            <button
              type="button"
              className="chapter-burger"
              aria-label={isDesktop ? 'כיווץ/הרחבה של התפריט' : 'פתיחת תפריט הפרק'}
              aria-controls="chapter-menu"
              aria-expanded={isDesktop ? !collapsed : drawer}
              onClick={() => (isDesktop ? toggleCollapse() : setDrawer(true))}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16" /></svg>
            </button>
            <button type="button" className="chapter-logo" onClick={() => router.push('/chapters')} aria-label="חזרה לעמוד הפרקים">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo-cream.png" alt="אסלאם" />
            </button>
          </div>
          <ChapterSearch containerRef={articleRef} />
        </div>
      </header>

      <div className="chapter-shell">
        <aside
          id="chapter-menu"
          className={'chapter-drawer' + (drawer ? ' is-open' : '') + (collapsed ? ' is-collapsed' : '')}
          aria-label="תפריט הפרק"
          aria-hidden={!isDesktop && !drawer ? true : undefined}
          inert={!isDesktop && !drawer}
        >
          <div className="menu-head">
            <button type="button" className="menu-close" aria-label="סגירת התפריט" onClick={() => setDrawer(false)}>
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
            <p className="menu-title">תוכן הפרק</p>
            <span className="menu-sub">{CH15.menuTitle}</span>
          </div>
          {/* main sections only (rule 29) */}
          <nav className="chapter-menu-nav" aria-label="ניווט בפרק">
            <ol>
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={currentSection === s.id ? 'is-current' : undefined}
                    aria-current={currentSection === s.id ? 'true' : undefined}
                    onClick={() => { onMenuJump(); setDrawer(false) }}
                  >
                    <span className="menu-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="menu-label"><bdi dir="ltr">{s.title}</bdi></span>
                    {doneSections.has(s.id) && (
                      <svg className="menu-done" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5" /></svg>
                    )}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="menu-extra">
            <Link className="menu-x-item" href="/chapters" onClick={() => setDrawer(false)}>
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              לכל פרקי הלמידה
            </Link>
          </div>
        </aside>
        {drawer && <div className="chapter-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}

        <div className="chapter-content">
          <div className="chapter-layout">
            <main className="chapter-article ch15" ref={articleRef}>

              {/* ============ 01 · 570–632 ============ */}
              <Section id="s570" className="opening-section">
                {/* the banner: the chapter's own plate, bright parchment under the shared veil
                    (rule 42) — no asset was generated for it */}
                <div className="ch6-hero ch15-hero">
                  <div className="ch6-hero-media" aria-hidden="true" style={{ backgroundImage: "url('/assets/chapter5/umar-map.jpg')" }} />
                  <div className="ch6-hero-copy">
                    <h1 id="chapter-title" className="ch6-hero-title">{CH15.title}</h1>
                    <p className="ch15-hero-range">{CH15.range}</p>
                  </div>
                </div>
                <Table />
                <Head id="s570" />
                <Legend />
                <Stage id="s570" />
              </Section>

              {/* ============ 02 · 634–661 ============ */}
              <Section id="s634">
                <Head id="s634" />
                <Stage id="s634" />
              </Section>

              {/* ============ 03 · 680–874 ============ */}
              <Section id="s680">
                <Head id="s680" />
                <Stage id="s680" />
              </Section>

              {/* the close, identical in every chapter (rule 33) */}
              <div className="chapter-end" ref={endRef} id="chapter-end" data-reveal>
                <Link className="chapter-end-back" href="/chapter15/practice">לתרגול המסכם</Link>
                {practiceDone && <span className="chapter-end-done">הושלם</span>}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
