/* The practice renders inside `PracticeNav`, the article's own shell, styled by
   chapter6-practice.css; the question rules are shared-practice.css, which the shared engine
   imports itself. */
import '@/styles/chapter6-practice.css'
import '@/styles/chapter15-practice.css'

import Chapter15Practice from '@/components/Chapter15Practice'

export default function Page() {
  return <Chapter15Practice />
}
