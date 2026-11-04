'use client'

/* Chapter 14 — מוטיבים אסלאמיים מתוך המודיעין הגלוי.

   Same product as chapters 2, 5, 6, 8, 9 and 10: masthead, rail, type scale, reveal and every
   colour come from chapter6-article.css, which the route layout loads first;
   chapter14-article.css adds only this chapter's devices.

   THE SHAPE — a scrolling article in three sections (the user, 3.11.2026): the open source,
   then the two cases the source analyses — al-Sharaa in the Umayyad Mosque, Naim Qassem.
   Both cases run the same pattern in the source — context, the speech, the question „אלו
   מוטיבים…?", lettered motifs, a summary — and that pattern is what the chapter teaches.

   THE ONE DEVICE — the motifs of 02 as a full-screen scene (round 3, after „משעמם, מעייף
   לקריאה ומסודר על הפנים"): §7–§8 are read once as a document, then the question and the six
   motifs ride the scroll, each over its own painting — chapter 6's prayer day (rules 54, 56).
   Round 2's pressable reading (the speech sticky beside the motif cards, a pressed motif
   lighting its span) was two streams side by side; `points` stays in passages.json and in the
   gate, unprinted. 03: each motif beside its painting, the sides alternating.

   AND NO CHECKS. Every question lives at /chapter14/practice.

   WHAT THIS FILE MAY NOT DO: write a sentence. Every string comes from passages.json
   through text(), addressed by its §N.fragment, and concept/chapter14/verify-chapter14.mjs
   fails if a fragment is printed twice or dropped. Labels are cut out of a fragment's own
   sentence ({from, cut}, rule 27) or are editorial (layout.json, rule 24). */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import { clamp01, Scrolly, seg, type ScrollyState } from '@/components/chapter6/scrolly'
import MarkToNotebook from '@/components/MarkToNotebook'
import { CH14, em, frag, text, tr } from '@/lib/chapter14/content'
import layoutData from '@/lib/chapter14/layout.json'
import {
  completedSections,
  markContentComplete,
  markSectionDone,
  practiceComplete,
  resumeSectionId,
  saveCurrentSection,
  SECTION_ORDER,
} from '@/lib/chapter14/progress'

const ART = '/assets/chapter14/'

/** a device label: words cut out of one fragment's sentence (rule 27) */
interface Cut { from: string; cut: string[] }
/** a paragraph: one fragment, or several sentences of one § joined back together (chapter 10) */
type Para = string | string[]
/** 04's motifs: a lettered motif beside its cut-out (`art`), or the prose that runs between */
interface Group { art?: string; paras: Para[] }
interface LayoutSection {
  id: string
  title: string
  /** years, Latin or Arabic beside the title; empty for none */
  term: string
  slots: Record<string, unknown[]>
  /** sub-headings, keyed by the slot each one opens — editorial, like a heading (rule 24) */
  subs?: Record<string, string>
  link?: Cut & { href: string }
  /** 03: one full-screen frame per motif (s-<name>.jpg) — editorial, like a heading */
  art?: string[]
}
const LAYOUT = layoutData as unknown as { sections: LayoutSection[] }
const SECTIONS = LAYOUT.sections

const meta = (id: string): LayoutSection => {
  const s = SECTIONS.find((x) => x.id === id)
  if (!s) throw new Error(`chapter 14: unknown section ${id}`)
  return s
}
/** one slot, read from layout.json — the JSX names the slot, never the refs, so the gate's
    „exactly once" walk over layout.json is a walk over what is printed */
function slot<T = Para>(sectionId: string, name: string): T[] {
  const refs = meta(sectionId).slots[name]
  if (!refs) throw new Error(`chapter 14: unknown slot ${sectionId}/${name}`)
  return refs as T[]
}
const refsOf = (p: Para): string[] => (Array.isArray(p) ? p : [p])

