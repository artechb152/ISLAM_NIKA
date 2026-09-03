/* Root layout for chapter 3 — now a comic you turn, not an article.

   Its own route group, like chapters 2 and 6, so the editorial layout cannot
   leak into the chapters menu — but it loads chapter 6's stylesheet FIRST and
   its own on top. The masthead, section rail, type scale, quote treatment and
   reveal behaviour are then literally the same sheet all three chapters use;
   chapter3-article.css only adds the devices this chapter's content asks for,
   and declares no colour, no font and no radius of its own. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapter6-article.css'
import '@/styles/chapter3-article.css'
/* the comic's own sheet, loaded last. chapter3-article.css stays because the
   closing practice still runs on it. */
import '@/styles/chapter3-comic.css'

export const metadata: Metadata = {
  title: 'פרק שלישי · ראשית חיי מוחמד',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function Chapter3Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
