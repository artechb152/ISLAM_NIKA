/* Root layout for chapter 13's practice. The hall is a world on its own root layout
   (chapter13.css, a fixed full-screen canvas); the practice is an article page like every
   other chapter's, so it gets its own route group with the article sheets — the same split
   chapter 1 has between its world and its article. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapter6-article.css'
import '@/styles/site-notebook.css'
import SiteChrome from '@/components/SiteChrome'

export const metadata: Metadata = {
  title: 'פרק שלושה-עשר · התרגול המסכם',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function Chapter13PracticeLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <SiteChrome />
        {children}
      </body>
    </html>
  )
}