/** The words of a device label, checked against the sentence they are cut from. */
const one = ({ from, cut }: Cut): string => {
  const t = frag(from).text ?? ''
  if (!t.includes(cut[0])) throw new Error(`chapter 14: label "${cut[0]}" is not in ${from}`)
  return cut[0]
}

/* ---------------- text primitives ---------------- */

interface Span { phrase: string; render: (inner: React.ReactNode, key: string) => React.ReactNode }

function paint(t: string, spans: Span[], found: Set<string>, key: string): React.ReactNode[] {
  for (const sp of spans) {
    const i = t.indexOf(sp.phrase)
    if (i < 0) continue
    found.add(sp.phrase)
    return [
      ...paint(t.slice(0, i), spans, found, `${key}b`),
      sp.render(sp.phrase, `${key}m`),
      ...paint(t.slice(i + sp.phrase.length), spans, found, `${key}a`),
    ]
  }
  return t ? [t] : []
}

/** Paint a fragment: `.key` maroon — the idea; `.ch14-tr` gold — a term being taught (rule
    38). Longest first, so a phrase that contains another wins. In development a phrase that
    is not found shouts, as in chapter 3. */
function sentence(r: string, body = text(r)): React.ReactNode[] {
  const spans: Span[] = [
    ...em(r).map((phrase) => ({ phrase, render: (x: React.ReactNode, k: string) => <b className="key" key={k}>{x}</b> })),
    ...tr(r).map((phrase) => ({ phrase, render: (x: React.ReactNode, k: string) => <b className="ch14-tr" key={k}>{x}</b> })),
  ].sort((a, b) => b.phrase.length - a.phrase.length)
  const found = new Set<string>()
  const out = paint(body, spans, found, r)
  if (process.env.NODE_ENV !== 'production' && body === text(r)) {
    for (const s of spans) if (!found.has(s.phrase)) console.error(`chapter 14: ${r} — "${s.phrase}" not painted`)
  }
  return out
}

/** A motif's lettered opening („א. פסוקי קוראן בתחילת הנאום") set as its heading, the rest of
    the sentence after it on the same line. Both halves are the one sentence, cut at the end of
    `head` — nothing is added. Any other fragment is painted as it is. */
function Sentence({ r }: { r: string }) {
  const f = frag(r)
  if (!f.head) return <>{sentence(r)}</>
  return (
    <>
      <b className="ch14-mt">{f.head}</b>
      {sentence(r, text(r).slice(f.head.length))}
    </>
  )
}

/** One paragraph: its sentences, in order, joined by a space as the source joins them. */
function P({ p, className }: { p: Para; className?: string }) {
  const refs = refsOf(p)
  return (
    <p className={className} data-reveal>
      {refs.map((r, i) => <Fragment key={r}>{i > 0 && ' '}<Sentence r={r} /></Fragment>)}
    </p>
  )
}

/** chapter 6's sub-heading (`h3.scrolly-env`): Kedem, --sub, maroon, a 2px rule under it */
function Sub({ s, n }: { s: string; n: string }) {
  const title = meta(s).subs?.[n]
  return title ? <h3 className="scrolly-env" data-reveal>{title}</h3> : null
}

/** A slot as paragraphs, opened by its sub-heading when layout.json gives it one. */
function T({ s, n, className }: { s: string; n: string; className?: string }) {
  return (
    <>
      <Sub s={s} n={n} />
      {slot(s, n).map((p) => <P key={refsOf(p)[0]} p={p} className={className} />)}
    </>
  )
}

/** The section heading, part for part as chapter 6 sets it. A term that is years or Latin
    runs LTR so it does not flip; only Arabic takes lang="ar". */
