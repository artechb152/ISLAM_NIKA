/* Root layout for chapter 13 — the hall of flags. Its own route group, like chapter 1's
   world, so the HUD styles cannot leak into the article chapters. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapter13.css'

export const metadata: Metadata = {
  title: 'פרק שלושה-עשר · דגלים וסמלים',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function Chapter13Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
