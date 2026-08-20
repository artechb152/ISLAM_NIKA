'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import { PrayerDayStage } from '@/components/chapter6/stages'
import { HajjRouteMap } from '@/components/chapter6/HajjRouteMap'
import { RamadanTimeline } from '@/components/chapter6/RamadanTimeline'
import { boldize, P, Scrolly } from '@/components/chapter6/scrolly'
import StoryFilm from '@/components/chapter6/StoryFilm'
import { CH6 } from '@/lib/chapter6/data'
import { readPractice } from '@/lib/chapter6/practice-progress'
import {
  completedSections,
  markContentComplete,
  markSectionDone,
  resumeSectionId,
  saveCurrentSection,
  SECTION_ORDER,
} from '@/lib/chapter6/progress'
import type { Screen } from '@/lib/chapter6/types'

const SECTION_LINKS = [
  { id: 'opening', label: 'פתיחת הפרק' },
  { id: 'pillars', label: 'חמש מצוות היסוד' },
  { id: 'shahada', label: 'השהאדה' },
  { id: 'prayer', label: 'התפילה' },
  { id: 'charity', label: 'הצדקה' },
  { id: 'ramadan', label: 'צום רמדאן' },
  { id: 'hajj', label: "החג'" },
] as const

const SCREENS = new Map(CH6.screens.map((screen) => [screen.id, screen]))

function screen(id: string): Screen {
  const value = SCREENS.get(id)
  if (!value) throw new Error(`Chapter 6 content is missing screen ${id}`)
  return value
}

/* every paragraph is read from the verbatim data — nothing here retypes content */
function para(id: string, index: number): string {
  const value = screen(id).content?.[index]
  if (value === undefined) throw new Error(`Chapter 6 content is missing ${id}[${index}]`)
  return value
}

/* a verbatim paragraph rendered with its key phrases emphasised in <b> (see boldize) */
function KP({ text, of = [], className }: { text: string; of?: string[]; className?: string }) {
  return <p className={className}>{boldize(text, of)}</p>
}
/* the same emphasis as a bare node — for the paras[] fed to the timeline / route-map panels */
function kb(text: string, of: string[] = []): ReactNode {
  return <>{boldize(text, of)}</>
}

function Paragraphs({ paragraphs }: { paragraphs?: string[] }) {
  return (
    <>
      {(paragraphs ?? []).map((paragraph, index) =>
        /^[؀-ۿ\s]+$/.test(paragraph) ? (
          <blockquote className="arabic-quote" lang="ar" dir="rtl" key={`${index}-${paragraph}`}>
            {paragraph}
          </blockquote>
        ) : (
          <p key={`${index}-${paragraph}`}>{paragraph}</p>
        )
      )}
    </>
  )
}