function Head({ id }: { id: string }) {
  const s = meta(id)
  const arabic = /[؀-ۿ]/.test(s.term)
  return (
    <header className="section-heading" data-reveal>
      <div>
        <h2 id={`${id}-title`}>{s.title}</h2>
        {s.term && (arabic
          ? <span className="section-term" lang="ar" dir="rtl">{s.term}</span>
          : <span className="section-term is-years" dir="ltr">{s.term}</span>)}
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

/* ---------------- devices ---------------- */

/** Chapter 6's `.bleed-aside`: a transparent watercolour cut beside the words, no frame and
    no caption (rule 45). `flipped` puts it on the reading edge; the sides alternate down the
    chapter, as chapter 6's two cut-outs do. */
function Aside({ img, flipped, children }: { img: string; flipped?: boolean; children: React.ReactNode }) {
  return (
    <div className={`bleed-aside ch14-aside${flipped ? ' is-flipped' : ''}`}>
      <div className="bleed-aside-art" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ART}${img}.webp`} alt="" loading="lazy" decoding="async" />
      </div>
      <div className="bleed-aside-body">{children}</div>
    </div>
  )
}

/** A painting the width of the window that opens a section the way the banner opens the
    chapter — chapter 9's film band, still, with the section heading set on it. */
function Band({ img, children }: { img: string; children: React.ReactNode }) {
  return (
    <div className="ch14-band">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${ART}${img}.jpg`} alt="" aria-hidden="true" loading="lazy" decoding="async" />
      {children}
    </div>
  )
}

/** The question the source puts before its motifs, as the sub-heading of the movement. */
function Question({ s }: { s: string }) {
  const [r] = slot<string>(s, 'question')
  return <h3 className="scrolly-env ch14-q" data-reveal>{text(r)}</h3>
}

/** The motifs' stage: one painting per motif filling the screen, crossfading CONTINUOUSLY
    with the scroll (p = step + t) — chapter 6's prayer day. Step 0 is the question, over the
    first painting; step k is motif k. Decorative: every fact is in the cards. */
function MotifStage({ step, t, frames }: ScrollyState & { frames: string[] }) {
  const p = step + t
  return (
    <div className="st st-photo">
      {frames.map((img, i) => {
        const from = i === 0 ? 0 : i + 1
        const next = i + 1 < frames.length ? i + 2 : undefined
        const alphaIn = i === 0 ? 1 : seg(p, from - 0.92, from + 0.08)
        const alphaOut = next === undefined ? 1 : 1 - seg(p, next - 0.92, next + 0.08)
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={img} src={`${ART}s-${img}.jpg`} alt="" loading={i === 0 ? 'eager' : 'lazy'} decoding="async"
            style={{ opacity: clamp01(Math.min(alphaIn, alphaOut)) }} />
        )
      })}
      <span className="st-veil" />
    </div>
  )
}

/** 03's motifs — a sequence, so it scrolls (rule 54): the question, then six lettered
    motifs, each on its own screen over its own painting (rule 56), its sentences as short
    paragraphs in the card. */
function MotifScene() {
  const frames = meta('motifs').art ?? []
  const [q] = slot<string>('motifs', 'question')
  return (
    <div className="ch14-scene">
      <Scrolly full art={(st) => <MotifStage {...st} frames={frames} />}>
        <h3 className="ch14-scene-q">{text(q)}</h3>
        {slot<string[]>('motifs', 'motifs').map((card) => (
          <div key={card[0]}>
            {card.map((r) => <p key={r}><Sentence r={r} /></p>)}
          </div>
        ))}
      </Scrolly>
    </div>
  )
}

/** §16 and §17 — what the case teaches. In §17 the source's own „כאן" is a link (page 107
    of the booklet); the URL lives in layout.json and the word is cut from the sentence. */
function MotifsClose() {
  const s = meta('motifs')
  const [r16, r17] = slot<string>('motifs', 'close')
  const word = one(s.link!)
  const t = text(r17)
  const i = t.lastIndexOf(word)
  return (
    <>
      <Sub s="motifs" n="close" />
      <P p={r16} />
      <p className="ch14-link" data-reveal>
        {t.slice(0, i)}
        <a href={s.link!.href} target="_blank" rel="noopener noreferrer">{word}</a>
        {t.slice(i + word.length)}
      </p>
    </>
  )
}

