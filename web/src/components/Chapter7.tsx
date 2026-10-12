'use client'

/* Chapter 7 — לוח השנה ההג׳רי.

   AN ARTICLE, LIKE EVERY OTHER CHAPTER. Two journey builds came first (11.10.2026):
   a screen-by-screen walk through twelve months, as cards and then as a painted
   scene. Both were rejected — „מרגיש כמו לומדה ולא חלק מאתר" — so the chapter is
   built on the site's own skeleton: banner, rail, five sections, prose with its
   emphasis, and the closing block that hands off to the practice. The shell is
   chapter 5's, part for part; every colour, font and radius is chapter 6's.

   BUT NOT THE SAME MECHANISM AGAIN. The user asked for variety: no sticky scroll
   stage, which chapters 5 and 6 both lean on. Four devices, each of a kind the
   site has not used, and each standing on the source:

     · THE YEAR IN DAYS — 365 dots that fill once when they reach the middle of the
       screen: 354 in moon-gold, the last 11 left as an outline (§0).
     · FEBRUARY — one month as a strip of days; choose a year and the start of
       Ramadan moves to the day the source gives for it, and only to those (§4).
     · THE 30TH NIGHT — the night sky over the watcher; look for the crescent, and
       the two outcomes the source names are labelled (§5.c).
     · THE WHEEL OF THE YEAR — the twelve months on the parchment wheel; choosing one
       lights it in the list of names and their meanings beside it (§8).

   WHAT THIS FILE MAY NOT DO: write a sentence. Every string comes from
   passages.json through `text()`, by reference. concept/chapter7/verify-chapter7.mjs
   fails if a fragment drifts from SOURCE-TEXT.md, is printed twice, or is printed
   here without layout.json knowing. Titles, sub-headings and device labels are
   editorial and live in layout.json. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import MarkToNotebook from '@/components/MarkToNotebook'
import { CH7, LAYOUT, SECTIONS, em, frag, meta, sub, text, tr } from '@/lib/chapter7/content'
import {
  completedSections,
  markContentComplete,
  markSectionDone,
  practiceComplete,
  resumeSectionId,
  saveCurrentSection,
  SECTION_ORDER,
} from '@/lib/chapter7/progress'

const A = '/assets/chapter7/'

/* ---------------- text primitives (chapter 5's, unchanged) ---------------- */
type Paint = (phrase: string, key: string) => ReactNode
function mark(t: string, groups: { phrases: string[]; paint: Paint }[], key: string): ReactNode[] {
  const all = groups.flatMap((g) => g.phrases.map((phrase) => ({ phrase, paint: g.paint })))
  if (!all.length) return [t]
  if (process.env.NODE_ENV !== 'production') {
    for (const { phrase } of all) if (!t.includes(phrase)) console.error(`chapter 7: „${phrase}" is not in ${key}`)
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
const marks = (r: string) => [
  { phrases: em(r), paint: bold('key') },
  { phrases: tr(r), paint: bold('ch7-tr') },
]
const painted = (r: string) => mark(text(r), marks(r), r)

/** One paragraph carrying one or more fragments, joined by a space. */
function T({ refs, className }: { refs: string[]; className?: string }) {
  return (
    <p className={className} data-reveal>
      {refs.flatMap((r, i) => [...(i ? [' '] : []), ...painted(r)])}
    </p>
  )
}

function Head({ id }: { id: string }) {
  const s = meta(id)
  return (
    <header className="section-heading" data-reveal>
      <div>
        <h2 id={`${id}-title`}>{s.title}</h2>
        {s.term && <span className="section-term" lang="ar" dir="rtl">{s.term}</span>}
      </div>
      <div className="title-ornament section-ornament" aria-hidden="true"><span /></div>
    </header>
  )
}
function Env({ id, sectionId }: { id: string; sectionId: string }) {
  return <h3 className="scrolly-env" id={id}>{sub(sectionId, id)}</h3>
}
function Section({ id, className = '', children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <section className={`article-section ${className}`} id={id} aria-labelledby={`${id}-title`}>
      {children}
    </section>
  )
}

/** A painting beside the prose — chapter 6's `.bleed-aside`, as chapter 3 uses it.
    The sub-heading goes INSIDE, at the top of the text column, so the painting stands
    beside the whole movement and the words start under their heading at the chapter's
    own 14px. With the heading outside and the words centred in a taller painting's row,
    the gaps measured 39–102 under the heading and 141–160 after the run (11.10). */
function Aside({ art, flip = false, children }: { art: string; flip?: boolean; children: ReactNode }) {
  return (
    <div className={'bleed-aside ch7-aside' + (flip ? ' is-flipped' : '')}>
      <div className="bleed-aside-art" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${A}${art}.webp`} alt="" loading="lazy" decoding="async" />
      </div>
      <div className="bleed-aside-body">{children}</div>
    </div>
  )
}

/* ---------------- a device that starts when it reaches the middle of the screen ---------------- */
function useArrived<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) { setOn(true); return }
    const io = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.isIntersecting) { setOn(true); io.disconnect() } },
      { rootMargin: '-30% 0px -30% 0px', threshold: 0 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])
  return [ref, on]
}

/* ---------------- 01 · the year in days ----------------
   365 dots, one per day of a solar year. When the figure reaches the middle of the
   screen 354 of them fill in moon-gold, one after another, and the last eleven stay
   an outline; the eleven's number arrives last. Only the source's own three numbers
   and its own three words label it. The state class sits on an inner element, never
   on the `[data-reveal]` one (the reveal trap that bit chapters 3 and 4). */
function YearInDays() {
  const G = LAYOUT.gap
  const [ref, on] = useArrived<HTMLDivElement>()
  return (
    <figure className="ch7-days" data-reveal>
      <div ref={ref} className={'ch7-days-in' + (on ? ' is-on' : '')}>
        <div className="ch7-days-nums">
          <span><b>{G.lunar}</b>{G.lunarLabel}</span>
          <span><b>{G.solar}</b>{G.solarLabel}</span>
          <span className="is-gap"><b>{G.gap}</b>{G.gapLabel}</span>
        </div>
        <div className="ch7-days-grid" aria-hidden="true">
          {Array.from({ length: G.solar }, (_, i) => (
            <i key={i} className={i >= G.lunar ? 'is-gap' : undefined} style={{ ['--i' as string]: i }} />
          ))}
        </div>
      </div>
    </figure>
  )
}

/* ---------------- 04 · February ----------------
   One month as a strip of days, read right to left like a Hebrew calendar. A year
   is chosen, and the start of Ramadan moves to the day the source gives for that
   year. Only the source's three years exist here — no year between them is drawn,
   because the source computes none (rule 25). When 2027 is chosen the 2026 day stays
   as a ghost, so the eleven days are a distance on the strip and not a sum. */
function February() {
  const D = LAYOUT.drift
  const [at, setAt] = useState(0)
  const cur = D.stops[at]
  const prev = at === 1 ? D.stops[0] : null
  return (
    <figure className="ch7-feb" data-reveal>
      <div className="ch7-feb-in">
        <div className="ch7-feb-years" role="group" aria-label="שנה">
          {D.stops.map((s, i) => (
            <button key={s.year} type="button" aria-pressed={i === at}
              className={'ch7-feb-year' + (i === at ? ' is-on' : '')} onClick={() => setAt(i)}>
              {s.year}
            </button>
          ))}
        </div>
        <div className="ch7-feb-strip" style={{ ['--days' as string]: D.days }}>
          <span className="ch7-feb-month">{D.month}</span>
          <ol className="ch7-feb-cells" aria-hidden="true">
            {Array.from({ length: D.days }, (_, i) => (
              <li key={i} className={(i + 1 === cur.day ? 'is-start' : '') + (prev && i + 1 === prev.day ? ' is-ghost' : '')}>
                <span>{i + 1}</span>
              </li>
            ))}
          </ol>
          <span className="ch7-feb-pin" style={{ ['--d' as string]: cur.day }} aria-hidden="true" />
          {prev && (
            <span className="ch7-feb-span" style={{ ['--from' as string]: prev.day, ['--to' as string]: cur.day }} aria-hidden="true" />
          )}
        </div>
        <p className="ch7-feb-cap" aria-live="polite">
          <b>{cur.year}</b> · {cur.date}
          {cur.note && <> {cur.note}</>}
          {cur.caption && <span className="ch7-feb-say">{cur.caption}</span>}
        </p>
      </div>
    </figure>
  )
}

/* ---------------- 04 · the 30th night ----------------
   The night painting, the watcher on his hill, a veil of cloud. Look — tap the sky,
   or drag across it with the mouse — and the crescent comes out. Two states, each with its own
   label, both cut from §5.c: before, the moon „not seen well enough"; after, „to
   pass to the next month". */
function ThirtiethNight() {
  const S = LAYOUT.sighting
  const [seen, setSeen] = useState(false)
  return (
    <figure className="ch7-night" data-reveal>
      <div className={'ch7-night-in' + (seen ? ' is-seen' : '')}>
        {/* a plain button: one act, not a toggle. A drag with the mouse held reveals
            it too; a finger merely scrolling past on a phone does not. */}
        <button type="button" className="ch7-night-sky" onClick={() => setSeen(true)}
          onPointerMove={(e) => { if (e.buttons && e.pointerType === 'mouse') setSeen(true) }}
          aria-label={S.hint}>
          <span className="ch7-night-cloud" aria-hidden="true" />
          <span className="ch7-night-moon" aria-hidden="true" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ch7-night-watcher" src={`${A}cut-watcher.webp`} alt="" loading="lazy" decoding="async" />
        {!seen && <span className="ch7-night-hint" aria-hidden="true">{S.hint}</span>}
        <span className="ch7-night-state" aria-live="polite">{seen ? S.seen : S.notSeen}</span>
      </div>
    </figure>
  )
}

/* ---------------- 05 · the wheel of the year ----------------
   The parchment wheel with its twelve medallions (the medallions are built here, at
   exact angles — the painted ones came out eleven and uneven, see ASSET-MANIFEST),
   and beside it §8's list in full: every name and every meaning stays printed, so
   search and the notebook reach all of it. Choosing a month on either lights it on
   both. The four sacred months of §1.b carry the double ring. */
const MONTHS = (meta('hijri').devices?.wheel ?? []).map((r) => ({ ref: r, ...frag(r) }))
const HOLY = new Set(LAYOUT.holy)
function WheelOfTheYear() {
  const [at, setAt] = useState(0)
  const pick = MONTHS[at]
  return (
    <div className="ch7-wheel" data-reveal>
      <div className="ch7-wheel-in">
        <div className="ch7-wheel-plate" dir="ltr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${A}year-wheel.webp`} alt="" loading="lazy" decoding="async" />
          {MONTHS.map((m, i) => {
            const a = -Math.PI / 2 + (i * Math.PI) / 6
            return (
              <button key={m.ref} type="button" dir="rtl"
                className={'ch7-md' + (HOLY.has(m.ref) ? ' is-holy' : '') + (i === at ? ' is-on' : '') + ((m.name ?? '').length > 9 ? ' is-long' : '')}
                style={{ left: `${(50 + 35.6 * Math.cos(a)).toFixed(4)}%`, top: `${(50 + 35.6 * Math.sin(a)).toFixed(4)}%` }}
                aria-pressed={i === at} aria-label={m.name}
                onClick={() => setAt(i)}>
                <span className="ch7-md-name" aria-hidden="true">{m.name}</span>
                <span className="ch7-md-n" aria-hidden="true">{m.num}</span>
              </button>
            )
          })}
          <div className="ch7-wheel-hub" dir="rtl" aria-hidden="true">
            <span className="ch7-wheel-num">{pick.num}</span>
            <b>{pick.name}</b>
            <span>{pick.text}</span>
          </div>
        </div>
        <div className="ch7-months">
          <ol>
            {MONTHS.map((m, i) => (
              <li key={m.ref} className={(HOLY.has(m.ref) ? 'is-holy' : '') + (i === at ? ' is-on' : '')}>
                <button type="button" onClick={() => setAt(i)} aria-pressed={i === at}>
                  <span className="ch7-months-n">{m.num}.</span>
                  <b>{m.name}</b>
                  <span className="ch7-months-m">({m.text})</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="ch7-legend"><i aria-hidden="true" />{LAYOUT.legend.holy}</p>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 03 · the two verses ---------------- */
function Verses() {
  return (
    <figure className="ch7-verses" data-reveal>
      <div className="ch7-verses-in">
        <blockquote className="ch7-verse">
          <p className="ch7-verse-he">{text('§3.v1')}</p>
          <p className="ch7-verse-ar" lang="ar" dir="rtl">{text('§3.v1ar')}</p>
        </blockquote>
        <p className="ch7-verses-join">{text('§3.b')}</p>
        <blockquote className="ch7-verse">
          <p className="ch7-verse-he">{text('§3.v2')}</p>
          <p className="ch7-verse-ar" lang="ar" dir="rtl">{text('§3.v2ar')}</p>
        </blockquote>
      </div>
    </figure>
  )
}

/* ---------------- 04 · the two schools ---------------- */
function Schools({ refs }: { refs: [string, string] }) {
  return (
    <div className="ch7-pair" data-reveal>
      {refs.map((r) => (
        <article className="ch7-card" key={r}>
          <h4>{frag(r).label}</h4>
          <p>{painted(r)}</p>
        </article>
      ))}
    </div>
  )
}

/* ============================== the chapter ============================== */
export default function Chapter7() {
  const router = useRouter()
  const articleRef = useRef<HTMLElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const jumpUntil = useRef(0)
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [currentSection, setCurrentSection] = useState<string>(SECTION_ORDER[0])
  const [doneSections, setDoneSections] = useState<Set<string>>(new Set())
  const [practiceDone, setPracticeDone] = useState(false)

  useEffect(() => { setDoneSections(new Set(completedSections())); setPracticeDone(practiceComplete()) }, [])

  /* resume where the reader stopped — never on a first visit, and the hash wins */
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
    try { setCollapsed(localStorage.getItem('ch7:side-collapsed') === '1') } catch {}
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('ch7:side-collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }, [])
  const onMenuJump = useCallback(() => { jumpUntil.current = Date.now() + 1800 }, [])
  useEffect(() => {
    window.addEventListener('chapter:jump', onMenuJump)
    return () => window.removeEventListener('chapter:jump', onMenuJump)
  }, [onMenuJump])

  return (
    <div className="chapter-page">
      <MarkToNotebook ch={7} />
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
            <span className="menu-sub">{CH7.menuTitle}</span>
          </div>
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
                    <span className="menu-label">{s.title}</span>
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
            <main className="chapter-article ch7" ref={articleRef}>

              {/* ============ 01 · the lunar year and the solar year ============ */}
              <Section id="year" className="opening-section">
                {/* the banner: the dusk painting of the chapter's one desert, held still
                    with only its clouds and its campfire moving. The poster is the same
                    painting and stands under reduced motion. */}
                <div className="ch6-hero">
                  <div className="ch6-hero-media ch7-hero-media" aria-hidden="true">
                    <video
                      className="ch6-hero-video"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      poster={`${A}hero-poster.jpg`}
                      tabIndex={-1}
                      onError={(event) => { event.currentTarget.hidden = true }}
                    >
                      <source src={`${A}hero.mp4`} type="video/mp4" />
                    </video>
                  </div>
                  <div className="ch6-hero-copy">
                    <h1 id="chapter-title" className="ch6-hero-title">{CH7.title}</h1>
                  </div>
                </div>
                <Head id="year" />
                <T refs={['§0.a', '§0.b']} className="ch7-lead" />
                <Env id="gap" sectionId="year" />
                <YearInDays />
                <T refs={['§0.c', '§0.d']} />
                <T refs={['§0.e']} />
              </Section>

              {/* ============ 02 · the sacred months and the nasi' ============ */}
              <Section id="sacred">
                <Head id="sacred" />
                <Aside art="cut-rajab">
                  <Env id="truce" sectionId="sacred" />
                  <T refs={['§1.a', '§1.b']} />
                  <T refs={['§1.c']} />
                </Aside>
                {/* FLIPPED (the user, 11.10: „תמונה ימין טקסט שמאל"), so the two paintings
                    of this section alternate sides. Safe now because the sub-heading sits
                    INSIDE the text column: heading and words move together and the run still
                    starts directly under its heading. The earlier refusal was measured when
                    the heading stood outside, on the reading edge, 456px from its words. The
                    device's one-line lift is cancelled in chapter7-article.css. */}
                <Aside art="cut-herald" flip>
                  <Env id="nasi" sectionId="sacred" />
                  <T refs={['§2.a']} />
                  <T refs={['§2.b']} />
                  <T refs={['§2.c']} />
                </Aside>
              </Section>

              {/* ============ 03 · the farewell sermon ============ */}
              <Section id="farewell">
                <Head id="farewell" />
                {/* the lead runs the full column like every section's first paragraph; only the
                    verses share a row with the pilgrims */}
                <T refs={['§3.a']} className="ch7-lead" />
                <div className="ch7-farewell">
                  <div className="ch7-farewell-copy">
                    <Verses />
                  </div>
                  <figure className="ch7-farewell-art" aria-hidden="true" data-reveal>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`${A}cut-hajj.webp`} alt="" loading="lazy" decoding="async" />
                  </figure>
                </div>
              </Section>

              {/* ============ 04 · Ramadan, drifting ============ */}
              <Section id="ramadan">
                <Head id="ramadan" />
                {/* the iftar still life (ChatGPT, 12.10 — replaces the Higgsfield one rejected for
                    the shrouded figure behind the cloth). On the right, so the chapter's paintings
                    alternate: pilgrims left (03), this right, the caravan left (05). */}
                <Aside art="cut-ramadan" flip>
                  <Env id="drift" sectionId="ramadan" />
                  <T refs={['§4.a']} />
                  <T refs={['§4.b']} />
                </Aside>
                <February />
                <T refs={['§4.c']} />
                <Env id="sighting" sectionId="ramadan" />
                <T refs={['§5.a']} className="ch7-ask" />
                <T refs={['§5.b']} />
                <ThirtiethNight />
                <T refs={['§5.c']} />
                <Env id="schools" sectionId="ramadan" />
                <T refs={['§6.a']} />
                <Schools refs={['§6.b', '§6.c']} />
              </Section>

              {/* ============ 05 · the hijri year ============ */}
              <Section id="hijri">
                <Head id="hijri" />
                <Aside art="cut-hijra">
                  <Env id="year1" sectionId="hijri" />
                  <T refs={['§7.a']} />
                  <T refs={['§7.b']} />
                </Aside>
                <Env id="names" sectionId="hijri" />
                <T refs={['§8.intro']} />
                <WheelOfTheYear />
                <T refs={['§9.a']} className="ch7-coda" />
              </Section>

              <div className="chapter-end" ref={endRef} id="chapter-end" data-reveal>
                <Link className="chapter-end-back" href="/chapter7/practice">לתרגול המסכם</Link>
                {practiceDone && <span className="chapter-end-done">הושלם</span>}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
