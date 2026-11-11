'use client'

/* Chapter 16 — ימי ציון ואזכור.

   Same product as chapters 2, 5, 6, 8, 9 and 10: masthead, rail, type scale, reveal and every
   colour come from chapter6-article.css, which the route layout loads first;
   chapter16-article.css adds only this chapter's devices.

   THE SHAPE — seven sections in the source's order (map approved 3.11.2026,
   concept/chapter16/DECISIONS.md). Each occasion carries its date, cut from its own sentence:
   one line under the heading for the four Sunni occasions, a dated row for each of the five
   Shi'i ones. Two devices: the calendar of the occasions on chapter 7's year wheel (01, a
   click — structure, rule 54), and the two festivals by length, a cell a day (03). A
   watercolour cut beside five of the sections (concept/chapter16/ASSET-MANIFEST.md).

   AND NO CHECKS. Every question lives at /chapter16/practice.

   WHAT THIS FILE MAY NOT DO: write a sentence. Every string comes from passages.json
   through text(), addressed by its §N.fragment, and concept/chapter16/verify-chapter16.mjs
   fails if a fragment is printed twice or dropped. Every label (a date, a blessing, a link)
   is cut out of a fragment's own sentence ({from, cut}, rule 27) and checked by the same gate. */

import SiteFooter from '@/components/SiteFooter'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import MarkToNotebook from '@/components/MarkToNotebook'
import { CH16, em, frag, text, tr } from '@/lib/chapter16/content'
import layoutData from '@/lib/chapter16/layout.json'
import {
  completedSections,
  markContentComplete,
  markSectionDone,
  practiceComplete,
  resumeSectionId,
  saveCurrentSection,
  SECTION_ORDER,
} from '@/lib/chapter16/progress'

/* the banner: a bright watercolour of an old city at dawn, the new crescent and one red lantern (ASSET-MANIFEST.md) */
const HERO = '/assets/chapter16/hero.jpg'

/** a device label: words cut out of one fragment's sentence (rule 27) */
interface Cut { from: string; cut: string[] }
interface LinkCut extends Cut { href: string }
interface LayoutSection {
  id: string
  title: string
  term: string
  date?: Cut
  slots: Record<string, string[]>
  bless?: { ar: Cut; he: Cut }[]
  rows?: { id: string; name: Cut; date: Cut; refs: string[] }[]
  links?: LinkCut[]
  fastsTitle?: string
}
const SECTIONS = (layoutData as unknown as { sections: LayoutSection[] }).sections

const meta = (id: string): LayoutSection => {
  const s = SECTIONS.find((x) => x.id === id)
  if (!s) throw new Error(`chapter 16: unknown section ${id}`)
  return s
}
/** the refs of one slot, read from layout.json — the JSX names the slot, never the refs,
    so the gate's „exactly once" walk over layout.json is a walk over what is printed */
const slot = (sectionId: string, name: string): string[] => {
  const refs = meta(sectionId).slots[name]
  if (!refs) throw new Error(`chapter 16: unknown slot ${sectionId}/${name}`)
  return refs
}

/** The words of a label, checked against the sentence they are cut from. Throws on drift. */
const one = ({ from, cut }: Cut): string => {
  const t = frag(from).text ?? ''
  if (!t.includes(cut[0])) throw new Error(`chapter 16: label "${cut[0]}" is not in ${from}`)
  return cut[0]
}

/** every „ראו לעיל" link on the page, by the fragment it sits in */
const LINKS: LinkCut[] = SECTIONS.flatMap((s) => s.links ?? [])

/* ---------------- text primitives (chapter 10's) ---------------- */

/** Arabic inside a Hebrew sentence gets its own lang/dir and face, so it shapes and runs
    right — the blessing names, the verse 2:203, „علامات المؤمن". Presentation only: the
    characters are the sentence's own. */
