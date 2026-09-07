'use client'

/* Chapter 5 — שאלת הירושה והח׳ליפים ישרי הדרך.

   Same product as chapters 2 and 6: the masthead, the collapsible rail, the type
   scale, the reveal behaviour and every colour come from chapter6-article.css,
   which the route layout loads first. chapter5-article.css adds only the four
   devices this content asks for and declares no colour, font or radius of its own.

   THE SHAPE — six sections, one per person, plus the question that opens and the
   claim that closes. Measured against chapter 6 (7 top-level sections, 15
   sub-headings) and against chapter 2's gate, which fails a chapter that runs
   twelve thin sections: six sections with eight sub-headings inside them, and
   adjacent source sentences set as ONE paragraph rather than one apiece.

   THE SOURCE IS SHORT. 3,485 characters — a quarter of chapter 4's — so the
   danger here is the opposite of chapter 2's: not too many thin sections but too
   many devices for too little text. Hence ONE scroll journey (Umar's conquests,
   the only genuinely sequential thing in the chapter) and ONE clicked plate
   (Uthman's Quran). The other four sections are read, not operated.

   AND NO CHECKS. Chapter 6 does not test inside the chapter; its questions live
   in a separate practice screen. This chapter follows that: everything that asks
   the reader something is at /chapter5/practice.

   WHAT THIS FILE MAY NOT DO: write a sentence. Every string comes from
   passages.json through `text()` / `list()`, addressed by the §N.fragment it
   belongs to. concept/chapter5/verify-chapter5.mjs fails if a fragment is
   printed twice or dropped. Section titles, sub-headings and the years in the
   headings are editorial and live in layout.json — as chapter 2's do. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import ConquestMap from '@/components/chapter5/ConquestMap'
import Lineage from '@/components/chapter5/Lineage'
import { P, Scrolly } from '@/components/chapter6/scrolly'
import MarkToNotebook from '@/components/MarkToNotebook'
import { CH5, em, frag, text, tr } from '@/lib/chapter5/content'
import layoutData from '@/lib/chapter5/layout.json'
import {
  completedSections,
  markContentComplete,
  markSectionDone,
  resumeSectionId,
  saveCurrentSection,
  SECTION_ORDER,
} from '@/lib/chapter5/progress'

interface Sub { id: string; title: string }
interface LayoutSection {
  id: string
  title: string
  /** the years — they sit where chapter 6 puts the Arabic term */
  term: string
  /** one of the four caliphates, and therefore a bar on the closing axis */
  reign?: boolean
  subs?: Sub[]
}
const LAYOUT = layoutData as unknown as { sections: LayoutSection[] }
const SECTIONS = LAYOUT.sections

const meta = (id: string): LayoutSection => {
  const s = SECTIONS.find((x) => x.id === id)
  if (!s) throw new Error(`chapter 5: unknown section ${id}`)
  return s
}
const sub = (sectionId: string, subId: string): string => {
  const s = meta(sectionId).subs?.find((x) => x.id === subId)
  if (!s) throw new Error(`chapter 5: unknown sub ${sectionId}/${subId}`)
  return s.title
}

/* ---------------- text primitives ---------------- */

/** Paint the fragment's own marked phrases inside its own sentence, leaving every other
    character alone. Two kinds, and they are two on purpose:

      `.key`  maroon — the term, number or claim the paragraph turns on. Chapter 6 marks
              one in almost every paragraph, and it is what lets a reader scan a page and
              come away with the facts.
      `.ch5-tr` gold — a TRANSLITERATION: שׁוּרָא, גִ'זְיַה, הח'וארג'. A word the chapter is
              teaching rather than a fact it is stressing, and it should not be mistaken
              for one, so it gets the manuscript accent instead of the emphasis colour.

    Nothing is reworded — every phrase is a substring of the sentence, and the gate fails
    if one drifts out of it or is claimed by both lists at once. */
