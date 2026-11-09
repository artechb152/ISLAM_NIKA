'use client'

/* Chapter 1 — ההיסטוריה של חצי האי ערב טרום תקופת האסלאם. The article (9.11.2026).

   The chapter was a 3D game; „לא עובד טוב" became „קטעי מאמר ובתוכו חלקי משחק". The
   pilot (3.11) built one section — the tribes and the trade routes, with the route map —
   and this is the whole chapter on the same skeleton: chapter 14's shell part for part
   (masthead, rail, search, notebook, progress, the closing block), chapter 6's sheet first.
   The game itself lives on, unlinked, at /chapter1-game.

   THE SHAPE — eight sections, the source's nine headings in their order; „אלילים נוספים"
   (§43–§44, two sentences) is a sub-heading inside „עבודת האלילים" (rule 28). How each
   section carries its picture, alternated so no two neighbours repeat one (chapter 9,
   „לא הכל אותו דבר"):
     01  the banner film, then words
     02  two equal cards, the empires — no picture (no painting of either exists)
     03  the route map, full screen (the pilot, unchanged)
     04  a painting beside the prose (Yathrib)
     05  the heading on a painting (the monastery)
     06  Abraha as a full-screen scene — one painting per step, crossfading with the scroll
     07  a painting beside the prose (the idols' chamber, the arrows on its floor)
     08  the heading on a painting (the morning after)
   The crate (drag-the-goods) was cut on 9.11 („לא אהבתי") and nothing game-like came back.

   AND NO CHECKS. Every question lives at /chapter1/practice.

   WHAT THIS FILE MAY NOT DO: write a sentence. Every string comes from passages.json
   through `text()`, by reference, and concept/chapter1/verify-article.mjs checks that each
   ref of layout.json is written here exactly once. Labels are cut from their own sentence
   (`cut`, rule 27) or are editorial headings (layout.json, rule 24). */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import { clamp01, Scrolly, seg, type ScrollyState } from '@/components/chapter6/scrolly'
import MarkToNotebook from '@/components/MarkToNotebook'
import SiteFooter from '@/components/SiteFooter'
import RouteMap from '@/components/chapter1/RouteMap'
import { CH1, LAYOUT, SECTIONS, cut, em, meta, sub, text, tr } from '@/lib/chapter1/article/content'
import {
  completedSections,
  markContentComplete,
  markSectionDone,
  practiceComplete,
  resumeSectionId,
  saveCurrentSection,
  SECTION_ORDER,
} from '@/lib/chapter1/article/progress'

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

/** One paragraph: its fragments in order, joined by a space as the source joins them. */
function T({ refs, className }: { refs: string[]; className?: string }) {
  return (
    <p className={className} data-reveal>
      {refs.flatMap((r, i) => [...(i ? [' '] : []), ...painted(r)])}
    </p>
  )
}

/** A paragraph riding in a stage card, or inside a card. No `data-reveal`: the Scrolly
    fades its own steps, and a card reveals as one. */
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
  return <h3 className="scrolly-env" data-reveal>{sub(sectionId, id)}</h3>
}

function Section({ id, className = '', children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <section className={`article-section ${className}`} id={id} aria-labelledby={`${id}-title`}>
      {children}
    </section>
  )
}

/* ---------------- how a painting sits (chapter 9's three placements) ---------------- */

/** The heading ON the painting: it fills the width and the section's title stands on its
    lower edge, cream over a dark foot (chapter 9's Cover). */
function Cover({ id, img }: { id: string; img: string }) {
  return (
    <div className="ch1-cover">
      <div className="ch1-cover-art" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${A}${img}.jpg`} alt="" loading="lazy" decoding="async" />
      </div>
      <Head id={id} />
    </div>
  )
}

/** The painting beside the prose — chapter 6's `.bleed-aside` as chapter 9 tuned it for
    rectangular paintings (12.10: on the RIGHT, the reading edge, text on its left; a clean
    14px edge, no fade). Below 900px it stands above its words, whole. */
function Aside({ img, children }: { img: string; children: ReactNode }) {
  return (
    <div className="bleed-aside ch1-aside is-flipped">
      <div className="bleed-aside-art" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${A}${img}.jpg`} alt="" loading="lazy" decoding="async" />
      </div>
      <div className="bleed-aside-body">{children}</div>
    </div>
  )
}