/** 04 — each lettered motif beside its painting, frameless, the sides alternating; the
    source's „חשוב לציין" paragraphs run between them as prose. */
function Motifs({ s }: { s: string }) {
  let k = 0
  return (
    <>
      {slot<Group>(s, 'motifs').map((g) => {
        const key = refsOf(g.paras[0])[0]
        if (!g.art) return <Fragment key={key}>{g.paras.map((p) => <P key={refsOf(p)[0]} p={p} />)}</Fragment>
        const flipped = k++ % 2 === 1
        return (
          <Aside key={key} img={g.art} flipped={flipped}>
            {g.paras.map((p) => <P key={refsOf(p)[0]} p={p} />)}
          </Aside>
        )
      })}
    </>
  )
}

export default function Chapter14() {
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
    try { setCollapsed(localStorage.getItem('ch14:side-collapsed') === '1') } catch {}
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('ch14:side-collapsed', next ? '1' : '0') } catch {}
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
      <MarkToNotebook ch={14} />
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
            <span className="menu-sub">{CH14.menuTitle}</span>
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
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              לכל פרקי הלמידה
            </Link>
          </div>
        </aside>
        {drawer && <div className="chapter-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}

        <div className="chapter-content">
          <div className="chapter-layout">
            <main className="chapter-article" ref={articleRef}>

              {/* ============ 01 · the open source ============ */}
              <Section id="osint" className="opening-section">
                {/* the banner: old Damascus rooftops in bright morning light, dishes and
                    antennas on the roofs (rule 42) — a still, no film */}
                <div className="ch6-hero">
                  <div className="ch6-hero-media" aria-hidden="true" style={{ backgroundImage: `url('${ART}hero.jpg')` }} />
                  <div className="ch6-hero-copy">
                    <h1 id="chapter-title" className="ch6-hero-title">{CH14.title}</h1>
                  </div>
                </div>
                <Head id="osint" />
                {/* §0 says it: from the newspaper and the radio to the palm of the hand */}
                <Aside img="osint-media" flipped>
                  <T s="osint" n="lead" />
                </Aside>
                {/* §2 — why the chapter exists, set as its one statement */}
                <T s="osint" n="statement" className="ch14-statement" />
                <T s="osint" n="duty" />
                <T s="osint" n="more" />
                <T s="osint" n="remarks" />
              </Section>

              {/* ============ 02 · Syria — the sermon ============ */}
              <Section id="syria">
                <Band img="syria-wide"><Head id="syria" /></Band>
                <T s="syria" n="context" />
                {/* the sermon beside the minbar it was given from */}
                <Sub s="syria" n="speech" />
                <Aside img="minbar-cut">
                  {slot('syria', 'speech').map((p) => <P key={refsOf(p)[0]} p={p} />)}
                </Aside>
                <T s="syria" n="mosque" />
              </Section>

              {/* ============ 03 · the motifs in the sermon ============ */}
              <Section id="motifs">
                <Head id="motifs" />
                <MotifScene />
                <MotifsClose />
              </Section>

              {/* ============ 04 · Hezbollah ============ */}
              <Section id="hezbollah">
                <Head id="hezbollah" />
                <Aside img="lectern-cut" flipped>
                  <T s="hezbollah" n="context" />
                </Aside>
                <Question s="hezbollah" />
                <Motifs s="hezbollah" />
                <T s="hezbollah" n="close" />
                <T s="hezbollah" n="last" className="ch14-last" />
              </Section>

              {/* the close, identical in every chapter (rule 33) */}
              <div className="chapter-end" ref={endRef} id="chapter-end" data-reveal>
                <Link className="chapter-end-back" href="/chapter14/practice">לתרגול המסכם</Link>
                {practiceDone && <span className="chapter-end-done">הושלם</span>}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
