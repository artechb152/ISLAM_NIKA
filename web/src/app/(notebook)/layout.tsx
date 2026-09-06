/* Root layout לעמוד המחברת — מסמך משלו, כמו שאר קבוצות העמודים.
   chapters.css נטען כדי לרשת את משתני הקלף; site-notebook.css מעליו. */

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/fonts.css'
import '@/styles/chapters.css'
import '@/styles/site-notebook.css'

export const metadata: Metadata = {
  title: 'המחברת שלי · אסלאם',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function NotebookLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
