'use client'

/* Chapter 4 — ראשית חיי מוחמד.

   Same product as chapters 2 and 6: the masthead, the collapsible rail, the type
   scale, the reveal behaviour and every colour come from chapter6-article.css,
   which the route layout loads first. chapter4-article.css adds only this
   chapter's own devices and declares no colour, no font and no radius.

   THE SHAPE. Eight sections — exactly the eight running heads the source
   prints, in the order the document gives them. The source is 1,627 words,
   1.7× chapter 2, and it gets FEWER devices, not more: three, one of them
   interactive. The recurring finding in concept/chapter2/DECISIONS.md is that
   most of this material needs to be printed rather than installed, and this
   chapter's subject — a prophet, an angel, a miraculous mount, seven heavens —
   makes almost every pictorial device religiously impossible. See
   concept/chapter4/STRUCTURE.md for the full argument, including why a timeline
   was refused even though the material is genuinely chronological.

   WHAT THIS FILE MAY NOT DO: write a sentence of the chapter. Every content
   string comes from passages.json through `text()` / `list()` / `nameOf()`,
   addressed by the §N.fragment it belongs to. UI strings — an aria-label, the
   menu's own words — are this file's to write; the chapter's words are not.
   concept/chapter4/verify-chapter4.mjs fails if a fragment is printed twice or
   dropped. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import { CH4, frag, list, text } from '@/lib/chapter4/content'
import layoutData from '@/lib/chapter4/layout.json'
import {
  completedSections,
  markContentComplete,
  markSectionDone,
  resumeSectionId,
  saveCurrentSection,
  SECTION_ORDER,
} from '@/lib/chapter4/progress'

interface Sub {
  id: string
  title: string
  term?: string
}
interface LayoutSection {
  id: string
  title: string
  subs?: Sub[]
}
const LAYOUT = layoutData as unknown as { sections: LayoutSection[] }
const SECTIONS = LAYOUT.sections
/** the five parts — their titles are data, never literals in JSX */
const PARTS = (layoutData as unknown as { parts: { id: string; title: string }[] }).parts

const meta = (id: string): LayoutSection => {
  const s = SECTIONS.find((x) => x.id === id)
  if (!s) throw new Error(`chapter 4: unknown section ${id}`)
  return s
}

/* ---------------- text primitives ----------------
   Lifted from Chapter2.tsx unchanged. They are chapter-agnostic once `content`
   and `layout` are swapped, and the three copies (2, 3 and 6) are booked to be
   folded into one module after this chapter stands. */

/** „(§3.aside)" — a fragment the source prints in brackets at the END of the
    sentence before it. The preceding sentence gives up its full stop, the
    remark goes in brackets, and the stop is set after the closing bracket.
    ONLY for a remark that closes its sentence: §1, §18 and §23 each carry a
    bracketed remark MID-sentence, where this would put a full stop in the
    middle of a clause, and they are held in passages.json as one fragment
    apiece for exactly that reason. */
const PARENTHETICAL = /^\((§\d+\.[\w-]+)\)$/

/** „|§31.a" — a fragment that starts its own line inside the same paragraph. */
const OWN_LINE = /^\|(§\d+\.[\w-]+)$/

/** A SHORT emphasised phrase is one name and must not break across two lines.
    Up to three words are bound with non-breaking spaces; anything longer is a
    clause, not a name, and is left free to wrap. The character is whitespace to
    `split(/\s+/)` and to the gates' `flat()`, so no measurement moves. */
const NBSP = ' '
const bindShort = (phrase: string): string =>
  phrase.split(' ').length <= 3 ? phrase.replace(/ /g, NBSP) : phrase

/** Bold every `em` phrase inside one line, leaving the rest as it is. */
function emphasise(s: string, em: string[], keyBase: string): React.ReactNode[] {
  if (!em.length) return [s]
  const parts: React.ReactNode[] = []
  let rest = s
  let k = 0
  while (rest.length) {
    let at = -1
    let hit = ''
    for (const phrase of em) {
      const i = rest.indexOf(phrase)
      if (i >= 0 && (at < 0 || i < at)) {
        at = i
        hit = phrase
      }
    }
    if (at < 0) {
      parts.push(rest)
      break
    }
    if (at > 0) parts.push(rest.slice(0, at))
    parts.push(
      <b className="key" key={`${keyBase}-${k++}`}>
        {bindShort(hit)}
      </b>,
    )
    rest = rest.slice(at + hit.length)
  }
  return parts
}

