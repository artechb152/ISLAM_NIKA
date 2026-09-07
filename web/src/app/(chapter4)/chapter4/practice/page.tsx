/* The practice screen renders inside `PracticeNav`, which is the article's own
   shell — masthead, persistent rail, content column. That shell is styled by
   chapter6-practice.css, so the sheet is loaded here for the same reason the
   route group loads chapter6-article.css: this is one product, and the classes
   are shared rather than copied. chapter4-practice.css adds only the exercise
   surfaces, and declares no colour, font or radius of its own. */
import type { Metadata } from 'next'
import '@/styles/chapter6-practice.css'
import '@/styles/chapter4-practice.css'

import Chapter4Practice from '@/components/Chapter4Practice'

export const metadata: Metadata = {
  title: 'ההג׳רה והקרבות · תרגול מסכם · פרק 4',
}

export default function Page() {
  return <Chapter4Practice />
}
