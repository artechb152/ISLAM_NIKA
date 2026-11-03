'use client'

/* Chapter 10 — זרמים שונים באסלאם.

   Same product as chapters 2, 5, 6, 8 and 9: masthead, rail, type scale, reveal and every
   colour come from chapter6-article.css, which the route layout loads first;
   chapter10-article.css adds only this chapter's devices.

   THE SHAPE — five sections, each one SPLIT: the Alawites and the Druze side by side, two
   symmetric columns, one small round painting on the gold line between them (approved by
   the user 3.11.2026 after three demos — a one-column article like 2–9 was „not another
   article like all the rest", a card deck and a full-bleed half-screen were both struck;
   concept/chapter10/DECISIONS.md). The masthead, rail, headings and close are the shared ones.

   AND NO CHECKS. Every question lives at /chapter10/practice.

   WHAT THIS FILE MAY NOT DO: write a sentence. Every string comes from passages.json
   through text(), addressed by its §N.fragment, and concept/chapter10/verify-chapter10.mjs
   fails if a fragment is printed twice or dropped. Device labels are cut out of a
   fragment's own sentence ({from, cut}, rule 27) and checked by the same gate. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import MarkToNotebook from '@/components/MarkToNotebook'
import { CH10, em, frag, text, tr } from '@/lib/chapter10/content'
import layoutData from '@/lib/chapter10/layout.json'
import {
  completedSections,
  markContentComplete,
  markSectionDone,
  practiceComplete,
  resumeSectionId,
  saveCurrentSection,
  SECTION_ORDER,
} from '@/lib/chapter10/progress'

const ART = '/assets/chapter10/'

/** a device label: words cut out of one fragment's sentence (rule 27) */
interface Cut { from: string; cut: string[] }
type SideKey = 'a' | 'd'
interface Side {
  title: string
  img?: string
  slots: Record<string, string[]>
  origins?: Cut[]
  pair?: { name: Cut; say: Cut }[]
  years?: Cut[]
}
interface LayoutSection {
  id: string
  title: string
  term: string
  a: Side
  d: Side
  meet?: { cut: Cut; slots: Record<SideKey, string[]> }
  solo?: { side: SideKey; rows: { cut: Cut; refs: string[] }[] }
}
const LAYOUT = layoutData as unknown as { sections: LayoutSection[] }
const SECTIONS = LAYOUT.sections
const SIDE_NAME: Record<SideKey, string> = { a: 'העלאוים', d: 'הדרוזים' }

const meta = (id: string): LayoutSection => {
  const s = SECTIONS.find((x) => x.id === id)
  if (!s) throw new Error(`chapter 10: unknown section ${id}`)
  return s
}
/** the refs of one slot, read from layout.json — the JSX names the slot, never the refs,
    so the gate's „exactly once" walk over layout.json is a walk over what is printed */
const slot = (sectionId: string, side: SideKey, name: string): string[] => {
  const refs = meta(sectionId)[side].slots[name]
  if (!refs) throw new Error(`chapter 10: unknown slot ${sectionId}/${side}/${name}`)
  return refs
}

/** The words of a device label, checked against the sentence they are cut from. Throws on
    drift, so a label can never quietly say something its fragment does not (rule 27). */
const pick = ({ from, cut }: Cut): string[] => {
  const t = frag(from).text ?? ''
  for (const c of cut) if (!t.includes(c)) throw new Error(`chapter 10: label "${c}" is not in ${from}`)
  return cut
}
const one = (c: Cut): string => pick(c)[0]

/* ---------------- text primitives (chapter 9's) ---------------- */

/** Paint the fragment's marked phrases inside its own sentence, leaving every other
    character alone: `.key` maroon — the idea; `.ch10-tr` gold — a term being taught
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
    if (!found && process.env.NODE_ENV !== 'production') console.error(`chapter 10: ${key} — "${phrase}" not painted`)
    parts = next
  }
  return parts
}

const bold = (cls: string): Paint =>
  function paintBold(phrase, k) { return <b className={cls} key={k}>{phrase}</b> }

const marks = (r: string) => [
  { phrases: em(r), paint: bold('key') },
  { phrases: tr(r), paint: bold('ch10-tr') },
]

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
function T({ s, side, n, className }: { s: string; side: SideKey; n: string; className?: string }) {
  return <>{paras(slot(s, side, n)).map((g) => <p className={className} data-reveal key={g[0]}>{sentences(g)}</p>)}</>
}

/** The section heading, part for part as chapter 6 sets it. A term that is a span of
    years is numbers, not Arabic, and runs LTR so it does not flip. */
