'use client'

/* Chapter 11 — מקורות ואסכולות ההלכה.

   Same product as chapters 2, 5, 6, 8, 9 and 10: masthead, rail, type scale, reveal and every
   colour come from chapter6-article.css, which the route layout loads first;
   chapter11-article.css adds only this chapter's devices.

   THE SHAPE (the user, 3–4.11.2026): an article like every other chapter. 01–02 are prose and
   cards (02's four each under a watercolour); 03–05 open and close with prose and carry, between,
   a wide live map of the relief built in Blender (components/chapter11/Relief.tsx) that walks its
   stations one at a time, their paragraphs in a card beside it. See MapSection.

   THE SOURCE, ONE TO ONE (the user, 3.11.2026). Read top to bottom, this page is SOURCE-TEXT.md
   word for word: every fragment printed once, in source order — concept/chapter11/verify-
   chapter11.mjs walks layout.json and fails otherwise.

   AND NO CHECKS. Every question lives at /chapter11/practice.

   WHAT THIS FILE MAY NOT DO: write a sentence. Every string comes from passages.json through
   text(), addressed by its §N.fragment. Map labels, place buttons and card titles are cut out of
   a fragment's own sentence ({from, cut}, rule 27) and checked by the same gate. */

import SiteFooter from '@/components/SiteFooter'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import MarkToNotebook from '@/components/MarkToNotebook'
import type { MapStop, Region } from '@/components/chapter11/Relief'
import { CH11, em, frag, text, tr } from '@/lib/chapter11/content'
import layoutData from '@/lib/chapter11/layout.json'
import {
  completedSections,
  markContentComplete,
  markSectionDone,
  practiceComplete,
  resumeSectionId,
  saveCurrentSection,
  SECTION_ORDER,
} from '@/lib/chapter11/progress'

const Relief = dynamic(() => import('@/components/chapter11/Relief'), { ssr: false })

const ART = '/assets/chapter11/'

/** a device label: words cut out of one fragment's sentence (rule 27) */
interface Cut { from: string; cut: string[] }
type Block =
  | { p: string[] }
  | { quote: string[] }
  | { pair: { label: Cut; refs: string[]; art?: string }[] }
interface LayoutStop {
  cam: MapStop['cam']
  wash?: Record<string, number>
  labels?: { at: [number, number]; cut: Cut; year?: boolean }[]
  pins?: [number, number][]
  arc?: number
  blocks: Block[]
}
interface LayoutSection {
  id: string
  title: string
  term: string
  mode: 'sheet' | 'map'
  /** the stop the map opens on, and the one its first button returns to */
  overview?: number
  blocks?: Block[]
  stops?: LayoutStop[]
  /** 03–05: the subjects on the map, each with the stops it opens */
  points?: { at: [number, number]; name: Cut; sub?: Cut[]; stops: number[] }[]
}
const LAYOUT = layoutData as unknown as { regions: Record<string, Region>; sections: LayoutSection[] }
const SECTIONS = LAYOUT.sections
const REGIONS = LAYOUT.regions

const meta = (id: string): LayoutSection => {
  const s = SECTIONS.find((x) => x.id === id)
  if (!s) throw new Error(`chapter 11: unknown section ${id}`)
  return s
}

/** The words of a device label, checked against the sentence they are cut from. Throws on
    drift, so a label can never quietly say something its fragment does not (rule 27). */
const one = ({ from, cut }: Cut): string => {
  const t = frag(from).text ?? ''
  for (const c of cut) if (!t.includes(c)) throw new Error(`chapter 11: label "${c}" is not in ${from}`)
  return cut[0]
}

/* ---------------- text primitives (chapter 10's) ---------------- */

/** Paint the fragment's marked phrases inside its own sentence, leaving every other
    character alone: `.key` maroon — the idea; `.ch11-tr` gold — a term being taught
    (rule 38). Every phrase is a substring of its sentence; the gate fails if one drifts. */
type Paint = (phrase: string, key: string) => React.ReactNode
function mark(t: string, groups: { phrases: string[]; paint: Paint }[], key: string): React.ReactNode[] {
  const all = groups.flatMap((g) => g.phrases.map((phrase) => ({ phrase, paint: g.paint })))
  if (!all.length) return [t]
  /* longest first, so a phrase that contains another is not cut in half by it */
  all.sort((a, b) => b.phrase.length - a.phrase.length)
  let parts: React.ReactNode[] = [t]
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
    if (!found && process.env.NODE_ENV !== 'production') console.error(`chapter 11: ${key} — "${phrase}" not painted`)
    parts = next
  }
  return parts
}

const bold = (cls: string): Paint =>
  function paintBold(phrase, k) { return <b className={cls} key={k}>{phrase}</b> }

