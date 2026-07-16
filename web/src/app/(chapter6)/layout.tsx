/* Root layout for chapter 6 — see (entrance)/layout.tsx for why each document gets its own
   root rather than sharing one.

   The three stylesheets are imported in the order the original <link> tags had them
   (lesson, then mech, then film). That order is not decorative: these are plain global
   stylesheets with overlapping selectors, so the cascade decides who wins. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/lesson.css'
import '@/styles/mech.css'
import '@/styles/film.css'

export const metadata: Metadata = {
  title: "פרק שישי · חמש מצוות היסוד",
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function Chapter6Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
