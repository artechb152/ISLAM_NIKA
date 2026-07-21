'use client'

/* The chapter's scroll engine, per the spec: the illustration advances WITH the scroll
   position and walks back on reverse scroll; the next transition begins only after the
   current paragraph passed the centre of the screen; scrolling is never locked.

   One <Scrolly> = one visual environment panel (sticky) + a column of paragraph steps.
   The art receives { step, t }: the index of the paragraph that most recently crossed
   the centre line, and the 0..1 progress of the centre line towards the next paragraph.
   Everything is a pure function of scroll position, so it is reversible by construction.

   Under prefers-reduced-motion the same states are computed, but the stylesheet turns
   every transition into an instant, gentle swap — nothing moves, everything shows. */

import {
  Children,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export interface ScrollyState {
  step: number
  t: number
}

const StepCtx = createContext<{ active: boolean; t: number }>({ active: false, t: 0 })

export function useStep() {
  return useContext(StepCtx)
}

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
export const seg = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a))
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export function Scrolly({
  art,
  artClass = '',
  full = false,
  children,
}: {
  art: (s: ScrollyState) => ReactNode
  artClass?: string
  /* full=true: the scene fills the whole screen behind the text; the paragraphs float
     over it in parchment cards, and the scroll drives the scene itself */
  full?: boolean
  children: ReactNode
}) {
  const items = Children.toArray(children)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [st, setSt] = useState<ScrollyState>({ step: 0, t: 0 })

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const steps = Array.from(root.querySelectorAll<HTMLElement>(':scope .scrolly-step'))
    if (!steps.length) return
    const reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches
    let raf = 0
    let listening = false

    function measure(): void {
      raf = 0
      const vh = window.innerHeight
      const mid = vh * 0.52
      const rects = steps.map((s) => s.getBoundingClientRect())
      const tops = rects.map((r) => r.top)
      let idx = 0
      for (let i = 0; i < tops.length; i++) if (tops[i] <= mid) idx = i
      const span =
        idx + 1 < tops.length
          ? Math.max(1, tops[idx + 1] - tops[idx])
          : Math.max(1, rects[idx].height + 160)
      const t = Math.round(clamp01((mid - tops[idx]) / span) * 50) / 50
      setSt((s) => (s.step === idx && s.t === t ? s : { step: idx, t }))
      /* full mode: each paragraph flows continuously with the scroll — it drifts in
         from below the screen, is fully present at the centre, and drifts out above.
         A pure function of position, so it rewinds; skipped under reduced motion. */
      if (full && !reduced) {
        for (let i = 0; i < steps.length; i++) {
          const c = rects[i].top + rects[i].height / 2 - vh * 0.5
          const d = c / vh
          /* fully present across the middle band; glides in below it, out above it —
             the band overlaps the step spacing, so there is never an empty moment */
          const a = 1 - seg(Math.abs(d), 0.15, 0.55)
          const eased = a * a * (3 - 2 * a)
          steps[i].style.opacity = String(0.02 + eased * 0.98)
          /* no per-frame translate: the paragraphs hold their place so the centre scroll-snap
             can settle each one smoothly instead of fighting a moving target (only opacity
             fades). */
          steps[i].style.transform = ''
        }
      }
    }
    function onScroll(): void {
      if (!raf) raf = requestAnimationFrame(measure)
    }

    /* the scroll listener runs only while this scrolly is anywhere near the viewport,
       so six environments never mean six live listeners */
    const io = new IntersectionObserver(
      (entries) => {
        const near = entries.some((e) => e.isIntersecting)
        if (near && !listening) {
          listening = true
          window.addEventListener('scroll', onScroll, { passive: true })
          onScroll()
        } else if (!near && listening) {
          listening = false
          window.removeEventListener('scroll', onScroll)
        }
      },
      { rootMargin: '260px 0px' }
    )
    io.observe(root)
    window.addEventListener('resize', onScroll)
    measure()
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className={'scrolly' + (full ? ' scrolly-fullstage' : '')} ref={rootRef}>
      <div className={full ? 'scrolly-stage' : 'scrolly-art ' + artClass} aria-hidden="true">
        {art(st)}
      </div>
      <div className="scrolly-copy">
        {items.map((child, i) => {
          /* a step may opt out of the centred text card (data-split) to lay out its own
             two-column row — text on the right, an illustration/interaction on the left */
          const split = (child as { props?: { 'data-split'?: boolean } })?.props?.['data-split']
          return (
            <div className={'scrolly-step' + (i === st.step ? ' is-active' : '')} key={i}>
              <StepCtx.Provider value={{ active: i === st.step, t: i === st.step ? st.t : i < st.step ? 1 : 0 }}>
                {full && !split ? <div className="stage-card">{child}</div> : child}
              </StepCtx.Provider>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---- verbatim paragraph with scroll-timed emphasis of words that ALREADY exist in it ---- */

interface Part {
  str: string
  mark: number | null
}

function splitMarks(text: string, marks: string[]): Part[] {
  let parts: Part[] = [{ str: text, mark: null }]
  marks.forEach((m, mi) => {
    parts = parts.flatMap((p) => {
      if (p.mark !== null) return [p]
      const i = p.str.indexOf(m)
      if (i < 0) return [p]
      return [
        { str: p.str.slice(0, i), mark: null },
        { str: m, mark: mi },
        { str: p.str.slice(i + m.length), mark: null },
      ].filter((x) => x.str.length > 0)
    })
  })
  return parts
}

export function P({
  text,
  marks = [],
  className = '',
}: {
  text: string
  marks?: string[]
  className?: string
}) {
  const { t } = useStep()
  const parts = useMemo(() => splitMarks(text, marks), [text, marks])
  const n = marks.length
  return (
    <p className={className}>
      {parts.map((p, i) =>
        p.mark === null ? (
          <span key={i}>{p.str}</span>
        ) : (
          <mark key={i} className={'wmark' + (t >= (p.mark + 1) / (n + 1) - 0.001 ? ' is-on' : '')}>
            {p.str}
          </mark>
        )
      )}
    </p>
  )
}