/** Verbatim sentences set as ONE paragraph. Adjacent source sentences belong in
    one paragraph — that is what keeps words-per-paragraph above the floor the
    audit holds the chapter to. */
function T({
  r,
  em = [],
  className,
  reveal = false,
}: {
  r: string | string[]
  em?: string[]
  className?: string
  reveal?: boolean
}) {
  const refs = Array.isArray(r) ? r : [r]
  const lines: { text: string; intro?: boolean; item?: boolean }[] = []
  let run = ''
  const flush = () => {
    if (run) {
      lines.push({ text: run })
      run = ''
    }
  }
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i]
    const par = PARENTHETICAL.exec(ref)
    if (par) {
      /* the last two words of the remark are bound, so the closing bracket
         cannot be left holding one word alone at the start of a line */
      const inner = text(par[1])
        .replace(/\s*\.\s*$/, '')
        .replace(/ (\S+)$/, `${NBSP}$1`)
      run = `${run.replace(/\s*\.\s*$/, '')} (${inner}).`
      continue
    }
    const own = OWN_LINE.exec(ref)
    if (own) {
      flush()
      lines.push({ text: text(own[1]) })
      continue
    }
    if (frag(ref).list) {
      flush()
      for (const item of list(ref)) lines.push({ text: item, item: true })
      continue
    }
    const next = refs[i + 1]
    if (next && !PARENTHETICAL.test(next) && !OWN_LINE.test(next) && frag(next).list) {
      flush()
      lines.push({ text: text(ref), intro: true })
      continue
    }
    run = run ? `${run} ${text(ref)}` : text(ref)
  }
  flush()

  const rv = reveal ? { 'data-reveal': true } : {}
  const out: React.ReactNode[] = []
  lines.forEach((line, i) => {
    if (line.intro) {
      if (i) out.push(' ')
      out.push(
        <span className="ch4-intro" key={`i${i}`}>
          {emphasise(line.text, em, `l${i}`)}
        </span>,
        ' ',
      )
      return
    }
    if (i && !lines[i - 1].intro) out.push(<br key={`br-${i}`} />, ' ')
    if (line.item) {
      out.push(
        <span className="ch4-item" key={`it${i}`}>
          {emphasise(line.text, em, `l${i}`)}
        </span>,
      )
      return
    }
    out.push(...emphasise(line.text, em, `l${i}`))
  })
  return (
    <p className={className} {...rv}>
      {out}
    </p>
  )
}

/** The source's own name for a person (אברהה, אבו טאלב, אדם…). Never a literal. */
const nameOf = (r: string): string => {
  const n = frag(r).name
  if (!n) throw new Error(`chapter 4: ${r} carries no name`)
  return n
}


/* ---------------- structure ---------------- */

/** The section heading — chapter 6's `.section-heading` with its diamond.
    One ornament per heading and nowhere else; the audit fails on a loose one. */
function Head({ id }: { id: string }) {
  return (
    <header className="section-heading" data-reveal>
      <div>
        <h2 id={`${id}-title`}>{meta(id).title}</h2>
      </div>
      <div className="title-ornament section-ornament" aria-hidden="true">
        <span />
      </div>
    </header>
  )
}

function Section({
  id,
  className = '',
  children,
}: {
  id: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={`article-section ${className}`} id={id} aria-labelledby={`${id}-title`}>
      {children}
    </section>
  )
}

/* ---------------- the two set-apart voices ----------------

   The chapter quotes the Quran SIX times, and the audit allows a costume two
   uses. They cannot be split into three costumes: it is one voice, and giving
   one verse a frame and another a plain rule would assert a hierarchy among
   revealed text that the source does not make.

   The test comes from chapter 2's decision on terms — „the source defines each
   term INSIDE the sentence, so it stays inside the sentence". Applied to the
   verses: four of the six are printed by the booklet as subordinate clauses
   („שם אללה שואל את נביאו:", „למשל:", „כדבריהם", „מרומז"), and they stay in
   their sentences, emphasised, with no costume at all. Only the two the EVENT
   rests on stand alone. */

/** The founding verse. Two uses, and there is no third: §19 (sura 96, the first
    words revealed) and §42 (17:1, which the source introduces in plain terms
    rather than as a hint). */