function SectionHeading({
  id,
  eyebrow,
  title,
  term,
  lead,
}: {
  id: string
  eyebrow?: string
  title: string
  term?: string
  lead?: string
}) {
  return (
    <header className="section-heading" data-reveal>
      {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
      <div>
        <h2 id={id}>{title}</h2>
        {term && <span className="section-term" lang="ar" dir="rtl">{term}</span>}
      </div>
      {/* the pillars carry an Arabic term + the shahada's diamond ornament beneath the title */}
      {term && <div className="title-ornament section-ornament" aria-hidden="true"><span /></div>}
      {lead && <p>{lead}</p>}
    </header>
  )
}

/* a small interface heading inside a scroll environment — never replaces content */
function Env({ children }: { children: string }) {
  return <h3 className="scrolly-env">{children}</h3>
}

function PillarIcon({ image, alt }: { image: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/assets/anim-video/${image}`} alt={alt} />
  )
}

const MENU_POS_KEY = 'ch6:menu-pos'

const PILLAR_ICONS = ['icon-shahada.png', 'icon-prayer.png', 'icon-charity.png', 'icon-ramadan.png', 'icon-hajj.png']

export default function Chapter6() {
  const [storyOpen, setStoryOpen] = useState(false)
  const opening = screen('01')
  const actions = opening.actionDetails ?? []
  const router = useRouter()
  const articleRef = useRef<HTMLElement | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const asideRef = useRef<HTMLElement | null>(null)
  const burgerRef = useRef<HTMLButtonElement | null>(null)
  const filmWrapRef = useRef<HTMLDivElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  /* the opening sentence, split for the scroll reveal exactly as the spec draws it —
     derived by slicing the verbatim string, so not a single word can drift */
  const openingText = opening.content?.[0] ?? ''
  const pillarsCut = openingText.indexOf('חמש מצוות אלו')
  const openingLead = pillarsCut > 0 ? openingText.slice(0, pillarsCut) : openingText
  const pillarsStatement = pillarsCut > 0 ? openingText.slice(pillarsCut) : ''
  const arkanCut = pillarsStatement.indexOf('(')
  const pillarsMain = arkanCut > 0 ? pillarsStatement.slice(0, arkanCut) : pillarsStatement
  const pillarsArkan = arkanCut > 0 ? pillarsStatement.slice(arkanCut) : ''

  /* ---------------- progress: current section, completion, resume ---------------- */
  const [currentSection, setCurrentSection] = useState('opening')
  const [doneSections, setDoneSections] = useState<Set<string>>(new Set())
  /* while a menu jump (or the resume jump) smooth-scrolls past sections, nothing that
     flies by may be marked as read — the spec forbids crediting skipped sections */
  const jumpUntil = useRef(0)

  useEffect(() => {
    setDoneSections(new Set(completedSections()))
    /* whatever is inside the viewport on ARRIVAL (browser scroll restoration included)
       was not read — only scrolling that happens after this window may earn completion */
    jumpUntil.current = Date.now() + 1500
    const resume = resumeSectionId()
    if (resume) {
      jumpUntil.current = Date.now() + 2000
      /* back to the START of the last section — never into the middle of an animation */
      requestAnimationFrame(() => {
        document.getElementById(resume)?.scrollIntoView({ behavior: 'auto', block: 'start' })
      })
    }
  }, [])

  useEffect(() => {
    const sections = SECTION_ORDER
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => !!node)
    if (!sections.length) return

    /* the section crossing the middle band of the viewport is "where the reader is" */
    const centre = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const id = entry.target.id
          setCurrentSection(id)
          if (Date.now() >= jumpUntil.current) saveCurrentSection(id)
        }
      },
      { rootMargin: '-42% 0px -42% 0px', threshold: 0 }
    )

    /* a commandment is finished only when the reader SCROLLS into the next one */
    const completion = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || Date.now() < jumpUntil.current) continue
          const index = SECTION_ORDER.indexOf(entry.target.id)
          if (index <= 0) continue
          const previous = SECTION_ORDER[index - 1]
          markSectionDone(previous)
          setDoneSections((current) => (current.has(previous) ? current : new Set(current).add(previous)))
        }
      },
      { rootMargin: '0px 0px -35% 0px', threshold: 0 }
    )

    sections.forEach((node) => {
      centre.observe(node)
      completion.observe(node)
    })
    return () => {
      centre.disconnect()
      completion.disconnect()
    }
  }, [])

  function onMenuJump(): void {
    jumpUntil.current = Date.now() + 1800
  }

  /* the last section (the hajj) has no anchor after it, so it is marked done when the reader
     reaches the closing block. That records the READING — every section of ch6:v1 — but no
     longer completes the chapter: islam:chapter:6='done' now belongs to the closing practice
     at /chapter6/practice, which is the only place that writes it. */
  useEffect(() => {
    const end = endRef.current
    if (!end) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || Date.now() < jumpUntil.current) continue
          markContentComplete()
          setDoneSections(new Set(SECTION_ORDER))
          observer.disconnect()
        }
      },
      /* A PIXEL margin, not a percentage. This block is the last thing in the document, with
         only ~70–90px of layout padding beneath it, so a -20% bottom margin (154px at 768px
         tall, 216px at 1080px) put the observer's edge permanently above it and the block could
         never intersect at any viewport size — the closing sections were never recorded. A
         small fixed margin still demands the block be properly in view, and is reachable. */
      { rootMargin: '0px 0px -24px 0px', threshold: 0 }
    )
    observer.observe(end)
    return () => observer.disconnect()
  }, [])

  /* the closing button carries a quiet "הושלם" once the practice has been finished; it still
     links there either way, because re-entering a finished practice must never be blocked */
  const [practiceDone, setPracticeDone] = useState(false)
  useEffect(() => {
    setPracticeDone(readPractice().completed)
  }, [])


  /* ---------------- scroll-driven reveals (reversible, reduced-motion aware) ---------------- */
  useEffect(() => {
    const root = articleRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return
    root.classList.add('js-reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) entry.target.classList.toggle('is-inview', entry.isIntersecting)
      },
      { rootMargin: '-6% 0px -6% 0px', threshold: 0 }
    )
    root.querySelectorAll('[data-reveal]').forEach((node) => observer.observe(node))
    return () => {
      observer.disconnect()
      root.classList.remove('js-reveal')
    }
  }, [])

  /* the opening film dims and recedes slightly as the reader scrolls on (spec, area 1) */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return
    const wrap = filmWrapRef.current
    if (!wrap) return
    let raf = 0
    function measure(): void {
      raf = 0
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      const gone = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)))
      wrap.style.opacity = String(1 - gone * 0.5)
      wrap.style.transform = `scale(${1 - gone * 0.04})`
    }
    function onScroll(): void {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    measure()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  /* Desktop (>=1024px) shows the section nav as a persistent, collapsible sidebar (YouTube-style);
     below that it is the off-canvas drawer. The collapsed state persists like the chapters menu. */
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

  function toggleCollapse(): void {
    setCollapsed((value) => {
      const next = !value
      try {
        localStorage.setItem('ch6:side-collapsed', next ? '1' : '0')
      } catch {}
      return next
    })
  }

  /* ---------------- draggable menu (desktop only) ----------------
     The panel keeps its layout slot — dragging moves it with a transform, so the article
     never shifts. The offset is clamped to the window (and below the header) and persists. */
  const [menuOffset, setMenuOffset] = useState({ x: 0, y: 0 })
  const menuOffsetRef = useRef(menuOffset)
  menuOffsetRef.current = menuOffset
  const [menuDragging, setMenuDragging] = useState(false)
  const dragBase = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MENU_POS_KEY)
      if (raw) {
        const p = JSON.parse(raw) as { x?: number; y?: number } | null
        if (p && typeof p.x === 'number' && typeof p.y === 'number') setMenuOffset({ x: p.x, y: p.y })
      }
    } catch {}
  }, [])

  function clampMenuOffset(x: number, y: number): { x: number; y: number } {
    const aside = asideRef.current
    if (!aside) return { x, y }
    const rect = aside.getBoundingClientRect()
    const current = menuOffsetRef.current
    const baseLeft = rect.left - current.x
    const baseTop = rect.top - current.y
    const headerHeight = document.querySelector('.chapter-site-header')?.getBoundingClientRect().height ?? 56
    /* flush edges: the panel rests ON the window edge, so a drag must start from 0 */
    const minX = -baseLeft
    const maxX = window.innerWidth - rect.width - baseLeft
    const minY = headerHeight - baseTop
    const maxY = window.innerHeight - rect.height - baseTop
    return {
      x: maxX < minX ? 0 : Math.min(Math.max(x, minX), maxX),
      y: maxY < minY ? 0 : Math.min(Math.max(y, minY), maxY),
    }
  }

  function persistMenuOffset(offset: { x: number; y: number }): void {
    try {
      if (offset.x === 0 && offset.y === 0) localStorage.removeItem(MENU_POS_KEY)
      else localStorage.setItem(MENU_POS_KEY, JSON.stringify(offset))
    } catch {}
  }

  function onGripPointerDown(event: React.PointerEvent<HTMLButtonElement>): void {
    if (!isDesktop) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragBase.current = { px: event.clientX, py: event.clientY, ox: menuOffsetRef.current.x, oy: menuOffsetRef.current.y }
    setMenuDragging(true)
  }

  function onGripPointerMove(event: React.PointerEvent<HTMLButtonElement>): void {
    const base = dragBase.current
    if (!base) return
    setMenuOffset(clampMenuOffset(base.ox + (event.clientX - base.px), base.oy + (event.clientY - base.py)))
  }

  function onGripPointerUp(): void {
    if (!dragBase.current) return
    dragBase.current = null
    setMenuDragging(false)
    persistMenuOffset(menuOffsetRef.current)
  }

  function onGripKeyDown(event: React.KeyboardEvent<HTMLButtonElement>): void {
    const step = 24
    let next: { x: number; y: number } | null = null
    if (event.key === 'ArrowLeft') next = clampMenuOffset(menuOffsetRef.current.x - step, menuOffsetRef.current.y)
    else if (event.key === 'ArrowRight') next = clampMenuOffset(menuOffsetRef.current.x + step, menuOffsetRef.current.y)
    else if (event.key === 'ArrowUp') next = clampMenuOffset(menuOffsetRef.current.x, menuOffsetRef.current.y - step)
    else if (event.key === 'ArrowDown') next = clampMenuOffset(menuOffsetRef.current.x, menuOffsetRef.current.y + step)
    else if (event.key === 'Home') next = { x: 0, y: 0 }
    if (!next) return
    event.preventDefault()
    setMenuOffset(next)
    persistMenuOffset(next)
  }

  function resetMenuOffset(): void {
    setMenuOffset({ x: 0, y: 0 })
    persistMenuOffset({ x: 0, y: 0 })
  }

  /* no text selection while dragging; re-clamp when the window changes size */
  useEffect(() => {
    if (!menuDragging) return
    const previous = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.userSelect = previous
    }
  }, [menuDragging])

  useEffect(() => {
    function onResize(): void {
      const current = menuOffsetRef.current
      if (current.x === 0 && current.y === 0) return
      setMenuOffset((value) => clampMenuOffset(value.x, value.y))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const menuMoved = menuOffset.x !== 0 || menuOffset.y !== 0

  /* Logo click: always return to the chapters screen (the list of all chapters). */
  function goBack(): void {
    router.push('/chapters')
  }

  /* Drawer: lock scroll, close on Escape, trap focus, return focus to the hamburger — the same
     behaviour as the chapters-screen menu. */
  useEffect(() => {
    if (!drawer) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const aside = asideRef.current
    aside?.querySelector<HTMLElement>('button,[href]')?.focus()
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setDrawer(false)
        return
      }
      if (event.key !== 'Tab' || !aside) return
      const f = Array.from(aside.querySelectorAll<HTMLElement>('button,[href]')).filter((n) => n.offsetParent !== null)
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
      burgerRef.current?.focus()
    }
  }, [drawer])

  return (
    <div className="chapter-page">
      <header className="chapter-site-header">
        <div className="chapter-site-header-inner">
          <div className="chapter-hdr-start">
            <button
              type="button"
              ref={burgerRef}
              className="chapter-burger"
              aria-label={isDesktop ? 'כיווץ/הרחבה של התפריט' : 'פתיחת תפריט הפרק'}
              aria-controls="chapter-menu"
              aria-expanded={isDesktop ? !collapsed : drawer}
              onClick={() => (isDesktop ? toggleCollapse() : setDrawer(true))}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16" /></svg>
            </button>
            <button type="button" className="chapter-logo" onClick={goBack} aria-label="חזרה לעמוד הפרקים">
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
        ref={asideRef}
        className={
          'chapter-drawer' +
          (drawer ? ' is-open' : '') +
          (collapsed ? ' is-collapsed' : '') +
          (menuDragging ? ' is-dragging' : '')
        }
        style={isDesktop && menuMoved ? { transform: `translate(${menuOffset.x}px, ${menuOffset.y}px)` } : undefined}
        aria-label="תפריט הפרק"
        aria-hidden={!isDesktop && !drawer ? true : undefined}
        inert={!isDesktop && !drawer}
      >
        <div className="menu-head">
          <button type="button" className="menu-close" aria-label="סגירת התפריט" onClick={() => setDrawer(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          <h2 className="menu-title">תוכן הפרק</h2>
          <span className="menu-sub">פרק 6 · חמש מצוות היסוד</span>
        </div>
        <div className="menu-grip-row">
          <button
            type="button"
            className="menu-grip"
            aria-label="גרירת התפריט (חיצי המקלדת מזיזים, Home מאפס)"
            title="גרירת התפריט"
            onPointerDown={onGripPointerDown}
            onPointerMove={onGripPointerMove}
            onPointerUp={onGripPointerUp}
            onPointerCancel={onGripPointerUp}
            onKeyDown={onGripKeyDown}
          >
            <svg viewBox="0 0 24 10" aria-hidden="true">
              <circle cx="5" cy="3" r="1.4" /><circle cx="12" cy="3" r="1.4" /><circle cx="19" cy="3" r="1.4" />
              <circle cx="5" cy="7" r="1.4" /><circle cx="12" cy="7" r="1.4" /><circle cx="19" cy="7" r="1.4" />
            </svg>
          </button>
          {menuMoved && (
            <button type="button" className="menu-reset" onClick={resetMenuOffset}>
              החזרה למקום
            </button>
          )}
        </div>
        <nav className="chapter-menu-nav" aria-label="ניווט בפרק">
          <ol>
            {SECTION_LINKS.map((link, index) => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  className={currentSection === link.id ? 'is-current' : undefined}
                  aria-current={currentSection === link.id ? 'true' : undefined}
                  onClick={() => {
                    onMenuJump()
                    setDrawer(false)
                  }}
                >
                  <span className="menu-num">{String(index + 1).padStart(2, '0')}</span>
                  <span className="menu-label">{link.label}</span>
                  {doneSections.has(link.id) && (
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
        <main className="chapter-article" ref={articleRef}>
          {/* ===================== area 1 — the opening ===================== */}
          <section className="opening-section article-section" id="opening" aria-labelledby="chapter-title">
            {/* cinematic banner like the chapters page — video background + title over it */}
            <div className="ch6-hero">
              <div className="ch6-hero-media" aria-hidden="true">
                <video
                  className="ch6-hero-video"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  poster="/assets/chapter6/ch6-hero-poster.jpg"
                  tabIndex={-1}
                  onError={(event) => { event.currentTarget.hidden = true }}
                >
                  <source src="/assets/chapter6/ch6-hero.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="ch6-hero-copy">
                <h1 id="chapter-title" className="ch6-hero-title">חמש מצוות היסוד</h1>
              </div>
            </div>
            <p className="film-caption">עֻמַר בן אלח'טאב (הח'ליף השני)</p>
            <div className="film-wrap" ref={filmWrapRef}>
              <StoryFilm />
            </div>
            <button
              className="story-toggle"
              type="button"
              aria-expanded={storyOpen}
              aria-controls="chapter-story"
              onClick={() => setStoryOpen((value) => !value)}
            >
              {storyOpen ? 'הסתרת הסיפור' : 'הצגת הסיפור'}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 9.5 12 15l5.5-5.5" /></svg>
            </button>
            <div
              className={'story-reveal' + (storyOpen ? ' is-open' : '')}
              id="chapter-story"
              aria-hidden={!storyOpen}
              inert={!storyOpen}
            >
              <div>
                <article className="story-copy" aria-labelledby="story-title">
                  <h2 id="story-title">{opening.drawerTitle}</h2>
                  <Paragraphs paragraphs={opening.drawerContent} />
                </article>
              </div>
            </div>
          </section>

          {/* ============ area 1, part 2 — from the film to the five pillars ============ */}
          <section className="pillars-section article-section" id="pillars" aria-labelledby="pillars-title">
            <h2 id="pillars-title" className="sr-only">חמש מצוות היסוד</h2>
            <p className="pillars-lead" data-reveal>{openingLead}</p>
            <div className="pillars-statement" data-reveal>
              <b>{pillarsMain}</b>
              {pillarsArkan && <span>{pillarsArkan}</span>}
            </div>
            <div className="pillars-path" aria-label="חמש מצוות היסוד">
              <span className="pillars-line" aria-hidden="true" />
              {actions.map((action, index) => {
                const target = SECTION_LINKS[index + 2]
                return (
                  <a
                    href={`#${target.id}`}
                    key={action.commandment}
                    onClick={onMenuJump}
                    data-reveal
                    style={{ transitionDelay: `${index * 110}ms` }}
                  >
                    <span className="pillar-icon"><PillarIcon image={PILLAR_ICONS[index]} alt="" /></span>
                    <b>{action.commandment}</b>
                    {/* the peek: the action verb, revealed on hover (desktop) and shown inline
                        on touch — space is reserved either way so the row never shifts */}
                    <small className="pillar-peek">{action.action}</small>
                  </a>
                )
              })}
            </div>
          </section>

          {/* ===================== area 2 — the shahada ===================== */}
          <section className="commandment-section shahada-section article-section" id="shahada" aria-labelledby="shahada-title">
            {/* the shahada opens as an illustrated hero: the reading column on the RIGHT (the
                natural RTL side) — the word's origin, the testimony in an illuminated frame,
                then when it is heard — with a large watercolor minaret cutout on the LEFT */}
            <div className="shahada-hero">
              <div className="shahada-minaret" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/chapter6/shahada-minaret.png" alt="" loading="lazy" decoding="async" />
              </div>
              <div className="shahada-body" data-reveal>
                <header className="shahada-head">
                  <h2 id="shahada-title">
                    השהאדה <span className="shahada-ar" lang="ar" dir="rtl">(الشهادة)</span>
                  </h2>
                  <div className="title-ornament" aria-hidden="true"><span /></div>
                </header>
                {/* sh-1[0], verbatim. The revised source reverses the claim: the
                    word is Arabic by root, and the Aramaic is raised only as a
                    possibility — so the emphasis moves onto the root and its
                    meaning, and the biblical citation stays as the aside it now
                    is. Retyped here rather than read from data.ts because the
                    sentence is set in three typographic registers; if it changes
                    again, it changes in both places. */}
                <p className="shahada-intro">
                  המילה שהאדה נגזרת מן <b>השורש הערבי ש-ה-ד</b>, שמשמעותו{' '}
                  <b>עדות / מתן עדות</b>.<br />
                  יתכן ומילה זו מקורה מארמית, שכן היא מוזכרת במקרא{' '}
                  <em>(גל-עד; יגר שהדותא, בראשית לא:מז)</em>.
                </p>
                {/* sh-2[0] — split into the lead-in and the testimony itself (verbatim) */}
                <p className="shahada-lead">על המוסלמי להעיד</p>
                <blockquote className="shahada-quote">
                  <span className="sq-mark sq-open" aria-hidden="true">”</span>
                  <p>אין אל מבלעדי אללה ושמוחמד הוא שליחו.</p>
                  <span className="sq-mark sq-close" aria-hidden="true">”</span>
                </blockquote>
                {/* when it is heard — both spoken contexts (sh-3[0]+[1]), then the historical
                    meaning of the declaration (sh-2[1]) — all continuous prose in one column */}
                <KP className="shahada-when-text" text={para('sh-3', 0)} of={['בקריאה לתפילה', 'במהלך התפילה']} />
                <KP className="shahada-when-text" text={para('sh-3', 1)} of={['שלוש פעמים בפני שני עדים כשרים']} />
                <KP className="shahada-when-text" text={para('sh-2', 1)} of={['ייחוד האל']} />
              </div>
            </div>
          </section>

          {/* ===================== area 3 — the prayer ===================== */}
          <section className="commandment-section prayer-section article-section" id="prayer" aria-labelledby="prayer-title">
            {/* the title reads as a normal editorial heading (like every other section); only the
                paragraphs live in the photo-scrolly. Four grouped steps, the five-prayers step
                keeps the click-to-change-the-sky interaction; the qibla is its own block below. */}
            <SectionHeading id="prayer-title" title="התפילה" term="(الصلاة)" />
            {/* pr-1 — the night journey → five prayers, as regular parchment reading (like the
                shahada): no immersive scene, just the text on the paper (sub-heading removed) */}
            <div className="prayer-block" data-reveal>
              <KP text={para('pr-1', 0)} of={['למסע הלילי ולעלייה לשמים', 'לפי המסורת האסלאמית']} />
              <KP text={para('pr-1', 1)} of={['חמש תפילות']} />
            </div>

            {/* pr-2 — THE DAY JOURNEY: the five daily prayers read on one screen while the day
                passes behind them (dawn → night), scroll-driven. The opening "על המוסלמי…" line
                stays; each prayer's verbatim sentence rides its own moment of the day. No buttons. */}
            <div className="prayer-day">
              <Scrolly full art={(s) => <PrayerDayStage {...s} />}>
                <div className="pd-open">
                  <P text={para('pr-2', 0)} />
                  <span className="pd-scrollcue" aria-hidden="true">גללו לאורך היום ↓</span>
                </div>
                <div className="pd-step">
                  <h3 className="pd-name">תפילת השחר <span className="pd-ar">(צלאה אלפג׳ר)</span></h3>
                  <p>זמנה בעלות השחר, כשהאדם יכול להבחין בין חוט לבן לחוט שחור (קוראן 2:187).</p>
                </div>
                <div className="pd-step">
                  <h3 className="pd-name">תפילת הצהריים <span className="pd-ar">(צלאה אלט׳הר)</span></h3>
                  <p>זמנה בחצות היום.</p>
                </div>
                <div className="pd-step">
                  <h3 className="pd-name">תפילת אחר הצהריים <span className="pd-ar">(צלאה אלעצר)</span></h3>
                  <p>זמנה כשצלו של חפץ והחפץ עצמו באותו הגודל.</p>
                </div>
                <div className="pd-step">
                  <h3 className="pd-name">תפילת הערב <span className="pd-ar">(צלאה אלמע׳רב)</span></h3>
                  <p>זמנה בשקיעת השמש.</p>
                </div>
                <div className="pd-step">
                  <h3 className="pd-name">תפילת הלילה <span className="pd-ar">(צלאה אלעשאא׳)</span></h3>
                  <p>זמנה בצאת הכוכבים ועד הבוקר.</p>
                </div>
              </Scrolly>
            </div>

            {/* pr-3, pr-4 — purification & intention, and where one prays — back on the regular
                parchment background (like the shahada) */}
            <div className="prayer-block" data-reveal>
              <Env>{screen('pr-3').title}</Env>
              <KP text={para('pr-3', 0)} of={['להיטהר']} />
              <KP text={para('pr-3', 1)} of={['בכוונה (נייה)']} />
            </div>
            <div className="prayer-block" data-reveal>
              <Env>{screen('pr-4').title}</Env>
              <KP text={para('pr-4', 0)} of={["תפילת יום השישי (צלאת אלג'מעה)", "דרשה (ח'טבה)"]} />
              <KP text={para('pr-4', 1)} of={[]} />
              <KP text={para('pr-4', 2)} of={['אישה מחויבת להתפלל כמו גבר']} />
            </div>
            {/* the qibla, as its own calm reading block: the text of the direction change beside
                the one calibrated map that now draws BOTH directions from Medina */}
            <div className="qibla-feature" data-reveal>
              <Env>{screen('pr-5').title}</Env>
              <div className="content-block">
                <KP text={para('pr-5', 0)} of={['(קבלה)', 'מכה']} />
                <KP text={para('pr-5', 1)} of={['ירושלים', 'למכה']} />
                <KP text={para('pr-5', 2)} of={[]} />
                <KP text={para('pr-5', 3)} of={['כיוון התפילה הראשון']} />
                <KP text={para('pr-5', 4)} of={['בעל שני כיווני התפילה']} />
              </div>
              <div className="qibla-mapcol">
                <figure className="map-figure qibla-map">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="qibla-mapimg" src="/assets/chapter6/qibla-route-map.jpg" alt="מפת אזור החִג'אז והלבנט" loading="lazy" decoding="async" />
                  <svg className="qibla-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <path className="qline-first" d="M62 42 L40 19" />
                    <path className="qline-second" d="M62 42 L60 66" />
                  </svg>
                  <span className="map-pin jerusalem">ירושלים</span>
                  <span className="map-pin medina">מדינה</span>
                  <span className="map-pin makkah">מכה</span>
                </figure>
                <div className="qibla-legend" aria-hidden="true">
                  <span className="leg first">כיוון ראשון · לירושלים (17 חודשים)</span>
                  <span className="leg second">כיוון שני · למכה</span>
                </div>
              </div>
            </div>
          </section>

          {/* ===================== area 4 — the charity ===================== */}
          <section className="commandment-section charity-section article-section" id="charity" aria-labelledby="charity-title">
            {/* charity as an illustrated hero, like the shahada: a large watercolor of giving —
                coins and grain poured from hand to hand — bleeds in from the LEFT edge of the
                screen, the reading column on the right. The 2.5% still lives in the text. */}
            <SectionHeading id="charity-title" title="הצדקה" term="(الزكاة)" />
            <div className="charity-hero">
              <div className="charity-illus" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/chapter6/charity-illustration.png" alt="" loading="lazy" decoding="async" />
              </div>
              <div className="charity-body" data-reveal>
                <div className="content-block">
                  <Env>{screen('ch-1').title}</Env>
                  <KP text={para('ch-1', 0)} of={['2.5%']} />
                </div>
                <div className="content-block">
                  <Env>{screen('ch-2').title}</Env>
                  <KP text={para('ch-2', 0)} of={['"בכפליים"']} />
                  <KP text={para('ch-2', 1)} of={['היא חובה']} />
                </div>
              </div>
            </div>
          </section>

          {/* ===================== area 5 — the Ramadan fast ===================== */}
          <section className="commandment-section ramadan-section article-section" id="ramadan" aria-labelledby="ramadan-title">
            {/* editorial heading above the scene; six grouped steps, ליל אלקדר on step 2, the two
                crescent-sighting schools as the split step at the end */}
            <SectionHeading id="ramadan-title" title="צום הרמדאן" term="(الصوم)" />

            {/* how the fast was born — a vertical accordion timeline; click an era to open it */}
            <div className="rm-ed-block" data-reveal>
              <h3 className="rm-ed-head">איך נולד הצום</h3>
              {/* narrative moments, not a dated axis — the year labels were removed because the
                  source presents ליל אלקדר (610) after the Medina period (622), which read as a
                  timeline running backwards */}
              <RamadanTimeline
                items={[
                  { label: 'טרום־אסלאם', title: 'מנהג מדברי קדום', paras: [kb(para('rm-1', 0), ['לצום במהלך השנה'])], icon: 'palm' },
                  { label: 'המעבר למדינה', title: 'הצום מתגבש', paras: [kb(para('rm-1', 1), ['בתקופת שהותו של מוחמד במדינה'])], icon: 'mosque' },
                  { label: "עאשוראא'", title: screen('rm-2').title, paras: [kb(para('rm-2', 0), ["עאשוראא'"]), kb(para('rm-2', 1)), kb(para('rm-2', 2))], icon: 'crescent' },
                  { label: 'ליל אלקדר', title: screen('rm-3').title, paras: [kb(para('rm-3', 0), ['חודש רמדאן שבו ירד הקוראן']), kb(para('rm-3', 1), ['ליל אלקדר'])], icon: 'book' },
                ]}
              />
            </div>

            {/* the fast day, as a row of arched scenes moving through the hours */}
            <div className="rm-ed-block" data-reveal>
              <h3 className="rm-ed-head">יום של צום</h3>
              <div className="rm-day">
                {[
                  { img: 'ramadan-fast-dawn.jpg', title: 'עלות השחר', sub: 'תחילת הצום' },
                  { img: 'ramadan-fast-sunset.jpg', title: 'שקיעה · אפטאר', sub: 'שבירת הצום' },
                  { img: 'ramadan-fast-night.jpg', title: 'תראויח', sub: 'תפילות הלילה' },
                ].map((c) => (
                  <div className="rm-day-card" key={c.title}>
                    <span className="rm-day-arch">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/assets/chapter6/${c.img}`} alt="" loading="lazy" decoding="async" />
                    </span>
                    <h4 className="rm-day-title">{c.title}</h4>
                    <p className="rm-day-sub">{c.sub}</p>
                  </div>
                ))}
              </div>
              <KP className="rm-dayline" text={para('rm-4', 0)} of={['מעלות השחר ועד לשקיעת החמה', 'אפטאר', 'תפילות תראויח']} />
            </div>

            {/* the close of the month — the last ten nights (Laylat al-Qadr), then Eid and the moon-sighting */}
            <div className="rm-ed-block" data-reveal>
              <h3 className="rm-ed-head">סוף החודש</h3>
              <div className="rm-two">
                <div className="rm-card">
                  <h4>{screen('rm-5').title}</h4>
                  <KP text={para('rm-5', 0)} of={['קדושים במיוחד']} />
                  <KP text={para('rm-5', 1)} of={['כל עוונות העבר נמחלות לו']} />
                </div>
                <div className="rm-card">
                  <h4>{screen('rm-6').title}</h4>
                  <KP text={para('rm-6', 0)} of={['חג שבירת הצום']} />
                  <KP text={para('rm-6', 1)} of={[]} />
                </div>
                <div className="rm-card">
                  <h4>{screen('rm-7').title}</h4>
                  <KP text={para('rm-7', 0)} of={['המולד האמיתי', 'המולד הממוצע']} />
                  <KP text={para('rm-7', 1)} of={[]} />
                </div>
              </div>
            </div>
          </section>

          {/* ===================== area 6 — the hajj ===================== */}
          <section className="commandment-section hajj-section article-section" id="hajj" aria-labelledby="hajj-title">
            {/* the framing (who, when, why) reads first, as a normal editorial block */}
            <SectionHeading id="hajj-title" title="החג'" term="(الحج)" />
            <div className="hajj-intro content-block-wide" data-reveal>
              <Env>{screen('hj-1').title}</Env>
              <KP text={para('hj-1', 0)} of={["בין היום ה־8 ל־13 לחודש ד'ו אלחג'ה"]} />
              <KP text={para('hj-1', 1)} of={[]} />
              <KP text={para('hj-1', 2)} of={[]} />
              <KP text={para('hj-1', 3)} of={['הגם והיא חובה דתית', 'תלויה ביכולתו של האדם', 'פעם אחת במהלך חייו']} />
            </div>
            {/* the journey itself: an interactive route map anchored on Mecca — six stations sit as
                numbered stops along a trail; clicking one opens its scene and verbatim text. */}
            <div className="hajj-map-block" data-reveal>
              <h3 className="rm-ed-head hjm-head">{screen('hj-v').title}</h3>
              <HajjRouteMap
                stops={[
                  { label: 'אחראם', place: 'המיקאת', img: 'ihram-real.jpg', title: screen('hj-2').title, paras: [kb(para('hj-2', 0), ['(אחראם)']), kb(para('hj-2', 1)), kb(para('hj-2', 2)), kb(para('hj-2', 3), ['מיקאת'])], x: 80, y: 19 },
                  { label: 'טוואף', place: 'מכה', img: 'tawaf-real.jpg', title: screen('hj-3').title, paras: [kb(para('hj-3', 0), ['(טוואף) שבע פעמים'])], x: 80, y: 74 },
                  { label: 'סעי', place: 'מכה · צפא ומרוה', img: 'hajj-sai.jpg', title: screen('hj-4').title, paras: [kb(para('hj-4', 0), ['צפא ומרוה (סעי)']), kb(para('hj-4', 1), ['מעיין הזמזם'])], x: 84, y: 80 },
                  { label: 'ערפה', place: 'מישור ערפה', img: 'arafat-real.jpg', title: screen('hj-5').title, paras: [kb(para('hj-5', 0), ['העמידה במישור ערפה']), kb(para('hj-5', 1)), kb(para('hj-5', 2), ['ה"עמידה" (וקוף)']), kb(para('hj-5', 3))], x: 22, y: 24 },
                  { label: 'מוזדליפה ומינא', place: 'מוזדליפה ומינא', img: 'hajj-muzdalifah.jpg', title: screen('hj-6').title, paras: [kb(para('hj-6', 0), ['מוזדליפה']), kb(para('hj-6', 1), ['"מינא"']), kb(para('hj-6', 2))], x: 44, y: 60 },
                  { label: 'הקפת הפרידה', place: 'מכה', img: 'kaaba-real.jpg', title: screen('hj-7').title, paras: [kb(para('hj-7', 0), ['חג הקורבן']), kb(para('hj-7', 1)), kb(para('hj-7', 2))], x: 70, y: 86 },
                ]}
              />
            </div>
            {/* The road's blessing closes the section: the lead-in, the Arabic,
                its Hebrew transliteration, then what it means. The indices are
                the last four entries of hj-7 and are counted from the end —
                writing them as literals broke the moment the source gained the
                transliteration line and silently printed it in place of the
                translation. */}
            <div className="blessing" data-reveal>
              <P text={para('hj-7', 3)} />
              <blockquote className="arabic-quote" lang="ar" dir="rtl">{para('hj-7', 4)}</blockquote>
              <p className="blessing-translit">{para('hj-7', 5)}</p>
              <P text={para('hj-7', 6)} className="blessing-he" />
            </div>
            {/* the close: the chapter hands off to its practice. Reaching this block records the
                reading; the chapter itself is completed there. There is deliberately no second
                way out here — the route back to the chapters list is on the practice page. */}
            <div className="chapter-end" id="chapter-end" data-reveal ref={endRef}>
              <Link className="chapter-end-back" href="/chapter6/practice">
                לתרגול המסכם
              </Link>
              {practiceDone && <span className="chapter-end-done">הושלם</span>}
            </div>
          </section>

        </main>
      </div>
      </div>
      </div>
    </div>
  )
}
