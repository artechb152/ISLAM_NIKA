/* The practice screen renders inside `PracticeNav`, which is the article's own
   shell — masthead, persistent rail, content column. That shell is styled by
   chapter6-practice.css, so the sheet is loaded here for the same reason the
   route group loads chapter6-article.css: this is one product, and the classes
   are shared rather than copied. */
import '@/styles/chapter6-practice.css'

import Chapter2Practice from '@/components/Chapter2Practice'

export default function Page() {
  return <Chapter2Practice />
}
