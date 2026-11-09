'use client'

/* Chapter 1 — the article, with the game's pieces inside it. PILOT (3.11.2026).

   The chapter was a 3D game; „לא עובד טוב" became „קטעי מאמר ובתוכו חלקי משחק —
   לשמור רק את האינטראקציות". This page is one section of that article, built on the
   site's own skeleton (chapter 7's, part for part) so it can be judged beside the
   chapters that are finished. If it holds, the rest of the chapter follows the same
   pattern; see concept/chapter1/DECISIONS.md, 3.11.2026.

   THE CRATE is the game's task-loading, kept as a mechanism and not as a task: there
   is no question and nothing is marked right or wrong. Silk and spices load. The
   monotheistic ideas do not — they slip back, and drift out across the painting while
   the source's own phrase for how they travelled stays on the plate. The refusal is
   §9, not the reader's mistake. §9 is still printed in full under it.

   WHAT THIS FILE MAY NOT DO: write a sentence. Every string comes from passages.json
   through `text()`, by reference, and every label on the crate is cut from its own
   sentence in layout.json. concept/chapter1/verify-article.mjs checks both. */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import ChapterSearch from '@/components/chapter6/ChapterSearch'
import { Scrolly } from '@/components/chapter6/scrolly'
import RouteMap from '@/components/chapter1/RouteMap'
import { CH1, LAYOUT, SECTIONS, em, meta, sub, text, tr, type CrateItem } from '@/lib/chapter1/article/content'

const A = '/assets/chapter1/article/'

/* ---------------- text primitives (chapter 7's, unchanged) ---------------- */
type Paint = (phrase: string, key: string) => ReactNode
function mark(t: string, groups: { phrases: string[]; paint: Paint }[], key: string): ReactNode[] {
  const all = groups.flatMap((g) => g.phrases.map((phrase) => ({ phrase, paint: g.paint })))
  if (!all.length) return [t]
  if (process.env.NODE_ENV !== 'production') {
    for (const { phrase } of all) if (!t.includes(phrase)) console.error(`chapter 1: „${phrase}" is not in ${key}`)
  }
  all.sort((a, b) => b.phrase.length - a.phrase.length)
  let parts: ReactNode[] = [t]
  for (const [pi, { phrase, paint }] of all.entries()) {
    const next: ReactNode[] = []
    for (const part of parts) {
      if (typeof part !== 'string') { next.push(part); continue }
      part.split(phrase).forEach((bit, i) => {
        if (i) next.push(paint(phrase, `${key}-${pi}-${i}`))
        if (bit) next.push(bit)
      })
    }
    parts = next
  }
  return parts
}
const bold = (cls: string): Paint =>
  function paintBold(phrase, k) { return <b className={cls} key={k}>{phrase}</b> }
const painted = (r: string) =>
  mark(text(r), [{ phrases: em(r), paint: bold('key') }, { phrases: tr(r), paint: bold('ch1-tr') }], r)

function T({ refs, className }: { refs: string[]; className?: string }) {
  return (
    <p className={className} data-reveal>
      {refs.flatMap((r, i) => [...(i ? [' '] : []), ...painted(r)])}
    </p>
  )
}

/** A paragraph riding in a stage card. No `data-reveal`: the Scrolly fades its own steps. */
function StageP({ refs }: { refs: string[] }) {
  return <p>{refs.flatMap((r, i) => [...(i ? [' '] : []), ...painted(r)])}</p>
}

function Head({ id }: { id: string }) {
  const s = meta(id)
  return (
    <header className="section-heading" data-reveal>
      <div>
        <h2 id={`${id}-title`}>{s.title}</h2>
      </div>
      <div className="title-ornament section-ornament" aria-hidden="true"><span /></div>
    </header>
  )
}
function Env({ id, sectionId }: { id: string; sectionId: string }) {
  return <h3 className="scrolly-env" id={id}>{sub(sectionId, id)}</h3>
}