function mark(t: string, groups: { phrases: string[]; cls: string }[], key: string): React.ReactNode[] {
  const all = groups.flatMap((g) => g.phrases.map((phrase) => ({ phrase, cls: g.cls })))
  if (!all.length) return [t]
  /* longest first, so a phrase that contains another is not cut in half by it */
  all.sort((a, b) => b.phrase.length - a.phrase.length)
  let parts: React.ReactNode[] = [t]
  for (const [pi, { phrase, cls }] of all.entries()) {
    const next: React.ReactNode[] = []
    for (const part of parts) {
      if (typeof part !== 'string') { next.push(part); continue }
      const bits = part.split(phrase)
      bits.forEach((bit, i) => {
        if (i) next.push(<b className={cls} key={`${key}-${pi}-${i}`}>{phrase}</b>)
        if (bit) next.push(bit)
      })
    }
    parts = next
  }
  return parts
}

/** every marked phrase a fragment carries, in the two colours it carries them in */
const marks = (r: string) => [
  { phrases: em(r), cls: 'key' },
  { phrases: tr(r), cls: 'ch5-tr' },
]

/** One paragraph carrying one or more fragments, joined by a space — the shape that
    keeps words-per-paragraph at chapter 6's measure instead of one thin line each. */
function T({ refs, className }: { refs: string[]; className?: string }) {
  return (
    <p className={className} data-reveal>
      {refs.flatMap((r, i) => [
        ...(i ? [' '] : []),
        ...mark(text(r), marks(r), r),
      ])}
    </p>
  )
}

/** The section heading, part for part as chapters 2 and 6 set it: the title, the
    term beside it — here the YEARS — and the diamond ornament beneath.
    `dir="ltr"` on the term: chapter 6's `.section-term` is an Arabic span and its
    RTL direction turned „632–634" into „634–632". The years get their own class. */
function Head({ id }: { id: string }) {
  const s = meta(id)
  return (
    <header className="section-heading" data-reveal>
      <div>
        <h2 id={`${id}-title`}>{s.title}</h2>
        <span className="section-term ch5-years" dir="ltr">({s.term})</span>
      </div>
      <div className="title-ornament section-ornament" aria-hidden="true"><span /></div>
    </header>
  )
}

function Env({ id, sectionId }: { id: string; sectionId: string }) {
  return <h3 className="scrolly-env" id={id}>{sub(sectionId, id)}</h3>
}

function Section({ id, className = '', children }: { id: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`article-section ${className}`} id={id} aria-labelledby={`${id}-title`}>
      {children}
    </section>
  )
}

/** The two claims, side by side. The shape is chapter 2's trait card — the page's own
    tone, one hairline, a picture flush to the card's edges and the words in a padded
    foot below — with the one thing that card does removed: these do not open. There is
    nothing behind them to open onto; the whole claim is on the face.

    NOT AN EXERCISE. No buttons, no „choose a side", no right answer: the source gives
    two reasoned claims and decides between them nowhere, so a card that invited a pick
    would be asserting that one of them wins.

    The two are the same size by construction — equal grid tracks, stretched rows, and a
    fixed 4:3 on both pictures — so neither claim is given more room than the other,
    which on this page would itself be an argument. */