function Head({ id }: { id: string }) {
  const s = meta(id)
  const years = /^[\d–\-\s]+$/.test(s.term)
  return (
    <header className="section-heading" data-reveal>
      <div>
        <h2 id={`${id}-title`}>{s.title}</h2>
        {years
          ? <span className="section-term is-years" dir="ltr">{s.term}</span>
          : <span className="section-term" lang="ar" dir="rtl">{s.term}</span>}
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

/** The page-wide state of the split: which side the reader follows (null = both), and the
    painting open in the viewer. */
const SplitCtx = createContext<{ focus: SideKey | null; setFocus: (k: SideKey | null) => void; open: (src: string) => void }>({
  focus: null, setFocus: () => {}, open: () => {},
})

/** THE SPLIT — the chapter's one shape. The Alawites on the right, the Druze on the left,
    two equal columns that mirror each other, a small painting at the head of each, a gold
    line between them (the user, 3.11.2026: „סימטרי — תמונות לא במסך מלא, רק משהו קטן";
    then „חסר לי קצת תמונות ואינטרקציות בקטנה"). The column names ride a bar that sticks
    under the masthead; pressing one follows that side alone, „שניהם" brings both back. */
function Split({ id, a, d }: { id: string; a: React.ReactNode; d: React.ReactNode }) {
  const s = meta(id)
  const { focus, setFocus, open } = useContext(SplitCtx)
  const col = (k: SideKey, body: React.ReactNode) => (
    <div className={`ch10-col is-${k}`}>
      <span className="ch10-col-name">{SIDE_NAME[k]}</span>
      <h3 className="ch10-col-title" data-reveal>{s[k].title}</h3>
      {s[k].img && (
        <button type="button" className="ch10-pic" data-reveal onClick={() => open(s[k].img!)} aria-label={`הגדלת התמונה — ${s[k].title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ART}${s[k].img}.jpg`} alt="" loading="lazy" />
        </button>
      )}
      {body}
    </div>
  )
  const name = (k: SideKey) => (
    <button type="button" className={`is-${k}`} aria-pressed={focus === k} onClick={() => setFocus(focus === k ? null : k)}>
      {SIDE_NAME[k]}
    </button>
  )
  return (
    <div className="ch10-split">
      <div className="ch10-sides">
        {name('a')}
        {focus
          ? <button type="button" className="ch10-both" onClick={() => setFocus(null)}>שניהם</button>
          : <i aria-hidden="true" />}
        {name('d')}
      </div>
      {col('a', a)}
      <div className="ch10-mid" aria-hidden="true"><i /></div>
      {col('d', d)}
    </div>
  )
}

/** the painting, large — a click anywhere or Esc closes it */
function Viewer({ src, onClose }: { src: string | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement | null>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (src && !d.open) d.showModal()
    if (!src && d.open) d.close()
  }, [src])
  return (
    <dialog ref={ref} className="ch10-viewer" onClose={onClose} onClick={onClose} aria-label="תמונה מוגדלת">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={`${ART}${src}.jpg`} alt="" />}
      <span className="ch10-viewer-x" aria-hidden="true">✕</span>
    </dialog>
  )
}

/** A beat both columns share — one year, one sentence from each side, on the gold line.
    The year is cut from its own sentence; nothing joins the two but the page. */
function Meet({ id }: { id: string }) {
  const m = meta(id).meet!
  return (
    <div className="ch10-meet" data-reveal>
      <b className="ch10-meet-year">{one(m.cut)}</b>
      {(['a', 'd'] as const).map((k) => (
        <p key={k} className={`ch10-meet-line is-${k}`}><span className={`ch10-meet-side is-${k}`}>{SIDE_NAME[k]}</span>{sentences(m.slots[k])}</p>
      ))}
    </div>
  )
}

/** What only one side has — here the Druze after 2015, which the source does not pair with
    anything Alawite. Set under the split in its own side's column, a year beside each passage
    (the user, 3.11.2026: „פה עמוס מידי", then „שיהיה בצד של הדרוזים"). Each year is cut from its
    own sentence. */
