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
import ComicPart from '@/components/Chapter3ComicPart'
import revelationComic from '@/lib/chapter3/revelation-comic.json'
import nightComic from '@/lib/chapter3/night-comic.json'
import { useFindHit } from '@/lib/chapter3/useFindHit'
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
  /** most section titles are the source's running head, copied into the layout */
  title?: string
  /** …but where the running head IS a fragment of the source, the title reads it
      from there instead. §4.ask was printed twice — once as this section's title
      and once as a Statement under it, in two different sets of quote marks. */
  titleRef?: string
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
/* TWO REGISTERS, rule 38: maroon `.key` for the idea a sentence turns on, gold
   `.ch3-tr` for a transliterated term — chapter 5's `.ch5-tr`. A phrase that is
   in both is a term, and takes the gold. */
function emphasise(s: string, em: string[], keyBase: string, tr: string[] = []): React.ReactNode[] {
  if (!em.length && !tr.length) return [s]
  const all = [...tr, ...em]
  const parts: React.ReactNode[] = []
  let rest = s
  let k = 0
  while (rest.length) {
    let at = -1
    let hit = ''
    for (const phrase of all) {
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
      <b className={tr.includes(hit) ? 'ch3-tr' : 'key'} key={`${keyBase}-${k++}`}>
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
  /* each fragment's own `term` — the transliteration the source prints in it */
  const tr = refs
    .map((x) => frag((PARENTHETICAL.exec(x) ?? OWN_LINE.exec(x))?.[1] ?? x).term)
    .filter((t): t is string => !!t)
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

  /* AN EMPHASIS THAT MATCHES NOTHING IS A BUG, NOT A NO-OP. Chapter 4's §57
     asked for „דת מוחמד" in curly quotes against a text in straight ones, and
     the word simply never went bold — nobody saw it for weeks. */
  if (process.env.NODE_ENV !== 'production') {
    for (const phrase of em) {
      if (!lines.some((l) => l.text.includes(phrase)))
        console.error(`T ${refs.join('+')}: emphasis „${phrase}" is not in the text`)
    }
  }

  const rv = reveal ? { 'data-reveal': true } : {}
  const out: React.ReactNode[] = []
  lines.forEach((line, i) => {
    if (line.intro) {
      if (i) out.push(' ')
      out.push(
        <span className="ch3-intro" key={`i${i}`}>
          {emphasise(line.text, em, `l${i}`, tr)}
        </span>,
        ' ',
      )
      return
    }
    if (i && !lines[i - 1].intro) out.push(<br key={`br-${i}`} />, ' ')
    if (line.item) {
      out.push(
        <span className="ch3-item" key={`it${i}`}>
          {emphasise(line.text, em, `l${i}`, tr)}
        </span>,
      )
      return
    }
    out.push(...emphasise(line.text, em, `l${i}`, tr))
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
/** A section's title. Usually the source's running head copied into the layout;
    where that head is itself a fragment, it is READ from the fragment so the
    same words cannot appear twice in two different sets of quote marks. */
const titleOf = (id: string): string => {
  const s = meta(id)
  if (s.titleRef) return text(s.titleRef)
  if (!s.title) throw new Error(`chapter 3: section ${id} has no title`)
  return s.title
}

function Head({ id }: { id: string }) {
  return (
    <header className="section-heading" data-reveal>
      <div>
        <h2 id={`${id}-title`}>{titleOf(id)}</h2>
      </div>
      <div className="title-ornament section-ornament" aria-hidden="true">
        <span />
      </div>
    </header>
  )
}

/** A movement inside a section. Its title is the name the SOURCE gives the
    thing — אלתחנת', אלבראק, ההגירה הראשונה — never a label we compose. */
/* The transliterated term rides IN the heading when the layout records one.
   It was already sitting in layout.json unused, so „מוץ נאכל" stood alone and
   the reader had to reach the middle of the first example to learn what the
   phrase is. Same data, one line higher. */
function SubHead({ section, id }: { section: string; id: string }) {
  const s = sub(section, id)
  return (
    <h3 className="ch3-sub" id={id} data-reveal>
      {s.title}
      {s.term && s.term !== s.title ? <span className="ch3-sub-term">{s.term}</span> : null}
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

/** One picture, on paper, beside the prose it belongs to.

    NO TEXT IS BURNED INTO ANY PLATE and none carries a caption over it — both
    were deleted from chapter 2 and do not come back. `alt=""` with
    `aria-hidden`: every fact lives in the text, and a plate that tried to carry
    one would be a fact only sighted readers get.

    ⚠ AND NO HUMAN FIGURE IN ANY OF THEM. Not Muhammad, not Gabriel, not a
    crowd, not a faceless silhouette — chapter 2 drafted exactly that for its
    own opening and it was rejected and deleted. These three are a town, a
    cargo and a precinct: places, objects, light. */
/* THREE SIZES, AND THE REASON IS A MEASUREMENT. Every plate in this chapter
   rendered at exactly 453px — seven identical thumbnails down eleven thousand
   pixels. Measured against the siblings at 1500px, the image widths run:

     chapter 6   1284 ×5 · 1080 · 1028 · 579 · 475 · 244 ×3 · 82 ×5
     chapter 2   1185 ×7 · 760 · 469 · 373 · 331 ×2 · 248 ×4
     chapter 3   453 ×7

   Both siblings are dominated by pictures at or beyond the column, with small
   ones for rhythm. This chapter had no large image at all: its biggest was
   smaller than chapter 2's second-smallest tier. A picture that never becomes
   an event is why the chapter read as a text with illustrations while the
   others read as chapters.

   `bleed` breaks the content gutter for a wide landscape band; `wide` fills the
   column for a picture that must not be cropped hard; the default inset keeps
   the beside-the-prose treatment for the three intimate subjects.

   `cut` is a different object entirely — a watercolour on transparent ground
   that floats on the parchment with no frame, no rule and no crop, which is
   how chapter 6 sets its shahada illustration. It was the one object type this
   chapter did not have at all. */
function Plate({ src, size = 'inset' }: { src: string; size?: 'inset' | 'wide' | 'bleed' | 'cut' }) {
  return (
    <figure className={'ch3-plate' + (size === 'inset' ? '' : ` is-${size}`)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/assets/chapter3/${src}`} alt="" aria-hidden="true" loading="lazy" decoding="async" />
    </figure>
  )
}

/** A DOCUMENT, NOT A PAINTING — and the one object in this chapter that is
    neither. Every `Plate` above is a commissioned watercolour or oil of a
    place, and carries `alt=""` because it states no fact. This is a photograph
    of a real proclamation, it is the evidence for the claim beside it, and so
    it is the one picture here that is captioned and described.

    THE FRAME IS CHAPTER 2'S `.ch2-photo`, PROPERTY FOR PROPERTY — hairline
    `--edge`, 14px, the one shadow, and the sepia that marries a photograph to
    the parchment. Chapter 2 sets its two real photographs (מקאם אברהים, הכעבה)
    exactly this way and says why in its own comment: a photograph gets a frame
    precisely so it does not read as one of the paintings that sit on the paper
    with no frame at all.

    BOTH STRINGS ARE §47 — the component writes no sentence. The caption is the
    source's, and it is also the alt: the figure and its description say the
    same thing because the source gave one sentence for both. */
function Document({ src, r }: { src: string; r: string }) {
  return (
    <figure className="ch3-doc" data-reveal>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/assets/chapter3/${src}`} alt={text(r)} loading="lazy" decoding="async" />
      <figcaption>{text(r)}</figcaption>
    </figure>
  )
}

/* ---------------- a note on the story, not the story ----------------

   THE PAGE SHOWED EVERYTHING AT ONCE and read as a wall. Chapter 2 holds 950
   source words and puts ~556 on screen, because its stage and its four dialogs
   ABSORB the rest; this chapter refused those devices on fidelity grounds and
   so printed all 1,544 words in one run.

   What folds here is never the story. It is the material that comments ON the
   story — an etymology, what the commentators make of a passage, a dispute
   about a word, the counter-argument Mecca made. A first read runs clean; the
   reader who wants the apparatus opens it.

   NOTHING IS DELETED AND NOTHING LEAVES THE DOM. The text is always rendered
   and only clipped by CSS — no `hidden`, no `inert`, no conditional render.
   That is the same rule chapter 2's dialogs follow, and for the same two
   reasons: the presence gate proves every fragment reaches the page, and
   ChapterSearch walks the DOM. A note that holds a search hit opens itself. */
function Note({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  /* if the in-chapter search lands inside a closed note, the note opens: a hit
     the reader cannot see is worse than no hit at all.
     ⚠ THIS USED TO LISTEN FOR `focusin`, AND IT NEVER FIRED — ChapterSearch
     paints highlights and moves no focus. Measured when section 05's text moved
     into a note: a search for „טיפת דם קרוש" landed in it and it stayed shut.
     `useFindHit` reads the highlight registry instead; see its comment. */
  useFindHit(bodyRef, () => setOpen(true))

  /* ⚠ `data-reveal` AND THE OPEN CLASS MUST NOT SHARE AN ELEMENT.
     The reveal observer adds `is-inview` straight to the DOM node. React owns
     `className` on any element whose class it renders, and it rewrites the whole
     attribute whenever the value changes — so the first click replaced
     "ch3-note is-inview" with "ch3-note is-open", the reveal class was gone, and
     the note faded to opacity 0. Clicking a note made it disappear.
     The outer element keeps a CONSTANT className (React never writes it after
     mount) and carries the reveal; the state class lives on an inner element
     that is not revealed. */
  return (
    <div className="ch3-note" data-reveal>
      <div className={'ch3-note-in' + (open ? ' is-open' : '')}>
        <button
          type="button"
          className="ch3-note-btn"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="ch3-note-mark" aria-hidden="true" />
          {label}
        </button>
        <div className="ch3-note-body" id={`${id}-body`} ref={bodyRef}>
          <div className="ch3-body">{children}</div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- the ancient word, reused today ----------------

   §§4–6 IS THE CHAPTER'S REGISTER CHANGE and it had nothing on it. It ran as
   two plain prose blocks — five fragments, no picture, no device — in a
   chapter whose neighbours all carry one.

   NO IMAGERY, and that has not moved: no drones, no ordnance, no organisation
   marks, no operations graphics. The event here is typographic, which is the
   only kind this material can safely have.

   WHAT THE DEVICE SHOWS is a structure the source states and the prose cannot
   hold in one view: one phrase out of the Quranic account of the elephant,
   „מוץ נאכל", claimed as an operation name TWICE — by two different
   organisations, twelve years and one border apart (§5, §6). Two rows, one per
   claim, so the repetition is the shape of the figure instead of something the
   reader has to notice across two paragraphs.

   §4.ababil STAYS IN THE PROSE ABOVE. It is a different word being reused for a
   different thing, and it sits under a different running head; pulling it in
   here would put a row about אבאביל beneath a sub-heading that reads
   „מוץ נאכל".

   IT ADDS NO WORDS AND CONSUMES NOTHING TWICE. Each row prints its fragment in
   full, exactly once, and the recurring term is marked inside the sentence by
   `emphasise` — the mechanism already used everywhere else in this file. */
function Reuse() {
  /* Each row is labelled with the organisation that made the claim, so the two
     read as two EXAMPLES of the same phrase being taken rather than as two
     paragraphs that happen to sit in a box. `pick` guarantees the label is a
     word of the row's own source sentence and throws if it ever stops being
     one — the label can never drift from the text under it. */
  const rows: { r: string; who: string; em: string[] }[] = [
    { r: '§5.a', who: 'חמאס', em: ['מוץ נאכל'] },
    { r: '§6.a', who: 'חזבאללה', em: ['מוץ נאכל'] },
  ]
  return (
    <div className="ch3-reuse" data-reveal>
      {rows.map(({ r, who, em }) => (
        <div className="ch3-reuse-row" key={r}>
          <b className="ch3-reuse-who">{pick(r, who)}</b>
          <div className="ch3-body">
            <T r={r} em={em} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------- mechanism 2 · the ascent ----------------

   THE ASCENT IS A SCROLL MECHANISM — the chapter's one set piece.

   It began as a bare <ol> with a CSS rail and no JavaScript, and measured
   against chapters 2 and 6 that was the wrong call: every other chapter has one
   thing the reader remembers it by (the desert stage, the story film, the hajj
   route map) and this one had nothing. The ascent is the obvious place — it is
   the only passage in the chapter whose CONTENT is a movement upward.

   HOW IT WORKS. The seven rungs are ordinary blocks in the flow. A layer behind
   them carries one tall photograph of the night sky, and the reader's scroll
   position pans it from the warm horizon at its foot to the black at its head.
   Nothing is scroll-jacked, nothing is pinned, and scrolling past the block
   works exactly as it does anywhere else on the page. The pan is a pure
   function of scroll position, so it rewinds on the way back up.

   WHAT DID NOT CHANGE, because both were load-bearing:
     · DOM ORDER IS 1→7, TOP TO BOTTOM. A literal ladder wants seven at the top
       and `column-reverse` would give it — but a sighted reader scanning down
       would meet Abraham first. The ascent is carried by the source's own
       ordinals, which it already prints.
     · EVERY RUNG IS IN THE DOM AT ALL TIMES. The highlight is opacity and
       nothing else: no tablist, no panels, nothing revealed on demand. The
       presence gate requires every fragment to reach the page and chapter
       search walks this markup like any other paragraph.
     · NO ORDINAL NUMERALS ARE PRINTED ON THE RAIL. The source writes
       „ברקיע השלישי", „ברביעי" inside the sentences themselves; a numeral
       beside them would be the page saying it twice.

   Under prefers-reduced-motion the sky is held at one frame and the rungs are
   all at full strength — the same information, without the movement. */
/* WHERE EACH HEAVEN HANGS IN THE SKY.

   The rungs used to sit on one rail down the reading edge, seven markers in a
   column — a list with a photograph behind it. Scattered, they are seven STARS
   the reader travels past, which is what the ascent is.

   `x` is the offset from the reading edge as a percentage; `d` is depth, 0 far
   to 1 near. Depth drives the star's size, its glow and the strength of its
   text, so the near ones feel close enough to pass and the far ones sit back.
   They alternate near/far rather than running in one direction, so the reader
   moves BETWEEN them instead of towards them.

   DOM ORDER IS STILL 1→7 AND UNTOUCHED. Only the horizontal placement varies —
   a sighted reader still meets Adam first and Abraham last, screen readers read
   the source's own ordinals in order, and chapter search walks the same markup
   it always did. Nothing here is positioned absolutely and nothing overlaps. */

const SKY: { x: number; d: number }[] = [
  { x: 4, d: 1.0 },   // אדם — the first heaven, and the nearest
  { x: 27, d: 0.68 },
  { x: 11, d: 0.92 },
  { x: 33, d: 0.62 },
  { x: 17, d: 0.86 },
  { x: 6, d: 1.0 },   // משה — §40 turns on him, so he is not a distant one
  { x: 29, d: 0.8 },  // אברהם — the seventh, held back in the deep
]

function Ascent() {
  const rungs = ['§39.r1', '§39.r2', '§39.r3', '§39.r4', '§39.r5', '§39.r6', '§39.r7']
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const steps = Array.from(wrap.querySelectorAll<HTMLElement>('.ch3-rung'))
    if (!steps.length) return
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return
    wrap.classList.add('is-live')
    let raf = 0

    function measure(): void {
      raf = 0
      if (!wrap) return
      const mid = window.innerHeight * 0.55
      const tops = steps.map((s) => s.getBoundingClientRect().top)
      let idx = 0
      for (let i = 0; i < tops.length; i++) if (tops[i] <= mid) idx = i
      setActive((a) => (a === idx ? a : idx))
      /* 0 at the first rung, 1 at the last — the sky's own travel */
      const span = Math.max(1, tops[tops.length - 1] - tops[0])
      const t = Math.min(1, Math.max(0, (mid - tops[0]) / span))
      wrap.style.setProperty('--asc', t.toFixed(3))
      /* WHERE THE CAMERA IS POINTED. The layers scale out of this point, so the
         zoom converges on whichever star the reader is at instead of on the
         middle of the frame. SKY[i].x is measured from the reading edge, which
         in RTL is the RIGHT, so the origin from the left is (100 - x). CSS
         transitions it, which is what makes the move between stars read as the
         camera swinging round rather than as a jump. */
      wrap.style.setProperty('--ox', `${100 - SKY[idx].x}%`)
    }
    function onScroll(): void {
      if (!raf) raf = requestAnimationFrame(measure)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    measure()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
      wrap.classList.remove('is-live')
    }
  }, [])

  return (
    <div className="ch3-ascent" ref={wrapRef} data-reveal>
      {/* TWO STARFIELDS OVER THE PAINTED SKY, at different speeds. The painting
          alone panned as one flat plane, so the ascent read as a photograph
          sliding past rather than as movement through anything. Parallax is
          what makes it depth: the far field barely shifts, the near field
          drifts several times faster, and the reader is between them.
          Both are driven by the same `--asc` the sky uses, so they rewind on
          the way back up and hold still under reduced motion (where `--asc` is
          never set and the transform resolves to zero). */}
      <div className="ch3-sky" aria-hidden="true">
        <span className="ch3-skyimg" />
        <span className="ch3-stars is-far" />
        <span className="ch3-stars is-near" />
      </div>
      <div className="ch3-asc-lead">
        <T r="§39.a" />
      </div>
      <ol className="ch3-heavens">
        {rungs.map((r, i) => (
          <li
            className={'ch3-rung' + (i === active ? ' is-here' : '')}
            key={r}
            style={{ '--x': SKY[i].x, '--d': SKY[i].d } as React.CSSProperties}
          >
            <span className="ch3-rung-mark" aria-hidden="true" />
            <b className="ch3-rung-name">{nameOf(r)}</b>
            <span className="ch3-rung-text">{text(r)}</span>
          </li>
        ))}
      </ol>
    </div>
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
  const t = (SECTIONS.find((x) => x.id === 'ascent') as unknown as { readings: { a: string; b: string } }).readings
  /* TWO EQUAL CARDS, NOT A TOGGLE (30.9). The device that stood here was a pair
     of buttons over a line that grew or shrank — and both paragraphs were
     printed under it whichever was pressed, so the press changed nothing the
     reader read, and its empty box read as broken. Chapter 5's two claims are
     the precedent for a dispute the source leaves open: two cards of one size,
     side by side, neither larger, no „pick a side". Same card as section 06
     (`.ch3-pair` / `.ch3-card`). The titles are editorial and live in
     layout.json. */
  return (
    <div className="ch3-pair" data-reveal>
      <article className="ch3-card">
        <h3 className="ch3-card-title">{t.a}</h3>
        <div className="ch3-body">
          <T r="§43.a" />
        </div>
      </article>
      <article className="ch3-card">
        <h3 className="ch3-card-title">{t.b}</h3>
        <div className="ch3-body">
          <T r="§44.a" />
        </div>
      </article>
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

  /* the closing button carries a quiet „הושלם" once the PRACTICE is finished —
     and the flag it reads is the one the practice writes, `islam:chapter:3`,
     never `completed` in this chapter's own store: that one only means the
     reading reached the end. Read in an effect and not at render, because the
     server has no localStorage and a chip present in the HTML but absent in the
     browser is a hydration mismatch. The link works either way; a finished
     practice must never be blocked from being re-entered. */
  const [practiceDone, setPracticeDone] = useState(false)
  useEffect(() => {
    try {
      setPracticeDone(localStorage.getItem('islam:chapter:3') === 'done')
    } catch {}
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
  /* the chapter search scrolls straight to its hit and announces it with
     `chapter:jump` — the sections it flew past were not read, so no credit */
  useEffect(() => {
    window.addEventListener('chapter:jump', onMenuJump)
    return () => window.removeEventListener('chapter:jump', onMenuJump)
  }, [onMenuJump])

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
                    {/* MAIN SECTIONS ONLY (rule 29) — chapter 6's rail and chapter 5's.
                        The sub-headings rode here as a nested list for a while;
                        the shared sheet never styled `.menu-subs`, and nine extra
                        rows turned a table of contents into an index. */}
                    <span className="menu-label">{titleOf(s.id)}</span>
                    {doneSections.has(s.id) && (
                      <svg className="menu-done" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12.5 10 17.5 19 7.5" />
                      </svg>
                    )}
                  </a>
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
                {/* THE ELEPHANT, BESIDE THE SENTENCES THAT NAME IT. The text holds
                    the reading edge (RIGHT in RTL) and the illustration the
                    outer edge — the shape chapter 6 gives its shahada section.

                    A WATERCOLOUR, NOT ONE OF THIS CHAPTER'S OIL PLATES, and
                    that is the point: chapter 6's illustration is that medium,
                    it floats on the parchment with no frame and no crop, and a
                    cut-out was the one object type chapter 3 had none of.

                    NO RIDER. The source has Abraha arriving with soldiers
                    mounted on the elephant; the animal is drawn alone, with no
                    mahout, no soldiers, and nothing on its back implying one.

                    It faces INTO the column: painted in profile facing left, it
                    would have looked away from the text it stands beside, so
                    the file is mirrored. */}
                {/* THE WHOLE SECTION'S PROSE SITS BESIDE IT. Only §0 and §1 were
                    in this column at first, and the illustration is portrait:
                    the text ran out after two paragraphs while the elephant went
                    on for another five hundred pixels, so the grid row was sized
                    by the picture and left a void beside it with the rest of the
                    section stranded underneath. All four paragraphs make a
                    column tall enough to stand next to it. */}
                <div className="ch3-withplate" data-reveal>
                  <div className="ch3-body">
                    <T r={['§0.a', '§0.name']} em={['שנת הפיל']} />
                    <T r="§1.a" />
                    <T r="§2.a" em={['אבאביל']} />
                    <T r="§2.sura" />
                    <T r={['§3.a', '(§3.aside)']} />
                  </div>
                  {/* ⚠ `elephant-trim.webp`, NOT `elephant.webp`. Measured on
                      the file: the original is 900×1007 and its TOP 263 ROWS —
                      26% of its height — hold no pixel above alpha 120. On the
                      page that became a two-hundred-pixel hole beside the first
                      two paragraphs, which is most of what „מלא רווחים" was.
                      This is the same painting with 230 rows taken off the top,
                      leaving 33px of soft wash above the animal. Nothing was
                      repainted and the original file is still there. */}
                  <Plate src="elephant-trim.webp" size="cut" />
                </div>
                {/* THE SURA'S OWN WORDS CLOSE THE SECTION. §2.sura names it and
                    numbers it — „סורת הפיל" (105) — and until the lecturer's
                    round the chapter stopped there, paraphrasing a passage it
                    never let the reader hear. It sits AFTER the prose and not
                    beside it: the plate's column was sized by measurement
                    against the portrait watercolour, and a blockquote squeezed
                    into half a column is not how this chapter sets a verse.

                    It also carries the reader into section 02, which is about
                    phrases taken out of THIS sura. */}
                <Verse r="§45.verse" />
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
                <div className="ch3-body" data-reveal>
                  <T r="§4.a" />
                  <T r="§4.b" />
                  <T r="§4.ababil" em={['אבאביל']} />
                </div>
                <SubHead section="today" id="maakul" />
                {/* THE LECTURER'S LEAD-IN. It states the pattern — verses of
                    that sura supplying names for operations and weapons — and
                    the two rows under it are the pattern happening. Her own
                    middle sentences are NOT printed: they are צוק איתן, שאגת
                    הארי and the כטב"ם, and the source PDF says all three at
                    greater length in §5.a, §6.a and §4.ababil. Printing both
                    would be the same fact twice, which the gate forbids and a
                    reader notices first. */}
                <div className="ch3-body" data-reveal>
                  <T r="§46.a" em={['שמות של מבצעים ואמצעי לחימה']} />
                </div>
                {/* THE TWO ROWS AND THE PROCLAMATION, SIDE BY SIDE. The cards
                    hold the READING EDGE — first child, which in RTL lands on
                    the RIGHT — and the document takes the outer edge on the
                    left. They belong together: the rows say the phrase was
                    taken, the poster is the phrase in use, and stacked one under
                    the other they were two full-width blocks with a screen of
                    scroll between the claim and its evidence. */}
                <div className="ch3-evidence" data-reveal>
                  <Reuse />
                  {/* the comic's own file is `comic/x02.jpg`, and it is 1280×960
                    because a comic panel is 4:3 — the proclamation is a wide
                    banner and the file carries 112px of BLACK above it and 112
                    below to fill the frame. On the parchment those bands read
                    as two black rules, so this is the same picture with the
                    letterbox taken off and nothing else: rows 112–847, where
                    the pure black floor ends. The poster's own dark vignette is
                    kept — it belongs to the design. x02.jpg is untouched. */}
                  <Document src="hamas-proclamation.jpg" r="§47.caption" />
                </div>
                {/* AND HER REASON, WHICH CLOSES THE SECTION. Everything above it
                    is what the organisations did; this is why, in her words. */}
                <div className="ch3-body" data-reveal>
                  <T r="§46.why" em={['בשם אללה']} />
                </div>
              </Section>

              {/* ============ 03 · הלידה, המשפחה והילדות ============ */}
              <Section id="birth">
                <Head id="birth" />
                <SubHead section="birth" id="hashim" />
                {/* ⚠ THE SENTENCE HAD LOST ITS SUBJECT. §7.name holds the word
                    „מוחמד" in its `name` field and the source's bracketed gloss
                    in its `text`; `T` prints text only, so the section opened on
                    „משמעו המילולי: מהולל, משובח נולד בעיר מכה" — a sentence with
                    nobody in it, and the brackets gone too. The source reads
                    „מוחמד (משמעו המילולי: מהולל, משובח) נולד בעיר מכה", and that
                    is what is set here: the name through `nameOf`, which is the
                    sanctioned way to print a source name, and the gloss back
                    inside its own brackets. */}
                {/* A COLUMN BESIDE ONE PAINTING — the shape of ח'דיג'ה below
                    and of the elephant above, mirrored. Before, the prose ran
                    full width in four blocks and the town sat under the last
                    three sentences as a framed rectangle: the only boxed
                    painting on a page whose other paintings are cut-outs on the
                    paper, and it hung beside §12 only, 430px after the rest.

                    THE DEVICE UNMIRRORED puts the painting in grid column 2 —
                    the LEFT in RTL — so the page alternates: elephant left,
                    poster left, town left, jars right. `#birth` pulls the art
                    back out of the gutter (chapter3-article.css) so its outer
                    edge stands on the same line as every paragraph. */}
                {/* THE SECTION RUNS IN THE SOURCE'S OWN ORDER — §7 → §12, with
                    nothing lifted out of it.

                    WHAT STOOD HERE was a four-medallion strip (`Lineage`) plus
                    two fold-out notes, and between them the page read §7, then
                    §12.a, then §8 inside the strip, then §10, then §9 and §11
                    folded shut at the end. The reader met „התייתם עד גיל שש"
                    before being told who his father and mother were, and the
                    meaning of the name עבד אללה arrived last, closed.

                    AND THE STRIP MADE A CLAIM THE SOURCE DOES NOT. Its rail drew
                    a vertical line from עבד אללה down to עבד אלמטלב — and a
                    vertical line in a family panel says „בנו של" (rule 69),
                    while עבד אלמטלב is עבד אללה's FATHER; the patronymic inside
                    the name says so. It also marked two different names with one
                    gold diamond meaning „the same person". Chapter 5 met the
                    same thing and did the same thing: the diagrams came out and
                    the content went back to prose with the terms emphasised. */}
                <div className="bleed-aside">
                  <div className="bleed-aside-art" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/chapter3/mecca-cut.webp" alt="" loading="lazy" decoding="async" />
                  </div>
                  <div className="bleed-aside-body">
                    <div className="ch3-body" data-reveal>
                      <p>
                        <b className="key">{nameOf('§7.name')}</b> ({text('§7.name').trim()}){' '}
                        {emphasise(text('§7.a').trim(), ['שבט קריש'], 'n7a')}
                      </p>
                      <T r="§7.b" em={['שבט אצולה']} />
                      <T
                        r={['§8.father', '§8.mother']}
                        em={['עבד אללה בן עבד אלמטלב', 'אאמנה בנת והב']}
                      />
                      {/* §9.a ends on a bracket, §9.b opens with a vav — one sentence */}
                      <T r={['§9.a', '§9.b']} em={['עבדו של אללה']} />
                    </div>
                  </div>
                </div>
                {/* THE PAINTING TAKES THE BIRTH AND THE FAMILY, NOT THE WHOLE RUN.
                    All eight paragraphs beside it made a column three times the
                    painting's height (949px against 311 at 1440), and the town
                    floated in the middle of bare parchment. The elephant solved
                    the same thing the same way: the picture beside the part it
                    belongs to — here Mecca beside „נולד בעיר מכה" — and the rest
                    runs on at the full measure. */}
                <div className="ch3-body" data-reveal>
                  <T r="§10.a" em={['שני אנשים נושאים שלג']} />
                  <T r={['§11.a', '§11.verse']} em={['גבריאל ועוזרו']} />
                  <T r="§12.a" em={['התייתם']} />
                  <T r={['§12.b', '§12.c']} em={['עבד אלמטלב', 'אבו טאלב']} />
                </div>
              </Section>

              {/* ============ 04 · ח'דיג'ה ============
                  86 words, four sentences. Prose only — chapter 2's precedent
                  for a short trait was exactly this: „טקסט רץ. אין מנגנון." */}
              <Section id="khadija">
                <Head id="khadija" />
                {/* CHAPTER 6'S OWN DEVICE, NOT A ROW INVENTED HERE. `.bleed-aside`
                    is what the shahada and the charity are built on — a
                    transparent watercolour cutout with no frame and no caption,
                    set on the paper beside the words and bleeding off the page
                    gutter — and it lives in chapter6-article.css, the sheet all
                    of these chapters load. Chapter 4 already uses it twice.

                    `.is-flipped` is the variant that puts the painting in grid
                    column 1, which in RTL is the READING EDGE — the right — and
                    bleeds it into the right-hand gutter, with the prose on the
                    left. That is the shape asked for here.

                    ⚠ THE ART IS `aria-hidden` AND THERE IS NO <figure>. The
                    device's own comment says why: a figure takes a caption, and
                    a caption here would be a sentence the source never wrote.
                    Every fact stays in the paragraphs.

                    ⚠ BELOW 900px THE PAINTING IS REMOVED, not shrunk — a cutout
                    at phone width is a smudge. That is the device's behaviour
                    and it is the reason the prose still reads alone. */}
                <div className="bleed-aside is-flipped">
                  <div className="bleed-aside-art" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/assets/chapter3/caravan-cut.png"
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="bleed-aside-body">
                    <div className="ch3-body" data-reveal>
                      <T r="§13.a" em={["ח'דיג'ה"]} />
                      <T r={['§14.a', '§14.daughters']} em={['ארבע בנות']} />
                      <T r="§15.a" />
                      <T r="§16.a" />
                    </div>
                  </div>
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
                {/* THIS SECTION IS THE CHAPTER'S COMIC — the book's own pages for
                    this part, turned by clicking. See Chapter3ComicPart.tsx.

                    ⚠ TWO BUILDS CAME BEFORE THIS AND BOTH WERE SENT BACK AS „זה
                    לא קומיקס": a single frame with a caption under it, then a
                    picture beside a column of words with a counter and buttons.
                    Both were article devices dressed in the comic's pictures.
                    What was asked for was the comic — tiers, gutters, lettering
                    boxes, balloons, a page that turns — and the chapter already
                    had one, so this is that book, cut to one part. */}
                <ComicPart script={revelationComic} />
                {/* THE SOURCE'S OWN WORDS FOR THE SAME STRETCH, whole and in
                    order. The comic letters §17–§23 condensed; the article's
                    rule is the verbatim sentence, and this is where it stands —
                    closed, because the comic has just told it, and open to the
                    chapter search (a hit inside it opens it). */}
                <Note id="n-revelation-text" label="הנוסח המלא של המקטע">
                  <T r={['§17.a', '§17.b']} em={["אלתחנת'"]} />
                  <T r="§18.a" em={['חיזיון אמת']} />
                  <T r="§18.b" em={['גבריאל']} />
                  <T r="§19.a" em={['אינני קורא']} />
                  <Verse r="§19.verse" />
                  <T r="§20.a" />
                  <T r="§20.b" />
                  {/* §48 IS THE LECTURER'S OWN WORDING, asked for in panel 31 in
                      place of a sentence the comic had written itself. It joins
                      §20 rather than replacing it: §20.b is the source PDF's
                      sentence and may not come off the page without her word.
                      ⚠ THE TWO OVERLAP — both say the illiteracy magnifies the
                      miracle and answers those who claim he wrote the Quran.
                      Flagged to her; whichever she keeps, the other goes. */}
                  <T r="§48.a" em={['מגדיל את הנס']} />
                  <T r="§21.a" em={['ליל הגורל']} />
                  <T r="§22.a" />
                  <T r={['§22.b', '§22.c']} />
                  <T r="§23.a" />
                </Note>
              </Section>

              {/* ============ 06 · הטפה למונותאיזם ============
                  257 words, the second-largest block, and no device. All of it
                  is argument and narrative. §29 in particular stays prose: the
                  list treatment triggers on the source's own punctuation, and
                  §29 is a comma chain with appositives, not items ending in
                  full stops. */}
              <Section id="preaching">
                {/* THE PAINTING IS THE GROUND OF THE OPENING ONLY — the heading,
                    the claims, Mecca's answer and the fold-out — and stops before
                    אלצחאבה (the user's call, 30.9: first the whole section, then
                    „רק של החלק הראשוני"). It is the Mecca the preaching is aimed
                    at, the Kaaba among the standing stones. Chapter 4's
                    `.ch4-plainhero` is the recipe. The ground is LAST inside the
                    wrapper, so the flow rule never counts it. */}
                <div className="ch3-grounded">
                  <Head id="preaching" />
                  <div className="ch3-body" data-reveal>
                    {/* §24.a ends on a colon — the claims are its sentence */}
                    <T r={['§24.a', '§24.b']} em={['שיתוף אלילים לאללה']} />
                    <T r="§25.a" />
                    <T r="§25.b" />
                  </div>
                  <div className="ch3-body" data-reveal>
                    <T r="§26.a" />
                    <T r="§26.b" />
                    <T r="§26.c" />
                  </div>
                  <Note id="n-counter" label="מה ענו אנשי מכה">
                    <T r="§27.a" />
                    <T r="§27.b" />
                  </Note>
                  <div className="ch3-ground" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/chapter3/kaaba-precinct.jpg" alt="" loading="lazy" decoding="async" />
                  </div>
                </div>
                {/* TWO CARDS SIDE BY SIDE — אלצחאבה on the right, the first hijra
                    on the left (the user's call, 30.9). They are the two
                    outcomes of the preaching, the few who followed and the few
                    who had to leave, so they sit as a pair of equals. The card
                    is chapter 5's `.ch5-claim` without its picture: `--paper`,
                    the hairline, 16px, no shadow. Equal height by the grid, so
                    neither reads as the larger story. */}
                <div className="ch3-pair" data-reveal>
                  <article className="ch3-card">
                    <SubHead section="preaching" id="sahaba" />
                    <div className="ch3-body">
                      <T r="§28.a" />
                      <T r="§29.a" em={['אלצחאבה']} />
                    </div>
                  </article>
                  <article className="ch3-card">
                    <SubHead section="preaching" id="firsthijra" />
                    <div className="ch3-body">
                      <T r="§30.a" />
                      <T r="§30.b" />
                      <T r="§30.c" />
                    </div>
                  </article>
                </div>
              </Section>

              {/* ============ 07 · שנת העצב ============
                  152 words about two deaths. No image, no device, no emphasis
                  beyond the ordinary — the same call as ואד אלבנת in chapter 2,
                  for the same reason; the plate that was added later came out
                  again on 30.9. This is also the one section that stays
                  entirely inside the reading column: four sections in and four
                  out is what stops the chapter reading as eight repetitions. */}
              <Section id="sorrow">
                <Head id="sorrow" />
                <div className="ch3-body" data-reveal>
                  <T r="§31.a" em={['שנת העצב']} />
                  {/* §31.b has no full stop — the bracketed remark closes it */}
                  <T r={['§31.b', '(§31.aside)']} />
                  {/* NO PLATE. `dusk-plain.jpg` stood between §31 and §32 for a
                      while — an empty plain at last light, argued as carrying the
                      register rather than illustrating grief. The user took it
                      out (30.9); the section is prose, as it was first written. */}
                  <T r="§32.a" />
                  <T r="§32.b" />
                  <T r="§33.a" />
                </div>
                <div className="ch3-body" data-reveal>
                  {/* §34 is one sentence with a comma at its hinge */}
                  <T r={['§34.a', '§34.b']} />
                </div>
              </Section>

              {/* ============ 08 · המסע הלילי ============
                  A comic since 30.9 — see the note inside. §35 IS STILL NOT
                  ILLUSTRATED: the Buraq is described vividly and any drawing has
                  to settle what the source leaves open, so the panels show the
                  night and the road, never the mount. §40 — the fifty prayers
                  reduced to five, in section 09 — is not a device either: an
                  interaction in which the learner PERFORMS the negotiation
                  stages a conversation between a prophet and God as a game. */}
              <Section id="night">
                <Head id="night" />
                {/* THE SECTION'S SECOND COMIC, the user's call (30.9): „קומיקס כמו
                    ההתגלות". The same book, its own script (night-comic.json) —
                    six stations in the order they happened and one wordless
                    panel, the road climbing into the stars, that hands the
                    reader on to העליה לשמים below. No Buraq is drawn and no
                    figure: the night, the road, the tethering ring, the jars,
                    the empty rows of prayer. `night-road.jpg`, the plate that
                    stood here, is left in the assets. */}
                <ComicPart script={nightComic} />
                <Note id="n-night-text" label="הנוסח המלא של המקטע">
                  <T r="§35.a" em={['אלבראק']} />
                  <T r="§35.b" />
                  <T r="§36.a" em={['המסגד הקיצון']} />
                  <T r="§36.b" />
                  <T r="§37.a" />
                  <T r="§37.b" />
                  <T r="§37.c" />
                  <T r="§38.a" />
                  <T r="§38.b" />
                </Note>
              </Section>

              {/* ============ 09 · העליה לשמים ============
                  SPLIT OUT OF SECTION 08 AFTER MEASUREMENT. The two halves ran
                  3,398px together — a third of the page, read as one unbroken
                  run. The argument against splitting was that the source's head
                  joins them; the head is „המסע הלילי והעליה לשמים", which names
                  TWO things and joins them with a vav. That is not one running
                  head over one topic, which is the case chapter 2 had to undo.
                  Both names are the source's own words, out of §42.a. */}
              <Section id="ascent">
                <Head id="ascent" />
                <SubHead section="ascent" id="heavens" />
                {/* the ladder beside the prose it explains. §40 depends on the
                    geometry — Muhammad comes back DOWN past Moses — so the
                    negotiation reads better with the rungs still on screen than
                    scrolled off above it. */}
                {/* §39.a IS THE ASCENT'S OWN OPENING SCREEN, not a paragraph
                    above it. It sat on parchment before the device began, so
                    the reader crossed the seam into the sky with no lead and met
                    Adam cold. Chapter 6 opens every full-screen stage with its
                    own line over the scene; this is the same move, and the
                    fragment is still consumed exactly once. */}
                <Ascent />
                <div className="ch3-body" data-reveal>
                  <T r="§40.a" />
                  <T r="§40.b" em={['חמישים תפילות']} />
                  <T r="§40.c" em={['חמש תפילות ביום']} />
                </div>
                <Note id="n-intent" label="על תפילה בכוונה">
                  <T r="§40.d" />
                </Note>
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

              {/* THE CLOSING BLOCK IS CHAPTER 6'S, UNCHANGED — the layout, the
                  button and the „הושלם" chip, all from chapter6-article.css.
                  It used to be `.ch3-end` with a pair of rules restated in this
                  chapter's own sheet, twice over, and its own comment admitted
                  they were `.chapter-end-back`'s property for property. Both
                  copies are gone; chapter 5 holds the same line and says none
                  may be added back. */}
              <div className="chapter-end" id="chapter-end" ref={endRef} data-reveal>
                <Link className="chapter-end-back" href="/chapter3/practice">
                  לתרגול המסכם
                </Link>
                {practiceDone && <span className="chapter-end-done">הושלם</span>}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
