/* Root layout for the chapters menu — see (entrance)/layout.tsx for why each document
   gets its own root rather than sharing one. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapters.css'

export const metadata: Metadata = {
  title: 'פרקי הלמידה · אסלאם',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function ChaptersLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
