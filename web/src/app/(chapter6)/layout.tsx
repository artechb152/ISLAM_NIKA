/* Root layout for the continuous chapter 6 article. It remains isolated from the other
   route groups so its editorial layout and tokens cannot leak into the chapters menu. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapter6-article.css'

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
