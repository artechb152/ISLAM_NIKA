'use client'

/* Chapter 9 — האסלאם השיעי.

   Same product as chapters 2, 5, 6 and 8: masthead, rail, type scale, reveal and every
   colour come from chapter6-article.css, which the route layout loads first;
   chapter9-article.css adds only this chapter's devices.

   THE SHAPE — seven sections, approved by the user through the live demo
   (concept/chapter9/mockup, 7–11.10.2026): the party of Ali · Ghadir Khumm · Ali and the
   Umayyads · Karbala · how the Shia grew · the customs · the Twelvers.

   THREE DEVICES WERE STRUCK as too game-like (11.10.2026) and must not come back: the
   slider that never reaches „ההשפלה", the lantern that hunts the text in the dark, and
   the ring of twelve seats. Scroll that moves a picture and raises a sentence is reading;
   dragging, hunting or blinking is a game (DECISIONS.md).

   AND NO CHECKS. Every question lives at /chapter9/practice.

   WHAT THIS FILE MAY NOT DO: write a sentence. Every string comes from passages.json
   through text(), addressed by its §N.fragment, and concept/chapter9/verify-chapter9.mjs
   fails if a fragment is printed twice or dropped. Device labels are cut out of a
   fragment's own sentence ({from, cut}, rule 27) and checked by the same gate. The only
   words here that are not the source's are the controls („גללו", „עם התוספות של השיעים"). */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import MarkToNotebook from '@/components/MarkToNotebook'
import StoryFilm from '@/components/chapter6/StoryFilm'
import cuesData from '@/lib/chapter9/karbala-cues.json'
import { CH9, em, frag, text, tr } from '@/lib/chapter9/content'
import layoutData from '@/lib/chapter9/layout.json'
import {
  completedSections,
  markContentComplete,
  markSectionDone,
  practiceComplete,
  resumeSectionId,
  saveCurrentSection,
  SECTION_ORDER,
} from '@/lib/chapter9/progress'

const ART = '/assets/chapter9/'
/** the Karbala film's subtitles — generated from passages.json, never edited by hand */
const CUES = cuesData as Array<[number, number, string]>

interface Sub { id: string; title: string }
/** a device label: words cut out of one fragment's sentence (rule 27) */
interface Cut { from: string; cut: string[] }
interface LayoutSection {
  id: string
  title: string
  term: string
  subs?: Sub[]
  slots: Record<string, string[] | string[][]>
  share?: { pct: number; label: Cut }
  lands?: { name: Cut; pct?: number; label?: Cut }[]
  majority?: Cut
  calendar?: { day: Cut; month: Cut }
  sides?: { ali: Cut; umayya: Cut }
  stations?: { year: Cut; title: Cut; winner: 'ali' | 'umayya' | null; art: string }[]
  pins?: { name: Cut; at: [number, number] }[]
  pair?: { name: Cut; tr: Cut; say: Cut }[]
  choose?: { to: string; label: Cut }[]
  adhan?: { line: Cut; ar?: Cut; shia?: boolean }[]
  shiaTag?: Cut
  occult?: { name: Cut; span: Cut; open?: boolean }[]
  steps?: Cut[]
  facts?: Cut[]
}
const LAYOUT = layoutData as unknown as { sections: LayoutSection[] }
const SECTIONS = LAYOUT.sections

const meta = (id: string): LayoutSection => {
  const s = SECTIONS.find((x) => x.id === id)
  if (!s) throw new Error(`chapter 9: unknown section ${id}`)
  return s
}
const sub = (sectionId: string, subId: string): string => {
  const s = meta(sectionId).subs?.find((x) => x.id === subId)
  if (!s) throw new Error(`chapter 9: unknown sub ${sectionId}/${subId}`)
  return s.title
}
/** the refs of one slot, read from layout.json — the JSX names the slot, never the refs,
    so the gate's „exactly once" walk over layout.json is a walk over what is printed */
const rawSlot = (sectionId: string, name: string) => {
  const refs = meta(sectionId).slots[name]
  if (!refs) throw new Error(`chapter 9: unknown slot ${sectionId}/${name}`)
  return refs
}
/** a slot that is one run of refs — one paragraph */
const slot = (sectionId: string, name: string): string[] => {
  const refs = rawSlot(sectionId, name)
  if (refs.some((r) => Array.isArray(r))) throw new Error(`chapter 9: ${sectionId}/${name} is a group slot`)
  return refs as string[]
}
/** a slot that is several runs — one per step, card or row */
const groups = (sectionId: string, name: string): string[][] => {
  const refs = rawSlot(sectionId, name)
  if (!refs.every((r) => Array.isArray(r))) throw new Error(`chapter 9: ${sectionId}/${name} is not a group slot`)
  return refs as string[][]
}

