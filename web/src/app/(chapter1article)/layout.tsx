/* Root layout for the chapter-1 article PILOT (3.11.2026).

   Its own route group, like /chapter3-comic: unlinked and not indexed, so the pilot
   can be looked at beside the finished chapters without touching the game at
   /chapter1. Chapter 6's sheet loads FIRST and the chapter's own on top. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapter6-article.css'
import '@/styles/chapter1-article.css'
import '@/styles/site-notebook.css'

export const metadata: Metadata = {
  title: 'פרק ראשון · ההיסטוריה של חצי האי ערב טרום תקופת האסלאם',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function Chapter1ArticleLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