function Solo({ id }: { id: string }) {
  const { side, rows } = meta(id).solo!
  return (
    <div className="ch10-solo-wrap">
      <div className={`ch10-solo is-${side}`}>
        {rows.map((r) => (
          <div className="ch10-solo-row" key={r.refs[0]} data-reveal>
            <b className="ch10-solo-year">{one(r.cut)}</b>
            <div>{paras(r.refs).map((g) => <p key={g[0]}>{sentences(g)}</p>)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** One card per fragment; its marker is words cut from that same fragment. Used for the
    three origins of the name „נצירים" (§0), where the marker is the source's own degree of
    certainty — „יתכן", „ויתכן", „ככל הנראה" — and nothing ranks them but those words. */
function Cards({ s, side, n }: { s: string; side: SideKey; n: string }) {
  const refs = slot(s, side, n)
  const m = meta(s)[side].origins!
  if (refs.length !== m.length) throw new Error(`chapter 10: ${s}/${n} needs one marker per fragment`)
  return (
    <div className="ch10-cards" data-reveal style={{ ['--n' as string]: refs.length }}>
      {refs.map((r, k) => (
        <article className="ch10-card" key={r}><b className="ch10-card-m">{one(m[k])}</b><p>{sentences([r])}</p></article>
      ))}
    </div>
  )
}

/** חאצה / עאמה — two equal cards, the name and its gloss both cut from §2.secret, which
    is printed whole just above them. */
function Pair() {
  return (
    <div className="ch10-cards is-two" data-reveal style={{ ['--n' as string]: 2 }}>
      {meta('faith').a.pair!.map((c) => (
        <article className="ch10-card" key={one(c.name)}>
          <b className="ch10-card-m is-tr">{one(c.name)}</b>
          <p>{one(c.say)}</p>
        </article>
      ))}
    </div>
  )
}

/** 1021 and 1037 — the two years §7 names, one gold line between them. Not a ratio bar:
    nothing is measured against anything. Both numbers are cut from their own sentences. */
function Years() {
  const [a, b] = meta('ordeal').d.years!
  return (
    <div className="ch10-years" data-reveal aria-hidden="true">
      <b>{one(a)}</b><i /><b>{one(b)}</b>
    </div>
  )
}

export default function Chapter10() {
  const router = useRouter()
  const articleRef = useRef<HTMLElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const jumpUntil = useRef(0)
  const [drawer, setDrawer] = useState(false)
  const [focus, setFocus] = useState<SideKey | null>(null)
  const [pic, setPic] = useState<string | null>(null)
  const split = useMemo(() => ({ focus, setFocus, open: setPic }), [focus])
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
    try { setCollapsed(localStorage.getItem('ch10:side-collapsed') === '1') } catch {}
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('ch10:side-collapsed', next ? '1' : '0') } catch {}
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
      <MarkToNotebook ch={10} />
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
            <span className="menu-sub">{CH10.menuTitle}</span>
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
            <SplitCtx.Provider value={split}>
            <main className="chapter-article" ref={articleRef} data-focus={focus ?? undefined}>

              {/* ============ 01 · the name and the origin ============ */}
              <Section id="roots" className="opening-section">
                {/* the banner: the Ansariyya mountains above the Latakia coast, bright morning
                    (rule 42); a static frame where one small thing moves, on a loop */}
                <div className="ch6-hero">
                  <div className="ch6-hero-media" aria-hidden="true" style={{ backgroundImage: `url('${ART}hero-1.jpg')` }}>
                    <video className="ch6-hero-video" autoPlay muted loop playsInline preload="auto" poster={`${ART}hero-1.jpg`} tabIndex={-1} onError={(e) => { e.currentTarget.hidden = true }}>
                      <source src={`${ART}hero.mp4`} type="video/mp4" />
                    </video>
                  </div>
                  <div className="ch6-hero-copy">
                    <h1 id="chapter-title" className="ch6-hero-title">{CH10.title}</h1>
                  </div>
                </div>
                <Head id="roots" />
                <Split
                  id="roots"
                  a={<><T s="roots" side="a" n="lead" /><Cards s="roots" side="a" n="origins" /></>}
                  d={<T s="roots" side="d" n="lead" />}
                />
              </Section>

              {/* ============ 02 · faith and rite ============ */}
              <Section id="faith">
                <Head id="faith" />
                <Split
                  id="faith"
                  a={<><T s="faith" side="a" n="lead" /><T s="faith" side="a" n="secret" /><Pair /><T s="faith" side="a" n="qiddas" /></>}
                  d={<><T s="faith" side="d" n="lead" /><T s="faith" side="d" n="shuayb" /></>}
                />
              </Section>

              {/* ============ 03 · persecution and disappearance ============ */}
              <Section id="ordeal">
                <Head id="ordeal" />
                <Split
                  id="ordeal"
                  a={<><T s="ordeal" side="a" n="lead" /><T s="ordeal" side="a" n="fatwa" className="ch10-quote" /></>}
                  d={<><T s="ordeal" side="d" n="vanish" /><Years /><T s="ordeal" side="d" n="closed" /></>}
                />
              </Section>

              {/* ============ 04 · the Ottomans and the Mandate ============ */}
              <Section id="empire">
                <Head id="empire" />
                <Split
                  id="empire"
                  a={<T s="empire" side="a" n="lead" />}
                  d={<><T s="empire" side="d" n="apart" /><T s="empire" side="d" n="lead" /></>}
                />
                <Meet id="empire" />
              </Section>

              {/* ============ 05 · the state of Syria ============ */}
              <Section id="modern">
                <Head id="modern" />
                <Split
                  id="modern"
                  a={<T s="modern" side="a" n="lead" />}
                  d={<T s="modern" side="d" n="lead" />}
                />
                <Solo id="modern" />
              </Section>

              {/* the close, identical in every chapter (rule 33) */}
              <div className="chapter-end" ref={endRef} id="chapter-end" data-reveal>
                <Link className="chapter-end-back" href="/chapter10/practice">לתרגול המסכם</Link>
                {practiceDone && <span className="chapter-end-done">הושלם</span>}
              </div>
            </main>
            <Viewer src={pic} onClose={() => setPic(null)} />
            </SplitCtx.Provider>
          </div>
        </div>
      </div>
    </div>
  )
}
