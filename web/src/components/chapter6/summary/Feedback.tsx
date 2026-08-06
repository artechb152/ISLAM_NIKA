'use client'

/* The one feedback line, and the hint that opens under it.

   „You got it wrong“ and „you are not finished yet“ can never be confused here: different
   glyph, different colour, and a different sentence shape — a miss always opens „לא כאן…“,
   an unfinished exercise always opens „נותרו…“. That confusion is the defect the chapter's
   own review found in `sh-c`. Colour never carries the state alone.

   NOT A LIVE REGION. There is exactly one on this page, at the bottom of SummaryPage, fed by
   usePickPlace. When this element was also `role="status"`, a single placement was announced
   twice — once by the hook and once by the line under the card. */

import { useEffect, useRef } from 'react'

export type FeedbackKind = 'idle' | 'ok' | 'miss'

export default function Feedback({ kind, text }: { kind: FeedbackKind; text: string }) {
  return (
    <p className={'gv-feedback is-' + kind}>
      <span className="gv-fb-mark" aria-hidden="true">
        {kind === 'ok' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5 10 17.5 19 7.5" />
          </svg>
        ) : kind === 'miss' ? (
          /* a return arrow — the label went back to the tray; nothing was lost */
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14H17a4 4 0 0 0 0-8h-6M9 14l3-3M9 14l3 3" />
          </svg>
        ) : (
          /* the chapter's own diamond, for „still going“ */
          <span className="gv-fb-diamond" />
        )}
      </span>
      <span className="gv-fb-text">{text}</span>
    </p>
  )
}

/* The hint. It renders DIRECTLY under the feedback line that announced it, and it makes sure
   it can be seen.

   The feedback says „לא כאן. פתחתי רמז מתחת.“ — and in the previous build the hint was the last
   thing in a tall block, so on a laptop it opened several hundred pixels below the fold. The
   reader was told a hint had appeared and shown nothing. `block:'nearest'` only scrolls when
   the element is actually outside the viewport, so a hint that is already visible does not
   yank the page. The effect has no dependencies: it runs once, when the hint first mounts. */
export function Hint({ label, text }: { label: string; text: string }) {
  const ref = useRef<HTMLParagraphElement | null>(null)
  useEffect(() => {
    const smooth = !window.matchMedia('(prefers-reduced-motion:reduce)').matches
    ref.current?.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' })
  }, [])
  return (
    <p className="gv-hint" ref={ref}>
      <span className="gv-hint-label">{label}</span>
      {text}
    </p>
  )
}