const AR = /[؀-ۿ][؀-ۿً-ْ\s]*[؀-ۿً-ْ]|[؀-ۿ]/g
function arabic(t: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let last = 0
  let n = 0
  for (const m of t.matchAll(AR)) {
    if (m.index! > last) out.push(t.slice(last, m.index))
    out.push(<span className="ch16-ar" lang="ar" dir="rtl" key={`${key}-ar${n++}`}>{m[0]}</span>)
    last = m.index! + m[0].length
  }
  if (last < t.length) out.push(t.slice(last))
  return out
}

/** Paint the fragment's marked phrases inside its own sentence, leaving every other
    character alone: `.key` maroon — the idea; `.ch16-tr` gold — a term being taught
    (rule 38); a link — the source's own „ראו לעיל" pointing at the chapter it means. */
type Paint = (phrase: string, key: string) => React.ReactNode
function mark(t: string, groups: { phrases: string[]; paint: Paint }[], key: string): React.ReactNode[] {
  const all = groups.flatMap((g) => g.phrases.map((phrase) => ({ phrase, paint: g.paint })))
  let parts: React.ReactNode[] = arabic(t, key)
  /* longest first, so a phrase that contains another is not cut in half by it */
  all.sort((a, b) => b.phrase.length - a.phrase.length)
  let n = 0
  for (const { phrase, paint } of all) {
    const next: React.ReactNode[] = []
    let found = false
    for (const part of parts) {
      if (typeof part !== 'string') { next.push(part); continue }
      const bits = part.split(phrase)
      if (bits.length > 1) found = true
      bits.forEach((bit, i) => {
        if (i) next.push(paint(phrase, `${key}-${n++}`))
        if (bit) next.push(bit)
      })
    }
    if (!found && process.env.NODE_ENV !== 'production') console.error(`chapter 16: ${key} — "${phrase}" not painted`)
    parts = next
  }
  return parts
}

const bold = (cls: string): Paint =>
  function paintBold(phrase, k) { return <b className={cls} key={k}>{phrase}</b> }

const marks = (r: string) => {
  const links = LINKS.filter((l) => l.from === r)
  return [
    { phrases: em(r), paint: bold('key') },
    { phrases: tr(r), paint: bold('ch16-tr') },
    ...links.map((l) => ({
      phrases: [one(l)],
      paint: ((phrase, k) => <Link className="ch16-link" href={l.href} key={k}>{phrase}</Link>) as Paint,
    })),
  ]
}

const sentences = (refs: string[]) =>
  refs.flatMap((r, i) => [...(i ? [' '] : []), ...mark(text(r), marks(r), r)])

/** A slot's fragments as paragraphs of at most ~45 words (chapter 9, „קירות של טקסט"). */
const PARA_WORDS = 45
const words = (r: string) => text(r).split(/\s+/).length
function paras(refs: string[]): string[][] {
  const out: string[][] = []
  for (const r of refs) {
    const cur = out[out.length - 1]
    if (cur && cur.reduce((n, x) => n + words(x), 0) + words(r) <= PARA_WORDS) cur.push(r)
    else out.push([r])
  }
  return out
}
/** `lines` keeps every fragment its own paragraph — two cross-references are two lines,
    not one sentence run on into the next. */
function T({ s, n, className, lines }: { s: string; n: string; className?: string; lines?: boolean }) {
  const groups = lines ? slot(s, n).map((r) => [r]) : paras(slot(s, n))
  return <>{groups.map((g) => <p className={className} data-reveal key={g[0]}>{sentences(g)}</p>)}</>
}

