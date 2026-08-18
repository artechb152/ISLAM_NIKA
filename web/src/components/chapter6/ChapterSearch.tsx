'use client'

/* In-chapter "find in page": a header search field that scans the article text, highlights every
   match and lets the reader jump between them. It paints matches with the CSS Custom Highlight API
   (Range-based, no DOM mutation) so it never fights React's ownership of the article DOM. Where the
   API is unavailable it degrades to plain scroll-to-match with no visual highlight. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'

const HEADER_OFFSET = 56 + 24 // sticky masthead height + breathing room

// The Highlight registry is a fairly new platform API; keep the typing loose so older TS libs build.
type HighlightApi = {
  Highlight: new (...ranges: Range[]) => unknown
  highlights: { set(name: string, value: unknown): void; delete(name: string): void }
}

function highlightApi(): HighlightApi | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { Highlight?: unknown; CSS?: { highlights?: unknown } }
  if (typeof w.Highlight !== 'function' || !w.CSS?.highlights) return null
  return { Highlight: w.Highlight as HighlightApi['Highlight'], highlights: w.CSS.highlights as HighlightApi['highlights'] }
}

export default function ChapterSearch({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const [query, setQuery] = useState('')
  const [total, setTotal] = useState(0)
  const [active, setActive] = useState(0) // 1-based index of the focused match; 0 = none
  const rangesRef = useRef<Range[]>([])

  // Collect every text-node match inside the article as a Range, ignoring the search box itself.
  const collect = useCallback((): Range[] => {
    const root = containerRef.current
    const needle = query.trim().toLowerCase()
    if (!root || needle.length < 2) return []
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const text = node.nodeValue
        if (!text || !text.trim()) return NodeFilter.FILTER_REJECT
        // skip hidden branches (collapsed story, inert regions)
        const el = node.parentElement
        if (!el || el.closest('[hidden],[inert],[aria-hidden="true"]')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })
    const ranges: Range[] = []
    let node = walker.nextNode()
    while (node) {
      const hay = (node.nodeValue ?? '').toLowerCase()
      let from = hay.indexOf(needle)
      while (from !== -1) {
        const range = document.createRange()
        range.setStart(node, from)
        range.setEnd(node, from + needle.length)
        ranges.push(range)
        from = hay.indexOf(needle, from + needle.length)
      }
      node = walker.nextNode()
    }
    return ranges
  }, [containerRef, query])

  const paint = useCallback((ranges: Range[], current: number) => {
    const api = highlightApi()
    if (!api) return
    if (!ranges.length) {
      api.highlights.delete('chapter-find')
      api.highlights.delete('chapter-find-current')
      return
    }
    api.highlights.set('chapter-find', new api.Highlight(...ranges))
    const focus = ranges[current - 1]
    if (focus) api.highlights.set('chapter-find-current', new api.Highlight(focus))
    else api.highlights.delete('chapter-find-current')
  }, [])

  const scrollTo = useCallback((range: Range | undefined) => {
    if (!range) return
    // A match inside a CLOSED <dialog> or <details> measures 0×0, and the guard
    // below would drop it — the reader would be told the chapter has a hit and
    // then watch the page not move. Chapter 2 keeps four traits behind dialogs,
    // so reveal whatever the match is inside before measuring it. The text was
    // always in the DOM, which is why the walker found it at all.
    const start = range.startContainer
    let el: Element | null =
      start.nodeType === Node.ELEMENT_NODE ? (start as Element) : start.parentElement
    let inDialog: HTMLDialogElement | null = null
    while (el) {
      const panel = el.closest('details, dialog')
      if (!panel) break
      if (panel instanceof HTMLDialogElement) {
        if (!panel.open) panel.showModal()
        inDialog = inDialog ?? panel
      } else {
        ;(panel as HTMLDetailsElement).open = true
      }
      el = panel.parentElement
    }
    const rect = range.getBoundingClientRect()
    if (!rect.height && !rect.width) return
    // Inside a modal the window does not scroll — the sheet does. Bring the match
    // into view within its own scroll container instead.
    if (inDialog) {
      const target =
        start.nodeType === Node.ELEMENT_NODE ? (start as Element) : start.parentElement
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      return
    }
    window.scrollTo({ top: window.scrollY + rect.top - HEADER_OFFSET, behavior: 'smooth' })
  }, [])

  // Recompute matches whenever the query changes; land on the first hit.
  useEffect(() => {
    const ranges = collect()
    rangesRef.current = ranges
    setTotal(ranges.length)
    const next = ranges.length ? 1 : 0
    setActive(next)
    paint(ranges, next)
    scrollTo(ranges[next - 1])
    return () => paint([], 0)
  }, [collect, paint, scrollTo])

  const go = useCallback((dir: 1 | -1) => {
    const ranges = rangesRef.current
    if (!ranges.length) return
    setActive((prev) => {
      const next = ((prev - 1 + dir + ranges.length) % ranges.length) + 1
      paint(ranges, next)
      scrollTo(ranges[next - 1])
      return next
    })
  }, [paint, scrollTo])

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      go(event.shiftKey ? -1 : 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setQuery('')
    }
  }

  const status = useMemo(() => (total ? `${active}/${total}` : query.trim().length >= 2 ? 'אין' : ''), [active, total, query])

  return (
    <div className="chapter-find" role="search">
      <span className="chapter-find-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
      </span>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="חיפוש בפרק..."
        aria-label="חיפוש בתוך הפרק"
        enterKeyHint="search"
      />
      {query.trim().length >= 2 && (
        <span className="chapter-find-tools">
          <span className="chapter-find-count" aria-live="polite">{status}</span>
          <button type="button" aria-label="התוצאה הקודמת" disabled={!total} onClick={() => go(-1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
          </button>
          <button type="button" aria-label="התוצאה הבאה" disabled={!total} onClick={() => go(1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <button type="button" aria-label="ניקוי החיפוש" onClick={() => setQuery('')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </span>
      )}
    </div>
  )
}
