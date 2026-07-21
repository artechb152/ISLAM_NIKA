'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import { MoonSchools, ShahadaContexts } from '@/components/chapter6/Explore'
import PrayerTimes from '@/components/chapter6/PrayerTimes'
import { CharityStage, HajjStage, PrayerStage, RamadanStage } from '@/components/chapter6/stages'
import { P, Scrolly } from '@/components/chapter6/scrolly'
import StoryFilm from '@/components/chapter6/StoryFilm'
import { QIBLA_PLATE } from '@/lib/chapter6/art'
import { CH6 } from '@/lib/chapter6/data'
import {
  completedSections,
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
  { id: 'summary', label: 'מבט מסכם' },
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
  eyebrow: string
  title: string
  term?: string
  lead?: string
}) {
  return (
    <header className="section-heading" data-reveal>
      <span className="section-eyebrow">{eyebrow}</span>
      <div>
        <h2 id={id}>{title}</h2>
        {term && <span className="section-term">{term}</span>}
      </div>
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

/* the generated Magnific plates — always ALONGSIDE the didactic components, never instead */
function ScenePlate({
  src,
  alt,
  ratio,
  caption,
  className = '',
}: {
  src: string
  alt: string
  ratio: 'wide' | 'square'
  caption?: string
  className?: string
}) {
  return (
    <figure className={`scene-plate ratio-${ratio} ${className}`} data-reveal>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

/* the fixed strip between commandments: finished icon + completion mark, the verbatim
   transition line, and the name of what comes next — no lesson content, no action */
function CommandmentTransition({
  screenId,
  icon,
  done,
}: {
  screenId: string
  icon: string
  done: boolean
}) {
  const item = screen(screenId)
  return (
    <div className="commandment-transition" data-reveal>
      <span className={'ct-icon' + (done ? ' is-done' : '')}>
        <PillarIcon image={icon} alt="" />
        <svg className="ct-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5" /></svg>
      </span>
      <p>{item.text}</p>
      {item.nextLabel && <span className="ct-next">{item.nextLabel}</span>}
    </div>
  )
}

const MENU_POS_KEY = 'ch6:menu-pos'

const PILLAR_ICONS = ['icon-shahada.png', 'icon-prayer.png', 'icon-charity.png', 'icon-ramadan.png', 'icon-hajj.png']

/* the small end-of-chapter visuals, one memory per commandment (Magnific assets) */
const SUMMARY_MEDIA: Array<string | null> = [
  null,
  '/assets/chapter6/prayer-times-illustration.jpg',
  '/assets/chapter6/zakat-illustration.jpg',
  '/assets/chapter6/ramadan-day-illustration.jpg',
  '/assets/chapter6/hajj-journey-map.jpg',
]

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
  /* the five-prayers-and-times step: which prayer's time of day fills the whole screen */
  const [prayerPick, setPrayerPick] = useState(0)

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
            <span className="chapter-number">פרק 6</span>
            <h1 id="chapter-title">חמש מצוות היסוד</h1>
            <div className="title-ornament" aria-hidden="true"><span /></div>
            <p className="opening-subtitle">עבדאללה בן עמר (הח'ליף השני)</p>
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
                  <span className="story-label">הרקע לפרק</span>
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
                  </a>
                )
              })}
            </div>
          </section>

          {/* ===================== area 2 — the shahada ===================== */}
          <section className="commandment-section shahada-section article-section" id="shahada" aria-labelledby="shahada-title">
            <SectionHeading id="shahada-title" eyebrow="מצוות יסוד ראשונה" title="השהאדה — העדות" />
            {/* the anchor: the sentence stays; the surroundings change */}
            <div className="shahada-statement" aria-label="השאהדה בערבית, בתעתיק ובמשמעות" data-reveal>
              <span lang="ar">الشهادة</span>
              <b>שהאדה</b>
              <small>עדות</small>
            </div>
            {/* space 1 — the word's origin and the wording of the testimony */}
            <div className="explore-block" data-reveal>
              <Env>{screen('sh-1').title}</Env>
              <p>{para('sh-1', 0)}</p>
              <p className="scrolly-big">{para('sh-2', 0)}</p>
            </div>
            {/* space 2 — the shahada in its two contexts (explore interaction no. 1) */}
            <div className="explore-block" data-reveal>
              <Env>{screen('sh-3').title}</Env>
              <p>{para('sh-3', 0)}</p>
            </div>
            <ShahadaContexts />
            {/* space 3 — receiving Islam, and the historical meaning */}
            <div className="explore-block" data-reveal>
              <p>{para('sh-3', 1)}</p>
              <p>{para('sh-2', 1)}</p>
            </div>
            <CommandmentTransition screenId="sh-t" icon="icon-shahada.png" done={doneSections.has('shahada')} />
          </section>

          {/* ===================== area 3 — the prayer ===================== */}
          <section className="commandment-section prayer-section article-section" id="prayer" aria-labelledby="prayer-title">
            <Scrolly full art={(s) => <PrayerStage {...s} pick={prayerPick} />}>
              <div>
                <SectionHeading id="prayer-title" eyebrow="מצוות יסוד שנייה" title="התפילה" />
                <Env>{screen('pr-1').title}</Env>
                <P text={para('pr-1', 0)} />
              </div>
              <div>
                <P text={para('pr-1', 1)} marks={['שתי תפילות', 'התפילה התיכונה']} />
              </div>
              {/* the five prayers and their times: the intro line, then a button per prayer —
                  clicking one opens a full-screen explanation for that prayer (no scrolling) */}
              <div>
                <Env>{screen('pr-2').title}</Env>
                <P text={para('pr-2', 0)} />
                <PrayerTimes active={prayerPick} onPick={setPrayerPick} />
              </div>
              <div>
                <Env>{screen('pr-3').title}</Env>
                <P text={para('pr-3', 0)} />
              </div>
              <div><P text={para('pr-3', 1)} /></div>
              <div>
                <Env>{screen('pr-4').title}</Env>
                <P text={para('pr-4', 0)} />
              </div>
              <div><P text={para('pr-4', 1)} /></div>
              <div><P text={para('pr-4', 2)} /></div>
              <div>
                <Env>{screen('pr-5').title}</Env>
                <P text={para('pr-5', 0)} />
              </div>
              <div>
                <P text={para('pr-5', 1)} marks={['להפנות את פניו למכה']} />
              </div>
              <div><P text={para('pr-5', 2)} /></div>
              <div><P text={para('pr-5', 3)} /></div>
              <div><P text={para('pr-5', 4)} /></div>
            </Scrolly>
            {/* the calibrated qibla map (true bearings), with the generated plate beneath */}
            <figure className="map-figure qibla-map" data-reveal>
              <div className="map-plate" dir="ltr" dangerouslySetInnerHTML={{ __html: QIBLA_PLATE }} />
              <span className="map-pin jerusalem">ירושלים</span>
              <span className="map-pin medina">מדינה</span>
              <span className="map-pin makkah">מכה</span>
              <figcaption>כיוון התפילה הראשון והפניית הקבלה למכה</figcaption>
            </figure>
            <ScenePlate
              src="/assets/chapter6/qibla-direction-map.jpg"
              alt="מפה הממחישה את שינוי כיוון התפילה מירושלים למכה"
              ratio="wide"
              caption="שני כיווני התפילה — הראשון כזיכרון, השני כדרך"
            />
            <CommandmentTransition screenId="pr-t" icon="icon-prayer.png" done={doneSections.has('prayer')} />
          </section>

          {/* ===================== area 4 — the charity ===================== */}
          <section className="commandment-section charity-section article-section" id="charity" aria-labelledby="charity-title">
            <Scrolly full art={(s) => <CharityStage {...s} />}>
              <div>
                <SectionHeading id="charity-title" eyebrow="מצוות יסוד שלישית" title="הצדקה" />
                <Env>{screen('ch-1').title}</Env>
                <P text={para('ch-1', 0)} marks={['2.5%', '1/40']} />
              </div>
              {/* the "reward & obligation" screen: text on the right, the zakat ring on the LEFT */}
              <div data-split className="step-split">
                <figure className="step-aside">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/chapter6/zakat-illustration.jpg" alt="המחשה של מתן צדקה וסיוע לקהילה" loading="lazy" decoding="async" />
                  <figcaption>אחד מתוך ארבעים יוצא אל הקהילה</figcaption>
                </figure>
                <div className="stage-card">
                  <Env>{screen('ch-2').title}</Env>
                  <P text={para('ch-2', 0)} marks={['בכפליים']} />
                  <P text={para('ch-2', 1)} />
                </div>
              </div>
            </Scrolly>
            <CommandmentTransition screenId="ch-t" icon="icon-charity.png" done={doneSections.has('charity')} />
          </section>

          {/* ===================== area 5 — the Ramadan fast ===================== */}
          <section className="commandment-section ramadan-section article-section" id="ramadan" aria-labelledby="ramadan-title">
            <Scrolly full art={(s) => <RamadanStage {...s} />}>
              <div>
                <SectionHeading id="ramadan-title" eyebrow="מצוות יסוד רביעית" title="הצום בחודש רמדאן" />
                <Env>{screen('rm-1').title}</Env>
                <P text={para('rm-1', 0)} />
              </div>
              <div><P text={para('rm-1', 1)} /></div>
              <div>
                <Env>{screen('rm-2').title}</Env>
                <P text={para('rm-2', 0)} />
              </div>
              <div><P text={para('rm-2', 1)} /></div>
              <div><P text={para('rm-2', 2)} /></div>
              <div>
                <Env>{screen('rm-3').title}</Env>
                <P text={para('rm-3', 0)} />
              </div>
              <div>
                <P text={para('rm-3', 1)} marks={['בלילה ה־27 לחודש', 'ליל אלקדר']} />
              </div>
              <div>
                <Env>{screen('rm-4').title}</Env>
                <P text={para('rm-4', 0)} />
              </div>
              <div>
                <Env>{screen('rm-5').title}</Env>
                <P text={para('rm-5', 0)} />
              </div>
              <div><P text={para('rm-5', 1)} /></div>
              <div>
                <Env>{screen('rm-6').title}</Env>
                <P text={para('rm-6', 0)} />
              </div>
              <div><P text={para('rm-6', 1)} /></div>
              {/* the crescent-sighting screen: text on the right, the two schools (explore
                  no. 2) on the LEFT */}
              <div data-split className="step-split">
                <div className="step-aside step-aside-wide">
                  <MoonSchools />
                </div>
                <div className="stage-card">
                  <Env>{screen('rm-7').title}</Env>
                  <P text={para('rm-7', 0)} />
                </div>
              </div>
            </Scrolly>
            <p className="hijri-link" data-reveal>
              להרחבה ראו להלן: <Link href="/chapters">לוח השנה ההג'רי</Link>.
            </p>
            <CommandmentTransition screenId="rm-t" icon="icon-ramadan.png" done={doneSections.has('ramadan')} />
          </section>

          {/* ===================== area 6 — the hajj ===================== */}
          <section className="commandment-section hajj-section article-section" id="hajj" aria-labelledby="hajj-title">
            <Scrolly full art={(s) => <HajjStage {...s} />}>
              <div>
                <SectionHeading id="hajj-title" eyebrow="מצוות יסוד חמישית" title="החג' — העלייה לרגל למכה" />
                <Env>{screen('hj-1').title}</Env>
                <P text={para('hj-1', 0)} marks={["ביום ה־8 לחודש ד'ו אלחג'ה", 'החודש ה־12']} />
              </div>
              <div><P text={para('hj-1', 1)} /></div>
              <div><P text={para('hj-1', 2)} /></div>
              <div>
                <P text={para('hj-1', 3)} marks={['בהיבט הכלכלי', 'בהיבט הבריאותי', 'פעם אחת במהלך חייו']} />
              </div>
              <div>
                <Env>{screen('hj-2').title}</Env>
                <P text={para('hj-2', 0)} />
              </div>
              <div><P text={para('hj-2', 1)} /></div>
              <div><P text={para('hj-2', 2)} /></div>
              <div><P text={para('hj-2', 3)} /></div>
              <div>
                <Env>{screen('hj-3').title}</Env>
                <P text={para('hj-3', 0)} />
              </div>
              <div>
                <Env>{screen('hj-4').title}</Env>
                <P text={para('hj-4', 0)} />
              </div>
              <div><P text={para('hj-4', 1)} /></div>
              <div>
                <Env>{screen('hj-5').title}</Env>
                <P text={para('hj-5', 0)} />
              </div>
              <div><P text={para('hj-5', 1)} /></div>
              <div><P text={para('hj-5', 2)} /></div>
              <div><P text={para('hj-5', 3)} /></div>
              <div>
                <Env>{screen('hj-6').title}</Env>
                <P text={para('hj-6', 0)} />
              </div>
              <div><P text={para('hj-6', 1)} /></div>
              <div><P text={para('hj-6', 2)} /></div>
              <div>
                <Env>{screen('hj-7').title}</Env>
                <P text={para('hj-7', 0)} />
              </div>
              <div><P text={para('hj-7', 1)} /></div>
              <div><P text={para('hj-7', 2)} /></div>
              <div className="blessing">
                <P text={para('hj-7', 3)} />
                <blockquote className="arabic-quote" lang="ar" dir="rtl">{para('hj-7', 4)}</blockquote>
                <P text={para('hj-7', 5)} className="blessing-he" />
              </div>
            </Scrolly>
            <ScenePlate
              src="/assets/chapter6/hajj-journey-map.jpg"
              alt="מפת מסע החג' ותחנות העלייה לרגל"
              ratio="wide"
              caption="מסע אחד, שבע תחנות"
            />
            <CommandmentTransition screenId="hj-t" icon="icon-hajj.png" done={doneSections.has('hajj')} />
          </section>

          {/* ===================== the chapter's close ===================== */}
          <section className="summary-section article-section" id="summary" aria-labelledby="summary-title">
            <SectionHeading
              id="summary-title"
              eyebrow="מבט מסכם"
              title="חמש פעולות, מערכת אחת"
              lead={screen('sum-c').check?.ok}
            />
            <div className="summary-cards" data-reveal>
              {actions.map((action, index) => (
                <a href={`#${SECTION_LINKS[index + 2].id}`} key={action.commandment} onClick={onMenuJump}>
                  <span className="summary-visual">
                    {SUMMARY_MEDIA[index] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={SUMMARY_MEDIA[index]!} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <i>{action.quote}</i>
                    )}
                  </span>
                  <span className="summary-name">
                    <PillarIcon image={PILLAR_ICONS[index]} alt="" />
                    <b>{action.commandment}</b>
                    <small>{action.action}</small>
                  </span>
                </a>
              ))}
            </div>
          </section>
        </main>
      </div>
      </div>
      </div>
    </div>
  )
}