/* ---------------- the crate ----------------
   Each good is a real <button>: a tap, Enter or a drag onto the load all do the same
   thing. A drag that ends anywhere but the load returns the chip. The state classes
   sit on `.ch1-crate-in`, never on the `[data-reveal]` figure (the reveal trap). */
const C = LAYOUT.crate
const GOODS = C.items.filter((i) => i.loads)
/* the game's own props, rendered from its models by concept/chapter1/render-props.py */
const ART: Record<string, string> = { silk: 'prop-silk', spice: 'prop-spice' }

function Crate() {
  const zoneRef = useRef<HTMLDivElement | null>(null)
  const [loaded, setLoaded] = useState<string[]>([])
  const [seeped, setSeeped] = useState(false)
  const [shake, setShake] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)
  const [over, setOver] = useState(false)
  const start = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null)
  /* a pointer sequence that was a drag is followed by a click event; that click must
     not count a second time (or count at all when the drag ended off the load) */
  const dragged = useRef(false)

  const attempt = useCallback((item: CrateItem) => {
    if (item.loads) {
      setLoaded((cur) => (cur.includes(item.id) ? cur : [...cur, item.id]))
      return
    }
    /* the one that does not go in: it shakes back to the tray, then leaves on its own */
    setShake(item.id)
    window.setTimeout(() => { setShake(null); setSeeped(true) }, 560)
  }, [])

  const inZone = (x: number, y: number) => {
    const r = zoneRef.current?.getBoundingClientRect()
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  const onDown = (item: CrateItem) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    /* every press starts clean. A chip that was dragged INTO the load leaves the tray, so
       its trailing click never arrives — without this the flag stayed armed and swallowed
       the next real tap on another chip (caught in the first screenshot run) */
    dragged.current = false
    start.current = { id: item.id, x: e.clientX, y: e.clientY, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = start.current
    if (!s) return
    if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 6) return
    s.moved = true
    setDrag({ id: s.id, x: e.clientX - s.x, y: e.clientY - s.y })
    setOver(inZone(e.clientX, e.clientY))
  }
  const onUp = (item: CrateItem) => (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = start.current
    start.current = null
    setDrag(null)
    setOver(false)
    /* a drag counts only if it ends on the load; a tap (no movement) always counts —
       the click handler below is suppressed after a real drag so it never fires twice */
    if (s?.moved) {
      dragged.current = true
      if (inZone(e.clientX, e.clientY)) attempt(item)
    }
  }
  const onClick = (item: CrateItem) => () => {
    if (dragged.current) { dragged.current = false; return }
    attempt(item)
  }

  const allIn = GOODS.every((g) => loaded.includes(g.id))
  const touched = loaded.length > 0 || seeped
  const reset = () => { setLoaded([]); setSeeped(false); dragged.current = false }
  const tray = C.items.filter((i) => !loaded.includes(i.id) && !(seeped && !i.loads))

  /* ONE SCENE, NOT BUTTONS BESIDE A PICTURE. The loading yard runs the full column; the
     game's own props (silk, the spice sack — rendered from its models) lie on the ground
     over the left of the painting, and the camel's load is the target. That left side is
     under a strong parchment wash on purpose: the traders there show their faces (rule 43).
     The painting is a place, so it is laid out physically (rule 61). */
  return (
    <figure className="ch1-crate" data-reveal>
      <div className={'ch1-yard' + (allIn ? ' is-full' : '') + (seeped ? ' is-seeped' : '') + (over ? ' is-over' : '')} dir="ltr">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ch1-yard-art" src={`${A}load-wide.webp`} alt="" loading="lazy" decoding="async" />
        <span className="ch1-yard-veil" aria-hidden="true" />

        <div ref={zoneRef} className="ch1-yard-zone" aria-hidden="true">
          <span className="ch1-yard-zone-name" dir="rtl">{C.editorial.zone}</span>
          <span className="ch1-yard-stack">
            {GOODS.filter((g) => loaded.includes(g.id)).map((g) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={g.id} className="ch1-yard-loaded" src={`${A}${ART[g.id]}.webp`} alt="" />
            ))}
          </span>
        </div>
        {allIn && <span className="ch1-yard-full" dir="rtl">{C.loaded.label}</span>}

        {seeped && (
          <span className="ch1-yard-drift" dir="rtl" aria-hidden="true">
            <span className="ch1-thing-scroll" />
            {C.items.find((i) => !i.loads)?.label}
          </span>
        )}

        <div className="ch1-yard-ground" dir="rtl">
          <p className="ch1-yard-hint" aria-hidden={touched}>{C.editorial.hint}</p>
          <div className="ch1-yard-tray" role="group" aria-label={C.editorial.hint}>
            {tray.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  'ch1-thing' +
                  (item.loads ? '' : ' is-idea') +
                  (shake === item.id ? ' is-refused' : '') +
                  (drag?.id === item.id ? ' is-dragging' : '')
                }
                style={drag?.id === item.id ? { translate: `${drag.x.toFixed(1)}px ${drag.y.toFixed(1)}px` } : undefined}
                onPointerDown={onDown(item)}
                onPointerMove={onMove}
                onPointerUp={onUp(item)}
                onPointerCancel={() => { start.current = null; setDrag(null); setOver(false) }}
                onClick={onClick(item)}
              >
                {ART[item.id] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img className="ch1-thing-art" src={`${A}${ART[item.id]}.webp`} alt="" draggable={false} />
                ) : (
                  <span className="ch1-thing-scroll" aria-hidden="true" />
                )}
                <span className="ch1-thing-name">{item.label}</span>
              </button>
            ))}
          </div>
          <p className="ch1-yard-state" aria-live="polite">
            {seeped && <span className="ch1-yard-seep">{C.seeped.label}</span>}
          </p>
          {touched && <button type="button" className="ch1-yard-reset" onClick={reset}>{C.editorial.reset}</button>}
        </div>
      </div>
    </figure>
  )
}

