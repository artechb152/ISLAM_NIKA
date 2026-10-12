'use client'

/* Chapter 8 — מקורות האסלאם — הקוראן והסונה.

   Same product as chapters 2, 5 and 6: the masthead, the collapsible rail, the type
   scale, the reveal behaviour and every colour come from chapter6-article.css, which
   the route layout loads first. chapter8-article.css adds only what this content asks
   for and declares no colour, font or radius of its own.

   THE SHAPE — six sections, approved by the user 7.10.2026: three for the Quran
   (what it is · why each part came down · how the book is ordered and read) and three
   for the Sunna (the hadith and its grades · the six books · the biography, and the
   sentence that names the two together as the Sunna).

   THIS IS THE SKELETON. The banner, the pictures and the grades ladder wait on the
   user's decisions (concept/chapter8/DECISIONS.md). Two devices are built: the pair
   of cards for the Meccan and Medinan suras, and the ladder of hadith grades.

   AND NO CHECKS. Every question lives at /chapter8/practice.

   WHAT THIS FILE MAY NOT DO: write a sentence. Every string comes from passages.json
   through `text()`, addressed by the §N.fragment it belongs to, and
   concept/chapter8/verify-chapter8.mjs fails if a fragment is printed twice or dropped.
   Section titles, the Arabic terms and the sub-headings are editorial and live in
   layout.json. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import MarkToNotebook from '@/components/MarkToNotebook'
import { CH8, em, frag, q, text, tr } from '@/lib/chapter8/content'
import layoutData from '@/lib/chapter8/layout.json'
import {
  completedSections,
  markContentComplete,
  markSectionDone,
  practiceComplete,
  resumeSectionId,
  saveCurrentSection,
  SECTION_ORDER,
} from '@/lib/chapter8/progress'

interface Sub { id: string; title: string }
/** a device label: words cut out of one fragment's sentence (rule 27) */
interface Cut { from: string; cut: string[] }
interface LayoutSection {
  id: string
  title: string
  plate?: { src: string; alt: string }
  realms?: { src: string; alt: string; right: { name: Cut; term: Cut }; left: { name: Cut; term: Cut } }
  anatomy?: { checkedTitle: string; caption: string; parts: { id: string; name: Cut; body: Cut; checked: Cut }[] }
  siraAxis?: { start: string; points: { name: Cut; book: Cut; fate?: Cut; art?: { src: string; alt: string } }[]; gaps: { years: number; label: Cut }[] }
  cardArt?: Record<string, { src: string; alt: string }>
  map?: {
    src: [number, number]; alt: string; hint: string
    places: Record<string, { kind: 'area' | 'city'; x: number; y: number; label: Cut }>
    who: { id: string; name: Cut; places: string[]; move?: [string, string]; says: Cut }[]
  }
  shelf?: { names: Cut; x: number[]; pair: Cut; seam: number; shelfTop: number; numbers: Cut[] }
  /** the Arabic term — where chapter 6 puts it, beside the title */
  term: string
  subs?: Sub[]
  slots: Record<string, string[] | string[][]>
}
const LAYOUT = layoutData as unknown as { sections: LayoutSection[] }
const SECTIONS = LAYOUT.sections

const meta = (id: string): LayoutSection => {
  const s = SECTIONS.find((x) => x.id === id)
  if (!s) throw new Error(`chapter 8: unknown section ${id}`)
  return s
}
const sub = (sectionId: string, subId: string): string => {
  const s = meta(sectionId).subs?.find((x) => x.id === subId)
  if (!s) throw new Error(`chapter 8: unknown sub ${sectionId}/${subId}`)
  return s.title
}
/** the refs of one slot, read from layout.json — the JSX names the slot, never the refs,
    so the gate's „exactly once" walk over layout.json is a walk over what is printed */