function Verse({ r }: { r: string }) {
  return (
    <blockquote className="ch4-verse" data-reveal>
      {text(r)}
    </blockquote>
  )
}

/** The chapter's only present-tense voice. Two uses, and the symmetry IS the
    design: §4 opens the loop out of the seventh century and §43 closes it. A
    third would break the pair and fail the gate in the same stroke. */
function Statement({ r }: { r: string }) {
  return (
    <p className="ch4-statement" data-reveal>
      {text(r)}
    </p>
  )
}


/* ---------------- chapter 4's own devices ----------------

   Five, and every one of them is markup around sentences that already exist in
   passages.json. None of them composes a word. The two that STRUCTURE.md asks
   for and this file does NOT yet build are the map-timeline and the trench
   diagram: both need artwork that has not been commissioned, and a placeholder
   drawing would assert a geography the source does not give. Until they exist,
   their sections print their sentences in full — nothing is withheld from the
   reader, only from the page's decoration. */

/** The head of one of the five parts. Its title is data, from layout.json. */
function PartHead({ id }: { id: string }) {
  const p = PARTS.find((x) => x.id === id)
  if (!p) throw new Error(`chapter 4: unknown part ${id}`)
  return (
    <h2 className="ch4-part" id={`part-${id}`} data-reveal>
      {p.title}
    </h2>
  )
}

/** One of the four groups of §3. The source names two of them and describes
    all four; a card with no name prints its sentence alone rather than invent
    a label for it. */
function Card({ r }: { r: string }) {
  const f = frag(r)
  return (
    <article className="ch4-card">
      {f.name && <h3 className="ch4-card-name">{f.name}</h3>}
      <p className="ch4-card-text">{text(r)}</p>
    </article>
  )
}

/** „איפה זה פוגש אותנו" — the modern echo, held apart from the tradition it
    echoes. This is the chapter's one recurring visual distinction and it earns
    its place: half the material is seventh-century narrative and half is what
    was done with it in the last fifty years, and a reader must never have to
    guess which one they are reading. Five uses: §6, §15, §16, §22, §47. */
function Echo({ children }: { children: React.ReactNode }) {
  return (
    <aside className="ch4-echo" data-reveal>
      {children}
    </aside>
  )
}

/** The force balance. TWICE in the chapter and there is no third: Badr is 300
    against 1000 and Uhud is 1000 against 3000, and the REVERSAL is the whole
    argument. A third use would make it a habit instead of a point.

    No bars yet. A bar needs a number lifted out of the sentence and set to a
    width, and a width is a claim about proportion that has to be looked at
    before it is trusted — which cannot be done while the dev server is held.
    The two sentences stand side by side, which is already the comparison. */
function Forces({ muslims, other }: { muslims: string; other: string }) {
  return (
    <div className="ch4-forces" data-reveal>
      <p className="ch4-force ch4-force-a">{text(muslims)}</p>
      <p className="ch4-force ch4-force-b">{text(other)}</p>
    </div>
  )
}

/** הודנה and מצלחה. The two terms that carry chapter 4's argument across a
    thousand years — part ג׳ defines them and part ה׳ is people arguing about
    them — and the source defines both INSIDE a sentence, so the card holds the
    sentence whole rather than splitting term from gloss. */
function Definition({ r }: { r: string }) {
  const f = frag(r)
  return (
    <div className="ch4-def" data-reveal>
      {f.term && <span className="ch4-def-term">{f.term}</span>}
      <p className="ch4-def-text">{text(r)}</p>
    </div>
  )
}


