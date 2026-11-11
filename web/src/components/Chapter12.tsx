'use client'

/* Chapter 12 — ג'האד, רבאט ואסתשהאד.

   Same product as chapters 2, 5, 6, 10 and 11: masthead, rail, type scale, reveal and every
   colour come from chapter6-article.css, which the route layout loads first;
   chapter12-article.css adds only this chapter's devices.

   THE SHAPE (the user, 3.11.2026): one idea for the whole chapter — a desk built in Blender
   (concept/chapter12/blender/), five folders on it, one per heading of the source. „כניסה לכל
   תיק פותחת" its unit. The desk is the head of the page; a press on a folder dives the camera
   into it and the desk gives way to that folder's screen, which opens on the same folder lying
   open (a second render). ONE FOLDER, ONE SCREEN (4.11, „כל תיק במסך משלו" — the first build
   ran the five units down one long page, and its navigation was struck): the folder on screen
   is in the URL hash, each unit's foot leads to the folder before, the desk, and the folder
   after, and the search still reaches every word (see THE SEARCH AND THE SCREENS).
   The desk reads right to left: 01 top right (build-desk2.py SPOTS).
   Each unit has the device its content asks for: two faces of a word (01), two men and three
   years (02), the senses of one word as a ladder (03), two kinds (04), the charter's own
   א/ב/ג (05).

   THE SOURCE, ONE TO ONE. Read top to bottom, this page is SOURCE-TEXT.md word for word:
   every fragment printed once, in source order — concept/chapter12/verify-chapter12.mjs walks
   layout.json and fails otherwise.

   WHAT THIS FILE MAY NOT DO: write a sentence. Every string comes from passages.json through
   text(), addressed by its §N.fragment. Card titles, years and senses are cut out of a
   fragment's own sentence ({from, cut}, rule 27) and checked by the same gate. The folder
   labels on the desk are typeset by us into the render (blender/labels.mjs) and carry only
   the source's headings, its Arabic terms and its years. */

import SiteFooter from '@/components/SiteFooter'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import MarkToNotebook from '@/components/MarkToNotebook'
import { CH12, em, frag, text, tr } from '@/lib/chapter12/content'
import deskData from '@/lib/chapter12/desk.json'
import layoutData from '@/lib/chapter12/layout.json'
import openData from '@/lib/chapter12/open.json'
import {
  completedSections,
  markContentComplete,
  markSectionDone,
  practiceComplete,
  resumeSectionId,
  saveCurrentSection,
  SECTION_ORDER,
} from '@/lib/chapter12/progress'

const ART = '/assets/chapter12/'

/** a device label: words cut out of one fragment's sentence (rule 27) */
interface Cut { from: string; cut: string[] }
interface Stop { label: Cut; refs: string[]; img?: string }
type Block =
  | { p: string[] }
  | { quote: string[] }
  | { pair: Stop[] }
  | { chain: { kind: 'years' | 'senses'; stops: Stop[] } }
  | { cards: string[] }
  | { aside: { img: string; p: string[] } }
interface LayoutSection { id: string; n: string; title: string; term: string; blocks: Block[] }
const SECTIONS = (layoutData as unknown as { sections: LayoutSection[] }).sections

interface Folder { n: number; poly: [number, number][]; center: [number, number] }
const DESK = deskData as unknown as { image: [number, number]; folders: Folder[] }
/** the open folders: each top sheet's four corners in its render (build-desk3.py) */
const OPEN = openData as unknown as { image: [number, number]; page: [number, number]; folders: { n: number; quad: number[][] }[] }

const meta = (id: string): LayoutSection => {
  const s = SECTIONS.find((x) => x.id === id)
  if (!s) throw new Error(`chapter 12: unknown section ${id}`)
  return s
}

/** The words of a device label, checked against the sentence they are cut from. Throws on
    drift, so a label can never quietly say something its fragment does not (rule 27). */
