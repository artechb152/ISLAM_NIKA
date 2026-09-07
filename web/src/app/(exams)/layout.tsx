/* Root layout for the exam room — its own document root, like every other route
   group here (see (entrance)/layout.tsx for why).

   chapter6-article.css comes first and is doing real work: it carries the palette,
   the type scale, the `--read`/`--flow` tokens and the shared parts (`.title-ornament`,
   `.article-section`) that exams.css builds on. exams.css declares no colour, no
   font and no radius that the chapter does not already have. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapter6-article.css'
import '@/styles/topic-filter.css'
import '@/styles/exams.css'

export const metadata: Metadata = {
  title: 'חדר המבחנים · אסלאם',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function ExamsLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