export default function Chapter4() {
  const router = useRouter()
  const articleRef = useRef<HTMLElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [currentSection, setCurrentSection] = useState(SECTION_ORDER[0])
  const [currentSub, setCurrentSub] = useState<string | null>(null)
  const [doneSections, setDoneSections] = useState<Set<string>>(new Set())
  const jumpUntil = useRef(0)

  useEffect(() => {
    setDoneSections(new Set(completedSections()))
    jumpUntil.current = Date.now() + 1500
    /* a URL the reader asked for beats the resume point */
    const resume = window.location.hash ? null : resumeSectionId()
    if (resume) {
      jumpUntil.current = Date.now() + 2000
      requestAnimationFrame(() => {
        document.getElementById(resume)?.scrollIntoView({ behavior: 'auto', block: 'start' })
      })
    }
  }, [])

  useEffect(() => {
    const nodes = SECTION_ORDER.map((id) => document.getElementById(id)).filter(
      (n): n is HTMLElement => !!n,
    )
    if (!nodes.length) return
    const centre = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          setCurrentSection(e.target.id)
          if (Date.now() >= jumpUntil.current) saveCurrentSection(e.target.id)
        }
      },
      { rootMargin: '-42% 0px -42% 0px', threshold: 0 },
    )
    /* a section is finished only when the reader SCROLLS into the next one */
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
    nodes.forEach((n) => {
      centre.observe(n)
      completion.observe(n)
    })
    return () => {
      centre.disconnect()
      completion.disconnect()
    }
  }, [])

  /* which MOVEMENT the reader is in — nine sub-headings sit in the rail, and
     without this they are links that never say where you are */
  useEffect(() => {
    const subs = SECTIONS.flatMap((s) => (s.subs ?? []).map((x) => x.id))
    const nodes = subs.map((id) => document.getElementById(id)).filter((n): n is HTMLElement => !!n)
    if (!nodes.length) return
    const read = () => {
      const line = window.innerHeight * 0.34
      let active: string | null = null
      for (const n of nodes) {
        const r = n.getBoundingClientRect()
        const sec = n.closest('.article-section')?.getBoundingClientRect()
        if (r.top <= line && sec && sec.bottom > line) active = n.id
      }
      setCurrentSub((cur) => (cur === active ? cur : active))
    }
    const io = new IntersectionObserver(read, { rootMargin: '0px', threshold: [0, 0.5, 1] })
    nodes.forEach((n) => io.observe(n))
    window.addEventListener('scroll', read, { passive: true })
    read()
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', read)
    }
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
      (entries) => {
        for (const e of entries) e.target.classList.toggle('is-inview', e.isIntersecting)
      },
      { rootMargin: '-6% 0px -6% 0px', threshold: 0 },
    )
    root.querySelectorAll('[data-reveal]').forEach((n) => io.observe(n))
    return () => {
      io.disconnect()
      root.classList.remove('js-reveal')
    }
  }, [])

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('ch4:side-collapsed') === '1')
    } catch {}
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try {
        localStorage.setItem('ch4:side-collapsed', next ? '1' : '0')
      } catch {}
      return next
    })
  }, [])
  const onMenuJump = useCallback(() => {
    jumpUntil.current = Date.now() + 1800
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
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6.5h16M4 12h16M4 17.5h16" />
              </svg>
            </button>
            <button
              type="button"
              className="chapter-logo"
              onClick={() => router.push('/chapters')}
              aria-label="חזרה לעמוד הפרקים"
            >
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
          className={
            'chapter-drawer' + (drawer ? ' is-open' : '') + (collapsed ? ' is-collapsed' : '')
          }
          aria-label="תפריט הפרק"
          aria-hidden={!isDesktop && !drawer ? true : undefined}
          inert={!isDesktop && !drawer}
        >
          <div className="menu-head">
            <button
              type="button"
              className="menu-close"
              aria-label="סגירת התפריט"
              onClick={() => setDrawer(false)}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
            {/* a <p>, not an <h2>: the drawer sits before the article in the DOM,
                so as a heading it would put an H2 ahead of the page's own H1 */}
            <p className="menu-title">תוכן הפרק</p>
            <span className="menu-sub">{CH4.menuTitle}</span>
          </div>
          <nav className="chapter-menu-nav" aria-label="ניווט בפרק">
            <ol>
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={currentSection === s.id ? 'is-current' : undefined}
                    aria-current={currentSection === s.id ? 'true' : undefined}
                    onClick={() => {
                      onMenuJump()
                      setDrawer(false)
                    }}
                  >
                    <span className="menu-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="menu-label">{s.title}</span>
                    {doneSections.has(s.id) && (
                      <svg className="menu-done" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12.5 10 17.5 19 7.5" />
                      </svg>
                    )}
                  </a>
                  {/* the sub-headings ride under their section, as chapter 6's rail
                      does. Here they are PLAIN ANCHORS — this chapter has no
                      dialogs, so the fragment jump is the whole behaviour and
                      nothing has to be prevented. */}
                  {s.subs && (
                    <ul className="menu-subs">
                      {s.subs.map((sb) => (
                        <li key={sb.id}>
                          <a
                            href={`#${sb.id}`}
                            className={currentSub === sb.id ? 'is-current' : undefined}
                            aria-current={currentSub === sb.id ? 'true' : undefined}
                            onClick={() => {
                              onMenuJump()
                              setDrawer(false)
                            }}
                          >
                            {sb.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <div className="menu-extra">
            <Link className="menu-x-item" href="/chapters" onClick={() => setDrawer(false)}>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
              לכל פרקי הלמידה
            </Link>
          </div>
        </aside>
        {drawer && (
          <div className="chapter-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />
        )}

        <div className="chapter-content">
          <div className="chapter-layout">
            <main className="chapter-article" ref={articleRef}>
              {/* ============ פתיחה · למה הוא נאלץ לעזוב ============
                  הבאנר נושא את הדרך צפונה. §0.b הוא משפט המפתח — שתים־עשרה
                  שנים שלא הצליחו — והוא היחיד בחלק הזה שיוצא מהעמודה. */}
              <Section id="leaving" className="opening-section">
                <div className="ch4-hero">
                  <div className="ch4-hero-media" aria-hidden="true">
                    <video
                      className="ch4-hero-video"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      poster="/assets/chapter4/hero-road.jpg"
                      tabIndex={-1}
                    >
                      <source src="/assets/chapter4/hero-road.mp4" type="video/mp4" />
                    </video>
                  </div>
                  <div className="ch4-hero-copy">
                    <h1 className="ch4-hero-title">{CH4.title}</h1>
                  </div>
                </div>
                <Head id="leaving" />
                <T r="§0.a" className="ch4-body" reveal />
                <Statement r="§0.b" />
              </Section>

              {/* ============ חלק א׳ · ההגירה ============ */}
              <PartHead id="hijra" />

              {/* §2 נושא שתי גרסאות של אותו אירוע, והמקור לא מכריע ביניהן.
                  שתי הפסקאות עומדות זו מול זו ולא זו אחרי זו, כדי שהקורא
                  יראה שזו מחלוקת ולא רצף. */}
              <Section id="road">
                <Head id="road" />
                <T r={['§1.a', '§1.b']} className="ch4-body" reveal />
                <div className="ch4-two" data-reveal>
                  <T r="§2.flight" className="ch4-body ch4-two-side" />
                  <T r="§2.invited" className="ch4-body ch4-two-side" />
                </div>
              </Section>

              {/* ארבע הקבוצות. רשימת הנפשות הפועלות של הפרק — כל מה שקורה
                  אחר כך, מהחוזה ועד ח'יבר, מדבר על אחת מהן. */}
              <Section id="groups">
                <Head id="groups" />
                <T r={['§3.a', '§3.b']} className="ch4-body" reveal />
                <div className="ch4-cards" data-reveal>
                  <Card r="§3.muhajirun" />
                  <Card r="§3.ansar" />
                  <Card r="§3.jews" />
                  <Card r="§3.quraysh" />
                </div>
              </Section>

              <Section id="covenant">
                <Head id="covenant" />
                <T r={['§4.a', '§4.b']} className="ch4-body" reveal />
                <T r={['§8.a', '§8.b']} className="ch4-body" reveal />
                <T r={['§8.c', '§8.d']} className="ch4-body" reveal />
              </Section>

              <Section id="meaning">
                <Head id="meaning" />
                <T r={['§5.a', '§5.b']} className="ch4-body" reveal />
                <Echo>
                  <T r={['§6.echo1', '§6.echo2']} className="ch4-body" />
                </Echo>
              </Section>

              <Section id="mosque">
                <Head id="mosque" />
                <T r={['§7.a', '§7.b', '§7.c']} className="ch4-body" reveal />
              </Section>

              {/* ============ חלק ב׳ · הקרבות ============ */}
              <PartHead id="battles" />

              {/* צומת הפרק. עד כאן הטפה, מכאן קרבות. */}
              <Section id="turn">
                <Head id="turn" />
                <Statement r="§9.a" />
                <T r={['§9.b', '§9.c']} className="ch4-body" reveal />
              </Section>

              {/* קרב בדר. מאזן הכוחות הוא המנגנון — 300 מול 1000 — והוא
                  יופיע שוב בקרב אֻחֻד ביחס הפוך. שם זו כל הנקודה. */}
              <Section id="badr">
                <Head id="badr" />
                <T r={['§10.a', '§10.b']} className="ch4-body" reveal />
                <T r="§11.a" className="ch4-body" reveal />
                <Forces muslims="§11.muslims" other="§11.quraysh" />
                <T r={['§12.rain', '§12.duel']} className="ch4-body" reveal />
                <T r={['§13.a', '§13.b']} className="ch4-body" reveal />
              </Section>

              <Section id="badr-quran">
                <Head id="badr-quran" />
                <T r="§14.a" className="ch4-body" reveal />
                <Verse r="§14.verse" />
                <T r="§15.a" className="ch4-body" reveal />
                <Verse r="§15.verse" />
                <Echo>
                  <T r="§15.echo" className="ch4-body" />
                </Echo>
              </Section>

              <Section id="ramadan">
                <Head id="ramadan" />
                <T r="§16.a" className="ch4-body" reveal />
                <Echo>
                  <T r="§16.echo" className="ch4-body" />
                </Echo>
              </Section>

              <Section id="uhud">
                <Head id="uhud" />
                <T r="§17.a" className="ch4-body" reveal />
                <Forces muslims="§17.muslims" other="§17.quraysh" />
                <T r={['§18.a', '§18.b']} className="ch4-body" reveal />
                <T r={['§19.a', '§19.b', '§19.c']} className="ch4-body" reveal />
              </Section>

              {/* בלי דימוי. §20.hind הוא הקשה בפרק והוא נשאר טקסט. */}
              <Section id="hamza">
                <Head id="hamza" />
                <T r="§20.a" className="ch4-body" reveal />
                <Verse r="§20.saying" />
                <T r={['§20.translit', '§20.hind']} className="ch4-body" reveal />
              </Section>

              <Section id="shahids">
                <Head id="shahids" />
                <T r={['§21.a', '§21.b']} className="ch4-body" reveal />
                <Verse r="§21.verse" />
                <Echo>
                  <T r="§22.echo" className="ch4-body" />
                </Echo>
              </Section>

              {/* קרב השוחה. הדיאגרמה — העיר, הצד הצפוני החשוף, החפירה —
                  היא הנכס היחיד בפרק שנבנה מאפס, והיא עוד לא קיימת.
                  עד שתיבנה, §24.trench מודפס כפסקה מלאה ואף מילה לא חסרה. */}
              <Section id="trench">
                <Head id="trench" />
                <T r="§23.a" className="ch4-body" reveal />
                <div className="ch4-two" data-reveal>
                  <T r="§23.cause1" className="ch4-body ch4-two-side" />
                  <T r="§23.cause2" className="ch4-body ch4-two-side" />
                </div>
                <T r={['§24.trench', '§24.storm']} className="ch4-body" reveal />
              </Section>

              <Section id="ahzab">
                <Head id="ahzab" />
                <T r="§25.a" className="ch4-body" reveal />
              </Section>

              {/* טיפוגרפיה שקטה. בלי דימוי, בלי מנגנון, טקסט מלא —
                  אותה הכרעה כמו ואד אלבנת בפרק 2. */}
              <Section id="qurayza" className="ch4-quiet">
                <Head id="qurayza" />
                <T r={['§26.a', '§26.b']} className="ch4-body" reveal />
              </Section>

              {/* ============ חלק ג׳ · ההסכם ============ */}
              <PartHead id="treaty" />

              <Section id="hudaybiyyah">
                <Head id="hudaybiyyah" />
                <T r={['§27.a', '§27.b']} className="ch4-body" reveal />
                <T r={['§28.a', '§28.b']} className="ch4-body" reveal />
              </Section>

              {/* על פניו כניעה — צריך לראות את שלושת הסעיפים כדי להבין למה. */}
              <Section id="terms">
                <Head id="terms" />
                <ol className="ch4-concessions" data-reveal>
                  <li>{text('§29.term1')}</li>
                  <li>{text('§29.term2')}</li>
                  <li>{text('§29.term3')}</li>
                </ol>
                <T r={['§30.a', '§30.b']} className="ch4-body" reveal />
              </Section>

              <Section id="hudna">
                <Head id="hudna" />
                <Definition r="§31.a" />
              </Section>

              {/* ============ חלק ד׳ · ההכרעה ============ */}
              <PartHead id="decision" />

              {/* §41.year — התאריך השגוי — מסומן omitted ואינו מודפס.
                  הגירוש מוצג ביחסו לקרב בדר, כפי שהמקור עצמו עושה לבני נדיר.
                  אין כאן תיקון של המקור ואין הדפסה של טעות. */}
              <Section id="three-tribes" className="ch4-quiet">
                <Head id="three-tribes" />
                <T r={['§41.qaynuqa', '§41.nadir']} className="ch4-body" reveal />
                <T r="§42.a" className="ch4-body" reveal />
                <T r={['§43.a', '§43.b']} className="ch4-body" reveal />
              </Section>

              <Section id="khaybar">
                <Head id="khaybar" />
                <T r={['§44.a', '§44.b']} className="ch4-body" reveal />
                <T r={['§45.a', '§45.b']} className="ch4-body" reveal />
                <T r={['§46.a', '§46.b', '§46.c']} className="ch4-body" reveal />
              </Section>

              {/* החריגה היחידה בפרק מכלל תעתיק עברי בלבד:
                  הסיסמה מופיעה בערבית במקור. */}
              <Section id="slogan">
                <Head id="slogan" />
                <T r="§47.a" className="ch4-body" reveal />
                <Echo>
                  <T r="§47.echo" className="ch4-body" />
                </Echo>
              </Section>

              <Section id="mecca">
                <Head id="mecca" />
                <T r={['§48.a', '§48.b']} className="ch4-body" reveal />
                <T r={['§49.a', '§49.b']} className="ch4-body" reveal />
              </Section>

              {/* סוף שקט. בלי מנגנון ובלי הלאה. */}
              <Section id="death" className="ch4-quiet">
                <Head id="death" />
                <T r={['§50.a', '§50.b']} className="ch4-body" reveal />
                <T r="§51.a" className="ch4-body" reveal />
              </Section>

              {/* ============ חלק ה׳ · חודיביה היום ============ */}
              <PartHead id="today" />

              <Section id="question">
                <Head id="question" />
                <T r={['§32.a', '§32.list', '§32.b']} className="ch4-body" reveal />
                <T r="§33.a" className="ch4-body" reveal />
              </Section>

              <Section id="maslaha">
                <Head id="maslaha" />
                <Definition r="§34.a" />
                <T r="§34.b" className="ch4-body" reveal />
              </Section>

              {/* שלוש עמדות, אותה תבנית. §36 נספח לכרטיס הראשון
                  ולא כרטיס רביעי. */}
              <Section id="rulings">
                <Head id="rulings" />
                <div className="ch4-rulings" data-reveal>
                  <article className="ch4-ruling">
                    <h3 className="ch4-ruling-name">{nameOf('§35.lead')}</h3>
                    <T r="§35.lead" className="ch4-body" />
                    <T r="§35.points" className="ch4-body" />
                    <T r="§36.a" className="ch4-body" />
                  </article>
                  <article className="ch4-ruling">
                    <h3 className="ch4-ruling-name">{nameOf('§37.lead')}</h3>
                    <T r="§37.lead" className="ch4-body" />
                    <T r="§37.point" className="ch4-body" />
                    <T r="§37.b" className="ch4-body" />
                  </article>
                  <article className="ch4-ruling">
                    <h3 className="ch4-ruling-name">{nameOf('§38.lead')}</h3>
                    <T r="§38.lead" className="ch4-body" />
                    <blockquote className="ch4-verse">{text('§38.quote')}</blockquote>
                  </article>
                </div>
              </Section>

              {/* החלק לא נסגר בהסכמה, וזו הנקודה. אין מקטע סיכום אחריו. */}
              <Section id="against">
                <Head id="against" />
                <T r="§39.a" className="ch4-body" reveal />
                <Verse r="§39.verse" />
                <T r={['§40.a', '§40.b']} className="ch4-body" reveal />
              </Section>

              <div className="ch4-end" ref={endRef} data-reveal>
                {/* אין עדיין /chapter4/practice. עד שיהיה, הסוגר מוביל
                    למקום שקיים ולא ל-404, ו-markChapterComplete נשאר ללא קורא
                    — בדיוק כפי שפרק 6 מגדיר: סיום הקריאה אינו סיום הפרק. */}
                <Link className="ch4-end-link" href="/chapters">
                  לכל פרקי הלמידה
                </Link>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