const one = ({ from, cut }: Cut): string => {
  const t = frag(from).text ?? ''
  for (const c of cut) if (!t.includes(c)) throw new Error(`chapter 12: label "${c}" is not in ${from}`)
  return cut[0]
}

/* ---------------- text primitives (chapter 11's) ---------------- */

/** Paint the fragment's marked phrases inside its own sentence, leaving every other
    character alone: `.key` maroon — the idea; `.ch12-tr` gold — a term being taught
    (rule 38). Every phrase is a substring of its sentence; the gate fails if one drifts. */
type Paint = (phrase: string, key: string) => React.ReactNode
function mark(t: string, groups: { phrases: string[]; paint: Paint }[], key: string): React.ReactNode[] {
  const all = groups.flatMap((g) => g.phrases.map((phrase) => ({ phrase, paint: g.paint })))
  let parts: React.ReactNode[] = [t]
  let n = 0
  /* longest first, so a phrase that contains another is not cut in half by it */
  all.sort((a, b) => b.phrase.length - a.phrase.length)
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
    if (!found && process.env.NODE_ENV !== 'production') console.error(`chapter 12: ${key} — "${phrase}" not painted`)
    parts = next
  }
  /* the Arabic of a verse or a hadith sits inside a Hebrew sentence. Isolated, so its
     direction cannot drag the Hebrew punctuation around it, and set in the Arabic face. */
  return parts.flatMap((part): React.ReactNode[] => {
    if (typeof part !== 'string') return [part]
    return part.split(AR).map((bit, i) => (i % 2 ? <bdi className="ch12-ar" lang="ar" dir="rtl" key={`${key}-ar${n++}`}>{bit}</bdi> : bit)).filter((b) => b !== '')
  })
}
const AR = /([؀-ۿ]+(?:\s+[؀-ۿ]+)*)/

const bold = (cls: string): Paint =>
  function paintBold(phrase, k) { return <b className={cls} key={k}>{phrase}</b> }

const marks = (r: string) => [
  { phrases: em(r), paint: bold('key') },
  { phrases: tr(r), paint: bold('ch12-tr') },
]

const sentences = (refs: string[]) =>
  refs.flatMap((r, i) => [...(i ? [' '] : []), ...mark(text(r), marks(r), r)])

/** A run of fragments as paragraphs of at most ~45 words (chapter 9, „קירות של טקסט"). */
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

/** One block of layout.json, in its order. */
function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if ('p' in b) return paras(b.p).map((g) => <p data-reveal key={g[0]}>{sentences(g)}</p>)
        if ('aside' in b) {
          return (
            <div className="ch12-aside" data-reveal key={`aside-${i}`}>
              <div className="ch12-aside-t">{paras(b.aside.p).map((g) => <p key={g[0]}>{sentences(g)}</p>)}</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ch12-aside-art" src={`${ART}${b.aside.img}.webp`} alt="" loading="lazy" />
            </div>
          )
        }
        if ('quote' in b) return <p className="ch12-quote" data-reveal key={b.quote[0]}>{sentences(b.quote)}</p>
        if ('pair' in b) {
          return (
            <div className="ch12-pair" data-reveal key={`pair-${i}`}>
              {b.pair.map((c) => (
                <article className="ch12-card" key={c.refs[0]}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.img && <img className="ch12-card-art" src={`${ART}${c.img}.webp`} alt="" loading="lazy" />}
                  <b className="ch12-card-m">{one(c.label)}</b>
                  {paras(c.refs).map((g) => <p key={g[0]}>{sentences(g)}</p>)}
                </article>
              ))}
            </div>
          )
        }
        if ('chain' in b) {
          /* 02: three years on one line of time · 03: one word, the meanings it takes on,
             each pinned to the margin like a tab in a file */
          return (
            <ol className={`ch12-chain is-${b.chain.kind}`} key={`chain-${i}`}>
              {b.chain.stops.map((s) => (
                <li className={'ch12-stop' + (s.img ? ' has-art' : '')} data-reveal key={s.refs[0]}>
                  <b className="ch12-stop-m">{one(s.label)}</b>
                  <div className="ch12-stop-t">
                    {paras(s.refs).map((g) => <p key={g[0]}>{sentences(g)}</p>)}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s.img && <img className="ch12-stop-art" src={`${ART}${s.img}.webp`} alt="" loading="lazy" />}
                </li>
              ))}
            </ol>
          )
        }
        /* 05: the charter's own א / ב / ג — the letter is the source's, not a number we add */
        return (
          <div className="ch12-cards" data-reveal key={`cards-${i}`}>
            {b.cards.map((r) => <article className="ch12-sheet" key={r}><p>{sentences([r])}</p></article>)}
          </div>
        )
      })}
    </>
  )
}

