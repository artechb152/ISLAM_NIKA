/* Root layout for the chapter-2 article.

   Its own route group, like chapter 6, so the editorial layout cannot leak into
   the chapters menu — but it loads chapter 6's stylesheet FIRST and its own on
   top. The masthead, section rail, type scale, quote treatment and reveal
   behaviour are then literally the same sheet both chapters use; chapter2-article.css
   only adds the devices this chapter's content asks for. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapter6-article.css'
import '@/styles/chapter2-article.css'

export const metadata: Metadata = {
  title: 'פרק שני · תרבות שבטית טרום עליית האסלאם',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function Chapter2Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
