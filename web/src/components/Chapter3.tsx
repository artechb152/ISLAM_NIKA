'use client'

/* Chapter 3 — ראשית חיי מוחמד.

   Same product as chapters 2 and 6: the masthead, the collapsible rail, the type
   scale, the reveal behaviour and every colour come from chapter6-article.css,
   which the route layout loads first. chapter3-article.css adds only this
   chapter's own devices and declares no colour, no font and no radius.

   THE SHAPE. Eight sections — exactly the eight running heads the source
   prints, in the order the document gives them. The source is 1,627 words,
   1.7× chapter 2, and it gets FEWER devices, not more: three, one of them
   interactive. The recurring finding in concept/chapter2/DECISIONS.md is that
   most of this material needs to be printed rather than installed, and this
   chapter's subject — a prophet, an angel, a miraculous mount, seven heavens —
   makes almost every pictorial device religiously impossible. See
   concept/chapter3/STRUCTURE.md for the full argument, including why a timeline
   was refused even though the material is genuinely chronological.

   WHAT THIS FILE MAY NOT DO: write a sentence of the chapter. Every content
   string comes from passages.json through `text()` / `list()` / `nameOf()`,
   addressed by the §N.fragment it belongs to. UI strings — an aria-label, the
   menu's own words — are this file's to write; the chapter's words are not.
   concept/chapter3/verify-chapter3.mjs fails if a fragment is printed twice or
   dropped. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import { CH3, frag, list, text } from '@/lib/chapter3/content'
import layoutData from '@/lib/chapter3/layout.json'
import {
  completedSections,
  markContentComplete,
  markSectionDone,
  resumeSectionId,
  saveCurrentSection,
  SECTION_ORDER,
} from '@/lib/chapter3/progress'

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

const meta = (id: string): LayoutSection => {
  const s = SECTIONS.find((x) => x.id === id)
  if (!s) throw new Error(`chapter 3: unknown section ${id}`)
  return s
}
/** a sub-heading's own record — its title is data, never a literal in JSX */
const sub = (sectionId: string, subId: string): Sub => {
  const s = meta(sectionId).subs?.find((x) => x.id === subId)
  if (!s) throw new Error(`chapter 3: unknown sub ${sectionId}/${subId}`)
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
        <span className="ch3-intro" key={`i${i}`}>
          {emphasise(line.text, em, `l${i}`)}
        </span>,
        ' ',
      )
      return
    }
    if (i && !lines[i - 1].intro) out.push(<br key={`br-${i}`} />, ' ')
    if (line.item) {
      out.push(
        <span className="ch3-item" key={`it${i}`}>
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
  if (!n) throw new Error(`chapter 3: ${r} carries no name`)
  return n
}

/** A word LIFTED OUT of a fragment for a control label, proved to be in it.
    Chapter 2's `mapLabel` under another name: a legend that names a layer has
    to be able to name it, but the name must still be the source's word and not
    a caption we compose. Throws if the word is not in the fragment at a word
    boundary, so the control cannot drift from the sentence it stands for. */
const EDGE = /[\s,.;:—"'„”()[\]–-]/
const pick = (ref: string, phrase: string): string => {
  const s = text(ref)
  const at = s.indexOf(phrase)
  const before = at > 0 ? s[at - 1] : ' '
  const after = at + phrase.length < s.length ? s[at + phrase.length] : ' '
  if (at < 0 || !EDGE.test(before) || !EDGE.test(after)) {
    throw new Error(`chapter 3: "${phrase}" is not a word of ${ref}`)
  }
  return phrase
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

/** A movement inside a section. Its title is the name the SOURCE gives the
    thing — אלתחנת', אלבראק, ההגירה הראשונה — never a label we compose. */
function SubHead({ section, id }: { section: string; id: string }) {
  const s = sub(section, id)
  return (
    <h3 className="ch3-sub" id={id} data-reveal>
      {s.title}
    </h3>
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
    <blockquote className="ch3-verse" data-reveal>
      {text(r)}
    </blockquote>
  )
}

/** The chapter's only present-tense voice. Two uses, and the symmetry IS the
    design: §4 opens the loop out of the seventh century and §43 closes it. A
    third would break the pair and fail the gate in the same stroke. */
function Statement({ r }: { r: string }) {
  return (
    <p className="ch3-statement" data-reveal>
      {text(r)}
    </p>
  )
}

/* ---------------- mechanism 1 · the lineage strip ----------------

   Static. No clicks, no focusable elements, nothing hidden from chapter search.

   WHY THIS IS NOT PROSE. §7–§12 asks the reader to hold seven proper names and
   three transfers of custody in 211 words, and to notice that עבד אלמטלב
   appears TWICE in two different roles — as the father's patronymic in §8, and
   as the guardian in §12. In running prose those are two mentions twenty lines
   apart; here they are one node, which is what they are. It also plants אבו
   טאלב, so that §31 — twenty paragraphs later — has someone to kill.

   A <dl> per node because every name carries a gloss FROM THE SOURCE. Chapter 2
   established both halves of that test: a name and a four-word gloss are a
   definition, and a definition list with nothing to define is markup pretending
   the text has a structure it does not.

   HTML and CSS, not SVG: Hebrew text in SVG flows right-to-left from its x, and
   that trap has already cost this project a labelling bug. It does not exist
   here. */
function Lineage() {
  const parents = ['§8.father', '§8.mother']
  const care = ['§12.b', '§12.c']
  return (
    <div className="ch3-lineage" data-reveal>
      <dl className="ch3-lin-row">
        {parents.map((r) => (
          <div className="ch3-lin-node" key={r}>
            <dt>{nameOf(r)}</dt>
            <dd>{text(r)}</dd>
          </div>
        ))}
      </dl>
      <dl className="ch3-lin-row is-care">
        {care.map((r) => (
          <div className="ch3-lin-node" key={r}>
            <dt>{nameOf(r)}</dt>
            <dd>{text(r)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/* ---------------- mechanism 2 · the seven heavens ----------------

   An <ol> and a CSS rail. No JavaScript at all.

   WHY THIS IS NOT PROSE. §39 is a single 87-word sentence carrying an ordered
   enumeration of seven, one rung of which holds two prophets. Read as prose the
   reader cannot answer „מי היה ברביעי?" without going back. And the order is
   not decoration, it is the content: Moses stands BELOW Abraham, and §40
   depends on it — Muhammad comes back down past Moses to renegotiate.

   NOT a tablist (RamadanTimeline). Two measured reasons: the panels would be
   four to nine words each, which is precisely what the words-per-paragraph
   floor exists to catch; and a tablist shows one rung and hides six, while the
   presence gate requires every fragment to reach the page.

   ORDER 1→7, TOP TO BOTTOM, NOT REVERSED. A literal ladder wants seven at the
   top, and `column-reverse` would give it while keeping DOM order for screen
   readers — but a sighted reader scanning down would then meet Abraham first.
   The ascent is carried by the source's own ordinals, which it already prints. */
function Heavens() {
  const rungs = ['§39.r1', '§39.r2', '§39.r3', '§39.r4', '§39.r5', '§39.r6', '§39.r7']
  return (
    <ol className="ch3-heavens" data-reveal>
      {rungs.map((r) => (
        <li className="ch3-rung" key={r}>
          <b className="ch3-rung-name">{nameOf(r)}</b>
          <span className="ch3-rung-text">{text(r)}</span>
        </li>
      ))}
    </ol>
  )
}

/* ---------------- mechanism 3 · the two readings ----------------

   The chapter's only interactive device.

   WHY THIS NEEDS A FIGURE. §43–§44 is the one place the source states an
   UNRESOLVED disagreement — the same event, two different maps. Prose can say
   „most say A, a minority say B"; it cannot show that the two readings differ
   only in how far the line runs.

   BOTH SENTENCES ARE PRINTED, ALWAYS, BELOW THE FIGURE. This is chapter 2's own
   correction to its map, word for word: „the legend now does one honest job —
   it lights a layer." The toggle changes which rail is drawn and nothing else.
   Nothing is hidden, chapter search finds both readings, and the device cannot
   lie about what the reader has seen.

   NO BUILDING, NO PHOTOGRAPH, NO MAP OF THE MODERN CITY. §44 disputes that the
   journey reached Jerusalem at all, and §43 ties the city's sanctity to jihad
   terror. A picture under either sentence would settle a question the source
   deliberately leaves open, and in a training-branch publication it would read
   as an editorial claim about a live conflict. A rule, two end points and two
   labels, in the chapter's palette. */
function TwoReadings() {
  const [far, setFar] = useState(true)
  const labels: [string, string] = [pick('§43.a', 'לירושלים'), pick('§44.a', 'דעות מיעוט')]
  return (
    <div className="ch3-readings" data-reveal>
      <div className="ch3-read-legend" role="group" aria-label="שתי הקריאות של יעד המסע">
        <button
          type="button"
          className="ch3-read-btn"
          aria-pressed={far}
          onClick={() => setFar(true)}
        >
          {labels[0]}
        </button>
        <button
          type="button"
          className="ch3-read-btn"
          aria-pressed={!far}
          onClick={() => setFar(false)}
        >
          {labels[1]}
        </button>
      </div>
      <div className={'ch3-read-fig' + (far ? ' is-far' : ' is-near')} aria-hidden="true">
        <span className="ch3-read-rail" />
        <span className="ch3-read-dot is-start" />
        <span className="ch3-read-dot is-end" />
      </div>
      <div className="ch3-body">
        <T r="§43.a" />
        <T r="§44.a" />
      </div>
    </div>
  )
}

/* ================================================================= */

export default function Chapter3() {
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
      setCollapsed(localStorage.getItem('ch3:side-collapsed') === '1')
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
        localStorage.setItem('ch3:side-collapsed', next ? '1' : '0')
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
            <span className="menu-sub">{CH3.menuTitle}</span>
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
              {/* ============ 01 · שנת הפיל ============
                  No device. A story and one comparison in brackets — the case
                  DECISIONS.md keeps arriving at: this part does not need an
                  installation, it needs to be printed. */}
              <Section id="elephant" className="opening-section">
                <div className="ch3-hero">
                  {/* CHAPTER 6'S BANNER, PART FOR PART: the still is the
                      background of the media layer, the film plays over it, and
                      the poster is what stands when it cannot. No onError
                      handler — a failing <source> does not raise `error` on the
                      media element, so one here would be dead code; the poster
                      and the media layer's own background are the same picture.
                      `prefers-reduced-motion` drops the video in CSS onto that
                      same still.

                      THE ASSET IS THE CAVE, and it returns as the opening plate
                      of section 05. The reader meets it seventeen sections
                      before §17 names it: the banner is a promise and §17 is
                      where it is paid. Same ridge, same light, or it reads as
                      two places instead of one. */}
                  <div className="ch3-hero-media" aria-hidden="true">
                    <video
                      className="ch3-hero-video"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      poster="/assets/chapter3/hero-cave.jpg"
                      tabIndex={-1}
                    >
                      <source src="/assets/chapter3/hero-cave.mp4" type="video/mp4" />
                    </video>
                  </div>
                  <div className="ch3-hero-copy">
                    <h1 className="ch3-hero-title">{CH3.title}</h1>
                  </div>
                </div>
                <Head id="elephant" />
                <div className="ch3-body" data-reveal>
                  <T r={['§0.a', '§0.name']} em={['שנת הפיל']} />
                  <T r="§1.a" />
                </div>
                <div className="ch3-body" data-reveal>
                  <T r="§2.a" em={['אבאביל']} />
                  <T r="§2.sura" />
                  <T r={['§3.a', '(§3.aside)']} />
                </div>
              </Section>

              {/* ============ 02 · „איפה זה פוגש אותנו“? ============
                  NO DEVICE, deliberately. The section names Hamas, Hezbollah and
                  two operations; a toggle or a card row here would turn
                  operation names into a toy, and §6 dates itself, so a device
                  would need rebuilding when the source is updated while prose
                  would not. The register change the reader needs is carried by
                  the source's own question, set as the chapter's first
                  Statement. */}
              <Section id="today">
                <Head id="today" />
                <Statement r="§4.ask" />
                <div className="ch3-body" data-reveal>
                  <T r="§4.a" />
                  <T r="§4.b" />
                  <T r="§4.ababil" em={['אבאביל']} />
                </div>
                <SubHead section="today" id="maakul" />
                <div className="ch3-body" data-reveal>
                  <T r="§5.a" em={['מוץ נאכל']} />
                  <T r="§6.a" />
                </div>
              </Section>

              {/* ============ 03 · הלידה, המשפחה והילדות ============ */}
              <Section id="birth">
                <Head id="birth" />
                <SubHead section="birth" id="hashim" />
                <div className="ch3-body" data-reveal>
                  {/* §7.name has no full stop — it is the gloss the source prints
                      in brackets before the verb, so it cannot stand alone */}
                  <T r={['§7.name', '§7.a']} em={['שבט קריש']} />
                  <T r="§7.b" />
                </div>
                <Lineage />
                <div className="ch3-body" data-reveal>
                  <T r="§12.a" />
                  {/* §9.a ends on a bracket, §9.b opens with a vav — one sentence */}
                  <T r={['§9.a', '§9.b']} />
                </div>
                <div className="ch3-body" data-reveal>
                  <T r="§10.a" />
                  <T r="§11.a" />
                  <T r="§11.verse" />
                </div>
              </Section>

              {/* ============ 04 · ח'דיג'ה ============
                  86 words, four sentences. Prose only — chapter 2's precedent
                  for a short trait was exactly this: „טקסט רץ. אין מנגנון." */}
              <Section id="khadija">
                <Head id="khadija" />
                <div className="ch3-body" data-reveal>
                  <T r="§13.a" />
                  <T r={['§14.a', '§14.daughters']} />
                  <T r="§15.a" />
                  <T r="§16.a" />
                </div>
              </Section>

              {/* ============ 05 · ההתגלות הראשונה ============
                  The cave returns here as a plate — the banner's promise paid.
                  No device: a full-screen stage would keep its beats out of the
                  DOM until clicked, and that exception is already spent in
                  chapter 2 with a known defect. It must not be spent again on
                  the most-searched passage in the chapter. */}
              <Section id="revelation">
                <Head id="revelation" />
                <SubHead section="revelation" id="tahannuth" />
                {/* THE PLATE IS OUT UNTIL THE ASSET EXISTS. The design is that
                    the banner's cave returns here — same ridge, same light — so
                    §17 pays what the banner promised. With the interim poster
                    standing in for both, it was literally the same file twice on
                    one page, which reads as a repetition rather than a rhyme.
                    It comes back when the banner is a film and this is a still. */}
                <div className="ch3-body" data-reveal>
                  <T r="§17.a" />
                  <T r="§17.b" em={["אלתחנת'"]} />
                </div>
                <div className="ch3-body" data-reveal>
                  <T r="§18.a" />
                  <T r="§18.b" />
                  <T r="§19.a" />
                </div>
                <Verse r="§19.verse" />
                <div className="ch3-body" data-reveal>
                  <T r="§20.a" />
                  <T r="§20.b" />
                </div>
                <SubHead section="revelation" id="qadr" />
                <div className="ch3-body" data-reveal>
                  <T r="§21.a" em={['ליל הגורל']} />
                  <T r="§22.a" />
                  <T r={['§22.b', '§22.c']} />
                  <T r="§23.a" />
                </div>
              </Section>

              {/* ============ 06 · הטפה למונותאיזם ============
                  257 words, the second-largest block, and no device. All of it
                  is argument and narrative. §29 in particular stays prose: the
                  list treatment triggers on the source's own punctuation, and
                  §29 is a comma chain with appositives, not items ending in
                  full stops. */}
              <Section id="preaching">
                <Head id="preaching" />
                <div className="ch3-body" data-reveal>
                  {/* §24.a ends on a colon — the claims are its sentence */}
                  <T r={['§24.a', '§24.b']} em={['שרכ']} />
                  <T r="§25.a" />
                  <T r="§25.b" />
                </div>
                <div className="ch3-body" data-reveal>
                  <T r="§26.a" />
                  <T r="§26.b" />
                  <T r="§26.c" />
                  <T r="§27.a" />
                  <T r="§27.b" />
                </div>
                <SubHead section="preaching" id="sahaba" />
                <div className="ch3-body" data-reveal>
                  <T r="§28.a" />
                  <T r="§29.a" em={['אלצחאבה']} />
                </div>
                <SubHead section="preaching" id="firsthijra" />
                <div className="ch3-body" data-reveal>
                  <T r="§30.a" />
                  <T r="§30.b" />
                  <T r="§30.c" />
                </div>
              </Section>

              {/* ============ 07 · שנת העצב ============
                  152 words about two deaths. No image, no device, no emphasis
                  beyond the ordinary — the same call as ואד אלבנת in chapter 2,
                  for the same reason. This is also the one section that stays
                  entirely inside the reading column: four sections in and four
                  out is what stops the chapter reading as eight repetitions. */}
              <Section id="sorrow">
                <Head id="sorrow" />
                <div className="ch3-body" data-reveal>
                  <T r="§31.a" em={['שנת העצב']} />
                  {/* §31.b has no full stop — the bracketed remark closes it */}
                  <T r={['§31.b', '(§31.aside)']} />
                </div>
                <div className="ch3-body" data-reveal>
                  <T r="§32.a" />
                  <T r="§32.b" />
                  <T r="§33.a" />
                </div>
                <div className="ch3-body" data-reveal>
                  {/* §34 is one sentence with a comma at its hinge */}
                  <T r={['§34.a', '§34.b']} />
                </div>
              </Section>

              {/* ============ 08 · המסע הלילי והעליה לשמים ============
                  30% of the chapter and it does not split: the source's own head
                  joins the two halves. Instead it carries four of the nine
                  sub-headings and two of the three devices — weight in
                  proportion to content, which is the rule chapter 2 arrived at.

                  §35 IS NOT ILLUSTRATED. The Buraq is described vividly and any
                  drawing has to settle what the source leaves open. §40 — the
                  fifty prayers reduced to five — is not a device either: an
                  interaction in which the learner PERFORMS the negotiation
                  stages a conversation between a prophet and God as a game. */}
              <Section id="night">
                <Head id="night" />
                <SubHead section="night" id="buraq" />
                <div className="ch3-body" data-reveal>
                  <T r="§35.a" em={['אלבראק']} />
                  <T r="§35.b" />
                </div>
                <SubHead section="night" id="aqsa" />
                <div className="ch3-body" data-reveal>
                  <T r="§36.a" em={['המסגד הקיצון']} />
                  <T r="§36.b" />
                  <T r="§37.a" />
                  <T r="§37.b" />
                  <T r="§37.c" />
                </div>
                <div className="ch3-body" data-reveal>
                  <T r="§38.a" />
                  <T r="§38.b" />
                </div>
                <SubHead section="night" id="heavens" />
                <div className="ch3-body" data-reveal>
                  <T r="§39.a" />
                </div>
                <Heavens />
                <div className="ch3-body" data-reveal>
                  <T r="§40.a" />
                  <T r="§40.b" />
                  <T r="§40.c" />
                  <T r="§40.d" />
                </div>
                <div className="ch3-body" data-reveal>
                  <T r="§41.a" />
                  <T r="§41.b" />
                  <T r="§42.a" />
                  {/* §42.lead ends on a colon — it introduces the verse below */}
                  <T r="§42.lead" />
                </div>
                <Verse r="§42.isra" />
                <div className="ch3-body" data-reveal>
                  <T r="§42.najm" />
                </div>
                <TwoReadings />
                <Statement r="§43.b" />
              </Section>

              <div className="ch3-end" ref={endRef} data-reveal>
                <Link className="ch3-end-link" href="/chapter3/practice">
                  לתרגול המסכם
                </Link>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