/** The words of a device label, checked against the sentence they are cut from. Throws on
    drift, so a label can never quietly say something its fragment does not (rule 27). */
const pick = ({ from, cut }: Cut): string[] => {
  const t = frag(from).text ?? ''
  for (const c of cut) if (!t.includes(c)) throw new Error(`chapter 9: label "${c}" is not in ${from}`)
  return cut
}
/** the first (usually only) cut of a label */
const one = (c: Cut): string => pick(c)[0]
const pctf = (v: number) => `${(v * 100).toFixed(4)}%`


/* ---------------- text primitives ---------------- */
/* ---------------- text primitives ---------------- */

/** Paint the fragment's marked phrases inside its own sentence, leaving every other
    character alone. Three kinds:
      `.key`    maroon — the idea the paragraph turns on.
      `.ch9-tr` gold   — a transliteration the chapter is teaching (rule 38).
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
    if (!found && process.env.NODE_ENV !== 'production') console.error(`chapter 9: ${key} — "${phrase}" not painted`)
    parts = next
  }
  return parts
}

const bold = (cls: string): Paint =>
  function paintBold(phrase, k) { return <b className={cls} key={k}>{phrase}</b> }

/** „כ- 600,000" — the source puts a space after the hyphen, and on a phone the „כ-"
    was left at the end of one line with its number on the next. Bound with a no-break
    space, in the sentence and in its phrases alike so the phrases still match. Typography
    only: no character the reader sees is added or removed. */
const nb = (s: string) => s.replace(/כ- (?=\d)/g, 'כ-\u00A0')

const marks = (r: string) => [
  { phrases: em(r).map(nb), paint: bold('key') },
  { phrases: tr(r).map(nb), paint: bold('ch9-tr') },
]

const sentences = (refs: string[]) =>
  refs.flatMap((r, i) => [...(i ? [' '] : []), ...mark(nb(text(r)), marks(r), r)])

/** A slot's fragments as paragraphs of at most ~45 words.

    The first build joined a whole slot into ONE paragraph, and §8's five fragments came
    out as a 138-word block — chapter 6's longest is 42 (measured 12.10.2026, „קירות של
    טקסט"). Fragments are now gathered into a paragraph only while it stays short; a
    long fragment stands alone. Order and words are untouched. */
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
function T({ s, n, className }: { s: string; n: string; className?: string }) {
  return <>{paras(slot(s, n)).map((g) => <p className={className} data-reveal key={g[0]}>{sentences(g)}</p>)}</>
}

/** A run of fragments read as steps on one gold line — each step carries its whole
    fragment, and its marker is words cut from that fragment (rule 27). Used where the
    source itself moves through time (§8). Nothing on it is repeated in prose. */
function Steps({ s, n, marks: m }: { s: string; n: string; marks: Cut[] }) {
  const refs = slot(s, n)
  if (refs.length !== m.length) throw new Error(`chapter 9: ${s}/${n} needs one marker per fragment`)
  /* REVEALED WITH THE SCROLL (12.10.2026, „פה שזה היה בגלילה"): a step lights when its
     top passes 62% of the screen, and the gold line fills down to the last lit step.
     Not sticky, nothing to press, reversible — scroll back and it dims again. */
  const ref = useRef<HTMLOListElement | null>(null)
  const [lit, setLit] = useState(-1)
  const [fill, setFill] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) { setLit(refs.length - 1); setFill(1); return }
    let raf = 0
    const read = () => {
      raf = 0
      const ol = ref.current
      if (!ol) return
      const line = window.innerHeight * 0.62
      const items = [...ol.children] as HTMLElement[]
      let k = -1
      items.forEach((li, i) => { if (li.getBoundingClientRect().top < line) k = i })
      setLit(k)
      const r = ol.getBoundingClientRect()
      setFill(Math.min(1, Math.max(0, (line - r.top) / r.height)))
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(read) }
    read()
    window.addEventListener('scroll', on, { passive: true })
    return () => { window.removeEventListener('scroll', on); if (raf) cancelAnimationFrame(raf) }
  }, [refs.length])
  return (
    <ol className="ch9-steps is-scroll" ref={ref} style={{ ['--fill' as string]: fill.toFixed(3) }}>
      {refs.map((r, k) => (
        <li key={r} className={k <= lit ? 'is-on' : ''}><b className="ch9-steps-m">{one(m[k])}</b><p>{sentences([r])}</p></li>
      ))}
    </ol>
  )
}