const rawSlot = (sectionId: string, name: string) => {
  const refs = meta(sectionId).slots[name]
  if (!refs) throw new Error(`chapter 8: unknown slot ${sectionId}/${name}`)
  return refs
}
/** a slot that is one run of refs — one paragraph */
const slot = (sectionId: string, name: string): string[] => {
  const refs = rawSlot(sectionId, name)
  if (refs.some((r) => Array.isArray(r))) throw new Error(`chapter 8: ${sectionId}/${name} is a group slot`)
  return refs as string[]
}
/** a slot that is several runs — one per step, card or row */
const groups = (sectionId: string, name: string): string[][] => {
  const refs = rawSlot(sectionId, name)
  if (!refs.every((r) => Array.isArray(r))) throw new Error(`chapter 8: ${sectionId}/${name} is not a group slot`)
  return refs as string[][]
}

/** The words of a device label, checked against the sentence they are cut from. Throws on
    drift, so a label can never quietly say something its fragment does not (rule 27). */
const pick = ({ from, cut }: Cut): string[] => {
  const t = frag(from).text ?? ''
  for (const c of cut) if (!t.includes(c)) throw new Error(`chapter 8: label "${c}" is not in ${from}`)
  return cut
}

/* ---------------- text primitives ---------------- */

/** Paint the fragment's marked phrases inside its own sentence, leaving every other
    character alone. Three kinds:
      `.key`    maroon — the idea the paragraph turns on.
      `.ch8-tr` gold   — a transliteration the chapter is teaching (rule 38).
      `.ch8-q`  italic — a quotation the SOURCE sets in italics (§9).
    Every phrase is a substring of the sentence; the gate fails if one drifts. */
type Paint = (phrase: string, key: string) => React.ReactNode
function mark(t: string, groups: { phrases: string[]; paint: Paint }[], key: string): React.ReactNode[] {
  const all = groups.flatMap((g) => g.phrases.map((phrase) => ({ phrase, paint: g.paint })))
  if (!all.length) return [t]
  /* longest first, so a phrase that contains another is not cut in half by it */
  all.sort((a, b) => b.phrase.length - a.phrase.length)
  let parts: React.ReactNode[] = [t]
  /* one running counter for every painted span: a phrase that occurs twice in one
     sentence („צחיח" in §7.sahih) lands in two different string parts, and a key built
     from (phrase, part-index) gave both the same key */
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
    /* a phrase the gate passed but the painter could not place — it sits inside a
       longer phrase painted first. Loud in development, silent on the page. */
    if (!found && process.env.NODE_ENV !== 'production') console.error(`chapter 8: ${key} — "${phrase}" not painted`)
    parts = next
  }
  return parts
}

const bold = (cls: string): Paint =>
  function paintBold(phrase, k) { return <b className={cls} key={k}>{phrase}</b> }
const italic: Paint = (phrase, k) => <i className="ch8-q" key={k}>{phrase}</i>

/** „כ- 600,000" — the source puts a space after the hyphen, and on a phone the „כ-"
    was left at the end of one line with its number on the next. Bound with a no-break
    space, in the sentence and in its phrases alike so the phrases still match. Typography
    only: no character the reader sees is added or removed. */
const nb = (s: string) => s.replace(/כ- (?=\d)/g, 'כ-\u00A0')

const marks = (r: string) => [
  { phrases: em(r).map(nb), paint: bold('key') },
  { phrases: tr(r).map(nb), paint: bold('ch8-tr') },
  { phrases: q(r).map(nb), paint: italic },
]

const sentences = (refs: string[]) =>
  refs.flatMap((r, i) => [...(i ? [' '] : []), ...mark(nb(text(r)), marks(r), r)])

/** One paragraph carrying one slot's fragments, joined by a space. */
function T({ s, n, className }: { s: string; n: string; className?: string }) {
  return <p className={className} data-reveal>{sentences(slot(s, n))}</p>
}

/** The section heading, part for part as chapter 6 sets it: the title, the Arabic
    term beside it, and the diamond ornament beneath. */
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

function Env({ id, sectionId }: { id: string; sectionId: string }) {
  return <h3 className="scrolly-env" id={id}>{sub(sectionId, id)}</h3>
}

function Section({ id, className = '', children }: { id: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`article-section ${className}`} id={id} aria-labelledby={`${id}-title`}>
      {children}
    </section>
  )
}

