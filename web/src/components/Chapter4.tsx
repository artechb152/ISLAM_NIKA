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
import Pact from '@/components/chapter4/Pact'
import TribesStage from '@/components/chapter4/TribesStage'
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
import MarkToNotebook from '@/components/MarkToNotebook'

interface Sub {
  id: string
  title: string
  term?: string
}
interface Deed {
  label: string
  numerals: string[]
  signLabel: string
}
interface Shot {
  x: number
  y: number
  z: number
  head: string
  place?: string
  img?: string
}
interface Stage {
  shots: Shot[]
}
interface LayoutSection {
  cards?: Sub[]
  deed?: Deed
  stage?: Stage
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

/** A CARD'S NAME. Cards are NOT `subs`: a sub is a rail anchor, and four more
    rows in a rail that already carries nineteen would bury the sections the
    reader navigates by. They live in their own array, and only this reads it. */
const card = (sectionId: string, cardId: string): Sub => {
  const t = meta(sectionId).cards?.find((x) => x.id === cardId)
  if (!t) throw new Error(`chapter 4: unknown card ${sectionId}/${cardId}`)
  return t
}

/** The stage's camera: where it holds, how close, and which markers it shows.
    Same rule as the cards and the deed — the pin labels are mine and not the
    booklet's, so they live in the layout where a reader of the data can see
    that they are mine. The JSX writes no word, and the map is painted with
    none. */
const stage = (sectionId: string): Stage => {
  const t = meta(sectionId).stage
  if (!t) throw new Error(`chapter 4: section ${sectionId} carries no stage`)
  return t
}

/** The deed's own labels. Same rule as the cards: „תנאי ההסכם" and „החתימה"
    are mine and not the booklet's, so they live in the layout where a reader
    of the data can see that they are mine. The JSX writes no word. */
const deed = (sectionId: string): Deed => {
  const d = meta(sectionId).deed
  if (!d) throw new Error(`chapter 4: section ${sectionId} carries no deed`)
  return d
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
/** A phrase to set apart, and how. TWO REGISTERS, NOT ONE:

    `key`     — maroon. The idea the sentence turns on: what was decided, what
                changed, what it cost. It is the reader's handhold in a long
                paragraph.
    `ch4-tr`  — gold. A transliterated Arabic term and nothing else — אלהג׳רה,
                דעוה, הודנה. Gold says „this is a word, not a claim", which is
                exactly the difference between naming a thing and asserting one.

    Keeping them apart matters: if the term and the idea were both maroon the
    page would emphasise twice as much and distinguish nothing. */
interface Mark {
  phrase: string
  cls: string
}

function emphasise(s: string, marks: Mark[], keyBase: string): React.ReactNode[] {
  if (!marks.length) return [s]
  const parts: React.ReactNode[] = []
  let rest = s
  let k = 0
  while (rest.length) {
    let at = -1
    let hit: Mark | null = null
    for (const m of marks) {
      const i = rest.indexOf(m.phrase)
      /* the earliest match wins, and on a tie the longer phrase does — so a
         term nested inside a marked clause is not swallowed by it */
      if (i >= 0 && (at < 0 || i < at || (i === at && m.phrase.length > (hit?.phrase.length ?? 0)))) {
        at = i
        hit = m
      }
    }
    if (at < 0 || !hit) {
      parts.push(rest)
      break
    }
    if (at > 0) parts.push(rest.slice(0, at))
    parts.push(
      <b className={hit.cls} key={`${keyBase}-${k++}`}>
        {bindShort(hit.phrase)}
      </b>,
    )
    rest = rest.slice(at + hit.phrase.length)
  }
  return parts
}

/** Verbatim sentences set as ONE paragraph. Adjacent source sentences belong in
    one paragraph — that is what keeps words-per-paragraph above the floor the
    audit holds the chapter to. */
function T({
  r,
  em = [],
  tr = [],
  pt = [],
  emClass,
  className,
  reveal = false,
}: {
  r: string | string[]
  /** the idea the sentence turns on — maroon */
  em?: string[]
  /** a transliterated Arabic term — gold */
  tr?: string[]
  /** words that hand off to what comes directly under them — ruled, not
      coloured. Separate from `em` because a sentence may carry both, and
      `emClass` recolours every mark in the call. */
  pt?: string[]
  /** How the emphasised phrase is set. Default: the chapter's key term, maroon.
      The other one is a phrase that hands off to the figure directly under it —
      ruled rather than coloured, so it reads as a pointer and not as a term. */
  emClass?: string
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
  const marks: Mark[] = [
    ...em.map((phrase) => ({ phrase, cls: emClass ?? 'key' })),
    ...tr.map((phrase) => ({ phrase, cls: 'ch4-tr' })),
    ...pt.map((phrase) => ({ phrase, cls: 'ch4-points' })),
  ]
  const out: React.ReactNode[] = []
  lines.forEach((line, i) => {
    if (line.intro) {
      if (i) out.push(' ')
      out.push(
        <span className="ch4-intro" key={`i${i}`}>
          {emphasise(line.text, marks, `l${i}`)}
        </span>,
        ' ',
      )
      return
    }
    if (i && !lines[i - 1].intro) out.push(<br key={`br-${i}`} />, ' ')
    if (line.item) {
      out.push(
        <span className="ch4-item" key={`it${i}`}>
          {emphasise(line.text, marks, `l${i}`)}
        </span>,
      )
      return
    }
    out.push(...emphasise(line.text, marks, `l${i}`))
  })
  return (
    <p className={className} {...rv}>
      {out}
    </p>
  )
}



/** A phrase LIFTED OUT of a fragment for a label, proved to be in it. A legend
    that names a thing has to be able to name it, but the name must still be the
    source's words and not a caption we compose. Throws if the phrase is not in
    the fragment at a word boundary, so a label cannot drift from its sentence. */
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


/** THE COSTUME, worn twice and no more.

    The note above says which two verses get it: the two the EVENT rests on,
    printed by the booklet as sentences of their own rather than as clauses
    inside another. The other four stay in their sentences, emphasised.

    It composes nothing — the text is a fragment, and the citation beside it is
    the fragment's own reference, printed as the source prints it. The marks
    and the corners are decoration and are hidden from a screen reader; a
    reader who cannot see them still gets a blockquote, which is what this is. */
function Verse({ r, cite, mid = false }: { r: string; cite?: string; mid?: boolean }) {
  return (
    <blockquote className={'ch4-verse' + (mid ? ' is-mid' : '')} data-reveal>
      <span className="cv-mark cv-open" aria-hidden="true">”</span>
      <p>{text(r)}</p>
      {cite ? <cite>{cite}</cite> : null}
      <span className="cv-mark cv-close" aria-hidden="true">”</span>
    </blockquote>
  )
}

/** „להרחבה" — a passage the reader opens, and the only one in the chapter.

    WHAT IT HOLDS AND WHY IT IS NOT IN THE FLOW. §6 leaves the seventh century:
    a group that named itself after the hijra and murdered a president in 1981,
    and men who left Europe for Syria in the twenty-first. It belongs to the
    chapter — the source prints it as the next sentences of the same passage —
    but it is a different register from the paragraph above it, and dropping the
    reader into 1981 mid-sentence is the jolt the „איפה זה פוגש אותנו" box was
    invented for and then removed with. A named door does the same work without
    a second ground on the page: whoever wants the modern echo asks for it.

    THE CONTENT IS IN THE DOM WHETHER IT IS OPEN OR NOT. That is why this is a
    real `<dialog>` and not a panel mounted on demand: the chapter's own search
    walks text nodes, and a passage that existed only while open would go
    invisible to search and still pass every gate. Focus trap, Escape and the
    inertness of the page behind it come from the platform. */
function More({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <>
      <p className="ch4-more-row">
        <button
          type="button"
          className="ch4-more"
          aria-haspopup="dialog"
          onClick={() => {
            const d = document.getElementById(`more-${id}`) as HTMLDialogElement | null
            d?.showModal()
          }}
        >
          <span aria-hidden="true">+</span>
          להרחבה
        </button>
      </p>
      <dialog
        className="ch4-sheet"
        id={`more-${id}`}
        aria-labelledby={`more-${id}-title`}
        onClick={(e) => {
          if (e.target === e.currentTarget) (e.currentTarget as HTMLDialogElement).close()
        }}
      >
        <div className="ch4-sheet-panel">
          <form method="dialog">
            <button className="ch4-sheet-close" aria-label="סגירת החלון">
              <span aria-hidden="true">×</span>
            </button>
          </form>
          <h3 className="ch4-sheet-title" id={`more-${id}-title`}>{title}</h3>
          {children}
        </div>
      </dialog>
    </>
  )
}

/** A TRADITION, OPEN ON THE PAGE.

    WHY CARDS HERE AND NOWHERE ELSE IN THE CHAPTER: because the source opens a
    list. §18.a is „מסורות רבות קיימות על קרב זה, ביניהם…" — the sentence names
    the set before it gives the first of them, and four blocks are the shape
    that sentence already has. Nothing is invented; the shape is read off the
    text.

    AND WHY THEY DO NOT OPEN. The first build put each tradition behind a
    dialog. Every one of them is one to three sentences: a click that reveals
    forty words costs the reader more than the words are worth, and it hides
    from a skim the very thing a skim should catch. They are open. What the
    card gives is not concealment but a boundary — four traditions, four edges,
    so that „many traditions exist" is visible as a count and not only as a
    claim. */
function Card({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <article className="ch4-card" data-reveal>
      <span className="ch4-card-art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/chapter4/uhud-${id}.jpg`} alt="" aria-hidden="true" loading="lazy" />
      </span>
      <div className="ch4-card-body">
        <h3 className="ch4-card-title" id={`card-${id}`}>{card('uhud', id).title}</h3>
        {children}
      </div>
    </article>
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

/** A run of the chapter's sentences, held as one block.

    THE RULE THIS ENFORCES: a section is made of blocks, never of loose
    paragraphs. Chapter 2 has four bare paragraphs in the whole article and
    chapter 6 has two; this chapter had fifty, and a screen holding five
    unrelated things is what „עמוס" means in numbers. Grouping them changes
    nothing about the words and everything about the rhythm. */
function Block({ children }: { children: React.ReactNode }) {
  return <div className="ch4-block">{children}</div>
}


/** THE SHEET — מקטע 05.

    Every other section of this chapter is an event; this one is a document,
    and the booklet already writes it as one. §29 is three clauses of a
    contract and the source enumerates them, so they are written ON the sheet.
    Everything else in the section is prose — the road to Hudaybiyyah, what
    Quraysh argued, how long the thing was to hold, and what הודנה means — and
    prose belongs in one column at one measure.

    THE PROSE IS NOT ALLOWED TO CHANGE WIDTH. An earlier turn left §27–§28
    running the full column above the sheet and put only §30–§31 beside it; the
    reader met the same voice at two different measures and it read as two
    texts. All of it now sits in the one column at the right, from the heading
    to the last line, and the sheet stands beside the whole of it.

    THE STRUCK TITLE IS NOT DECORATION. §29.term3 says Muhammad gave up the
    title „שליח אללה" in his signature, over Ali's objection. `pick` lifts the
    words out of that sentence and throws if they are not in it, so the line
    cannot drift into a caption I wrote.

    THE SHEET IS NOT `.bleed-aside`. That mechanism hides its art below 900px,
    which is right for a painting and catastrophic here: the three clauses live
    on this artwork, and a phone would have lost §29 outright with no gate to
    catch it. This is a real element that stacks instead of disappearing. */
function Deed() {
  const d = deed('hudaybiyyah')
  return (
    <figure className="ch4-deed" data-reveal>
      {/* The inner box exists because `cqw` inside the element that DECLARES
          `container-type` resolves against that element's ancestor, not
          against itself — paddings written in cqw on the figure were computed
          against the viewport and the clauses came out at 8.9px. */}
      <div className="ch4-deed-inner">
        <p className="ch4-deed-label">{d.label}</p>
        <ol className="ch4-deed-terms">
          <li>
            <span className="ch4-deed-num" aria-hidden="true">{d.numerals[0]}</span>
            <T r="§29.term1" className="ch4-deed-term" em={['לא הורשה להיכנס למכה בשנה ההיא']} />
          </li>
          <li>
            <span className="ch4-deed-num" aria-hidden="true">{d.numerals[1]}</span>
            <T r="§29.term2" className="ch4-deed-term" em={['יכל לקבל הגנה בעיר מכה']} />
          </li>
          <li>
            <span className="ch4-deed-num" aria-hidden="true">{d.numerals[2]}</span>
            <T r="§29.term3" className="ch4-deed-term" em={['ויתר על תוארו']} />
          </li>
        </ol>
        <p className="ch4-deed-sign">
          <span className="ch4-deed-signlabel">{d.signLabel}</span>
          <s className="ch4-deed-struck">{pick('§29.term3', 'שליח אללה')}</s>
        </p>
      </div>
    </figure>
  )
}


/** THE SLOGAN — §47, three layers of one line.

    The booklet prints the chant, its Arabic and its Hebrew meaning inside one
    parenthesis at the end of a sentence, and in a running paragraph none of
    the three can be read: the Arabic sits mid-line between two brackets and
    the meaning is separated from the words it translates by fourteen Hebrew
    characters. Stacked, each layer is legible and the reader can see that the
    three are the same line.

    NOT THE VERSE'S ILLUMINATED FRAME. That costume is worn twice in this
    chapter and both times by the Quran. A chant in a procession is not
    scripture, and dressing it as scripture would say something the source
    does not. It gets a plain plate: a maroon edge rule, no gold cusps.

    `lang` and `dir` on the Arabic line are not decoration — without them a
    screen reader reads Arabic letters in a Hebrew voice, and the browser
    breaks the line in the wrong direction. */
function Chant() {
  return (
    <div className="ch4-chant" data-reveal>
      <p className="ch4-chant-ar" lang="ar" dir="rtl">{text('§47.arabic')}</p>
      <p className="ch4-chant-tr">{text('§47.chant')}</p>
      <p className="ch4-chant-he">{text('§47.meaning')}</p>
    </div>
  )
}


/** WHO IS SPEAKING — §35–§40.

    Built on chapter 2's closing section, which is the model the user pointed
    at: no picture, no interaction, no diagram. Prose, an order taken from the
    source's own connectives, and one sentence at the end.

    NO RULE AND NO LABEL. Three earlier attempts here — dossier cards, a
    balance, a branching verse — all tried to draw the argument, and all of
    them reached for the same furniture: a hairline edge, a small spaced gold
    chip over each name. The user asked for neither. What is left is a name in
    the heading face and the air around it, which is all chapter 2 uses to turn
    a run of prose into a ledger.

    THE NAME IS NEVER A LITERAL. Three of the five carry a `name` in
    passages.json; two are lifted out of their own sentences with `pick`, which
    throws if the words are not there. Who each man is and when he ruled is not
    a label of ours either — the source's own first sentence says it, every
    time: „פרסם בשנת 1979 המופתי של מצרים, ג'ד אלחק". */
function Mufti({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="ch4-mufti" data-reveal>
      <h4 className="ch4-mufti-name">{name}</h4>
      {children}
    </div>
  )
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
  /* the Badr film's written narration, closed until asked for */
  const [badrStory, setBadrStory] = useState(false)
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
      {/* סימון משפט → "הוספה למחברת" */}
      <MarkToNotebook ch={4} />
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
                {/* THE CHAPTER'S BANNER, and its only <h1>. It was lost when the
                    chapter was stripped to running text: that script rewrote
                    each section as its heading plus its paragraphs, and the
                    banner sits INSIDE this section rather than above it, so it
                    went out with the devices. Restored. */}
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
                <Head id="hijra" />
                <Block>
                  <T r="§0.a" className="ch4-body" reveal em={['לא השתכנעו שמוחמד אכן נביא אמת']} />
                  <T r="§0.b" className="ch4-body" reveal em={['נאלץ להגר']} />
                  <T r="§1.a" className="ch4-body" em={["ית'רב"]} reveal />
                  <T r="§1.b" className="ch4-body" reveal em={['שלושה שבטים יהודים']} />
                  <T r="§2.flight" className="ch4-body" reveal em={['כאילו הייתה בריחה']} />
                  <T r="§2.invited" className="ch4-body" reveal em={['הזמינו את מוחמד לשמש כבורר']} />
                </Block>
                <SubHead section="hijra" id="groups" />
                <Block>
                  {/* ONE RUNNING PARAGRAPH, and its last words are the hand-off:
                      the sentence ends on a colon and „התגוררו ארבע קבוצות
                      אנשים" is ruled, so the eye is taken straight into the
                      figure below it. Ruled and not coloured — a colour here
                      would read as one more key term. */}
                  <T
                    r={['§3.a', '§3.b']}
                    className="ch4-body"
                    em={['התגוררו ארבע קבוצות אנשים']}
                    emClass="ch4-points"
                    reveal
                  />
                </Block>
                {/* §3 ends on a colon and then lists four groups. The list is the
                    figure; §3.b's „ארבע קבוצות אנשים" is the sentence that hands
                    off to it.

                    EVERY LABEL IS THE SOURCE'S WORDS. Two groups have a `name`
                    in passages.json; the other two are labelled with a phrase
                    lifted out of their own sentence by `pick`, which throws if
                    the phrase is not there. And for those two the reveal earns
                    its click: what the label leaves out is exactly the PLACE —
                    „…במדינה" against „ובמכה התגוררו…", which is the whole point
                    of standing them around a picture of one town.

                    THE FOURTH IS MARKED `away` because the source puts it
                    somewhere else. */}
                <Groups
                  city="medina-622"
                  cityAlt="ית'רב — שחזור מצויר"
                  question={sub('hijra', 'groups').title}
                  groups={[
                    {
                      id: 'muhajirun',
                      name: nameOf('§3.muhajirun'),
                      text: text('§3.muhajirun'),
                      img: 'who-muhajirun',
                      angle: 45,
                    },
                    {
                      id: 'ansar',
                      name: nameOf('§3.ansar'),
                      text: text('§3.ansar'),
                      img: 'who-ansar',
                      angle: 315,
                    },
                    {
                      id: 'jews',
                      name: pick('§3.jews', 'שלושת השבטים היהודים'),
                      text: text('§3.jews'),
                      img: 'who-jews',
                      angle: 225,
                    },
                    {
                      id: 'quraysh',
                      name: pick('§3.quraysh', 'הכופרים משבט קריש'),
                      text: text('§3.quraysh'),
                      img: 'who-quraysh',
                      angle: 135,
                      away: true,
                    },
                  ]}
                />
                {/* THE ARRIVAL, before the covenant it produced. §7 is the
                    camel, the two orphans' yard and the mosque built on it —
                    and it stood in the middle of „חוזה האומה" in the source
                    order this file inherited from a device, three fragments out
                    of their own order (c, a, b). Both are put right. */}
                <SubHead section="hijra" id="mosque" />
                <Block>
                  <T r="§7.a" className="ch4-body" reveal em={['עצר הגמל עליו רכב']} />
                  <T r="§7.b" className="ch4-body" reveal em={['זהו סימן מאללה']} />
                  <T r="§7.c" className="ch4-body" reveal em={['בנה את המסגד']} />
                </Block>

                <SubHead section="hijra" id="covenant" />
                <Block>
                  <T r="§4.a" className="ch4-body" reveal em={['חוזה האומה']} />
                </Block>
                {/* THE TURN, FULL BLEED. §4.b is a before and an after inside
                    one sentence, and as one paragraph it reads as neither. The
                    two drawings are one view: the same camera, the same wall,
                    the same gate and the same tree, so the only thing that can
                    be seen is what changed. A press anywhere turns it. Both captions are that sentence's own words,
                    proved by `pick`; the sentence itself is printed under the
                    band in full, so nothing is replaced by its own summary. */}
                <Pact
                  stillBefore="pact-before"
                  stillAfter="pact-after"
                  labelBefore="לפני קבלת החוזה"
                  labelAfter="אחרי קבלת החוזה"
                  textBefore={pick('§4.b', 'אי הצלחה, דשדוש וחוסר יכולת')}
                  textAfter={pick('§4.b', 'דת, מוסר, ערכים וצבא')}
                  altBefore="ית'רב לפני החוזה · שחזור מצויר"
                  altAfter="אותו מבט אחרי החוזה · שחזור מצויר"
                />
                <Block>
                  <T r="§4.b" className="ch4-body" reveal em={['ראש ישות מדינית בעלת דת, מוסר, ערכים וצבא']} />
                </Block>
                <Block>
                  <T r="§8.a" className="ch4-body" em={['פתנה']} reveal />
                  <T r="§8.b" className="ch4-body" reveal em={['אסר עליהם במסגרת החוזה לכרות בריתות עם הכופרים במכה']} />
                </Block>

                {/* THE CLOSING RUN OF THE SECTION — three movements, one painting.

                    What the tribes became, what the hijra means, and the turn
                    from preaching to raiding are three headings the reader
                    passes in one breath, and the decision here was that they
                    carry NO mechanism at all: running prose, headings, and a
                    watercolour beside them. The `.bleed-aside` device is
                    chapter 6's shahada treatment, generalised in the shared
                    sheet so this is the same machine and not a copy of it.

                    THE PAINTING IS A CARAVAN, and it is a caravan because the
                    three headings are one thought: they left Mecca, the leaving
                    is what the calendar counts from, and the road is where the
                    raids on Quraysh begin. It carries no dome and no minaret —
                    neither existed in 622, and the chapter's own rule forbids
                    them.

                    THE YEAR NO LONGER STANDS ALONE. „622" was set as a display
                    numeral beside §5.a; the decision was to let the year stay
                    inside the sentence that already carries it, so the run is
                    prose and headings and nothing else. */}
                <div className="bleed-aside">
                  <div className="bleed-aside-art" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/chapter4/caravan-road.webp" alt="" loading="lazy" decoding="async" />
                  </div>
                  <div className="bleed-aside-body">
                    {/* NOT THE COVENANT: what became of the tribes years after
                        it. The material the chapter gives no picture and no
                        mechanism — the same call §26 and chapter 2's
                        ואד אלבנת got. */}
                    <SubHead section="hijra" id="tribes" />
                    <Block>
                      <T
                        r="§8.c"
                        className="ch4-body ch4-quiet-body"
                        em={['את חלקם הוא גירש ואת השאר הרג']}
                        reveal
                      />
                      <T
                        r="§8.d"
                        className="ch4-body ch4-quiet-body"
                        em={['והעשירו את האסלאם במסורות יהודיות']}
                        reveal
                      />
                    </Block>

                    {/* THE HIJRA AS AN IDEA, and what has been done with it.
                        §5 is why the Muslim calendar starts here; §6 is 1981
                        and the twenty-first century. */}
                    <SubHead section="hijra" id="hijra-idea" />
                    {/* §6 WAS A PANEL AND IS NOW A PARAGRAPH. The two modern
                        sentences sat on their own ground with a rule down the
                        reading edge, which set them apart as a different kind
                        of thing. They are not: the source prints them as the
                        next sentences of the same passage, and the run reads
                        as one continuous thought without the frame. */}
                    <Block>
                      <T
                        r="§5.a"
                        className="ch4-body"
                        em={['אירוע מרכזי ומכונן', 'מתחיל משנת ההגירה']}
                        tr={["אלהג'רה"]}
                        reveal
                      />
                      <T
                        r="§5.b"
                        className="ch4-body"
                        em={['סמליות דתית עמוקה של עקירה']}
                        reveal
                      />
                    </Block>
                    <More id="hijra-echo" title="איפה זה פוגש אותנו">
                      <T
                        r="§6.echo1"
                        className="ch4-body"
                        em={['רצחו את נשיא מצרים אנואר סאדאת']}
                        tr={["ג'מאעת' אלתכפיר ואלהג'רה'"]}
                      />
                      <T r="§6.echo2" className="ch4-body" em={['היגרו לסוריה']} />
                    </More>

                    <SubHead section="hijra" id="jihad" />
                    <Block>
                      <T
                        r="§9.dawa"
                        className="ch4-body"
                        em={['הטפה']}
                        tr={['דעוה']}
                        reveal
                      />
                      <T
                        r="§9.jihad"
                        className="ch4-body"
                        em={["ג'האד נגד הכופרים"]}
                        reveal
                      />
                      <T
                        r="§9.b"
                        className="ch4-body"
                        em={['לבזוז את השלל של הכופרים ולהרוג אותם']}
                        reveal
                      />
                      <T
                        r="§9.c"
                        className="ch4-body"
                        em={['קשר בל יינתק עם גירוש היהודים ממדינה']}
                        reveal
                      />
                    </Block>
                  </div>
                </div>
              </Section>

              <Section id="badr">
                <Head id="badr" />
                <div className="film-wrap">
                  <BadrFilm />
                </div>
                {/* THE FILM'S OWN WORDS, IN WRITING. The narration is section 03
                    read aloud, and until now the only way to have it was to
                    watch. That is not a choice everyone can make: a reader on a
                    quiet train, a reader who takes text faster than speech, a
                    reader who wants to go back over one sentence. Chapter 6
                    solves it with a drawer under its film, and this is that
                    drawer — the same `.story-toggle` and `.story-reveal` from
                    the shared sheet, not a second implementation.

                    IT PRINTS NOTHING NEW. Every sentence here is a fragment the
                    `film` slot already owns, so the fidelity gate still counts
                    each one exactly once; what changes is that the chapter now
                    has it in both modes instead of one. */}
                <button
                  className="story-toggle"
                  type="button"
                  aria-expanded={badrStory}
                  aria-controls="badr-story"
                  onClick={() => setBadrStory((v) => !v)}
                >
                  {badrStory ? 'הסתרת הסיפור המלא' : 'הצגת הסיפור המלא'}
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 9.5 12 15l5.5-5.5" /></svg>
                </button>
                <div
                  className={'story-reveal' + (badrStory ? ' is-open' : '')}
                  id="badr-story"
                  aria-hidden={!badrStory}
                  inert={!badrStory}
                >
                  <div>
                    <article className="story-copy" aria-labelledby="badr-story-title">
                      <h3 id="badr-story-title">הסיפור המלא</h3>
                      <T r={['§10.a', '§10.b']} className="ch4-body" em={['בדרך בין מכה למדינה']} />
                      <T r="§11.a" className="ch4-body" em={["אבו ג'הל ואבו סופיאן"]} />
                      <T r={['§11.muslims', '§11.quraysh']} className="ch4-body" em={['מעט יותר מ-300 איש', "כ-1000 איש"]} />
                      <T r="§12.rain" className="ch4-body" em={['ניתך גשם עז']} />
                      <T r="§12.duel" className="ch4-body" em={['להרוג שבעים מהם ולשבות מספר דומה']} />
                      <T r="§13.a" className="ch4-body" em={['ישועה וניצחון מזהיר']} />
                      <T r="§13.b" className="ch4-body" em={['יום הישועה']} />
                      <T r={['§14.a', '|§14.verse']} className="ch4-body" em={['תופעה חריגה למבנה הקוראן']} />
                      <T r={['§15.a', '|§15.verse']} className="ch4-body" em={['פרשת השלל']} />
                      <T r="§15.echo" className="ch4-body" em={['משתמשים במוטיב הפסוק הזה']} />
                      <T r="§16.a" className="ch4-body" em={['משמעות סמלית']} />
                      <T r="§16.echo" className="ch4-body" em={['מערכת בדר']} />
                    </article>
                  </div>
                </div>
              </Section>

              {/* ============ 04 · קרב אֻחֻד ============
                  §20.hind הוא הקשה בפרק, והוא נשאר טקסט. בלי דימוי. */}
              <Section id="uhud">
                <Head id="uhud" />
                <Block>
                  <T r="§17.a" className="ch4-body" em={['שבט קוריש']} reveal />
                  <T r="§17.muslims" className="ch4-body" reveal em={['כ-1000 לוחמים']} />
                  <T r="§17.quraysh" className="ch4-body" reveal em={['כ-3000 לוחמים']} />
                  <T r="§19.b" className="ch4-body" reveal em={['ללא הכרעה ברורה']} />
                  <T r="§19.c" className="ch4-body" reveal em={['חמזה דודו של מוחמד']} />
                </Block>
                {/* §18.a NAMES THE SET AND THEN GIVES THE FIRST OF IT. It is the
                    lead-in to the cards and not one of them: a sentence that says
                    „many traditions exist about this battle, among them…" cannot
                    itself be one of the traditions it introduces. */}
                <Block>
                  <T r="§18.a" className="ch4-body" reveal em={['מסורות רבות קיימות על קרב זה']} />
                </Block>
                <div className="ch4-cards" data-reveal>
                  <Card id="forgiven">
                    <T r="§18.b" className="ch4-body" em={['הדבר נסלח להם']} />
                  </Card>
                  <Card id="women">
                    <T r="§19.a" className="ch4-body" em={['בעיצוב התודעה']} />
                  </Card>
                  <Card id="hamza">
                    <T r="§20.a" className="ch4-body" />
                    <T r="§20.saying" className="ch4-body" />
                    <T r="§20.translit" className="ch4-body" tr={["סיד אלשהדאא', אסד אללה ואסד רסולה"]} />
                  </Card>
                  <Card id="hind">
                    <T r="§20.hind" className="ch4-body" em={['שתתה את הכבד שלו כנקמה']} />
                  </Card>
                </div>
                <SubHead section="uhud" id="shahids" />
                <Block>
                  <T r="§21.a" className="ch4-body" reveal em={['שכר גדול בגן עדן']} />
                  <T r="§21.b" className="ch4-body" em={['השהידים']} reveal />
                </Block>
                <Verse r="§21.verse" cite="סורת בית עמרם, פסוק 169" />
                <Block>
                  <T r="§22.echo" className="ch4-body" em={['אבטאל']} reveal />
                </Block>
              </Section>

              {/* ============ קרב השוחה ============
                  A SECTION OF ITS OWN, not a movement inside אֻחֻד. Two battles
                  two years apart under one heading is one heading too few: the
                  rail could not name the second, and a reader looking for it had
                  nowhere to click. §26 travels with it — the source opens the
                  massacre with „בהמשך לקרב זה", and the antecedent is the siege. */}
              <Section id="trench">
                <Head id="trench" />
                {/* THE SHAHADA'S MECHANISM, MIRRORED. A real two-column grid:
                    the painting has its own track and the words have theirs, and
                    neither sits on the other. The charity's was tried here first
                    and was the wrong tool twice over — it positions the painting
                    ABSOLUTELY, so the picture floats across the text instead of
                    beside it, and it pairs that with a 42% column, which at this
                    length breaks into short ragged lines.

                    MIRRORED because the camel stands to the LEFT of the hijra's
                    closing run and this one stands to the RIGHT. Chapter 6
                    alternates its two cutouts for the same reason: two long runs
                    with the painting on the same side read as one template
                    applied twice, and the second one stops being seen. */}
                <div className="bleed-aside is-flipped">
                  <div className="bleed-aside-art" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/chapter4/trench-dig.webp" alt="" loading="lazy" decoding="async" />
                  </div>
                  <div className="bleed-aside-body">
                    <Block>
                      <T r="§23.a" className="ch4-body" reveal em={['צרו על העיר מדינה']} />
                      <T r="§23.cause1" className="ch4-body" reveal em={['מעשי ביזה ונקמה']} />
                      <T r="§23.cause2" className="ch4-body" reveal em={['ויעצו לבני מכה לתקוף את המוסלמים']} />
                      <T r="§24.trench" className="ch4-body" reveal em={['טכניקה קרבית שלא הייתה נפוצה אצל הערבים']} tr={['סלמאן אלפראסי']} />
                      <T r="§24.storm" className="ch4-body" reveal em={['סערה גדולה']} />
                      <T r="§25.a" className="ch4-body" reveal tr={['אלאחזאב']} />
                      {/* §26 RUNS ON WITH THE REST, BESIDE THE PAINTING.

                          STRUCTURE.md rules that the massacre of the Qurayza gets
                          „full text, quiet typography, no device and no image",
                          and an earlier build honoured that by putting it in a
                          second row the painting could not reach. The user asked
                          twice for it to be part of the text beside the picture,
                          and that is the call taken here: the source opens it with
                          „בהמשך לקרב זה", so as a separate block it read as a
                          different kind of thing, which is its own distortion.

                          What still holds: it gets no device of its own and no
                          picture of its own, and it keeps `ch4-quiet-body`. */}
                      <T r="§26.a" className="ch4-body ch4-quiet-body" em={['בני קוריזה']} reveal />
                      <T r="§26.b" className="ch4-body ch4-quiet-body" reveal em={['הוצאו להורג והנשים והילדים נמכרו לעבדים']} />
                    </Block>
                  </div>
                </div>
              </Section>

              {/* ============ 05 · הסכם חודיביה ============
                  הגיליון משמאל נושא את שלושת הסעיפים ואת שורת החתימה;
                  כל הפרוזה — §27, §28, §30, §31 — רצה בעמודה אחת מימין
                  ברוחב אחיד, מהכותרת ועד הסוף. */}
              <Section id="hudaybiyyah">
                <Head id="hudaybiyyah" />
                <div className="ch4-deed-row">
                  <Deed />
                  <div className="ch4-deed-aside">
                    <T r="§27.a" className="ch4-body" em={['עמרה']} reveal />
                    <T r="§27.b" className="ch4-body" reveal em={['נוטר לו טינה']} />
                    <T r="§28.a" className="ch4-body" reveal em={['עצרו אותו במקום הנקרא חודיביה']} />
                    <T r="§28.b" className="ch4-body" reveal em={['שעל פניו נראה כהסכם כניעה']} />
                    <T
                      r={['§30.a', '§30.b']}
                      className="ch4-body"
                      reveal
                      em={['לא היו נדרשים כלל לחתימת ההסכם', 'לתקופה שלא עלתה על עשר שנים']}
                    />
                    <SubHead section="hudaybiyyah" id="hudna" />
                    <T r="§31.a" className="ch4-body" reveal em={['הסכם אי לוחמה זמני']} tr={['הודנה']} />
                  </div>
                </div>
              </Section>

              {/* ============ 07 · טבח יהודי ח'יבר ============
                  §41.year — התאריך השגוי — מסומן omitted ואינו מודפס.
                  הגירוש מוצג ביחסו לקרב בדר, כפי שהמקור עצמו עושה לבני נדיר.
                  אין כאן תיקון של המקור ואין הדפסה של טעות. */}
              <Section id="khaybar">
                <Head id="khaybar" />
                {/* THE SECTION'S TEXT, ON THE GROUND IT HAPPENED ON.
                    §41–§46 do not sit under this stage — they ARE it. Seven
                    steps ride one painted map while the camera travels: the
                    road north-west, Khaybar, Medina, Khaybar again. Steps 2
                    and 4 land on the same oasis on purpose. */}
                <TribesStage
                  shots={stage('khaybar').shots}
                  steps={[
                    <T key="1" r="§41.qaynuqa" />,
                    <T key="2" r="§41.nadir" em={["גורשו שבט בני נדיר ממדינה לח'יבר"]} />,
                    <T key="3" r="§42.a" em={['השבט השלישי והאחרון']} />,
                    <div key="4">
                      <T r="§43.a" />
                      <T r="§43.b" em={['הסתיימה השפעת היהודים על אזור חצי האי ערב']} />
                    </div>,
                    <div key="5">
                      <T r="§44.a" em={['בנויה ממבצרים']} />
                      <T r="§44.b" em={['נתן מוחמד לעלי את נס הקרב']} />
                    </div>,
                    <div key="6">
                      <T r="§45.a" />
                      <T r="§45.b" em={['שבוית מלחמה יהודייה בשם צפיה']} />
                    </div>,
                    <div key="7">
                      <T r="§46.a" em={["האיש שהיה אחראי על טבח יהודי ח'יבר היה עלי"]} />
                      <T r="§46.b" />
                      <T r="§46.c" em={['הודתה האשה כי העז מורעל']} />
                    </div>,
                  ]}
                />
                <SubHead section="khaybar" id="slogan" />
                <Block>
                  <T r="§47.a" className="ch4-body" reveal em={['אירוע מכונן בניצחון האסלאם על היהודים']} />
                  <T r="§47.echo" className="ch4-body" reveal />
                </Block>
                <Chant />
                <SubHead section="khaybar" id="mecca" />
                <Block>
                  <T r="§48.a" className="ch4-body" reveal em={['הכרעה נחרצת']} />
                  <T r="§48.b" className="ch4-body" reveal em={['הראשונים להפר את ההסכם']} />
                  <T r="§49.a" className="ch4-body" reveal em={['ללא התנגדות']} />
                  <T r="§49.b" className="ch4-body" em={['אבו סופיאן']} reveal />
                </Block>
              </Section>

              <Section id="death" className="ch4-quiet">
                <Head id="death" />
                <Block>
                  <T r="§50.a" className="ch4-body" reveal em={['מת בשנת 632 בגיל 63']} />
                  <T r="§50.b" className="ch4-body" reveal em={['לדבוק בקוראן ובסונה']} />
                  <T r="§51.a" className="ch4-body" reveal em={['שמת בשיא כוחו']} />
                </Block>
              </Section>

              {/* ============ 10 · חודיביה בפסקי ההלכה ============
                  שלוש עמדות, אותה תבנית. §36 נספח לכרטיס הראשון ולא כרטיס
                  רביעי. החלק לא נסגר בהסכמה, וזו הנקודה. */}
              <Section id="today">
                {/* THE PLACE THEY ARE ALL ARGUING ABOUT, AS THE GROUND.
                    Every other section of this chapter opens on something to
                    look at; this one opened on a paragraph, and it read as the
                    dry stretch of the chapter. Three attempts to give it a
                    DIAGRAM were all refused, and BUILD-RULES 31 says why in
                    advance: a diagram that teaches an abstract structure is a
                    workbook, and the content belongs back in prose with its
                    terms emphasised. What was missing was not structure but a
                    painting.

                    This is the only thing in the section that can honestly be
                    painted. Its five voices are living political figures and
                    rule 42 forbids their faces; but all five are arguing about
                    ONE PLACE — the plain where the treaty was signed, fourteen
                    centuries earlier. The asset was made in an early pass and
                    never used, so it costs nothing (rule 19).

                    THE HEADING KEEPS THE COLUMN (rule 49). It is inside the
                    hero, not floated over the middle of the picture: the copy
                    block holds the article's own gutter, so the title starts
                    exactly where every other title in the chapter starts. */}
                <div className="ch4-plainhero">
                  <div className="ch4-plainhero-art" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/chapter4/hudaybiyyah-plain.jpg" alt="" loading="lazy" decoding="async" />
                    <span className="ch4-plainhero-veil" />
                  </div>
                  <div className="ch4-plainhero-copy">
                    <Head id="today" />
                    <Block>
                      <T r="§32.a" className="ch4-body" reveal em={['הסכמי שלום עם מדינת ישראל']} />
                      <T r="§32.list" className="ch4-body" reveal em={['הסכמי אוסלו']} />
                      <T r="§32.b" className="ch4-body" reveal em={['האם האסלאם מאפשר לקיים הסכמי שלום עם כופרים']} />
                      <T r="§33.a" className="ch4-body" reveal em={['הקוראים למלחמה ולמולם אחרים הקוראים לשלום']} />
                    </Block>
                  </div>
                </div>
                <SubHead section="today" id="maslaha" />
                <Block>
                  <T r="§34.a" className="ch4-body" reveal em={['גמישות בפסיקת ההלכה']} tr={['מצלחה']} />
                  <T r="§34.b" className="ch4-body" em={['המצלחה']} reveal />
                </Block>

                {/* FIVE ANSWERS TO §32.b, EACH UNDER THE NAME THAT GAVE IT.
                    The order is the booklet's; so is the turn — §39.a opens on
                    the word „מנגד", which is the only mark the change of side
                    needs and is emphasised where it stands. */}
                <Mufti name={nameOf('§35.lead')}>
                  {/* the same hand-off as §3.b: the words that introduce a
                      list are ruled and not coloured, so they read as a
                      pointer to what follows and not as one more key term. */}
                  <T r="§35.lead" className="ch4-body" reveal em={['המופתי של מצרים']} pt={['עיקרי הדברים הבאים']} />
                  <T r="§35.points" className="ch4-body" reveal tr={['מצלחה', 'מפסדה']} />
                  <T r="§36.a" className="ch4-body" reveal em={['נתונה להחלטת השליט המוסלמי']} />
                </Mufti>
                <Mufti name={nameOf('§37.lead')}>
                  <T r="§37.lead" className="ch4-body" reveal em={['המופתי הכללי של סעודיה']} />
                  <T r="§37.point" className="ch4-body" reveal em={['אם השליט המוסלמי מצא בכך תועלת']} tr={['הודנה']} />
                  <T r="§37.b" className="ch4-body" reveal em={['ראה בכך תועלת לכלל המוסלמים']} tr={['צלח']} />
                </Mufti>
                <Mufti name={nameOf('§38.lead')}>
                  <T r="§38.lead" className="ch4-body" reveal em={['השווה ערפאת את הסכמי אוסלו להסכם חודיביה']} />
                  <T r="§38.quote" className="ch4-body ch4-mufti-quote" reveal em={['בין נביאנו מוחמד לקוריש']} />
                </Mufti>
                <Mufti name={pick('§39.a', 'יוסף אלקרדאוי')}>
                  <T r="§39.a" className="ch4-body" reveal em={['מנגד', 'תוקפנית ואינה נוטה לשלום']} />
                </Mufti>
                <Mufti name={pick('§40.a', 'חמאס')}>
                  <T r="§40.a" className="ch4-body" reveal em={['עומדים בסתירה לתפיסת העולם']} />
                  <T r="§40.b" className="ch4-body" reveal em={['בזבוז זמן והבל']} tr={["ג'האד"]} />
                </Mufti>

                {/* THE VERSE CLOSES THE SECTION, AND THE CHAPTER.
                    It was set inside Qaradawi's block, where the booklet prints
                    it — and that left the last words of the chapter to Hamas's
                    charter, in the largest type on the page. The user's ruling:
                    they do not get that weight.

                    8:61 is not Qaradawi's property. Three of the five voices
                    rest on it — §35.points cites it („מבוסס על פסוק 8:61"),
                    §37.point cites it („כפי שנאמר בקוראן"), and §39.a cites it
                    to reach the opposite end. It is the ground the whole
                    argument is fought on and the only voice here that is not a
                    living political actor, which makes it the one thing that
                    can close a section whose own note says it does not close. */}
                <Verse r="§39.verse" cite="קוראן 8:61" mid />
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