/* ---------------- 02 · the two empires ---------------- */

/** Two equal cards (chapter 5's Claims — equal space, because unequal space would itself be
    an argument). The board is `dir="ltr"`: the Byzantine empire, north-WEST, sits on the
    left and the Sasanian, north-EAST, on the right — as the route map of 03 places them
    (rule 61: geography is physical). Each card runs RTL inside; the title is cut from the
    card's own sentence. On a phone they stack in source order. */
function Empires({ nwBody, neBody }: { nwBody: ReactNode; neBody: ReactNode }) {
  const [nw, ne] = LAYOUT.pair.cards
  return (
    <div className="ch1-pair" dir="ltr" data-reveal>
      <article className="ch1-card" dir="rtl" aria-labelledby="ch1-card-nw">
        <h3 className="ch1-card-title" id="ch1-card-nw">{cut(nw.name)}</h3>
        {nwBody}
      </article>
      <article className="ch1-card" dir="rtl" aria-labelledby="ch1-card-ne">
        <h3 className="ch1-card-title" id="ch1-card-ne">{cut(ne.name)}</h3>
        {neBody}
      </article>
    </div>
  )
}

/* ---------------- 06 · Abraha — the full-screen scene ---------------- */

/** One painting per step (layout.json `scene.frames`), each laid over the one before it and
    fading in through the second half of the step that precedes it — so the picture changes
    while the reader is finishing the sentence that leads into it, and rewinds with the
    scroll. A frame that repeats holds. Decorative: every fact is in the cards. */
function AbrahaStage({ step, t }: ScrollyState) {
  const p = step + t
  const frames = LAYOUT.scene.frames
  const layers = frames
    .map((img, i) => ({ img, from: i }))
    .filter((l, i) => i === 0 || frames[i - 1] !== l.img)
  return (
    <div className="st st-photo ch1-scene-stage">
      {layers.map(({ img, from }, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={img}
          src={`${A}${img}.jpg`}
          alt=""
          loading={k === 0 ? 'eager' : 'lazy'}
          decoding="async"
          style={{ opacity: Number((from === 0 ? 1 : clamp01(seg(p, from - 0.5, from + 0.04))).toFixed(4)) }}
        />
      ))}
      <span className="st-veil" />
    </div>
  )
}