/** Three facts the source states as numbers, each over its own whole fragment —
    the number is cut from that same sentence. */
function Facts({ s, n, marks: m }: { s: string; n: string; marks: Cut[] }) {
  const refs = slot(s, n)
  if (refs.length !== m.length) throw new Error(`chapter 9: ${s}/${n} needs one marker per fragment`)
  return (
    <div className="ch9-facts" data-reveal>
      {refs.map((r, k) => (
        <article className="ch9-card" key={r}><b className="ch9-facts-n">{one(m[k])}</b><p>{sentences([r])}</p></article>
      ))}
    </div>
  )
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

/* ---------------- scroll ---------------- */

/** 0→1 as a tall block scrolls past its sticky stage. A pure function of scroll
    position, so every device below is reversible (scroll back and it undoes). */
function useScrollProgress(ref: React.RefObject<HTMLElement | null>): number {
  const [p, setP] = useState(0)
  useEffect(() => {
    let raf = 0
    const read = () => {
      raf = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const run = r.height - window.innerHeight
      const v = run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : r.top < 0 ? 1 : 0
      setP((cur) => (Math.abs(cur - v) < 0.002 ? cur : v))
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(read) }
    read()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf) }
  }, [ref])
  return p
}

/** true once the element's top has crossed 60% of the viewport (rule 57: the device
    starts when it is in the middle of the screen, not when its edge appears) */
function useSeen(ref: React.RefObject<HTMLElement | null>): boolean {
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { rootMargin: '0px 0px -40% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, seen])
  return seen
}

/** a looping painted clip. Decorative (alt-less, aria-hidden): the sentence beside it
    carries the meaning. Under reduced motion it stays on its poster. */
function Loop({ name, poster, className }: { name: string; poster?: string; className?: string }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) ref.current?.pause()
  }, [])
  return (
    <video
      ref={ref}
      className={className}
      src={`${ART}${name}.mp4`}
      poster={`${ART}${poster ?? name + '-1'}.jpg`}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    />
  )
}

/* ---------------- how a painting sits (12.10.2026: „לא הכל אותו דבר") ----------------
   Three placements, alternated so no two neighbouring sections repeat one:
     Cover  — the painting fills the width and the section's heading sits ON it (02, 07)
     Aside  — chapter 6's .bleed-aside: the painting runs beside the prose and bleeds into
              the gutter, left or right (03, 05, 06)
     none   — 01 opens on its words; the banner above it is its picture
   and 04 is the film. */
