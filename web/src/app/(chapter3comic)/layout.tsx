/* A PREVIEW ROUTE FOR THE COMIC, AND NOTHING ELSE.

   `/chapter3` is the chapter — a scrolling article whose FIRST SECTION is a
   comic (`ElephantStrip` in Chapter3.tsx). The full book that used to be the
   reading surface is kept whole (Chapter3Comic.tsx, comic.json, panels75.json,
   81 panels), and this route exists only so the parts that are NOT in the
   article can still be looked at — to decide whether a second section should
   become a comic too.

   ⚠ IT IS ITS OWN ROUTE GROUP ON PURPOSE. The comic's two sheets load AFTER the
   article's and win every collision with it, which is exactly why they came off
   `(chapter3)/layout.tsx`. Loading them here cannot reach the chapter.

   THIS IS SCAFFOLDING. It is linked from nowhere — not the chapters screen, not
   the rail, not the chapter — and it comes out once no further section is going
   to become a comic. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapter6-article.css'
import '@/styles/chapter3-article.css'
import '@/styles/chapter3-comic.css'
import '@/styles/chapter3-motion.css'
import '@/styles/site-notebook.css'

export const metadata: Metadata = {
  title: 'פרק שלישי · הקומיקס (תצוגה)',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function Chapter3ComicPreviewLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
