'use client'

/* Chapter 1 — the article, with the game's pieces inside it. PILOT (3.11.2026).

   The chapter was a 3D game; „לא עובד טוב" became „קטעי מאמר ובתוכו חלקי משחק —
   לשמור רק את האינטראקציות". This page is one section of that article, built on the
   site's own skeleton (chapter 7's, part for part) so it can be judged beside the
   chapters that are finished. If it holds, the rest of the chapter follows the same
   pattern; see concept/chapter1/DECISIONS.md, 3.11.2026.

   THE CRATE (the game's task-loading as a drag-the-goods scene) was cut on 9.11.2026 —
   the user: „את המה עבר בדרכים תעיף, לא אהבתי”. §9 stays, as prose after the map.

   WHAT THIS FILE MAY NOT DO: write a sentence. Every string comes from passages.json
   through `text()`, by reference. concept/chapter1/verify-article.mjs checks it. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import { Scrolly } from '@/components/chapter6/scrolly'
import RouteMap from '@/components/chapter1/RouteMap'
import { CH1, LAYOUT, SECTIONS, em, meta, sub, text, tr } from '@/lib/chapter1/article/content'

const A = '/assets/chapter1/article/'

/* ---------------- text primitives (chapter 7's, unchanged) ---------------- */
type Paint = (phrase: string, key: string) => ReactNode
function mark(t: string, groups: { phrases: string[]; paint: Paint }[], key: string): ReactNode[] {
  const all = groups.flatMap((g) => g.phrases.map((phrase) => ({ phrase, paint: g.paint })))
  if (!all.length) return [t]
  if (process.env.NODE_ENV !== 'production') {
    for (const { phrase } of all) if (!t.includes(phrase)) console.error(`chapter 1: „${phrase}" is not in ${key}`)
  }
  all.sort((a, b) => b.phrase.length - a.phrase.length)
  let parts: ReactNode[] = [t]
  for (const [pi, { phrase, paint }] of all.entries()) {
    const next: ReactNode[] = []
    for (const part of parts) {
      if (typeof part !== 'string') { next.push(part); continue }
      part.split(phrase).forEach((bit, i) => {
        if (i) next.push(paint(phrase, `${key}-${pi}-${i}`))
        if (bit) next.push(bit)
      })
    }
    parts = next
  }
  return parts
}
const bold = (cls: string): Paint =>
  function paintBold(phrase, k) { return <b className={cls} key={k}>{phrase}</b> }
const painted = (r: string) =>
  mark(text(r), [{ phrases: em(r), paint: bold('key') }, { phrases: tr(r), paint: bold('ch1-tr') }], r)

function T({ refs, className }: { refs: string[]; className?: string }) {
  return (
    <p className={className} data-reveal>
      {refs.flatMap((r, i) => [...(i ? [' '] : []), ...painted(r)])}
    </p>
  )
}

/** A paragraph riding in a stage card. No `data-reveal`: the Scrolly fades its own steps. */
function StageP({ refs }: { refs: string[] }) {
  return <p>{refs.flatMap((r, i) => [...(i ? [' '] : []), ...painted(r)])}</p>
}

function Head({ id }: { id: string }) {
  const s = meta(id)
  return (
    <header className="section-heading" data-reveal>
      <div>
        <h2 id={`${id}-title`}>{s.title}</h2>
      </div>
      <div className="title-ornament section-ornament" aria-hidden="true"><span /></div>
    </header>
  )
}
function Env({ id, sectionId }: { id: string; sectionId: string }) {
  return <h3 className="scrolly-env" id={id}>{sub(sectionId, id)}</h3>
}

/* ---------------- the page ---------------- */
export default function Chapter1Article() {
  const router = useRouter()
  const articleRef = useRef<HTMLElement | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

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
    try { setCollapsed(localStorage.getItem('ch1:side-collapsed') === '1') } catch {}
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('ch1:side-collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }, [])

  return (
    <div className="chapter-page">
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
            <span className="menu-sub">{CH1.menuTitle}</span>
          </div>
          <nav className="chapter-menu-nav" aria-label="ניווט בפרק">
            <ol>
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="is-current" aria-current="true" onClick={() => setDrawer(false)}>
                    <span className="menu-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="menu-label">{s.title}</span>
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
            <main className="chapter-article ch1" ref={articleRef}>
              {/* ============ the tribes and the trade routes ============ */}
              <section className="article-section opening-section" id="tribes" aria-labelledby="tribes-title">
                {/* the banner is a film (the user, 9.11.2026: „והבאנר שיהיה סרטון"): the game's
                    own opening — the camels resting by the village, then the caravan on the
                    road through the terraces. Cut from anim-video/opening.mp4 around the
                    close-up between 5.5s and 11s, which shows a face (rule 43). */}
                <div className="ch6-hero">
                  <div className="ch6-hero-media ch1-hero-media" aria-hidden="true">
                    <video className="ch6-hero-video" autoPlay muted loop playsInline preload="auto" poster="/assets/chapter1/article/hero-1.jpg" tabIndex={-1} onError={(e) => { e.currentTarget.hidden = true }}>
                      <source src="/assets/chapter1/article/hero.mp4" type="video/mp4" />
                    </video>
                  </div>
                  <div className="ch6-hero-copy">
                    <h1 id="chapter-title" className="ch6-hero-title">{CH1.title}</h1>
                  </div>
                </div>
                <Head id="tribes" />
                {/* the journey: the painted map fills the screen, the caravan walks the
                    road north while §7 is read, and the two empires arrive with §8 */}
                <div className="ch1-route">
                  <Scrolly full art={(s) => <RouteMap {...s} />}>
                    <StageP refs={['§6.a']} />
                    <StageP refs={['§7.a']} />
                    <StageP refs={['§8.a']} />
                  </Scrolly>
                </div>
                <T refs={['§9.a', '§9.b', '§9.c']} />
              </section>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
