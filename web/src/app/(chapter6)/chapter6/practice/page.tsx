/* The chapter's closing screen lives inside the (chapter6) route group on purpose: that
   group's layout is what loads fonts.css and chapter6-article.css, so this page inherits the
   chapter's tokens, type scale and shell instead of re-declaring them. Under (chapters) it
   would have been handed the menu screen's stylesheet and would not have matched. */

import type { Metadata } from 'next'
import SummaryPage from '@/components/chapter6/summary/SummaryPage'
import '@/styles/chapter6-practice.css'

export const metadata: Metadata = {
  title: 'חמש מצוות היסוד · תרגול מסכם · פרק 6',
}

export default function Page() {
  return <SummaryPage />
}