/* ---------------- the page ---------------- */
export default function Chapter1Article() {
  const router = useRouter()
  const articleRef = useRef<HTMLElement | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

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
    try { setCollapsed(localStorage.getItem('ch1:side-collapsed') === '1') } catch {}
    const mq = window.matchMedia('(min-width:1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('ch1:side-collapsed', next ? '1' : '0') } catch {}
      return next
    })
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
            <p className="menu-title">תוכן הפרק</p>
            <span className="menu-sub">{CH1.menuTitle}</span>
          </div>
          <nav className="chapter-menu-nav" aria-label="ניווט בפרק">
            <ol>
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="is-current" aria-current="true" onClick={() => setDrawer(false)}>
                    <span className="menu-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="menu-label">{s.title}</span>
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
            <main className="chapter-article ch1" ref={articleRef}>
              {/* ============ the tribes and the trade routes ============ */}
              <section className="article-section opening-section" id="tribes" aria-labelledby="tribes-title">
                {/* the banner: the caravan walking into the sunrise. A still poster for the
                    pilot — the chapter's opening film can take its place later. */}
                <div className="ch6-hero">
                  <div className="ch6-hero-media ch1-hero-media" aria-hidden="true" />
                  <div className="ch6-hero-copy">
                    <h1 id="chapter-title" className="ch6-hero-title">{CH1.title}</h1>
                  </div>
                </div>
                <Head id="tribes" />
                {/* the journey: the painted map fills the screen, the caravan walks the
                    road north while §7 is read, and the two empires arrive with §8 */}
                <div className="ch1-route">
                  <Scrolly full art={(s) => <RouteMap {...s} />}>
                    <StageP refs={['§6.a']} />
                    <StageP refs={['§7.a']} />
                    <StageP refs={['§8.a']} />
                  </Scrolly>
                </div>
                <Env id="roads" sectionId="tribes" />
                <Crate />
                <T refs={['§9.a', '§9.b', '§9.c']} />
              </section>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
