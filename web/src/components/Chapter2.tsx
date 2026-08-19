'use client'

/* Chapter 2 — תרבות שבטית טרום עליית האסלאם.

   Same product as chapter 6: the masthead, the collapsible rail, the type scale,
   the reveal behaviour and every colour come from chapter6-article.css, which the
   route layout loads first.

   THE SHAPE, and why it changed.
   The first build split this content into TWELVE top-level sections with two
   sub-headings between them. Measured against chapter 6 on the same screen:

                        chapter 6   chapter 2 (first build)
     top-level sections     7              12
     sub-headings          15               2
     words per paragraph  16.7            10.8

   Chapter 6 is the LONGER document (14 screens to 10.9) and reads shorter,
   because seven sections each hold two or three sub-headings and paragraphs of
   real length. Twelve thin sections put 01→12 in the rail and a ragged half-line
   of prose under every heading — which is exactly what the reader felt:
   "יותר מידי טקסט רץ, המון שטחים ריקים, משעמם".

   So: few sections, sub-headings inside them, and adjacent fragments set as
   one paragraph rather than one apiece.

   The count settled at SIX, not seven. „שני מנהגים" — קבורת בנות and ת'אר —
   was a top-level section until it was folded back into „התרבות השבטית",
   where the source keeps it: all four traits sit under one running head there,
   and split off, the two customs read as a new subject instead of as what this
   culture does when it meets famine and blood. The gate was never the number
   seven; it is that this chapter not run twelve thin sections.

   WHAT THIS FILE STILL MAY NOT DO: write a sentence. Every string comes from
   passages.json through `text()` / `list()`, addressed by the §N.fragment it
   belongs to. concept/chapter2/verify-chapter2.mjs fails if a fragment is
   printed twice or dropped; concept/chapter2/audit.mjs fails if the rendered
   page drifts from chapter 6's own measurements. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import DesertStage from '@/components/chapter2/DesertStage'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import { CH2, frag, list, text } from '@/lib/chapter2/content'
import layoutData from '@/lib/chapter2/layout.json'
import {
  completedSections,
  markContentComplete,
  markSectionDone,
  resumeSectionId,
  saveCurrentSection,
  SECTION_ORDER,
} from '@/lib/chapter2/progress'

interface Sub {
  id: string
  title: string
  term?: string
}
interface LayoutSection {
  id: string
  title: string
  /** the heading over the row of trait cards — the source's own running head */
  cardsTitle?: string
  subs?: Sub[]
}
const LAYOUT = layoutData as unknown as { sections: LayoutSection[] }
const SECTIONS = LAYOUT.sections

const meta = (id: string): LayoutSection => {
  const s = SECTIONS.find((x) => x.id === id)
  if (!s) throw new Error(`chapter 2: unknown section ${id}`)
  return s
}
/** a sub-heading's own record — its title is data, never a literal in JSX */
const sub = (sectionId: string, subId: string): Sub => {
  const s = meta(sectionId).subs?.find((x) => x.id === subId)
  if (!s) throw new Error(`chapter 2: unknown sub ${sectionId}/${subId}`)
  return s
}
/** "גבריות (מרואה)" — the way the ledger and the rail both name a practice */
const subLabel = (sectionId: string, subId: string): string => {
  const s = sub(sectionId, subId)
  return s.term ? `${s.title} (${s.term})` : s.title
}

/* ---------------- text primitives ---------------- */

/** „(§1.gloss)" — a fragment the source prints in brackets inside another
    sentence rather than as a sentence of its own. See the loop in `T`. */
const PARENTHETICAL = /^\((§\d+\.[\w-]+)\)$/

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
        {hit}
      </b>,
    )
    rest = rest.slice(at + hit.length)
  }
  return parts
}

/** Verbatim sentences set as ONE paragraph.
    `r` may be a list of refs: adjacent source sentences belong in one paragraph,
    which is how chapter 6 reaches 16.7 words per paragraph instead of 10.8.

    A ref that names a `list` fragment is DIFFERENT, and this is the whole point
    of the distinction. The source writes its lists as strings of two-word items
    ending in full stops — „חזק. חסון. לוחם. צייד. בעל השפעה." — and run together
    as prose they read as a stutter of one-word sentences rather than as a list
    of qualities. Each item takes its own line: no bullet, no marker (chapter 6
    has zero bulleted lists), just the break the source's own punctuation asks
    for. A line of running prose beside a list keeps its own line too, so the
    sentence that introduces the items does not run into the first of them.

    The space pushed after every `<br/>` is deliberate: it is collapsed away at
    the start of a line box and never seen, but it keeps the words separated in
    `textContent` — without it „צייד." and „בעל" fuse into one token and the
    audit's words-per-paragraph reading silently drops. */