const marks = (r: string) => [
  { phrases: em(r), paint: bold('key') },
  { phrases: tr(r), paint: bold('ch11-tr') },
]

const sentences = (refs: string[]) =>
  refs.flatMap((r, i) => [...(i ? [' '] : []), ...mark(text(r), marks(r), r)])

/** A run of fragments as paragraphs of at most ~45 words (chapter 9, „קירות של טקסט"). */
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

/** One block of layout.json, in its order: prose, a quoted sentence, or two equal cards
    whose titles are cut from their own sentences. */
function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if ('p' in b) return paras(b.p).map((g) => <p data-reveal key={g[0]}>{sentences(g)}</p>)
        if ('quote' in b) return <p className="ch11-quote" data-reveal key={b.quote[0]}>{sentences(b.quote)}</p>
        return (
          <div className="ch11-pair" data-reveal key={`pair-${i}`}>
            {b.pair.map((c) => (
              <article className="ch11-card" key={c.refs[0]}>
                {c.art && <img className="ch11-card-art" src={`/assets/chapter11/${c.art}.webp`} alt="" loading="lazy" />}
                <b className="ch11-card-m">{one(c.label)}</b>
                <p>{sentences(c.refs)}</p>
              </article>
            ))}
          </div>
        )
      })}
    </>
  )
}

/* ---------------- the map of a section ---------------- */

/** 03–05: the section's opening as prose, then a wide live map, then its closing as prose
    (the user, 4.11.2026: „אני כן רוצה אנימציות ושזה יראה כמו מפה אינטרקטיבית פשוט לא עם ככ
    הרבה גלילה" → „מפה גדולה ואז טקסט קצר").

    A station is a SUBJECT of the section (layout.json `points`, each with the stops it holds): the
    four schools where each spread, the stations of al-Qaradawi's life, the places salafism is
    named in. Each flies the camera there and shows its paragraphs in a card BESIDE the
    map — the map gives up its left side to it, so no place is ever under the card (a card over the
    map hid North Africa for the Maliki school and Somalia for salafism).

    ONE STATION AT A TIME (the user, 4.11.2026: „שיהיה רק תחנה אחת ואז זה יזרום לפי הסדר"): the map
    opens on the first station with its card already open, and ← / → walk on in source order. No
    overview, no ×, no point buttons on the map: the station's own names and wash say where it is,
    and every point at once was a board to decode, not a sequence.

    Struck on the way (concept/chapter11/DECISIONS.md): the map under the whole article flown by
    the scroll; five sections that open by a click; the map stuck beside the full text with a
    point on every country („לא מובן בכלל", and still a long scroll).

    The cards are <details>, every one in the DOM in source order — so the page still reads
    SOURCE-TEXT top to bottom, and ChapterSearch, which opens a closed <details> holding a hit,
    opens the card and flies the map to it. Points take the stops between the opening and the
    closing, in order; build-time check below. */
