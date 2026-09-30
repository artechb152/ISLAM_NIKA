'use client'

/* WHEN THE CHAPTER SEARCH LANDS INSIDE `ref`, CALL `onHit` WITH THE HIT'S NODE.

   For a container that hides some of its own text — a closed fold-out, a comic
   leaf that is turned away — so it can show the hit: „a hit the reader cannot
   see is worse than no hit at all".

   ⚠ THE SIGNAL IS THE HIGHLIGHT REGISTRY, READ ON SCROLL. ChapterSearch paints
   with the CSS Custom Highlight API (`CSS.highlights`, ranges that never touch
   the DOM): there is no selection, no focus and no event for a highlight. The
   one thing it does do is scroll the hit into view, so on every scroll this
   asks the registry where the current hit is. A `focusin` listener was the
   first attempt, in the fold-outs, and never fired once — the search does not
   move focus. It does announce its jumps (`chapter:jump`), which is the second
   signal below. */

import { useEffect, useRef } from 'react'

export function useFindHit(ref: React.RefObject<HTMLElement | null>, onHit: (el: Element) => void) {
  const cb = useRef(onHit)
  useEffect(() => { cb.current = onHit })

  useEffect(() => {
    const registry = (CSS as unknown as { highlights?: Map<string, Iterable<Range>> }).highlights
    if (!registry) return
    let raf = 0
    let last: Range | null = null
    const look = () => {
      raf = 0
      const root = ref.current
      const hit = registry.get('chapter-find-current')
      if (!root || !hit) return
      for (const range of hit) {
        if (range === last) return
        const node = range.startContainer
        const el = node instanceof Element ? node : node.parentElement
        if (el && root.contains(el)) { last = range; cb.current(el) }
        return
      }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(look) }
    /* A HIT THAT NEEDS NO SCROLL SENDS NO SCROLL. Two hits in a row inside one
       box that is already in view (chapter 4's four stacked group sentences)
       left the second unanswered. ChapterSearch also announces every jump with
       `chapter:jump`, fired just before it scrolls — so look once the highlight
       has been painted, a frame later. */
    const onJump = () => { requestAnimationFrame(() => requestAnimationFrame(look)) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('chapter:jump', onJump)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('chapter:jump', onJump)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [ref])
}
