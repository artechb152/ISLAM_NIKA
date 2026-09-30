/* Root layout for chapter 3 — a scrolling article, like chapters 2, 5 and 6.

   Its own route group, like chapters 2 and 6, so the editorial layout cannot
   leak into the chapters menu — but it loads chapter 6's stylesheet FIRST and
   its own on top. The masthead, section rail, type scale, quote treatment and
   reveal behaviour are then literally the same sheet all three chapters use;
   chapter3-article.css only adds the devices this chapter's content asks for,
   and declares no colour, no font and no radius of its own.

   THE COMIC'S TWO SHEETS ARE LOADED, AFTER THE ARTICLE'S, because section 05
   IS the comic — the book's own pages for that part (Chapter3ComicPart.tsx).
   They were off for a while on the grounds that they „won every collision";
   checked when they came back, every rule in both is under a `c3-` class
   except `.chapter-site-header{flex:none}`, which does nothing to a header that
   is not a flex item, and the motion sheet's keyframes, which are all `c3-`
   named. Nothing in the article or the practice uses a `c3-` class. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapter6-article.css'
import '@/styles/chapter3-article.css'
import '@/styles/chapter3-comic.css'
import '@/styles/chapter3-motion.css'
/* and the closing practice, dressed in CHAPTER 6'S language — gold-ringed
   medallions, blanks that are rules rather than boxes, pill buttons and one
   hairline axis — over chapter3-article.css's structure. It used to be dressed
   as the comic (ink frames, lettering boxes, the maroon plate), which gave the
   two chapters' closing screens no part in common. */
import '@/styles/chapter3-practice.css'
import '@/styles/site-notebook.css'

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