function MapSection({ id }: { id: string }) {
  const s = meta(id)
  const stops = s.stops ?? []
  const pts = s.points ?? []
  const [active, setActive] = useState(1)
  const stageRef = useRef<HTMLDivElement | null>(null)

  /* a phone stacks the card under the map: bring the map back to the top so both are in view */
  const open = useCallback((view: number) => {
    setActive(view)
    if (view && innerWidth < 900) stageRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [])

  const inPts = pts.flatMap((p) => p.stops)
  const first = Math.min(...inPts); const last = Math.max(...inPts)
  if (process.env.NODE_ENV !== 'production' && inPts.some((k, i) => k !== first + i)) {
    console.error(`chapter 11 · ${id}: the points must take the middle stops in order`, inPts)
  }

  const { views, points, arc } = useMemo(() => {
    const toView = (sts: LayoutStop[]): MapStop => {
      const wash: Record<string, number> = {}
      for (const st of sts) for (const [k, v] of Object.entries(st.wash ?? {})) wash[k] = Math.max(wash[k] ?? 0, v)
      const seen = new Set<string>()
      const labels = sts.flatMap((st) => st.labels ?? []).map((l) => ({ at: l.at, text: one(l.cut), year: l.year }))
        .filter((l) => { const k = l.text + l.at.join(','); if (seen.has(k)) return false; seen.add(k); return true })
      const pins = [...new Map(sts.flatMap((st) => st.pins ?? []).map((p) => [p.join(','), p])).values()]
      /* the camera frames every name the view raises */
      const fit = [...labels.filter((l) => !l.year).map((l) => l.at), ...pins]
      return { cam: sts[0].cam, wash, labels, pins, fit, arc: Math.max(0, ...sts.map((st) => st.arc ?? 0)) }
    }
    const overview = stops[s.overview ?? 0]
    /* the overview washes every region the points stand for, and frames every point itself */
    const all = toView(pts.flatMap((p) => p.stops.map((k) => stops[k])))
    const views: MapStop[] = [
      { cam: { ...overview.cam, tilt: 8 }, wash: all.wash, fit: pts.map((p) => p.at) },
      ...pts.map((p) => toView(p.stops.map((k) => stops[k]))),
    ]
    const points = pts.map((p, i) => ({ at: p.at, name: one(p.name), sub: (p.sub ?? []).map(one).join(' · '), view: i + 1 }))
    const arcStop = stops.find((st) => st.arc && st.pins?.length === 2)
    return { views, points, arc: arcStop?.pins as [[number, number], [number, number]] | undefined }
  }, [stops, pts, s.overview])

  /* ← → walk the stations while focus is inside this map (three maps on the page: not on window) */
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') open(Math.min(pts.length, active + 1))
    else if (e.key === 'ArrowRight') open(Math.max(1, active - 1))
  }

  return (
    <div className="ch11-mapsec">
      <div className="ch11-flow">
        {stops.slice(0, first).map((st, k) => <Blocks key={k} blocks={st.blocks} />)}
      </div>
      {/* no className that changes with state here: React would wipe the reveal's is-inview */}
      <div className="ch11-stage" data-reveal ref={stageRef} onKeyDown={onKey}>
        <div className="ch11-mapbox">
          <Relief stops={views} active={active} regions={REGIONS} arc={arc} />
        </div>
        {pts.map((p, i) => (
          <details
            key={i}
            className="ch11-pop"
            open={active === i + 1}
            onToggle={(e) => {
              /* the search opens a card holding a hit: fly there. A card never closes by itself */
              if ((e.currentTarget as HTMLDetailsElement).open) setActive(i + 1)
            }}
          >
            <summary className="ch11-pop-head" onClick={(e) => e.preventDefault()}>
              <b>{points[i].name}</b>
              {points[i].sub && <span>{points[i].sub}</span>}
            </summary>
            <div className="ch11-pop-body">
              {p.stops.map((k) => <Blocks key={k} blocks={stops[k].blocks} />)}
            </div>
            <nav className="ch11-pop-nav" aria-label="מעבר בין הנקודות במפה">
              <button type="button" disabled={i === 0} aria-label="הקודם" onClick={() => open(i)}>→</button>
              <span>{i + 1} / {pts.length}</span>
              <button type="button" disabled={i === pts.length - 1} aria-label="הבא" onClick={() => open(i + 2)}>←</button>
            </nav>
          </details>
        ))}
      </div>
      <div className="ch11-flow">
        {stops.slice(last + 1).map((st, k) => <Blocks key={k} blocks={st.blocks} />)}
      </div>
    </div>
  )
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

function Section({ id, children }: { id: string; children?: React.ReactNode }) {
  const s = meta(id)
  return (
    <section className={'article-section' + (id === SECTION_ORDER[0] ? ' opening-section' : '')} id={id} aria-labelledby={`${id}-title`}>
      {children}
      <Head id={id} />
      {s.mode === 'map' ? <MapSection id={id} /> : <div className="ch11-body"><Blocks blocks={s.blocks ?? []} /></div>}
    </section>
  )
}

export default function Chapter11() {
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
    try { setCollapsed(localStorage.getItem('ch11:side-collapsed') === '1') } catch {}
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('ch11:side-collapsed', next ? '1' : '0') } catch {}
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
      <MarkToNotebook ch={11} />
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
            <span className="menu-sub">{CH11.menuTitle}</span>
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
            <main className="chapter-article ch11-article" ref={articleRef}>
              {/* ============ 01 · a way of life, a religion of law ============ */}
              <Section id="way">
                {/* the banner: the relief itself, low over the Mediterranean, bright (rule 42) */}
                <div className="ch6-hero">
                  <div className="ch6-hero-media" aria-hidden="true" style={{ backgroundImage: `url('${ART}hero-1.jpg')` }} />
                  <div className="ch6-hero-copy">
                    <h1 id="chapter-title" className="ch6-hero-title">{CH11.title}</h1>
                  </div>
                </div>
              </Section>
              {/* ============ 02 · the four sources ============ */}
              <Section id="sources" />
              {/* ============ 03–05 · the map beside the text ============ */}
              <Section id="schools" />
              <Section id="wasatiyya" />
              <Section id="salafiyya" />

              {/* the close, identical in every chapter (rule 33) */}
              <div className="chapter-end" ref={endRef} id="chapter-end" data-reveal>
                <Link className="chapter-end-back" href="/chapter11/practice">לתרגול המסכם</Link>
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