function T({
  r,
  em = [],
  className,
  reveal = false,
}: { r: string | string[]; em?: string[]; className?: string; reveal?: boolean }) {
  const refs = Array.isArray(r) ? r : [r]
  const lines: string[] = []
  let run = ''
  const flush = () => {
    if (run) {
      lines.push(run)
      run = ''
    }
  }
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i]
    /* A ref written „(§1.gloss)" is PARENTHETICAL: the source has it in round
       brackets inside the sentence before it, not standing on its own. It folds
       into the running text — the preceding sentence gives up its full stop, the
       remark goes in brackets, and the stop is set after the closing bracket,
       which is exactly how the document prints it. */
    const par = PARENTHETICAL.exec(ref)
    if (par) {
      /* The last two words of the remark are bound with a non-breaking space, so
         the closing bracket cannot be left holding one word alone at the start of
         a line — „…שנולדה מקצף" / „הים)." was breaking exactly there. A rule
         rather than a hand-placed fix on one phrase: it holds for every
         parenthetical and at every width. The character is whitespace to
         `split(/\s+/)` and to the gates' `flat()`, so no measurement moves. */
      const inner = text(par[1])
        .replace(/\s*\.\s*$/, '')
        .replace(/ (\S+)$/, ' $1')
      run = `${run.replace(/\s*\.\s*$/, '')} (${inner}).`
      continue
    }
    if (frag(ref).list) {
      flush()
      for (const item of list(ref)) lines.push(item)
      continue
    }
    /* A sentence that INTRODUCES a list takes its own line — „בתרבות זו יועד
       לאישה בעיקר תפקיד של:" sitting at the tail of a long run put the colon in
       the middle of a line with its items starting under the line above it.
       Detected by what FOLLOWS rather than by the colon character, so an
       ordinary sentence that happens to end in a colon is not broken out of the
       prose it belongs to. */
    const next = refs[i + 1]
    if (next && !PARENTHETICAL.test(next) && frag(next).list) {
      flush()
      lines.push(text(ref))
      continue
    }
    run = run ? `${run} ${text(ref)}` : text(ref)
  }
  flush()

  /* a T that stands on its own in the section (rather than inside a
     `.ch2-body`) has to carry the reveal itself */
  const rv = reveal ? { 'data-reveal': true } : {}
  const out: React.ReactNode[] = []
  lines.forEach((line, i) => {
    if (i) out.push(<br key={`br-${i}`} />, ' ')
    out.push(...emphasise(line, em, `l${i}`))
  })
  return <p className={className} {...rv}>{out}</p>
}

/** The source's own name for an item (יקטן, הפרט, בערות…). Never a literal in JSX. */
const nameOf = (r: string): string => {
  const n = frag(r).name
  if (!n) throw new Error(`chapter 2: ${r} carries no name`)
  return n
}
/** The Arabic term a fragment introduces (הג'ר, צבר, עִלְם…). */
const termOf = (r: string): string => {
  const t = frag(r).term
  if (!t) throw new Error(`chapter 2: ${r} carries no term`)
  return t
}

/** The section heading — chapter 6's `.section-heading`, with no ornament.
    Chapter 6 puts its diamond ornament under a PILLAR title and nowhere else;
    the first build sprinkled it between sections, which is decoration. */
function Head({ id }: { id: string }) {
  return (
    <header className="section-heading" data-reveal>
      <div>
        <h2 id={`${id}-title`}>{meta(id).title}</h2>
      </div>
      {/* chapter 6's own mark: two hairlines with a small diamond between them,
          inside the heading and directly under the title. Both classes, because
          `.title-ornament` draws it and `.section-ornament` is the width it
          takes under a section title rather than under the shahada. */}
      <div className="title-ornament section-ornament" aria-hidden="true"><span /></div>
    </header>
  )
}

/** A sub-heading — chapter 6's `.scrolly-env`: Kedem at --sub, maroon, one rule
    under it, sized to its own text. Fifteen of these are what make chapter 6
    feel paced; this chapter now has six. */
function SubHead({ section, id }: { section: string; id: string }) {
  const s = sub(section, id)
  return (
    <h3 className="ch2-sub" id={id} data-reveal>
      {s.title}
      {s.term && <span> ({s.term})</span>}
    </h3>
  )
}

function Section({ id, className = '', children }: { id: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`article-section ${className}`} id={id} aria-labelledby={`${id}-title`}>
      {children}
    </section>
  )
}

/** Two named things the source sets against each other (יקטן/עדנאן, הפרט/השבט).
    A <dl>, not two paragraphs: the source writes these as a name and its gloss,
    and a four-word gloss is a definition, not a paragraph.
    One device, used twice — chapter 6 reuses `.content-block` a dozen times. */
