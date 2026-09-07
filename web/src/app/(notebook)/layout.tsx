/* Root layout לעמוד המחברת — טוען את גיליון הפרקים תחילה ואת שלו מעליו,
   בדיוק כמו פרק 2 מעל פרק 6: המחברת נראית כמו פרק, ולכן היא לובשת את
   אותה שפה ומוסיפה רק את מה שהיא שלה. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapter6-article.css'
import '@/styles/topic-filter.css'
import '@/styles/site-notebook.css'

export const metadata: Metadata = {
  title: 'המחברת שלי · אסלאם',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function NotebookLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
