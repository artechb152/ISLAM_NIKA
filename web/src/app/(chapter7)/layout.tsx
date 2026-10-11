/* Root layout for chapter 7 — the article.

   Its own route group, like every chapter, so nothing here leaks out. It loads
   chapter 6's sheet FIRST (masthead, rail, tokens, type scale), then this
   chapter's own, exactly as chapter 5 does. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapter6-article.css'
import '@/styles/chapter7-article.css'
import '@/styles/site-notebook.css'

export const metadata: Metadata = {
  title: 'פרק שביעי · לוח השנה ההג׳רי',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function Chapter7Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