/* ---------------- the desk ---------------- */

/** The desk, as rendered (desk-hero.webp), and over it one outline per folder, measured in
    Blender from the folder's own geometry (build-desk3.py → desk.json). The outline is the
    button — a press on the folder itself, nothing beside it. */
/* UX pass 11.11.2026: the desk said nothing about what to do with it, the folder names are
   baked into the render (~8px on a phone), and the site's hover tag sat under the outline's
   bounding box — folder 01's name landed on folder 04's label. Now: one editorial line under
   the title; on hover/focus the folder's name sits ON that folder (the site tag is switched
   off with an empty data-tip); and at ≤900px the five folders are also a list of real links. */
const DESK_HINT = 'בחרו תיק כדי לפתוח אותו'
function Desk({ onOpen, away }: { onOpen: (id: string, at: [number, number]) => void; away: boolean }) {
  const [w, h] = DESK.image
  const [hot, setHot] = useState<Folder | null>(null)
  const hotS = hot ? SECTIONS[hot.n - 1] : null
  return (
    <div className={'ch12-desk' + (away ? ' is-away' : '')} id="desk" data-screen="desk">
      <div className="ch12-desk-stage">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ch12-desk-img" src={`${ART}desk-hero.webp`} alt="" width={w} height={h} />
      <div className="ch12-desk-head">
        <h1 id="chapter-title" className="ch12-title">{CH12.title}</h1>
        <p className="ch12-desk-hint">{DESK_HINT}</p>
      </div>
      <svg className="ch12-desk-hit" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="תיקי הפרק">
        {DESK.folders.map((f) => {
          const s = SECTIONS[f.n - 1]
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-label={`${s.n} · ${s.title}`}
              data-tip=""
              onMouseEnter={() => setHot(f)}
              onMouseLeave={() => setHot(null)}
              onFocus={() => setHot(f)}
              onBlur={() => setHot(null)}
              onClick={(e) => { e.preventDefault(); onOpen(s.id, f.center) }}
            >
              <polygon points={f.poly.map((p) => p.join(',')).join(' ')} vectorEffect="non-scaling-stroke" />
            </a>
          )
        })}
      </svg>
      {hot && hotS && (
        <span className="ch12-desk-tag" aria-hidden="true"
          style={{ left: `${(hot.center[0] * 100).toFixed(2)}%`, top: `${(hot.center[1] * 100).toFixed(2)}%` }}>
          <b>{hotS.n}</b> {hotS.title}
        </span>
      )}
      </div>
      <nav className="ch12-desk-list" aria-label="תיקי הפרק — רשימה">
        <p className="ch12-desk-list-hint">{DESK_HINT}</p>
        <ol>
          {SECTIONS.map((s, i) => {
            const f = DESK.folders.find((x) => x.n === i + 1)
            return (
              <li key={s.id}>
                <a href={`#${s.id}`} onClick={(e) => { e.preventDefault(); onOpen(s.id, f ? f.center : [0.5, 0.5]) }}>
                  <b>{s.n}</b> {s.title}
                </a>
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}

/** The projective map that lays a w×h box onto four points (TL, TR, BR, BL) — Heckbert's
    square-to-quad, scaled to the box, as a CSS matrix3d with its origin at the box's corner. */
function quadMatrix(w: number, h: number, q: number[][]): string {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3
  const den = dx1 * dy2 - dx2 * dy1
  const g = (sx * dy2 - dx2 * sy) / den, k = (dx1 * sy - sx * dy1) / den
  const a = x1 - x0 + g * x1, b = x3 - x0 + k * x3, d = y1 - y0 + g * y1, e = y3 - y0 + k * y3
  return `matrix3d(${[a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1].join(',')})`
}
/** the heading's own box, in its own units — its aspect is the sheet's (open.json `page`) */
const PAGE_W = 1000
const PAGE_H = Math.round(PAGE_W * OPEN.page[0] / OPEN.page[1])

/** The head of a unit: the same folder lying open on the desk (open-0N.webp), its cover
    turned to the right like a Hebrew book. The heading is DOM, laid on the top sheet in the
    render's own perspective: Blender hands over the sheet's four corners (open.json), and the
    box is mapped onto them through the image's actual crop (object-fit / object-position), so
    it stays on the paper at every width. */
function Opened({ id }: { id: string }) {
  const s = meta(id)
  const year = !/[؀-ۿ]/.test(s.term)
  const quad = OPEN.folders[SECTIONS.indexOf(s)].quad
  const boxRef = useRef<HTMLElement | null>(null)
  const pageRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const box = boxRef.current, page = pageRef.current
    const img = box?.querySelector('img')
    if (!box || !page || !img) return
    const place = () => {
      const w = box.clientWidth, h = box.clientHeight
      const [iw, ih] = OPEN.image
      const sc = Math.max(w / iw, h / ih)
      const [px, py] = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100)
      const ox = (w - iw * sc) * px, oy = (h - ih * sc) * py
      page.style.transform = quadMatrix(PAGE_W, PAGE_H, quad.map(([x, y]) => [ox + x * iw * sc, oy + y * ih * sc]))
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(box)
    return () => ro.disconnect()
  }, [quad])
  return (
    <header className="ch12-open" data-reveal ref={boxRef}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ch12-open-img" src={`${ART}open-${s.n}.webp`} alt="" loading="lazy" />
      <div className="ch12-open-page" ref={pageRef} style={{ width: PAGE_W, height: PAGE_H }}>
        <span className="ch12-open-n">{s.n}</span>
        <h2 id={`${id}-title`} className={s.title.length > 12 ? "is-long" : undefined}>{s.title}</h2>
        {year
          ? <span className="ch12-open-year">{s.term}</span>
          : <span className="ch12-open-term" lang="ar" dir="rtl">{s.term}</span>}
      </div>
    </header>
  )
}

/** The foot of a unit: the folder before it (on the reading side, right), the desk, the folder
    after it (left). The last folder hands over to the chapter's close instead. */
function UnitNav({ id, go, onDesk }: { id: string; go: (id: string) => void; onDesk: () => void }) {
  const i = SECTION_ORDER.indexOf(id)
  const prev = SECTIONS[i - 1], next = SECTIONS[i + 1]
  return (
    <nav className="ch12-unit-nav" aria-label="מעבר בין התיקים" data-unit-end={id}>
      {prev
        ? <a className="ch12-step is-prev" href={`#${prev.id}`} onClick={(e) => { e.preventDefault(); go(prev.id) }}>
            <span className="ch12-step-dir">לתיק הקודם</span>
            <span className="ch12-step-t"><b>{prev.n}</b> {prev.title}</span>
          </a>
        : <span />}
      <button type="button" className="ch12-to-desk" onClick={onDesk}>חזרה לשולחן</button>
      {next
        ? <a className="ch12-step is-next" href={`#${next.id}`} onClick={(e) => { e.preventDefault(); go(next.id) }}>
            <span className="ch12-step-dir">לתיק הבא</span>
            <span className="ch12-step-t"><b>{next.n}</b> {next.title}</span>
          </a>
        : <span />}
    </nav>
  )
}

/** One folder, one screen (the user, 4.11: „כל תיק במסך משלו"). Every unit stays in the DOM —
    the away ones `display:none`, never `[hidden]`, so the search still reads them and the
    chapter brings forward the one it lands in. */
function Section({ id, away, go, onDesk, children }: { id: string; away: boolean; go: (id: string) => void; onDesk: () => void; children?: React.ReactNode }) {
  const s = meta(id)
  return (
    <section className={'article-section ch12-unit' + (away ? ' is-away' : '')} id={id} aria-labelledby={`${id}-title`} data-screen={id}>
      <Opened id={id} />
      <div className="ch12-body"><Blocks blocks={s.blocks} /></div>
      <UnitNav id={id} go={go} onDesk={onDesk} />
      {children}
    </section>
  )
}

export default function Chapter12() {
  const router = useRouter()
  const articleRef = useRef<HTMLElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const jumpUntil = useRef(0)
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  /* the folder on screen — null is the desk. It lives in the URL hash, so the rail's links,
     the back button and a shared link all land on the same folder. */
  const [open, setOpen] = useState<string | null>(null)
  const openRef = useRef<string | null>(null)
  const [doneSections, setDoneSections] = useState<Set<string>>(new Set())
  const [diving, setDiving] = useState<{ at: [number, number] } | null>(null)

  useEffect(() => { setDoneSections(new Set(completedSections())) }, [])

  /* a move between screens is a jump, not reading: nothing it passes earns a tick */
  const onMenuJump = useCallback(() => { jumpUntil.current = Date.now() + 1800 }, [])
  const show = useCallback((id: string | null, how: 'push' | 'replace' | 'none' = 'push') => {
    openRef.current = id
    setOpen(id)
    if (how !== 'none') {
      const url = id ? `#${id}` : window.location.pathname + window.location.search
      if (how === 'push') window.history.pushState(null, '', url)
      else window.history.replaceState(null, '', url)
    }
    if (id) saveCurrentSection(id)
    onMenuJump()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [onMenuJump])

  /* the hash wins; without one, resume on the folder the reader left — never on a first visit */
  useEffect(() => {
    const fromHash = () => {
      const h = decodeURIComponent(window.location.hash.slice(1))
      return SECTION_ORDER.includes(h) ? h : null
    }
    const first = fromHash()
    if (first) show(first, 'none')
    else {
      const id = resumeSectionId()
      if (id) show(id, 'replace')
    }
    const sync = () => { if (fromHash() !== openRef.current) show(fromHash(), 'none') }
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync) }
  }, [show])

  /* a folder is read when its foot — the nav to the next one — comes into view */
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || Date.now() < jumpUntil.current) continue
          const id = (e.target as HTMLElement).dataset.unitEnd
          if (!id) continue
          markSectionDone(id)
          setDoneSections((cur) => (cur.has(id) ? cur : new Set(cur).add(id)))
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0 },
    )
    document.querySelectorAll('[data-unit-end]').forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])

  /* THE SEARCH AND THE SCREENS. ChapterSearch walks the whole article, the away folders too
     (they are `display:none`, not `[hidden]`), but a hit in one measures 0×0 and the search
     does not move. So after every keystroke or press in the search, read where the current
     hit is (the highlight registry — lib/chapter3/useFindHit explains why that is the only
     signal), bring its screen forward, and bring the hit into view. */
  useEffect(() => {
    const registry = (CSS as unknown as { highlights?: Map<string, Iterable<Range>> }).highlights
    if (!registry) return
    let last: Range | null = null
    const look = () => {
      const hit = registry.get('chapter-find-current')
      if (!hit) { last = null; return }
      for (const range of hit) {
        if (range === last) return
        last = range
        const node = range.startContainer
        const el = node instanceof Element ? node : node.parentElement
        const screen = el?.closest<HTMLElement>('[data-screen]')?.dataset.screen
        if (!screen) return
        const want = screen === 'desk' ? null : screen
        if (want === openRef.current) return
        show(want, 'replace')
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const r = range.getBoundingClientRect()
          window.scrollTo({ top: window.scrollY + r.top - window.innerHeight * 0.35, behavior: 'instant' })
        }))
        return
      }
    }
    const soon = (e: Event) => {
      if (!(e.target instanceof Element) || !e.target.closest('.chapter-find')) return
      window.setTimeout(look, 90)     /* after React has run the search's effect and painted */
    }
    for (const t of ['input', 'keydown', 'click']) document.addEventListener(t, soon, true)
    return () => { for (const t of ['input', 'keydown', 'click']) document.removeEventListener(t, soon, true) }
  }, [show])

  useEffect(() => {
    const end = endRef.current
    if (!end) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || Date.now() < jumpUntil.current) continue
          /* the close sits at the foot of the last folder, and the folders are reached in any
             order — the reading is complete only once every folder has been read to its foot */
          const read = new Set([...completedSections(), SECTION_ORDER[SECTION_ORDER.length - 1]])
          if (!SECTION_ORDER.every((id) => read.has(id))) continue
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
    try { setCollapsed(localStorage.getItem('ch12:side-collapsed') === '1') } catch {}
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('ch12:side-collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }, [])
  /* ChapterSearch announces its jump with `chapter:jump` — skipped sections earn no tick */
  useEffect(() => {
    window.addEventListener('chapter:jump', onMenuJump)
    return () => window.removeEventListener('chapter:jump', onMenuJump)
  }, [onMenuJump])

  /* THE DIVE. The camera falls into the pressed folder (a scale toward its centre on the
     desk render), the page washes to paper, and the desk gives way to that folder's screen —
     whose head is the same folder, open. */
  const onOpen = useCallback((id: string, at: [number, number]) => {
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) { show(id); return }
    setDiving({ at })
    window.setTimeout(() => {
      show(id)
      window.setTimeout(() => setDiving(null), 60)
    }, 340)
  }, [show])
  const go = useCallback((id: string) => show(id), [show])
  const toDesk = useCallback(() => show(null), [show])

  return (
    <div className="chapter-page">
      <MarkToNotebook ch={12} />
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
            <span className="menu-sub">{CH12.menuTitle}</span>
          </div>
          {/* main sections only (rule 29) — the five folders */}
          <nav className="chapter-menu-nav" aria-label="ניווט בפרק">
            <ol>
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={open === s.id ? 'is-current' : undefined}
                    aria-current={open === s.id ? 'true' : undefined}
                    onClick={(e) => { e.preventDefault(); setDrawer(false); show(s.id) }}
                  >
                    <span className="menu-num">{s.n}</span>
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
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 11.2 12 4.5l8 6.7M6.3 9.5v9.7h4.4v-5.4h2.6v5.4h4.4V9.5" /></svg>
              לכל פרקי הלמידה
            </Link>
          </div>
        </aside>
        {drawer && <div className="chapter-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />}

        <div className="chapter-content">
          <div className="chapter-layout">
            <main
              className={'chapter-article ch12-article' + (diving ? ' is-diving' : '')}
              ref={articleRef}
              style={diving ? ({ '--dive-x': `${diving.at[0] * 100}%`, '--dive-y': `${diving.at[1] * 100}%` } as React.CSSProperties) : undefined}
            >
              <Desk onOpen={onOpen} away={open !== null} />
              {SECTIONS.map((s, i) => (
                <Section key={s.id} id={s.id} away={open !== s.id} go={go} onDesk={toDesk}>
                  {/* the close, identical in every chapter (rule 33) — at the foot of the last folder */}
                  {i === SECTIONS.length - 1 && (
                    <div className="chapter-end" ref={endRef} id="chapter-end" data-reveal>
                      <Link className="chapter-end-back" href="/chapter12/practice">לתרגול המסכם</Link>
                      {practiceDone && <span className="chapter-end-done">הושלם</span>}
                    </div>
                  )}
                </Section>
              ))}
            </main>
          </div>
          <SiteFooter />
        </div>
      </div>
    </div>
  )
}
