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
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import { CH4, frag, list, text } from '@/lib/chapter4/content'
import { layoutLabels, px, py, ROUTE } from '@/lib/chapter4/art'
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

/** The source's own name for a person (אברהה, אבו טאלב, אדם…). Never a literal. */
const nameOf = (r: string): string => {
  const n = frag(r).name
  if (!n) throw new Error(`chapter 4: ${r} carries no name`)
  return n
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

/* ---------------- mechanism · the route strip ----------------

   §1 says the town he chose is „למעלה מ-300 ק"מ צפונית לעיר מכה". In prose that
   is a number the reader takes on trust and forgets by the next paragraph. Here
   it is the height of the drawing, and the four other places the chapter visits
   hang on the same line — so when §49 brings him back to Mecca at the bottom,
   the reader has already seen how far back that is.

   IT PRINTS NO NUMBER OF ITS OWN. The distance the coordinates give is 339 km,
   which agrees with the source, but 339 is this file's fact and not the
   booklet's — and the rule here is that the page prints the source's words and
   nothing else. So the figure carries names and years only, art.ts asserts the
   agreement at module load, and the sentence beside the map does the telling.

   TRUE SCALE, NO CHEATING. The five places span 1.2° of longitude against 4.5°
   of latitude, so a true-scale map of them is a tall narrow ribbon and this one
   is drawn as one. Widening it would make a friendlier picture of a country
   that is not shaped that way; the board's ruling on the qibla map in chapter 6
   was that a map has to be right about direction first.

   NO TEXT INSIDE THE SVG. Hebrew flows right-to-left from its x and that trap
   has already cost this project a labelling bug. The geometry is SVG; every
   name is an HTML span positioned over it. Where two dots are too close to
   label apart — Mecca and Hudaybiyyah are twenty kilometres apart on a
   five-hundred-kilometre ribbon — the LABEL steps down and a leader line runs
   back to the dot. The dot itself never moves. */
const STRIP = 430
const LABELS = layoutLabels(STRIP)
const STRIP_BOX = Math.max(STRIP, ...LABELS.map((l) => l.labelY * STRIP)) + 24

function Journey({ focus }: { focus?: string }) {
  const w = 150
  const xy = (p: { lat: number; lon: number }) => [px(p.lon) * w, py(p.lat) * STRIP] as const
  const road = ROUTE.map((p) => xy(p).join(',')).join(' ')
  return (
    <figure className={`ch4-journey${focus ? " is-focused" : ""}`} data-reveal>
      <div className="ch4-journey-strip" style={{ height: STRIP_BOX }}>
        <svg viewBox={`0 0 ${w} ${STRIP_BOX}`} width={w} height={STRIP_BOX} aria-hidden="true">
          <polyline className="ch4-journey-road" points={road} />
          {LABELS.map(({ place, dotY, labelY }) => {
            const [x, y] = xy(place)
            const stepped = Math.abs(labelY - dotY) * STRIP > 1
            return (
              <g key={place.id}>
                {stepped && (
                  <line className="ch4-journey-leader" x1={x} y1={y} x2={w} y2={labelY * STRIP} />
                )}
                <circle
                  className={`ch4-journey-dot${focus === place.id ? " is-here" : ""}`}
                  cx={x}
                  cy={y}
                  r={focus === place.id ? 7 : 5}
                />
              </g>
            )
          })}
        </svg>
        {LABELS.map(({ place, labelY }) => (
          <span
            className={`ch4-journey-name${focus === place.id ? " is-here" : ""}`}
            key={place.id}
            style={{ top: labelY * STRIP }}
          >
            {place.name}
            {place.year && <i className="ch4-journey-year">{place.year}</i>}
          </span>
        ))}
      </div>
    </figure>
  )
}

/* ---------------- mechanism · the film ----------------

   §12 is the chapter's one cinematic beat: rain on one army's camp the night
   before, and a duel at dawn. It was two paragraphs in the middle of a wall of
   them. Here the valley plays behind the words and the two sentences sit on it
   as a caption block — a documentary card, not a decoration.

   BOTH SENTENCES STAY IN THE DOM. Chapter 3's note about the desert stage is
   the reason: a device that keeps its text behind a click is a device that
   hides the chapter from search and from a screen reader. Nothing here is
   timed, nothing appears and disappears.

   THE LOOP IS A PALINDROME. The clip runs forward and then backward, so the
   last frame is the first and the banner never jumps. */
function Film({ src, children }: { src: string; children: React.ReactNode }) {
  return (
    <figure className="ch4-film" data-reveal>
      <div className="ch4-film-media" aria-hidden="true">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={`/assets/chapter4/${src}.jpg`}
          tabIndex={-1}
        >
          <source src={`/assets/chapter4/${src}.mp4`} type="video/mp4" />
        </video>
      </div>
      <figcaption className="ch4-film-text">{children}</figcaption>
    </figure>
  )
}

/* ---------------- mechanism · a pair of terms ----------------

   §9 is the chapter's hinge: preaching before it, war after it. The source
   names both states inside one sentence — דעוה and ג'האד — and the sentence is
   thirty-three words long, which is where the turn gets lost. Two cards put the
   two states side by side so the hinge is a shape and not a clause.

   The cards carry the SOURCE's sentences; the two words above them are lifted
   out of those same sentences and proved to be in them by `pick`. */
function Pair({ a, b, terms }: { a: string; b: string; terms: [string, string] }) {
  return (
    <div className="ch4-pair" data-reveal>
      <article className="ch4-pair-side">
        <h3 className="ch4-pair-term">{pick(a, terms[0])}</h3>
        <p className="ch4-pair-text">{text(a)}</p>
      </article>
      <article className="ch4-pair-side">
        <h3 className="ch4-pair-term">{pick(b, terms[1])}</h3>
        <p className="ch4-pair-text">{text(b)}</p>
      </article>
    </div>
  )
}

/* ---------------- mechanism · what the battle left ----------------

   Uhud has no victory to report, and §19 says three separate things about how
   it ended: who shaped the fighters' morale, that it ended undecided, and who
   fell. In prose the middle one — „ובוודאי לא בניצחון צבא מוחמד" — is a clause
   inside a longer run and slides past. Three panels give the undecided ending
   the same weight as the two facts around it, which is the point of the
   section. */
function Outcomes({ refs }: { refs: string[] }) {
  return (
    <div className="ch4-outcomes" data-reveal>
      {refs.map((r) => (
        <p className="ch4-outcome" key={r}>
          {text(r)}
        </p>
      ))}
    </div>
  )
}

/* ---------------- mechanism · a person the chapter turns on ----------------

   §46 hangs four roles on one man in a single parenthesis — cousin, son-in-law,
   fourth caliph, first Shia imam — and then tells the story of the poisoned
   goat. The roles are the reason the later chapters have anyone to talk about,
   and inside a bracket they are furniture. The card lifts the name out and
   lets the three sentences run under it. */
function Figure({ refs }: { refs: string[] }) {
  return (
    <div className="ch4-figure" data-reveal>
      {refs.map((r) => (
        <p className="ch4-figure-line" key={r}>
          {text(r)}
        </p>
      ))}
    </div>
  )
}

/* ---------------- mechanism · the treaties on a line ----------------

   §32 lists three agreements in one clause — Egypt 1979, Oslo 1993, Jordan 1994
   — and the whole of part ה׳ is jurists arguing about them. Read as a clause
   they are a footnote; read as three dated marks they are the subject. The
   years and the names both come out of the source sentence. */
function Treaties({ r }: { r: string }) {
  /* the source prints them out of order — 1979, 1994, 1993 — and this keeps
     that order, because reordering would be an edit */
  const items = text(r)
    .replace(/^למשל,\s*/, '')
    .replace(/\.$/, '')
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
  return (
    <ol className="ch4-treaties" data-reveal>
      {items.map((s) => {
        const year = s.match(/\((\d{4})\)/)?.[1] ?? ''
        return (
          <li key={s}>
            <b className="ch4-treaty-year">{year}</b>
            <span className="ch4-treaty-name">{s.replace(/\s*\(\d{4}\)/, '')}</span>
          </li>
        )
      })}
    </ol>
  )
}

/* ---------------- mechanism · the trench ----------------

   THE ONLY BATTLE IN THE CHAPTER WHOSE IDEA IS A SHAPE. Badr and Uhud are
   numbers — three hundred against a thousand, a thousand against three thousand
   — and the force balance carries them. The trench is geometry: a Persian
   advised a ditch on the side the city was open on, the technique was not one
   the Arabs used, and the siege broke on it. Read as prose that is a clause
   inside a thirty-eight-word sentence; seen, it is the whole event.

   IT WAS AN SVG FIRST, AND THE SVG WAS BAD. A blob for the town, empty rounded
   rectangles for its houses, a ladder for the ditch and three chevrons for an
   army — a programmer's schematic dropped into the middle of a chapter that is
   otherwise painted. It is drawn now, in the same hand as the other seven
   plates, and the drawing does what the schematic was trying to say: the town
   among its palms behind, the cut across the open ground in front, the empty
   plain beyond it.

   WHAT IT DOES NOT CLAIM. The source says the ditch was dug „סביבות העיר מדינה
   מצפונה לו" and nothing more. It does not say what protected the other sides —
   the lava fields and palm groves the histories give are not in this booklet —
   so the view shows one cut and one open plain, and the rest of the town's edge
   is simply not in frame. No compass label either: „צפון" is not a word of the
   sentence, „מצפונה" is, and it is doing that work in the caption below.

   NO LABELS ON THE PICTURE. The three the schematic carried — city, ditch,
   besiegers — were each proved to be words of §24 before they were printed, and
   they are still all named in the sentence underneath. Set over the painting
   they would only be a schematic wearing a landscape. */
function Trench({ r }: { r: string }) {
  return (
    <figure className="ch4-trench" data-reveal>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="ch4-trench-plate"
        src="/assets/chapter4/trench.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
      />
      <figcaption className="ch4-trench-text">
        <T r={r} className="ch4-body" />
      </figcaption>
    </figure>
  )
}

/** A plate: one painted view, sitting under the sentences it belongs to and
    never instead of them. Three in the chapter, and each one shows a PLACE the
    source describes — the courtyard of mud and palm, the valley of wells in the
    rain, the basalt strongholds. None of them shows a person, and that is not
    squeamishness: the chapter's events turn on a prophet, and every drawing of
    one is religiously impossible. Landscape is what is left, and it is enough.

    alt is empty and aria-hidden is set. The picture carries nothing the
    paragraph beside it does not already carry, and a screen reader must not be
    handed a description this file invented. */
function Plate({ src }: { src: string }) {
  return (
    <figure className="ch4-plate" data-reveal>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/assets/chapter4/${src}.jpg`} alt="" aria-hidden="true" loading="lazy" />
    </figure>
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
              {/* ============ 01 · ההגירה למדינה ============
                  המקטע הגדול בפרק, 25 קטעים, ולכן היחיד שנושא שתי תנועות.
                  §2 נושא שתי גרסאות של אותו אירוע והמקור לא מכריע ביניהן —
                  זו הסיבה שהן עומדות זו מול זו ולא זו אחרי זו. */}
              <Section id="hijra" className="opening-section">
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
                <T r="§0.a" className="ch4-body" reveal />
                <Statement r="§0.b" />
                <T r="§1.a" className="ch4-body" em={["ית'רב"]} reveal />
                <T r="§1.b" className="ch4-body" reveal />
                <Journey />
                <Plate src="yathrib-oasis" />
                <div className="ch4-two" data-reveal>
                  <T r="§2.flight" className="ch4-body ch4-two-side" />
                  <T r="§2.invited" className="ch4-body ch4-two-side" />
                </div>

                <SubHead section="hijra" id="groups" />
                <T r={['§3.a', '§3.b']} className="ch4-body" reveal />
                <div className="ch4-cards" data-reveal>
                  <Card r="§3.muhajirun" />
                  <Card r="§3.ansar" />
                  <Card r="§3.jews" />
                  <Card r="§3.quraysh" />
                </div>

                <SubHead section="hijra" id="covenant" />
                <T r="§4.a" className="ch4-body" reveal />
                <T r="§4.b" className="ch4-body" reveal />
                <T r="§8.a" className="ch4-body" em={['פתנה']} reveal />
                <T r="§8.b" className="ch4-body" reveal />
                <T r="§8.c" className="ch4-body" reveal />
                <T r="§8.d" className="ch4-body" reveal />
                <T r="§5.a" className="ch4-body" em={["אלהג'רה"]} reveal />
                <T r="§5.b" className="ch4-body" reveal />
                <Echo>
                  <T r="§6.echo1" className="ch4-body" />
                <T r="§6.echo2" className="ch4-body" />
                </Echo>
                <T r="§7.a" className="ch4-body" reveal />
                <T r="§7.b" className="ch4-body" reveal />
                <T r="§7.c" className="ch4-body" reveal />
                <Plate src="mosque-courtyard" />
              </Section>

              {/* ============ 02 · מהטפה לג'האד ============
                  שלושה קטעים, והוא נשאר ראשי משום שהמקור נותן לו כותרת רצה
                  משלו — וזה באמת הציר של הפרק. */}
              <Section id="jihad">
                <Head id="jihad" />
                <Pair a="§9.dawa" b="§9.jihad" terms={['דעוה', "ג'האד"]} />
                <T r="§9.b" className="ch4-body" reveal />
                <T r="§9.c" className="ch4-body" reveal />
              </Section>

              {/* ============ 03 · קרב בדר ============ */}
              <Section id="badr">
                <Head id="badr" />
                <T r="§10.a" className="ch4-body" reveal />
                <T r="§10.b" className="ch4-body" reveal />
                <T r="§11.a" className="ch4-body" em={["אבו ג'הל"]} reveal />
                <Forces muslims="§11.muslims" other="§11.quraysh" />
                <Film src="badr-film">
                  <T r="§12.rain" className="ch4-body" />
                  <T r="§12.duel" className="ch4-body" />
                </Film>
                <T r="§13.a" className="ch4-body" reveal />
                <T r="§13.b" className="ch4-body" em={['יום הישועה']} reveal />

                <SubHead section="badr" id="badr-quran" />
                <T r="§14.a" className="ch4-body" reveal />
                <Verse r="§14.verse" />
                <T r="§15.a" className="ch4-body" reveal />
                <Verse r="§15.verse" />
                <Echo>
                  <T r="§15.echo" className="ch4-body" />
                </Echo>
                <T r="§16.a" className="ch4-body" reveal />
                <Echo>
                  <T r="§16.echo" className="ch4-body" em={['מערכת בדר']} />
                </Echo>
              </Section>

              {/* ============ 04 · קרב אֻחֻד ============
                  §20.hind הוא הקשה בפרק, והוא נשאר טקסט. בלי דימוי. */}
              <Section id="uhud">
                <Head id="uhud" />
                <T r="§17.a" className="ch4-body" em={['שבט קוריש']} reveal />
                <Plate src="uhud-mount" />
                <Forces muslims="§17.muslims" other="§17.quraysh" />
                <T r="§18.a" className="ch4-body" reveal />
                <T r="§18.b" className="ch4-body" reveal />
                <Outcomes refs={['§19.a', '§19.b', '§19.c']} />
                <T r="§20.a" className="ch4-body" reveal />
                <Verse r="§20.saying" />
                <T r="§20.translit" className="ch4-body" reveal />
                <T r="§20.hind" className="ch4-body" reveal />

                <SubHead section="uhud" id="shahids" />
                <T r="§21.a" className="ch4-body" reveal />
                <T r="§21.b" className="ch4-body" em={['השהידים']} reveal />
                <Verse r="§21.verse" />
                <Echo>
                  <T r="§22.echo" className="ch4-body" em={['אבטאל']} />
                </Echo>
              </Section>

              {/* ============ 05 · קרב השוחה ============
                  בני קוריזה יושבים כאן ולא במקטע משלהם: המקור מציב אותם
                  כהמשך ישיר של הקרב, ומקטע נפרד היה נותן לטבח כותרת משלו
                  בסרגל. טיפוגרפיה שקטה, טקסט מלא, בלי דימוי ובלי מנגנון. */}
              <Section id="trench">
                <Head id="trench" />
                <T r="§23.a" className="ch4-body" reveal />
                <div className="ch4-two" data-reveal>
                  <T r="§23.cause1" className="ch4-body ch4-two-side" />
                  <T r="§23.cause2" className="ch4-body ch4-two-side" />
                </div>
                <Trench r="§24.trench" />
                <T r="§24.storm" className="ch4-body" reveal />
                <T r="§25.a" className="ch4-body" em={['אלאחזאב']} reveal />
                <T r="§26.a" className="ch4-body ch4-quiet-body" em={['בני קוריזה']} reveal />
                <T r="§26.b" className="ch4-body ch4-quiet-body" reveal />
              </Section>

              {/* ============ 06 · הסכם חודיביה ============ */}
              <Section id="hudaybiyyah">
                <Head id="hudaybiyyah" />
                <T r="§27.a" className="ch4-body" em={['עמרה']} reveal />
                <T r="§27.b" className="ch4-body" reveal />
                <T r="§28.a" className="ch4-body" reveal />
                <Plate src="hudaybiyyah-plain" />
                <T r="§28.b" className="ch4-body" reveal />
                <ol className="ch4-concessions" data-reveal>
                  <li>{text('§29.term1')}</li>
                  <li>{text('§29.term2')}</li>
                  <li>{text('§29.term3')}</li>
                </ol>
                <T r="§30.a" className="ch4-body" reveal />
                <T r="§30.b" className="ch4-body" reveal />

                <SubHead section="hudaybiyyah" id="hudna" />
                <Definition r="§31.a" />
              </Section>

              {/* ============ 07 · טבח יהודי ח'יבר ============
                  §41.year — התאריך השגוי — מסומן omitted ואינו מודפס.
                  הגירוש מוצג ביחסו לקרב בדר, כפי שהמקור עצמו עושה לבני נדיר.
                  אין כאן תיקון של המקור ואין הדפסה של טעות. */}
              <Section id="khaybar">
                <Head id="khaybar" />
                <T
                  r={['§41.qaynuqa', '§41.nadir']}
                  className="ch4-body ch4-quiet-body"
                  reveal
                />
                <T r="§42.a" className="ch4-body ch4-quiet-body" reveal />
                <T r="§43.a" className="ch4-body ch4-quiet-body" reveal />
                <T r="§43.b" className="ch4-body ch4-quiet-body" reveal />
                <Plate src="khaybar-forts" />
                <T r="§44.a" className="ch4-body" reveal />
                <T r="§44.b" className="ch4-body" reveal />
                <T r="§45.a" className="ch4-body" reveal />
                <T r="§45.b" className="ch4-body" reveal />
                <Figure refs={['§46.a', '§46.b', '§46.c']} />

                {/* החריגה היחידה בפרק מכלל תעתיק עברי בלבד:
                    הסיסמה מופיעה בערבית במקור. */}
                <SubHead section="khaybar" id="slogan" />
                <T r="§47.a" className="ch4-body" reveal />
                <Echo>
                  <T r="§47.echo" className="ch4-body" />
                </Echo>
              </Section>

              {/* ============ 08 · כיבוש מכה ============ */}
              <Section id="mecca">
                <Head id="mecca" />
                <T r="§48.a" className="ch4-body" reveal />
                <T r="§48.b" className="ch4-body" reveal />
                <T r="§49.a" className="ch4-body" reveal />
                <Journey focus="mecca" />
                <T r="§49.b" className="ch4-body" em={['אבו סופיאן']} reveal />
                <Plate src="kaaba-precinct" />
              </Section>

              {/* ============ 09 · מותו של מוחמד ============
                  סוף שקט. בלי מנגנון ובלי הלאה. */}
              <Section id="death" className="ch4-quiet">
                <Head id="death" />
                <T r="§50.a" className="ch4-body" reveal />
                <Plate src="medina-dusk" />
                <T r="§50.b" className="ch4-body" reveal />
                <T r="§51.a" className="ch4-body" reveal />
              </Section>

              {/* ============ 10 · חודיביה בפסקי ההלכה ============
                  שלוש עמדות, אותה תבנית. §36 נספח לכרטיס הראשון ולא כרטיס
                  רביעי. החלק לא נסגר בהסכמה, וזו הנקודה. */}
              <Section id="today">
                <Head id="today" />
                <T r="§32.a" className="ch4-body" reveal />
                <Treaties r="§32.list" />
                <T r="§32.b" className="ch4-body" reveal />
                <T r="§33.a" className="ch4-body" reveal />

                <SubHead section="today" id="maslaha" />
                <Definition r="§34.a" />
                <T r="§34.b" className="ch4-body" em={['המצלחה']} reveal />
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
                    <T r="§37.b" className="ch4-body" em={['צלח']} />
                  </article>
                  <article className="ch4-ruling">
                    <h3 className="ch4-ruling-name">{nameOf('§38.lead')}</h3>
                    <T r="§38.lead" className="ch4-body" />
                    <blockquote className="ch4-verse">{text('§38.quote')}</blockquote>
                  </article>
                </div>
                <T r="§39.a" className="ch4-body" reveal />
                <Verse r="§39.verse" />
                <T r="§40.a" className="ch4-body" reveal />
                <T r="§40.b" className="ch4-body" reveal />
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