/** The section heading, part for part as chapter 6 sets it. */
function Head({ id }: { id: string }) {
  const s = meta(id)
  return (
    <header className="section-heading" data-reveal>
      <div>
        <h2 id={`${id}-title`}>{s.title}</h2>
        <span className="section-term" lang="ar" dir="rtl">{s.term}</span>
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

/** When the occasion falls — words cut from the sentence that says so, set as one quiet
    line under the heading. Not a computed date: only what the source prints. */
function When({ id }: { id: string }) {
  const d = meta(id).date
  if (!d) return null
  return <p className="ch16-when" data-reveal><span className="ch16-when-mark" aria-hidden="true" />{one(d)}</p>
}

/** The two Eid greetings (§6), each Arabic line over its Hebrew gloss, centred. The
    fragment is printed whole: the lead-in, then the four pieces — and the pieces must
    rebuild the sentence (punctuation aside), or this throws. */
function Blessings() {
  const s = meta('fitr')
  const [ref] = slot('fitr', 'bless')
  const t = text(ref)
  const rows = s.bless!.map((b) => ({ ar: one(b.ar), he: one(b.he) }))
  const intro = t.slice(0, t.indexOf(rows[0].ar)).replace(/[:\s]+$/, '')
  const flat = (x: string) => x.replace(/[\s:;().]/g, '')
  if (flat(intro + rows.map((r) => r.ar + r.he).join('')) !== flat(t)) throw new Error('chapter 16: the blessings do not rebuild §6')
  return (
    <figure className="ch16-bless" data-reveal>
      <figcaption>{intro}</figcaption>
      {rows.map((r) => (
        <div className="ch16-bless-row" key={r.ar}>
          <span className="ch16-bless-ar" lang="ar" dir="rtl">{r.ar}</span>
          <span className="ch16-bless-he">{r.he}</span>
        </div>
      ))}
    </figure>
  )
}

/** The five Shi'i occasions (§14–§18), each set the way a Sunni one is: a sub-heading with its
    name, the date line with the crescent, then the source's paragraphs. Name and date are cut
    from the occasion's own first sentence. A table of date-against-paragraph was tried first
    and read as strange: it put the date where the name belongs. They stand on one axis — the
    source's order is also the year's, from ד'ו אלחג'ה round to רמדאן. The Karbala painting
    that stood beside two of them was removed (4.11). Each carries the id the calendar's
    „למקטע" lands on. */
function Occasions() {
  return (
    <ol className="ch16-axis">
      {meta('shia').rows!.map((r) => (
        <li className="ch16-occ" id={r.id} key={r.id}>
          <h3 className="scrolly-env" data-reveal>{one(r.name)}</h3>
          <p className="ch16-when" data-reveal><span className="ch16-when-mark" aria-hidden="true" />{one(r.date)}</p>
          {paras(r.refs).map((g) => <p key={g[0]} data-reveal>{sentences(g)}</p>)}
        </li>
      ))}
    </ol>
  )
}

/** Chapter 6's `.bleed-aside`: a transparent watercolour cut beside the words, no frame and
    no caption (rule 45). `flipped` puts it on the reading edge. */
const ART = '/assets/chapter16/'
function Aside({ img, flipped, children }: { img: string; flipped?: boolean; children: React.ReactNode }) {
  return (
    <div className={`bleed-aside ch16-aside${flipped ? ' is-flipped' : ''}`}>
      <div className="bleed-aside-art" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ART}${img}.webp`} alt="" loading="lazy" decoding="async" />
      </div>
      <div className="bleed-aside-body">{children}</div>
    </div>
  )
}

/* ---------------- 01 · the calendar of the occasions ----------------
   Every occasion the chapter names, set on chapter 7's year wheel (the same painted plate,
   so the reader meets the year she already learned). Twelve numbered stations on the ring —
   the month numbers of chapter 7 §8, the numbers this chapter prints in brackets — and the
   occasions on two tracks inside it: the Shi'i ones of section 06 on the inner track, all
   the others on the outer. A station's angle is its month and day (layout.json `at`); the
   angle is never printed. Choosing an occasion — on the wheel or in the list — names it and
   its date in the hub, both cut from its own sentence, and „למקטע" goes to where it is read. */
interface CalItem { id: string; track: 'all' | 'shia'; name: Cut; date: Cut; at: [number, number][]; to: string }
const CAL = (meta('memory') as LayoutSection & { calendar: { legend: { all: string; shia: string }; items: CalItem[] } }).calendar
const RING = { all: 25.6, shia: 19.6 }
/** a UI label (rule 24), the short form of the legend's „המועדים השיעיים" — on each row of that track */
const SHIA_TAG = 'שיעי'
const angle = (m: number, d: number) => -Math.PI / 2 + ((m - 1 + (d - 0.5) / 30 - 0.5) * Math.PI) / 6
const pos = (r: number, a: number) => ({ left: `${(50 + r * Math.cos(a)).toFixed(3)}%`, top: `${(50 + r * Math.sin(a)).toFixed(3)}%` })
function Calendar() {
  const [on, setOn] = useState('fitr')
  const pick = CAL.items.find((x) => x.id === on)!
  const jump = () => window.dispatchEvent(new Event('chapter:jump'))
  return (
    <div className="ch16-cal" data-reveal>
      <div className="ch16-cal-plate" dir="ltr">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/chapter7/year-wheel.webp" alt="" loading="lazy" decoding="async" />
        <svg className="ch16-cal-tracks" viewBox="0 0 100 100" aria-hidden="true">
          <circle className="is-all" cx="50" cy="50" r={RING.all} />
          <circle className="is-shia" cx="50" cy="50" r={RING.shia} />
        </svg>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="ch16-cal-m" aria-hidden="true" style={pos(35.6, -Math.PI / 2 + (i * Math.PI) / 6)}>{i + 1}</span>
        ))}
        {CAL.items.flatMap((it) => it.at.map(([m, d], k) => (
          <button key={`${it.id}-${k}`} type="button" tabIndex={-1}
            className={`ch16-cal-dot is-${it.track}${it.id === on ? ' is-on' : ''}`}
            style={pos(RING[it.track], angle(m, d))} aria-hidden="true"
            onClick={() => setOn(it.id)} />
        )))}
        <div className="ch16-cal-hub" dir="rtl" aria-live="polite">
          <b>{one(pick.name)}</b>
          <span>{one(pick.date)}</span>
        </div>
      </div>
      <div className="ch16-cal-side">
        <ol className="ch16-cal-list">
          {CAL.items.map((it) => (
            <li key={it.id} className={`is-${it.track}${it.id === on ? ' is-on' : ''}`}>
              <button type="button" aria-pressed={it.id === on} onClick={() => setOn(it.id)}>
                <i aria-hidden="true" />
                <b>{one(it.name)}</b>
                {/* the track in words, not only in the dot's colour (UX pass 11.11.2026) — beside
                    the name, so it stays on the name's line when the date wraps */}
                {it.track === 'shia' && <em className="ch16-cal-tag">{SHIA_TAG}</em>}
                <span>{one(it.date)}</span>
              </button>
              {it.id === on && <a className="ch16-cal-go" href={`#${it.to}`} onClick={jump}>למקטע</a>}
            </li>
          ))}
        </ol>
        <p className="ch16-cal-legend">
          <span className="is-all"><i aria-hidden="true" />{CAL.legend.all}</span>
          <span className="is-shia"><i aria-hidden="true" />{CAL.legend.shia}</span>
        </p>
      </div>
    </div>
  )
}

