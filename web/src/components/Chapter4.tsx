'use client'

/* Chapter 4 — ההג׳רה והקרבות.

   Same product as chapters 2, 3 and 6: the masthead, the collapsible rail, the
   type scale, the reveal behaviour and every colour come from
   chapter6-article.css, which the route layout loads first. chapter4-article.css
   adds only this chapter's own devices and declares no colour, no font and no
   radius. This file is the FOURTH copy of that shell; the fold-into-one-module
   that Chapter3.tsx books is still owed, and taking it here would have meant
   editing a file another session had open.

   THE SHAPE. Ten sections — exactly the ten running heads the source prints.
   The first build ran on twenty-eight and read as a list with no end: the rail
   alone carried twenty-eight numbered lines, and eleven of those sections held
   a paragraph or two, which is a heading larger than the thing beneath it.
   Nothing was lost in the reduction — what had been a section is a SubHead now,
   and the rail shows it nested. See concept/chapter4/STRUCTURE.md.

   THE ONE DISTINCTION THE CHAPTER CANNOT DO WITHOUT is the echo box. Half this
   material is seventh-century narrative and half is what has been done with it
   in the last fifty years — a verse recited at a missile launch, an operation
   named after a battle, a slogan chanted at a march — and the source puts the
   two in adjacent sentences. A reader must never have to work out which one
   they are reading.

   WHAT IS DRAWN AND WHAT IS NOT. Three plates, all of them places, none of them
   people: the events turn on a prophet, and drawing one is religiously
   impossible. The massacres — §26 and §41–§43 — get no picture and no device at
   all, the same call chapter 2 made for ואד אלבנת.

   WHAT THIS FILE MAY NOT DO: write a sentence of the chapter. Every content
   string comes from passages.json through `text()` / `list()` / `nameOf()`,
   addressed by the §N.fragment it belongs to. UI strings — an aria-label, the
   menu's own words — are this file's to write; the chapter's words are not.
   concept/chapter4/verify-chapter4.mjs fails if a fragment is printed twice or
   dropped. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import BadrFilm from '@/components/chapter4/BadrFilm'
import Groups from '@/components/chapter4/Groups'
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
/** a sub-heading own record — its title is data, never a literal in JSX */
const sub = (sectionId: string, subId: string): Sub => {
  const t = meta(sectionId).subs?.find((x) => x.id === subId)
  if (!t) throw new Error(`chapter 4: unknown sub ${sectionId}/${subId}`)
  return t
}

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


/** A word LIFTED OUT of a fragment for a label, proved to be in it. A legend
    that names a thing has to be able to name it, but the name must still be the
    source's word and not a caption we compose. Throws if the word is not in the
    fragment at a word boundary, so a label cannot drift from its sentence. */
