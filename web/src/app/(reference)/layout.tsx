/* Root layout לארבעת עמודי העזר (מילון מונחים, ספרות מומלצת, מקורות, מפות) —
   כמו המחברת: גיליון הפרקים קודם, וגיליון משלו מעליו. reference.css לא מצהיר על
   צבע, גופן או רדיוס שאין בגיליון של פרק 6. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapter6-article.css'
import '@/styles/reference.css'
import SiteChrome from '@/components/SiteChrome'

export const metadata: Metadata = {
  title: 'כלי עזר · אסלאם',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function ReferenceLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <SiteChrome />
        {children}
      </body>
    </html>
  )
}