/* ---------------- 03 · the two festivals by length ----------------
   §4 calls the Fitr „the small festival" because it is three days, against the four of the
   festival of the sacrifice; §7 names the last three of those four „ימי התשריק". One cell a
   day, both rows on the same cell width, no empty rail behind them (rule 60) — length
   against length. Every label is cut from its sentence. */
interface DaysRow { name: Cut; count: Cut; days: number; rest?: Cut }
const DAYS = (meta('adha') as LayoutSection & { days: { title: string; rows: DaysRow[] } }).days
function Days() {
  return (
    <figure className="ch16-days" data-reveal>
      <figcaption className="ch16-days-title">{DAYS.title}</figcaption>
      {DAYS.rows.map((r) => (
        <div className="ch16-days-row" key={r.name.cut[0]}>
          <b className="ch16-days-name">{one(r.name)}</b>
          <ol className="ch16-days-cells" aria-label={one(r.count)}>
            {Array.from({ length: r.days }, (_, i) => (
              <li key={i} style={{ '--i': i } as React.CSSProperties} className={r.rest && i > 0 ? 'is-rest' : undefined} />
            ))}
          </ol>
          <span className="ch16-days-count">{one(r.count)}</span>
          {r.rest && <div className="ch16-days-notes"><span className="is-rest">{one(r.rest)}</span></div>}
        </div>
      ))}
    </figure>
  )
}

