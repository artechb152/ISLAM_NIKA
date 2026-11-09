/* Root layout for the chapter-12 article.

   Its own route group, like chapters 2 and 6, so the editorial layout cannot leak
   into the chapters menu — but it loads chapter 6's stylesheet FIRST and its own on
   top. The masthead, section rail, type scale, quote treatment and reveal behaviour
   are then literally the same sheet all three chapters use; chapter12-article.css only
   adds the devices this chapter's content asks for, and declares no colour, no font
   and no radius of its own. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapter6-article.css'
import '@/styles/chapter12-article.css'
import '@/styles/site-notebook.css'
import SiteChrome from '@/components/SiteChrome'

export const metadata: Metadata = {
  title: 'פרק שנים-עשר · ג׳האד, רבאט ואסתשהאד',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function Chapter12Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <SiteChrome />
        {children}
      </body>
    </html>
  )
}