function Cover({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="ch9-cover" aria-labelledby={`${id}-title`}>
      <div className="ch9-cover-art" aria-hidden="true">{children}</div>
      <Head id={id} />
    </div>
  )
}
function Aside({ src, flip, children, className = '' }: { src: string; flip?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={'bleed-aside ch9-aside ' + (flip ? 'is-flipped ' : '') + className}>
      <div className="bleed-aside-art" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ART}${src}.jpg`} alt="" loading="lazy" />
      </div>
      <div className="bleed-aside-body">{children}</div>
    </div>
  )
}

/* ---------------- 01 · the word opens ---------------- */

/** A hundred dots are the whole of Islam; fifteen fill. Then a card for each country
    §0 names — and a country the source gives no number for („רוב מובהק") gets no
    dots, because drawing some would be inventing one (rule 25). */
function Share() {
  const s = meta('shia')
  const ref = useRef<HTMLDivElement | null>(null)
  const seen = useSeen(ref)
  return (
    <div ref={ref} className="ch9-narrow" style={{ display: 'grid', gap: 26, maxWidth: 1080 }}>
      <div className="ch9-share">
        <div className="ch9-dots" aria-hidden="true">
          {Array.from({ length: 100 }, (_, k) => <i key={k} className={seen && k < s.share!.pct ? 'is-f' : ''} style={{ transitionDelay: `${k * 22}ms` }} />)}
        </div>
        <p className="ch9-share-label">{one(s.share!.label)}</p>
      </div>
      <div className="ch9-lands">
        {s.lands!.map((l) => (
          <div className="ch9-land" key={one(l.name)}>
            <h4>{one(l.name)}</h4>
            {l.pct == null ? (
              <div className="ch9-land-maj">{one(s.majority!)}</div>
            ) : (
              <>
                <div className="ch9-g10" aria-hidden="true">
                  {Array.from({ length: 100 }, (_, k) => <i key={k} className={seen && k < l.pct! ? 'is-f' : ''} style={{ transitionDelay: `${k * 10}ms` }} />)}
                </div>
                <div className="ch9-land-pc">{one(l.label!)}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------- 02 · Ghadir Khumm ---------------- */

/** „מי שאני מנהיגו, עלי מנהיכו." — the two halves come in from both edges and meet;
    when they touch, the transliteration appears. The fragment is printed whole and in
    order: it is only SPLIT where the sentence itself breaks (comma, full stop). */
function Meet() {
  const ref = useRef<HTMLDivElement | null>(null)
  const seen = useSeen(ref)
  const t = text(slot('ghadir', 'saying')[0])
  const m = /^(.*?,)\s(.*?\.)\s(.*)$/.exec(t)
  if (!m) throw new Error('chapter 9: §1.saying no longer splits at its comma and full stop')
  /* NOT a scroll run any more (12.10.2026): a sticky screen held one line on empty
     parchment. The halves glide in once, when the line reaches the middle of the screen. */
  return (
    <div className={'ch9-meet' + (seen ? ' is-met' : '')} ref={ref}>
      <p className="ch9-meet-line"><span>{m[1]}</span><span>{m[2]}</span></p>
      <p className="ch9-meet-tr ch9-tr">{m[3]}</p>
    </div>
  )
}

/** a calendar leaf — 18 ד'ו אלחג'ה — beside §1.feast, which names the feast in full.
    The tear-off button was removed at the user's request (12.10.2026): the leaf is
    a still card now, with no second page and nothing to press. */
function Calendar() {
  const c = meta('ghadir').calendar!
  return (
    <div className="ch9-feast" data-reveal>
      <div className="ch9-cal" aria-hidden="true">
        <div className="ch9-cal-rings"><i /><i /></div>
        <div className="ch9-cal-pg is-top">
          <div><span className="ch9-cal-d">{one(c.day)}</span><span className="ch9-cal-m">{one(c.month)}</span></div>
        </div>
      </div>
      <T s="ghadir" n="feast" />
    </div>
  )
}

/* ---------------- 03 · the balance ---------------- */

/** Three stations; at each, the beam tips toward the side the SOURCE says won
    (`winner` in layout.json — a fact written in the data, rule 66): the Camel to Ali
    (§2 „עלי ניצח"), Siffin to the Umayyads (§3 „נהוג לומר כי הניצחון היה של בית
    אומיה"). At 661 Ali's weight goes and the beam DOES NOT move further: he was killed
    by the Kharijites, which the source never calls an Umayyad victory. */
function Balance() {
  const s = meta('ali')
  const ref = useRef<HTMLDivElement | null>(null)
  const p = useScrollProgress(ref)
  const st = s.stations!
  const groupsRefs = groups('ali', 'stations')
  const i = Math.min(st.length - 1, Math.floor(p * (st.length + 0.2)))
  let a = 0
  for (let k = 0; k <= i; k++) if (st[k].winner) a = st[k].winner === 'ali' ? 12 : -12
  const art = (name: string) =>
    name === 'camel' ? <Loop name="camel" /> : name === 'siffin' ? <img src={`${ART}siffin-1.jpg`} alt="" /> : <img src={`${ART}karbala-4.jpg`} alt="" />
  return (
    <div className="ch9-scroll ch9-bal" ref={ref} style={{ height: '240vh' }}>
      <div className="ch9-stick">
        <svg viewBox="0 0 600 420" aria-hidden="true">
          <rect x="292" y="120" width="16" height="250" fill="var(--gold-text)" />
          <path d="M230 390h140l-20-22H250z" fill="var(--gold-text)" />
          <g className="ch9-beam" style={{ transform: `rotate(${a}deg)` }}>
            <rect x="70" y="112" width="460" height="14" rx="7" fill="var(--maroon-deep)" />
            <circle cx="300" cy="119" r="14" fill="var(--gold)" />
            <g className="ch9-pan" style={{ transform: `rotate(${-a}deg)`, transformOrigin: '90px 119px' }}>
              <line x1="90" y1="119" x2="60" y2="240" stroke="var(--gold-text)" strokeWidth="2" />
              <line x1="90" y1="119" x2="120" y2="240" stroke="var(--gold-text)" strokeWidth="2" />
              <path d="M40 240h100q-6 34-50 34t-50-34z" fill="var(--paper)" stroke="var(--gold)" strokeWidth="2" />
              <text x="90" y="300" textAnchor="middle" fontFamily="Kedem" fontWeight="700" fontSize="22" fill="var(--maroon-deep)">{one(s.sides!.umayya)}</text>
            </g>
            <g className="ch9-pan" style={{ transform: `rotate(${-a}deg)`, transformOrigin: '510px 119px' }}>
              <line x1="510" y1="119" x2="480" y2="240" stroke="var(--gold-text)" strokeWidth="2" />
              <line x1="510" y1="119" x2="540" y2="240" stroke="var(--gold-text)" strokeWidth="2" />
              <path d="M460 240h100q-6 34-50 34t-50-34z" fill="var(--paper)" stroke="var(--gold)" strokeWidth="2" />
              <circle cx="510" cy="232" r="14" fill="var(--stamp)" style={{ opacity: st[i].winner === null ? 0 : 1, transition: 'opacity .8s' }} />
              <text x="510" y="300" textAnchor="middle" fontFamily="Kedem" fontWeight="700" fontSize="22" fill="var(--maroon-deep)">{one(s.sides!.ali)}</text>
            </g>
          </g>
        </svg>
        <div>
          <div className="ch9-bal-card">
            {st.map((x, k) => (
              <div className={'ch9-bal-st' + (k === i ? ' is-on' : '')} key={k} aria-hidden={k !== i}>
                <div className={'ch9-bal-media' + (x.art === 'night' ? ' is-muted' : '')}>{art(x.art)}</div>
                <span className="ch9-bal-yr">{one(x.year)}</span>
                <h4>{one(x.title)}</h4>
                <p>{sentences(groupsRefs[k])}</p>
              </div>
            ))}
          </div>
          <div className="ch9-ticks" aria-hidden="true">{st.map((_, k) => <i key={k} className={k <= i ? 'is-on' : ''} />)}</div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 04 · Karbala ---------------- */

/** The chapter's climax — a FILM WITH SUBTITLES, not a scroll device (the user's call,
    11.10.2026: „סרטון עם כתוביות ולא גלילה"). Chapter 6's own player (StoryFilm), with
    play/pause, seek and fullscreen. The film is the two painted clips — the sun sets and
    the riders appear on the ridge; the banner falls and night comes — joined and slowed
    to 44s so the four sentences of §5 can be read at about two words a second. The
    subtitles are those four fragments, cut into lines by build-karbala-cues.mjs and
    checked word for word by the gate. No faces, no blood, no body: the violence is in the
    sentence, not in the picture. There is no sound — the volume control is chapter 6's. */
function KarbalaFilm() {
  return (
    <div className="ch9-film-wide" data-reveal>
      <StoryFilm
        src={`${ART}karbala-film.mp4`}
        poster={`${ART}karbala-1.jpg`}
        captions={`${ART}karbala-film.vtt`}
        cues={CUES}
        title=""
        reveal=""
        label="סרטון: קרב כרבלאא'"
      />
    </div>
  )
}

/** Husayn's sentence over the banner in the wind (replaces the slider the user found
    too game-like, 11.10.2026). The whole of §5.saying is printed: the attribution in
    small type, the saying itself large — its words light one by one with the scroll —
    and the transliteration last. */
function Saying() {
  const ref = useRef<HTMLDivElement | null>(null)
  const p = useScrollProgress(ref)
  const r = slot('karbala', 'saying')[0]
  const t = text(r)
  const m = /^(.*?:)\s(".*?")\s(.*)$/.exec(t)
  if (!m) throw new Error('chapter 9: §5.saying no longer splits at its quotation')
  const words = m[2].split(' ')
  return (
    <div className="ch9-scroll is-bleed ch9-say" ref={ref} style={{ height: '160vh' }}>
      <div className="ch9-stick ch9-stage">
        <Loop name="bannersky" poster="banner-sky" />
        <div className="ch9-say-copy">
          <p className="ch9-say-pre">{m[1]}</p>
          <p className="ch9-say-q">{words.map((w, k) => <span key={k} className={p * 1.25 > k / words.length ? 'is-on' : ''}>{w}{k < words.length - 1 ? ' ' : ''}</span>)}</p>
          <span className={'ch9-say-tr' + (p > 0.82 ? ' is-on' : '')}>{m[3]}</span>
        </div>
      </div>
    </div>
  )
}

/** Karbala and Najaf on a parchment atlas. The map is painted without a single letter
    (rule 40); the two names are DOM, placed from a 5% grid laid over the plate (rule 65).
    `dir="ltr"` + `left`: a place on a map is not a reading direction (rule 61). The
    atlas is schematic, not surveyed — it shows the two cities west of the western river,
    Najaf south of Karbala, and nothing it would have to measure. */
function Cities() {
  const pins = meta('karbala').pins!
  return (
    <div className="ch9-cities" data-reveal>
      <T s="karbala" n="cities" />
      <div className="ch9-map" dir="ltr">
        <img src={`${ART}map-1.jpg`} alt="מפת קלף מצוירת של הארץ שבין שני הנהרות" loading="lazy" />
        {pins.map((pin, k) => (
          <span className={'ch9-pin' + (k === 0 ? ' is-west' : ' is-east')} key={one(pin.name)} style={{ left: pctf(pin.at[0]), top: pctf(pin.at[1]) }} dir="rtl"><i /><b>{one(pin.name)}</b></span>
        ))}
      </div>
    </div>
  )
}

/* ---------------- 05 · growth ---------------- */

function Pair() {
  return (
    <div className="ch9-pair" data-reveal>
      {meta('growth').pair!.map((c) => (
        <div className="ch9-card" key={one(c.name)}>
          <h4>{one(c.name)} · <span className="ch9-tr">{one(c.tr)}</span></h4>
          <p>{one(c.say)}</p>
        </div>
      ))}
    </div>
  )
}

/** al-taqiyya: from a shuttered room lit by one lamp to a street full of flags. The
    picture changes exactly when the caption reaches 1979 (replaces the lantern the user
    found too game-like, 11.10.2026). */
function Taqiyya() {
  const ref = useRef<HTMLDivElement | null>(null)
  const p = useScrollProgress(ref)
  const g = groups('growth', 'sequence')
  const i = p < 0.33 ? 0 : p < 0.66 ? 1 : 2
  return (
    <div className="ch9-scroll is-bleed" ref={ref} style={{ height: '220vh' }}>
      <div className="ch9-stick ch9-stage">
        <Loop name="hidden" />
        <Loop name="open" poster="open-2" className={i < 1 ? 'is-off' : ''} />
        <div className="ch9-veil" />
        <div className="ch9-caps">
          {g.map((refs, k) => <p key={k} className={k === i ? 'is-on' : ''} aria-hidden={k !== i}>{sentences(refs)}</p>)}
        </div>
      </div>
    </div>
  )
}

/* ---------------- 06 · customs ---------------- */

/** The disputed word. §10.verse is printed whole; inside it, „وَأَرْجُلَكُمْ" is marked,
    and the reader chooses which verb it leans on — a dashed arc runs from it to
    „فَاغْسِلُوا" (wash) or „وَامْسَحُوا" (wipe). The buttons are §10.dispute's own words
    and name the ACTION, not the sect: the sentence does not assign the readings. */
function DisputedWord() {
  const r = slot('customs', 'verse')[0]
  const t = text(r)
  const W = { legs: 'وَأَرْجُلَكُمْ', wash: 'فَاغْسِلُوا', wipe: 'وَامْسَحُوا' }
  const arStart = t.indexOf('يَا')
  const arEnd = t.indexOf(W.legs) + W.legs.length
  if (arStart < 0 || arEnd < W.legs.length) throw new Error('chapter 9: §10.verse lost its Arabic')
  const ar = t.slice(arStart, arEnd)
  const [to, setTo] = useState<'wash' | 'wipe' | null>(null)
  const box = useRef<HTMLDivElement | null>(null)
  const [d, setD] = useState('')
  useEffect(() => {
    if (!to || !box.current) { setD(''); return }
    const R = box.current.getBoundingClientRect()
    const a = box.current.querySelector('[data-w="legs"]')!.getBoundingClientRect()
    const c = box.current.querySelector(`[data-w="${to}"]`)!.getBoundingClientRect()
    const x1 = a.left + a.width / 2 - R.left, y1 = a.top - R.top, x2 = c.left + c.width / 2 - R.left, y2 = c.top - R.top
    const top = Math.min(y1, y2) - 46
    setD(`M${x1.toFixed(1)} ${y1.toFixed(1)} C ${x1.toFixed(1)} ${top.toFixed(1)}, ${x2.toFixed(1)} ${top.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`)
  }, [to])
  const parts = ar.split(new RegExp(`(${Object.values(W).join('|')})`))
  const key = (w: string) => (Object.entries(W).find(([, v]) => v === w)?.[0] ?? null) as 'legs' | 'wash' | 'wipe' | null
  return (
    <div className="ch9-verse" data-reveal>
      <p>
        {t.slice(0, arStart)}
        <span className="ch9-ar" lang="ar" dir="rtl" ref={box} style={{ position: 'relative' }}>
          {parts.map((bit, k) => {
            const w = key(bit)
            if (!w) return <span key={k}>{bit}</span>
            return <span key={k} data-w={w} className={'ch9-w ' + (w === 'legs' ? 'is-hot' : 'is-tgt' + (to === w ? ' is-lit' : ''))}>{bit}</span>
          })}
          <svg className="ch9-arc" aria-hidden="true"><path d={d} opacity={d ? 1 : 0} /></svg>
        </span>
        {t.slice(arEnd)}
      </p>
      <T s="customs" n="dispute" />
      <div className="ch9-choose">
        {meta('customs').choose!.map((c) => (
          <button key={c.to} type="button" className="ch9-pill is-ghost" aria-pressed={to === c.to} onClick={() => setTo(c.to as 'wash' | 'wipe')}>{one(c.label)}</button>
        ))}
      </div>
    </div>
  )
}

/** the call to prayer as the Sunni lines, and — on one press — the two lines the Shia
    add slide into their places. Every line is cut from §11, which is printed whole above. */
function Adhan() {
  const s = meta('customs')
  const [shia, setShia] = useState(false)
  return (
    <div className="ch9-duo" data-reveal>
      <div className={'ch9-adhan' + (shia ? ' is-shia' : '')}>
        {s.adhan!.map((row, k) =>
          row.shia ? (
            <div className="ch9-adhan-row is-add" key={k} aria-hidden={!shia}>
              <div><span><b>{one(row.line)}</b> <span lang="ar" dir="rtl">({one(row.ar!)})</span></span><span className="ch9-tag">{one(s.shiaTag!)}</span></div>
            </div>
          ) : (
            <div className="ch9-adhan-row" key={k}><b>{one(row.line)}</b></div>
          ),
        )}
        <div className="ch9-adhan-foot">
          <button type="button" className="ch9-pill" aria-pressed={shia} onClick={() => setShia((v) => !v)}>
            {shia ? 'בלי התוספות' : 'עם התוספות של השיעים'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 07 · the Twelvers ---------------- */

/** Five roots grow from one trunk as the reader scrolls; each one carries the whole
    of its own fragment of §16 (name and definition). */
function Roots() {
  const ref = useRef<HTMLDivElement | null>(null)
  const seen = useSeen(ref)
  const p = seen ? 1 : 0
  const g = groups('twelvers', 'roots')
  const D = ['M500 70 C 500 160, 900 170, 900 300', 'M500 70 C 500 170, 700 190, 700 300', 'M500 70 L 500 300', 'M500 70 C 500 170, 300 190, 300 300', 'M500 70 C 500 160, 100 170, 100 300']
  return (
    <div className={'ch9-roots' + (seen ? ' is-grown' : '')} ref={ref}>
      <div>
        <svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true" style={{ direction: 'ltr' }}>
          <rect x="485" y="0" width="30" height="70" rx="6" fill="var(--maroon-deep)" />
          {D.map((d, k) => {
            const f = Math.min(1, Math.max(0, p * 1.7 - k * 0.15))
            return <path key={k} d={d} pathLength={1} strokeDasharray="1" strokeDashoffset={(1 - f).toFixed(3)} style={{ transitionDelay: `${k * 160}ms` }} />
          })}
        </svg>
        <ol>
          {g.map((refs, k) => <li key={k} className={p * 1.7 - k * 0.15 >= 0.95 ? 'is-on' : ''} style={{ transitionDelay: `${300 + k * 160}ms` }}>{sentences(refs)}</li>)}
        </ol>
      </div>
    </div>
  )
}

/** The two occultations as durations (rule 60): a short gold bar for „כשבעים שנה",
    and a maroon bar that runs off the edge of the page — „הנמשכת עד היום" has no end. */
function Occultation() {
  return (
    <div className="ch9-occ" data-reveal aria-hidden="true">
      {meta('twelvers').occult!.map((o, k) => (
        <div key={k}>
          <div className={'ch9-bar ' + (o.open ? 'is-open' : 'is-short')}>{one(o.name)}</div>
          <p className="ch9-bar-span">{one(o.span)}</p>
        </div>
      ))}
    </div>
  )
}



export default function Chapter9() {
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
    try { setCollapsed(localStorage.getItem('ch9:side-collapsed') === '1') } catch {}
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('ch9:side-collapsed', next ? '1' : '0') } catch {}
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
      <MarkToNotebook ch={9} />
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
            <span className="menu-sub">{CH9.menuTitle}</span>
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

              {/* ============ 01 · the party of Ali ============ */}
              <Section id="shia" className="opening-section">
                {/* the banner: a golden-domed shrine in bright morning, doves rising, red
                    and green banners in the wind (rule 42: bright under the 55% veil) */}
                <div className="ch6-hero">
                  <div className="ch6-hero-media" aria-hidden="true" style={{ backgroundImage: `url('${ART}hero-1.jpg')` }}>
                    <video className="ch6-hero-video" autoPlay muted loop playsInline preload="auto" poster={`${ART}hero-1.jpg`} tabIndex={-1} onError={(e) => { e.currentTarget.hidden = true }}>
                      <source src={`${ART}hero.mp4`} type="video/mp4" />
                    </video>
                  </div>
                  <div className="ch6-hero-copy">
                    <h1 id="chapter-title" className="ch6-hero-title">{CH9.title}</h1>
                  </div>
                </div>
                <Head id="shia" />
                <T s="shia" n="lead" />
                <Share />
                                <T s="shia" n="meaning" />
              </Section>

              {/* ============ 02 · Ghadir Khumm ============ */}
              <Section id="ghadir">
                <Cover id="ghadir"><Loop name="ghadir" /></Cover>
                <T s="ghadir" n="lead" />
                <Meet />
                <T s="ghadir" n="verse" />
                <Env id="feast" sectionId="ghadir" />
                <Calendar />
              </Section>

              {/* ============ 03 · Ali and the house of Umayya ============ */}
              <Section id="ali">
                <Head id="ali" />
                {/* the camp at Kufa on the Euphrates, where Ali built his base (§2) */}
                <Aside src="kufa-1" flip><T s="ali" n="lead" /></Aside>
                <Balance />
                <T s="ali" n="after" />
              </Section>

              {/* ============ 04 · Karbala ============ */}
              <Section id="karbala">
                <Head id="karbala" />
                {/* the one sentence the booklet prints in red — it opens the section alone */}
                <T s="karbala" n="red" className="ch9-red" />
                <KarbalaFilm />
                <Env id="ashura" sectionId="karbala" />
                <T s="karbala" n="ashura" />
                <Saying />
                <T s="karbala" n="after" />
                <Env id="cities" sectionId="karbala" />
                <Cities />
              </Section>

              {/* ============ 05 · how the Shia grew ============ */}
              <Section id="growth">
                <Head id="growth" />
                {/* Baghdad on the Tigris, tenth century — the Buyids (§8) */}
                <Aside src="baghdad-1" flip><T s="growth" n="lead" /><T s="growth" n="curse" /></Aside>
                <Pair />
                                <Steps s="growth" n="notes" marks={meta('growth').steps!} />
                <Env id="taqiyya" sectionId="growth" />
                <Taqiyya />
              </Section>

              {/* ============ 06 · the customs ============ */}
              <Section id="customs">
                <Head id="customs" />
                <Env id="wudu" sectionId="customs" />
                <Aside src="wudu-1" flip><T s="customs" n="lead" /><T s="customs" n="feet" /></Aside>
                <DisputedWord />
                <Env id="adhan" sectionId="customs" />
                <T s="customs" n="adhan" />
                <Adhan />
                <Env id="prayer" sectionId="customs" />
                <div className="ch9-cards" data-reveal>
                  <article><Loop name="hands" /><div><T s="customs" n="hands" /></div></article>
                  <article><Loop name="turba" /><div><T s="customs" n="turba" /></div></article>
                </div>
              </Section>

              {/* ============ 07 · the Twelvers ============ */}
              <Section id="twelvers">
                {/* twelve niches, eleven burning, the last one dark — counted on the plate */}
                <Cover id="twelvers"><Loop name="lamps" /></Cover>
                <Facts s="twelvers" n="lead" marks={meta('twelvers').facts!} />
                <T s="twelvers" n="masum" />
                <Env id="roots" sectionId="twelvers" />
                <T s="twelvers" n="rootsLead" />
                <Roots />
                <Env id="mahdi" sectionId="twelvers" />
                <T s="twelvers" n="mahdi" />
                <T s="twelvers" n="periods" />
                <Occultation />
                <T s="twelvers" n="after" />
                <T s="twelvers" n="names" />
                                <T s="twelvers" n="close" className="ch9-close" />
              </Section>

              {/* the close, identical in every chapter (rule 33) */}
              <div className="chapter-end" ref={endRef} id="chapter-end" data-reveal>
                <Link className="chapter-end-back" href="/chapter9/practice">לתרגול המסכם</Link>
                {practiceDone && <span className="chapter-end-done">הושלם</span>}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