export default function Chapter16() {
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
    try { setCollapsed(localStorage.getItem('ch16:side-collapsed') === '1') } catch {}
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('ch16:side-collapsed', next ? '1' : '0') } catch {}
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
      <MarkToNotebook ch={16} />
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
            <span className="menu-sub">{CH16.menuTitle}</span>
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
            <main className="chapter-article" ref={articleRef}>

              {/* ============ 01 · collective memory ============ */}
              <Section id="memory" className="opening-section">
                <div className="ch6-hero">
                  <div className="ch6-hero-media" aria-hidden="true" style={{ backgroundImage: `url('${HERO}')` }} />
                  <div className="ch6-hero-copy">
                    <h1 id="chapter-title" className="ch6-hero-title">{CH16.title}</h1>
                  </div>
                </div>
                <Head id="memory" />
                <T s="memory" n="lead" />
                <T s="memory" n="alert" />
                {/* the whole year before the occasions one by one — after the opening prose, not
                    inside it, and before the turn into the two festivals (§3) */}
                <Calendar />
                <T s="memory" n="two" className="ch16-statement" />
              </Section>

              {/* ============ 02 · Eid al-Fitr ============ */}
              <Section id="fitr">
                <Head id="fitr" />
                <When id="fitr" />
                <T s="fitr" n="lead" />
                <Aside img="fitr-cut">
                  <T s="fitr" n="prayer" />
                  <T s="fitr" n="family" />
                </Aside>
                <T s="fitr" n="more" />
                <Blessings />
              </Section>

              {/* ============ 03 · Eid al-Adha ============ */}
              <Section id="adha">
                <Head id="adha" />
                <When id="adha" />
                <T s="adha" n="lead" />
                <Aside img="adha-cut" flipped>
                  <T s="adha" n="body" />
                </Aside>
                <T s="adha" n="tashriq" />
                <Days />
              </Section>

              {/* ============ 04 · the Prophet's birthday, and the fasts ============ */}
              <Section id="mawlid">
                <Head id="mawlid" />
                <When id="mawlid" />
                <T s="mawlid" n="lead" />
                <h3 className="scrolly-env">{meta('mawlid').fastsTitle}</h3>
                <T s="mawlid" n="fasts" className="ch16-ref" lines />
              </Section>

              {/* ============ 05 · the Night Journey ============ */}
              <Section id="isra">
                <Head id="isra" />
                <When id="isra" />
                <T s="isra" n="lead" />
                <Aside img="isra-cut">
                  <T s="isra" n="jerusalem" />
                  <T s="isra" n="night" />
                </Aside>
              </Section>

              {/* ============ 06 · the Shi'i occasions ============ */}
              <Section id="shia">
                <Head id="shia" />
                <T s="shia" n="lead" />
                <Occasions />
              </Section>

              {/* ============ 07 · the days of the shahids ============ */}
              <Section id="shahid">
                <Head id="shahid" />
                <Aside img="mourning-cut">
                  <T s="shahid" n="lead" />
                </Aside>
              </Section>

              {/* the close, identical in every chapter (rule 33) */}
              <div className="chapter-end" ref={endRef} id="chapter-end" data-reveal>
                <Link className="chapter-end-back" href="/chapter16/practice">לתרגול המסכם</Link>
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