/* ---------------- the page ---------------- */
export default function Chapter1Article() {
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
  const onMenuJump = useCallback(() => { jumpUntil.current = Date.now() + 1800 }, [])
  /* ChapterSearch announces its jump with `chapter:jump` — skipped sections earn no tick */
  useEffect(() => {
    window.addEventListener('chapter:jump', onMenuJump)
    return () => window.removeEventListener('chapter:jump', onMenuJump)
  }, [onMenuJump])

  return (
    <div className="chapter-page">
      <MarkToNotebook ch={1} />
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
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 11.2 12 4.5l8 6.7M6.3 9.5v9.7h4.4v-5.4h2.6v5.4h4.4V9.5" /></svg>
              לכל פרקי הלמידה
            </Link>
          </div>
        </aside>
        {drawer && <div className="chapter-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}

        <div className="chapter-content">
          <div className="chapter-layout">
            <main className="chapter-article ch1" ref={articleRef}>

              {/* ============ 01 · the jahiliyya ============ */}
              <Section id="jahiliyya" className="opening-section">
                {/* the banner is a film (the user, 9.11.2026: „והבאנר שיהיה סרטון"), a seamless
                    loop „כמו שאר הפרקים": camels resting by a Yemeni village, campfire smoke,
                    static camera, no faces. hero-1.jpg is its poster and the reduced-motion
                    still (concept/chapter1/DECISIONS.md, 9.11.2026). */}
                <div className="ch6-hero">
                  <div className="ch6-hero-media ch1-hero-media" aria-hidden="true">
                    <video className="ch6-hero-video" autoPlay muted loop playsInline preload="auto" poster={`${A}hero-1.jpg`} tabIndex={-1} onError={(e) => { e.currentTarget.hidden = true }}>
                      <source src={`${A}hero.mp4`} type="video/mp4" />
                    </video>
                  </div>
                  <div className="ch6-hero-copy">
                    <h1 id="chapter-title" className="ch6-hero-title">{CH1.title}</h1>
                  </div>
                </div>
                <Head id="jahiliyya" />
                <T refs={['§0.a']} />
                <T refs={['§1.a']} />
              </Section>

              {/* ============ 02 · the two empires ============ */}
              <Section id="empires">
                <Head id="empires" />
                <T refs={['§2.a']} />
                <Empires
                  nwBody={<StageP refs={['§3.a']} />}
                  neBody={<><StageP refs={['§4.a', '§4.b']} /><StageP refs={['§5.a']} /></>}
                />
              </Section>

              {/* ============ 03 · the tribes and the trade routes ============ */}
              <Section id="tribes">
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
              </Section>

              {/* ============ 04 · Judaism in the peninsula ============ */}
              <Section id="judaism">
                <Head id="judaism" />
                {/* Yathrib's oasis beside the sentences that name it (§10) */}
                <Aside img="yathrib">
                  <T refs={['§10.a']} />
                  <T refs={['§11.a', '§12.a']} />
                  <T refs={['§13.a']} />
                </Aside>
                <T refs={['§14.a', '§15.a']} />
                <T refs={['§16.a', '§17.a']} />
              </Section>

              {/* ============ 05 · Christianity in the peninsula ============ */}
              <Section id="christianity">
                <Cover id="christianity" img="monastery" />
                <T refs={['§18.a', '§19.a']} />
                <T refs={['§20.a', '§21.a', '§22.a']} />
                {/* §23 — the chapter's one statement: the claim the whole chapter leans on */}
                <T refs={['§23.a']} className="ch1-statement" />
                <T refs={['§24.a', '§25.a']} />
              </Section>

              {/* ============ 06 · Abraha ============ */}
              <Section id="abraha">
                <Head id="abraha" />
                {/* a story told in order — so it scrolls (rule 54): the Christian kingdom in
                    Yemen, the march north, the elephant, the birds at the gates */}
                <div className="ch1-scene">
                  <Scrolly full art={(s) => <AbrahaStage {...s} />}>
                    <StageP refs={['§26.a']} />
                    <StageP refs={['§27.a']} />
                    <StageP refs={['§28.a']} />
                    <StageP refs={['§29.a']} />
                  </Scrolly>
                </div>
                <T refs={['§30.a']} />
                <T refs={['§31.a']} />
              </Section>

              {/* ============ 07 · idol worship ============ */}
              <Section id="idols">
                <Head id="idols" />
                <T refs={['§32.a', '§33.a']} />
                <T refs={['§34.a']} />
                {/* Hubal's chamber: the statue among the others, the arrows on the floor */}
                <Aside img="idols">
                  <T refs={['§35.a', '§36.a', '§37.a']} />
                  <T refs={['§38.a']} />
                </Aside>
                <T refs={['§39.a']} />
                <T refs={['§40.a', '§41.a']} />
                <T refs={['§42.a']} />
                <Env id="more" sectionId="idols" />
                <T refs={['§43.a']} />
                <T refs={['§44.a']} />
              </Section>

              {/* ============ 08 · on the eve of Islam ============ */}
              <Section id="eve">
                <Cover id="eve" img="ridge" />
                <T refs={['§45.a', '§46.a']} />
                <T refs={['§47.a']} />
                <T refs={['§48.a']} />
              </Section>

              {/* the close, identical in every chapter (rule 33) */}
              <div className="chapter-end" ref={endRef} id="chapter-end" data-reveal>
                <Link className="chapter-end-back" href="/chapter1/practice">לתרגול המסכם</Link>
                {practiceDone && <span className="chapter-end-done">הושלם</span>}
              </div>
            </main>
          </div>
          <SiteFooter />
        </div>
      </div>
    </div>
  )
}
