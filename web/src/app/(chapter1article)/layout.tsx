/* Root layout for chapter 1 — the article (9.11.2026; the pilot of 3.11 grown to the
   whole chapter).

   Its own route group, like every chapter, so nothing here leaks out — and apart from the
   game, which keeps its own group, (chapter1), at /chapter1-game. Chapter 6's sheet loads
   FIRST (masthead, rail, tokens, type scale), then this chapter's own, exactly as chapters
   7 and 14 do. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapter6-article.css'
import '@/styles/chapter1-article.css'
import '@/styles/site-notebook.css'
import SiteChrome from '@/components/SiteChrome'

export const metadata: Metadata = {
  title: 'פרק ראשון · ההיסטוריה של חצי האי ערב טרום תקופת האסלאם',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function Chapter1ArticleLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body>
        <SiteChrome />
        {children}
      </body>
    </html>
  )
}