const EDGE = /[\s,.;:—"'„”()[\]–-]/
const pick = (ref: string, phrase: string): string => {
  const t = text(ref)
  const at = t.indexOf(phrase)
  const before = at > 0 ? t[at - 1] : ' '
  const after = at + phrase.length < t.length ? t[at + phrase.length] : ' '
  if (at < 0 || !EDGE.test(before) || !EDGE.test(after)) {
    throw new Error(`chapter 4: "${phrase}" is not a word of ${ref}`)
  }
  return phrase
}

/** The source's own name for a group or a person (המהגרים, התומכים…). Never a
    literal: if the source did not name it, the label has to be `pick`ed out of
    its sentence instead. */
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


/* ---------------- chapter 4's own devices ----------------

   Five, and every one of them is markup around sentences that already exist in
   passages.json. None of them composes a word. The two that STRUCTURE.md asks
   for and this file does NOT yet build are the map-timeline and the trench
   diagram: both need artwork that has not been commissioned, and a placeholder
   drawing would assert a geography the source does not give. Until they exist,
   their sections print their sentences in full — nothing is withheld from the
   reader, only from the page's decoration. */

/** A run of the chapter's sentences, held as one block.

    THE RULE THIS ENFORCES: a section is made of blocks, never of loose
    paragraphs. Chapter 2 has four bare paragraphs in the whole article and
    chapter 6 has two; this chapter had fifty, and a screen holding five
    unrelated things is what „עמוס" means in numbers. Grouping them changes
    nothing about the words and everything about the rhythm. */
function Block({ children }: { children: React.ReactNode }) {
  return <div className="ch4-block">{children}</div>
}


/** A movement inside a section. With ten sections instead of twenty-eight,
    what used to be a section of its own is a sub-heading here — and the rail
    shows it nested, so no anchor was lost in the reduction. */
function SubHead({ section, id }: { section: string; id: string }) {
  return (
    <h3 className="ch4-sub" id={id} data-reveal>
      {sub(section, id).title}
    </h3>
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

              {/* ============ 01 · ההגירה למדינה ============
                  המקטע הגדול בפרק, 25 קטעים, ולכן היחיד שנושא שתי תנועות.
                  §2 נושא שתי גרסאות של אותו אירוע והמקור לא מכריע ביניהן —
                  זו הסיבה שהן עומדות זו מול זו ולא זו אחרי זו. */}
              <Section id="hijra" className="opening-section">
                <Head id="hijra" />
                <Block>
                  <T r="§0.a" className="ch4-body" reveal />
                  <T r="§0.b" className="ch4-body" reveal />
                  <T r="§1.a" className="ch4-body" em={["ית'רב"]} reveal />
                  <T r="§1.b" className="ch4-body" reveal />
                  <T r="§2.flight" className="ch4-body" reveal />
                  <T r="§2.invited" className="ch4-body" reveal />
                </Block>
                <SubHead section="hijra" id="groups" />
                <Block>
                  <T r="§3.a" className="ch4-body" reveal />
                  <T r="§3.b" className="ch4-body" reveal />
                </Block>
                {/* §3 ends on a colon and then lists four groups. The list is the
                    figure; §3.b's „ארבע קבוצות אנשים" is the sentence that hands
                    off to it. Every label below is the source's own word — two
                    have a `name` in passages.json, two are lifted out of their
                    own sentence by `pick`, which throws if the phrase is not
                    there. */}
                <Groups
                  city="medina-622"
                  cityAlt="ית'רב — שחזור מצויר"
                  question="מי פגש את מי במדינה?"
                  hint="לחצו על קבוצה"
                  groups={[
                    { id: 'muhajirun', name: nameOf('§3.muhajirun'), text: text('§3.muhajirun'), img: 'who-muhajirun' },
                    { id: 'ansar', name: nameOf('§3.ansar'), text: text('§3.ansar'), img: 'who-ansar' },
                    { id: 'jews', name: pick('§3.jews', 'שלושת השבטים היהודים'), text: text('§3.jews'), img: 'who-jews' },
                    {
                      id: 'quraysh',
                      name: pick('§3.quraysh', 'הכופרים משבט קריש'),
                      text: text('§3.quraysh'),
                      img: 'who-quraysh',
                      away: true,
                    },
                  ]}
                />
                <SubHead section="hijra" id="covenant" />
                <Block>
                  <T r="§4.a" className="ch4-body" reveal />
                  <T r="§4.b" className="ch4-body" reveal />
                  <T r="§7.c" className="ch4-body" reveal />
                  <T r="§7.a" className="ch4-body" reveal />
                  <T r="§7.b" className="ch4-body" reveal />
                  <T r="§8.a" className="ch4-body" em={['פתנה']} reveal />
                  <T r="§8.b" className="ch4-body" reveal />
                  <T r="§8.c" className="ch4-body" reveal />
                  <T r="§8.d" className="ch4-body" reveal />
                  <T r="§5.a" className="ch4-body" em={["אלהג'רה"]} reveal />
                  <T r="§5.b" className="ch4-body" reveal />
                  <T r="§6.echo1" className="ch4-body" reveal />
                  <T r="§6.echo2" className="ch4-body" reveal />
                </Block>
                <SubHead section="hijra" id="jihad" />
                <Block>
                  <T r="§9.dawa" className="ch4-body" reveal />
                  <T r="§9.jihad" className="ch4-body" reveal />
                  <T r="§9.b" className="ch4-body" reveal />
                  <T r="§9.c" className="ch4-body" reveal />
                </Block>
              </Section>

              <Section id="badr">
                <Head id="badr" />
                <BadrFilm />
              </Section>

              {/* ============ 04 · קרב אֻחֻד ============
                  §20.hind הוא הקשה בפרק, והוא נשאר טקסט. בלי דימוי. */}
              <Section id="uhud">
                <Head id="uhud" />
                <Block>
                  <T r="§17.a" className="ch4-body" em={['שבט קוריש']} reveal />
                  <T r="§17.muslims" className="ch4-body" reveal />
                  <T r="§17.quraysh" className="ch4-body" reveal />
                  <T r="§18.a" className="ch4-body" reveal />
                  <T r="§18.b" className="ch4-body" reveal />
                  <T r="§19.a" className="ch4-body" reveal />
                  <T r="§19.b" className="ch4-body" reveal />
                  <T r="§19.c" className="ch4-body" reveal />
                  <T r="§20.a" className="ch4-body" reveal />
                  <T r="§20.saying" className="ch4-body" reveal />
                  <T r="§20.translit" className="ch4-body" reveal />
                  <T r="§20.hind" className="ch4-body" reveal />
                </Block>
                <SubHead section="uhud" id="shahids" />
                <Block>
                  <T r="§21.a" className="ch4-body" reveal />
                  <T r="§21.b" className="ch4-body" em={['השהידים']} reveal />
                  <T r="§21.verse" className="ch4-body" reveal />
                  <T r="§22.echo" className="ch4-body" em={['אבטאל']} reveal />
                </Block>
                <SubHead section="uhud" id="trench" />
                <Block>
                  <T r="§23.a" className="ch4-body" reveal />
                  <T r="§23.cause1" className="ch4-body" reveal />
                  <T r="§23.cause2" className="ch4-body" reveal />
                  <T r="§24.trench" className="ch4-body" reveal />
                  <T r="§25.a" className="ch4-body" reveal />
                  <T r="§24.storm" className="ch4-body" reveal />
                  <T r="§26.a" className="ch4-body" em={['בני קוריזה']} reveal />
                  <T r="§26.b" className="ch4-body" reveal />
                </Block>
              </Section>

              <Section id="hudaybiyyah">
                <Head id="hudaybiyyah" />
                <Block>
                  <T r="§27.a" className="ch4-body" em={['עמרה']} reveal />
                  <T r="§27.b" className="ch4-body" reveal />
                  <T r="§28.a" className="ch4-body" reveal />
                  <T r="§28.b" className="ch4-body" reveal />
                  <T r="§29.term1" className="ch4-body" reveal />
                  <T r="§29.term2" className="ch4-body" reveal />
                  <T r="§29.term3" className="ch4-body" reveal />
                  <T r="§30.a" className="ch4-body" reveal />
                  <T r="§30.b" className="ch4-body" reveal />
                </Block>
                <SubHead section="hudaybiyyah" id="hudna" />
                <Block>
                  <T r="§31.a" className="ch4-body" reveal />
                  <T r="§41.year" className="ch4-body" reveal />
                </Block>
              </Section>

              {/* ============ 07 · טבח יהודי ח'יבר ============
                  §41.year — התאריך השגוי — מסומן omitted ואינו מודפס.
                  הגירוש מוצג ביחסו לקרב בדר, כפי שהמקור עצמו עושה לבני נדיר.
                  אין כאן תיקון של המקור ואין הדפסה של טעות. */}
              <Section id="khaybar">
                <Head id="khaybar" />
                <Block>
                  <T r="§41.qaynuqa" className="ch4-body" reveal />
                  <T r="§41.nadir" className="ch4-body" reveal />
                  <T r="§42.a" className="ch4-body" reveal />
                  <T r="§43.a" className="ch4-body" reveal />
                  <T r="§43.b" className="ch4-body" reveal />
                  <T r="§44.a" className="ch4-body" reveal />
                  <T r="§44.b" className="ch4-body" reveal />
                  <T r="§45.a" className="ch4-body" reveal />
                  <T r="§45.b" className="ch4-body" reveal />
                  <T r="§46.a" className="ch4-body" reveal />
                  <T r="§46.b" className="ch4-body" reveal />
                  <T r="§46.c" className="ch4-body" reveal />
                </Block>
                <SubHead section="khaybar" id="slogan" />
                <Block>
                  <T r="§47.a" className="ch4-body" reveal />
                  <T r="§47.echo" className="ch4-body" reveal />
                </Block>
                <SubHead section="khaybar" id="mecca" />
                <Block>
                  <T r="§48.a" className="ch4-body" reveal />
                  <T r="§48.b" className="ch4-body" reveal />
                  <T r="§49.a" className="ch4-body" reveal />
                  <T r="§49.b" className="ch4-body" em={['אבו סופיאן']} reveal />
                </Block>
              </Section>

              <Section id="death" className="ch4-quiet">
                <Head id="death" />
                <Block>
                  <T r="§50.a" className="ch4-body" reveal />
                  <T r="§50.b" className="ch4-body" reveal />
                  <T r="§51.a" className="ch4-body" reveal />
                </Block>
              </Section>

              {/* ============ 10 · חודיביה בפסקי ההלכה ============
                  שלוש עמדות, אותה תבנית. §36 נספח לכרטיס הראשון ולא כרטיס
                  רביעי. החלק לא נסגר בהסכמה, וזו הנקודה. */}
              <Section id="today">
                <Head id="today" />
                <Block>
                  <T r="§32.a" className="ch4-body" reveal />
                  <T r="§32.list" className="ch4-body" reveal />
                  <T r="§32.b" className="ch4-body" reveal />
                  <T r="§33.a" className="ch4-body" reveal />
                </Block>
                <SubHead section="today" id="maslaha" />
                <Block>
                  <T r="§34.a" className="ch4-body" reveal />
                  <T r="§34.b" className="ch4-body" em={['המצלחה']} reveal />
                  <T r={['§35.lead', '§35.points']} className="ch4-body" reveal />
                  <T r="§36.a" className="ch4-body" reveal />
                  <T r="§37.lead" className="ch4-body" reveal />
                  <T r="§37.point" className="ch4-body" reveal />
                  <T r="§37.b" className="ch4-body" em={['צלח']} reveal />
                  <T r="§38.lead" className="ch4-body" reveal />
                  <T r="§38.quote" className="ch4-body" reveal />
                  <T r="§39.a" className="ch4-body" reveal />
                  <T r="§39.verse" className="ch4-body" reveal />
                  <T r="§40.a" className="ch4-body" reveal />
                  <T r="§40.b" className="ch4-body" reveal />
                </Block>
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