/** The Medinan and the Meccan suras, side by side.

    Two equal cards (rule 51: equal tracks, stretched rows), capped and centred so two
    do not come out as posters (rule 52). Each card's title is the `name` of its first
    fragment — „סורות מדיניות" / „סורות מכיות", the source's own words from §3.

    NOT AN EXERCISE AND NOT A TABLE. The cards carry the source's sentences as they are,
    in the source's order (the long Medinan suras are described first). The ranges 2–20
    and 21–114 stay inside those sentences and are never lifted into labels: the source
    itself says the order has exceptions (§4), and as a label they would read as a hard
    division. */
function Periods() {
  const art = meta('nuzul').cardArt ?? {}
  const cards = (['medinan', 'meccan'] as const).map((k) => ({ k, refs: slot('nuzul', k), pic: art[k] }))
  return (
    <div className="ch8-pair" data-reveal>
      {cards.map(({ k, refs, pic }) => (
        <article className="ch8-card" key={k}>
          {/* chapter 2's and 5's card: the painting flush to the card's edges at a fixed
              4:3, so both cards are the same size by construction (rule 51) */}
          {pic && (
            <span className="ch8-card-art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/assets/chapter8/${pic.src}`} alt={pic.alt} loading="lazy" decoding="async" />
            </span>
          )}
          <div className="ch8-card-text">
            <h4 className="ch8-card-title">{frag(refs[0]).name}</h4>
            <p>{sentences(refs)}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

const pctf = (v: number) => `${(v * 100).toFixed(4)}%`

/* ---------------- 04 · the anatomy of a hadith ---------------- */

/** One hadith, taken apart into the two parts the scholars divided it into (§7.two).

    THE SENTENCE IS ONE LINE — the source's own example, „סיפר פלוני בשם פלוני ששמע
    מפלוני שסיפר לו פלוני ששמע ממוחמד שעשה כך וכך" — set as a single phrase, and over it
    two brackets name its parts: the chain of transmitters on the reading side, the content
    at its end. Under each part, what the scholars checked in it. Everything is visible at
    once: the reader sees the sentence, sees where it splits, and sees the two checks.
    Every word is cut from §7.isnad, §7.check and §7.matn (rule 27).

    ⚠ The first build (11.10) set the links as separate pills and hid the checks in a side
    panel behind a click: „פה לא הבנתי". The pills did not read as one sentence, and nothing
    told the reader the parts could be clicked. No device state now — nothing to discover. */
function Anatomy() {
  const an = meta('hadith').anatomy
  if (!an) throw new Error('chapter 8: hadith has no anatomy')
  return (
    <figure className="ch8-anatomy" data-reveal>
      <figcaption className="ch8-anatomy-cap">{an.caption}</figcaption>
      <div className="ch8-anatomy-row">
        {an.parts.map((pt) => (
          <div key={pt.id} className={'ch8-part is-' + pt.id}>
            <span className="ch8-part-name">{pick(pt.name)[0]}</span>
            <span className="ch8-part-bracket" aria-hidden="true" />
            <p className="ch8-part-words">{pick(pt.body).join(' ')}</p>
            <div className="ch8-part-check">
              <span className="ch8-part-check-title">{an.checkedTitle}</span>
              <ul>{pick(pt.checked).map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          </div>
        ))}
      </div>
    </figure>
  )
}

/** The two realms the Quran's messages reach (§0.realms), as ONE watercolour in two halves
    — a prayer rug, beads and a lamp on the reading side; a merchant's scale and a purse on
    the other — with each half's name and term cut from the sentence beside it. Not a pair
    of cards: section 02 carries one, and two in a row is one template used twice. The
    labels sit in an ltr row under the picture so each lands under its own half. */
function Realms() {
  const r = meta('quran').realms
  if (!r) throw new Error('chapter 8: quran has no realms')
  const label = (side: { name: Cut; term: Cut }) => (
    <span className="ch8-realm" dir="rtl">
      <b>{pick(side.name)[0]}</b>
      <i className="ch8-tr">{pick(side.term)[0]}</i>
    </span>
  )
  return (
    <figure className="ch8-realms" data-reveal>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/assets/chapter8/${r.src}`} alt={r.alt} loading="lazy" decoding="async" />
      <figcaption className="ch8-realms-labels" dir="ltr">
        {label(r.left)}
        {label(r.right)}
      </figcaption>
    </figure>
  )
}

/** Ibn Ishaq and Ibn Hisham on a RELATIVE time axis: the two gaps the source gives — about
    130 years from Muhammad's death to Ibn Ishaq, about 70 more to Ibn Hisham — at their true
    proportion, and no year anywhere on it (the source gives none, and „762" would be my
    arithmetic, not its claim — rule 25). A segment IS its duration (rule 60): no empty
    track behind it, its number on it. Time runs with the reading, right to left. Ibn
    Ishaq's book is set faint, beside the source's „לא שרד הרבה". */
function SiraAxis() {
  const ax = meta('sunna').siraAxis
  if (!ax) throw new Error('chapter 8: sunna has no siraAxis')
  return (
    <figure className="ch8-axis" data-reveal>
      {/* ONE FLAT ROW — node, segment, node, segment, node — so that only the segments
          share the free width, at 130 : 70. Grouping each segment with its node made the
          fixed node widths part of each share, and 130:70 rendered as 266:80. */}
      <div className="ch8-axis-track">
        <span className="ch8-axis-node is-start"><b>{ax.start}</b></span>
        {ax.points.flatMap((pt, i) => [
          <span className="ch8-axis-seg" key={`s${i}`} style={{ flexGrow: ax.gaps[i].years }}>
            <em>{pick(ax.gaps[i].label)[0]}</em>
          </span>,
          <span className="ch8-axis-node" key={`n${i}`}>
            {pt.art && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img className={'ch8-axis-art' + (pt.fate ? ' is-lost' : '')} src={`/assets/chapter8/${pt.art.src}`} alt={pt.art.alt} loading="lazy" decoding="async" />
            )}
            <b>{pick(pt.name)[0]}</b>
            <span className={'ch8-axis-book' + (pt.fate ? ' is-lost' : '')}>„{pick(pt.book)[0]}"</span>
            {pt.fate && <span className="ch8-axis-fate">{pick(pt.fate)[0]}</span>}
          </span>,
        ])}
      </div>
    </figure>
  )
}

/** The six books, as a painted shelf (section 05). Six bound volumes with plain spines —
    the painting carries no lettering (rule 40) — and each compiler's name set on its
    spine in DOM type, cut from §8.six in the source's order, right to left. The two on
    the right are tied with a red cloth in the painting, and a gold bracket under them
    carries the name the source gives the pair: „אַלצַּחִיחַאן". It stands; it does not
    rank the other four (rule 59). `left`, not inset-inline-start: a place on a
    picture is not reading direction (rule 61). */
function Shelf() {
  const sh = meta('books').shelf
  if (!sh) throw new Error('chapter 8: books has no shelf')
  const names = pick(sh.names)
  if (names.length !== sh.x.length) throw new Error('chapter 8: one spine per name')
  const nums = sh.numbers.map((n) => pick(n)[0])
  const [open, setOpen] = useState(false)
  const pairName = pick(sh.pair)[0]
  const seam = pctf(sh.seam)
  const top = pctf(sh.shelfTop)
  const spine = (i: number) => (
    <b key={names[i]} className={'ch8-spine' + (i < 2 ? ' is-pair' : '')} style={{ left: pctf(sh.x[i]) }} dir="rtl">{names[i]}</b>
  )
  return (
    <figure className={'ch8-shelf' + (open ? ' is-open' : '')} data-reveal>
      <div className="ch8-shelf-plate" dir="ltr">
        {/* the plate is drawn TWICE, clipped at the seam: the four on the left stay on the
            shelf, the two tied on the right are their own layer, and that layer is what
            lifts. `left` and clip insets are fractions of the picture, not reading
            direction (rule 61). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ch8-shelf-rest" src="/assets/chapter8/books-cut.webp" alt="שישה כרכים עומדים על מדף, ושניים מהם קשורים בבד אדום" loading="lazy" decoding="async" style={{ clipPath: `polygon(0 0, ${seam} 0, ${seam} ${top}, 100% ${top}, 100% 100%, 0 100%)` }} />
        {/* only the two BOOKS come forward — the layer is clipped at the shelf's top edge
            and grows from where the books stand on it, so their feet never leave the
            board. Lifting them (the first two builds) either took a piece of the shelf
            along or opened a pale slot under them where the page showed through. */}
        <div className="ch8-shelf-pair" style={{ clipPath: `inset(0 0 calc(100% - ${top}) ${seam})`, transformOrigin: `${pctf((sh.seam + 1) / 2)} ${top}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/chapter8/books-cut.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" />
          {spine(0)}{spine(1)}
        </div>
        {names.map((_, i) => (i >= 2 ? spine(i) : null))}
        <button
          type="button"
          className="ch8-shelf-hit"
          style={{ left: seam, width: `calc(100% - ${seam} - 8%)` }}
          aria-expanded={open}
          aria-controls="ch8-shelf-numbers"
          aria-label={`${names[0]} ו${names[1]} — ${pairName}`}
          onClick={() => setOpen((v) => !v)}
        />
        <span className="ch8-pair-bracket" style={{ left: pctf(Math.min(...sh.x.slice(0, 2)) - 0.05), width: pctf(Math.abs(sh.x[0] - sh.x[1]) + 0.1) }}>
          <b dir="rtl">{pairName}</b>
        </span>
      </div>
      {/* what the two tied books hold, from §8.numbers — in the DOM always, shown when
          the pair is lifted */}
      <div id="ch8-shelf-numbers" className="ch8-shelf-numbers">
        {[0, 1].map((i) => (
          <p key={i}><b>{names[i]}</b> <span>{nums[i]}</span></p>
        ))}
      </div>
      <p className="ch8-shelf-hint" aria-hidden="true">{open ? 'לחיצה נוספת מחזירה אותם למדף' : 'לחצו על שני הכרכים הקשורים'}</p>
    </figure>
  )
}

/** Where the sources were written — a clickable atlas (section 06). The plate carries no
    lettering (rule 40); every name is DOM type cut from the source (rule 27), and only
    places the source names are marked: the Arabian Peninsula and Iraq (Ibn Ishaq), Basra
    (Ibn Hisham), Persia and Bukhara (the six books). A region the source names without a
    city is set as a region label, never a dot — a dot would claim a town it did not name.
    The one arrow is the one move the source states: Ibn Ishaq, born in the peninsula,
    „עבר לעיראק". Click a name to light its places and read its sentence; the other
    entries dim. CLICK, NOT SCROLL (the user, 11.10). `dir="ltr"` and `left` (rule 61). */
function SourcesMap() {
  const m = meta('sunna').map
  if (!m) throw new Error('chapter 8: sunna has no map')
  const [sel, setSel] = useState<string | null>(null)
  const active = m.who.find((w) => w.id === sel)
  const lit = new Set(active ? active.places : Object.keys(m.places))
  const P = m.places
  const arrow = active?.move ?? (sel ? undefined : m.who.find((w) => w.move)?.move)
  return (
    <figure className="ch8-map" data-reveal>
      <div className="ch8-map-plate" dir="ltr" style={{ aspectRatio: `${m.src[0]} / ${m.src[1]}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/chapter8/sources-map.jpg" alt={m.alt} loading="lazy" decoding="async" />
        {arrow && (
          <svg className="ch8-map-arrow" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="ch8-arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" />
              </marker>
            </defs>
            <path
              d={`M ${(P[arrow[0]].x * 100).toFixed(2)} ${(P[arrow[0]].y * 100 - 3).toFixed(2)} Q ${(((P[arrow[0]].x + P[arrow[1]].x) / 2) * 100 - 6).toFixed(2)} ${(((P[arrow[0]].y + P[arrow[1]].y) / 2) * 100).toFixed(2)} ${(P[arrow[1]].x * 100).toFixed(2)} ${(P[arrow[1]].y * 100 + 3).toFixed(2)}`}
              markerEnd="url(#ch8-arrowhead)"
            />
          </svg>
        )}
        {Object.entries(P).map(([id, pl]) => (
          <span
            key={id}
            className={'ch8-place is-' + pl.kind + (lit.has(id) ? ' is-lit' : '')}
            style={{ left: pctf(pl.x), top: pctf(pl.y) }}
          >
            {pl.kind === 'city' && <i className="ch8-place-dot" />}
            <b dir="rtl">{pick(pl.label)[0]}</b>
          </span>
        ))}
      </div>
      <div className="ch8-map-legend" role="group" aria-label={m.hint}>
        {m.who.map((w) => (
          <button
            type="button"
            key={w.id}
            className="ch8-map-who"
            aria-pressed={sel === w.id}
            onClick={() => setSel((cur) => (cur === w.id ? null : w.id))}
          >
            {pick(w.name)[0]}
          </button>
        ))}
      </div>
      {/* every sentence is in the DOM; the chosen one shows */}
      <div className="ch8-map-says" aria-live="polite">
        <p className={'ch8-map-hint' + (sel ? '' : ' is-on')}>{m.hint}</p>
        {m.who.map((w) => (
          <p key={w.id} className={'ch8-map-say' + (sel === w.id ? ' is-on' : '')}>
            <b>{pick(w.name)[0]}</b> · {pick(w.says)[0]}
          </p>
        ))}
      </div>
    </figure>
  )
}

/** The four grades of hadith, as a ladder (the user's choice, 10.10.2026).

    Four steps in the source's own order — the most reliable first, the forged last —
    each stepping further in from the reading edge, so the order is read as a descent
    before a word of it is. Each step's name is the `name` of its first fragment („צחיח",
    „חסן", „צ'עיף", „חדית'ים כוזבים"), and beside it the source's sentences, whole.

    WHAT IT DOES NOT DO (rule 59, rule 25): no score, no percentage, no colour that
    grades the grades. The rail and the inset carry the ORDER, which the source states
    („הדרגה השני", „הדרגה הנמוכה ביותר"); nothing on it says how much more reliable one
    step is than the next, because the source does not. Not clickable: all four are read. */
function Ladder() {
  const steps = groups('hadith', 'ladder')
  return (
    <ol className="ch8-ladder" data-reveal>
      {steps.map((refs, i) => (
        <li className="ch8-step" key={refs[0]} style={{ ['--i' as string]: i }}>
          <span className="ch8-step-dot" aria-hidden="true" />
          <h4 className="ch8-step-name">{frag(refs[0]).name}</h4>
          <p>{sentences(refs)}</p>
        </li>
      ))}
    </ol>
  )
}

export default function Chapter8() {
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
    try { setCollapsed(localStorage.getItem('ch8:side-collapsed') === '1') } catch {}
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('ch8:side-collapsed', next ? '1' : '0') } catch {}
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
      <MarkToNotebook ch={8} />
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
            <span className="menu-sub">{CH8.menuTitle}</span>
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
            <main className="chapter-article" ref={articleRef}>

              {/* ============ 01 · the word of Allah ============ */}
              <Section id="quran" className="opening-section">
                {/* the banner: a locked-off loop of a Quran stand in a sunlit alcove,
                    where only the red ribbon stirs (the user's brief, 11.10.2026: static
                    camera, one small thing moving, looped). The same frame opens and
                    closes the clip, so the loop has no seam; the poster IS that frame,
                    and it is what stands under prefers-reduced-motion. */}
                <div className="ch6-hero">
                  <div className="ch6-hero-media ch8-hero-media" aria-hidden="true">
                    <video
                      className="ch6-hero-video"
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      poster="/assets/chapter8/hero-poster.jpg"
                      tabIndex={-1}
                      onError={(event) => { event.currentTarget.hidden = true }}
                    >
                      <source src="/assets/chapter8/hero.mp4" type="video/mp4" />
                    </video>
                  </div>
                  <div className="ch6-hero-copy">
                    <h1 id="chapter-title" className="ch6-hero-title">{CH8.title}</h1>
                  </div>
                </div>
                <Head id="quran" />
                <T s="quran" n="lead" className="ch8-lead" />
                <T s="quran" n="lawh" />
                <Env id="messages" sectionId="quran" />
                <T s="quran" n="messages" />
                <Realms />
                <T s="quran" n="stories" />
                <T s="quran" n="partial" />
                <Env id="suras" sectionId="quran" />
                <T s="quran" n="suras" />
              </Section>

              {/* ============ 02 · the occasions of revelation ============ */}
              <Section id="nuzul">
                <Head id="nuzul" />
                <T s="nuzul" n="lead" className="ch8-lead" />
                <T s="nuzul" n="examples" />
                <Env id="periods" sectionId="nuzul" />
                <T s="nuzul" n="research" />
                <Periods />
              </Section>

              {/* ============ 03 · the order of the book ============ */}
              <Section id="order">
                <Head id="order" />
                {/* §4 stays prose: the source calls 112 the shortest sura and then names
                    108 as shorter (editorial note 3) — a chart of lengths would set that
                    contradiction down as a fact */}
                <T s="order" n="lead" className="ch8-lead" />
                <T s="order" n="fatiha" />
                <Env id="translation" sectionId="order" />
                {/* chapter 6's `.bleed-aside`, mirrored — the painting on the reading edge,
                    so it alternates with section 04's, which stands on the left: a reed pen,
                    an inkwell and blank sheets tied with a red string, beside the
                    paragraphs on why the Quran was not translated and how it was read */}
                <div className="bleed-aside is-flipped ch8-qalam">
                  <div className="bleed-aside-art" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/chapter8/qalam-cut.webp" alt="" loading="lazy" decoding="async" />
                  </div>
                  <div className="bleed-aside-body">
                    <T s="order" n="ban" />
                    <T s="order" n="permit" />
                  </div>
                </div>
              </Section>

              {/* ============ 04 · the hadith ============ */}
              <Section id="hadith">
                <Head id="hadith" />
                {/* prose only here: the three-men watercolour that stood beside these two
                    paragraphs came out in the review of 11.10 — the arcade plate a few lines
                    below shows men seated from behind as well, and two pictures of the same
                    subject in one section read as a repeat (the asset is kept) */}
                <T s="hadith" n="lead" className="ch8-lead" />
                <T s="hadith" n="duty" />
                <Env id="chain" sectionId="hadith" />
                {/* the arcade, in the chapter's one register — a watercolour cutout beside
                    the two paragraphs it shows (chapter 6's `.bleed-aside`), not the full-width
                    oil plate that stood here (12.10: one style, a shorter section) */}
                <div className="bleed-aside ch8-arcade">
                  <div className="bleed-aside-art" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/assets/chapter8/${meta('hadith').plate!.src}`} alt="" loading="lazy" decoding="async" />
                  </div>
                  <div className="bleed-aside-body">
                    <T s="hadith" n="doubt" />
                    <T s="hadith" n="isnad" />
                  </div>
                </div>
                <Anatomy />
                <T s="hadith" n="check" />
                <T s="hadith" n="matn" />
                <Env id="grades" sectionId="hadith" />
                <T s="hadith" n="gradesLead" />
                <Ladder />
              </Section>

              {/* ============ 05 · the six books ============ */}
              <Section id="books">
                <Head id="books" />
                <T s="books" n="lead" className="ch8-lead" />
                <Shelf />
                <T s="books" n="sahihan" />
                {/* §9 — the charter's quotation and the attribution that follows it are ONE
                    paragraph and must stay one: the quote alone would be the charter quoted
                    without the context the source gives it. No picture, no card. */}
                <Env id="trees" sectionId="books" />
                <T s="books" n="hamas" />
              </Section>

              {/* ============ 06 · the biography and the Sunna ============ */}
              <Section id="sunna">
                <Head id="sunna" />
                <T s="sunna" n="lead" className="ch8-lead" />
                <Env id="biography" sectionId="sunna" />
                <T s="sunna" n="biography" />
                <SiraAxis />
                <Env id="where" sectionId="sunna" />
                <SourcesMap />
                {/* the source's last sentence names the two sources together — the
                    chapter's close, centred like chapter 5's verdict */}
                <T s="sunna" n="close" className="ch8-verdict" />
              </Section>

              {/* the close, identical in every chapter (rule 33) */}
              <div className="chapter-end" ref={endRef} id="chapter-end" data-reveal>
                <Link className="chapter-end-back" href="/chapter8/practice">לתרגול המסכם</Link>
                {practiceDone && <span className="chapter-end-done">הושלם</span>}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
