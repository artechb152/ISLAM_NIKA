/* Root layout for the entrance.
   The site's four documents each had their own <head> and their own CSS, and their :root
   token sets genuinely disagree — --maroon is #4a101e here and #841b1b everywhere else.
   Route groups with a root layout apiece is what reproduces that: each group owns its
   <html>/<body> and imports only its own stylesheet, so no page can restyle another. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/entrance.css'

export const metadata: Metadata = {
  title: 'אסלאם',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function EntranceLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