function Pair({ refs, centred = false }: { refs: [string, string]; centred?: boolean }) {
  return (
    <dl className={'ch2-pair' + (centred ? ' is-centred' : '')} data-reveal>
      {refs.map((r) => (
        <div key={r}>
          <dt>{nameOf(r)}</dt>
          <dd>{text(r)}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Two parties that owe each other something — עצביה is not a list of two
    obligations, it is one obligation running both ways, and set as a `<dl>`
    the two halves sat side by side with nothing between them saying so.
    Each arrow carries its own sentence: the source already writes both with
    their subject in them ("הפרט מחויב…", "השבט מחויב…"), so the arrow adds a
    direction to a sentence rather than a caption to a picture. */
function Cycle({ refs }: { refs: [string, string] }) {
  const [out, back] = refs
  return (
    <div className="ch2-cycle" data-reveal>
      <b className="ch2-cycle-node">{nameOf(out)}</b>
      <b className="ch2-cycle-node">{nameOf(back)}</b>
      <p className="ch2-cycle-arm is-out">{text(out)}</p>
      <p className="ch2-cycle-arm is-back">{text(back)}</p>
    </div>
  )
}

/* ---------------- the four traits: a row of cards, each opening a dialog ------

   The pictures are chosen from what the SOURCE says caused each trait, not for
   decoration — none of the four is an illustration of the thing itself:

     עצביה      a moonlit empty desert. §15: „קשה מאוד, ולעיתים בלתי אפשרי, לחיות
                במדבר כאדם בודד… בשל הסכנות והתנאים הקשים התפתחה נאמנות הדדית".
                The danger in that picture is the reason the loyalty exists.
     מרואה      two riders with spears — §17's „חזק. חסון. לוחם. צייד."
     קבורת בנות drought. §20 names the cause outright: „בתקופות של רעב ובצורת".
                The subject is infanticide; the picture is the famine, and that
                is a deliberate limit, not a failure of nerve.
     ת'אר       the two camps on facing slopes, which is §23 entire.            */
const TRAIT_ART: Record<string, { src: string; alt: string }> = {
  asabiyya: {
    src: 'trait-asabiyya.webp',
    alt: 'מחנה בדואי בשעת דמדומים: אוהלי שיער שחורים צפופים זה לזה, מדורות ואנשים יושבים סביבן, ומסביב מרחב מדברי ריק עד האופק',
  },
  muruwa: {
    src: 'trait-muruwa.webp',
    alt: 'פרש בדואי יחיד עוצר על רכס סלעי עם שחר, רומח זקוף בידו, ומשקיף על העמק',
  },
  wad: {
    src: 'trait-wad.webp',
    alt: 'מחנה בדואי בבצורת: אדמה סדוקה, באר יבשה עם דלי ריק, כדי מים מוטים על צידם ועיזים כחושות',
  },
  thar: {
    src: 'trait-thar.webp',
    alt: 'שתי קבוצות רוכבים בדואים עוצרות זו מול זו משני עברי מרחב אבנים ריק בשעת ערב, רמחים זקופים, איש אינו מתקדם',
  },
}

/** Open a trait's dialog. Addressed by id rather than through a ref because the
    rail links to the same id from outside this subtree. */
function openTrait(id: string): void {
  const d = document.getElementById(`trait-${id}`) as HTMLDialogElement | null
  if (d && !d.open) d.showModal()
}

/** The card. The heading is a real `<h3.ch2-sub>` — the shape gate counts those,
    the rail anchors to them — and the button lives INSIDE it, stretched over the
    whole card by `::after`. A `<button>` wrapping an `<h3>` would be invalid
    (a button may only hold phrasing content) and would cost the heading. */
function TraitCard({ id }: { id: string }) {
  const s = sub('culture', id)
  const art = TRAIT_ART[id]
  return (
    <article className="ch2-card" data-reveal>
      <span className="ch2-card-art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/chapter2/${art.src}`} alt={art.alt} />
      </span>
      <span className="ch2-card-text">
        <h3 className="ch2-sub" id={id}>
          <button type="button" className="ch2-card-btn" onClick={() => openTrait(id)}>
            {s.title}
            {s.term && <span> ({s.term})</span>}
          </button>
        </h3>
        {/* the affordance: this card opens onto something. A chevron on the
            outer edge, drawn from two borders on an inner box so the rotated
            square cannot grow past the corner it sits in — the column check
            caught exactly that when the rotation was on the box itself. */}
        <span className="ch2-card-go" aria-hidden="true" />
      </span>
    </article>
  )
}

/** The dialog behind a card.

    A real `<dialog>` + `showModal()`: focus trap, Esc, inertness of the page
    behind it and the top layer all come from the platform. And — the reason it
    is a dialog rather than a component mounted on demand — **its children are in
    the DOM whether it is open or not**. `audit.mjs` proves every source fragment
    reaches the page, and the chapter's own search walks text nodes; a popup that
    rendered its content only when opened would pass the gate silently and go
    invisible to search, which is the §6.a failure told again. */
function TraitDialog({ id, children }: { id: string; children: React.ReactNode }) {
  const s = sub('culture', id)
  return (
    <dialog
      className="ch2-modal"
      id={`trait-${id}`}
      aria-labelledby={`${id}-modal-title`}
      /* the backdrop is part of the dialog's own box, so a click that lands on
         the element itself — and not on the panel inside it — is a click outside */
      onClick={(e) => { if (e.target === e.currentTarget) (e.currentTarget as HTMLDialogElement).close() }}
    >
      <div className="ch2-modal-panel">
        <form method="dialog">
          <button className="ch2-modal-close" aria-label="סגירת החלון">
            <span aria-hidden="true">×</span>
          </button>
        </form>
        <h3 className="ch2-modal-title" id={`${id}-modal-title`}>
          {s.title}
          {s.term && <span> ({s.term})</span>}
        </h3>
        <div className="ch2-modal-body">{children}</div>
      </div>
    </dialog>
  )
}

/** A sentence the source itself marks as a quotation.
    Chapter 6's own treatment — `.shahada-quote`: a gold-ruled card with bracket
    corners and a quotation mark hung at each end. Same object, same marks.

    Kept for the hadith alone. The chapter quotes three times, and dressing a
    poem, a proverb and a hadith in one identical card put the same object in
    three consecutive sections — see `Verse` and `Saying` below. */
function Quote({ children, long = false }: { children: React.ReactNode; long?: boolean }) {
  return (
    <blockquote className={'ch2-quote' + (long ? ' is-long' : '')} data-reveal>
      <span className="sq-mark sq-open" aria-hidden="true">”</span>
      <div className="ch2-quote-body">{children}</div>
      <span className="sq-mark sq-close" aria-hidden="true">”</span>
    </blockquote>
  )
}

/** Verse. A poem's line breaks ARE its structure, so each source line is its own
    row and the card is dropped — inside it the longest line wrapped. Centred:
    this is one of the chapter's steps off the reading column. */
function Verse({ r }: { r: string }) {
  return (
    <blockquote className="ch2-verse" data-reveal>
      {list(r).map((line) => (
        <span key={line}>{line}</span>
      ))}
    </blockquote>
  )
}

/** A saying — speech, not scripture. Display type on the reading edge and
    nothing else around it: no card, no rule, no quotation mark. */
function Saying({ r }: { r: string }) {
  return (
    <blockquote className="ch2-saying" data-reveal>
      <p>{text(r)}</p>
    </blockquote>
  )
}

/** The chapter's turn — chapter 6's `.pillars-statement`. A centred declaration
    at display scale, the one place outside a heading that earns it. */
function Statement({ main, sub: subRef }: { main: string; sub: string }) {
  return (
    <div className="ch2-statement" data-reveal>
      <b>{text(main)}</b>
      <span>{text(subRef)}</span>
    </div>
  )
}

/* ---------------- the peninsula chart ----------------
   The chapter's one informational graphic: it shows what the sentences cannot —
   where the two empires sat relative to the tribes, and which way the trade ran.
   The legend does not dim layers for effect; it brings the sentence that layer
   is about. */

/* The legend switches what the MAP draws. It used to switch which SENTENCE was
   printed, and that was a mistake with two heads:

     · Mecca was a "layer" whose sentence was §5.a — the one that introduces the
       tribes at all — so the section opened on "חלקם היו בקשרים עם האימפריה",
       and "חלקם" pointed at tribes never mentioned.
     · Worse, only the ACTIVE layer's sentence was rendered, so §6.a — the only
       fragment in the chapter naming the bedouins, glossing בּאדִיה and naming
       the incense and silk roads — was never in the DOM at all. Not hidden:
       absent. The chapter's own search could not find it.

   Now §5.b and §6.a are prose on the page where they belong, Mecca is a fixed
   landmark rather than a layer, and the legend does one honest job: it shows a
   thing on the map. */
type Layer = 'empires' | 'routes'
const LAYER_LABEL: Record<Layer, string> = {
  empires: 'שתי האימפריות',
  routes: 'נתיבי המסחר',
}

function PeninsulaChart() {
  const [layer, setLayer] = useState<Layer>('empires')
  return (
    <div className="ch2-chart" data-reveal>
      {/* the stage says "לחצו כדי להמשיך" and the map said nothing — two pills
          above a picture do not announce that the picture answers to them.
          Chapter 6 puts a line before an interaction (`.explore-block`); so does
          this. UI copy, not chapter text. */}
      <p className="ch2-chart-hint" aria-hidden="true">בחרו שכבה כדי לראות אותה על המפה</p>
      <div className="ch2-chart-legend" role="group" aria-label="שכבות המפה">
        {(Object.keys(LAYER_LABEL) as Layer[]).map((k) => (
          <button
            key={k}
            type="button"
            className="ch2-layer-btn"
            aria-pressed={layer === k}
            onClick={() => setLayer(k)}
          >
            <i aria-hidden="true" />
            {LAYER_LABEL[k]}
          </button>
        ))}
      </div>

      <figure className="ch2-chart-figure">
        {/* The map is a painted plate; the layers are SVG on top of it, so every
            label stays REAL TEXT — searchable by the chapter's search, readable
            by a screen reader, and in the chapter's own face. The first two
            drafts drew the peninsula as an SVG blob, which looked like a
            placeholder because it was one. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/chapter2/peninsula-map.jpg" alt="מפת חצי האי ערב" loading="lazy" />
        <svg viewBox="0 0 1200 900" role="img" aria-label="חצי האי ערב, שתי האימפריות מצפון ונתיבי המסחר">
          <g className={`ch2-chart-layer${layer === 'empires' ? ' is-on' : ''}`} aria-hidden={layer !== 'empires' || undefined}>
            {/* A NAME WRITTEN ALONG ITS OWN LINE, not beside it.
                Set as free-floating words, these read as thrown onto the map:
                a thick maroon arc and, somewhere near it, an adjective. Nothing
                said the arc WAS the empire. Written along the curve the arc
                becomes the empire's edge and the word its caption, which is how
                every historical atlas names a sphere.
                The paths run RIGHT to LEFT so the Hebrew advances the way it is
                read; the stroke is symmetrical, so reversing `d` changes only
                the direction the glyphs are laid down. */}
            <path id="ch2-arc-byz" d="M40,205 C120,115 250,81 372,81" fill="none" stroke="#8a2733" strokeWidth="13" strokeLinecap="round" opacity=".85" />
            <path id="ch2-arc-sas" d="M660,89 C790,113 900,183 986,287" fill="none" stroke="#8a2733" strokeWidth="13" strokeLinecap="round" opacity=".85" />
            <text fontFamily="Kedem, serif" fontSize="34" fontWeight="700" fill="#8a2733" textAnchor="middle" dy="-17">
              <textPath href="#ch2-arc-byz" startOffset="50%">ביזנטית</textPath>
            </text>
            <text fontFamily="Kedem, serif" fontSize="34" fontWeight="700" fill="#8a2733" textAnchor="middle" dy="-17">
              <textPath href="#ch2-arc-sas" startOffset="50%">סאסאנית</textPath>
            </text>
          </g>
          <g className={`ch2-chart-layer${layer === 'routes' ? ' is-on' : ''}`} aria-hidden={layer !== 'routes' || undefined}>
            {/* the incense road, NORTH to south down the western side — drawn in
                that direction, like the arcs above, so its name reads along it */}
            <path
              id="ch2-road-incense"
              d="M520,806 C452,700 400,596 388,486 C376,376 358,236 340,104"
              fill="none" stroke="#856016" strokeWidth="6" strokeDasharray="17 15" strokeLinecap="round"
            />
            {/* the silk road, reaching in from the east */}
            <path id="ch2-road-silk" d="M560,92 C720,140 900,206 1040,268" fill="none" stroke="#856016" strokeWidth="6" strokeDasharray="17 15" strokeLinecap="round" />
            {/* THE RULE FOR ALL FOUR LABELS: a name is attached to its line —
                written ALONG it where the line is flat enough to carry reading
                type, and set at the line's END where it is not. That is what an
                atlas does, and it is what these labels were missing: set loose
                on the paper they read as words dropped near a stroke.

                The silk road runs 20° off horizontal, so its name follows it.
                The incense road climbs the western mountains at 70°, and along
                that the name came out vertical and upside-down — so it is set
                horizontally at the southern end where the road begins, close
                enough to the last dash to belong to it (23 units, measured). */}
            <text fontFamily="Kedem, serif" fontSize="30" fontWeight="700" fill="#856016" textAnchor="middle" dy="-13">
              <textPath href="#ch2-road-silk" startOffset="50%">דרך המשי</textPath>
            </text>
            <text x="770" y="826" fontFamily="Kedem, serif" fontSize="30" fontWeight="700" fill="#856016">דרך הבשמים</text>
          </g>
          {/* Mecca is always on: it is the fixed point the whole chapter turns
              around, and hiding a city behind a toggle is not a layer, it is a
              missing label. */}
          <g>
            <circle cx="378" cy="446" r="14" fill="#c79a3c" stroke="#571820" strokeWidth="4" />
            {/* under the inherited direction:rtl, textAnchor="end" anchors the LEFT edge,
                so the word runs rightward from x — at 352 it ran straight through
                the dot it labels (measured: 77 units of overlap). */}
            <text x="408" y="456" fontFamily="Kedem, serif" fontSize="36" fontWeight="700" fill="#571820" textAnchor="end">מכה</text>
          </g>
        </svg>
      </figure>

    </div>
  )
}

/* ---------------- the chapter ---------------- */

export default function Chapter2() {
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
    /* A URL the reader actually asked for beats the resume point. Without this
       both fire on mount and whichever lands last wins — it happened to be the
       hash, but that is a race, not a decision. */
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

  /* Which MOVEMENT the reader is in, not just which section. Six sub-headings
     sit in the rail; without this they are links that never say where you are,
     and a reader inside גבריות sees only "התרבות השבטית" lit. A sub stays
     current from its own heading until the next one arrives. */
  useEffect(() => {
    const subs = SECTIONS.flatMap((s) => (s.subs ?? []).map((x) => x.id))
    const nodes = subs.map((id) => document.getElementById(id)).filter((n): n is HTMLElement => !!n)
    if (!nodes.length) return
    const io = new IntersectionObserver(
      () => {
        const line = window.innerHeight * 0.34
        let active: string | null = null
        for (const n of nodes) {
          const r = n.getBoundingClientRect()
          /* the last sub-heading whose top has crossed the line, and only while
             its own section is still on screen */
          const sec = n.closest('.article-section')?.getBoundingClientRect()
          if (r.top <= line && sec && sec.bottom > line) active = n.id
        }
        setCurrentSub(active)
      },
      { rootMargin: '0px', threshold: [0, 0.5, 1] },
    )
    nodes.forEach((n) => io.observe(n))
    const onScroll = () => {
      const line = window.innerHeight * 0.34
      let active: string | null = null
      for (const n of nodes) {
        const r = n.getBoundingClientRect()
        const sec = n.closest('.article-section')?.getBoundingClientRect()
        if (r.top <= line && sec && sec.bottom > line) active = n.id
      }
      setCurrentSub((cur) => (cur === active ? cur : active))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
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
      setCollapsed(localStorage.getItem('ch2:side-collapsed') === '1')
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
        localStorage.setItem('ch2:side-collapsed', next ? '1' : '0')
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
            {/* a <p>, not an <h2>: the drawer sits before the article in the DOM,
                so as a heading it put an H2 ahead of the page's own H1 and a
                reader navigating by headings met the menu before the chapter.
                The landmark is already named by the aside's aria-label. */}
            <p className="menu-title">תוכן הפרק</p>
            <span className="menu-sub">{CH2.menuTitle}</span>
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
                      <svg className="menu-done" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5" /></svg>
                    )}
                  </a>
                  {/* the sub-headings ride under their section, as chapter 6's rail does */}
                  {s.subs && (
                    <ul className="menu-subs">
                      {s.subs.map((sb) => (
                        <li key={sb.id}>
                          <a
                            href={`#${sb.id}`}
                            className={currentSub === sb.id ? 'is-current' : undefined}
                            aria-current={currentSub === sb.id ? 'true' : undefined}
                            onClick={() => { openTrait(sb.id); onMenuJump(); setDrawer(false) }}
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
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              לכל פרקי הלמידה
            </Link>
          </div>
        </aside>
        {drawer && <div className="chapter-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}

        <div className="chapter-content">
          <div className="chapter-layout">
            <main className="chapter-article" ref={articleRef}>

              {/* ============ 01 · the peninsula ============ */}
              {/* ============ 01 · the lineage, and the Kaaba ============
                  The content document opens here — „ייחוסו של מוחמד וישמעאל" is
                  its first topic, and §1–§4 belong to it. An earlier build folded
                  that material into „מכה והכעבה" in fifth place; it is back at
                  the front, where the document puts it. */}
              <Section id="lineage" className="opening-section">
                <div className="ch2-hero">
                  <div className="ch2-hero-media" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {/* the banner is the largest thing painted on first view, so
                        it is fetched eagerly and at high priority rather than
                        competing with the five stage frames below it */}
                    <img src="/assets/chapter2/hero-desert.jpg" alt="" loading="eager" fetchPriority="high" decoding="async" />
                  </div>
                  <div className="ch2-hero-copy">
                    <h1 className="ch2-hero-title">{CH2.title}</h1>
                  </div>
                </div>
                <Head id="lineage" />
                <div className="ch2-body ch2-wide" data-reveal>
                  <T r="§0.a" em={['ישמעאל']} />
                </div>

                {/* PLAIN RUNNING TEXT, in the document's own paragraphing.

                    This part has been through a numbered timeline (which claimed
                    a chronology the source does not have — in the document's
                    order „שיקמו את הכעבה" comes two stops before anything says the
                    Kaaba was ever broken) and then through prose with the two
                    remarks pulled out as asides. Both were devices laid over
                    text that does not need one. The document prints two
                    paragraphs with the remarks in round brackets inside the
                    sentences they belong to, and that is what is printed here.

                    No sub-heading either: „לפי המסורת" is how the paragraphs under
                    it already open, so a heading with those words on it was the
                    page saying the same thing twice, once in a louder voice.

                    The prose runs the FULL COLUMN here — see `.ch2-wide`. Three
                    short paragraphs at the chapter's measure left 612px of empty
                    parchment beside them at 1920, and this was asked for with the
                    line lengths on the table. Two columns were tried first and
                    were not what was wanted. */}
                <div className="ch2-body ch2-wide" data-reveal>
                  <T
                    r={['§1.a', '§1.b', '(§1.gloss)']}
                    em={['לחצי האי ערב', termOf('§1.gloss')]}
                  />
                  <T
                    r={['§2.a', '§3.a', '(§3.aside)', '§4.a']}
                    em={['שיקמו את הכעבה', 'אבני היסוד']}
                  />
                </div>
              </Section>

              {/* ============ 02 · the peninsula and its tribes ============ */}
              <Section id="peninsula">
                <Head id="peninsula" />
                {/* the map stands BESIDE its prose on a wide screen rather than
                    under it: the paragraphs name the two empires and the trade
                    roads that the map draws, so the reader should be able to
                    look while reading — and the outer half of the page was
                    otherwise empty down the whole opening. */}
                <div className="ch2-withmap" data-reveal>
                  <div className="ch2-body">
                    {/* §5.a introduces the tribes, so it leads — the layers can
                        then say things ABOUT them without dangling pronouns */}
                    <T r="§5.a" em={['רובם נודדים']} />
                    <T r={['§5.b', '§6.a']} em={['בדואים', "בּאדִיה"]} />
                  </div>
                  <PeninsulaChart />
                  {/* §7.a names two fathers and the pair below defines them —
                      chapter 6's centred lead over a centred row, and the first
                      place this chapter leaves the reading column. They stay
                      here, in DOM order after the map, so that stacked the
                      section still reads prose → map → lead → pair; the grid
                      alone lifts them into the text column beside the map. */}
                  <T r="§7.a" className="ch2-lead" reveal />
                  <Pair refs={['§7.b', '§8.a']} centred />
                </div>
              </Section>

              {/* ============ 02 · the desert — the full-screen stage ============
                  The heading stays on the paper, as chapter 6 does above its own
                  immersive scene; the stage itself is full-bleed underneath it. */}
              <Section id="desert">
                <Head id="desert" />
                <DesertStage />
              </Section>

              {/* ============ 03 · tribal culture — all FOUR traits inside ============
                  עצביה, מרואה, קבורת בנות and ת'אר. The source sets all four under one
                  running head, „מאפייני התרבות השבטית · …", and an earlier build split
                  the last two off into a section of their own called „שני מנהגים" —
                  which made them read as a fresh subject rather than as what this
                  culture DOES when it meets famine and blood. They are sub-headings
                  here, where they belong, and the chapter runs six sections. */}
              <Section id="culture">
                <Head id="culture" />
                <div className="ch2-body" data-reveal>
                  <T r={['§13.a', '§14.a']} em={['אתגר לקיומם של חוקי מדינה', 'קודם כול לחוקי השבט']} />
                  {/* §14.b is the word „לדוגמה:" and a colon — it introduces the
                      two lines under it. Fused into the paragraph above, the
                      example ran straight on from the claim, and §14.no ("לא
                      באמצעות מנגנונים מדינתיים כמו משטרה או בתי משפט") landed as
                      a sentence with no verb in it. It leads its own line now. */}
                  <T r={['§14.b', '§14.yes', '§14.no']} em={['בורר שבטי']} />
                </div>

                {/* THE FOUR TRAITS — one row of cards, each opening its own
                    dialog. The row is the whole of this culture at a glance;
                    everything the source says about each trait is behind it.
                    The heading over it is the source's own running head, and it
                    comes from layout.json: this file writes no words. */}
                <h3 className="ch2-sub ch2-cards-title">{meta('culture').cardsTitle}</h3>
                <div className="ch2-cards">
                  <TraitCard id="asabiyya" />
                  <TraitCard id="muruwa" />
                  <TraitCard id="wad" />
                  <TraitCard id="thar" />
                </div>

                <div className="ch2-modals">
                  <TraitDialog id="asabiyya">
                    <div className="ch2-body">
                      <T r={['§15.a', '§15.b']} em={['בלתי אפשרי']} />
                    </div>
                    <Cycle refs={['§15.one', '§15.many']} />
                    <div className="ch2-body ch2-after-device">
                      <T r="§16.a" />
                    </div>
                    <Verse r="§16.poem" />
                    <div className="ch2-body">
                      <T r="§16.b" />
                    </div>
                  </TraitDialog>

                  <TraitDialog id="muruwa">
                    <div className="ch2-body">
                      <T r={['§17.a', '§17.list', '§18.a', '§18.list']} em={['נדיב']} />
                      <T r="§19.a" em={['מעמדו וכבודו']} />
                    </div>
                  </TraitDialog>

                  {/* §21 derives this custom from the מרואה ideal itself, which is
                      why that clause is the emphasis */}
                  <TraitDialog id="wad">
                    <div className="ch2-body">
                      <T r={['§20.a', '§21.a', '§22.a', '§22.list']} em={['אינן מסוגלות להילחם כמו גברים']} />
                    </div>
                  </TraitDialog>

                  <TraitDialog id="thar">
                    {/* no picture inside this one: the two camps ARE the card the
                        reader just clicked, and repeating the same painting two
                        seconds later says nothing the card has not already said */}
                    <div className="ch2-body">
                      <T r={['§23.a', '§23.b']} em={['מוסד חברתי מרכזי']} />
                    </div>
                    {/* the diagram IS the text: one default and the two ways out */}
                    <div className="ch2-diagram">
                      {/* no label above it. „ברירת המחדל" was a phrase this file
                          wrote — the one thing the file is not allowed to do —
                          and the sentence inside says what it is without help. */}
                      <div className="ch2-diagram-node">
                        <p>{text('§24.a')}</p>
                      </div>
                      <p className="ch2-diagram-label">{text('§25.a')}</p>
                      {/* both exits carry their own term in parentheses — "תשלום
                          כופר נפש (עטוה)" — so a heading above them said the word
                          twice. The term is emphasised inside the sentence. */}
                      <div className="ch2-diagram-exits">
                        <div className="ch2-diagram-node">
                          <T r="§25.atwa" em={[termOf('§25.atwa')]} />
                        </div>
                        <div className="ch2-diagram-node">
                          <T r="§25.sulh" em={[termOf('§25.sulh')]} />
                        </div>
                      </div>
                    </div>
                    <div className="ch2-body ch2-after-device">
                      <T r={['§25.b', '§26.a']} em={['הסבלנות']} />
                    </div>
                    <Saying r="§26.quote" />
                  </TraitDialog>
                </div>
              </Section>

              {/* ============ 06 · the jahiliyya — claim and answer ============ */}
              <Section id="jahiliyya">
                {/* The seated figure bleeds off the OUTER (left) edge and the
                    section reads down the column he leaves free — the heading,
                    the list of what the period is described as, and the two
                    meanings beside him. He is turned to face the text.

                    This is the block that used to open „התרבות השבטית"; that
                    section is a row of cards now and had no use for him. The
                    contained night plate of the abandoned precinct that stood
                    here is gone with him — one picture to a section. */}
                <div className="ch2-bleedwrap">
                  <div className="ch2-bleed-img" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/chapter2/arbiter.webp" alt="" loading="lazy" />
                  </div>
                  <Head id="jahiliyya" />
                  <div className="ch2-body" data-reveal>
                    <T r={['§27.a', '§27.list']} />
                  </div>
                </div>

                {/* THE FORK. §27.b is the sentence that names the period, so it is
                    the head of the tree rather than the last line of a paragraph:
                    the word itself is set large, and two arms come down from it
                    into the two meanings.

                    The whole thing sits OUTSIDE the illustrated block on purpose —
                    beside the figure the free column is about 527px at 1600, and
                    two columns in it would be 240px, twenty-three characters,
                    which is not a line. Out here each gets about 55.

                    The tree does the work „למושג שתי משמעויות" used to do, which is
                    why that sentence could come off the page. */}
                <div className="ch2-fork" data-reveal>
                  {/* a div, not a `<p>`: `T` renders a paragraph of its own, and
                      a `<p>` inside a `<p>` is closed by the parser — the server
                      and client then disagree and React re-renders the subtree.
                      The audit's pageerror listener caught it. */}
                  <div className="ch2-fork-head">
                    <T r="§27.b" em={["הג'אהליה"]} />
                  </div>
                  <div className="ch2-fork-tree" aria-hidden="true">
                    <span className="ch2-fork-stem" />
                    <span className="ch2-fork-bar" />
                    <span className="ch2-fork-arm is-start" />
                    <span className="ch2-fork-arm is-end" />
                  </div>
                  <div className="ch2-meanings is-forked">
                    <article className="ch2-meaning">
                      <b>{nameOf('§28.claim')}</b>
                      <p>{text('§28.claim')}</p>
                      <p className="ch2-answer">{text('§28.answer')}</p>
                      {/* the „עִלְם · ידע" gloss was taken off the page. The answer
                          just above already names the term inside its own
                          sentence — „כדת של ידע (עִלְם)" — so the gloss repeated
                          both halves of itself one line later. */}
                    </article>
                    <article className="ch2-meaning">
                      <b>{nameOf('§29.claim')}</b>
                      <p>{text('§29.claim')}</p>
                      <p className="ch2-answer">{text('§29.answer')}</p>
                    </article>
                  </div>
                </div>
              </Section>

              {/* ============ 05 · Mecca and the Kaaba ============ */}
              <Section id="mecca">
                <Head id="mecca" />
                {/* the plate stands BESIDE its prose, not above it: what the text
                    describes is a place with things IN it — the Kaaba, the black
                    stone, the 360 idols, Quraysh feeding the pilgrims — so the
                    reader should be able to look while reading. */}
                <div className="ch2-beside" data-reveal>
                  <figure className="ch2-precinct">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/chapter2/mecca-precinct.jpg" alt="מכה בתקופת הג'אהליה — מבט על מתחם הכעבה" loading="lazy" />
                  </figure>
                  <div className="ch2-body">
                    <T r={['§30.a', '§31.a']} em={['האבן השחורה']} />
                    <T r={['§32.a', '§33.a', '§33.list']} em={['קורייש']} />
                  </div>
                </div>
              </Section>

              {/* ============ 07 · what was kept and what was rejected ============ */}
              <Section id="legacy">
                <Head id="legacy" />
                {/* the sentence in which the desert becomes Islam: the chapter
                    leaves the reading column for it, as chapter 6 does at each
                    of its own turns, and comes back for the ledger below. */}
                <Statement main="§34.a" sub="§34.b" />
                <div className="ch2-verdicts" data-reveal>
                  <p className="ch2-verdict-intro">{text('§35.a')}</p>
                  <dl>
                    <div className="ch2-verdict-row">
                      <dt>{subLabel('culture', 'muruwa')}</dt>
                      <dd>{text('§35.muruwa')}</dd>
                    </div>
                    <div className="ch2-verdict-row">
                      <dt>{subLabel('culture', 'thar')}</dt>
                      <dd>{text('§35.thar')}</dd>
                    </div>
                  </dl>
                </div>
                {/* §37.a opens the עצביה verdict — a new subject, and the one the
                    hadith below answers. Fused onto the rejected-practices list it
                    read as a fourth item in that list. */}
                <div className="ch2-body ch2-after-device" data-reveal>
                  <T r={['§36.a', '§36.wad', '§36.lots']} />
                  <T r="§37.a" em={['הנאמנות השבטית העיוורת']} />
                </div>
                {/* 45 words: the shahada card is built for one short line, and at
                    this length centred display type breaks into six ragged rows */}
                <Quote long>{text('§37.hadith')}</Quote>
                <div className="ch2-body" data-reveal>
                  <T r="§37.b" em={['הכפיף את הנאמנות אליו לנאמנות לאללה']} />
                </div>
              </Section>

              <div className="ch2-end" ref={endRef} data-reveal>
                <Link className="ch2-end-link" href="/chapter2/practice">לתרגול המסכם</Link>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