function Claims({ refs }: { refs: [string, string] }) {
  const ART: Record<string, { src: string; alt: string }> = {
    '§0.sahaba': { src: 'claim-companions.jpg', alt: 'מעגל יושבים סביב נר' },
    '§0.shia': { src: 'claim-blood.jpg', alt: 'שני חבלים קשורים זה בזה' },
  }
  return (
    <div className="ch5-claims" data-reveal>
      {refs.map((r) => (
        <article className="ch5-claim" key={r}>
          <span className="ch5-claim-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/assets/chapter5/${ART[r].src}`} alt={ART[r].alt} loading="lazy" decoding="async" />
          </span>
          <div className="ch5-claim-text">
            <h3 className="ch5-claim-name">{frag(r).name}</h3>
            <p>{mark(text(r), marks(r), r)}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

/** The four reigns at true proportion — 2 · 10 · 12 · 5 — and nothing else.

    IT CARRIES NO CAUSE OF DEATH: the source says Umar was killed by an assassin and Ali
    was murdered, but of Abu Bakr it says only that the cause is unclear, and of Uthman
    nothing beyond „the way he died". A row of labels here would have asserted, for two
    of the four, something the source does not.

    WHAT IT DOES CARRY, after the first build did not: a heading saying what is being
    measured, and the number of years at the end of each bar. Without them it was four
    bars of unexplained length sitting inside four identical empty tracks — so the eye
    compared fill against emptiness instead of one duration against another, and nothing
    on screen said the lengths were years. The track is gone; the bar IS the duration.
    The bars are gold, which is the section they close.

    Names, years and the axis label come from layout.json, so the axis prints no source
    text and consumes no fragment. */
function ReignAxis() {
  /* `reign` in layout.json, NOT a regex over the term: the closing section's own term is
     „632–661", so matching year-ranges put the whole period on the axis as a fifth bar
     and halved every real one. */
  const reigns = SECTIONS.filter((s) => s.reign).map((s) => {
    const [from, to] = s.term.split('–').map(Number)
    return { id: s.id, title: s.title, term: s.term, years: to - from }
  })
  const longest = Math.max(...reigns.map((r) => r.years))
  return (
    <figure className="ch5-axis" data-reveal>
      {reigns.map((r) => (
        <div className="ch5-axis-row" key={r.id} style={{ ['--w' as string]: `${(r.years / longest) * 100}%` }}>
          <b className="ch5-axis-name">{r.title}</b>
          <span className="ch5-axis-bar"><i /><em>{r.years}</em></span>
          <span className="ch5-axis-years" dir="ltr">{r.term}</span>
        </div>
      ))}
    </figure>
  )
}

export default function Chapter5() {
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

  /* resume where the reader stopped — never on the first visit, and never past a
     jump the reader just made from the menu */
  useEffect(() => {
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
    try { setCollapsed(localStorage.getItem('ch5:side-collapsed') === '1') } catch {}
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('ch5:side-collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }, [])
  const onMenuJump = useCallback(() => { jumpUntil.current = Date.now() + 1800 }, [])

  return (
    <div className="chapter-page">
      <MarkToNotebook ch={5} />
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
            <span className="menu-sub">{CH5.menuTitle}</span>
          </div>
          {/* SEVEN LINES AND NOTHING ELSE — chapter 6's rail carries only its top-level
              sections, with no sub-entries under them. This one listed six sections plus
              eight sub-headings, which is both more furniture than the product uses
              anywhere and a rail that no longer reads at a glance. The sub-headings are
              still in the page; they are simply not also in the menu. */}
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
            <main className="chapter-article" ref={articleRef}>

              {/* ============ 01 · the question ============ */}
              <Section id="succession" className="opening-section">
                {/* the banner: a locked-off loop of a camp edge at first light. The
                    poster is what stands under prefers-reduced-motion, and it is the
                    video's own first frame, so the swap is invisible. */}
                <div className="ch6-hero">
                  <div className="ch6-hero-media ch5-hero-media" aria-hidden="true">
                    <video
                      className="ch6-hero-video"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      poster="/assets/chapter5/hero-poster.jpg"
                      tabIndex={-1}
                      onError={(event) => { event.currentTarget.hidden = true }}
                    >
                      <source src="/assets/chapter5/hero.mp4" type="video/mp4" />
                    </video>
                  </div>
                  {/* the title alone, as chapter 6's banner carries it — the „פרק חמישי"
                      eyebrow was mine and chapter 6 has no such line over its own */}
                  <div className="ch6-hero-copy">
                    <h1 id="chapter-title" className="ch6-hero-title">{CH5.title}</h1>
                  </div>
                </div>
                <Head id="succession" />
                <T refs={['§0.a', '§0.b']} className="ch5-lead" />

                <Env id="claims" sectionId="succession" />
                <Claims refs={['§0.sahaba', '§0.shia']} />

                <Env id="baya" sectionId="succession" />
                <T refs={['§1.a']} />
                <T refs={['§2.a']} className="ch5-quote-lead" />
                <blockquote className="ch5-quote" data-reveal>{text('§2.hadith')}</blockquote>
              </Section>

              {/* ============ 02 · Abu Bakr ============ */}
              <Section id="abubakr">
                <Head id="abubakr" />
                <div className="ch5-figrow">
                  <div className="ch5-figrow-copy">
                    <T refs={['§3.a']} className="ch5-lead" />
                    <Env id="ridda" sectionId="abubakr" />
                    <T refs={['§3.ridda', '§3.authority']} />
                    <T refs={['§3.death', '§3.heir']} />
                  </div>
                  <figure className="ch5-figure is-cutout is-lifted" data-reveal>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/chapter5/snake.png" alt="" loading="lazy" decoding="async" />
                  </figure>
                </div>
              </Section>

              {/* ============ 03 · Umar — the chapter's one journey ============ */}
              <Section id="umar">
                <Head id="umar" />
                <Env id="conquests" sectionId="umar" />
                {/* Chapter 6's full-screen stage, the shape the prayer day uses: the map
                    fills the viewport and the reading rides over it in parchment cards.
                    The four marks are the four places in the order the sentence names
                    them, and ConquestMap drops its pins on the same thresholds — so the
                    word lighting in the card and the pin landing on the map are the same
                    event, not two that have to be kept in step by hand. */}
                <Scrolly full art={(s) => <ConquestMap {...s} />}>
                  <P text={[text('§4.a'), text('§4.b'), text('§4.faruq')].join(' ')} />
                  <P
                    text={text('§4.conquests')}
                    marks={['עיראק בקרב אלקאדסיה', 'סוריה בקרב הירמוכ', 'ירושלים בשנת 638', 'מצרים בשנת 640']}
                  />
                  <P text={text('§4.fell')} />
                </Scrolly>
                <Env id="reforms" sectionId="umar" />
                <T refs={['§5.modest', '§5.model', '§5.reforms']} />
                <T refs={['§5.calendar', '§5.hijri']} />
                <T refs={['§5.status']} />
                <T refs={['§6.a', '§6.shia']} className="ch5-close" />
              </Section>

              {/* ============ 04 · Uthman ============ */}
              {/* The picture takes the reading edge for the WHOLE section, not for one
                  paragraph of it: the heading and every line of prose run beside it in
                  their own column. It is the one place in the chapter where a picture is
                  given the height of a section, and it earns it — the codex standing
                  intact while the other copies burn is the whole of §7 in one frame.

                  The three-state plate that used to stand here is gone. Clicking through
                  „scattered → gathered → burnt" added nothing the sentence beside it does
                  not already say, and a device that only illustrates its own caption is
                  furniture. */}
              <Section id="uthman">
                {/* the heading keeps the full column and the far edge, exactly as every
                    other section's does — inside the picture's column it was pushed left
                    and shrunk, and the chapter's one heading rhythm broke on it */}
                <Head id="uthman" />
                <div className="ch5-split">
                  <figure className="ch5-tall" data-reveal>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/chapter5/quran.jpg" alt="כרך כרוך עומד על כן, ודפים נשרפים בכירה לצידו" loading="lazy" decoding="async" />
                  </figure>
                  <div className="ch5-split-copy">
                    <T refs={['§7.a']} className="ch5-lead" />
                    <Env id="quran" sectionId="uthman" />
                    <T refs={['§7.collect', '§7.burn']} />
                    <Env id="portrait" sectionId="uthman" />
                    <T refs={['§7.unjust', '§7.shahid']} />
                    <T refs={['§7.wives']} />
                  </div>
                </div>
              </Section>

              {/* ============ 05 · Ali ============ */}
              <Section id="ali">
                <Head id="ali" />
                <T refs={['§8.a']} className="ch5-lead" />
                <Env id="kin" sectionId="ali" />
                {/* The plate takes the left of this part of the section and the reading
                    runs beside it — both the sentence that describes the kinship and the
                    one that closes on Ali's death, so the picture stands against the
                    whole passage rather than against one paragraph of it. */}
                <div className="ch5-figrow is-wide">
                  <div className="ch5-figrow-copy">
                    <T refs={['§8.kin']} />
                    <T refs={['§8.death']} />
                  </div>
                  <Lineage />
                </div>
              </Section>

              {/* ============ 06 · the golden age ============ */}
              <Section id="golden">
                <Head id="golden" />
                {/* the same sub-heading every other movement in the chapter gets, not a
                    small caption of the chart's own */}
                <Env id="reigns" sectionId="golden" />
                <ReignAxis />
                <T refs={['§9.a']} className="ch5-verdict" />
              </Section>

              <div className="chapter-end" ref={endRef} id="chapter-end">
                <Link className="chapter-end-back" href="/chapter5/practice">לתרגול המסכם</Link>
                <Link className="chapter-end-back is-quiet" href="/chapters">לכל פרקי הלמידה</Link>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
