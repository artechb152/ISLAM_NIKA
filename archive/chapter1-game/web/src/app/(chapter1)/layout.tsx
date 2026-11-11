/* Root layout for the chapter 1 exploration game. Isolated route group so the
   game HUD styles cannot leak into the article chapters and vice versa.

   Since 9.11.2026 the chapter is the article at /chapter1; the game stays whole and
   reachable at /chapter1-game (and /chapter1-game/play, /end, /guide, /practice), unlinked
   and not indexed — like /chapter3-comic. Nothing in the site links here. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapter1.css'

export const metadata: Metadata = {
  title: 'פרק ראשון · מסע אל ערב טרום האסלאם',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function Chapter1Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
